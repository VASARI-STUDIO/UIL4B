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
  isPaidLifetimeSession,
  lifetimeEntitlementFromSession,
  lifetimeGrantDecision,
  lifetimeGrantHealth,
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
