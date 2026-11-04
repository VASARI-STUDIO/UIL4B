// The 14-day withdrawal: eligibility, the full refund, and the guarantee that
// the refund is made once however the request is repeated or interrupted.
//
// Layers, lowest first:
//   1. the pure amount and the pure decision;
//   2. performWithdrawal against in-memory fakes of Firestore (transactions run
//      one at a time, as Firestore's do) and Stripe (honours idempotency keys,
//      refuses to refund more than the charge has left, and can be told to fail);
//   3. the real POST /api/create-portal handler with its collaborators swapped
//      for the same fakes;
//   4. the real webhook dispatch, to show a withdrawal's refund (recognised by the
//      stamp on the refund itself) does not stamp the sticky access revocation
//      that a normal full refund does, and that a cancelled-but-unrefunded
//      withdrawal is finished when Stripe reports the subscription deleted.
// No network, no Stripe account, no emulator.
import test from 'node:test'
import assert from 'node:assert/strict'
import { adminAuth, adminDb } from '../../api/_lib/firebase-admin.js'
import { getStripeServer } from '../../api/_lib/stripe.js'
import {
  WITHDRAWAL_REASON,
  WITHDRAWAL_WINDOW_MS,
  performWithdrawal,
  withdrawalDecision,
  withdrawalIdempotencyKey,
  withdrawalMarkerFor,
  withdrawalRefundDue,
  withdrawalWindowStart,
} from '../../api/_lib/billing.js'
import portalHandler from '../../api/create-portal.js'
import { planForSubscription } from '../../api/_lib/plans.js'
import { processStripeEvent, writeSubscription } from '../../api/stripe-webhook.js'

const DAY = 86_400_000
const START = 1_800_000_000 // seconds
const NOW = START * 1000 + 2 * DAY

// ── in-memory Firestore ─────────────────────────────────────────────────────

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)

function merge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    target[k] = isPlain(v) ? merge(isPlain(target[k]) ? target[k] : {}, v) : structuredClone(v)
  }
  return target
}

function fakeDb(initial = {}) {
  const store = { 'users/u1': structuredClone(initial) }
  const write = (path, data, opts) => {
    store[path] = opts?.merge ? merge(store[path] || {}, data) : structuredClone(data)
  }
  const snap = (path) => ({ exists: store[path] !== undefined, data: () => (store[path] === undefined ? undefined : structuredClone(store[path])) })
  let lock = Promise.resolve()
  return {
    store,
    collection: (c) => ({
      doc: (id) => ({
        path: `${c}/${id}`,
        get: async () => snap(`${c}/${id}`),
        set: async (data, opts) => write(`${c}/${id}`, data, opts),
        delete: async () => { delete store[`${c}/${id}`] },
      }),
    }),
    // One transaction at a time, like Firestore under contention. Without this a
    // double-click would race both claims past each other and prove nothing.
    runTransaction(fn) {
      const run = lock.then(async () => {
        const pending = []
        const tx = {
          get: async (r) => snap(r.path),
          set: (r, data, opts) => { pending.push(() => write(r.path, data, opts)) },
          delete: (r) => { pending.push(() => { delete store[r.path] }) },
        }
        const out = await fn(tx)
        for (const apply of pending) apply()
        return out
      })
      lock = run.catch(() => {})
      return run
    },
  }
}

// ── Stripe fake ─────────────────────────────────────────────────────────────

const periodItem = (startSec, endSec) => ({
  current_period_start: startSec,
  current_period_end: endSec,
  price: { id: 'price_1', recurring: { interval: 'month', interval_count: 1 } },
})

function baseSub(overrides = {}) {
  return {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    start_date: START,
    created: START,
    items: { data: [periodItem(START, START + 30 * 86_400)] },
    latest_invoice: 'in_1',
    ...overrides,
  }
}

const baseCharge = (overrides = {}) => ({
  id: 'ch_1', customer: 'cus_1', status: 'succeeded', amount: 3000, amount_captured: 3000, amount_refunded: 0, currency: 'gbp', disputed: false, ...overrides,
})

const STRIPE_WRITES = ['subscriptions.cancel', 'refunds.create']

// An invoice paid by one payment: through the charge directly, or (as Stripe does
// for a card) through the PaymentIntent that made it.
const paidInvoice = (id, chargeId, { amount = 3000, intent = null } = {}) => ({
  id,
  status: 'paid',
  attempt_count: 1,
  amount_paid: amount,
  payments: { data: [{ status: 'paid', is_default: true, payment: intent ? { type: 'payment_intent', payment_intent: intent } : { type: 'charge', charge: chargeId } }] },
})

// An invoice whose only payment attempt failed: nothing was paid.
const failedInvoice = (id) => ({
  id,
  status: 'open',
  attempt_count: 1,
  amount_paid: 0,
  payments: { data: [{ status: 'canceled', payment: { type: 'payment_intent', payment_intent: 'pi_failed' } }] },
})

function fakeStripe({
  sub = baseSub(),
  charge = null,
  extraCharges = {}, // more charges by id, for a subscription with several invoices
  intents = {}, // PaymentIntent id -> the charge it made
  invoices = null, // default: one paid invoice for ch_1
  invoicesHasMore = false,
  refunds = [],
  paid = true, // false: the latest invoice has no payment behind it (an unpaid sub)
  customerBalance = 0,
  failRefundOnce = false,
  failRefundForCharge = null, // fail the first refund created for this charge only
  refundStatusOnce = null, // the first refund comes back with this status ('failed')
  failCancelOnce = false,
  loseCancelResponse = false, // the cancel lands at Stripe but the reply is lost
  honourIdempotency = true,
  retrieveError = null,
  customerUid = 'u1',
} = {}) {
  const calls = []
  const state = {
    sub: { ...sub },
    charge: charge || baseCharge(),
    refunds: structuredClone(refunds),
    byKey: new Map(),
    invoices: structuredClone(invoices || [paid ? paidInvoice('in_1', 'ch_1') : failedInvoice('in_1')]),
  }
  state.charges = { ch_1: state.charge, ...structuredClone(extraCharges) }
  let refundFails = failRefundOnce
  let chargeFails = failRefundForCharge
  let statusOnce = refundStatusOnce
  let cancelFails = failCancelOnce
  let cancelLost = loseCancelResponse
  const initialRefunded = Object.fromEntries(Object.entries(state.charges).map(([id, c]) => [id, c.amount_refunded]))
  return {
    calls,
    state,
    refundedByUs: () => Object.entries(state.charges).reduce((sum, [id, c]) => sum + c.amount_refunded - initialRefunded[id], 0),
    customers: {
      retrieve: async (id) => { calls.push(['customers.retrieve', id]); return { id, balance: customerBalance, metadata: { firebaseUid: customerUid } } },
    },
    billingPortal: {
      sessions: { create: async (params) => { calls.push(['billingPortal.sessions.create', params]); return { url: 'https://portal.example/session' } } },
    },
    subscriptions: {
      retrieve: async (id) => {
        calls.push(['subscriptions.retrieve', id])
        if (retrieveError) throw retrieveError
        return structuredClone(state.sub)
      },
      cancel: async (id, params) => {
        calls.push(['subscriptions.cancel', id, params])
        if (cancelFails) { cancelFails = false; throw new Error('stripe unreachable') }
        state.sub = { ...state.sub, status: 'canceled' }
        if (cancelLost) { cancelLost = false; throw new Error('connection reset') }
        return structuredClone(state.sub)
      },
    },
    invoices: {
      list: async (params) => {
        calls.push(['invoices.list', params])
        return { data: structuredClone(state.invoices), has_more: invoicesHasMore }
      },
      retrieve: async (id) => {
        calls.push(['invoices.retrieve', id])
        const found = state.invoices.find((i) => i.id === id)
        if (!found) throw Object.assign(new Error('No such invoice'), { code: 'resource_missing' })
        return structuredClone(found)
      },
    },
    paymentIntents: {
      retrieve: async (id) => {
        calls.push(['paymentIntents.retrieve', id])
        return { id, latest_charge: structuredClone(state.charges[intents[id]]) }
      },
    },
    charges: {
      retrieve: async (id) => { calls.push(['charges.retrieve', id]); return structuredClone(state.charges[id]) },
    },
    refunds: {
      list: async (params) => {
        calls.push(['refunds.list', params.charge])
        return { data: structuredClone(state.refunds.filter((r) => (r.charge || 'ch_1') === params.charge)) }
      },
      create: async (params, opts) => {
        calls.push(['refunds.create', params, opts])
        const key = opts?.idempotencyKey
        if (honourIdempotency && key && state.byKey.has(key)) return structuredClone(state.byKey.get(key))
        if (refundFails) { refundFails = false; throw new Error('network down') }
        if (chargeFails && chargeFails === params.charge) { chargeFails = null; throw new Error('network down') }
        const target = state.charges[params.charge]
        const left = (target.amount_captured ?? target.amount) - target.amount_refunded
        if (!(params.amount > 0) || params.amount > left) {
          throw Object.assign(new Error('Refund amount is more than the charge has left'), { code: 'charge_already_refunded' })
        }
        const refund = { id: `re_${state.refunds.length + 1}`, charge: params.charge, amount: params.amount, status: statusOnce || 'succeeded', metadata: params.metadata }
        // A refund that failed returned no money.
        if (!statusOnce) target.amount_refunded += params.amount
        statusOnce = null
        state.refunds.push(refund)
        if (key) state.byKey.set(key, refund)
        return structuredClone(refund)
      },
    },
  }
}

const userDoc = (extra = {}) => ({
  stripeCustomerId: 'cus_1',
  subscription: { id: 'sub_1', status: 'active' },
  ...extra,
})

const run = (stripe, db, userData, now = NOW) => performWithdrawal({ stripe, db, uid: 'u1', userData, customerId: 'cus_1', now })
const names = (stripe) => stripe.calls.map((c) => c[0])
const createdRefunds = (stripe) => stripe.calls.filter((c) => c[0] === 'refunds.create')
const marker = (db) => db.store['users/u1']?.subscription?.withdrawal

function assertNoMoneyMoved(stripe, db) {
  assert.deepEqual(stripe.calls.filter((c) => STRIPE_WRITES.includes(c[0])), [], 'a Stripe write was attempted')
  assert.equal(stripe.refundedByUs(), 0)
  assert.equal(marker(db), undefined, 'a refused request left a marker behind')
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · the amount: everything paid, less what has already gone back
// ═════════════════════════════════════════════════════════════════════════════

test('the refund due is the whole amount paid, whatever the date', () => {
  assert.equal(withdrawalRefundDue(baseCharge()), 3000)
  // amount_captured is the money actually taken, so it wins over amount
  assert.equal(withdrawalRefundDue(baseCharge({ amount: 3000, amount_captured: 2500 })), 2500)
})

test('what was already refunded comes off, and the result is never negative', () => {
  assert.equal(withdrawalRefundDue(baseCharge({ amount_refunded: 500 })), 2500)
  assert.equal(withdrawalRefundDue(baseCharge({ amount_refunded: 3000 })), 0)
  assert.equal(withdrawalRefundDue(baseCharge({ amount_refunded: 4000 })), 0)
})

test('a charge with no usable amount gives null, so the caller refuses rather than guesses', () => {
  assert.equal(withdrawalRefundDue(null), null)
  assert.equal(withdrawalRefundDue({}), null)
  assert.equal(withdrawalRefundDue(baseCharge({ amount: NaN, amount_captured: undefined })), null)
  assert.equal(withdrawalRefundDue(baseCharge({ amount: -1, amount_captured: undefined })), null)
  assert.equal(withdrawalRefundDue(baseCharge({ amount: 0, amount_captured: 0 })), 0)
})

test('the paid start is the trial end when there is one, else the start, else created', () => {
  assert.equal(withdrawalWindowStart(baseSub()), START * 1000)
  assert.equal(withdrawalWindowStart(baseSub({ start_date: undefined })), START * 1000)
  assert.equal(withdrawalWindowStart(baseSub({ trial_end: START + 7 * 86_400 })), (START + 7 * 86_400) * 1000)
  assert.equal(withdrawalWindowStart(baseSub({ trial_end: null })), START * 1000)
  assert.equal(withdrawalWindowStart(baseSub({ start_date: undefined, created: undefined })), null)
})

// ═════════════════════════════════════════════════════════════════════════════
// 2 · eligibility (pure)
// ═════════════════════════════════════════════════════════════════════════════

test('the window is 14 days from the subscription start, inclusive', () => {
  const at = (ms) => withdrawalDecision({ sub: baseSub(), customerId: 'cus_1', now: START * 1000 + ms })
  assert.equal(WITHDRAWAL_WINDOW_MS, 14 * DAY)
  assert.equal(at(0).ok, true)
  assert.equal(at(14 * DAY - 1).ok, true)
  assert.equal(at(14 * DAY).ok, true)
  const late = at(14 * DAY + 1)
  assert.equal(late.ok, false)
  assert.equal(late.code, 'withdraw_window_closed')
  assert.equal(late.status, 409)
})

test('an ended subscription, a missing start or another customer is refused', () => {
  const d = (sub, customerId = 'cus_1', mk = null) => withdrawalDecision({ sub, customerId, marker: mk, now: NOW })
  assert.equal(d(baseSub({ status: 'canceled' })).code, 'already_canceled')
  assert.equal(d(baseSub({ status: 'incomplete_expired' })).code, 'already_canceled')
  assert.equal(d(baseSub({ start_date: undefined, created: undefined })).code, 'withdraw_window_closed')
  assert.equal(d(baseSub({ customer: 'cus_other' })).code, 'subscription_mismatch')
  assert.equal(d(baseSub(), 'cus_other').code, 'subscription_mismatch')
})

test('the window counts from start_date, and falls back to created only when there is none', () => {
  const at = (sub) => withdrawalDecision({ sub, customerId: 'cus_1', now: START * 1000 + 5 * DAY })
  // started 10 days before it was created: 15 days in, closed
  assert.equal(at(baseSub({ start_date: START - 10 * 86_400 })).code, 'withdraw_window_closed')
  // no start_date: falls back to created, 5 days in, open
  assert.equal(at(baseSub({ start_date: undefined })).ok, true)
})

test('a subscription that began with a trial counts its 14 days from the first payment', () => {
  const sub = baseSub({ trial_end: START + 7 * 86_400 })
  const at = (days) => withdrawalDecision({ sub, customerId: 'cus_1', now: START * 1000 + days * DAY })
  // 20 days after it began, but only 13 after the trial ended and the card was charged
  assert.equal(at(20).ok, true)
  assert.equal(at(21).ok, true)
  assert.equal(at(21.001).code, 'withdraw_window_closed')
})

test('a trial still running can always be ended: nothing has been paid, so no window applies', () => {
  const sub = baseSub({ status: 'trialing', start_date: START - 60 * 86_400, trial_end: START + 3 * 86_400 })
  assert.deepEqual(withdrawalDecision({ sub, customerId: 'cus_1', now: NOW }), { ok: true, action: 'new' })
})

test('a pending marker resumes even after the window has closed or the sub is cancelled', () => {
  const mk = { subscriptionId: 'sub_1', state: 'pending' }
  const decision = withdrawalDecision({ sub: baseSub({ status: 'canceled' }), customerId: 'cus_1', marker: mk, now: START * 1000 + 30 * DAY })
  assert.deepEqual(decision, { ok: true, action: 'resume' })
})

test('a marker only counts for the subscription it names', () => {
  assert.equal(withdrawalMarkerFor({ withdrawal: { subscriptionId: 'sub_1' } }, 'sub_2'), null)
  assert.equal(withdrawalMarkerFor({ withdrawal: { subscriptionId: 'sub_1' } }, 'sub_1').subscriptionId, 'sub_1')
  assert.equal(withdrawalMarkerFor(null, 'sub_1'), null)
})

// ═════════════════════════════════════════════════════════════════════════════
// 3 · the whole action: money, window, refusals
// ═════════════════════════════════════════════════════════════════════════════

test('withdrawing cancels at once, refunds the full amount paid and drops access', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 200)
  assert.deepEqual(out.body, { ok: true, refunded: 3000, currency: 'gbp', subscriptionId: 'sub_1' })
  const cancel = stripe.calls.find((c) => c[0] === 'subscriptions.cancel')
  assert.deepEqual(cancel[2], { prorate: false, invoice_now: false })
  const [create] = createdRefunds(stripe)
  assert.equal(create[1].amount, 3000)
  assert.equal(create[1].charge, 'ch_1')
  assert.equal(create[2].idempotencyKey, withdrawalIdempotencyKey('sub_1', 'ch_1'))
  assert.deepEqual(create[1].metadata, { firebaseUid: 'u1', reason: WITHDRAWAL_REASON, subscriptionId: 'sub_1' })
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.status, 'canceled')
  assert.equal(stored.withdrawal.state, 'done')
  assert.equal(stored.withdrawal.refundId, 're_1')
  assert.equal(stripe.refundedByUs(), 3000)
})

test('on day 0 the whole payment is refunded', async () => {
  const stripe = fakeStripe()
  const out = await run(stripe, fakeDb(userDoc()), userDoc(), START * 1000)
  assert.equal(out.body.refunded, 3000)
  assert.equal(createdRefunds(stripe)[0][1].amount, 3000)
})

test('exactly 14 days in is still inside the window, and the refund is still the full amount', async () => {
  const stripe = fakeStripe()
  const out = await run(stripe, fakeDb(userDoc()), userDoc(), START * 1000 + 14 * DAY)
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 3000)
  assert.equal(createdRefunds(stripe)[0][1].amount, 3000)
})

test('the refund does not depend on how much of the period is left', async () => {
  for (const days of [0, 1, 7, 13.5]) {
    const stripe = fakeStripe()
    const out = await run(stripe, fakeDb(userDoc()), userDoc(), START * 1000 + days * DAY)
    assert.equal(out.body.refunded, 3000, `day ${days}`)
  }
  // A short period gives the same answer as a long one.
  const stripe = fakeStripe({ sub: baseSub({ items: { data: [periodItem(START, START + 7 * 86_400)] } }) })
  const out = await run(stripe, fakeDb(userDoc()), userDoc(), START * 1000 + 7 * DAY - 1000)
  assert.equal(out.body.refunded, 3000)
})

test('a yearly subscription whose trial has ended and been charged refunds that charge in full', async () => {
  const sub = baseSub({ start_date: START - 7 * 86_400, trial_end: START, items: { data: [periodItem(START, START + 365 * 86_400)] } })
  const stripe = fakeStripe({ sub, charge: baseCharge({ amount: 29900, amount_captured: 29900 }) })
  const out = await run(stripe, fakeDb(userDoc()), userDoc(), START * 1000 + 10 * DAY)
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 29900)
  assert.equal(stripe.refundedByUs(), 29900)
})

test('14 days and one second in is refused with a 409 and nothing moves', async () => {
  const stripe = fakeStripe()
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc(), START * 1000 + 14 * DAY + 1000)
  assert.equal(out.status, 409)
  assert.equal(out.body.code, 'withdraw_window_closed')
  assertNoMoneyMoved(stripe, db)
  assert.equal(db.store['users/u1'].subscription.status, 'active', 'a refused request must not touch the stored subscription')
})

test('a subscription that started well before it was created is judged from its start', async () => {
  const stripe = fakeStripe({ sub: baseSub({ start_date: START - 20 * 86_400 }) })
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 409)
  assertNoMoneyMoved(stripe, db)
})

test('a charge that was partly refunded already only gets the rest of what was paid', async () => {
  const stripe = fakeStripe({ charge: baseCharge({ amount_refunded: 500 }) })
  const out = await run(stripe, fakeDb(userDoc()), userDoc())
  assert.equal(out.body.refunded, 2500)
  assert.equal(createdRefunds(stripe)[0][1].amount, 2500)
  assert.equal(stripe.state.charge.amount_refunded, 3000)
})

test('a charge that is refunded in full already is cancelled with no second refund', async () => {
  const stripe = fakeStripe({ charge: baseCharge({ amount_refunded: 3000 }) })
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 0)
  assert.match(out.body.message, /already been refunded in full/)
  assert.deepEqual(createdRefunds(stripe), [])
  assert.equal(names(stripe).includes('subscriptions.cancel'), true)
  assert.equal(marker(db).state, 'done')
})

test('a zero-decimal currency is refunded in whole units, with no x100 or /100 anywhere', async () => {
  const stripe = fakeStripe({ charge: baseCharge({ currency: 'jpy', amount: 1007, amount_captured: 1007 }) })
  const out = await run(stripe, fakeDb(userDoc()), userDoc())
  assert.deepEqual(out.body, { ok: true, refunded: 1007, currency: 'jpy', subscriptionId: 'sub_1' })
  assert.equal(createdRefunds(stripe)[0][1].amount, 1007)
})

test('a trial cancels and refunds 0 without looking for a charge, and says so', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ sub: baseSub({ status: 'trialing' }) })
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 0)
  assert.match(out.body.message, /trial has been cancelled.*nothing to refund/)
  assert.equal(names(stripe).includes('subscriptions.cancel'), true)
  assert.deepEqual(createdRefunds(stripe), [])
  assert.equal(names(stripe).includes('charges.retrieve'), false)
  assert.equal(names(stripe).includes('refunds.list'), false)
  assert.equal(db.store['users/u1'].subscription.status, 'canceled')
})

test('an unpaid subscription has no payment behind it, so it cancels and refunds nothing', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ sub: baseSub({ status: 'unpaid' }), paid: false })
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 0)
  assert.match(out.body.message, /No payment had been taken/)
  assert.equal(names(stripe).includes('subscriptions.cancel'), true)
  assert.deepEqual(createdRefunds(stripe), [])
  assert.equal(db.store['users/u1'].subscription.status, 'canceled')
})

test('a disputed or failed charge is cancelled without a refund', async () => {
  for (const patch of [{ disputed: true }, { status: 'failed' }]) {
    const stripe = fakeStripe({ charge: baseCharge(patch) })
    const out = await run(stripe, fakeDb(userDoc()), userDoc())
    assert.equal(out.body.refunded, 0, JSON.stringify(patch))
    assert.ok(out.body.message, `no explanation for ${JSON.stringify(patch)}`)
    assert.deepEqual(createdRefunds(stripe), [], JSON.stringify(patch))
    assert.equal(names(stripe).includes('subscriptions.cancel'), true, JSON.stringify(patch))
  }
})

// ── refusals: a 4xx and no Stripe write ─────────────────────────────────────

test('an account with no subscription is refused with a 400 and Stripe is not called', async () => {
  const stripe = fakeStripe()
  const db = fakeDb({ stripeCustomerId: 'cus_1' })
  const out = await run(stripe, db, db.store['users/u1'])
  assert.equal(out.status, 400)
  assert.equal(out.body.code, 'no_subscription')
  assert.deepEqual(stripe.calls, [])
  assertNoMoneyMoved(stripe, db)
})

test('a lifetime purchase is refused with a 409 and Stripe is not called', async () => {
  const stripe = fakeStripe()
  const lifetimeDoc = { stripeCustomerId: 'cus_1', lifetimeEntitlement: { active: true } }
  const db = fakeDb(lifetimeDoc)
  const out = await run(stripe, db, lifetimeDoc)
  assert.equal(out.status, 409)
  assert.equal(out.body.code, 'lifetime_not_withdrawable')
  assert.deepEqual(stripe.calls, [])
  assertNoMoneyMoved(stripe, db)
})

test('a subscription that Stripe no longer has is refused with a 400', async () => {
  const stripe = fakeStripe({ retrieveError: Object.assign(new Error('No such subscription'), { code: 'resource_missing' }) })
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 400)
  assert.equal(out.body.code, 'no_subscription')
  assertNoMoneyMoved(stripe, db)
})

test('a subscription already cancelled with no withdrawal under way is refused', async () => {
  const stripe = fakeStripe({ sub: baseSub({ status: 'canceled' }) })
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 409)
  assert.equal(out.body.code, 'already_canceled')
  assertNoMoneyMoved(stripe, db)
})

test('a subscription that belongs to another customer is refused with a 403', async () => {
  const stripe = fakeStripe({ sub: baseSub({ customer: 'cus_other' }) })
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 403)
  assert.equal(out.body.code, 'subscription_mismatch')
  assertNoMoneyMoved(stripe, db)
})

test('a charge that belongs to another customer is never refunded', async () => {
  const stripe = fakeStripe({ charge: baseCharge({ customer: 'cus_other' }) })
  const db = fakeDb(userDoc())
  await assert.rejects(() => run(stripe, db, userDoc()), /does not belong to this customer/)
  assertNoMoneyMoved(stripe, db)
})

// ═════════════════════════════════════════════════════════════════════════════
// 4 · once, however it is repeated or interrupted
// ═════════════════════════════════════════════════════════════════════════════

test('a second call after it finished returns the stored result and never reaches Stripe', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  await run(stripe, db, userDoc())
  const before = stripe.calls.length
  const again = await run(stripe, db, db.store['users/u1'], NOW + 3 * DAY)
  assert.equal(again.status, 200)
  assert.equal(again.body.refunded, 3000)
  assert.equal(stripe.calls.length, before, 'the repeat touched Stripe')
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(stripe.refundedByUs(), 3000)
})

test('a repeat even after the window has closed returns the stored result, not a refusal', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  await run(stripe, db, userDoc())
  const again = await run(stripe, db, db.store['users/u1'], START * 1000 + 40 * DAY)
  assert.equal(again.status, 200)
  assert.equal(again.body.refunded, 3000)
})

test('a failure after the cancel is finished by a retry with the stored amount and one refund', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ failRefundOnce: true })
  await assert.rejects(() => run(stripe, db, userDoc()), /network down/)
  assert.equal(marker(db).state, 'pending')
  assert.equal(marker(db).amount, 3000)
  assert.equal(db.store['users/u1'].subscription.status, 'canceled', 'access should already be gone')
  assert.equal(stripe.state.refunds.length, 0)

  // The retry comes a day later and finishes from the stored marker rather than starting again.
  const retry = await run(stripe, db, db.store['users/u1'], NOW + DAY)
  assert.equal(retry.status, 200)
  assert.equal(retry.body.refunded, 3000)
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(stripe.state.refunds[0].amount, 3000)
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(stripe.calls.filter((c) => c[0] === 'subscriptions.cancel').length, 1, 'the retry cancelled a second time')
  assert.equal(marker(db).state, 'done')
})

test('a retry after the window has closed still finishes the refund it started', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ failRefundOnce: true })
  await assert.rejects(() => run(stripe, db, userDoc(), START * 1000 + 14 * DAY), /network down/)
  const retry = await run(stripe, db, db.store['users/u1'], START * 1000 + 14 * DAY + 5000)
  assert.equal(retry.status, 200)
  assert.equal(retry.body.refunded, 3000)
})

test('a failed cancel pays nothing, and the retry then cancels and refunds once', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ failCancelOnce: true })
  await assert.rejects(() => run(stripe, db, userDoc()), /stripe unreachable/)
  assert.deepEqual(createdRefunds(stripe), [], 'refunded before the subscription was cancelled')
  const retry = await run(stripe, db, db.store['users/u1'], NOW + DAY)
  assert.equal(retry.body.refunded, 3000)
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(db.store['users/u1'].subscription.status, 'canceled')
})

test('a cancel whose reply was lost is recognised as done and the refund goes ahead', async () => {
  const stripe = fakeStripe({ loseCancelResponse: true })
  const out = await run(stripe, fakeDb(userDoc()), userDoc())
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 3000)
  assert.equal(stripe.state.refunds.length, 1)
})

test('a refund made before the marker was closed is adopted, not repeated, even if its idempotency key has expired', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ honourIdempotency: false })
  await run(stripe, db, userDoc())
  // The request died after the refund and before "done" was stored.
  db.store['users/u1'].subscription.withdrawal.state = 'pending'
  delete db.store['users/u1'].subscription.withdrawal.refundId
  const before = createdRefunds(stripe).length
  const retry = await run(stripe, db, db.store['users/u1'])
  assert.equal(retry.body.refunded, 3000)
  assert.equal(createdRefunds(stripe).length, before, 'a second refund was created')
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(marker(db).state, 'done')
})

test('a refund that failed at Stripe is not adopted: a fresh one is made', async () => {
  const db = fakeDb(userDoc({ subscription: {
    id: 'sub_1',
    status: 'active',
    withdrawal: { subscriptionId: 'sub_1', state: 'pending', amount: 3000, charges: [{ id: 'ch_1', amount: 3000 }], currency: 'gbp', refundId: null },
  } }))
  const failed = { id: 're_failed', amount: 3000, status: 'failed', metadata: { reason: WITHDRAWAL_REASON, subscriptionId: 'sub_1' } }
  const stripe = fakeStripe({ refunds: [failed] })
  const out = await run(stripe, db, db.store['users/u1'])
  assert.equal(out.body.refunded, 3000)
  assert.equal(createdRefunds(stripe).length, 1)
  assert.equal(stripe.refundedByUs(), 3000)
})

test('someone else\'s refund on the same charge is not mistaken for ours', async () => {
  const goodwill = { id: 're_goodwill', amount: 500, status: 'succeeded', metadata: { reason: 'goodwill', subscriptionId: 'sub_1' } }
  const stripe = fakeStripe({ refunds: [goodwill], charge: baseCharge({ amount_refunded: 500 }) })
  const out = await run(stripe, fakeDb(userDoc()), userDoc())
  assert.equal(createdRefunds(stripe).length, 1)
  assert.equal(out.body.refunded, 2500)
})

test('the refund never exceeds what the charge has left', async () => {
  // A marker forged larger than the charge can carry is capped at the remainder.
  const forged = userDoc({
    subscription: { id: 'sub_1', status: 'active', withdrawal: { subscriptionId: 'sub_1', state: 'pending', amount: 9999, charges: [{ id: 'ch_1', amount: 9999 }], currency: 'gbp' } },
  })
  const db = fakeDb(forged)
  const stripe = fakeStripe({ charge: baseCharge({ amount_refunded: 2900 }) })
  const out = await run(stripe, db, forged)
  assert.equal(out.body.refunded, 100)
  assert.equal(stripe.state.charge.amount_refunded, 3000)
})

test('a charge with nothing left is not refunded again', async () => {
  const pending = userDoc({
    subscription: { id: 'sub_1', status: 'active', withdrawal: { subscriptionId: 'sub_1', state: 'pending', amount: 3000, charges: [{ id: 'ch_1', amount: 3000 }], currency: 'gbp' } },
  })
  const db = fakeDb(pending)
  const stripe = fakeStripe({ charge: baseCharge({ amount_refunded: 3000 }) })
  const out = await run(stripe, db, pending)
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 0)
  assert.deepEqual(createdRefunds(stripe), [])
  assert.equal(marker(db).state, 'done')
})

test('two requests at once (a double-click) share one marker, one refund and one amount', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  // The second request arrives three days later; it must still land on the first one's marker.
  const [a, b] = await Promise.all([
    run(stripe, db, userDoc(), NOW),
    run(stripe, db, userDoc(), NOW + 3 * DAY),
  ])
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  assert.equal(a.body.refunded, 3000)
  assert.equal(b.body.refunded, 3000)
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(marker(db).amount, 3000)
  assert.equal(marker(db).state, 'done')
})

test('someone who withdrew, resubscribes and withdraws again within 14 days is refunded again', async () => {
  const db = fakeDb(userDoc())
  const first = fakeStripe()
  const one = await run(first, db, userDoc())
  assert.equal(one.body.refunded, 3000)

  // The account now holds a new subscription (the webhook merges it over the old one;
  // the withdrawal marker for sub_1 stays in the document).
  const stored = db.store['users/u1']
  stored.subscription = { ...stored.subscription, id: 'sub_2', status: 'active' }
  const second = fakeStripe({ sub: baseSub({ id: 'sub_2' }) })
  const two = await run(second, db, db.store['users/u1'], NOW + DAY)
  assert.equal(two.status, 200)
  assert.equal(two.body.subscriptionId, 'sub_2')
  assert.equal(two.body.refunded, 3000)
  assert.equal(second.refundedByUs(), 3000)
  assert.equal(createdRefunds(second)[0][2].idempotencyKey, withdrawalIdempotencyKey('sub_2', 'ch_1'))
  assert.notEqual(withdrawalIdempotencyKey('sub_1', 'ch_1'), withdrawalIdempotencyKey('sub_2', 'ch_1'))
  assert.notEqual(withdrawalIdempotencyKey('sub_1', 'ch_1'), withdrawalIdempotencyKey('sub_1', 'ch_2'))
  assert.equal(marker(db).subscriptionId, 'sub_2')
  assert.equal(marker(db).state, 'done')
})

test('the same repeat on the SAME subscription is still answered from the stored result, not paid twice', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  await run(stripe, db, userDoc())
  const again = await run(stripe, db, db.store['users/u1'])
  const third = await run(stripe, db, db.store['users/u1'])
  assert.equal(again.body.refunded, 3000)
  assert.equal(third.body.refunded, 3000)
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(stripe.state.refunds.length, 1)
})

// ═════════════════════════════════════════════════════════════════════════════
// 4b · a payment still going through is never treated as nothing paid
// ═════════════════════════════════════════════════════════════════════════════

const openInvoice = (patch = {}) => ({ id: 'in_1', status: 'open', attempt_count: 1, amount_paid: 0, payments: { data: [] }, ...patch })

test('a payment still going through is refused with a 409 before anything is claimed or cancelled', async () => {
  const cases = {
    'a draft invoice (the hour after a trial ends)': { invoices: [openInvoice({ status: 'draft', attempt_count: 0 })] },
    'an open invoice nobody has tried to charge yet': { invoices: [openInvoice({ attempt_count: 0 })] },
    'an open invoice whose payment is open (a bank debit)': { invoices: [openInvoice({ payments: { data: [{ status: 'open', payment: { type: 'payment_intent', payment_intent: 'pi_1' } }] } })] },
    'a paid invoice whose charge is pending': { invoices: [paidInvoice('in_1', 'ch_1')], charge: baseCharge({ status: 'pending' }) },
  }
  for (const [name, options] of Object.entries(cases)) {
    const stripe = fakeStripe(options)
    const db = fakeDb(userDoc())
    const out = await run(stripe, db, userDoc())
    assert.equal(out.status, 409, name)
    assert.equal(out.body.code, 'payment_processing', name)
    assert.match(out.body.error, /still going through\. Try again in a little while\./, name)
    assertNoMoneyMoved(stripe, db)
    assert.equal(db.store['users/u1'].subscription.status, 'active', `${name}: the stored subscription was touched`)
  }
})

test('a payment that was tried and failed is not "going through": the subscription cancels with nothing to refund', async () => {
  const stripe = fakeStripe({ invoices: [failedInvoice('in_1')] })
  const out = await run(stripe, fakeDb(userDoc()), userDoc())
  assert.equal(out.status, 200)
  assert.equal(out.body.refunded, 0)
  assert.equal(names(stripe).includes('subscriptions.cancel'), true)
})

test('the subscription\'s latest invoice is counted even when the invoice list does not show it', async () => {
  const stripe = fakeStripe({ sub: baseSub({ latest_invoice: 'in_2' }), invoices: [paidInvoice('in_1', 'ch_1')] })
  // in_2 exists at Stripe but was left out of the list
  const hidden = openInvoice({ id: 'in_2', status: 'draft', attempt_count: 0 })
  const listed = stripe.invoices.list
  stripe.invoices.list = async (p) => { await listed(p); stripe.state.invoices.push(hidden); return { data: [paidInvoice('in_1', 'ch_1')], has_more: false } }
  const db = fakeDb(userDoc())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.body.code, 'payment_processing')
  assertNoMoneyMoved(stripe, db)
})

// ═════════════════════════════════════════════════════════════════════════════
// 4c · every charge behind the subscription is refunded, or the request is sent to support
// ═════════════════════════════════════════════════════════════════════════════

const TWO_INVOICES = () => ({
  sub: baseSub({ latest_invoice: 'in_2' }),
  invoices: [paidInvoice('in_1', 'ch_1'), paidInvoice('in_2', null, { amount: 1500, intent: 'pi_2' })],
  extraCharges: { ch_2: baseCharge({ id: 'ch_2', amount: 1500, amount_captured: 1500 }) },
  intents: { pi_2: 'ch_2' },
})

test('a plan change inside 14 days: both invoices\' charges are refunded, each under its own key', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe(TWO_INVOICES())
  const out = await run(stripe, db, userDoc())
  assert.equal(out.status, 200)
  assert.deepEqual(out.body, { ok: true, refunded: 4500, currency: 'gbp', subscriptionId: 'sub_1' })
  const made = createdRefunds(stripe)
  assert.deepEqual(made.map((c) => [c[1].charge, c[1].amount]), [['ch_1', 3000], ['ch_2', 1500]])
  assert.deepEqual(made.map((c) => c[2].idempotencyKey), [withdrawalIdempotencyKey('sub_1', 'ch_1'), withdrawalIdempotencyKey('sub_1', 'ch_2')])
  for (const [, params] of made) {
    assert.deepEqual(params.metadata, { firebaseUid: 'u1', reason: WITHDRAWAL_REASON, subscriptionId: 'sub_1' })
  }
  assert.equal(stripe.refundedByUs(), 4500)
  assert.equal(marker(db).amount, 4500, 'the marker holds the total')
  assert.deepEqual(marker(db).charges, [{ id: 'ch_1', amount: 3000 }, { id: 'ch_2', amount: 1500 }])
  assert.equal(marker(db).state, 'done')
})

test('each charge is capped by what it has left, and one already refunded in full is skipped', async () => {
  const options = TWO_INVOICES()
  options.charge = baseCharge({ amount_refunded: 3000 })
  options.extraCharges.ch_2.amount_refunded = 500
  const stripe = fakeStripe(options)
  const out = await run(stripe, fakeDb(userDoc()), userDoc())
  assert.equal(out.body.refunded, 1000)
  assert.deepEqual(createdRefunds(stripe).map((c) => [c[1].charge, c[1].amount]), [['ch_2', 1000]])
})

test('a failure on the second charge keeps the first refund; the retry adopts it and refunds only the rest', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ ...TWO_INVOICES(), failRefundForCharge: 'ch_2' })
  await assert.rejects(() => run(stripe, db, userDoc()), /network down/)
  assert.equal(marker(db).state, 'pending')
  assert.equal(marker(db).amount, 4500)
  const retry = await run(stripe, db, db.store['users/u1'], NOW + DAY)
  assert.equal(retry.body.refunded, 4500)
  assert.equal(stripe.state.refunds.length, 2, 'a charge was refunded twice')
  assert.equal(stripe.refundedByUs(), 4500)
})

test('a customer holding a credit balance is sent to support before anything is cancelled', async () => {
  for (const balance of [-500, 800]) {
    const stripe = fakeStripe({ ...TWO_INVOICES(), customerBalance: balance })
    const db = fakeDb(userDoc())
    const out = await run(stripe, db, userDoc())
    assert.equal(out.status, 409, `balance ${balance}`)
    assert.equal(out.body.code, 'withdraw_needs_support', `balance ${balance}`)
    assert.match(out.body.error, /contact support/)
    assertNoMoneyMoved(stripe, db)
    assert.equal(db.store['users/u1'].subscription.status, 'active')
  }
})

test('a payment history that cannot be read with confidence is sent to support, not guessed', async (t) => {
  t.mock.method(console, 'error', () => {})
  const cases = {
    'more invoices than one page': { invoicesHasMore: true },
    'a paid invoice with money taken and no charge behind it': { invoices: [{ ...paidInvoice('in_1', 'ch_1'), payments: { data: [] } }] },
    'a paid invoice whose payments were not returned': { invoices: [{ ...paidInvoice('in_1', 'ch_1'), payments: undefined }] },
    'a charge Stripe cannot find': { invoices: [paidInvoice('in_1', 'ch_missing')] },
  }
  for (const [name, options] of Object.entries(cases)) {
    const stripe = fakeStripe(options)
    const db = fakeDb(userDoc())
    const out = await run(stripe, db, userDoc())
    assert.equal(out.status, 409, name)
    assert.equal(out.body.code, 'withdraw_needs_support', name)
    assertNoMoneyMoved(stripe, db)
  }
})

test('a refund that comes back failed is not counted as money returned: no "done", and the retry makes a fresh one', async () => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ refundStatusOnce: 'failed' })
  await assert.rejects(() => run(stripe, db, userDoc()), /did not go through \(failed\)/)
  assert.equal(marker(db).state, 'pending')
  assert.equal(stripe.refundedByUs(), 0)

  const retry = await run(stripe, db, db.store['users/u1'], NOW + DAY)
  assert.equal(retry.body.refunded, 3000)
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(marker(db).state, 'done')
  const keys = createdRefunds(stripe).map((c) => c[2].idempotencyKey)
  assert.equal(new Set(keys).size, 2, 'the retry replayed the failed refund\'s key')
})

// ═════════════════════════════════════════════════════════════════════════════
// 4d · a cancel with no finished refund is finished when Stripe reports the deletion
// ═════════════════════════════════════════════════════════════════════════════

const deletedEvent = () => ({
  id: `evt_deleted_${++eventSeq}`,
  type: 'customer.subscription.deleted',
  created: START + 100,
  data: { object: { id: 'sub_1', customer: 'cus_1', status: 'canceled', created: START, metadata: { firebaseUid: 'u1' } } },
})

test('a subscription deleted with its withdrawal still pending is refunded from the stored amount, once', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ failRefundOnce: true })
  await assert.rejects(() => run(stripe, db, userDoc()), /network down/)
  assert.equal(marker(db).state, 'pending')
  assert.equal(stripe.refundedByUs(), 0)

  assert.equal(await deliver(t, db, deletedEvent(), { stripe }), 'processed')
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(marker(db).state, 'done')
  assert.equal(marker(db).refundedAmount, 3000)
  assert.equal(marker(db).amount, 3000, 'the stored amount, not a recomputed one')
  assert.equal(stripe.calls.filter((c) => c[0] === 'subscriptions.cancel').length, 1)

  // Delivered again (a different event, or Stripe's retry): nothing more is refunded.
  await deliver(t, db, deletedEvent(), { stripe })
  assert.equal(stripe.refundedByUs(), 3000)
  assert.equal(stripe.state.refunds.length, 1)
})

test('the webhook finishes a withdrawal with the refund made but not marked done without refunding again', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ honourIdempotency: false })
  await run(stripe, db, userDoc())
  db.store['users/u1'].subscription.withdrawal.state = 'pending'
  await deliver(t, db, deletedEvent(), { stripe })
  assert.equal(stripe.state.refunds.length, 1)
  assert.equal(marker(db).state, 'done')
})

test('a deleted subscription with no pending withdrawal is left alone', async (t) => {
  const done = fakeDb(userDoc())
  const stripe = fakeStripe()
  await run(stripe, done, userDoc())
  const writes = createdRefunds(stripe).length
  await deliver(t, done, deletedEvent(), { stripe })
  assert.equal(createdRefunds(stripe).length, writes)

  const none = fakeDb(userDoc())
  const idle = fakeStripe()
  await deliver(t, none, deletedEvent(), { stripe: idle })
  assert.deepEqual(idle.calls, [])
  assert.equal(none.store['users/u1'].subscription.status, 'canceled')

  // A pending marker for a different subscription is not this one's to finish.
  const other = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'active', withdrawal: { subscriptionId: 'sub_other', state: 'pending', amount: 3000, charges: [{ id: 'ch_1', amount: 3000 }] } } }))
  const stranger = fakeStripe()
  await deliver(t, other, deletedEvent(), { stripe: stranger })
  assert.deepEqual(createdRefunds(stranger), [])
})

test('when the webhook cannot finish the refund either, it logs the account and subscription and fails so Stripe redelivers', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ failRefundOnce: true })
  await assert.rejects(() => run(stripe, db, userDoc()), /network down/)
  // The webhook's own refund attempt also fails (a second outage).
  stripe.refunds.create = async () => { throw new Error('still down') }
  const errors = []
  await assert.rejects(() => deliver(t, db, deletedEvent(), { stripe, errors }), /still down/)
  const logged = errors.find((args) => /NOT refunded/.test(String(args[0])))
  assert.ok(logged, 'no error was logged')
  assert.equal(logged[1].uid, 'u1')
  assert.equal(logged[1].subscriptionId, 'sub_1')
  assert.equal(marker(db).state, 'pending')
})

// ═════════════════════════════════════════════════════════════════════════════
// 5 · POST /api/create-portal
// ═════════════════════════════════════════════════════════════════════════════

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_unit_placeholder'

const RESOURCE_METHODS = [
  ['customers', 'retrieve'],
  ['subscriptions', 'retrieve'],
  ['subscriptions', 'cancel'],
  ['invoices', 'retrieve'],
  ['invoices', 'list'],
  ['paymentIntents', 'retrieve'],
  ['charges', 'retrieve'],
  ['refunds', 'list'],
  ['refunds', 'create'],
]

/** Point the real handler at a fake Stripe and a fake Firestore, with the clock pinned. */
function installHandlerFakes(t, { stripe, db, uid = 'u1' }) {
  t.mock.timers.enable({ apis: ['Date'], now: NOW })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'warn', () => {})
  const client = getStripeServer()
  for (const [resource, method] of RESOURCE_METHODS) {
    t.mock.method(client[resource], method, (...args) => stripe[resource][method](...args))
  }
  t.mock.method(client.billingPortal.sessions, 'create', (...args) => stripe.billingPortal.sessions.create(...args))
  const verify = t.mock.method(adminAuth(), 'verifyIdToken', async () => ({ uid }))
  const firestore = adminDb()
  t.mock.method(firestore, 'collection', (name) => db.collection(name))
  t.mock.method(firestore, 'runTransaction', (fn) => db.runTransaction(fn))
  return { verify }
}

function mockRes() {
  return {
    headers: {},
    code: null,
    body: null,
    setHeader(k, v) { this.headers[k] = v },
    status(c) { this.code = c; return this },
    json(b) { this.body = b; return this },
    end() { return this },
  }
}

const post = (body, headers = { authorization: 'Bearer test-token' }) => ({ method: 'POST', headers, body })

test('the handler withdraws for the signed-in owner and answers with the refund', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }), res)
  assert.equal(res.code, 200)
  assert.deepEqual(res.body, { ok: true, refunded: 3000, currency: 'gbp', subscriptionId: 'sub_1' })
  assert.equal(names(stripe).includes('billingPortal.sessions.create'), false)
  assert.equal(stripe.state.refunds.length, 1)
})

test('the handler answers a second withdraw with the stored result and no Stripe write', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  installHandlerFakes(t, { stripe, db })
  await portalHandler(post({ action: 'withdraw' }), mockRes())
  const writes = stripe.calls.filter((c) => STRIPE_WRITES.includes(c[0])).length
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }), res)
  assert.equal(res.code, 200)
  assert.equal(res.body.refunded, 3000)
  assert.equal(stripe.calls.filter((c) => STRIPE_WRITES.includes(c[0])).length, writes)
  assert.equal(stripe.refundedByUs(), 3000)
})

test('a failure inside the withdrawal is a generic 500, and the retry completes it once', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ failRefundOnce: true })
  installHandlerFakes(t, { stripe, db })
  const failed = mockRes()
  await portalHandler(post({ action: 'withdraw' }), failed)
  assert.equal(failed.code, 500)
  assert.match(failed.body.error, /safe to try again/)
  assert.equal(JSON.stringify(failed.body).includes('network down'), false, 'the raw error reached the browser')
  const retry = mockRes()
  await portalHandler(post({ action: 'withdraw' }), retry)
  assert.equal(retry.code, 200)
  assert.equal(retry.body.refunded, 3000)
  assert.equal(stripe.refundedByUs(), 3000)
})

test('the handler refuses a withdraw outside the window with a 409 and no Stripe write', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ sub: baseSub({ start_date: START - 20 * 86_400 }) })
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }), res)
  assert.equal(res.code, 409)
  assert.equal(res.body.code, 'withdraw_window_closed')
  assertNoMoneyMoved(stripe, db)
})

test('a Stripe customer that is not this user\'s gets a 403 before any withdraw code runs', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ customerUid: 'someone_else' })
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }), res)
  assert.equal(res.code, 403)
  assert.equal(names(stripe).includes('subscriptions.retrieve'), false)
  assertNoMoneyMoved(stripe, db)
})

test('a withdraw with no Stripe customer on the account is a 4xx and Stripe is not called', async (t) => {
  const stripe = fakeStripe()

  const none = fakeDb({})
  installHandlerFakes(t, { stripe, db: none })
  const resNone = mockRes()
  await portalHandler(post({ action: 'withdraw' }), resNone)
  assert.equal(resNone.code, 400)
  assert.equal(resNone.body.code, 'no_subscription')

  const lifetime = fakeDb({ lifetimeEntitlement: { active: true } })
  t.mock.method(adminDb(), 'collection', (name) => lifetime.collection(name))
  const resLife = mockRes()
  await portalHandler(post({ action: 'withdraw' }), resLife)
  assert.equal(resLife.code, 409)
  assert.equal(resLife.body.code, 'lifetime_not_withdrawable')

  assert.deepEqual(stripe.calls, [])
})

test('a withdraw without a sign-in token is a 401 and touches nothing', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }, {}), res)
  assert.equal(res.code, 401)
  assert.deepEqual(stripe.calls, [])
})

test('a withdraw checks the sign-in token for revocation; the portal path is verified exactly as before', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  const { verify } = installHandlerFakes(t, { stripe, db })
  await portalHandler(post({ action: 'withdraw' }), mockRes())
  await portalHandler(post({}), mockRes())
  await portalHandler(post({ flow: 'cancel' }), mockRes())
  const args = verify.mock.calls.map((c) => c.arguments)
  assert.deepEqual(args[0], ['test-token', true])
  assert.deepEqual(args[1], ['test-token'])
  assert.deepEqual(args[2], ['test-token'])
})

test('a withdraw with a revoked token is a 401 and touches nothing', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  const { verify } = installHandlerFakes(t, { stripe, db })
  verify.mock.mockImplementation(async (token, checkRevoked) => {
    if (checkRevoked) throw new Error('The user\'s credential has been revoked')
    return { uid: 'u1' }
  })
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }), res)
  assert.equal(res.code, 401)
  assert.deepEqual(stripe.calls, [])
  assert.equal(marker(db), undefined)
})

test('the handler answers a payment still going through with a 409 and no Stripe write', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe({ invoices: [openInvoice({ status: 'draft', attempt_count: 0 })] })
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ action: 'withdraw' }), res)
  assert.equal(res.code, 409)
  assert.equal(res.body.code, 'payment_processing')
  assertNoMoneyMoved(stripe, db)
})

test('with no action the handler still opens the billing portal and cancels or refunds nothing', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({}), res)
  assert.equal(res.code, 200)
  assert.deepEqual(res.body, { url: 'https://portal.example/session' })
  const [, params] = stripe.calls.find((c) => c[0] === 'billingPortal.sessions.create')
  assert.equal(params.customer, 'cus_1')
  assert.match(params.return_url, /\/settings$/)
  assert.equal('flow_data' in params, false)
  assert.deepEqual(stripe.calls.filter((c) => STRIPE_WRITES.includes(c[0])), [])
  assert.equal(names(stripe).includes('subscriptions.retrieve'), false)
  assert.equal(marker(db), undefined)
})

test('with the cancel flow and no action the portal deep-links to the subscription as before', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ flow: 'cancel' }), res)
  assert.equal(res.code, 200)
  const [, params] = stripe.calls.find((c) => c[0] === 'billingPortal.sessions.create')
  assert.equal(params.flow_data.type, 'subscription_cancel')
  assert.equal(params.flow_data.subscription_cancel.subscription, 'sub_1')
  assert.deepEqual(stripe.calls.filter((c) => STRIPE_WRITES.includes(c[0])), [])
})

test('an unrecognised action is treated as the plain portal, never as a withdrawal', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  installHandlerFakes(t, { stripe, db })
  const res = mockRes()
  await portalHandler(post({ action: 'Withdraw ' }), res)
  assert.equal(res.code, 200)
  assert.equal(res.body.url, 'https://portal.example/session')
  assert.deepEqual(stripe.calls.filter((c) => STRIPE_WRITES.includes(c[0])), [])
})

// ═════════════════════════════════════════════════════════════════════════════
// 6 · webhook: a withdrawal's refund must not stamp the sticky revocation
// ═════════════════════════════════════════════════════════════════════════════

// `refunds` is what Stripe lists on the refunded charge: the webhook reads our
// stamp off these, not off anything stored on the user document.
function webhookStripe({ refunds = [] } = {}) {
  return {
    refunds: { list: async () => ({ data: structuredClone(refunds) }) },
    paymentIntents: { retrieve: async () => ({ metadata: { firebaseUid: 'u1' } }) },
    invoicePayments: { list: async () => ({ data: [{ invoice: 'in_1' }] }) },
    invoices: { retrieve: async () => ({ parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } } }) },
    subscriptions: { retrieve: async () => ({ id: 'sub_1', customer: 'cus_1', status: 'canceled', metadata: { firebaseUid: 'u1' } }) },
  }
}

const chargeObject = (amountRefunded) => ({ id: 'ch_1', payment_intent: 'pi_1', customer: 'cus_1', amount: 3000, amount_refunded: amountRefunded })
let eventSeq = 0
const refundEvent = (amountRefunded) => ({ id: `evt_refund_${++eventSeq}`, type: 'charge.refunded', created: START, data: { object: chargeObject(amountRefunded) } })
const disputeEvent = () => ({
  id: `evt_dispute_${++eventSeq}`,
  type: 'charge.dispute.created',
  created: START,
  data: { object: { id: 'dp_1', payment_intent: 'pi_1', charge: 'ch_1' } },
})

function deliver(t, db, event, { stripe = webhookStripe(), errors = null } = {}) {
  t.mock.method(console, 'error', (...args) => { errors?.push(args) })
  t.mock.method(console, 'warn', () => {})
  const firestore = adminDb()
  t.mock.method(firestore, 'collection', (name) => db.collection(name))
  t.mock.method(firestore, 'runTransaction', (fn) => db.runTransaction(fn))
  return processStripeEvent(event, { db, stripe, now: NOW })
}

test('the full refund of a day-0 withdrawal does not revoke access', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  const out = await run(stripe, db, userDoc(), START * 1000)
  assert.equal(out.body.refunded, 3000)
  assert.equal(await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: stripe.state.refunds }) }), 'processed')
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.accessRevoked, undefined, 'a withdrawn customer was marked as revoked')
  assert.equal(stored.accessRevokedReason, undefined)
  assert.equal(stored.status, 'canceled')
  assert.equal(stored.withdrawal.state, 'done')
})

test('a normal full refund of a subscription still revokes access', async (t) => {
  const db = fakeDb(userDoc())
  assert.equal(await deliver(t, db, refundEvent(3000)), 'processed')
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.accessRevoked, true)
  assert.equal(stored.accessRevokedReason, 'full_refund')
  assert.equal(stored.accessRevokedSubscriptionId, 'sub_1')
})

test('a withdrawal refund stamped for another subscription does not exempt this one from a full refund', async (t) => {
  const db = fakeDb(userDoc())
  const other = { id: 're_other', charge: 'ch_1', amount: 3000, status: 'succeeded', metadata: { reason: WITHDRAWAL_REASON, subscriptionId: 'sub_old' } }
  await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: [other] }) })
  assert.equal(db.store['users/u1'].subscription.accessRevoked, true)
})

test('a full refund naming this subscription but made for another reason does not exempt it from revocation', async (t) => {
  const db = fakeDb(userDoc())
  const otherReason = { id: 're_reason', charge: 'ch_1', amount: 3000, status: 'succeeded', metadata: { reason: 'support_goodwill', subscriptionId: 'sub_1' } }
  await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: [otherReason] }) })
  assert.equal(db.store['users/u1'].subscription.accessRevoked, true)
})

test('a hand-made full refund still revokes even when the document carries a withdrawal marker for the subscription', async (t) => {
  const db = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'active', withdrawal: { subscriptionId: 'sub_1', state: 'done' } } }))
  const byHand = { id: 're_hand', charge: 'ch_1', amount: 3000, status: 'succeeded', metadata: {} }
  await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: [byHand] }) })
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.accessRevoked, true)
  assert.equal(stored.accessRevokedReason, 'full_refund')
})

test('a withdrawal refund that failed at Stripe does not exempt a full refund', async (t) => {
  const db = fakeDb(userDoc())
  const failed = { id: 're_failed', charge: 'ch_1', amount: 3000, status: 'failed', metadata: { reason: WITHDRAWAL_REASON, subscriptionId: 'sub_1' } }
  await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: [failed] }) })
  assert.equal(db.store['users/u1'].subscription.accessRevoked, true)
})

test('withdraw A, resubscribe, withdraw B: a late refund event for A is still recognised as ours', async (t) => {
  const db = fakeDb(userDoc())
  const first = fakeStripe()
  assert.equal((await run(first, db, userDoc(), START * 1000)).body.refunded, 3000)

  // The account moves on to sub_2 and withdraws that too, which overwrites the one marker slot.
  const stored = db.store['users/u1']
  stored.subscription = { ...stored.subscription, id: 'sub_2', status: 'active' }
  const second = fakeStripe({ sub: baseSub({ id: 'sub_2' }) })
  assert.equal((await run(second, db, db.store['users/u1'], START * 1000 + DAY)).body.refunded, 3000)
  assert.equal(marker(db).subscriptionId, 'sub_2', 'the marker no longer names sub_1')

  // Now sub_1's refund event arrives late. It carries sub_1's stamp, so it must not revoke.
  assert.equal(await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: first.state.refunds }) }), 'processed')
  const after = db.store['users/u1'].subscription
  assert.equal(after.accessRevoked, undefined, 'a late event for an earlier withdrawal revoked access')

  // And a third subscription gets Pro.
  const third = { id: 'sub_3', customer: 'cus_1', status: 'active', created: START + 30 * 86_400, metadata: { firebaseUid: 'u1' } }
  await writeSubscription('u1', third, db, null, START + 30 * 86_400)
  assert.equal(planForSubscription(db.store['users/u1'].subscription).id, 'pro')
})

test('a dispute on a withdrawn subscription still revokes access', async (t) => {
  const db = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'canceled', withdrawal: { subscriptionId: 'sub_1', state: 'done' } } }))
  assert.equal(await deliver(t, db, disputeEvent()), 'processed')
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.accessRevoked, true)
  assert.equal(stored.accessRevokedReason, 'dispute_created')
})

test('a partial refund of a subscription changes nothing', async (t) => {
  const db = fakeDb(userDoc())
  await deliver(t, db, refundEvent(2800))
  assert.equal(db.store['users/u1'].subscription.accessRevoked, undefined)
})

test('after a withdrawal refund, a later subscription gets Pro: nothing sticky was left behind', async (t) => {
  const db = fakeDb(userDoc())
  const stripe = fakeStripe()
  await run(stripe, db, userDoc(), START * 1000)
  assert.equal(await deliver(t, db, refundEvent(3000), { stripe: webhookStripe({ refunds: stripe.state.refunds }) }), 'processed')

  const resubscribed = { id: 'sub_2', customer: 'cus_1', status: 'active', created: START + 20 * 86_400, metadata: { firebaseUid: 'u1' } }
  await writeSubscription('u1', resubscribed, db, null, START + 20 * 86_400)
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.id, 'sub_2')
  assert.equal(stored.accessRevoked, undefined)
  assert.equal(planForSubscription(stored).id, 'pro')
})

// The other way a full refund reaches the document: a subscription event whose
// charge check finds the charge refunded. A late `updated` for a subscription the
// withdrawal has already ended is exactly that.
function lateUpdateStripe(refunds = []) {
  const charge = { id: 'ch_1', amount: 3000, amount_refunded: 3000, refunded: true, disputed: false, payment_intent: 'pi_1' }
  return {
    refunds: { list: async () => ({ data: structuredClone(refunds) }) },
    invoices: { retrieve: async (id) => ({ id, payments: { data: [{ is_default: true, payment: { payment_intent: 'pi_1' } }] } }) },
    paymentIntents: { retrieve: async () => ({ id: 'pi_1', latest_charge: charge }) },
  }
}
const lateUpdate = { id: 'sub_1', customer: 'cus_1', status: 'active', created: START, latest_invoice: 'in_1', metadata: { firebaseUid: 'u1' } }

const ourRefund = (subscriptionId) => ({ id: 're_ours', charge: 'ch_1', amount: 3000, status: 'succeeded', metadata: { reason: WITHDRAWAL_REASON, subscriptionId } })

test('a late subscription update for a withdrawn subscription does not stamp a revocation', async (t) => {
  const db = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'canceled', withdrawal: { subscriptionId: 'sub_1', state: 'done' } } }))
  t.mock.method(console, 'warn', () => {})
  await writeSubscription('u1', lateUpdate, db, lateUpdateStripe([ourRefund('sub_1')]), START + 10)
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.accessRevoked, undefined, 'a withdrawn customer was marked as revoked')
  assert.equal(stored.status, 'canceled', 'the cancelled state must stand')
})

test('a late subscription update is still exempt after a later withdrawal has rewritten the marker', async (t) => {
  const db = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'canceled', withdrawal: { subscriptionId: 'sub_2', state: 'done' } } }))
  t.mock.method(console, 'warn', () => {})
  await writeSubscription('u1', lateUpdate, db, lateUpdateStripe([ourRefund('sub_1')]), START + 10)
  assert.equal(db.store['users/u1'].subscription.accessRevoked, undefined)
})

test('a late update on a subscription whose charge was refunded by hand still stamps, marker or not', async (t) => {
  const db = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'canceled', withdrawal: { subscriptionId: 'sub_1', state: 'done' } } }))
  t.mock.method(console, 'warn', () => {})
  await writeSubscription('u1', lateUpdate, db, lateUpdateStripe([{ id: 're_hand', charge: 'ch_1', amount: 3000, status: 'succeeded', metadata: {} }]), START + 10)
  assert.equal(db.store['users/u1'].subscription.accessRevoked, true)
})

test('the same late update on a subscription that was NOT withdrawn still stamps the revocation', async (t) => {
  const db = fakeDb(userDoc({ subscription: { id: 'sub_1', status: 'active' } }))
  t.mock.method(console, 'warn', () => {})
  await writeSubscription('u1', lateUpdate, db, lateUpdateStripe(), START + 10)
  const stored = db.store['users/u1'].subscription
  assert.equal(stored.accessRevoked, true)
  assert.equal(stored.accessRevokedReason, 'full_refund')
})
