// Verifying that a request comes from an administrator, server-side.
// Files in /api/_lib are underscore-prefixed and NOT deployed as routes, so
// this adds nothing to the 12-function budget.
//
// WHO is on the allowlist now lives in ./adminEmails.js, which reads it from
// the ADMIN_EMAILS environment variable and explains why it is no longer a
// literal in this file. This module answers the other half — whether the caller
// in front of us has proved they are that person.
//
// The list lived only in api/verify-admin.js. A second endpoint then needed the
// same answer, and two copies of an allowlist is one copy too many — the day
// they disagree, the disagreement is a security hole rather than a bug.
//
// This is deliberately NOT imported from src/utils/constants.js. That module
// ships in the browser bundle; an allowlist that decides server-side authority
// should not be reachable from client code, even read-only, because the next
// person to edit "the" list would have no way to tell which one was load-bearing.

import { adminAuth } from './firebase-admin.js'
import { isAdminEmail } from './adminEmails.js'

/**
 * Verify the caller is an administrator from their Firebase ID token.
 *
 * Returns `{ ok: true, uid, email }`, or `{ ok: false, status, error }` ready
 * to be returned to the browser. Never throws.
 *
 * `email_verified` is required, not incidental: without it, anyone who signs up
 * claiming the admin address — an address they cannot receive mail at — passes
 * the allowlist. That is the same reasoning verify-admin.js already carries.
 */
export async function requireAdmin(req) {
  const header = req.headers?.authorization
  if (!header?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Authentication required' }
  }
  try {
    const decoded = await adminAuth().verifyIdToken(header.slice(7))
    const email = decoded.email?.toLowerCase()
    if (!email || !decoded.email_verified || !isAdminEmail(email)) {
      // 404, not 403. A 403 confirms the endpoint exists and that the caller
      // simply is not the right person, which is exactly the information an
      // attacker probing for an admin surface is after.
      return { ok: false, status: 404, error: 'Not found' }
    }
    return { ok: true, uid: decoded.uid, email }
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired session' }
  }
}
