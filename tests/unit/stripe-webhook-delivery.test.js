// Stripe webhook delivery: each event is handled once, and an older
// subscription event never overwrites newer stored state.
//
// Stripe retries failed deliveries, can send one event twice, and does not
// guarantee order. These tests drive the real code paths (processStripeEvent,
// writeSubscription, writeSubscriptionForEvent) against an in-memory Firestore
// double that supports transactions. No network, no Stripe client.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import {
  EVENT_CLAIM_LEASE_MS,
  EVENT_RECORD_TTL_MS,
  STRIPE_EVENTS_COLLECTION,
  subscriptionWriteDecision,
  writeSubscriptionDoc,
  writeSubscriptionForEvent,
} from '../../api/_lib/billing.js'
import { planForSubscription } from '../../api/_lib/plans.js'
import { flagPaymentFailed, processStripeEvent, writeSubscription } from '../../api/stripe-webhook.js'

const DAY = 86_400_000
const PERIOD_END = Math.floor((Date.now() + 25 * DAY) / 1000)
const NOW = 1_800_000_000_000

// ── An in-memory Firestore with merge writes and transactions ───────────────
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
}

function deepMerge(target, source) {
  const out = { ...target }
  for (const [key, value] of Object.entries(source)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : structuredClone(value)
  }
  return out
}

function memoryDb(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([path, data]) => [path, structuredClone(data)]))
  const write = (path, data, opts) => {
    docs.set(path, opts?.merge ? deepMerge(docs.get(path) || {}, data) : structuredClone(data))
  }
  const snapshot = (path) => {
    const data = docs.get(path)
    return { exists: data !== undefined, data: () => (data === undefined ? undefined : structuredClone(data)) }
  }
  const ref = (path) => ({
    path,
    get: async () => snapshot(path),
    set: async (data, opts) => write(path, data, opts),
    delete: async () => { docs.delete(path) },
  })
  return {
    docs,
    doc: (path) => docs.get(path),
    collection: (name) => ({
      doc: (id) => ref(`${name}/${id}`),
      // Equality queries only, enough for the customer-id lookup.
      where: (field, _op, value) => ({
        limit: (n) => ({
          get: async () => {
            const hits = [...docs].filter(([path, data]) => path.startsWith(`${name}/`) && data?.[field] === value).slice(0, n)
            return { empty: !hits.length, size: hits.length, docs: hits.map(([path]) => ({ id: path.slice(name.length + 1) })) }
          },
        }),
      }),
    }),
    async runTransaction(fn) {
      const pending = []
      const tx = {
        get: async (r) => snapshot(r.path),
        set: (r, data, opts) => { pending.push(() => write(r.path, data, opts)) },
        delete: (r) => { pending.push(() => docs.delete(r.path)) },
      }
      const result = await fn(tx)
      for (const apply of pending) apply()
      return result
    },
  }
}

const quiet = (t) => {
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'error', () => {})
}

const event = (overrides = {}) => ({
  id: 'evt_1',
  type: 'customer.subscription.updated',
  created: 1_700_000_100,
  data: { object: {} },
  ...overrides,
})

const subscription = (overrides = {}) => ({
  id: 'sub_1',
  status: 'active',
  customer: 'cus_1',
  cancel_at_period_end: false,
  trial_end: null,
  metadata: { firebaseUid: 'uid_1' },
  items: { data: [{ current_period_end: PERIOD_END, price: { id: 'price_1', recurring: { interval: 'month', interval_count: 1 } } }] },
  ...overrides,
})

const storedSubscription = (db) => db.doc('users/uid_1')?.subscription

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The same event delivered twice is handled once
// ─────────────────────────────────────────────────────────────────────────────
test('a first delivery is dispatched once and recorded as done', async () => {
  const db = memoryDb()
  const calls = []
  const outcome = await processStripeEvent(event(), { db, stripe: {}, now: NOW, dispatch: async (_s, e) => { calls.push(e.id) } })

  assert.equal(outcome, 'processed')
  assert.deepEqual(calls, ['evt_1'])
  const record = db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_1`)
  assert.equal(record.status, 'done')
  assert.equal(record.type, 'customer.subscription.updated')
  assert.equal(record.created, 1_700_000_100)
  assert.ok(record.expiresAt instanceof Date, 'the record needs a Date for a TTL policy to expire it')
  assert.equal(record.expiresAt.getTime(), NOW + EVENT_RECORD_TTL_MS)
})

test('a replayed event is acknowledged without being handled again', async () => {
  const db = memoryDb()
  let calls = 0
  const dispatch = async () => { calls += 1 }

  assert.equal(await processStripeEvent(event(), { db, stripe: {}, now: NOW, dispatch }), 'processed')
  assert.equal(await processStripeEvent(event(), { db, stripe: {}, now: NOW + 60_000, dispatch }), 'duplicate')
  assert.equal(await processStripeEvent(event(), { db, stripe: {}, now: NOW + 3 * DAY, dispatch }), 'duplicate')
  assert.equal(calls, 1, 'a replay ran the handler again')

  // Positive control: a different event id on the same database is handled.
  assert.equal(await processStripeEvent(event({ id: 'evt_2' }), { db, stripe: {}, now: NOW, dispatch }), 'processed')
  assert.equal(calls, 2)
})

test('a replayed subscription event does not rewrite the account', async (t) => {
  // End to end through the real writer: the replay would otherwise re-stamp
  // updatedAt and re-apply a payload Stripe has since moved past.
  quiet(t)
  const db = memoryDb()
  const sub = subscription()
  const dispatch = (_s, e) => writeSubscription('uid_1', e.data.object, db, null, e.created)
  const delivery = event({ data: { object: sub } })

  await processStripeEvent(delivery, { db, stripe: {}, now: NOW, dispatch })
  const first = structuredClone(storedSubscription(db))
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(await processStripeEvent(delivery, { db, stripe: {}, now: NOW + 1000, dispatch }), 'duplicate')
  assert.deepEqual(storedSubscription(db), first)
})

test('a delivery that arrives while the same event is in flight is refused, so Stripe retries it', async () => {
  const db = memoryDb({
    [`${STRIPE_EVENTS_COLLECTION}/evt_1`]: { status: 'processing', claimedAt: NOW - 60_000 },
  })
  let calls = 0
  const outcome = await processStripeEvent(event(), { db, stripe: {}, now: NOW, dispatch: async () => { calls += 1 } })
  assert.equal(outcome, 'in_progress')
  assert.equal(calls, 0)
})

test('a claim older than the lease is taken over, so a stopped function cannot strand an event', async () => {
  const db = memoryDb({
    [`${STRIPE_EVENTS_COLLECTION}/evt_1`]: { status: 'processing', claimedAt: NOW - EVENT_CLAIM_LEASE_MS - 1 },
  })
  let calls = 0
  const outcome = await processStripeEvent(event(), { db, stripe: {}, now: NOW, dispatch: async () => { calls += 1 } })
  assert.equal(outcome, 'processed')
  assert.equal(calls, 1)
  assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_1`).status, 'done')
})

test('a failed dispatch releases its claim, so the retry is handled', async () => {
  const db = memoryDb()
  await assert.rejects(
    processStripeEvent(event(), { db, stripe: {}, now: NOW, dispatch: async () => { throw new Error('firestore blip') } }),
    /firestore blip/,
  )
  assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_1`), undefined, 'a failed event stayed claimed')

  let calls = 0
  const retry = await processStripeEvent(event(), { db, stripe: {}, now: NOW + 60_000, dispatch: async () => { calls += 1 } })
  assert.equal(retry, 'processed')
  assert.equal(calls, 1)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · An older subscription event never overwrites newer state
// ─────────────────────────────────────────────────────────────────────────────
test('an older update arriving after a newer one is skipped', async (t) => {
  quiet(t)
  const db = memoryDb()
  await writeSubscription('uid_1', subscription({ status: 'active' }), db, null, 200)
  await writeSubscription('uid_1', subscription({ status: 'past_due' }), db, null, 100)

  assert.equal(storedSubscription(db).status, 'active')
  assert.equal(storedSubscription(db).stripeEventCreated, 200)

  // Positive control: the same payload with a NEWER created time is applied.
  await writeSubscription('uid_1', subscription({ status: 'past_due' }), db, null, 300)
  assert.equal(storedSubscription(db).status, 'past_due')
  assert.equal(storedSubscription(db).stripeEventCreated, 300)
})

test('a stale active update cannot bring back a deleted subscription, even at the same second', async (t) => {
  quiet(t)
  for (const staleCreated of [250, 300]) {
    const db = memoryDb()
    await writeSubscription('uid_1', subscription({ status: 'active' }), db, null, 200)
    await writeSubscription('uid_1', subscription({ status: 'canceled' }), db, null, 300)
    await writeSubscription('uid_1', subscription({ status: 'active' }), db, null, staleCreated)

    assert.equal(storedSubscription(db).status, 'canceled', `an active delivery created at ${staleCreated} undid a deletion`)
    assert.equal(planForSubscription(storedSubscription(db)).id, 'free')
  }
})

test('a creation event arriving after the subscription became active is skipped', async (t) => {
  // subscription.created (incomplete) and subscription.updated (active) are
  // often created in the same second, so only the lifecycle can order them.
  quiet(t)
  const db = memoryDb()
  await writeSubscription('uid_1', subscription({ status: 'active' }), db, null, 500)
  await writeSubscription('uid_1', subscription({ status: 'incomplete' }), db, null, 500)

  assert.equal(storedSubscription(db).status, 'active')
  assert.equal(planForSubscription(storedSubscription(db)).id, 'pro')

  // Positive control: in delivery order, incomplete then active is applied.
  const ordered = memoryDb()
  await writeSubscription('uid_1', subscription({ status: 'incomplete' }), ordered, null, 500)
  await writeSubscription('uid_1', subscription({ status: 'active' }), ordered, null, 500)
  assert.equal(storedSubscription(ordered).status, 'active')
})

test('an ended subscription cannot end a different, live one', async (t) => {
  quiet(t)
  const db = memoryDb()
  await writeSubscription('uid_1', subscription({ id: 'sub_2', status: 'active' }), db, null, 400)
  await writeSubscription('uid_1', subscription({ id: 'sub_1', status: 'canceled' }), db, null, 450)

  assert.equal(storedSubscription(db).id, 'sub_2')
  assert.equal(storedSubscription(db).status, 'active')
})

test('a resubscription replaces an ended one even when its event is older', async (t) => {
  // Paying customers are never held on Free by an older record: sub_2 was
  // created after sub_1, so it is the newer subscription whatever its event time.
  quiet(t)
  const db = memoryDb()
  await writeSubscription('uid_1', subscription({ id: 'sub_1', created: 100, status: 'canceled' }), db, null, 500)
  await writeSubscription('uid_1', subscription({ id: 'sub_2', created: 400, status: 'active' }), db, null, 450)

  assert.equal(storedSubscription(db).id, 'sub_2')
  assert.equal(storedSubscription(db).subscriptionCreated, 400)
  assert.equal(planForSubscription(storedSubscription(db)).id, 'pro')
})

test('a delayed event for an older subscription does not replace a newer stored one', async (t) => {
  quiet(t)
  for (const storedStatus of ['active', 'past_due']) {
    const db = memoryDb()
    await writeSubscription('uid_1', subscription({ id: 'sub_2', created: 400, status: storedStatus }), db, null, 450)
    // sub_1 predates sub_2, and so does this retried event from while it was live.
    const decision = await writeSubscriptionForEvent(db, 'uid_1', subscription({ id: 'sub_1', created: 100, status: 'active' }), 300, NOW)

    assert.deepEqual(decision, { write: false, reason: 'older_subscription' }, `stored ${storedStatus}`)
    assert.equal(storedSubscription(db).id, 'sub_2', `an old sub_1 event replaced a stored ${storedStatus} sub_2`)
    assert.equal(storedSubscription(db).status, storedStatus)
  }
})

test('a subscription written without an event is not replaced by an older one\'s delayed event', async () => {
  // A write with no event (checkout-status) keeps the previous subscription's
  // stored event time, so that time alone cannot order the two subscriptions.
  const db = memoryDb()
  await writeSubscriptionForEvent(db, 'uid_1', subscription({ id: 'sub_1', created: 100, status: 'active' }), 300, NOW)
  await writeSubscriptionDoc(db, 'uid_1', subscription({ id: 'sub_2', created: 400, status: 'active' }), NOW)
  const decision = await writeSubscriptionForEvent(db, 'uid_1', subscription({ id: 'sub_1', created: 100, status: 'active' }), 320, NOW)

  assert.equal(decision.write, false)
  assert.equal(storedSubscription(db).id, 'sub_2')
})

test('a skipped delivery still keeps a revocation read from the current charge', async () => {
  const db = memoryDb()
  await writeSubscriptionForEvent(db, 'uid_1', subscription({ status: 'canceled' }), 300, NOW)
  const stamp = { accessRevoked: true, accessRevokedReason: 'charge_disputed', accessRevokedSubscriptionId: 'sub_1', updatedAt: NOW }
  const decision = await writeSubscriptionForEvent(db, 'uid_1', subscription({ status: 'active' }), 200, NOW, stamp)

  assert.equal(decision.write, false)
  assert.equal(storedSubscription(db).status, 'canceled')
  assert.equal(storedSubscription(db).accessRevoked, true)
})

test('the ordering decision, case by case', () => {
  const stored = { id: 'sub_1', status: 'active', stripeEventCreated: 200 }
  const cases = [
    [null, subscription(), 100, true, 'nothing_stored'],
    [stored, subscription(), 100, false, 'older_than_stored_event'],
    [stored, subscription(), 200, true, 'current'],
    [stored, subscription(), 201, true, 'current'],
    [stored, subscription({ status: 'canceled' }), 201, true, 'current'],
    [{ ...stored, status: 'canceled' }, subscription({ status: 'active' }), 999, false, 'subscription_already_ended'],
    [{ ...stored, status: 'incomplete_expired' }, subscription({ status: 'incomplete' }), 999, false, 'subscription_already_ended'],
    [{ ...stored, status: 'canceled' }, subscription({ status: 'canceled' }), 201, true, 'current'],
    [stored, subscription({ status: 'incomplete' }), 999, false, 'subscription_already_started'],
    [{ ...stored, status: 'incomplete' }, subscription({ status: 'incomplete_expired' }), 201, true, 'current'],
    [{ ...stored, id: 'sub_2' }, subscription({ status: 'canceled' }), 999, false, 'another_subscription_grants_access'],
    // A different subscription replaces the stored one only if it was created
    // later, or its event is newer than the stored event.
    [{ ...stored, id: 'sub_2', status: 'canceled', subscriptionCreated: 50 }, subscription({ created: 60, status: 'active' }), 1, true, 'different_subscription'],
    [{ ...stored, id: 'sub_2', status: 'canceled', subscriptionCreated: 50 }, subscription({ created: 40, status: 'active' }), 201, true, 'different_subscription'],
    [{ ...stored, id: 'sub_2', status: 'canceled', subscriptionCreated: 50 }, subscription({ created: 40, status: 'active' }), 200, false, 'older_subscription'],
    [{ ...stored, id: 'sub_2', subscriptionCreated: 50 }, subscription({ created: 40, status: 'active' }), 100, false, 'older_subscription'],
    // The stored event time may be the previous subscription's (a write made
    // without an event keeps it): an event from before the stored subscription
    // was created is not newer than it.
    [{ ...stored, id: 'sub_2', subscriptionCreated: 400 }, subscription({ created: 40, status: 'active' }), 320, false, 'older_subscription'],
    [{ ...stored, id: 'sub_2', subscriptionCreated: 400 }, subscription({ created: 40, status: 'active' }), 401, true, 'different_subscription'],
    // With no times to compare, a different subscription is written as before.
    [{ id: 'sub_2', status: 'canceled' }, subscription({ status: 'active' }), 1, true, 'different_subscription'],
    // A document with no stored time: the
    // lifecycle rules still apply, and the time comparison is simply skipped.
    [{ id: 'sub_1', status: 'active' }, subscription({ status: 'past_due' }), 100, true, 'current'],
  ]
  for (const [storedDoc, sub, created, write, reason] of cases) {
    assert.deepEqual(subscriptionWriteDecision(storedDoc, sub, created), { write, reason },
      `stored ${JSON.stringify(storedDoc)} ← ${sub.id}/${sub.status}@${created}`)
  }
})

test('a write without an event time keeps its old, unguarded shape', async () => {
  // checkout-status and the existing call-site tests write without an event.
  const writes = []
  const db = { collection: () => ({ doc: (uid) => ({ set: async (data, opts) => { writes.push({ uid, data, opts }) } }) }) }
  await writeSubscription('uid_1', subscription(), db)
  assert.equal(writes.length, 1)
  assert.ok(!('stripeEventCreated' in writes[0].data.subscription))
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · A payment failure for an invoice paid since is not flagged
// ─────────────────────────────────────────────────────────────────────────────
function invoiceStripe(status, { error = null } = {}) {
  const calls = []
  return {
    calls,
    invoices: {
      async retrieve(id) {
        calls.push(id)
        if (error) throw error
        return { id, status }
      },
    },
  }
}

const customerDb = () => memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1' } })
const failedInvoice = { id: 'in_1', customer: 'cus_1', status: 'open', hosted_invoice_url: 'https://invoice.stripe.test/in_1' }

test('a failure event for an invoice that has since been paid does not flag the account', async (t) => {
  quiet(t)
  const db = customerDb()
  const stripe = invoiceStripe('paid')
  assert.equal(await flagPaymentFailed(stripe, failedInvoice, db), 'already_paid')
  assert.deepEqual(stripe.calls, ['in_1'])
  assert.equal(storedSubscription(db)?.paymentFailed, undefined, 'a paid invoice was flagged as failed')
})

test('a failure event for an unpaid invoice flags the account', async () => {
  const db = customerDb()
  assert.equal(await flagPaymentFailed(invoiceStripe('open'), failedInvoice, db), 'flagged')
  assert.equal(storedSubscription(db).paymentFailed, true)
  assert.equal(storedSubscription(db).hostedInvoiceUrl, failedInvoice.hosted_invoice_url)
})

test('if the invoice cannot be read, the failure is still flagged', async (t) => {
  quiet(t)
  const db = customerDb()
  assert.equal(await flagPaymentFailed(invoiceStripe('paid', { error: new Error('Stripe is down') }), failedInvoice, db), 'flagged')
  assert.equal(storedSubscription(db).paymentFailed, true)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The wiring in api/stripe-webhook.js
// ─────────────────────────────────────────────────────────────────────────────
test('the handler routes every verified event through the once-only path', () => {
  const src = stripComments(read('api/stripe-webhook.js'))
  const handler = src.slice(src.indexOf('export default async function handler'), src.indexOf('export async function processStripeEvent'))
  assert.ok(handler.includes('constructEvent('), 'handler slice is wrong')
  assert.match(handler, /processStripeEvent\(event, \{ db: adminDb\(\), stripe \}\)/)
  assert.doesNotMatch(handler, /switch \(event\.type\)/, 'the handler dispatches events itself again, around the dedupe')
  assert.match(handler, /outcome === 'in_progress'[\s\S]*status\(409\)/)
})

test('a payment failure is flagged with the Stripe client, so the invoice can be re-read', () => {
  const src = stripComments(read('api/stripe-webhook.js'))
  assert.match(src, /case 'invoice\.payment_failed': \{\s*await flagPaymentFailed\(stripe, event\.data\.object\)/)
})

test('every subscription write from an event carries the event time', () => {
  const src = stripComments(read('api/stripe-webhook.js'))
  const calls = src.match(/upsertSubscription\(stripe, [^)]*\)/g) || []
  const callSites = calls.filter((c) => !c.includes('subscription, eventCreated'))
  assert.ok(callSites.length >= 2, 'expected the subscription.* and checkout.session.completed call sites')
  for (const call of callSites) assert.match(call, /event\.created\)$/, `${call} writes without ordering`)
})
