// The moderator roster, server-side: who holds the role, and how the role
// becomes a fact Firestore will act on.
//
// ─────────────────────────────────────────────────────────────────────────────
// NOT YET WIRED — AND THAT IS THE POINT
// ─────────────────────────────────────────────────────────────────────────────
// Nothing calls this module yet. Its one intended caller is api/verify-admin.js,
// which docs/reference/human-validation-zones.md gates to the founder, so the
// three lines that call in are proposed in the pull request rather than taken.
// The module is written, reviewed and tested first so that the change the
// founder is asked to approve is a three-line call into audited code, not a
// hundred lines of new authority arriving at the same time as the approval.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ROUTE BUDGET, STATED RATHER THAN SPENT
// ─────────────────────────────────────────────────────────────────────────────
// api/ holds exactly 12 deployed functions and Vercel allows 12 on this plan.
// TWO tests fail the build on a 13th: tests/unit/account-deletion.test.js reads
// api/ and asserts `routes.length <= 12`, and tests/unit/ai-provider-path.test.js
// asserts the same count independently.
//
// This module costs NOTHING against that budget, and it is worth being precise
// about why rather than trusting the convention. Both assertions call
// `readdirSync('api')` — the top level only, not recursive — and both filter on
// `.endsWith('.js')`. This file lives in api/_lib/, so it is not in the listing
// at all; `_lib` itself is a directory and fails the `.js` filter. Vercel
// likewise does not deploy underscore-prefixed paths as functions, which is the
// same reason api/_lib/admin.js gives for its own existence.
//
// The intended caller was chosen for the same reason: api/verify-admin.js is
// the route that already exists for precisely this question — "who is this
// person, and what are they allowed to do". That file ALREADY carries a second
// responsibility for exactly this budget reason (`includeUsers` piggybacks the
// cross-user list onto the admin handshake, with a comment saying the
// 12-function limit ruled out a route of its own), so folding the roster in
// follows an established, documented pattern rather than inventing one.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE ROSTER IS NOT IN firestore.rules
// ─────────────────────────────────────────────────────────────────────────────
// `moderators/{uid}` has NO rules block, and that is the security property, not
// an omission. Firestore denies by default, so no browser can read the roster,
// enumerate who holds power on this site, or write itself into it. The only
// thing that touches this collection is the Admin SDK, which bypasses rules
// entirely — so the roster cannot be tampered with from the client even in
// principle, and firestore.rules never has to change to support it.
//
// The alternative — a `moderators` collection a signed-in client could read —
// would have needed a rules change AND would have published the list of people
// worth phishing.
import { adminAuth, adminDb } from './firebase-admin.js'
import { isAdminEmail } from './adminEmails.js'

export const MODERATORS_COLLECTION = 'moderators'

// ─────────────────────────────────────────────────────────────────────────────
// WHY THE PREDICATE IS REPEATED HERE RATHER THAN IMPORTED FROM src/
// ─────────────────────────────────────────────────────────────────────────────
// src/utils/moderation.js holds the same two claim names and the same
// predicate, and importing them would be the obvious way to keep one copy. It
// is deliberately not done, for a mechanical reason rather than a stylistic
// one: NO file under api/ imports from src/ today, so a serverless function
// that did would be relying on Vercel's dependency tracing to follow a relative
// path out of the function root — behaviour this repository has never
// exercised and that cannot be verified from a local build, only from a deploy.
//
// A wrong guess there does not degrade quietly. It throws at import time and
// takes /api/verify-admin — the whole admin handshake — down with it. That is
// an unverifiable deploy risk on a security path, and not one worth carrying to
// save six lines.
//
// The two copies are held together by a TEST instead of by discipline:
// tests/unit/moderation-role.test.js imports BOTH modules and asserts they
// return the same answer for every claim shape in a shared table. That is
// strictly stronger than a shared import, which could still be wrapped into
// disagreement at either call site.
export const MODERATOR_CLAIM = 'moderator'
export const FOUNDER_CLAIM = 'admin'

const lower = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '')

/**
 * Is this address the founder's?
 *
 * Reads api/_lib/adminEmails.js rather than keeping a second list, for the
 * reason that file already gives: two copies of an allowlist is one copy too
 * many, and the day they disagree the disagreement is a hole rather than a bug.
 * It is the ADMIN_EMAILS environment variable, and an unset one names nobody.
 */
export function isFounderEmail(email) {
  return isAdminEmail(lower(email))
}

/**
 * The server's copy of src/utils/moderation.js's `roleFromClaims`, kept in step
 * by tests/unit/moderation-role.test.js rather than by a shared import — see
 * the note above for why the import is not taken.
 *
 * A verified email is required for any role above `user`, for the reason
 * api/_lib/admin.js already gives: without it, anyone who signs up claiming a
 * privileged address, an address they cannot receive mail at, passes the check.
 */
export function roleFromClaims(claims) {
  if (!claims || typeof claims !== 'object') return 'user'
  const verified = claims.email_verified === true || claims.emailVerified === true
  if (!verified) return 'user'
  if (claims[FOUNDER_CLAIM] === true) return 'founder'
  if (claims[MODERATOR_CLAIM] === true) return 'moderator'
  return 'user'
}

/**
 * The role this token actually carries.
 *
 * Deliberately routed through the SAME `roleFromClaims` the browser uses, so
 * the surface a person sees and the authority the server grants are two
 * readings of one function rather than two implementations that can drift. The
 * founder's allowlist is layered on top because it is the stronger fact: it is
 * checked against a Firebase-verified email and does not depend on a claim
 * having been minted yet.
 */
export function roleFromDecodedToken(decoded) {
  if (!decoded) return 'user'
  if (decoded.email_verified === true && isFounderEmail(decoded.email)) return 'founder'
  return roleFromClaims(decoded)
}

/**
 * The roster document for one person.
 *
 * `uid` is the key, not the email. An email can be changed by its owner and can
 * be re-registered by somebody else after an account is deleted; a Firebase uid
 * is stable for the life of the account and is what the custom claim is minted
 * against. The email is stored ALONGSIDE it for the founder to read, and is
 * never the thing looked up.
 */
export function rosterEntry({ uid, email, displayName, grantedByUid, now = new Date() }) {
  if (!uid || typeof uid !== 'string') return null
  return {
    uid,
    email: lower(email) || null,
    displayName: (typeof displayName === 'string' && displayName.trim()) || null,
    grantedByUid: grantedByUid || null,
    grantedAt: now.toISOString(),
  }
}

/** Everyone currently holding the role, for the founder's own list. */
export async function listModerators() {
  const snap = await adminDb().collection(MODERATORS_COLLECTION).get()
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

/** Does this uid hold the role, according to the roster (not the token)? */
export async function isModerator(uid) {
  if (!uid) return false
  const doc = await adminDb().collection(MODERATORS_COLLECTION).doc(uid).get()
  return doc.exists
}

/**
 * Put somebody on the roster AND mint their claim, in that order.
 *
 * The order matters and it is the fail-safe one. The roster is the durable
 * record; the claim is a cache of it that Firestore can read at rule-evaluation
 * time. Writing the roster first means a crash between the two leaves a person
 * who is RECORDED as a moderator but cannot yet act — recoverable by re-running
 * this, or by their next sign-in through reconcileModeratorClaim. The other
 * order leaves somebody who can act but whom no list remembers, which is an
 * unrevokable grant.
 *
 * `grantedByUid` must be a founder. That is deliberately NOT checked here: this
 * module says HOW a grant is made and the route says WHO may ask for one, so
 * the authority check sits at the boundary where the token is verified.
 */
export async function grantModerator({ uid, email, displayName, grantedByUid }) {
  const entry = rosterEntry({ uid, email, displayName, grantedByUid })
  if (!entry) throw new Error('A moderator grant needs a uid')
  await adminDb().collection(MODERATORS_COLLECTION).doc(uid).set(entry)
  await mintClaims(uid, { [MODERATOR_CLAIM]: true })
  return entry
}

/**
 * Take somebody off the roster and drop their claim.
 *
 * Reverse order, for the mirror-image reason: the claim goes first, so a crash
 * between the two leaves a person who is still listed but can no longer act.
 * Revocation that half-fails must fail CLOSED.
 *
 * The honest limit: an ID token already minted stays valid for up to an hour,
 * so revocation is not instant. Closing that gap needs `revokeRefreshTokens`
 * plus `checkRevoked: true` on every verifying route, which is a wider change
 * than this row.
 */
export async function revokeModerator(uid) {
  if (!uid) throw new Error('A moderator revocation needs a uid')
  await mintClaims(uid, { [MODERATOR_CLAIM]: false })
  await adminDb().collection(MODERATORS_COLLECTION).doc(uid).delete()
}

/**
 * Write the custom claims for one uid, preserving every claim this module does
 * not own.
 *
 * `setCustomUserClaims` REPLACES the whole claims object rather than merging
 * into it, so reading the existing claims first is not politeness. Writing
 * `{ moderator: true }` blind onto the founder's account would DELETE his
 * `admin: true` and lock him out of his own moderation queue and his own
 * Firestore rules.
 *
 * (api/verify-admin.js has the same hazard in the other direction today — it
 * writes `{ admin: true }` blind — which is harmless while `admin` is the only
 * claim in the project and stops being harmless the moment it is not. The
 * proposed diff on that file merges instead, for this reason.)
 */
async function mintClaims(uid, patch) {
  const user = await adminAuth().getUser(uid)
  const claims = { ...(user.customClaims || {}), ...patch }
  // A false moderator flag is removed rather than stored as `false`. A claim
  // that is present-but-false and one that is absent mean the same thing to
  // roleFromClaims, and the smaller token is the one that keeps working: custom
  // claims share a 1000-byte budget with everything else in the token.
  if (claims[MODERATOR_CLAIM] !== true) delete claims[MODERATOR_CLAIM]
  await adminAuth().setCustomUserClaims(uid, claims)
  return claims
}

/**
 * Re-mint a returning moderator's claim from the roster.
 *
 * The roster is the record of the decision; the claim is derived state that can
 * go missing. A claim is per-account and does not survive an account being
 * deleted and recreated, and a `setCustomUserClaims` call can fail on its own —
 * verify-admin.js already treats exactly that failure as non-fatal. Calling
 * this on the admin handshake means a moderator whose claim went missing gets
 * it back by signing in, rather than by the founder noticing and re-granting.
 *
 * Idempotent: it writes only when the token does not already agree with the
 * roster, because setCustomUserClaims costs a write and forces a token refresh.
 * Same reasoning verify-admin.js already carries for the `admin` claim.
 */
export async function reconcileModeratorClaim(decoded) {
  const uid = decoded?.uid
  if (!uid) return { changed: false, moderator: false }
  const listed = await isModerator(uid)
  const claimed = decoded[MODERATOR_CLAIM] === true
  if (listed === claimed) return { changed: false, moderator: listed }
  await mintClaims(uid, { [MODERATOR_CLAIM]: listed })
  return { changed: true, moderator: listed }
}
