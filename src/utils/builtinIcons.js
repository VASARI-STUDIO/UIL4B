/* global icons, PACKS */

// THE BUILT-IN ICON SET, LOADED WHERE IT IS USED.
//
// public/icons-data.js is a classic script (`const icons = [...]`, `const PACKS`)
// whose header carries the licence notices of the five projects it is redrawn
// from, so it stays a plain file that nothing minifies. index.html used to load
// it on every route as a blocking <script>, with an inline script copying its
// three constants onto `window`. Only the icon library reads it, so the document
// paid about 16 KB gzipped, on the critical path, on every page for one tool.
//
// It is now fetched by the page that needs it, and read through this module
// rather than through `window`. The data is a fallback and a tease: the library's
// real catalogue comes from the Iconify service, so nothing waits on this except
// the built-in grid shown when that service refuses, the "your recent icons"
// fill flag and the end-of-list stand-ins. Each of those handles "not here yet".
//
// The icons routes' shells preload the file (ROUTE_EXTRA_SCRIPTS in
// scripts/route-chunks.mjs), so it normally arrives beside the page chunk.

/** What every reader gets until the file has loaded, or if it never does. */
export const NO_BUILTIN_ICONS = Object.freeze({ icons: Object.freeze([]), packs: Object.freeze({}) })

const SRC = '/icons-data.js'

let loaded = null
let pending = null

const fromGlobals = () => ({
  icons: typeof icons !== 'undefined' ? icons : [],
  packs: typeof PACKS !== 'undefined' ? PACKS : {},
})

/** `{ icons, packs }` if the file has loaded, else null. Synchronous. */
export function builtinIcons() {
  return loaded
}

/**
 * Load the file once. Always resolves: a failed load gives the empty set (the
 * same thing the old inline script produced) and is tried again next time it is asked for.
 */
export function loadBuiltinIcons() {
  if (loaded) return Promise.resolve(loaded)
  // A shell served before this change still ran the script; its constants are already here.
  if (typeof icons !== 'undefined') {
    loaded = fromGlobals()
    return Promise.resolve(loaded)
  }
  if (typeof document === 'undefined') return Promise.resolve(NO_BUILTIN_ICONS)
  if (pending) return pending
  pending = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => {
      loaded = fromGlobals()
      pending = null
      resolve(loaded)
    }
    script.onerror = () => {
      script.remove()
      pending = null
      resolve(NO_BUILTIN_ICONS)
    }
    document.head.appendChild(script)
  })
  return pending
}
