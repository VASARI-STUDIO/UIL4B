// The decisions inside api/delete-account.js that are worth testing, pulled out
// so they can be tested without Firebase or Stripe in the room.
//
// Files in /api/_lib are not deployed as routes (underscore-prefixed), so this
// costs nothing against the 12-function Vercel limit — which delete-account.js
// itself takes to exactly 12.
//
// Everything here is a refusal rule. Deleting an account is irreversible and
// cancelling a subscription spends someone's money, so each of these answers
// "may we?" and defaults to no.

// How recently the user must have actually authenticated. Firebase ID tokens
// live an hour; without this a token from a machine the user walked away from
// could delete the account. Five minutes covers reauthenticating and reading a
// confirmation dialog, and leaves a stale token useless.
export const REAUTH_WINDOW_MS = 5 * 60 * 1000

// Stripe statuses that will never bill again, so there is nothing to cancel.
// Everything else — including `trialing`, `past_due` and `unpaid` — bills or
// resumes billing later and must be cancelled before the account disappears.
const DEAD_STATUSES = new Set(['canceled', 'incomplete_expired'])

export function isReauthFresh(authTimeMs, now = Date.now(), window = REAUTH_WINDOW_MS) {
  if (!Number.isFinite(authTimeMs) || authTimeMs <= 0) return false
  const age = now - authTimeMs
  // A token from the future is a clock problem, not a fresh login. Treating it
  // as fresh would make the window trivially bypassable.
  if (age < 0) return false
  return age <= window
}

// Whether a stored stripeCustomerId really belongs to this uid.
//
// `stripeCustomerId` sat on a client-writable document until the
// firestore.rules lock, so the stored value is NOT proof of ownership. Stripe's
// own metadata.firebaseUid was written by our server at create-checkout time
// and has never been client-reachable. Skipping this check would let a tampered
// id cancel a stranger's subscription — which they would discover when their
// access stopped, not before.
export function customerOwnershipVerdict(customer, uid) {
  if (!customer) return 'missing_customer'
  if (customer.deleted) return 'customer_deleted'
  const customerUid = customer.metadata?.firebaseUid || null
  if (!customerUid) return 'missing_metadata'   // legacy/hand-made customer
  return customerUid === uid ? 'ok' : 'uid_mismatch'
}

// Only 'ok' and 'customer_deleted' may proceed. A deleted customer cannot be
// billed again, so there is nothing to cancel and nothing to refuse over.
export function mayProceedWithDeletion(verdict) {
  return verdict === 'ok' || verdict === 'customer_deleted'
}

// Subscriptions that still bill and therefore must be cancelled first.
export function liveSubscriptions(subscriptions) {
  return (Array.isArray(subscriptions) ? subscriptions : [])
    .filter((s) => s && !DEAD_STATUSES.has(s.status))
}
