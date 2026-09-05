// Who may work the review queues, and what "working them" means.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The founder's moderation decision (recorded on the [community-backend]
// pipeline row) is that NOTHING PUBLISHES UNTIL IT IS APPROVED, chosen on
// liability grounds because he is a solo developer. That decision is only
// affordable if approving is not a one-person job, which is what a moderator
// role is for.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE RULE THIS MODULE ENFORCES
// ─────────────────────────────────────────────────────────────────────────────
// A role comes from a SERVER-MINTED CUSTOM CLAIM and from nowhere else.
//
// The pre-existing client-side check is `isAdminEmail()` in utils/constants.js,
// which compares `user.email` against an array that ships in the browser
// bundle. Its own comment is honest about the limit — it "can hide a surface
// but can never protect data" — and that is fine for deciding what to RENDER.
// It is not fine as the basis of a role, because the email on the client object
// is not a verified fact and the list is editable by anyone with devtools.
//
// Custom claims are different: they are minted server-side by
// api/verify-admin.js, signed into the ID token by Firebase, and
// firestore.rules reads them directly. So the role a surface renders and the
// role Firestore enforces are derived from the SAME signed fact.
//
// ─────────────────────────────────────────────────────────────────────────────
// PURE, ON PURPOSE
// ─────────────────────────────────────────────────────────────────────────────
// No Firebase import lives here, so the rules about who may do what — the part
// worth getting wrong-proof — are testable under `node --test` without a
// browser, a network or an emulator. Same split as communityQueue.js /
// communityQueueApi.js, and for the same reason. The Firestore reads and writes
// are in feedbackQueueApi.js; the server's copy of the same decision is
// api/_lib/moderators.js, held in step by tests/unit/moderation-role.test.js.

/** The claim firestore.rules already gates every moderation write on. */
export const FOUNDER_CLAIM = 'admin'

/**
 * The claim a moderator carries.
 *
 * NOT GRANTED BY ANYTHING YET, and not yet honoured by firestore.rules. Both of
 * those changes land in founder-gated files (api/verify-admin.js and
 * firestore.rules, per docs/reference/human-validation-zones.md), so they are
 * proposed rather than taken. `roleFromClaims` understands the claim today so
 * that the day it is granted, every surface already reads it correctly and
 * nothing else has to change.
 */
export const MODERATOR_CLAIM = 'moderator'

/**
 * Ordered least-privileged first. The order is load-bearing: `roleFromClaims`
 * resolves the HIGHEST claim present, so a founder who is also on the moderator
 * roster is a founder rather than whichever claim happened to be read first.
 */
export const ROLES = Object.freeze(['user', 'moderator', 'founder'])

/**
 * Decide a role from a decoded ID token's claims.
 *
 * A verified email is required for any role above `user`, and it is required
 * HERE rather than only at the server boundary because the two places that call
 * this — the browser and api/_lib/moderators.js — must not be able to disagree
 * about what a role is. api/_lib/admin.js already refuses an unverified email
 * for the reason its own comment gives: without it, anyone who signs up
 * claiming a privileged address, an address they cannot receive mail at, passes
 * the check.
 *
 * Accepts a raw claims object (`getIdTokenResult().claims`, or the object
 * `verifyIdToken()` resolves to). Never throws; anything unrecognised is a
 * plain user, because the safe answer to "I cannot tell" is the least
 * privileged one.
 */
export function roleFromClaims(claims) {
  if (!claims || typeof claims !== 'object') return 'user'
  // Firebase spells it `email_verified` in a decoded token and `emailVerified`
  // on the client's ID-token result. Both are accepted; neither is assumed.
  const verified = claims.email_verified === true || claims.emailVerified === true
  if (!verified) return 'user'
  if (claims[FOUNDER_CLAIM] === true) return 'founder'
  if (claims[MODERATOR_CLAIM] === true) return 'moderator'
  return 'user'
}

/** May this role open the review queues at all? */
export function canReview(role) {
  return role === 'founder' || role === 'moderator'
}

/**
 * May this role hand the role to somebody else?
 *
 * Founder only, and this is the single most important line in the file. A
 * moderator who can appoint moderators is not a role, it is a self-replicating
 * grant: one careless or compromised moderator account becomes every moderator
 * account, and the founder's liability decision — the whole reason the approval
 * queue exists — stops being his to make.
 */
export function canAssignModerators(role) {
  return role === 'founder'
}

/**
 * May this role see the reporter's email address on a feedback item?
 *
 * Founder only. Feedback is submitted through /api/support, which accepts an
 * address UNAUTHENTICATED from a public form, so the address is (a) personal
 * data the submitter handed to the site owner rather than to a volunteer, and
 * (b) not verified to belong to them. A moderator can triage a report perfectly
 * well from its subject and message; handing them a mailbox to answer from is a
 * separate permission nobody has asked for.
 */
export function canSeeReporterEmail(role) {
  return role === 'founder'
}

/**
 * What to tell somebody who cannot review, in words that name the actual
 * situation rather than saying "denied".
 */
export function accessNotice(role, { signedIn = true } = {}) {
  if (!signedIn) return 'Sign in to open the review queues.'
  if (canReview(role)) return ''
  return 'Your account is not a moderator, so there is nothing here for you to review.'
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK TRIAGE
// ─────────────────────────────────────────────────────────────────────────────
// The vocabulary Admin.jsx has always used for feedback, lifted out of that
// file so the moderation decisions and the dashboard cannot drift into two
// different meanings of "done". The label strings are byte-identical to the
// ones Admin.jsx defined inline, because this is a refactor of where they live
// and not a change to what a reviewer reads.

export const FEEDBACK_STATUSES = Object.freeze(['new', 'in-progress', 'done'])
export const FEEDBACK_STATUS_LABELS = Object.freeze({
  new: 'New',
  'in-progress': 'In Progress',
  done: 'Done',
})

/** Is this a status a reviewer may actually set? */
export function isFeedbackStatus(status) {
  return FEEDBACK_STATUSES.includes(status)
}

/**
 * The next status in the triage cycle — the "Mark as ..." button's target.
 * An unknown current status resolves to 'new' rather than to `undefined`, so a
 * document written before this vocabulary existed still has a usable next step.
 */
export function nextFeedbackStatus(current) {
  const i = FEEDBACK_STATUSES.indexOf(current)
  if (i === -1) return 'new'
  return FEEDBACK_STATUSES[(i + 1) % FEEDBACK_STATUSES.length]
}

/**
 * The fields a reviewer's decision writes, and ONLY those fields.
 *
 * Built here rather than at the call site so that a moderation write can never
 * carry the submitter's own content back up with it. These documents come from
 * a PUBLIC, unauthenticated form — /api/support takes subject, message and
 * email with no session at all — so a decision that spread the item into the
 * update would let whatever arrived in that form overwrite the stored record.
 *
 * `reviewedBy` is the reason this exists now rather than later. While one
 * person moderated, "who marked this done" was never in question. The moment a
 * second person can act, an un-attributed decision is a decision nobody can be
 * asked about.
 */
export function feedbackDecision(status, reviewerUid, now = new Date()) {
  if (!isFeedbackStatus(status)) throw new Error('Not a feedback status: ' + status)
  return {
    status,
    updatedAt: now.toISOString(),
    reviewedBy: reviewerUid || null,
  }
}

/**
 * Count what is actually waiting for a human, per queue.
 *
 * Returned as an object rather than a number because a queue whose count could
 * not be READ must be distinguishable from a queue that is empty. That is the
 * most expensive confusion available on a review surface, and it is the same
 * fault the admin dashboard's aggregate block was already fixed for, where a
 * failed read rendered as a confident "0". `null` means unread, never zero.
 */
export function pendingCounts({ submissions, feedback }) {
  const count = (list, isOpen) => (Array.isArray(list) ? list.filter(isOpen).length : null)
  return {
    submissions: count(submissions, (s) => s?.status === 'pending'),
    feedback: count(feedback, (f) => f?.status !== 'done'),
  }
}
