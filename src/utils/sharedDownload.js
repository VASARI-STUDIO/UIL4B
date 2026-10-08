// One download shared by every caller that needs it.
//
// An engine or decoder is fetched once per visit and reused, so the request is
// kept for the next caller. It therefore cannot belong to whichever caller
// happened to start it: if that caller cancels, aborting the fetch would fail
// everyone waiting on the same promise. Here the download runs on its own, and
// each caller's AbortSignal detaches only that caller. When the last attached
// caller leaves before the download settles, nobody wants it any more: it is
// aborted and forgotten, so the next caller starts a fresh one rather than
// joining a stalled request. A download that fails is forgotten the same way.

function abortError() {
  return Object.assign(new Error('cancelled'), { name: 'AbortError' })
}

/**
 * @template T
 * @param {(report: (progress: object) => void, signal: AbortSignal) => Promise<T>} start  begins the download; `report` fans out to every attached caller, `signal` aborts when the last one leaves
 * @returns {((opts?: { signal?: AbortSignal, onProgress?: (progress: object) => void }) => Promise<T>) & { reset: () => void }}
 */
export function sharedDownload(start) {
  let current = null

  function join({ signal, onProgress } = {}) {
    if (signal?.aborted) return Promise.reject(abortError())
    if (!current) {
      const controller = new AbortController()
      const entry = { listeners: new Set(), last: null, promise: null, callers: 0, settled: false, controller }
      const report = (progress) => {
        entry.last = progress
        for (const listener of entry.listeners) listener(progress)
      }
      try {
        entry.promise = Promise.resolve(start(report, controller.signal))
      } catch (err) {
        entry.promise = Promise.reject(err)
      }
      current = entry
      entry.promise.then(
        () => { entry.settled = true },
        () => { entry.settled = true; if (current === entry) current = null },
      )
    }
    const entry = current
    return new Promise((resolve, reject) => {
      entry.callers++
      let attached = true
      const detach = () => {
        if (!attached) return
        attached = false
        if (onProgress) entry.listeners.delete(onProgress)
        signal?.removeEventListener('abort', onAbort)
        if (--entry.callers === 0 && !entry.settled) {
          if (current === entry) current = null
          entry.controller.abort()
        }
      }
      const onAbort = () => { detach(); reject(abortError()) }
      signal?.addEventListener('abort', onAbort, { once: true })
      if (onProgress) {
        entry.listeners.add(onProgress)
        if (entry.last) onProgress(entry.last)
      }
      entry.promise.then(
        (value) => { detach(); resolve(value) },
        (err) => { detach(); reject(err) },
      )
    })
  }

  /** Forget the download (a failed worker, a test): the next caller starts afresh. */
  join.reset = () => { current = null }
  return join
}
