// The one door to api.iconify.design.
//
// WHY IT EXISTS. The Icon Library asked the API for the same answers on every
// load — a /collection per pack, the glyph tranches, each .svg — because its
// caches lived in memory only. One IP reloading a few times was answered with
// HTTP 429 (Retry-After close to an hour) and the page sat on "Couldn't reach
// the icon service" for that hour, for everyone behind the same address.
//
// WHAT IT DOES, in the order a request meets it:
//   1. Cache Storage, keyed by the full URL, with a stored-at stamp. A fresh
//      entry (24 h for the catalogue, tranches and SVGs; 1 h for /search) is
//      answered with no network at all, and survives a reload.
//   2. Concurrent identical requests share one round trip.
//   3. A shared cool-down. A 429 records "no Iconify requests until T" in
//      memory and localStorage, so a reload honours it. Until T nothing is sent;
//      a cached entry is served even if it has expired. Only a request with
//      nothing cached gets the 429 back, so a total failure stays visible to
//      the page's own refused state.
//   4. At most MAX_PARALLEL requests in flight, so the first 429 of a cold
//      25-pack load stops the rest instead of arriving after they have left.
//
// FAIL SAFE. No Cache Storage (private mode, an insecure context, quota) or no
// localStorage degrades to a plain fetch with the cool-down held in memory.
//
// RETRY-AFTER IS OFTEN UNREADABLE. The API does not list it in
// Access-Control-Expose-Headers, so a cross-origin page sees the 429 but not the
// header. With no readable value the cool-down is BASE_COOLDOWN, doubling for each
// 429 that follows without a success between, capped at MAX_COOLDOWN.

export const ICONIFY_HOST = 'https://api.iconify.design'

const CACHE_NAME = 'uil4b-iconify-v1'
const STAMP_HEADER = 'x-uil4b-stored-at'
const COOLDOWN_KEY = 'uil4b-iconify-cooldown'

const HOUR = 60 * 60 * 1000
export const TTL_DEFAULT = 24 * HOUR
export const TTL_SEARCH = HOUR
// How long an entry may sit in Cache Storage before the sweep drops it. Past its
// TTL it is only ever a fallback while the API refuses, so it stays a while.
const KEEP_MAX = 7 * 24 * HOUR
export const MAX_COOLDOWN = HOUR
export const BASE_COOLDOWN = 15 * 60 * 1000
const MAX_PARALLEL = 6

/** Freshness window for a URL: a search goes stale in an hour, the rest in a day. */
export function ttlFor(url) {
  try { return new URL(url).pathname === '/search' ? TTL_SEARCH : TTL_DEFAULT } catch { return TTL_DEFAULT }
}

/** A Retry-After header (delta-seconds or HTTP date) as milliseconds, or null. */
export function parseRetryAfter(value, nowMs = Date.now()) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  if (/^\d+$/.test(text)) return Number(text) * 1000
  const at = Date.parse(text)
  return Number.isNaN(at) ? null : Math.max(0, at - nowMs)
}

/**
 * Build an instance. The shared one below uses the real globals; tests pass
 * their own fetch, cache, storage and clock.
 */
export function createIconifyFetch(opts = {}) {
  const now = opts.now || (() => Date.now())
  const maxParallel = opts.maxParallel || MAX_PARALLEL
  const getFetch = () => opts.fetchImpl || globalThis.fetch
  const getCaches = () => {
    if ('caches' in opts) return opts.caches
    try { return typeof caches !== 'undefined' ? caches : null } catch { return null }
  }
  const getStorage = () => {
    if ('storage' in opts) return opts.storage
    try { return globalThis.localStorage || null } catch { return null }
  }

  let until = 0
  let strikes = 0
  const inflight = new Map()
  const waiting = []
  let active = 0
  let cachePromise = null
  let swept = false

  // ── cool-down ──────────────────────────────────────────────────────────────
  // Memory and storage are merged on every read: another tab may have been
  // refused since this one last looked, and a reload starts from storage alone.
  function syncCooldown() {
    try {
      const raw = getStorage()?.getItem(COOLDOWN_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (Number.isFinite(saved?.until) && saved.until > until) {
        until = saved.until
        strikes = Number(saved.strikes) || strikes
      }
    } catch { /* unreadable storage: the in-memory value stands */ }
  }
  function saveCooldown() {
    try {
      const store = getStorage()
      if (!store) return
      if (until || strikes) store.setItem(COOLDOWN_KEY, JSON.stringify({ until, strikes }))
      else store.removeItem(COOLDOWN_KEY)
    } catch { /* quota or private mode */ }
  }
  const cooling = () => { syncCooldown(); return now() < until }

  function noteRateLimited(retryAfter) {
    syncCooldown()
    const asked = parseRetryAfter(retryAfter, now())
    // Refusals from one burst arrive together: only the first starts a new
    // round of back-off, or six stragglers would double the wait six times.
    if (now() >= until) strikes = Math.min(strikes + 1, 8)
    const wait = asked != null && asked > 0 ? asked : BASE_COOLDOWN * 2 ** (strikes - 1)
    until = Math.max(until, now() + Math.min(wait, MAX_COOLDOWN))
    saveCooldown()
  }
  // A success once the cool-down has run out is the all-clear. One that lands
  // while it is still running is a straggler from before the refusal.
  function noteOk() {
    if (strikes && now() >= until) { strikes = 0; until = 0; saveCooldown() }
  }

  // ── persistent cache ───────────────────────────────────────────────────────
  function openCache() {
    if (!cachePromise) {
      const store = getCaches()
      cachePromise = store ? store.open(CACHE_NAME).catch(() => null) : Promise.resolve(null)
      cachePromise.then((c) => { if (c) scheduleSweep(c) })
    }
    return cachePromise
  }

  // Drop entries nobody could still want. Once per page load, and not on the
  // path of any request: /search keys are unbounded, so without this the store
  // only ever grows.
  function scheduleSweep(cache) {
    if (swept) return
    swept = true
    const run = async () => {
      try {
        for (const req of await cache.keys()) {
          const res = await cache.match(req)
          const at = Number(res?.headers.get(STAMP_HEADER))
          if (!Number.isFinite(at) || now() - at > KEEP_MAX) await cache.delete(req)
        }
      } catch { /* a sweep that fails costs only space */ }
    }
    const timer = setTimeout(run, 5000)
    timer?.unref?.()
  }

  async function readEntry(url) {
    try {
      const cache = await openCache()
      const res = cache && await cache.match(url)
      if (!res) return null
      const storedAt = Number(res.headers.get(STAMP_HEADER))
      if (!Number.isFinite(storedAt)) return null
      return { status: res.status, body: await res.text(), type: res.headers.get('content-type') || '', storedAt }
    } catch { return null }
  }

  async function writeEntry(url, entry) {
    try {
      const cache = await openCache()
      if (!cache) return
      await cache.put(url, new Response(entry.body, {
        status: 200,
        headers: { 'content-type': entry.type, [STAMP_HEADER]: String(entry.storedAt) },
      }))
    } catch { /* quota: the answer is still returned, just not kept */ }
  }

  // ── the network, a few at a time ───────────────────────────────────────────
  function schedule(job) {
    return new Promise((resolve, reject) => {
      const start = () => {
        active += 1
        job().then(resolve, reject).finally(() => {
          active -= 1
          const next = waiting.shift()
          if (next) next()
        })
      }
      if (active < maxParallel) start()
      else waiting.push(start)
    })
  }

  const refused = (status = 429) => ({ status, body: '', type: '', synthetic: true })

  async function load(url, { timeout, ttl, persist }) {
    const entry = persist ? await readEntry(url) : null
    if (entry && now() - entry.storedAt < ttl) return entry

    return schedule(async () => {
      // Checked here, not before queuing: a request that waited for a slot
      // while an earlier one was refused must not leave.
      if (cooling()) return entry || refused()
      let res
      let body
      try {
        // The clock starts when the request does, not when it joined the queue.
        res = await getFetch()(url, { signal: AbortSignal.timeout(timeout) })
        if (res.ok) body = await res.text()
      } catch (err) {
        if (entry) return entry
        throw err
      }
      if (res.status === 429) noteRateLimited(res.headers?.get?.('retry-after'))
      if (!res.ok) {
        // Rate-limited or unwell: an old answer beats none. A 404 is an answer.
        if (entry && (res.status === 429 || res.status >= 500)) return entry
        return { status: res.status, body: await res.text().catch(() => ''), type: '', synthetic: false }
      }
      noteOk()
      const fresh = { status: res.status, body, type: res.headers.get('content-type') || '', storedAt: now() }
      if (persist) await writeEntry(url, fresh)
      return fresh
    })
  }

  const toResponse = (r) => new Response(r.body === '' ? null : r.body, {
    status: r.status,
    headers: r.type ? { 'content-type': r.type } : {},
  })

  /**
   * GET `url` from Iconify. Resolves a Response (`ok`, `.json()`, `.text()`)
   * exactly as fetch would, or rejects on a network failure with nothing to
   * fall back on. `persist: false` keeps the answer out of Cache Storage (for
   * a URL variant not worth remembering).
   */
  function get(url, { timeout = 6000, ttl = ttlFor(url), persist = true } = {}) {
    let p = inflight.get(url)
    if (!p) {
      p = load(url, { timeout, ttl, persist })
      inflight.set(url, p)
      const clear = () => { if (inflight.get(url) === p) inflight.delete(url) }
      p.then(clear, clear)
    }
    return p.then(toResponse)
  }

  return {
    get,
    /** Epoch ms the cool-down ends, or 0 when not cooling. */
    cooldownUntil: () => (cooling() ? until : 0),
    /** The visitor pressed "Try again": forget the cool-down and ask once more. */
    clearCooldown: () => { until = 0; strikes = 0; saveCooldown() },
    /** Test hook: drop in-memory state (not Cache Storage). */
    reset: () => { until = 0; strikes = 0; inflight.clear(); waiting.length = 0; active = 0; cachePromise = null; swept = false },
  }
}

const shared = createIconifyFetch()

/** GET an Iconify URL through the persistent cache and the shared cool-down. */
export const iconifyFetch = shared.get
export const iconifyCooldownUntil = shared.cooldownUntil
export const clearIconifyCooldown = shared.clearCooldown
