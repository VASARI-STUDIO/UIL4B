// Loads one nearest-match colour system on demand, with a session cache.
//
// Each system is its own hashed JSON asset (src/data/nearest/<id>.json, a `?url`
// import in src/data/nearest/urls.js), fetched with fetch(). Only the panel's
// Pro branch calls this, so a Free user never requests one.
//
// WHY fetch() AND NOT import(). Once a dynamic import rejects, the browser's
// module map caches the FAILURE and every later import() of that URL re-rejects
// without touching the network, so "Try again" could never succeed and neither
// could coming back online. A fetch() has no such cache, so a retry is a real
// request. It also never raises vite:preloadError, so main.jsx's stale-deploy
// reload does not throw away a working page. src/data/emojiIndexLoader.js
// documents the same fault.
//
// A failed load is dropped from the cache so a retry asks again. The URLs come
// in as an argument (the default set lives in nearestSystems.js) so this file
// stays importable by node's test runner, which cannot resolve `?url`.

export function createSystemLoader(urls, fetchImpl = (...args) => fetch(...args)) {
  const cache = new Map()
  function loadSystem(id) {
    if (cache.has(id)) return cache.get(id)
    const url = urls[id]
    if (!url) return Promise.reject(new Error(`Unknown colour system: ${id}`))
    const promise = Promise.resolve()
      .then(() => fetchImpl(url))
      .then((res) => {
        // A 404 resolves rather than rejecting; without this it would reach
        // res.json() and fail there with a less useful message.
        if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!data || !Array.isArray(data.rows) || !data.rows.length) throw new Error(`${id}: no colour rows`)
        return data
      })
      .catch((err) => {
        cache.delete(id)
        throw err
      })
    cache.set(id, promise)
    return promise
  }
  return { loadSystem, cache }
}
