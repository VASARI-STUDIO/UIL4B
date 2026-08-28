// Access revoked when a SUBSCRIPTION payment goes back.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE GAP
// ─────────────────────────────────────────────────────────────────────────────
// The webhook's refund/dispute path was keyed entirely to the one-off
// `lifetimeEntitlement.paymentIntentId`. A reversed SUBSCRIPTION charge has a
// PaymentIntent belonging to an invoice, not to the lifetime purchase, so the
// revocation transaction matched nothing, returned false, and the yearly
// entitlement stayed active while the money went back.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY `accessRevoked` IS A SEPARATE FIELD AND NOT A STATUS
// ─────────────────────────────────────────────────────────────────────────────
// `writeSubscription()` overwrites `status` from Stripe on every
// `customer.subscription.*` delivery, and a disputed subscription commonly
// still reads `active` in Stripe for a while. A revocation written into
// `status` would be undone by the next event — silently, in the customer's
// favour, on money we no longer hold. The first test below is that property.
//
// Both plan resolvers are asserted, because there are two: the server one that
// actually grants anything, and the client mirror that decides what the UI
// shows. A revocation honoured by only one of them is a Pro interface over a
// Free account, or the reverse.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { planForSubscription, planForUser, subscriptionAccessRevoked } from '../../api/_lib/plans.js'
import { billingAlert } from '../../src/utils/billingState.js'

const ACTIVE = { status: 'active', currentPeriodEnd: Date.now() + 20 * 86_400_000 }

test('a revoked subscription is Free even while Stripe still calls it active', () => {
  // The exact shape the webhook leaves behind: Stripe's own status untouched,
  // the sticky flag beside it.
  const revoked = { ...ACTIVE, accessRevoked: true, accessRevokedReason: 'dispute_created' }
  assert.equal(planForSubscription(ACTIVE).id, 'pro')
  assert.equal(planForSubscription(revoked).id, 'free')
})

test('a revocation beats the seven-day past-due grace', () => {
  // The grace window exists for a payment being RETRIED. Money that has gone
  // back is not being retried, and handing out a further week of Pro on a
  // chargeback would be the grace window paying for the fraud.
  const retrying = { status: 'past_due', paymentFailed: true, paymentFailedAt: Date.now() - 86_400_000 }
  assert.equal(planForSubscription(retrying).id, 'pro', 'the grace window itself is broken')
  assert.equal(planForSubscription({ ...retrying, accessRevoked: true }).id, 'free')
})

test('planForUser honours it too, and admins are still exempt', () => {
  const revoked = { ...ACTIVE, accessRevoked: true }
  assert.equal(planForUser({ subscription: revoked }).id, 'free')
  assert.equal(planForUser({ subscription: revoked, email: 'dylanjacob1100@gmail.com' }).id, 'pro')
})

// A live lifetime entitlement is a separate purchase. Reversing a subscription
// charge must not take it away — and it is checked first in planForUser, so
// this is asserting the order as much as the outcome.
test('a subscription revocation does not touch a live lifetime entitlement', () => {
  const plan = planForUser({
    subscription: { ...ACTIVE, accessRevoked: true },
    lifetimeEntitlement: { active: true },
  })
  assert.equal(plan.id, 'pro')
})

test('the flag reader treats only an explicit true as revoked', () => {
  // Firestore will hand back `undefined` for a field that was never written on
  // the many millions of subscriptions that predate it. None of those is
  // revoked.
  for (const value of [undefined, null, false, 0, '', 'false']) {
    assert.equal(subscriptionAccessRevoked({ accessRevoked: value }), false, String(value))
  }
  assert.equal(subscriptionAccessRevoked(undefined), false)
  assert.equal(subscriptionAccessRevoked({ accessRevoked: true }), true)
})

// ── What the user is told ────────────────────────────────────────────────────

test('a reversed payment gets its own alert, ahead of every other one', () => {
  const alert = billingAlert({
    ...ACTIVE,
    accessRevoked: true,
    accessRevokedAt: 1_700_000_000_000,
    accessRevokedReason: 'dispute_created',
    // Deliberately also carrying failure state: a subscription can be past_due
    // AND reversed, and the reversal is the one that matters.
    paymentFailed: true,
    paymentFailedAt: Date.now(),
    status: 'past_due',
  })
  assert.equal(alert.kind, 'payment-reversed')
  assert.equal(alert.severity, 'urgent')
  assert.equal(alert.reason, 'dispute_created')
})

test('the alert key is stamped on the revocation, not on every write', () => {
  // A dispute fires twice (created, then funds_withdrawn) and Stripe retries
  // deliveries. Keying on `updatedAt` would re-surface a banner the user had
  // already dismissed, every time.
  const base = { ...ACTIVE, accessRevoked: true, accessRevokedAt: 1_700_000_000_000 }
  const first = billingAlert(base)
  const later = billingAlert({ ...base, updatedAt: Date.now(), accessRevokedReason: 'dispute_funds_withdrawn' })
  assert.equal(first.key, later.key)
})

test('an unrevoked subscription still gets its ordinary alerts', () => {
  const failing = { status: 'past_due', paymentFailed: true, paymentFailedAt: Date.now() - 86_400_000 }
  assert.equal(billingAlert(failing).kind, 'payment-failed')
  assert.equal(billingAlert(ACTIVE), null)
})

// ── The two resolvers must not drift ─────────────────────────────────────────

test('the client mirror checks the same flag, before the same grace window', () => {
  // Source-level, because SubscriptionContext.jsx cannot be imported here (JSX,
  // React context, a live Firestore subscription). What has to hold is that the
  // mirror reads the flag AT ALL and reads it before the grace check — the two
  // ways it could be wrong.
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/contexts/SubscriptionContext.jsx'), 'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  const flagAt = src.indexOf('accessRevoked')
  const graceAt = src.indexOf('isWithinPastDueGrace(')
  assert.ok(flagAt > -1, 'the client plan resolver ignores accessRevoked — the UI would show Pro to a revoked account')
  assert.ok(graceAt > -1, 'the grace check moved; this test can no longer tell what order they run in')
  assert.ok(flagAt < graceAt, 'the client checks the past-due grace before the revocation, so a revoked account keeps Pro for seven more days')
})

test('the webhook does not cancel the Stripe subscription behind the founder', () => {
  // Deliberate: cancelling is an irreversible outward action on a live billing
  // account, taken off the back of one webhook, and Stripe already cancels on a
  // chargeback under its own rules. Access stops either way. If this ever
  // becomes wanted it is a founder decision, not a drive-by.
  const hook = fs.readFileSync(path.join(process.cwd(), 'api/stripe-webhook.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(hook, /subscriptions\.(cancel|del)\(/, 'the webhook now cancels subscriptions in Stripe')
  assert.doesNotMatch(hook, /subscriptions\.update\([^)]*cancel_at_period_end/, 'the webhook now schedules cancellation in Stripe')
})

test('the reversed path resolves its user from the SUBSCRIPTION, not the PaymentIntent', () => {
  // The whole point of the slice. api/create-checkout.js stamps
  // metadata.firebaseUid on the checkout PaymentIntent, so it is present for
  // the FIRST payment and absent from every renewal — Stripe makes a fresh
  // PaymentIntent per invoice and copies none of our metadata. A chargeback
  // almost always lands on a renewal, so reusing uidForPaymentIntent here would
  // fail exactly when it is needed.
  const hook = fs.readFileSync(path.join(process.cwd(), 'api/stripe-webhook.js'), 'utf8')
  const fn = hook.slice(hook.indexOf('async function revokeSubscriptionAccess'))
  const body = fn.slice(0, fn.indexOf('\n}\n'))
  assert.match(body, /sub\.metadata\?\.firebaseUid/, 'the subscription metadata is not consulted')
  assert.doesNotMatch(body, /uidForPaymentIntent\(/, 'it fell back to the PaymentIntent metadata, which renewals do not carry')
})

// The design depends on this and would be silently unsafe without it: the flag
// lives INSIDE `subscription`, which firestore.rules locks as a whole map, so a
// client cannot clear its own revocation. If that lock is ever narrowed to
// named sub-fields, `accessRevoked` has to be one of them — a revocation the
// revoked user can delete is not a revocation.
test('the subscription map is locked against client writes', () => {
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8')
  const locked = /function lockedUserFields\(\)\s*\{[\s\S]*?return \[([^\]]*)\]/.exec(rules)
  assert.ok(locked, 'lockedUserFields() is gone from firestore.rules')
  assert.match(locked[1], /'subscription'/,
    'the subscription map is no longer client-locked — a revoked user could clear accessRevoked themselves')
})
