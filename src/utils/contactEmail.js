// The client-side half of the ONE email rule /api/support already enforces.
//
// ── Why this module exists ──────────────────────────────────────────────────
//
// `api/support.js` has always accepted an `email` field, validated it, capped
// it and printed it as the `From:` line of the notification it sends. What the
// public form never had was a way for a signed-out person to PUT anything in
// it: `Feedback.jsx` built the payload from `user?.email`, so every signed-out
// submission carried `email: ''` and arrived with nothing that identifies who
// sent it. The form now asks for one, optionally.
//
// That raises a second problem, which is why this file is a module rather than
// a regex typed into the page. The server answers a malformed address with a
// 400 and `{ error: 'Invalid email format' }`, and the client turns EVERY
// non-ok response into "Please check your connection and try again." So a
// person who typed `bob@` would be told their connection was at fault, told it
// again on every retry, and never told what was actually wrong. Checking the
// address before the request is what stops that.
//
// ── Why the rule is restated here rather than imported ──────────────────────
//
// `api/support.js` imports `api/_lib/firebase-admin.js`, so importing it from a
// page would pull firebase-admin into the browser bundle. The rule is therefore
// written out once more — and the duplication is CHECKED, not merely commented:
// `tests/unit/contact-email.test.js` runs one table of addresses through both
// `isContactEmail` below and the real `validateSupportBody` from api/support.js
// and fails if the two ever disagree. api/support.js remains the authority; a
// change there fails that test until this file follows it.

/** The server's cap, restated. api/support.js exports the same number. */
export const CONTACT_EMAIL_MAX = 254

// Deliberately the same shape as api/support.js's EMAIL_RE — three runs with no
// spaces and no second '@'. It is not RFC 5322; it is not trying to be. It
// exists to catch the typo the person can still fix while they are looking at
// the field, and everything past that is the mail server's job.
const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Would /api/support accept this as the `email` field?
 *
 * An EMPTY value is accepted, because the field is optional: the server treats
 * `''` and a missing key identically, and a submission without a return address
 * is a real thing a person may choose to send. Only a non-empty value that
 * cannot be a return address is refused.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isContactEmail(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.length > CONTACT_EMAIL_MAX) return false
  return CONTACT_EMAIL_RE.test(trimmed)
}
