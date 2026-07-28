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

// Builds the entitlement fields a revocation writes, given what is already on
// the user document. Pure so it can be unit-tested without Firestore.
//
// A re-revocation keeps the ORIGINAL revokedAt — that is when access actually
// ended — but always adopts the newest reason and ids. The record has to
// describe the most recent thing that happened to the money, because
// disputeRestoreDecision reads revokedReason to decide whether access may ever
// come back: a refund landing after a dispute MUST overwrite 'dispute_created'
// rather than be swallowed as "already revoked", or winning the dispute later
// would hand a refunded customer permanent Pro.
//
// `changed: false` means the document already says exactly this, so the caller
// can skip the write and stay idempotent under webhook re-delivery.
export function revocationUpdate(entitlement, { reason, chargeId = null, disputeId = null }, now = Date.now()) {
  const fields = {
    active: false,
    revokedAt: entitlement?.revokedAt || now,
    revokedReason: reason,
    refundedChargeId: chargeId || entitlement?.refundedChargeId || null,
    disputeId: disputeId || entitlement?.disputeId || null,
    updatedAt: now,
  }
  const alreadyRecorded = entitlement?.active === false
    && !!entitlement?.revokedAt
    && entitlement.revokedReason === fields.revokedReason
    && (entitlement.refundedChargeId || null) === fields.refundedChargeId
    && (entitlement.disputeId || null) === fields.disputeId
  return { changed: !alreadyRecorded, fields }
}

// Decides whether a dispute closed in our favour may restore access. Pure so it
// can be unit-tested without Firestore or Stripe.
//
// The dispute payload says nothing about refunds, so the caller must retrieve
// the charge and pass it here. Without that, this sequence gives away Pro for
// free: dispute opened (revoked) → merchant refunds to settle → dispute closed
// 'won' → restored. The customer has their money AND their access.
export function disputeRestoreDecision(entitlement, charge, disputeId = null) {
  if (!entitlement) return { ok: false, reason: 'no_entitlement' }
  if (entitlement.active === true) return { ok: false, reason: 'already_active' }
  // Only a dispute-driven revocation is reversible here. A refund revocation
  // (or any other reason) stays put — that money did not come back.
  if (!String(entitlement.revokedReason || '').startsWith('dispute')) {
    return { ok: false, reason: 'not_revoked_for_a_dispute' }
  }
  // A second, still-open dispute overwrites disputeId when it revokes, so an
  // older dispute closing in our favour must not undo the newer revocation.
  if (disputeId && entitlement.disputeId && entitlement.disputeId !== disputeId) {
    return { ok: false, reason: 'revoked_for_a_different_dispute' }
  }
  if (!charge) return { ok: false, reason: 'charge_unavailable' }
  // `charge.disputed` is a historical marker: it records that a dispute happened
  // and is not reliably cleared when one closes, so demanding it be false could
  // mean a won dispute never restores access. This path is only reached from
  // charge.dispute.closed/won for THIS dispute — already matched above — so the
  // flag is the very condition being resolved. Every other cleanliness signal
  // chargeIsClean checks (refunded, amount_refunded) still has to hold.
  if (!chargeIsClean({ ...charge, disputed: false })) return { ok: false, reason: 'charge_refunded' }
  return { ok: true, reason: null }
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
