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

/**
 * The onboarding record a newly created account starts with. Its presence is
 * what marks an account as owing onboarding: an account whose profile has no
 * `onboarding` record at all predates the record and is never sent back to it.
 */
export function openOnboardingRecord(now) {
  return { openedAt: now }
}

/**
 * What to do with one read of the account's profile document.
 *
 * `read` is `{ status: 'found', data }`, `{ status: 'missing' }` (the account
 * answered and has no document) or `{ status: 'failed' }` (no answer: offline,
 * a chunk that did not load, a refused read).
 *
 *   found   → `merge`: the document is laid over the local profile.
 *   missing → `create`: this is the account's first document, so it opens the
 *             onboarding record and is written.
 *   failed  → `wait`: nothing is written and the profile stays unloaded, so a
 *             cache or default is never taken for the account's answer.
 *
 * @returns {{ action: 'merge'|'create'|'wait', profile: object, loaded: boolean }}
 */
export function planProfileRead(read, initial, now) {
  if (read?.status === 'found' && read.data) {
    return { action: 'merge', profile: { ...initial, ...read.data }, loaded: true }
  }
  if (read?.status === 'missing') {
    const profile = initial.onboarding ? initial : { ...initial, onboarding: openOnboardingRecord(now) }
    return { action: 'create', profile, loaded: true }
  }
  return { action: 'wait', profile: initial, loaded: false }
}

/**
 * True only for an account that was opened with an onboarding record and has
 * not recorded completion. An account with no record owes nothing.
 */
export function owesOnboarding(profile) {
  const record = profile?.onboarding
  return !!record && typeof record === 'object' && profileOnboardingState(profile) === false
}

/**
 * The profile to decide from, or null while the account has not answered.
 *
 * Until the profile document has been read, the profile is a local cache or a
 * default. Either can confirm completion (a cached copy of the account's own
 * record) but neither can deny it: a default carries no record, and a cache
 * may predate completion on another device.
 */
export function knownProfile(profile, loaded) {
  if (!profile) return null
  if (loaded) return profile
  return profileOnboardingState(profile) === true ? profile : null
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
  if (!owesOnboarding(profile)) return SIGNED_IN_HOME
  // The account says it is owed. Honour a local flag anyway if one exists: it
  // means this browser watched them finish, and the profile write is either
  // still in flight or was rejected. Showing it again would be the same bug in
  // the other direction.
  return localOnboardingFlag(storage) ? SIGNED_IN_HOME : '/onboarding'
}

/**
 * Whether the resume decision is still owed: once per signed-in account per
 * page load, after that account's profile has loaded. `decidedUid` is the
 * account it was last made for, so signing in as another account owes a new one.
 */
export function resumeDecisionOwed(decidedUid, uid, loaded) {
  return !!uid && !!loaded && decidedUid !== uid
}

/**
 * Where a returning visitor who has just arrived on the signed-in home should
 * go instead, or null to stay. Only the signed-in home resumes onboarding: the
 * sales page and deep links are left where the visitor asked to be.
 */
export function resumeOnboardingTarget({ pathname, profile, loaded, storage }) {
  if (pathname !== SIGNED_IN_HOME) return null
  const known = knownProfile(profile, loaded)
  if (!known) return null
  const destination = onboardingDestination(known, storage)
  return destination === '/onboarding' ? destination : null
}
