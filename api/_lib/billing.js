import { BILLING_INTERVALS, LOOKUP_KEYS } from './pricing.js'

export const LIFETIME_SKU = LOOKUP_KEYS.lifetime

// A Checkout Session's terminal fields (`status`, `payment_status`) are frozen
// the moment the payment completes — they keep reporting 'complete' / 'paid'
// forever, even after a full refund or a lost chargeback. So every grant path
// must ALSO look at the underlying charge, which is retrieved by expanding this
// path on the session.
export const LIFETIME_SESSION_EXPAND = ['payment_intent.latest_charge']

export function parseBillingInterval(value) {
  return typeof value === 'string' && BILLING_INTERVALS.includes(value) ? value : null
}

export function isPaidLifetimeSession(session) {
  return !!session
    && session.mode === 'payment'
    && session.status === 'complete'
    && session.payment_status === 'paid'
    && session.metadata?.entitlementSku === LIFETIME_SKU
    && typeof session.metadata?.firebaseUid === 'string'
    && session.metadata.firebaseUid.length > 0
}

// Retrieves a Checkout Session with the charge expanded, so the caller can see
// the money's CURRENT state rather than its state at purchase time.
export function retrieveSessionWithCharge(stripe, sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId, { expand: LIFETIME_SESSION_EXPAND })
}

export function chargeForSession(session) {
  const intent = session?.payment_intent
  if (!intent || typeof intent === 'string') return null
  const charge = intent.latest_charge
  return charge && typeof charge === 'object' ? charge : null
}

export function chargeIsClean(charge) {
  return !!charge
    && charge.refunded === false
    && charge.amount_refunded === 0
    && charge.disputed !== true
}

// The single gate every lifetime grant must pass. Returns a machine-readable
// reason so the caller can log exactly why money was taken without access being
// granted — the one billing branch an owner always has to see.
export function lifetimeGrantHealth(session) {
  if (!isPaidLifetimeSession(session)) return { ok: false, reason: 'not_a_paid_lifetime_session' }
  const charge = chargeForSession(session)
  if (!charge) return { ok: false, reason: 'charge_not_expanded' }
  if (charge.disputed === true) return { ok: false, reason: 'charge_disputed' }
  if (charge.refunded !== false) return { ok: false, reason: 'charge_refunded' }
  if (charge.amount_refunded !== 0) return { ok: false, reason: 'charge_partially_refunded' }
  return { ok: true, reason: null, charge }
}

export function lifetimeEntitlementFromSession(session, grantedAt = Date.now()) {
  if (!isPaidLifetimeSession(session)) return null
  return {
    active: true,
    sku: LIFETIME_SKU,
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
    grantedAt,
    updatedAt: grantedAt,
    revokedAt: null,
    revokedReason: null,
    // Cleared explicitly: these docs are written with { merge: true }, so a
    // stale id from a previous revocation would otherwise survive a repurchase.
    refundedChargeId: null,
    disputeId: null,
  }
}

// Decides whether an entitlement write may proceed, given what is already on
// the user document. Pure so it can be unit-tested without Firestore.
//
// - already active for THIS session → nothing to do (idempotent re-delivery)
// - revoked for THIS session        → refuse; a refunded/disputed purchase must
//                                     never be restored by a webhook re-delivery
// - revoked for a DIFFERENT session → allow; this is a legitimate repurchase,
//                                     and the new session's charge was already
//                                     proved clean by lifetimeGrantHealth
export function lifetimeGrantDecision(current, candidate) {
  const existing = current?.lifetimeEntitlement || null
  if (!candidate) return { action: 'skip', reason: 'no_candidate' }
  if (existing?.active === true && !existing.revokedAt) {
    return existing.checkoutSessionId === candidate.checkoutSessionId
      ? { action: 'noop', reason: 'already_granted' }
      : { action: 'noop', reason: 'already_active_other_session' }
  }
  if (existing?.revokedAt) {
    if (existing.checkoutSessionId === candidate.checkoutSessionId) {
      return { action: 'refuse', reason: 'revoked_session_replay' }
    }
    return { action: 'grant', reason: 'repurchase_after_revocation', grantedAt: candidate.grantedAt }
  }
  return { action: 'grant', reason: 'first_grant', grantedAt: existing?.grantedAt || candidate.grantedAt }
}
