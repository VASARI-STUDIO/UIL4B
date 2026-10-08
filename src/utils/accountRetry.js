// Re-reads the signed-in account's data after a failed read.
//
// A read can fail without the browser ever reporting "offline" (a dropped
// request, a timeout, a server error), so waiting for the `online` event alone
// can leave the account unloaded until a reload. This controller retries on:
//
//   - a bounded exponential backoff (BASE_MS, doubling, capped at CAP_MS,
//     at most MAX_RETRIES scheduled retries after the first attempt), and
//   - the signals that mean the person is back: `online`, window `focus`, and
//     the tab becoming visible.
//
// Only one load is ever in flight. `load()` resolves true when there is nothing
// left to retry (read succeeded, or the session it belonged to is gone) and
// false when the account still has not answered. Success, `cancel()` and a
// sign-out/user switch (the caller cancels) all remove every timer and listener.
//
// State lives in this closure rather than in a component ref, so it is safe
// across effect re-runs.

export const RETRY_BASE_MS = 2000
export const RETRY_CAP_MS = 30000
export const RETRY_MAX_RETRIES = 5
// Focus and visibility usually fire together; a trigger inside this window of
// the last attempt is ignored.
export const RETRY_MIN_GAP_MS = 1000

/** Delay before scheduled retry number `n` (1-based): 2s, 4s, 8s, ... capped. */
export function retryDelay(n, baseMs = RETRY_BASE_MS, capMs = RETRY_CAP_MS) {
  const step = Math.max(1, Math.floor(n))
  return Math.min(capMs, baseMs * 2 ** (step - 1))
}

export function createAccountRetry({
  load,
  maxRetries = RETRY_MAX_RETRIES,
  baseMs = RETRY_BASE_MS,
  capMs = RETRY_CAP_MS,
  minGapMs = RETRY_MIN_GAP_MS,
  now = Date.now,
  setTimer = (...args) => setTimeout(...args),
  clearTimer = (id) => clearTimeout(id),
  win = typeof window !== 'undefined' ? window : null,
  doc = typeof document !== 'undefined' ? document : null,
} = {}) {
  let stopped = false
  let inFlight = false
  let armed = false
  let timer = null
  let retriesUsed = 0
  let lastAttemptAt = -Infinity

  const clearPending = () => {
    if (timer !== null) { clearTimer(timer); timer = null }
  }

  const onBack = () => trigger(false)
  const onVisibility = () => trigger(true)

  const arm = () => {
    if (armed) return
    armed = true
    win?.addEventListener?.('online', onBack)
    win?.addEventListener?.('focus', onBack)
    doc?.addEventListener?.('visibilitychange', onVisibility)
  }

  const disarm = () => {
    if (!armed) return
    armed = false
    win?.removeEventListener?.('online', onBack)
    win?.removeEventListener?.('focus', onBack)
    doc?.removeEventListener?.('visibilitychange', onVisibility)
  }

  const cancel = () => {
    stopped = true
    clearPending()
    disarm()
  }

  const schedule = () => {
    clearPending()
    if (stopped || retriesUsed >= maxRetries) return
    timer = setTimer(() => {
      timer = null
      retriesUsed += 1
      attempt()
    }, retryDelay(retriesUsed + 1, baseMs, capMs))
  }

  function attempt() {
    if (stopped || inFlight) return
    inFlight = true
    lastAttemptAt = now()
    clearPending()
    let result
    try { result = Promise.resolve(load()) } catch { result = Promise.resolve(false) }
    result.then((settled) => settled === true, () => false).then((settled) => {
      inFlight = false
      if (stopped) return
      if (settled) { cancel(); return }
      arm()
      schedule()
    })
  }

  function trigger(needsVisible) {
    if (stopped || inFlight) return
    if (needsVisible && doc && doc.visibilityState !== 'visible') return
    if (now() - lastAttemptAt < minGapMs) return
    attempt()
  }

  return {
    /** Make the first attempt now; retries follow only if it does not settle. */
    start: attempt,
    cancel,
  }
}
