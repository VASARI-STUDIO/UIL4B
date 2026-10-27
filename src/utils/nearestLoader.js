// Loads one nearest-match colour system on demand, with a session cache.
//
// Each system is its own JSON chunk (src/data/nearest/<id>.json, an import()
// in index.js), and only the panel's Pro branch calls this, so a Free user
// never requests one. A failed load is dropped from the cache so a retry asks
// again.
import { NEAREST_SYSTEMS } from '../data/nearest/index.js'

export function createSystemLoader(systems = NEAREST_SYSTEMS) {
  const cache = new Map()
  function loadSystem(id) {
    if (cache.has(id)) return cache.get(id)
    const entry = systems.find((s) => s.id === id)
    if (!entry) return Promise.reject(new Error(`Unknown colour system: ${id}`))
    const promise = Promise.resolve()
      .then(() => entry.load())
      .then((mod) => (mod && mod.default) || mod)
      .catch((err) => {
        cache.delete(id)
        throw err
      })
    cache.set(id, promise)
    return promise
  }
  return { loadSystem, cache }
}

const shared = createSystemLoader()
export const loadSystem = shared.loadSystem
