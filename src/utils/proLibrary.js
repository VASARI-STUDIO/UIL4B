// The Pro libraries, fetched on entitlement instead of shipped in the bundle.
//
// The browser's own copy of each library holds the rows a free account may open
// in full and a name-only stub for the rest (src/data/*, generated). A Pro
// account gets the whole library from GET /api/ai?library=<kind>
// (api/_lib/library/serve.js), which re-checks the plan server-side from the ID
// token, so nothing here is a gate: a forged `isPro` in devtools gets a 403.
//
// This module is the fetch and the per-session cache. The React side is
// src/hooks/useProLibrary.js.
//
//   - cached in memory per uid + kind, for the life of the page;
//   - every read of the cache names the uid it is for, so one account never
//     reads another's rows;
//   - concurrent requests for the same uid + kind share one fetch;
//   - everything is dropped when the signed-in uid changes (sign-out included).
//     That is done by a listener this module puts on the auth state the first
//     time it fetches, so it does not depend on any page or hook being mounted.
//
// There is no static import of the Firebase wrapper here: the hook hands the
// auth loader in (setProLibraryAuth), which keeps this file loadable on its own.
// createProLibrary builds an independent copy with its own state and
// collaborators, which is what the unit tests use.

export const libraryKey = (uid, kind) => `${uid}:${kind}`

/**
 * The state of a library for one viewer, as a pure function of what the hook knows.
 *
 *   wanted     the caller wants the library at all (the Palette Builder waits
 *              for its popup);
 *   enabled    a Pro account with a resolved plan and a uid: the fetch is on;
 *   cached / denied / failed   what this tab knows about the request;
 *   resolving  signed in, or a returning session whose auth has not answered,
 *              and the plan is not known yet.
 *
 * 'resolving' is what keeps a Pro account from being shown the free wall for the
 * moment before its plan arrives. A cold anonymous visitor is never 'resolving'.
 */
export function deriveLibraryStatus({ wanted, enabled, cached, denied, failed, resolving } = {}) {
  if (wanted !== true) return 'idle'
  if (enabled === true) {
    if (cached) return 'ready'
    if (denied) return 'refused'
    if (failed) return 'error'
    return 'loading'
  }
  return resolving ? 'resolving' : 'idle'
}

export function createProLibrary({ loadAuth = null, fetchImpl = null } = {}) {
  const env = { loadAuth, fetchImpl }
  const cache = new Map() // `${uid}:${kind}` -> items
  const inflight = new Map() // `${uid}:${kind}` -> Promise<outcome>
  const denied = new Set() // `${uid}:${kind}` the server answered 403 for
  const listeners = new Set() // (kind, uid) called when a library has been cached
  let watching = false

  const cachedLibrary = (key) => cache.get(key)
  const hasCachedLibrary = (key) => cache.has(key)
  /** What this tab has fetched for a kind, for that account only (null for any other). */
  function cachedLibraryOfKind(kind, uid) {
    if (!uid) return null
    return cache.get(libraryKey(uid, kind)) || null
  }
  const isLibraryDenied = (key) => denied.has(key)
  const clearLibraryDenied = (key) => { denied.delete(key) }

  function forgetWhere(drop) {
    for (const store of [cache, inflight]) {
      for (const key of [...store.keys()]) if (drop(key)) store.delete(key)
    }
    for (const key of [...denied]) if (drop(key)) denied.delete(key)
  }
  /** Drop everything that belongs to any uid but this one (null drops it all). */
  function forgetLibrariesExcept(uid) {
    const prefix = uid ? `${uid}:` : null
    forgetWhere((key) => !prefix || !key.startsWith(prefix))
  }
  /** Drop what belongs to this uid (an account that is no longer Pro). */
  function forgetLibrariesOf(uid) {
    if (!uid) return
    const prefix = `${uid}:`
    forgetWhere((key) => key.startsWith(prefix))
  }

  /** Call `listener(kind, uid)` each time a library lands in the cache. Returns the unsubscribe. */
  function onLibraryReady(listener) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  // Follow the auth state for as long as the page lives, so a sign-out or an
  // account switch empties the cache whether or not a hook is mounted.
  async function watchAuth() {
    if (watching) return
    watching = true
    try {
      const sdk = await env.loadAuth?.()
      if (typeof sdk?.onAuthStateChanged !== 'function') { watching = false; return }
      sdk.onAuthStateChanged(sdk.auth, (user) => forgetLibrariesExcept(user?.uid || null))
    } catch {
      watching = false
    }
  }

  async function request(kind, uid) {
    const sdk = await env.loadAuth?.()
    // The token must be this account's: a request keyed on one uid never goes
    // out under whoever is signed in by the time it runs.
    const user = sdk?.auth?.currentUser
    if (!user || user.uid !== uid) return { outcome: 'error' }
    const token = await user.getIdToken()
    if (!token) return { outcome: 'error' }
    const doFetch = env.fetchImpl || globalThis.fetch
    const response = await doFetch(`/api/ai?library=${encodeURIComponent(kind)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 403) return { outcome: 'denied' }
    if (!response.ok) return { outcome: 'error' }
    const body = await response.json().catch(() => null)
    if (!body || body.kind !== kind || !Array.isArray(body.items)) return { outcome: 'error' }
    return { outcome: 'ready', items: body.items }
  }

  /**
   * Load one library for one account. Never rejects: resolves 'ready', 'denied'
   * (the server says this account is not Pro), 'error' (network, 5xx, bad body)
   * or 'discarded' (the account signed out or changed while it was in flight, so
   * the answer was dropped). Failures are not cached, so a retry asks again.
   */
  function loadProLibrary(kind, uid) {
    const key = libraryKey(uid, kind)
    if (cache.has(key)) return Promise.resolve('ready')
    if (denied.has(key)) return Promise.resolve('denied')
    if (inflight.has(key)) return inflight.get(key)
    watchAuth()
    const run = request(kind, uid)
      .catch(() => ({ outcome: 'error' }))
      .then(({ outcome, items }) => {
        // Only keep it if this uid is still the one being served; the entry for a
        // signed-out account was dropped by forgetLibrariesExcept and must stay gone.
        if (inflight.get(key) !== run) return 'discarded'
        inflight.delete(key)
        if (outcome === 'ready') {
          cache.set(key, items)
          for (const listener of [...listeners]) {
            try { listener(kind, uid) } catch { /* a listener never breaks the load */ }
          }
        } else if (outcome === 'denied') denied.add(key)
        return outcome
      })
    inflight.set(key, run)
    return run
  }

  return {
    cachedLibrary, hasCachedLibrary, cachedLibraryOfKind, isLibraryDenied, clearLibraryDenied,
    forgetLibrariesExcept, forgetLibrariesOf, onLibraryReady, loadProLibrary,
    /** Where the auth SDK comes from: () => Promise<{ auth, onAuthStateChanged }>. */
    setAuth(loader) { env.loadAuth = loader },
  }
}

const shared = createProLibrary()

export const setProLibraryAuth = shared.setAuth
export const cachedLibrary = shared.cachedLibrary
export const hasCachedLibrary = shared.hasCachedLibrary
export const cachedLibraryOfKind = shared.cachedLibraryOfKind
export const isLibraryDenied = shared.isLibraryDenied
export const clearLibraryDenied = shared.clearLibraryDenied
export const forgetLibrariesExcept = shared.forgetLibrariesExcept
export const forgetLibrariesOf = shared.forgetLibrariesOf
export const onLibraryReady = shared.onLibraryReady
export const loadProLibrary = shared.loadProLibrary
