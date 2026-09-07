/* `firebase/firestore`, as the TEST BUILD sees it. UIL4B_SIGNED_IN_FIXTURE_ONLY.
 *
 * The sibling of firebase-auth.js, and it exists for the same reason but a
 * different one is worth stating: a signed-in session does not only need an
 * identity, it needs the DOCUMENTS that identity implies. `useSubscription()`
 * reads Pro from `users/{uid}.subscription` over a Firestore snapshot, and
 * without a store to answer it, every "signed-in" session would silently be a
 * free one — which is the exact half of the product #388 could not render.
 *
 * It also keeps the suite's Firebase promise. AuthContext reads a profile,
 * ProjectContext and useFirestoreSync read and write a sync document, and
 * Settings reads the account doc. On a real signed-in load those are network
 * calls to firestore.googleapis.com. Answered from memory, a signed-in test
 * makes ZERO requests to any Firebase host — the same discipline the One Tap
 * stub already holds the suite to, extended to the half that only appears once
 * somebody is signed in. 57-signed-in-session.spec.js asserts it with a
 * positive control, because "no request escaped" is trivially true of a page
 * that never rendered.
 *
 * DISPATCH IS THE SAME RULE as firebase-auth.js: every override asks whether
 * the thing it was handed belongs to the fake store, and hands anything else to
 * the real SDK unchanged. With no session declared there is no fake store, so
 * `getFirestore()` returns the real instance and every downstream call takes
 * the real path.
 *
 * The five that take no reference — where, orderBy, limit, increment and
 * deleteField — cannot ask that question, so they dispatch on whether a store
 * exists at all. That is the same answer by a different route: if no session is
 * declared there is no store, and if one is declared then `getFirestore()`
 * returned the fake and every reference in the page is a fake reference. There
 * is no page on which the two disagree.
 *
 * COVERAGE IS EXACT. This implements the sixteen `firebase/firestore` exports
 * src/ imports and no more. Anything else stays the real function via the star
 * re-export — which for a fake reference would throw the SDK's own type error,
 * loudly, at the call site. A double that answered plausibly to a call it does
 * not model is how a fixture starts lying.
 */
import {
  getFirestore as realGetFirestore,
  doc as realDoc,
  collection as realCollection,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  setDoc as realSetDoc,
  addDoc as realAddDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  onSnapshot as realOnSnapshot,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  limit as realLimit,
  increment as realIncrement,
  deleteField as realDeleteField,
} from 'firebase/firestore'
import { fakeDb, IS_FAKE_DB, FIELD_OP, FIXTURE_MARKER } from './test-session.js'

export * from 'firebase/firestore'

const KIND = Symbol.for('uil4b.testSession.refKind')
const isFakeDb = (d) => !!(d && d[IS_FAKE_DB])
const isFakeRef = (r) => !!(r && r[KIND])
const isFake = (x) => isFakeDb(x) || isFakeRef(x)

function ref(kind, path, extra) {
  const id = path.slice(path.lastIndexOf('/') + 1)
  return {
    [KIND]: kind,
    path,
    id,
    firestore: fakeDb,
    store: fakeDb.store,
    ...extra,
  }
}

/* Firestore's own path rule, and it is load-bearing rather than pedantry:
 * `users/{uid}` is a document and `users/{uid}/sync` is a collection, so an odd
 * segment count is a collection and an even one is a document. useFirestoreSync
 * writes `users/{uid}/sync/data` and ProjectContext writes
 * `users/{uid}/sync/projects` — four segments each — so a double that only
 * modelled top-level collections would have dropped every synced project on the
 * floor while looking like it worked. */
function join(base, segments) {
  const parts = [base, ...segments].filter((s) => s !== undefined && s !== null && s !== '')
  return parts.join('/').split('/').filter(Boolean).join('/')
}

export function getFirestore(app) {
  return fakeDb || realGetFirestore(app)
}

export function doc(parent, ...segments) {
  if (!isFake(parent)) return realDoc(parent, ...segments)
  const base = isFakeDb(parent) ? '' : parent.path
  // `doc(collectionRef)` with no id mints one, the way the real API does.
  const path = segments.length ? join(base, segments) : join(base, [newId()])
  return ref('doc', path)
}

export function collection(parent, ...segments) {
  if (!isFake(parent)) return realCollection(parent, ...segments)
  const base = isFakeDb(parent) ? '' : parent.path
  return ref('collection', join(base, segments))
}

function snapshot(store, path) {
  const data = store.get(path)
  return {
    id: path.slice(path.lastIndexOf('/') + 1),
    ref: ref('doc', path),
    exists: () => data !== null,
    data: () => (data === null ? undefined : data),
    get: (field) => (data === null ? undefined : data[field]),
    metadata: { fromCache: true, hasPendingWrites: false },
  }
}

export function getDoc(reference) {
  if (!isFakeRef(reference)) return realGetDoc(reference)
  return Promise.resolve(snapshot(reference.store, reference.path))
}

export function setDoc(reference, data, options) {
  if (!isFakeRef(reference)) return realSetDoc(reference, data, options)
  reference.store.set(reference.path, data, !!options?.merge)
  return Promise.resolve()
}

export function updateDoc(reference, data) {
  if (!isFakeRef(reference)) return realUpdateDoc(reference, data)
  reference.store.set(reference.path, data, true)
  return Promise.resolve()
}

export function deleteDoc(reference) {
  if (!isFakeRef(reference)) return realDeleteDoc(reference)
  reference.store.remove(reference.path)
  return Promise.resolve()
}

export function addDoc(collectionRef, data) {
  if (!isFakeRef(collectionRef)) return realAddDoc(collectionRef, data)
  const path = `${collectionRef.path}/${newId()}`
  collectionRef.store.set(path, data, false)
  return Promise.resolve(ref('doc', path))
}

/* ── Queries ───────────────────────────────────────────────────────────── */

const CONSTRAINT = Symbol.for('uil4b.testSession.constraint')

export function where(field, op, value) {
  if (!fakeDb) return realWhere(field, op, value)
  return { [CONSTRAINT]: 'where', field, op, value }
}

export function orderBy(field, direction = 'asc') {
  if (!fakeDb) return realOrderBy(field, direction)
  return { [CONSTRAINT]: 'orderBy', field, direction }
}

export function limit(n) {
  if (!fakeDb) return realLimit(n)
  return { [CONSTRAINT]: 'limit', n }
}

export function query(source, ...constraints) {
  if (!isFakeRef(source)) return realQuery(source, ...constraints)
  return ref('query', source.path, {
    constraints: [...(source.constraints || []), ...constraints],
  })
}

const OPS = {
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  'in': (a, b) => Array.isArray(b) && b.includes(a),
  'not-in': (a, b) => Array.isArray(b) && !b.includes(a),
  'array-contains': (a, b) => Array.isArray(a) && a.includes(b),
}

function runQuery(reference) {
  let rows = reference.store.list(reference.path)
  for (const c of reference.constraints || []) {
    const kind = c?.[CONSTRAINT]
    if (kind === 'where') {
      const op = OPS[c.op]
      if (!op) throw new Error(`[${FIXTURE_MARKER}] unmodelled Firestore query operator "${c.op}"`)
      rows = rows.filter((r) => op(r.data[c.field], c.value))
    } else if (kind === 'orderBy') {
      const dir = c.direction === 'desc' ? -1 : 1
      rows = [...rows].sort((a, b) => {
        const x = a.data[c.field], y = b.data[c.field]
        if (x === y) return 0
        return (x > y ? 1 : -1) * dir
      })
    } else if (kind === 'limit') {
      rows = rows.slice(0, c.n)
    } else {
      throw new Error(`[${FIXTURE_MARKER}] unmodelled Firestore query constraint`)
    }
  }
  const docs = rows.map((r) => snapshot(reference.store, r.path))
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) }
}

export function getDocs(source) {
  if (!isFakeRef(source)) return realGetDocs(source)
  return Promise.resolve(runQuery(source))
}

/* onSnapshot's first callback is deferred a macrotask, for the same reason the
 * fake auth's is: SubscriptionContext starts at `loading: true` and the app has
 * a real render in that state (Projects.jsx's `resolving`, the entitlement
 * skeletons). A synchronous first answer would hand the app a world it never
 * sees in production and hide the bugs those states exist to catch. */
export function onSnapshot(source, ...rest) {
  if (!isFakeRef(source)) return realOnSnapshot(source, ...rest)
  const next = typeof rest[0] === 'function' ? rest[0] : rest[0]?.next
  const read = () => (source[KIND] === 'doc'
    ? snapshot(source.store, source.path)
    : runQuery(source))
  let live = true
  const fire = () => { if (live && next) next(read()) }
  setTimeout(fire, 0)
  const unwatch = source.store.watch(source.path, fire)
  return () => { live = false; unwatch() }
}

export function increment(by) {
  if (!fakeDb) return realIncrement(by)
  return { [FIELD_OP]: 'increment', by }
}

export function deleteField() {
  if (!fakeDb) return realDeleteField()
  return { [FIELD_OP]: 'delete' }
}

function newId() {
  return `t${Math.random().toString(36).slice(2, 12)}`
}
