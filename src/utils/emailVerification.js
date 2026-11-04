import { accountProviderIds } from './authSwitch.js'

/**
 * Does this account still owe a verified email address?
 *
 * Only an account that signs in with a password can owe one. Google proves the
 * address itself, so a Google account arrives verified; an account with both
 * providers linked is judged on its flag like any other.
 *
 * `emailVerified` is passed separately because Firebase updates the flag on the
 * same User object in place after `reload()`, so the caller holds the current
 * value in state rather than trusting a reference that has not re-rendered.
 */
export function needsEmailVerification(user, emailVerified = user?.emailVerified) {
  if (!user || !user.email) return false
  if (emailVerified === true) return false
  return accountProviderIds(user).includes('password')
}

/**
 * Re-read the account and, when it is verified, mint an ID token that says so.
 * `A` is the loaded auth SDK and `user` the signed-in Firebase user.
 *
 * Resolves true or false, or null when the account changed while this was
 * reading. A failed read or a failed token refresh REJECTS: answering "verified"
 * on a token that still says otherwise would send the caller's retry out with
 * the stale claim, and the server would refuse it again.
 */
export async function reloadVerified(A, user) {
  await A.reload(user)
  if (user !== A.auth.currentUser) return null
  const verified = user.emailVerified === true
  if (verified) {
    await user.getIdToken(true)
    if (user !== A.auth.currentUser) return null
  }
  return verified
}

/**
 * Where a verification link brings the person back to. Settings reads the
 * `verified` flag, re-reads the account and says so. Both send calls pass this,
 * so the link no longer ends on the auth server's own page.
 */
export function verifyLinkSettings(origin) {
  return { url: `${origin}/settings?verified=1` }
}

// Firebase refuses a return address it does not accept: a domain missing from
// the console's authorised list, or a malformed url. The person still needs the
// link, so those three codes fall back to the plain send, which ends on the auth
// server's own page, as it did before the return address existed.
export const CONTINUE_URI_ERRORS = [
  'auth/unauthorized-continue-uri',
  'auth/invalid-continue-uri',
  'auth/missing-continue-uri',
]

/**
 * The one place a verification link is sent from. `A` is the loaded auth SDK.
 * Any other error is thrown for the caller to report.
 */
export async function sendVerificationLink(A, user, origin) {
  try {
    await A.sendEmailVerification(user, verifyLinkSettings(origin))
  } catch (error) {
    if (!CONTINUE_URI_ERRORS.includes(error?.code)) throw error
    await A.sendEmailVerification(user)
  }
}

// Firebase's refusals, in words. The reminder bar and Settings send the same
// link, so they share this copy. Each fits two lines beside the bar's button on
// a phone, where the bar keeps one height.
export const VERIFY_ERRORS = {
  'auth/too-many-requests': 'Too many links sent. Wait a few minutes.',
  'auth/network-request-failed': "You're offline. Try again once you're back online.",
}
export const VERIFY_ERROR_FALLBACK = "The link didn't send. Try again."

export function verifyErrorText(error) {
  return VERIFY_ERRORS[error?.code] || VERIFY_ERROR_FALLBACK
}

// Whether the reminder bar is shown, apart from whether the account owes a
// verification. It stays out of the way on the surfaces that already deal with
// the address: onboarding, which carries its own line, and Settings, whose
// Email row offers the same link. It also waits while offline.
export const VERIFY_BAR_HIDDEN_PATHS = ['/onboarding', '/settings']

export function verifyBarVisible({ owed, pathname, online }) {
  if (!owed || !online) return false
  const path = (pathname || '').replace(/\/+$/, '') || '/'
  return !VERIFY_BAR_HIDDEN_PATHS.includes(path)
}

// How long the bar's Resend button waits after a link has gone out before it
// offers another. Long enough that a second press is not a reflex, short enough
// that someone whose first email never came is not left without the button.
export const VERIFY_RESEND_COOLDOWN_S = 30

// Resend is not usable while a send is in flight or the cooldown has seconds
// left. The button stays on the page and stays focusable either way.
export function verifyResendBlocked(state, secondsLeft) {
  return state === 'sending' || secondsLeft > 0
}

export function verifyResendLabel(state, secondsLeft) {
  if (state === 'sending') return 'Sending…'
  if (secondsLeft > 0) return `Resend in ${secondsLeft}s`
  return 'Resend link'
}

/**
 * What /settings?verified=1 says, given who is there. The parameter is anyone's
 * to type and the link can be opened in a browser that is not signed in, so a
 * signed-out landing says only that the link was opened, never that anything
 * was verified.
 *
 * `verified` is the re-read of the signed-in account (null while unknown).
 */
export function verifiedLandingMessage({ signedIn, verified }) {
  if (!signedIn) return { text: 'Your email link was opened. Sign in to finish.', kind: 'info', signIn: true }
  if (verified === true) return { text: 'Email verified', kind: 'success', signIn: false }
  if (verified === false) return { text: "This account still isn't verified. Send a new link from the Email row.", kind: 'info', signIn: false }
  return null
}

const DISMISS_PREFIX = 'vs-verify-dismissed:'

// Per visit, not per device: sessionStorage, so the bar comes back next time,
// and keyed on the account so switching accounts does not inherit a dismissal.
export function readVerifyDismissed(uid) {
  if (!uid) return false
  try {
    return sessionStorage.getItem(DISMISS_PREFIX + uid) === '1'
  } catch {
    return false
  }
}

export function writeVerifyDismissed(uid) {
  if (!uid) return
  try {
    sessionStorage.setItem(DISMISS_PREFIX + uid, '1')
  } catch {
    /* the bar still closes for this render; it returns on reload */
  }
}
