// THE ACCOUNT SWITCHER'S MODEL: the top-right menu switches between
// remembered accounts, the way Google's account switcher does.
//
// WHAT IS HONEST HERE. Firebase Auth holds ONE signed-in user per app, so there
// are never two live sessions to hop between. Switching is: keep the current
// session until the chosen account signs in (AuthContext.switchAccount — Google
// with a login_hint, or the email form prefilled and locked for a password
// account), after which Firebase replaces the session. The list of accounts is
// what AuthContext already remembers on THIS DEVICE (vs-accounts: uid, email,
// display name, photo, provider ids — never a password or a token). Nothing in
// this module talks to Firebase; it only shapes that list for the menu.

/** Up to five remembered accounts are kept (AuthContext MAX_KNOWN_ACCOUNTS). */
export const MAX_LISTED = 5

/**
 * Split the remembered list into the signed-in account and the others, in the
 * order AuthContext keeps them (most recently signed in first). A remembered
 * entry with no uid is dropped; the current account is never listed twice.
 */
export function switcherAccounts(known, currentUid) {
  const list = (Array.isArray(known) ? known : []).filter((a) => a && typeof a.uid === 'string' && a.uid)
  const seen = new Set()
  const unique = list.filter((a) => !seen.has(a.uid) && seen.add(a.uid))
  const current = unique.find((a) => a.uid === currentUid) || null
  const others = unique.filter((a) => a.uid !== currentUid).slice(0, MAX_LISTED)
  return { current, others }
}

/** The name a row shows: display name, else the email's local part. */
export function accountLabel(acct) {
  const name = (acct?.displayName || '').trim()
  if (name) return name
  const local = (acct?.email || '').split('@')[0]
  return local || 'Account'
}

/** One or two initials for an avatar with no photo. */
export function accountInitials(acct) {
  const src = (acct?.displayName || acct?.email || '').trim()
  const parts = src.split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

/** How a remembered account will ask for its sign-in, said on its row. */
export function accountMethod(acct) {
  const ids = Array.isArray(acct?.providerIds) ? acct.providerIds : acct?.provider ? [acct.provider] : []
  return ids.includes('google.com') ? 'Google' : 'Email and password'
}

/**
 * "Sign out of all": which remembered accounts to forget. Every one, current
 * included — the caller signs the current session out FIRST, because
 * AuthContext refuses to forget the account that is still signed in.
 */
export function uidsToForget(known) {
  return (Array.isArray(known) ? known : []).map((a) => a?.uid).filter(Boolean)
}
