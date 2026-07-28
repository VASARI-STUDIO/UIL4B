// Pure billing guards for the one-off ("lifetime") Pro purchase.
//
// The point of these: a Checkout Session's terminal fields freeze at purchase
// time. A fully refunded or charged-back session STILL reports
// status:'complete' and payment_status:'paid' forever, so those fields alone
// can never be the grant condition.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LIFETIME_SKU,
  chargeForSession,
  chargeIsClean,
  disputeRestoreDecision,
  isPaidLifetimeSession,
  lifetimeEntitlementFromSession,
  lifetimeGrantDecision,
  lifetimeGrantHealth,
  revocationUpdate,
} from '../../api/_lib/billing.js'

const cleanCharge = { id: 'ch_1', refunded: false, amount_refunded: 0, disputed: false }

function session(overrides = {}, charge = cleanCharge) {
  return {
    id: 'cs_1',
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    customer: 'cus_1',
    payment_intent: { id: 'pi_1', latest_charge: charge },
    metadata: { entitlementSku: LIFETIME_SKU, firebaseUid: 'uid_1' },
    ...overrides,
  }
}

test('a paid lifetime session is recognised only with the SKU and a uid', () => {
  assert.equal(isPaidLifetimeSession(session()), true)
  assert.equal(isPaidLifetimeSession(session({ metadata: { firebaseUid: 'uid_1' } })), false)
  assert.equal(isPaidLifetimeSession(session({ metadata: { entitlementSku: LIFETIME_SKU } })), false)
  assert.equal(isPaidLifetimeSession(session({ payment_status: 'unpaid' })), false)
  assert.equal(isPaidLifetimeSession(session({ mode: 'subscription' })), false)
})

test('the charge is read off the expanded payment intent, or not at all', () => {
  assert.equal(chargeForSession(session()).id, 'ch_1')
  assert.equal(chargeForSession(session({ payment_intent: 'pi_1' })), null)
  assert.equal(chargeForSession(session({ payment_intent: { id: 'pi_1' } })), null)
})

test('only an unrefunded, undisputed charge is clean', () => {
  assert.equal(chargeIsClean(cleanCharge), true)
  assert.equal(chargeIsClean({ ...cleanCharge, refunded: true }), false)
  assert.equal(chargeIsClean({ ...cleanCharge, amount_refunded: 500 }), false)
  assert.equal(chargeIsClean({ ...cleanCharge, disputed: true }), false)
  assert.equal(chargeIsClean(null), false)
})

test('a refunded or disputed session is refused even though it still reports paid/complete', () => {
  const refunded = session({}, { id: 'ch_1', refunded: true, amount_refunded: 8999, disputed: false })
  assert.equal(refunded.status, 'complete')
  assert.equal(refunded.payment_status, 'paid')
  assert.equal(lifetimeGrantHealth(refunded).ok, false)
  assert.equal(lifetimeGrantHealth(refunded).reason, 'charge_refunded')

  const partial = session({}, { id: 'ch_1', refunded: false, amount_refunded: 1000, disputed: false })
  assert.equal(lifetimeGrantHealth(partial).reason, 'charge_partially_refunded')

  const disputed = session({}, { id: 'ch_1', refunded: false, amount_refunded: 0, disputed: true })
  assert.equal(lifetimeGrantHealth(disputed).reason, 'charge_disputed')

  assert.equal(lifetimeGrantHealth(session()).ok, true)
})

test('an unexpanded session can never grant — the charge state is unknown', () => {
  assert.equal(lifetimeGrantHealth(session({ payment_intent: 'pi_1' })).reason, 'charge_not_expanded')
})

test('a fresh entitlement clears every revocation marker so a repurchase is not poisoned', () => {
  const e = lifetimeEntitlementFromSession(session(), 1000)
  assert.deepEqual(
    { revokedAt: e.revokedAt, revokedReason: e.revokedReason, refundedChargeId: e.refundedChargeId, disputeId: e.disputeId },
    { revokedAt: null, revokedReason: null, refundedChargeId: null, disputeId: null },
  )
  assert.equal(e.paymentIntentId, 'pi_1')
  assert.equal(e.customerId, 'cus_1')
})

test('a webhook re-delivery for a REVOKED session never restores access', () => {
  const candidate = lifetimeEntitlementFromSession(session(), 2000)
  const current = {
    lifetimeEntitlement: {
      ...candidate, active: false, revokedAt: 1500, revokedReason: 'dispute_created',
    },
  }
  assert.deepEqual(
    lifetimeGrantDecision(current, candidate),
    { action: 'refuse', reason: 'revoked_session_replay' },
  )
})

test('a genuine repurchase after a revocation is allowed', () => {
  const revoked = lifetimeEntitlementFromSession(session({ id: 'cs_old' }), 1000)
  const current = {
    lifetimeEntitlement: { ...revoked, active: false, revokedAt: 1500, revokedReason: 'full_refund' },
  }
  const candidate = lifetimeEntitlementFromSession(session({ id: 'cs_new' }), 2000)
  const decision = lifetimeGrantDecision(current, candidate)
  assert.equal(decision.action, 'grant')
  assert.equal(decision.reason, 'repurchase_after_revocation')
  // The new purchase starts its own clock rather than inheriting the refunded one.
  assert.equal(decision.grantedAt, 2000)
})

test('a first grant on a fresh account proceeds; a duplicate delivery is a no-op', () => {
  const candidate = lifetimeEntitlementFromSession(session(), 2000)
  assert.deepEqual(lifetimeGrantDecision({}, candidate), { action: 'grant', reason: 'first_grant', grantedAt: 2000 })
  assert.deepEqual(
    lifetimeGrantDecision({ lifetimeEntitlement: { ...candidate } }, candidate),
    { action: 'noop', reason: 'already_granted' },
  )
})

test('an existing grant keeps its original grantedAt when re-written', () => {
  const candidate = lifetimeEntitlementFromSession(session(), 2000)
  const decision = lifetimeGrantDecision(
    { lifetimeEntitlement: { ...candidate, active: false, grantedAt: 500, revokedAt: null } },
    candidate,
  )
  assert.equal(decision.action, 'grant')
  assert.equal(decision.grantedAt, 500)
})

// --- Revocation bookkeeping -------------------------------------------------

test('a revocation records the reason, the charge and the dispute', () => {
  const granted = lifetimeEntitlementFromSession(session(), 1000)
  const { changed, fields } = revocationUpdate(
    granted, { reason: 'dispute_created', chargeId: 'ch_1', disputeId: 'dp_1' }, 5000,
  )
  assert.equal(changed, true)
  assert.deepEqual(fields, {
    active: false,
    revokedAt: 5000,
    revokedReason: 'dispute_created',
    refundedChargeId: 'ch_1',
    disputeId: 'dp_1',
    updatedAt: 5000,
  })
})

test('a re-delivery of the SAME revocation writes nothing', () => {
  const granted = lifetimeEntitlementFromSession(session(), 1000)
  const revoked = { ...granted, ...revocationUpdate(granted, { reason: 'full_refund', chargeId: 'ch_1' }, 5000).fields }
  assert.equal(revocationUpdate(revoked, { reason: 'full_refund', chargeId: 'ch_1' }, 6000).changed, false)
})

test('a NEWER revocation reason overwrites the stale one but keeps the original revokedAt', () => {
  const granted = lifetimeEntitlementFromSession(session(), 1000)
  const disputed = { ...granted, ...revocationUpdate(granted, { reason: 'dispute_created', chargeId: 'ch_1', disputeId: 'dp_1' }, 5000).fields }
  // The merchant then refunds to settle the dispute. This must NOT be swallowed
  // as "already revoked" — the reason on file decides whether a later won
  // dispute may restore access.
  const refund = revocationUpdate(disputed, { reason: 'full_refund', chargeId: 'ch_1' }, 6000)
  assert.equal(refund.changed, true)
  assert.equal(refund.fields.revokedReason, 'full_refund')
  assert.equal(refund.fields.revokedAt, 5000, 'access ended when it was first revoked')
  assert.equal(refund.fields.updatedAt, 6000)
  assert.equal(refund.fields.disputeId, 'dp_1', 'the dispute that started this is still on file')
})

// --- Restoring after a won dispute ------------------------------------------

const refundedCharge = { id: 'ch_1', refunded: true, amount_refunded: 8999, disputed: true }

test('a won dispute restores access only for a dispute-driven revocation on a clean charge', () => {
  const granted = lifetimeEntitlementFromSession(session(), 1000)
  const disputed = { ...granted, ...revocationUpdate(granted, { reason: 'dispute_created', chargeId: 'ch_1', disputeId: 'dp_1' }, 5000).fields }
  // `disputed: true` survives the dispute closing, so it must not by itself
  // block the restore — the refund fields are what prove the money is ours.
  assert.deepEqual(
    disputeRestoreDecision(disputed, { id: 'ch_1', refunded: false, amount_refunded: 0, disputed: true }, 'dp_1'),
    { ok: true, reason: null },
  )
  assert.equal(disputeRestoreDecision(disputed, cleanCharge, 'dp_1').ok, true)

  // A revocation for any non-dispute reason is not reversible by a won dispute.
  const refunded = { ...granted, ...revocationUpdate(granted, { reason: 'full_refund', chargeId: 'ch_1' }, 5000).fields }
  assert.deepEqual(
    disputeRestoreDecision(refunded, cleanCharge, 'dp_1'),
    { ok: false, reason: 'not_revoked_for_a_dispute' },
  )
  assert.equal(disputeRestoreDecision({ ...granted, active: true }, cleanCharge, 'dp_1').reason, 'already_active')
  assert.equal(disputeRestoreDecision(null, cleanCharge, 'dp_1').reason, 'no_entitlement')
})

// The regression this exists to prevent: refund + won dispute = free Pro forever.
test('DISPUTE WON AFTER A REFUND never restores access — the customer already has the money', () => {
  const granted = lifetimeEntitlementFromSession(session(), 1000)

  // 1. charge.dispute.created → revoked with reason 'dispute_created'.
  const disputed = { ...granted, ...revocationUpdate(granted, { reason: 'dispute_created', chargeId: 'ch_1', disputeId: 'dp_1' }, 5000).fields }
  assert.equal(disputed.revokedReason, 'dispute_created')

  // 2. The merchant refunds to settle it → charge.refunded re-writes the reason.
  const settled = { ...disputed, ...revocationUpdate(disputed, { reason: 'full_refund', chargeId: 'ch_1' }, 6000).fields }
  assert.equal(settled.revokedReason, 'full_refund')

  // 3. charge.dispute.closed / status 'won' arrives. Refused on the reason...
  assert.deepEqual(
    disputeRestoreDecision(settled, refundedCharge, 'dp_1'),
    { ok: false, reason: 'not_revoked_for_a_dispute' },
  )
  // ...and refused on the charge alone, even if the reason had stayed stale.
  assert.deepEqual(
    disputeRestoreDecision(disputed, refundedCharge, 'dp_1'),
    { ok: false, reason: 'charge_refunded' },
  )
  // A partial refund is money returned too, and blocks the restore just the same.
  assert.equal(
    disputeRestoreDecision(disputed, { id: 'ch_1', refunded: false, amount_refunded: 500, disputed: true }, 'dp_1').reason,
    'charge_refunded',
  )
})

test('a charge that cannot be read, or a different dispute, never restores access', () => {
  const granted = lifetimeEntitlementFromSession(session(), 1000)
  const disputed = { ...granted, ...revocationUpdate(granted, { reason: 'dispute_created', chargeId: 'ch_1', disputeId: 'dp_2' }, 5000).fields }
  // No charge = no proof the money is ours. Fail closed.
  assert.equal(disputeRestoreDecision(disputed, null, 'dp_2').reason, 'charge_unavailable')
  // An older dispute closing must not undo a newer dispute's revocation.
  assert.equal(disputeRestoreDecision(disputed, cleanCharge, 'dp_1').reason, 'revoked_for_a_different_dispute')
  assert.equal(disputeRestoreDecision(disputed, cleanCharge, 'dp_2').ok, true)
})
