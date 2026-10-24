// Runs the REAL src/utils/analytics.js in Node against an in-memory Firestore.
//
// analytics.js imports its siblings without file extensions and reaches
// Firestore through ./firebaseAccess, neither of which plain Node can load. A
// resolve hook adds the missing `.js` for imports made from src/ and points the
// firebaseAccess import at tests/helpers/fake-firebase-access.js. Nothing in
// analytics.js is replaced, so what a test calls is the code that ships.
import { registerHooks } from 'node:module'
import { mock } from 'node:test'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { store, resetStore } from './fake-firebase-access.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC_URL = pathToFileURL(path.join(HERE, '..', '..', 'src')).href
const FAKE_URL = pathToFileURL(path.join(HERE, 'fake-firebase-access.js')).href

let installed = false
let analyticsPromise = null
let unload = null
const memoryStorage = new Map()

function install() {
  if (installed) return
  installed = true
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const fromSrc = context.parentURL && context.parentURL.startsWith(SRC_URL)
      if (fromSrc && specifier.startsWith('.')) {
        if (/(^|\/)firebaseAccess$/.test(specifier)) return { url: FAKE_URL, shortCircuit: true }
        if (!path.extname(specifier)) return nextResolve(`${specifier}.js`, context)
      }
      return nextResolve(specifier, context)
    },
  })
  // The browser surface analytics.js touches, on the production host so the
  // shared-write guard lets the flush through.
  globalThis.location = { hostname: 'uil4b.com' }
  globalThis.document = { referrer: '' }
  globalThis.localStorage = {
    getItem: (k) => (memoryStorage.has(k) ? memoryStorage.get(k) : null),
    setItem: (k, v) => { memoryStorage.set(k, String(v)) },
    removeItem: (k) => { memoryStorage.delete(k) },
  }
  globalThis.window = {
    // analytics.js flushes on `beforeunload`; capturing the handler lets a
    // test flush exactly as a closing tab would.
    addEventListener: (type, fn) => { if (type === 'beforeunload') unload = fn },
    removeEventListener: () => {},
  }
}

/** Import the real analytics module (once) with the fakes installed. */
export function loadAnalytics() {
  install()
  if (!analyticsPromise) analyticsPromise = import('../../src/utils/analytics.js')
  return analyticsPromise
}

/** Write whatever the trackers have queued, as a closing tab would. */
export function flush() {
  if (!unload) throw new Error('nothing has been queued: no tracker has run yet')
  unload()
}

/** Make "today" the given local calendar day, so a write lands in that day's document. */
export function setDay(year, month, day) {
  mock.timers.reset()
  mock.timers.enable({ apis: ['Date'], now: new Date(year, month - 1, day, 12, 0, 0).getTime() })
}

/** Forget every stored document, queued counter and local value. */
export function resetAll() {
  resetStore()
  memoryStorage.clear()
}

export { store }
