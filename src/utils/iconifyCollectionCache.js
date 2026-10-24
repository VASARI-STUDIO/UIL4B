export const COLLECTION_TTL = 7 * 24 * 60 * 60 * 1000
export const COLLECTION_RETRY_DELAY = 60 * 1000
export const CHIP_RETRY_FLOOR = 3 * 1000
const storageKey = (prefix) => `uil4b:iconify:collection:${prefix}`
const defaultStorage = () => globalThis.localStorage
const CREDIT_FIELDS = ['name', 'author', 'url', 'spdx', 'licenceUrl']
const CREDIT_LINK_FIELDS = new Set(['url', 'licenceUrl'])
const isHttpsUrl = (value) => /^https:\/\//.test(value)

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

// Concurrent callers share a request; only an explicit retry bypasses the failure cooldown.
// A chip-driven retry (chipRetry, with manualRetry) waits CHIP_RETRY_FLOOR after the last failure, so
// clicking chips against a service that fails fast does not re-request every pack; Try again never waits.
// A failed refresh of stale stored data still resolves with that data, but it is never put in
// the in-memory cache, so the cooldown and manual retries can request again. failed(prefix) tells
// the UI that the last request for a prefix failed and nothing newer has loaded since.
export function createCollectionLoader({ cache, fetchEntry, storage = defaultStorage, now = Date.now }) {
  const pending = new Map()
  const failures = new Map()
  function getCollectionNames(prefix, { manualRetry = false, chipRetry = false } = {}) {
    if (cache.has(prefix)) return Promise.resolve(cache.get(prefix))
    if (pending.has(prefix)) return pending.get(prefix)
    const stored = readCollectionCache(prefix, { storage, now: now() })
    if (stored?.fresh) {
      cache.set(prefix, stored.data)
      return Promise.resolve(stored.data)
    }
    const failed = failures.get(prefix)
    const bypass = manualRetry && !(chipRetry && failed && now() - failed.at < CHIP_RETRY_FLOOR)
    if (!bypass && failed && now() - failed.at < COLLECTION_RETRY_DELAY) {
      return stored ? Promise.resolve(stored.data) : Promise.reject(failed.error)
    }
    const request = Promise.resolve().then(() => fetchEntry(prefix))
      .then(data => {
        cache.set(prefix, data)
        failures.delete(prefix)
        writeCollectionCache(prefix, data, { storage, now: now() })
        return data
      })
      .catch(error => {
        failures.set(prefix, { at: now(), error })
        if (!stored) throw error
        return stored.data
      })
      .finally(() => pending.delete(prefix))
    pending.set(prefix, request)
    return request
  }
  getCollectionNames.failed = (prefix) => failures.has(prefix) && !cache.has(prefix)
  return getCollectionNames
}
