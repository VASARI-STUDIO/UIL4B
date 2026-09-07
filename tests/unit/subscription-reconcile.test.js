// A PAID SUBSCRIPTION MUST NOT DEPEND ON A SINGLE WEBHOOK DELIVERY.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE GAP
// ─────────────────────────────────────────────────────────────────────────────
// api/checkout-status.js reconciles a paid ONE-OFF session inside a transaction
// precisely because a completed payment must never rest on one delivery. It did
// nothing of the kind for `mode === 'subscription'`.
//
// So a subscription checkout whose checkout.session.completed AND
// customer.subscription.created deliveries both failed — a wrong
// STRIPE_WEBHOOK_SECRET, a disabled endpoint, a 500 during a Firestore blip —
// left a customer who had just paid sitting on Free until a Stripe retry
// happened to succeed. And /checkout/return told them, flatly, "Your Pro
// subscription is active."
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE FIX MAY AND MAY NOT DO
// ─────────────────────────────────────────────────────────────────────────────
// It may ADD access that Stripe already says exists. It may never FABRICATE
// access. Every assertion below is one of those two sentences:
//
//   · ownership is the caller's 403 on the session's server-stamped firebaseUid;
//   · Stripe's own subscription status decides the outcome, so an `incomplete`
//     subscription reconciles to Free;
//   · a customer mismatch refuses;
//   · and `accessRevoked` — the sticky field that records money going back —
//     is an absolute veto, because Stripe commonly still reports `active`
//     through a dispute and re-reading it must not be a way around a revocation.
//
// The document it writes is the webhook's, through the same single writer, so
// the reconcile path and the webhook path cannot drift.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import {
  reconcileSubscriptionCheckout,
  subscriptionDocFields,
  subscriptionReconcileDecision,
} from '../../api/_lib/billing.js'

const DAY = 86_400_000
const PERIOD_END = Math.floor((Date.now() + 25 * DAY) / 1000)

const subscription = (overrides = {}) => ({
  id: 'sub_1',
  status: 'active',
  customer: 'cus_1',
  cancel_at_period_end: false,
  trial_end: null,
  items: { data: [{ current_period_end: PERIOD_END, price: { id: 'price_1', recurring: { interval: 'year' } } }] },
  ...overrides,
})

const session = (overrides = {}) => ({
  id: 'cs_1',
  mode: 'subscription',
  status: 'complete',
  payment_status: 'paid',
  subscription: 'sub_1',
  customer: 'cus_1',
  metadata: { firebaseUid: 'uid_1', billingInterval: 'yearly' },
  ...overrides,
})

function fakeDb() {
  const writes = []
  return {
    writes,
    lastSubscription: () => writes.at(-1)?.data?.subscription,
    collection: () => ({ doc: (uid) => ({ set: (data, opts) => { writes.push({ uid, data, opts }); return Promise.resolve() } }) }),
  }
}

function fakeStripe(sub, { throws = null } = {}) {
  const retrieved = []
  return {
    retrieved,
    subscriptions: {
      retrieve: async (id) => {
        retrieved.push(id)
        if (throws) throw throws
        return sub
      },
    },
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

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The decision
// ─────────────────────────────────────────────────────────────────────────────
test('a completed subscription checkout with nothing on the account reconciles', () => {
  const d = subscriptionReconcileDecision({}, session())
  assert.equal(d.reconcile, true)
  assert.equal(d.reason, 'webhook_never_landed')
  assert.equal(d.subscriptionId, 'sub_1')
})

test('a session Stripe has not completed is never reconciled', () => {
  assert.equal(subscriptionReconcileDecision({}, session({ status: 'open' })).reconcile, false)
  assert.equal(subscriptionReconcileDecision({}, session({ status: 'expired' })).reconcile, false)
})

test('a one-off session is left entirely to the lifetime path', () => {
  const d = subscriptionReconcileDecision({}, session({ mode: 'payment', subscription: null }))
  assert.equal(d.reconcile, false)
  assert.equal(d.reason, 'not_a_subscription_session')
})

test('an account already Pro on THIS subscription is not rewritten', () => {
  const stored = { id: 'sub_1', status: 'active', currentPeriodEnd: PERIOD_END * 1000 }
  const d = subscriptionReconcileDecision({ subscription: stored }, session())
  assert.equal(d.reconcile, false)
  assert.equal(d.reason, 'already_applied')
})

test('a STALE stored subscription still reconciles — the webhook landed and then stopped', () => {
  // The other half of the defect: an account whose subscription document is a
  // month out of date is not "already applied". Its period end is past, so the
  // stale-period net has already dropped it to Free while Stripe says active.
  const stale = { id: 'sub_1', status: 'active', currentPeriodEnd: Date.now() - 10 * DAY }
  const d = subscriptionReconcileDecision({ subscription: stale }, session())
  assert.equal(d.reconcile, true)
  assert.equal(d.reason, 'stored_state_is_stale')
})

test('a revoked account is never reconciled back into access', () => {
  // Money that has gone back. Stripe still reports `active` through a dispute,
  // so a re-read must not become the way around the sticky flag.
  const revoked = { id: 'sub_1', status: 'active', accessRevoked: true, accessRevokedReason: 'dispute_created' }
  const d = subscriptionReconcileDecision({ subscription: revoked }, session())
  assert.equal(d.reconcile, false)
  assert.equal(d.reason, 'access_revoked')
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The effect
// ─────────────────────────────────────────────────────────────────────────────
test('reconciling writes the webhook document and reports Pro', async () => {
  const db = fakeDb()
  const stripe = fakeStripe(subscription())
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: {}, customerId: 'cus_1',
  }))

  assert.equal(result.reconciled, true)
  assert.equal(result.isPro, true)
  assert.deepEqual(stripe.retrieved, ['sub_1'])
  assert.equal(db.writes.length, 1)
  assert.equal(db.writes[0].uid, 'uid_1')
  assert.deepEqual(db.writes[0].opts, { merge: true })

  // Byte-identical to what the webhook would have written. Two hand-written
  // copies of this document is how the two paths drift.
  const written = db.lastSubscription()
  const expected = subscriptionDocFields(subscription(), written.updatedAt)
  assert.deepEqual(written, expected)
  assert.equal(written.currentPeriodEnd, PERIOD_END * 1000)
})

test('a subscription Stripe has not activated reconciles to FREE, not to Pro', async () => {
  // The line between adding access and fabricating it. `incomplete` means the
  // first invoice has not been paid.
  const db = fakeDb()
  const stripe = fakeStripe(subscription({ status: 'incomplete' }))
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: {}, customerId: 'cus_1',
  }))
  assert.equal(result.reconciled, true, 'the truth is still written down')
  assert.equal(result.isPro, false, 'an incomplete subscription was reported as Pro')
  assert.equal(db.lastSubscription().status, 'incomplete')
})

test('a customer mismatch refuses, loudly, and writes nothing', async () => {
  const db = fakeDb()
  const stripe = fakeStripe(subscription({ customer: 'cus_someone_else' }))
  const { result, lines } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: {}, customerId: 'cus_1',
  }))
  assert.equal(result.reconciled, false)
  assert.equal(result.isPro, false)
  assert.equal(db.writes.length, 0)
  assert.ok(lines.some((l) => l[0] === 'error' && /customer mismatch/.test(String(l[1]))),
    'a refused reconcile on a paid session was silent')
})

test('a Stripe failure is logged, never swallowed', async () => {
  // A customer who has paid and is still on Free is the one branch an owner has
  // to see. Empty catch bodies have cost this repo twice already.
  const db = fakeDb()
  const err = Object.assign(new Error('No such subscription: sub_1'), { type: 'StripeInvalidRequestError' })
  const stripe = fakeStripe(null, { throws: err })
  const { result, lines } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: {}, customerId: 'cus_1',
  }))
  assert.equal(result.reconciled, false)
  assert.equal(result.reason, 'retrieve_failed')
  assert.equal(db.writes.length, 0)
  const logged = lines.find((l) => l[0] === 'error')
  assert.ok(logged, 'a Stripe failure on a paid subscription checkout was swallowed')
  assert.equal(logged[2].error, 'No such subscription: sub_1')
})

test('an account already Pro is reported Pro without touching Stripe at all', async () => {
  const db = fakeDb()
  const stripe = fakeStripe(subscription())
  const stored = { id: 'sub_1', status: 'active', currentPeriodEnd: PERIOD_END * 1000 }
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: { subscription: stored }, customerId: 'cus_1',
  }))
  assert.equal(result.reconciled, false)
  assert.equal(result.reason, 'already_applied')
  assert.equal(result.isPro, true)
  assert.deepEqual(stripe.retrieved, [], 'a healthy account still costs a Stripe round trip on every poll')
  assert.equal(db.writes.length, 0)
})

test('a revoked account stays Free through a reconcile attempt', async () => {
  const db = fakeDb()
  const stripe = fakeStripe(subscription())
  const revoked = { id: 'sub_1', status: 'active', currentPeriodEnd: PERIOD_END * 1000, accessRevoked: true }
  const { result } = await quiet(() => reconcileSubscriptionCheckout({
    stripe, db, uid: 'uid_1', session: session(), userData: { subscription: revoked }, customerId: 'cus_1',
  }))
  assert.equal(result.isPro, false)
  assert.equal(db.writes.length, 0)
  assert.deepEqual(stripe.retrieved, [])
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE WIRING. The endpoint calls it, and the page reads the answer.
// ─────────────────────────────────────────────────────────────────────────────
test('the comment stripper works, so the source assertions below mean something', () => {
  assertStripperWorks(assert)
})

test('api/checkout-status.js actually runs the reconcile and returns its answer', () => {
  const src = stripComments(read('api/checkout-status.js'))
  assert.match(src, /import\s*\{[\s\S]*?reconcileSubscriptionCheckout[\s\S]*?\}\s*from\s*'\.\/_lib\/billing\.js'/,
    'checkout-status no longer imports the reconcile')
  assert.match(src, /reconcileSubscriptionCheckout\(\{/,
    'checkout-status no longer calls the reconcile — a subscription checkout is back to one delivery')
  assert.match(src, /subscriptionActive/,
    'checkout-status no longer reports whether the subscription is live')
  // The response has to carry it, or the page cannot tell the truth.
  const body = src.slice(src.indexOf('return res.status(200).json({'))
  assert.match(body, /subscriptionActive/, 'subscriptionActive is computed but never returned')
})

test('/checkout/return stops claiming a subscription is active on its own say-so', () => {
  const src = stripComments(read('src/pages/CheckoutReturn.jsx'))
  assert.match(src, /data\.subscriptionActive/,
    'the return page ignores subscriptionActive — it is back to telling every paying customer they are Pro')
  // The old shape: activation could only ever be pending for a one-off.
  assert.ok(!/setActivationPending\(data\.mode === 'payment' && data\.entitlementActive !== true\)/.test(src),
    'the return page still gates activationPending on mode === payment alone')
})
