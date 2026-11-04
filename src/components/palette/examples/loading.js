// Which example chunks are being downloaded right now.
//
// main.jsx answers a failed page chunk with one hard reload. An example is not
// a page: the preview dialog is open on top of a working app, and a reload
// would close it. The registry catches a failed example itself and shows
// "This example didn't load", so main.jsx asks here first and lets the failure
// through when an example is the one loading.
//
// Vite raises `vite:preloadError` inside the import's own promise chain, before
// the import rejects, so the count is still above zero when the event fires.
let inFlight = 0

/** True while at least one example chunk is downloading. */
export const exampleLoading = () => inFlight > 0

/** Runs `load` (an `() => import(...)`) and counts it as in flight until it settles. */
export function trackExampleLoad(load) {
  inFlight += 1
  let promise
  try {
    promise = Promise.resolve(load())
  } catch (error) {
    inFlight -= 1
    return Promise.reject(error)
  }
  const done = () => { inFlight -= 1 }
  promise.then(done, done)
  return promise
}
