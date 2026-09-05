// “Did this browser have a signed-in session the last time we knew?” — answered
// synchronously, in microseconds, with no network and no Firebase.
//
// ────────────────────────────────────────────────────────────────────────
// THE PROBLEM THIS SOLVES
// ────────────────────────────────────────────────────────────────────────
// Signed-in visitors now land on the User Home rather than the sales page. The
// obvious implementation — wait for `onAuthStateChanged`, then redirect — has a
// measured cost this product has already paid once and written down:
//
//     tests/user-sim/20-billing-banner.spec.js, on /projects:
//     “that redirect is NOT immediate: RequireAuth holds a loader until
//      Firebase's onAuthStateChanged fires (MEASURED AT ~1s HERE)”
//
// A second of blank loader in front of the front door, for the people who use
// the product most, is a worse experience than the sales page they were getting
// before — and `firebase-critical-path` is an open item precisely because
// Firebase sits on this path. The alternative failure is just as bad: render the
// sales page first and swap once auth resolves, which is a full second of the
// WRONG PAGE followed by a jump.
//
// So the decision is made from a hint written to localStorage the LAST time auth
// resolved. Reading it is synchronous, so the correct page is chosen in the
// first render, before Firebase has loaded at all.
//
// ────────────────────────────────────────────────────────────────────────
// WHAT THIS IS NOT
// ────────────────────────────────────────────────────────────────────────
// IT IS NOT AUTHENTICATION, AND IT GRANTS NOTHING. It holds no uid, no email, no
// token and no entitlement — it is a single character, `1` or absent. Anyone can
// set it by hand; the worst they achieve is being routed to a page that then
// tells them to sign in. Every gate that matters (what is in a project, what Pro
// unlocks, what Firestore will hand over) is decided by Firebase and the
// security rules exactly as before, and none of them reads this file.
//
// It answers ONE question — “which page do we paint first?” — and being wrong
// about that costs a wrong first paint, not access to anything.
//
// This is deliberately NOT written from src/contexts/AuthContext.jsx, which is
// founder-gated (docs/reference/human-validation-zones.md). It is written by a
// consumer of that context (src/hooks/useSessionHint.js), so the gated file is
// untouched.

export const SESSION_HINT_KEY = 'vs-session'

function store(injected) {
  if (injected) return injected
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    // Some privacy modes throw on the ACCESSOR itself, not just on the read.
    return null
  }
}

/**
 * Did auth last resolve to a signed-in user on this browser?
 *
 * Never throws and never guesses “true”: a blocked, full or absent store answers
 * false, which routes the visitor to the sales page — the safe wrong answer,
 * because it is also the correct answer for everyone who has never signed in.
 */
export function readSessionHint(injected) {
  const s = store(injected)
  if (!s) return false
  try {
    return s.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Record what auth just resolved to. Call ONLY once `loading` is false — writing
 * it while auth is still resolving would record “signed out” for every signed-in
 * visitor on every load, which is the precise bug this file exists to avoid.
 *
 * Returns the value written, so a caller can assert on it without a second read.
 */
export function writeSessionHint(signedIn, injected) {
  const s = store(injected)
  if (!s) return !!signedIn
  try {
    if (signedIn) s.setItem(SESSION_HINT_KEY, '1')
    else s.removeItem(SESSION_HINT_KEY)
  } catch {
    // A full or blocked store costs a slower first paint next time, nothing more.
  }
  return !!signedIn
}

/**
 * Where a visitor arriving at `/` should be sent, decided in ONE place so the
 * router, the tests and any future caller cannot disagree.
 *
 *   `loading`   — is Firebase still resolving?
 *   `signedIn`  — the resolved truth. Only meaningful when `loading` is false.
 *   `hint`      — readSessionHint(), the synchronous guess.
 *   `appHome`   — where a signed-in visitor belongs (onboardingDestination()
 *                  decides between the User Home and onboarding).
 *   `salesPage` — where everyone else belongs.
 *
 * The rule, in order:
 *   · auth has resolved → believe it, always. The hint never overrides truth.
 *   · auth is still resolving → believe the hint. It is right for every returning
 *     visitor and for every first-time visitor; it is wrong only for someone
 *     whose session was invalidated elsewhere since their last page load.
 *
 * Returns the path to render. It is deliberately a PATH and not a component
 * decision, so `/home` can bypass this function entirely — see App.jsx.
 */
export function rootDestination({ loading, signedIn, hint, appHome, salesPage = '/home' }) {
  if (!loading) return signedIn ? appHome : salesPage
  return hint ? appHome : salesPage
}
