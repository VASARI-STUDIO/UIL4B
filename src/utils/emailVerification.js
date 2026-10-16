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
// link, so they share this copy.
export const VERIFY_ERRORS = {
  'auth/too-many-requests': 'Too many links sent. Wait a few minutes and try again.',
  'auth/network-request-failed': 'You appear to be offline. Try again when you are connected.',
}
export const VERIFY_ERROR_FALLBACK = 'The verification link could not be sent. Please try again.'

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
