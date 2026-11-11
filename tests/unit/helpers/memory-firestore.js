// An in-memory Firestore double for the API unit tests: merge writes, the
// equality query the customer-id lookup uses, and transactions. No network.
//
// `db.docs` is the raw Map (path -> data) and `db.doc(path)` reads one document.

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
}

function deepMerge(target, source) {
  const out = { ...target }
  for (const [key, value] of Object.entries(source)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : structuredClone(value)
  }
  return out
}

export function memoryDb(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([path, data]) => [path, structuredClone(data)]))
  const write = (path, data, opts) => {
    docs.set(path, opts?.merge ? deepMerge(docs.get(path) || {}, data) : structuredClone(data))
  }
  const snapshot = (path) => {
    const data = docs.get(path)
    return { exists: data !== undefined, data: () => (data === undefined ? undefined : structuredClone(data)) }
  }
  const ref = (path) => ({
    path,
    get: async () => snapshot(path),
    set: async (data, opts) => write(path, data, opts),
    delete: async () => { docs.delete(path) },
  })
  return {
    docs,
    doc: (path) => docs.get(path),
    collection: (name) => ({
      doc: (id) => ref(`${name}/${id}`),
      where: (field, _op, value) => ({
        limit: (n) => ({
          get: async () => {
            const hits = [...docs].filter(([path, data]) => path.startsWith(`${name}/`) && data?.[field] === value).slice(0, n)
            return { empty: !hits.length, size: hits.length, docs: hits.map(([path]) => ({ id: path.slice(name.length + 1) })) }
          },
        }),
      }),
    }),
    async runTransaction(fn) {
      const pending = []
      const tx = {
        get: async (r) => snapshot(r.path),
        set: (r, data, opts) => { pending.push(() => write(r.path, data, opts)) },
        delete: (r) => { pending.push(() => docs.delete(r.path)) },
      }
      const result = await fn(tx)
      for (const apply of pending) apply()
      return result
    },
  }
}
