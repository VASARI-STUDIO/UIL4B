export const COLLECTION_TTL = 7 * 24 * 60 * 60 * 1000
export const COLLECTION_RETRY_DELAY = 60 * 1000
export const CHIP_RETRY_FLOOR = 3 * 1000
// A Retry-After longer than this is treated as this long, so a bad header cannot lock the catalogue for a day.
export const COLLECTION_REFUSAL_MAX = 60 * 60 * 1000
const storageKey = (prefix) => `uil4b:iconify:collection:${prefix}`
const defaultStorage = () => globalThis.localStorage
const CREDIT_FIELDS = ['name', 'author', 'url', 'spdx', 'licenceUrl']
const CREDIT_LINK_FIELDS = new Set(['url', 'licenceUrl'])
const isHttpsUrl = (value) => /^https:\/\//.test(value)

// Flatten a /collection response into a flat, de-duplicated list of icon names.
// Combines categorised + uncategorised icons; aliases/hidden are skipped so the
// grid only shows canonical, renderable icons.
export function collectionToNames(d) {
  const seen = new Set()
  const names = []
  const push = (n) => { if (n && !seen.has(n)) { seen.add(n); names.push(n) } }
  if (Array.isArray(d.uncategorized)) d.uncategorized.forEach(push)
  if (d.categories) Object.values(d.categories).forEach(arr => Array.isArray(arr) && arr.forEach(push))
  return names
}

// Persist only the flattened catalogue and attribution fields used by the UI.
// Stored values are untrusted on read: credit links must be https:// or they are dropped.
// info=1 on the collection request returns the attribution in the same response, so it costs no extra request.
function compactData(data) {
  if (!data || !Array.isArray(data.names) || !data.names.every(n => typeof n === 'string' && n)
    || typeof data.title !== 'string') return null
  const credit = data.credit && typeof data.credit === 'object'
    ? Object.fromEntries(CREDIT_FIELDS
      .filter(k => typeof data.credit[k] === 'string' && (!CREDIT_LINK_FIELDS.has(k) || isHttpsUrl(data.credit[k])))
      .map(k => [k, data.credit[k]]))
    : null
  return { names: [...new Set(data.names)], title: data.title, credit }
}

export function readCollectionCache(prefix, { storage = defaultStorage, now = Date.now() } = {}) {
  try {
    const entry = JSON.parse(storage()?.getItem(storageKey(prefix)) || 'null')
    if (entry?.v !== 1 || !Number.isFinite(entry.at) || entry.at < 0 || entry.at > now) return null
    const data = compactData(entry.data)
    return data ? { data, fresh: now - entry.at < COLLECTION_TTL } : null
  } catch { return null }
}

export function writeCollectionCache(prefix, data, { storage = defaultStorage, now = Date.now() } = {}) {
  try {
    const compact = compactData(data)
    if (compact) storage()?.setItem(storageKey(prefix), JSON.stringify({ v: 1, at: now, data: compact }))
  } catch { /* Storage can be unavailable or full; memory still holds the catalogue. */ }
}

// At most `max` calls to fn run at once; the rest wait their turn in order.
export function createLimiter(max) {
  let active = 0
  const queue = []
  const next = () => {
    if (active >= max || !queue.length) return
    const { fn, resolve, reject } = queue.shift()
    active += 1
    Promise.resolve().then(fn).then(resolve, reject).finally(() => { active -= 1; next() })
  }
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next() })
}

// Concurrent callers share a request; an explicit retry bypasses the failure cooldown (a chip retry only after the floor below).
// A chip-driven retry (chipRetry, with manualRetry) waits CHIP_RETRY_FLOOR after the last failure, so
// clicking chips against a service that fails fast does not re-request every pack; Try again never waits.
// A failed refresh of stale stored data still resolves with that data, but it is never put in
// the in-memory cache, so the cooldown and manual retries can request again. failed(prefix) tells
// the UI that the last request for a prefix failed and nothing newer has loaded since.
// `cooldownExempt(error)` marks failures that must not start the cooldown (a session
// problem is fixed by the viewer, not by waiting).
// A refusal that names its wait (`error.retryAfter`, seconds, from a Retry-After header) is a rate limit on
// the endpoint, not on one prefix: no prefix is requested again until it has passed, not even by Try again.
// `lastResort(prefix)` may supply a partial catalogue when a request fails and nothing is stored; like stale
// data it is returned but never cached, and a caller passing `allowSample: false` gets the failure instead.
export function createCollectionLoader({ cache, fetchEntry, storage = defaultStorage, now = Date.now, cooldownExempt = () => false, lastResort = null }) {
  const pending = new Map()
  const failures = new Map()
  let refusal = null
  const settleFailed = (prefix, stored, error, allowSample) => {
    if (stored) return Promise.resolve(stored.data)
    if (!lastResort || !allowSample) return Promise.reject(error)
    return Promise.resolve().then(() => lastResort(prefix))
      .then(data => { if (!data) throw error; return data }, () => { throw error })
  }
  function getCollectionNames(prefix, { manualRetry = false, chipRetry = false, allowSample = true } = {}) {
    if (cache.has(prefix)) return Promise.resolve(cache.get(prefix))
    if (pending.has(prefix)) return pending.get(prefix)
    const stored = readCollectionCache(prefix, { storage, now: now() })
    if (stored?.fresh) {
      cache.set(prefix, stored.data)
      return Promise.resolve(stored.data)
    }
    if (refusal && now() < refusal.until) {
      if (!failures.has(prefix)) failures.set(prefix, { at: now(), error: refusal.error })
      return settleFailed(prefix, stored, refusal.error, allowSample)
    }
    const failed = failures.get(prefix)
    const bypass = manualRetry && !(chipRetry && failed && now() - failed.at < CHIP_RETRY_FLOOR)
    if (!bypass && failed && now() - failed.at < COLLECTION_RETRY_DELAY) {
      return settleFailed(prefix, stored, failed.error, allowSample)
    }
    const request = Promise.resolve().then(() => fetchEntry(prefix))
      .then(data => {
        cache.set(prefix, data)
        failures.delete(prefix)
        writeCollectionCache(prefix, data, { storage, now: now() })
        return data
      })
      .catch(error => {
        if (!cooldownExempt(error)) failures.set(prefix, { at: now(), error })
        if (Number.isFinite(error?.retryAfter) && error.retryAfter > 0) {
          refusal = { until: now() + Math.min(error.retryAfter * 1000, COLLECTION_REFUSAL_MAX), error }
        }
        return settleFailed(prefix, stored, error, allowSample)
      })
      .finally(() => pending.delete(prefix))
    pending.set(prefix, request)
    return request
  }
  getCollectionNames.failed = (prefix) => failures.has(prefix) && !cache.has(prefix)
  return getCollectionNames
}
