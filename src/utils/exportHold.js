// An export started signed out holds the new-account route to /onboarding until
// its file is saved. Signing up inside the export dialog (or a download gate)
// raises the onboarding flag; routing away at once unmounts the dialog and the
// export it was waiting to finish.
//
// Each hold lifts itself after ONBOARDING_HOLD_MAX_MS, so a stalled export never
// keeps a new account out of onboarding.

export const ONBOARDING_HOLD_MAX_MS = 30000

let holds = 0
const listeners = new Set()

function notify() {
  for (const fn of listeners) fn()
}

export function onboardingHeld() {
  return holds > 0
}

export function subscribeOnboardingHold(fn) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Takes a hold. Returns its release, which is safe to call more than once. */
export function holdOnboardingForExport(maxMs = ONBOARDING_HOLD_MAX_MS) {
  let released = false
  holds += 1
  notify()
  const release = () => {
    if (released) return
    released = true
    clearTimeout(timer)
    holds -= 1
    notify()
  }
  const timer = setTimeout(release, maxMs)
  return release
}
