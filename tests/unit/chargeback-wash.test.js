// THE CHARGEBACK WASH — a revoked subscription could be restored by its owner.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT
// ─────────────────────────────────────────────────────────────────────────────
// `subscription.accessRevoked` is written by api/stripe-webhook.js when a
// subscription charge is refunded or charged back, and api/_lib/plans.js reads
// it ahead of everything else: it is the ONLY thing keeping that customer on
// Free, because Stripe keeps reporting the subscription `active` right through
// a dispute. It was sticky only because every later subscription write is a
// { merge: true } onto the document that carries it — and firestore.rules let
// the owner delete that document.
//
// So: subscribe → dispute the charge (money back, webhook revokes) →
// deleteDoc(users/<own uid>) from a browser console → either
//
//   1. GET /api/checkout-status?session_id=<own cs_…>. The reconcile's only
//      revocation guard was `stored?.accessRevoked === true`, and `stored` was
//      now null. Stripe still said `active`. Pro restored.
//   2. Do nothing. Stripe does NOT cancel a disputed subscription unless the
//      dashboard's cancel-on-dispute setting is on, so it renews, fires
//      customer.subscription.updated, and upsertSubscription rebuilt the
//      document clean. Pro restored, every period, at a dispute fee each time.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FIX, IN THREE LAYERS, AND WHAT EACH TEST BELOW PINS
// ─────────────────────────────────────────────────────────────────────────────
//   · firestore.rules closes the delete — tests/rules/firestore-rules.test.js.
//   · The reconcile path asks Stripe about the CHARGE before writing a document
//     that grants (section 1 here). That guard does not live on a document.
//   · The renewal webhook does the same, and re-stamps the revocation when the
//     money has gone (section 2 here).
//
// Every refusal sits beside a positive control that differs by the one thing
// under test — a legitimate subscriber on the same fixtures still gets Pro, a
// legitimate cancel still ends it, and the LIFETIME path is untouched.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import {
  SUBSCRIPTION_CHARGE_EXPAND,
  invoicePaymentRefs,
  latestSubscriptionCharge,
  lifetimeGrantHealth,
  reconcileSubscriptionCheckout,
  subscriptionChargeHealth,
  subscriptionDocFields,
  subscriptionMoneyHealth,
  subscriptionRevocationStamp,
} from '../../api/_lib/billing.js'
import { planForSubscription } from '../../api/_lib/plans.js'
import { writeSubscription } from '../../api/stripe-webhook.js'

const DAY = 86_400_000
const PERIOD_END = Math.floor((Date.now() + 25 * DAY) / 1000)

// ── Fixtures ────────────────────────────────────────────────────────────────
const subscription = (overrides = {}) => ({
  id: 'sub_1',
  status: 'active',
  customer: 'cus_1',
  cancel_at_period_end: false,
  trial_end: null,
  latest_invoice: 'in_1',
  metadata: { firebaseUid: 'uid_1' },
  items: { data: [{ current_period_end: PERIOD_END, price: { id: 'price_1', recurring: { interval: 'month' } } }] },
  ...overrides,
})

const session = (overrides = {}) => ({
  id: 'cs_1',
  mode: 'subscription',
  status: 'complete',
  payment_status: 'paid',
  subscription: 'sub_1',
  customer: 'cus_1',
  metadata: { firebaseUid: 'uid_1', billingInterval: 'monthly' },
  ...overrides,
})

const CLEAN = { id: 'ch_1', amount: 900, amount_refunded: 0, refunded: false, disputed: false, payment_intent: 'pi_1' }
const DISPUTED = { ...CLEAN, disputed: true }
const REFUNDED = { ...CLEAN, refunded: true, amount_refunded: 900 }
const PARTIAL = { ...CLEAN, amount_refunded: 200 }

// A Firestore double that records exactly what was merged.
function fakeDb() {
  const writes = []
  return {
    writes,
    lastSubscription: () => writes.at(-1)?.data?.subscription,
    collection: () => ({ doc: (uid) => ({ set: (data, opts) => { writes.push({ uid, data, opts }); return Promise.resolve() } }) }),
  }
}

// A Stripe double for the two hops the charge check takes. `charge: null`
// models a trial or zero-amount invoice with nothing to inspect.
function fakeStripe({ sub = subscription(), charge = CLEAN, invoiceThrows = null } = {}) {
  const calls = { subscriptions: [], invoices: [], paymentIntents: [], charges: [] }
  return {
    calls,
    subscriptions: { retrieve: async (id, params) => { calls.subscriptions.push({ id, params }); return sub } },
    invoices: {
      retrieve: async (id, params) => {
        calls.invoices.push({ id, params })
        if (invoiceThrows) throw invoiceThrows
        return {
          id,
          payments: { data: [{ is_default: true, payment: { type: 'payment_intent', payment_intent: charge ? charge.payment_intent : null } }] },
        }
      },
    },
    paymentIntents: { retrieve: async (id, params) => { calls.paymentIntents.push({ id, params }); return { id, latest_charge: charge } } },
    charges: { retrieve: async (id) => { calls.charges.push(id); return charge } },
  }
}

const quiet = async (fn) => {
  const warn = console.warn
  const error = console.error
  const lines = []
  console.warn = (...a) => lines.push(['warn', ...a])
  console.error = (...a) => lines.push(['error', ...a])
  try { return { result: await fn(), lines } } finally { console.warn = warn; console.error = error }
}

// The attacker's exact input: the user document is GONE, so there is no stored
// subscription, no stored customer id, and nothing for a merge to preserve.
const DELETED = { userData: {}, customerId: null }

// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE RECONCILE PATH — a deleted document no longer washes a chargeback
// ─────────────────────────────────────────────────────────────────────────────
test('THE WASH, PATH 1: a disputed subscription is not reconciled back to Pro after the document is deleted', async () => {
  const db = fakeDb()
  const stripe = fakeStripe({ charge: DISPUTED })
  const { result, lines } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), ...DELETED,
  }))

  assert.equal(result.isPro, false, 'a charged-back subscription was reconciled to Pro')
  assert.equal(result.reconciled, false)
  assert.equal(result.reason, 'charge_disputed')

  // Written down WITH the revocation, not skipped: the sticky flag is back
  // where every later merge preserves it.
  const written = db.lastSubscription()
  assert.ok(written, 'nothing was written, so the next renewal gets to try again')
  assert.equal(written.accessRevoked, true)
  assert.equal(written.accessRevokedReason, 'charge_disputed')
  assert.equal(written.accessRevokedSubscriptionId, 'sub_1')
  assert.equal(written.accessRevokedPaymentIntentId, 'pi_1',
    'the intent id is what a later won dispute matches on to restore')
  assert.equal(planForSubscription(written).id, 'free',
    'the document the reconcile wrote still resolves to Pro')

  assert.ok(lines.some((l) => l[0] === 'error' && /REVOKED/.test(String(l[1]))),
    'money that went back was handled silently')
})

test('POSITIVE CONTROL: the same deleted-document input with a CLEAN charge still reconciles to Pro', async () => {
  // Identical call, one field different. This is what tells the refusal above
  // apart from a reconcile that has simply stopped working.
  const db = fakeDb()
  const stripe = fakeStripe({ charge: CLEAN })
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), ...DELETED,
  }))
  assert.equal(result.reconciled, true)
  assert.equal(result.isPro, true, 'a legitimate subscriber whose webhook never landed is still on Free')
  const written = db.lastSubscription()
  assert.ok(!('accessRevoked' in written), 'a clean charge must not carry a revocation field at all')
  assert.equal(planForSubscription(written).id, 'pro')
})

test('a fully refunded subscription is refused with the webhook\'s own reason, so a won dispute cannot lift it', async () => {
  const db = fakeDb()
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe: fakeStripe({ charge: REFUNDED }), db, uid: 'uid_1', session: session(), ...DELETED,
  }))
  assert.equal(result.isPro, false)
  // restoreSubscriptionAfterDisputeWon refuses exactly this string. Any other
  // spelling would let a refunded customer who also wins a dispute back in.
  assert.equal(db.lastSubscription().accessRevokedReason, 'full_refund')
})

test('a PARTIAL refund is a goodwill credit, not a revocation', async () => {
  // The one place the shared chargeIsClean is deliberately NOT the verdict: it
  // refuses any refund, and revoking a paying customer over a credit would be
  // a worse bug than the one being closed.
  const db = fakeDb()
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe: fakeStripe({ charge: PARTIAL }), db, uid: 'uid_1', session: session(), ...DELETED,
  }))
  assert.equal(result.isPro, true)
  assert.ok(!('accessRevoked' in db.lastSubscription()))
})

test('a charge that cannot be read REFUSES to grant, writes nothing, and is loud', async () => {
  // The reconcile is a safety net under the webhook; leaving a customer on
  // Free until the webhook lands is recoverable. Granting on an unverified
  // charge is not.
  const db = fakeDb()
  const err = Object.assign(new Error('rate limited'), { type: 'StripeRateLimitError' })
  const { result, lines } = await quiet(() => reconcileSubscriptionCheckout({
    stripe: fakeStripe({ invoiceThrows: err }), db, uid: 'uid_1', session: session(), ...DELETED,
  }))
  assert.equal(result.isPro, false)
  assert.equal(result.reconciled, false)
  assert.equal(result.reason, 'charge_unreadable')
  assert.equal(db.writes.length, 0, 'an unverified subscription was written')
  const logged = lines.find((l) => l[0] === 'error')
  assert.ok(logged, 'a refused reconcile was silent')
  assert.equal(logged[2].error, 'rate limited')
})

test('a status that grants nothing costs no charge lookup', async () => {
  // `incomplete` reconciles to Free on its own. Two Stripe calls to confirm a
  // document that cannot grant is a cost with no security behind it.
  const db = fakeDb()
  const stripe = fakeStripe({ sub: subscription({ status: 'incomplete' }), charge: DISPUTED })
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), ...DELETED,
  }))
  assert.equal(result.isPro, false)
  assert.equal(stripe.calls.invoices.length, 0)
  assert.equal(stripe.calls.paymentIntents.length, 0)
})

test('the stored flag still short-circuits before any Stripe call — the new check is in ADDITION', async () => {
  const db = fakeDb()
  const stripe = fakeStripe({ charge: CLEAN })
  const revoked = { id: 'sub_1', status: 'active', currentPeriodEnd: PERIOD_END * 1000, accessRevoked: true }
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: { subscription: revoked }, customerId: 'cus_1',
  }))
  assert.equal(result.isPro, false)
  assert.equal(result.reason, 'access_revoked')
  assert.equal(stripe.calls.subscriptions.length, 0)
  assert.equal(db.writes.length, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · THE RENEWAL WEBHOOK — no user action needed, so this is the one that
//     repeats every period
// ─────────────────────────────────────────────────────────────────────────────
test('THE WASH, PATH 2: a renewal on a disputed charge re-stamps the revocation instead of clearing it', async () => {
  const db = fakeDb()
  const stripe = fakeStripe({ charge: DISPUTED })
  const { lines } = await quiet(() => writeSubscription('uid_1', subscription(), db, stripe))

  const written = db.lastSubscription()
  assert.equal(db.writes.length, 1)
  assert.deepEqual(db.writes[0].opts, { merge: true }, 'the subscription write must stay a merge')
  assert.equal(written.accessRevoked, true, 'a renewal rebuilt the document without the revocation')
  assert.equal(written.accessRevokedReason, 'charge_disputed')
  assert.equal(written.status, 'active', 'Stripe\'s status is still recorded truthfully — the flag is what plans.js reads')
  assert.equal(planForSubscription(written).id, 'free')
  assert.ok(lines.some((l) => l[0] === 'warn' && /REVOKED/.test(String(l[1]))))
})

test('POSITIVE CONTROL: a renewal on a clean charge writes the ordinary document, byte for byte', async () => {
  const db = fakeDb()
  await quiet(() => writeSubscription('uid_1', subscription(), db, fakeStripe({ charge: CLEAN })))
  const written = db.lastSubscription()
  assert.deepEqual(written, subscriptionDocFields(subscription(), written.updatedAt),
    'a clean renewal changed the document the webhook has always written')
  assert.equal(planForSubscription(written).id, 'pro')
})

test('accessRevokedAt is never written by the renewal path — the transaction in revokeSubscriptionAccess owns it', async () => {
  // It keys the customer's banner and is stamped once, on the transition.
  // This path runs on every subscription event; re-stamping here would
  // re-surface a notice the customer has already read.
  const db = fakeDb()
  await quiet(() => writeSubscription('uid_1', subscription(), db, fakeStripe({ charge: DISPUTED })))
  assert.ok(!('accessRevokedAt' in db.lastSubscription()))
})

test('a renewal whose charge cannot be read is written WITHOUT a revocation, loudly', async () => {
  // The opposite asymmetry from the reconcile path, on purpose: stamping a
  // revocation on a Stripe hiccup would drop a PAYING customer to Free.
  const db = fakeDb()
  const err = new Error('rate limited')
  const { lines } = await quiet(() => writeSubscription('uid_1', subscription(), db, fakeStripe({ invoiceThrows: err })))
  const written = db.lastSubscription()
  assert.ok(written, 'the subscription event was dropped')
  assert.ok(!('accessRevoked' in written), 'a Stripe error revoked a paying customer')
  assert.ok(lines.some((l) => l[0] === 'error' && /could not read the charge/.test(String(l[1]))))
})

test('a cancellation or past_due delivery costs no charge lookup and writes as before', async () => {
  for (const status of ['canceled', 'past_due', 'unpaid', 'incomplete']) {
    const db = fakeDb()
    const stripe = fakeStripe({ charge: DISPUTED })
    await quiet(() => writeSubscription('uid_1', subscription({ status }), db, stripe))
    assert.equal(stripe.calls.invoices.length, 0, `${status}: the charge was looked up for a status that grants nothing`)
    assert.ok(!('accessRevoked' in db.lastSubscription()), `${status}: a non-granting write carried a revocation`)
    assert.equal(db.lastSubscription().status, status)
  }
})

test('the call site without a Stripe client still writes — the check is additive, not a new requirement', async () => {
  // tests/unit/subscription-period-end.test.js calls writeSubscription with a
  // db alone. That contract holds.
  const db = fakeDb()
  await writeSubscription('uid_1', subscription(), db)
  assert.equal(db.writes.length, 1)
  assert.ok(!('accessRevoked' in db.lastSubscription()))
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · POSITIVE CONTROLS on the legitimate customer
// ─────────────────────────────────────────────────────────────────────────────
test('a legitimate NEW subscriber gets Pro through both paths', async () => {
  // First checkout: the reconcile (webhook never landed) and the webhook
  // (customer.subscription.created) both see a clean first charge.
  const viaReconcile = fakeDb()
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe: fakeStripe({ charge: CLEAN }), db: viaReconcile, uid: 'uid_1', session: session(), userData: {}, customerId: 'cus_1',
  }))
  assert.equal(result.isPro, true)

  const viaWebhook = fakeDb()
  await quiet(() => writeSubscription('uid_1', subscription(), viaWebhook, fakeStripe({ charge: CLEAN })))
  assert.equal(planForSubscription(viaWebhook.lastSubscription()).id, 'pro')
})

test('a legitimate TRIAL with no charge yet is not blocked', async () => {
  const db = fakeDb()
  const trial = subscription({ status: 'trialing', trial_end: Math.floor(Date.now() / 1000) + 7 * 86_400 })
  await quiet(() => writeSubscription('uid_1', trial, db, fakeStripe({ sub: trial, charge: null })))
  const written = db.lastSubscription()
  assert.ok(!('accessRevoked' in written))
  assert.equal(planForSubscription(written).id, 'pro')
})

test('a legitimate CANCEL still ends access', async () => {
  const db = fakeDb()
  await quiet(() => writeSubscription('uid_1', subscription({ status: 'canceled' }), db, fakeStripe({ charge: CLEAN })))
  assert.equal(planForSubscription(db.lastSubscription()).id, 'free')

  // And a scheduled cancel keeps access until the period actually ends.
  const scheduled = fakeDb()
  await quiet(() => writeSubscription('uid_1', subscription({ cancel_at_period_end: true }), scheduled, fakeStripe({ charge: CLEAN })))
  assert.equal(scheduled.lastSubscription().cancelAtPeriodEnd, true)
  assert.equal(planForSubscription(scheduled.lastSubscription()).id, 'pro')
})

test('the LIFETIME path is untouched: it still re-proves the charge on every grant', () => {
  // The one-off entitlement was never exposed, because checkout-status re-reads
  // the session's charge every time (lifetimeGrantHealth). Pinned so a later
  // refactor of the subscription check cannot quietly loosen the older one.
  const paid = (charge) => ({
    id: 'cs_life', mode: 'payment', status: 'complete', payment_status: 'paid',
    metadata: { entitlementSku: 'uil4b_pro_lifetime', firebaseUid: 'uid_1' },
    payment_intent: { id: 'pi_life', latest_charge: charge },
  })
  assert.equal(lifetimeGrantHealth(paid(CLEAN)).ok, true)
  assert.equal(lifetimeGrantHealth(paid(DISPUTED)).reason, 'charge_disputed')
  assert.equal(lifetimeGrantHealth(paid(REFUNDED)).reason, 'charge_refunded')
  // Stricter than the subscription rule, and rightly: one charge, one grant.
  assert.equal(lifetimeGrantHealth(paid(PARTIAL)).reason, 'charge_partially_refunded')

  const src = stripComments(read('api/checkout-status.js'))
  assert.match(src, /retrieveSessionWithCharge\(stripe, sessionId\)/,
    'checkout-status no longer expands the charge on the session')
  assert.match(src, /lifetimeGrantHealth\(session\)/,
    'checkout-status no longer gates the lifetime grant on the charge')
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · THE LOOKUP matches THIS Stripe SDK, not a remembered one
// ─────────────────────────────────────────────────────────────────────────────
// Stripe's Basil release removed `Invoice.charge` and `Invoice.payment_intent`,
// and the last time this repo walked an invoice it did so through those fields
// and went inert for months (api/stripe-webhook.js, subscriptionForPaymentIntent).
test('the comment stripper works, so the source assertions here mean something', () => {
  assertStripperWorks(assert)
})

test('the two hops expand exactly what the pinned SDK exposes, two levels deep each', async () => {
  const stripe = fakeStripe({ charge: CLEAN })
  await quiet(() => reconcileSubscriptionCheckout({
    stripe, db: fakeDb(), uid: 'uid_1', session: session(), ...DELETED,
  }))
  assert.deepEqual(stripe.calls.subscriptions[0].params, { expand: ['latest_invoice.payments'] })
  assert.deepEqual(SUBSCRIPTION_CHARGE_EXPAND, ['latest_invoice.payments'])
  assert.deepEqual(stripe.calls.invoices[0], { id: 'in_1', params: { expand: ['payments'] } })
  assert.deepEqual(stripe.calls.paymentIntents[0], { id: 'pi_1', params: { expand: ['latest_charge'] } })
})

test('an invoice already expanded on the subscription is not fetched again', async () => {
  const stripe = fakeStripe({ charge: CLEAN })
  const sub = subscription({
    latest_invoice: {
      id: 'in_1',
      payments: { data: [{ is_default: true, payment: { type: 'payment_intent', payment_intent: { id: 'pi_1', latest_charge: DISPUTED } } }] },
    },
  })
  const charge = await latestSubscriptionCharge(stripe, sub)
  assert.equal(charge.disputed, true)
  assert.equal(stripe.calls.invoices.length, 0)
  assert.equal(stripe.calls.paymentIntents.length, 0)
})

test('invoicePaymentRefs reads the Basil shape and prefers the default payment', () => {
  const invoice = {
    payments: { data: [
      { is_default: false, payment: { type: 'payment_intent', payment_intent: 'pi_partial' } },
      { is_default: true, payment: { type: 'payment_intent', payment_intent: 'pi_default' } },
    ] },
  }
  assert.equal(invoicePaymentRefs(invoice).paymentIntentId, 'pi_default')
  assert.equal(invoicePaymentRefs({ payments: { data: [{ payment: { type: 'charge', charge: 'ch_x' } }] } }).chargeId, 'ch_x')
  assert.deepEqual(invoicePaymentRefs({}), { paymentIntentId: null, chargeId: null, intent: null })
  assert.deepEqual(invoicePaymentRefs(null), { paymentIntentId: null, chargeId: null, intent: null })
})

test('billing.js never reads the invoice fields Basil removed', () => {
  const src = stripComments(read('api/_lib/billing.js'))
  assert.doesNotMatch(src, /invoice\??\.charge\b/, 'Invoice.charge was removed in 2025-03-31.basil')
  assert.doesNotMatch(src, /invoice\??\.payment_intent\b/, 'Invoice.payment_intent was removed in 2025-03-31.basil')
  assert.doesNotMatch(src, /\.latest_invoice\.charge/, 'Invoice.charge was removed in 2025-03-31.basil')
})

test('a subscription with no invoice at all has nothing to inspect and is not blocked', async () => {
  const stripe = fakeStripe({ charge: DISPUTED })
  const health = await subscriptionChargeHealth(stripe, subscription({ latest_invoice: null }))
  assert.equal(health.ok, true)
  assert.equal(health.reason, 'no_charge_to_inspect')
  assert.equal(stripe.calls.invoices.length, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The pure verdict and stamp
// ─────────────────────────────────────────────────────────────────────────────
test('subscriptionMoneyHealth: only a dispute or a FULL refund is dirty', () => {
  assert.deepEqual(subscriptionMoneyHealth(CLEAN), { ok: true, dirty: false, reason: null })
  assert.deepEqual(subscriptionMoneyHealth(DISPUTED), { ok: false, dirty: true, reason: 'charge_disputed' })
  assert.deepEqual(subscriptionMoneyHealth(REFUNDED), { ok: false, dirty: true, reason: 'full_refund' })
  assert.deepEqual(subscriptionMoneyHealth({ ...CLEAN, amount_refunded: 900 }), { ok: false, dirty: true, reason: 'full_refund' },
    'amount_refunded reaching amount is a full refund whether or not `refunded` was flipped')
  assert.deepEqual(subscriptionMoneyHealth(PARTIAL), { ok: true, dirty: false, reason: 'partial_refund_only' })
  assert.deepEqual(subscriptionMoneyHealth(null), { ok: true, dirty: false, reason: 'no_charge_to_inspect' })
  // A disputed charge that was also refunded is a dispute first: that is the
  // reversible one, and a later won dispute must find the reason it can lift.
  assert.equal(subscriptionMoneyHealth({ ...REFUNDED, disputed: true }).reason, 'charge_disputed')
})

test('subscriptionRevocationStamp omits the intent id rather than nulling a good one', () => {
  const withIntent = subscriptionRevocationStamp(subscription(), { reason: 'charge_disputed', charge: CLEAN }, 1)
  assert.deepEqual(withIntent, {
    accessRevoked: true, accessRevokedReason: 'charge_disputed', accessRevokedSubscriptionId: 'sub_1',
    accessRevokedPaymentIntentId: 'pi_1', updatedAt: 1,
  })
  const without = subscriptionRevocationStamp(subscription(), { reason: 'full_refund', charge: { ...CLEAN, payment_intent: null } }, 1)
  assert.ok(!('accessRevokedPaymentIntentId' in without),
    'writing null over an existing intent id would strand a customer who later wins')
  assert.ok(!('accessRevokedAt' in withIntent))
})

// ─────────────────────────────────────────────────────────────────────────────
// 6 · THE CORRECTED CLAIM. The webhook's comment said Stripe cancels a disputed
//     subscription on its own. It does not — and that belief is why nobody
//     worried that a revoked subscription keeps renewing.
// ─────────────────────────────────────────────────────────────────────────────
test('the webhook no longer claims Stripe cancels a subscription on a chargeback', () => {
  const hook = read('api/stripe-webhook.js').replace(/\r\n/g, '\n')
  assert.doesNotMatch(hook, /Stripe already cancels on a chargeback under its own rules/,
    'the false claim is back — cancel-on-dispute is a dashboard setting, off by default')
  assert.match(hook, /cancel-on-dispute/, 'the correction that names the dashboard setting is gone')
})

test('the webhook threads the Stripe client into every subscription write', () => {
  const src = stripComments(read('api/stripe-webhook.js'))
  assert.match(src, /async function upsertSubscription\(stripe, subscription\)/,
    'upsertSubscription no longer receives the Stripe client')
  assert.doesNotMatch(src, /upsertSubscription\((?!stripe)/,
    'a call site drops the Stripe client — that write can no longer check the charge')
  assert.match(src, /writeSubscription\([^)]*,\s*null,\s*stripe\)/,
    'upsertSubscription does not pass the client through to writeSubscription')
})
