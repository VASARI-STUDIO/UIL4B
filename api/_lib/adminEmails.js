// Administrator allowlist, read from the ADMIN_EMAILS server environment
// variable. Files in /api/_lib are not deployed as routes.
//
// Rules:
//   - An unset or empty ADMIN_EMAILS grants administrator status to nobody.
//   - The list is read on every call so tests can exercise both the configured
//     and the empty state in one process.
//   - The client-side check in src/utils/constants.js only decides what to
//     render; this module is the authority.

/**
 * The configured allowlist: lowercase, trimmed, empty entries dropped.
 * `ADMIN_EMAILS` is a comma-separated list — one address is the normal case.
 */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Is this address an administrator?
 *
 * This answers the allowlist question only. Every caller must also require a
 * Firebase-verified email (`email_verified`) on the same token.
 */
export function isAdminEmail(email) {
  if (typeof email !== 'string') return false
  const address = email.trim().toLowerCase()
  if (!address) return false
  return adminEmails().includes(address)
}
