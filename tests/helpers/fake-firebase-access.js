// A stand-in for src/utils/firebaseAccess.js that keeps `analytics-daily` in
// memory, so the real analytics writers and the real reader can be run end to
// end in Node. Only what analytics.js calls is implemented, with the semantics
// that matter to it:
//
//   - setDoc(ref, data, { merge: true }) merges top-level fields; an
//     increment() adds to the stored number and a deleteField() removes it;
//   - a field name matching __x__ is refused, as Firestore refuses it;
//   - getDocs(query(..., orderBy('day', 'desc'), limit(n))) returns the newest
//     n documents first.

/** path ("analytics-daily/2026-09-18") → { field: value } */
export const store = new Map()

const INC = Symbol('increment')
const DEL = Symbol('deleteField')

export function resetStore() { store.clear() }

const db = { fake: true }

function assertFieldName(name) {
  if (!name || /^__.*__$/.test(name)) throw new Error(`invalid Firestore field name: ${name}`)
}

const firestore = {
  db,
  doc: (_db, coll, id) => ({ path: `${coll}/${id}`, coll, id }),
  collection: (_db, coll) => ({ coll }),
  orderBy: (field, dir) => ({ field, dir }),
  limit: (n) => ({ n }),
  query: (coll, ...parts) => ({ coll, parts }),
  increment: (n) => ({ [INC]: n }),
  deleteField: () => ({ [DEL]: true }),
  async setDoc(ref, data, options) {
    for (const k of Object.keys(data)) assertFieldName(k)
    const current = options?.merge ? { ...(store.get(ref.path) || {}) } : {}
    for (const [k, v] of Object.entries(data)) {
      if (v && v[INC] !== undefined) current[k] = (typeof current[k] === 'number' ? current[k] : 0) + v[INC]
      else if (v && v[DEL]) delete current[k]
      else current[k] = v
    }
    store.set(ref.path, current)
  },
  async getDocs(q) {
    const prefix = `${q.coll.coll}/`
    let docs = [...store.entries()]
      .filter(([p]) => p.startsWith(prefix))
      .map(([p, data]) => ({ id: p.slice(prefix.length), data: () => ({ ...data }) }))
    const order = q.parts.find(p => p.field)
    if (order) {
      const dir = order.dir === 'desc' ? -1 : 1
      docs.sort((a, b) => (a.data()[order.field] > b.data()[order.field] ? 1 : -1) * dir)
    }
    const lim = q.parts.find(p => p.n !== undefined)
    if (lim) docs = docs.slice(0, lim.n)
    return { docs }
  },
}

const signedIn = { auth: { currentUser: { uid: 'fixture-user' } } }

export function firebaseNow() { return signedIn }
export function firestoreNow() { return firestore }
export function loadFirestore() { return Promise.resolve(firestore) }
