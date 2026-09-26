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
