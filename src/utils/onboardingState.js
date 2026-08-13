// Has this PERSON finished onboarding — not "has this browser seen it".
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The decision used to be `localStorage.getItem('vs-onboarded') === '1'` and
// nothing else. localStorage is per-origin, per-browser and per-profile, so an
// established account was sent back through the three-question survey on:
//
//   • a second device,
//   • a second browser on the same device,
//   • a private/incognito window,
//   • any "clear site data",
//   • and — because Safari and Firefox evict storage from sites you have not
//     visited recently — simply not opening the app for a while.
//
// Worse, `skip()` wrote ONLY localStorage and never touched the profile. So
// anyone who skipped had nothing recorded on their account at all, and got
// onboarding again forever, on every browser.
//
// The profile is the account-level truth. This module is the one place that
// decides, so the router and the tests cannot disagree.
//
// DOM-free and React-free.

export const ONBOARDED_KEY = 'vs-onboarded'

/**
 * Completion as recorded on the account. `null` means "not known yet" — the
 * profile has not loaded — which is deliberately distinct from `false`.
 */
export function profileOnboardingState(profile) {
  if (!profile) return null
  return Number.isFinite(profile?.onboarding?.completedAt) ? true : false
}

/** The local mirror. Only consulted while the account answer is unknown. */
export function localOnboardingFlag(storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    return s?.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Where a signed-in visitor landing on `/` should go.
 *
 * The rule: the account wins when known. While it is unknown, prefer /home —
 * guessing "not onboarded" during a slow Firestore read would re-run onboarding
 * for precisely the established users this bug kept catching, and a brand-new
 * sign-up never depends on this path (App.jsx routes them from the auth event
 * via `pendingOnboarding`).
 */
export function onboardingDestination(profile, storage) {
  const onAccount = profileOnboardingState(profile)
  if (onAccount === true) return '/home'
  if (onAccount === false) {
    // The account says no. Honour a local flag anyway if one exists: it means
    // this browser watched them finish, and the profile write is either still
    // in flight or was rejected. Showing it again would be the same bug in the
    // other direction.
    return localOnboardingFlag(storage) ? '/home' : '/onboarding'
  }
  return '/home'
}
