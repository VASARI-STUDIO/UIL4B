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
 * Where a signed-in, onboarded visitor belongs.
 *
 * Named rather than spelled inline because three different questions resolve
 * to it — “where does `/` send a signed-in visitor”, “where does onboarding
 * finish” and “where does a new customer land after checkout” — and they must
 * never drift apart again. It is `/projects`, the User Home, NOT `/home`,
 * which is the sales page and stays reachable by everyone at that URL and
 * from the nav logo.
 */
export const SIGNED_IN_HOME = '/projects'

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
 * Where a signed-in visitor belongs — the User Home, unless they still owe us
 * onboarding.
 *
 * THIS USED TO RETURN '/home', WHICH IS THE SALES PAGE. That was correct while
 * the sales page was the only home there was; it is not correct now. Founder
 * direction, 2026-09-05, approved explicitly: “i want the sales page to mostly
 * be for new users if a user is already logged in and navigates to the website
 * it takes them to the dashboard page unless they click they home button or
 * navigate to specifly /home”. tests/unit/first-run-destination.test.js already
 * recorded the same defect from the other direction (audit B4): finishing
 * onboarding landed a brand-new account on “No more tab hoarding” and a “Start
 * building free” CTA it had just used.
 *
 * The rule is otherwise unchanged: the account wins when known, and while it is
 * unknown we prefer the home over onboarding — guessing “not onboarded” during a
 * slow Firestore read would re-run onboarding for precisely the established
 * users that bug kept catching, and a brand-new sign-up never depends on this
 * path (App.jsx routes them from the auth event via `pendingOnboarding`).
 */
export function onboardingDestination(profile, storage) {
  const onAccount = profileOnboardingState(profile)
  if (onAccount === true) return SIGNED_IN_HOME
  if (onAccount === false) {
    // The account says no. Honour a local flag anyway if one exists: it means
    // this browser watched them finish, and the profile write is either still
    // in flight or was rejected. Showing it again would be the same bug in the
    // other direction.
    return localOnboardingFlag(storage) ? SIGNED_IN_HOME : '/onboarding'
  }
  return SIGNED_IN_HOME
}
