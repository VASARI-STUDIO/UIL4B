// THE HOMEPAGE'S BELOW-THE-FOLD SECTION CHUNKS, AND WHEN TO FETCH THEM.
//
// Spectrum.jsx hands each loader to lazy(). `prefetchBelowFold` calls the same
// loaders once the page is idle, with nothing mounted: the chunk and its
// stylesheet are in the cache by the time a section's stand-in comes within
// reach of the viewport, so the section mounts at once and a fast scroll does not
// sit on an empty stand-in while a download runs. Mounting stays with
// DeferredSection, which still waits for the stand-in to be near.

export const loadBookmarks = () => import('./HomeBookmarks')
export const loadTry = () => import('./HomeTry')
export const loadExports = () => import('./HomeExports')
export const loadShowcase = () => import('./HomeShowcase')
export const loadPlans = () => import('./HomePlans')

// In the order a visitor reaches them.
const LOADERS = [loadBookmarks, loadTry, loadExports, loadShowcase, loadPlans]

// A pause after the load event before the first chunk, so the first screen's
// own work is finished and the browser is not asked for more while it paints.
const START_DELAY_MS = 1500
// The longest a chunk waits for an idle moment before it goes anyway.
const IDLE_TIMEOUT_MS = 4000

function whenIdle(run) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(run, 200)
  return () => window.clearTimeout(id)
}

/** Starts fetching the section chunks one at a time, each in an idle callback,
 *  after the page has loaded. Skipped when the visitor has asked to save data.
 *  Returns a function that stops it. */
export function prefetchBelowFold() {
  if (typeof window === 'undefined') return () => {}
  if (navigator.connection?.saveData) return () => {}

  let cancelled = false
  let cancelStep = () => {}
  let startTimer = 0
  let index = 0

  const step = () => {
    if (cancelled || index >= LOADERS.length) return
    // A failed download is not reported here: the section asks for the same
    // chunk when it mounts and handles the failure there.
    LOADERS[index++]().catch(() => {}).finally(() => {
      if (!cancelled) cancelStep = whenIdle(step)
    })
  }
  const begin = () => {
    startTimer = window.setTimeout(() => { cancelStep = whenIdle(step) }, START_DELAY_MS)
  }

  const onLoad = () => begin()
  if (document.readyState === 'complete') begin()
  else window.addEventListener('load', onLoad, { once: true })

  return () => {
    cancelled = true
    cancelStep()
    window.clearTimeout(startTimer)
    window.removeEventListener('load', onLoad)
  }
}
