// A module loader hook for unit tests that have to run code which imports
// Firebase or the React auth context. Node cannot load those (extensionless
// relative imports, the whole Firebase SDK), so the test registers this hook
// and the three outside things are replaced with stand-ins the test controls
// through globalThis. Our own modules load for real.
//
//   register('./helpers/stub-loader.mjs', import.meta.url, { data: { queueApi: false } })
//
//   firebase/firestore   ->  globalThis.__FS__   { setDoc, getDoc } (the only calls made)
//   ./firebase           ->  { db: {} }
//   contexts/AuthContext ->  useAuth() returns globalThis.__AUTH__
//   communityQueueApi    ->  (only with data.queueApi) globalThis.__QUEUE_API__ { listMySubmissions, publishToQueueOnce }
//
// Everything else that is imported without an extension gets .js or .jsx tried.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

let stubQueueApi = false
export function initialize(data) { stubQueueApi = Boolean(data && data.queueApi) }

const STUBS = {
  'stub:firestore': `
    export const collection = (...a) => ({ collection: a.slice(1).join('/') })
    let autoId = 0
    export const doc = (first, ...segs) => (first && first.collection !== undefined && segs.length === 0)
      ? { col: first.collection, id: 'auto' + (++autoId) }
      : { col: segs.slice(0, -1).join('/'), id: segs[segs.length - 1] }
    export const setDoc = (...a) => globalThis.__FS__.setDoc(...a)
    export const getDoc = (...a) => globalThis.__FS__.getDoc(...a)
    export const writeBatch = () => globalThis.__FS__.writeBatch()
    export const serverTimestamp = () => ({ __serverTimestamp: true })
    export const addDoc = () => { throw new Error('addDoc is not stubbed') }
    export const getDocs = () => { throw new Error('getDocs is not stubbed') }
    export const updateDoc = () => { throw new Error('updateDoc is not stubbed') }
    export const deleteDoc = () => { throw new Error('deleteDoc is not stubbed') }
    export const query = (...a) => a
    export const where = (...a) => a
    export const orderBy = (...a) => a
    export const limit = (n) => n
  `,
  'stub:firebase': 'export const db = {}',
  'stub:auth': 'export const useAuth = () => globalThis.__AUTH__',
  'stub:queueapi': `
    export const listMySubmissions = (...a) => globalThis.__QUEUE_API__.listMySubmissions(...a)
    export const publishToQueueOnce = (...a) => globalThis.__QUEUE_API__.publishToQueueOnce(...a)
  `,
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'firebase/firestore') return { url: 'stub:firestore', shortCircuit: true }
  if (/(^|\/)utils\/firebase$|^\.\/firebase$/.test(specifier)) return { url: 'stub:firebase', shortCircuit: true }
  if (/contexts\/AuthContext$/.test(specifier)) return { url: 'stub:auth', shortCircuit: true }
  if (stubQueueApi && /communityQueueApi$/.test(specifier)) return { url: 'stub:queueapi', shortCircuit: true }
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    for (const ext of ['.js', '.jsx']) {
      const candidate = new URL(specifier + ext, context.parentURL)
      if (fs.existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (STUBS[url]) return { format: 'module', source: STUBS[url], shortCircuit: true }
  return nextLoad(url, context)
}
