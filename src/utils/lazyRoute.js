// Lazy pages whose file failed to download.
//
// After a redeploy, an open tab still runs the previous index.html, and its
// next `import()` asks for a hashed file that no longer exists. A dropped
// connection, a blocker or a flaky network produces the same failure. Vite
// fires `vite:preloadError` for it, and `handlePreloadError` below answers with
// one hard reload, which fetches the current index.html and its chunk set.
//
// THE CATCH IN THAT REPLY. When a listener calls `preventDefault()`, Vite's
// preload helper swallows the error and the `import()` RESOLVES WITH
// `undefined`. React's `lazy()` then reads `.default` from it and throws
// "Cannot read properties of undefined (reading 'default')", so the error
// boundary paints a crash card and files a crash report in the moment before
// the reload lands, for a page that has nothing wrong with it.
//
// `lazyRoute()` closes that gap: an import that resolved with no module keeps
// Suspense on its loading fallback until the reload replaces the document. If
// the reload never lands, it fails after RELOAD_GRACE_MS with a chunk-load
// error, which the boundary shows as a "try again" state rather than a spinner
// that never ends.
//
// ONE IMPORT CAN FAIL TWICE. When a page's stylesheet and its JS are both
// missing, Vite raises one `vite:preloadError` for each. The first starts the
// reload; the second meets the reload guard, goes through, and the import
// REJECTS. While the reload is in flight that rejection is the same failure
// again, so `lazyRoute()` holds it on the loading fallback exactly like the
// `undefined` case.

import { lazy } from 'react'

export const CHUNK_RELOAD_KEY = 'vs-chunk-reload'
/** A second chunk failure within this window does not reload again. */
export const RELOAD_GUARD_MS = 30 * 1000
/** How long a page waits for its own reload before showing the retry state. */
export const RELOAD_GRACE_MS = 15 * 1000

const CHUNK_LOAD_ERROR = 'ChunkLoadError'

// The messages browsers and Vite's preload helper give a page file or its
// stylesheet that could not be fetched: Chromium, Safari, Firefox, then Vite's
// CSS preload.
const CHUNK_LOAD_RE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i

/** True for an error that means a page's code never arrived, as opposed to
 *  code that arrived and then threw. Takes an Error, a string or anything. */
export function isChunkLoadError(error) {
  if (!error) return false
  if (error.name === CHUNK_LOAD_ERROR) return true
  const message = typeof error === 'string' ? error : error.message
  return CHUNK_LOAD_RE.test(String(message || ''))
}

// When the recovery reload stops counting as "in flight": RELOAD_GRACE_MS after
// it started, or as soon as a page's grace timer gives up on it. A reload that
// did not replace the document (cancelled, or answered with no new page) must
// not hide later failures for the rest of the page's life.
let reloadPendingUntil = 0

/** True while a reload started to recover a failed chunk is still expected to
 *  replace this document. A chunk failure raised meanwhile is the one being
 *  recovered, not a new one. */
export function chunkReloadPending(now = Date.now()) {
  return now < reloadPendingUntil
}

function endChunkReload() {
  reloadPendingUntil = 0
}

/**
 * What main.jsx's `vite:preloadError` listener does with a failure, with the
 * browser passed in. Returns true when it took the failure over and started a
 * reload, false when it let the error through to the page.
 *
 * OFFLINE IS NOT A STALE DEPLOY, and reloading cannot fix it. A reload there
 * throws away a working, already-rendered app and re-fetches everything over a
 * connection that just failed, turning "this panel needs the network" into a
 * blank page. So offline, the error goes through and the boundary says so.
 *
 * The reload is guarded in sessionStorage: a second failure inside
 * RELOAD_GUARD_MS means the reload did not help, so the error goes through and
 * the page shows the retry state instead of reloading in a loop. Storage that
 * cannot be read or written cannot hold that guard, so it never reloads.
 */
export function handlePreloadError(event, { online, storage, now, reload }) {
  if (online === false) return false
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (now - last < RELOAD_GUARD_MS) return false
    storage.setItem(CHUNK_RELOAD_KEY, String(now))
  } catch {
    return false
  }
  reloadPendingUntil = now + RELOAD_GRACE_MS
  event.preventDefault()
  reload()
  return true
}

/**
 * What `lazy()` should receive for one resolved `import()`. A module passes
 * straight through. `undefined` means the preload handler has started a reload,
 * so the answer is a promise that stays pending, and rejects with a chunk-load
 * error only if the document is still here after `graceMs`. By then the reload
 * has failed, so the pending state ends and that error is reported.
 */
export function settleRouteModule(module, { graceMs = RELOAD_GRACE_MS, setTimer = setTimeout } = {}) {
  if (module != null) return module
  return new Promise((resolve, reject) => {
    setTimer(() => {
      endChunkReload()
      const error = new Error('Unable to load this page: the reload to fetch it did not complete')
      error.name = CHUNK_LOAD_ERROR
      reject(error)
    }, graceMs)
  })
}

/**
 * What `lazy()` should receive for one rejected `import()`. A chunk-load failure
 * while the recovery reload is in flight is held like an `undefined` module;
 * anything else, or a failure with no reload pending, goes through.
 */
export function settleRouteError(error, options) {
  if (isChunkLoadError(error) && chunkReloadPending()) return settleRouteModule(undefined, options)
  throw error
}

/** `lazy()` for a page or any code-split component, safe against a chunk that
 *  failed to download. */
export function lazyRoute(importer, options) {
  return lazy(() => importer().then(
    (module) => settleRouteModule(module, options),
    (error) => settleRouteError(error, options),
  ))
}
