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
//   3. A shared cool-down, kept per kind of request (pack lists, glyph files,
//      icon files, search). A 429 records "no requests of that kind until T" in
//      memory and localStorage, so a reload honours it. Until T nothing of that
//      kind is sent; a cached entry is served even if it has expired. Only a
//      request with nothing cached gets the 429 back, so a total failure stays
//      visible to the page's own refused state. A refused pack list therefore
//      does not stop the glyphs of a pack whose list is already cached or
//      served from the site: the glyph request is tried, and starts its own
//      cool-down only if Iconify refuses it too. A refusal made locally (nothing
//      sent) carries HELD_HEADER, so a caller can tell "wait" from "refused".
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
//
// A 429 MAY NOT BE READABLE AT ALL. If the refusal page carries no CORS header the
// browser rejects the fetch instead of handing back a 429. A run of NET_FAIL_LIMIT
// such rejections inside NET_FAIL_WINDOW, on requests with nothing cached to fall
// back on, starts a short pause of NET_COOLDOWN. It is not the 429 ladder: it is
// held in memory only, and the browser's `online` event ends it, so a flaky
// connection that comes back is not locked out for a quarter of an hour. Timeouts
// and a browser that reports itself offline do not count, and one good answer
// clears the run.
//
// ONLY A GOOD ANSWER IS KEPT. A 200 is stored only when its content type and body
// fit the URL (JSON that parses for the catalogue, search and glyph files; SVG for
// an icon file). A captive portal or a truncated body is returned to the caller but
// never written, and an entry that no longer fits is dropped when it is read.

export const ICONIFY_HOST = 'https://api.iconify.design'

const CACHE_NAME = 'uil4b-iconify-v1'
const STAMP_HEADER = 'x-uil4b-stored-at'
const COOLDOWN_KEY = 'uil4b-iconify-cooldown'
// Set on the 429 that is answered locally because a cool-down is running and the
// request was never sent. A real refusal from Iconify does not carry it.
export const HELD_HEADER = 'x-uil4b-held'

const HOUR = 60 * 60 * 1000
export const TTL_DEFAULT = 24 * HOUR
export const TTL_SEARCH = HOUR
// How long an entry may sit in Cache Storage before the sweep drops it. Past its
// TTL it is only ever a fallback while the API refuses, so it stays a while.
const KEEP_MAX = 7 * 24 * HOUR
export const MAX_COOLDOWN = HOUR
export const BASE_COOLDOWN = 15 * 60 * 1000
const MAX_PARALLEL = 6
// After a cool-down has been over this long, the next refusal starts the ladder
// again at BASE_COOLDOWN instead of continuing from a weeks-old count.
export const STRIKE_MEMORY = 2 * HOUR
export const NET_FAIL_LIMIT = 3
export const NET_FAIL_WINDOW = 10 * 1000
export const NET_COOLDOWN = 30 * 1000

/**
 * Does a 200 answer look like what `url` asks for? A catalogue, search or glyph
 * file must be JSON that parses; an icon file must be SVG. Any other path is not
 * ours to judge. Used before storing an answer and again when reading one back.
 */
export function fitsUrl(url, type, body) {
  let path
  try { path = new URL(url).pathname } catch { return true }
  const kind = String(type || '').toLowerCase()
  const text = typeof body === 'string' ? body : ''
  if (path.endsWith('.svg')) {
    return kind.includes('image/svg') || (!kind.includes('html') && /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)?(<!doctype[^>]*>\s*)?<svg[\s>/]/i.test(text.slice(0, 2048)))
  }
  if (path === '/collection' || path === '/search' || path.endsWith('.json')) {
    if (!kind.includes('json')) return false
    try { JSON.parse(text) } catch { return false }
    return true
  }
  return true
}

/** Freshness window for a URL: a search goes stale in an hour, the rest in a day. */
export function ttlFor(url) {
  try { return new URL(url).pathname === '/search' ? TTL_SEARCH : TTL_DEFAULT } catch { return TTL_DEFAULT }
}

/**
 * Which cool-down a URL belongs to: the pack list, a search, an icon file, or
 * (everything else) a glyph file. A refusal of one kind does not hold the others.
 */
export function scopeFor(url) {
  try {
    const path = new URL(url).pathname
    if (path === '/collection') return 'collection'
    if (path === '/search') return 'search'
    if (path.endsWith('.svg')) return 'svg'
  } catch { /* an odd URL is treated as a glyph file */ }
  return 'glyph'
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

  const isOnline = opts.isOnline || (() => globalThis.navigator?.onLine !== false)
  // Calls `cb` when the connection returns. Tests pass their own.
  const listenOnline = opts.listenOnline || ((cb) => {
    try { globalThis.addEventListener?.('online', cb) } catch { /* no event target */ }
  })

  // scope → { until, strikes }: one back-off ladder per kind of request.
  const rungs = new Map()
  const rung = (scope) => rungs.get(scope) || { until: 0, strikes: 0 }
  let netUntil = 0
  let netFails = []
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
      for (const [scope, s] of Object.entries(saved?.scopes || {})) {
        const mine = rung(scope)
        if (Number.isFinite(s?.until) && s.until > mine.until) {
          rungs.set(scope, { until: s.until, strikes: Number(s.strikes) || mine.strikes })
        }
      }
    } catch { /* unreadable storage: the in-memory value stands */ }
  }
  function saveCooldown() {
    try {
      const store = getStorage()
      if (!store) return
      const scopes = {}
      for (const [scope, s] of rungs) if (s.until || s.strikes) scopes[scope] = s
      if (Object.keys(scopes).length) store.setItem(COOLDOWN_KEY, JSON.stringify({ scopes }))
      else store.removeItem(COOLDOWN_KEY)
    } catch { /* quota or private mode */ }
  }
  // A cool-down that ended long ago is history: forget it (and its count) so a
  // refusal weeks later starts at BASE_COOLDOWN, not at a stale doubling.
  function forgetOldCooldown() {
    let changed = false
    for (const [scope, s] of rungs) {
      if ((s.until || s.strikes) && now() > s.until + STRIKE_MEMORY) { rungs.delete(scope); changed = true }
    }
    if (changed) saveCooldown()
  }
  // The latest end among the cool-downs that apply: just `scope`'s, or every
  // kind's when no scope is given. The short pause after rejected fetches
  // (netUntil) applies to all of them.
  const endsAt = (scope) => {
    let end = netUntil
    if (scope) return Math.max(end, rung(scope).until)
    for (const s of rungs.values()) end = Math.max(end, s.until)
    return end
  }
  const cooling = (scope) => { syncCooldown(); forgetOldCooldown(); return now() < endsAt(scope) }

  function noteRateLimited(scope, retryAfter) {
    syncCooldown()
    forgetOldCooldown()
    const asked = parseRetryAfter(retryAfter, now())
    const cur = rung(scope)
    // Refusals from one burst arrive together: only the first starts a new
    // round of back-off, or six stragglers would double the wait six times.
    const strikes = now() >= cur.until ? Math.min(cur.strikes + 1, 8) : cur.strikes
    const wait = asked != null && asked > 0 ? asked : BASE_COOLDOWN * 2 ** (strikes - 1)
    rungs.set(scope, { until: Math.max(cur.until, now() + Math.min(wait, MAX_COOLDOWN)), strikes })
    saveCooldown()
  }
  // A success once the cool-down has run out is the all-clear. One that lands
  // while it is still running is a straggler from before the refusal.
  function noteOk(scope) {
    const cur = rung(scope)
    if (cur.strikes && now() >= cur.until) { rungs.delete(scope); saveCooldown() }
  }
  // A refusal the browser would not let us read arrives as a rejected fetch.
  // One or two are just a bad connection; a quick run of them, with nothing
  // cached to fall back on, is treated as the rate limit it most likely is.
  function noteNetworkFailure(err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return
    if (!isOnline()) return
    const t = now()
    netFails = netFails.filter((at) => t - at < NET_FAIL_WINDOW)
    netFails.push(t)
    if (netFails.length >= NET_FAIL_LIMIT) { netFails = []; netUntil = t + NET_COOLDOWN }
  }
  listenOnline(() => { netFails = []; netUntil = 0 })

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
      const entry = { status: res.status, body: await res.text(), type: res.headers.get('content-type') || '', storedAt }
      if (!fitsUrl(url, entry.type, entry.body)) {
        // Stored by an earlier version, or damaged since: forget it, so the next
        // read (and "Try again") goes to the network instead of this body again.
        await cache.delete(url).catch(() => {})
        return null
      }
      return entry
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
    const scope = scopeFor(url)

    return schedule(async () => {
      // Checked here, not before queuing: a request that waited for a slot
      // while an earlier one was refused must not leave. Only this kind of
      // request waits; the others are tried.
      if (cooling(scope)) return entry || refused()
      let res
      let body
      try {
        // The clock starts when the request does, not when it joined the queue.
        res = await getFetch()(url, { signal: AbortSignal.timeout(timeout) })
        if (res.ok) body = await res.text()
      } catch (err) {
        if (entry) return entry
        noteNetworkFailure(err)
        throw err
      }
      if (res.status === 429) noteRateLimited(scope, res.headers?.get?.('retry-after'))
      if (!res.ok) {
        // Rate-limited or unwell: an old answer beats none. A 404 is an answer.
        if (entry && (res.status === 429 || res.status >= 500)) return entry
        return { status: res.status, body: await res.text().catch(() => ''), type: '', synthetic: false }
      }
      netFails = []
      const type = res.headers.get('content-type') || ''
      const fresh = { status: res.status, body, type, storedAt: now() }
      if (!fitsUrl(url, type, body)) {
        // A 200 that is not what was asked for (a portal page, a cut-off body):
        // not an all-clear, not kept. An older good answer beats it.
        return entry || fresh
      }
      noteOk(scope)
      if (persist) await writeEntry(url, fresh)
      return fresh
    })
  }

  const toResponse = (r) => new Response(r.body === '' ? null : r.body, {
    status: r.status,
    headers: {
      ...(r.type ? { 'content-type': r.type } : {}),
      ...(r.synthetic ? { [HELD_HEADER]: '1' } : {}),
    },
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
    /**
     * Epoch ms the cool-down ends, or 0 when not cooling. With a URL: the one
     * that holds that kind of request. Without: the latest of any kind.
     */
    cooldownUntil: (url) => {
      const scope = url ? scopeFor(url) : undefined
      return cooling(scope) ? endsAt(scope) : 0
    },
    /** The visitor pressed "Try again": forget every cool-down and ask once more. */
    clearCooldown: () => { rungs.clear(); netUntil = 0; netFails = []; saveCooldown() },
    /** Test hook: drop in-memory state (not Cache Storage). */
    reset: () => { rungs.clear(); netUntil = 0; netFails = []; inflight.clear(); waiting.length = 0; active = 0; cachePromise = null; swept = false },
  }
}

const shared = createIconifyFetch()

/** GET an Iconify URL through the persistent cache and the shared cool-down. */
export const iconifyFetch = shared.get
export const iconifyCooldownUntil = shared.cooldownUntil
export const clearIconifyCooldown = shared.clearCooldown
