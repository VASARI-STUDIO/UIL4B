// A late invoice.paid must not wipe a newer payment failure.
//
// Stripe does not promise delivery order. If an invoice.paid for an older invoice
// arrives after a newer invoice has failed, clearing the failure would leave the
// customer on Pro with no grace countdown and no banner. The failure is cleared
// only when the paid invoice settles the failure on record.
//
// The cases go through processStripeEvent (the shipped path, with the injected
// in-memory database) and through clearPaymentFailure / flagPaymentFailed
// directly. Only Stripe's invoice lookup is faked; expected values are written
// out by hand, not derived from the code under test.
import test from 'node:test'
import assert from 'node:assert/strict'
import { STRIPE_EVENTS_COLLECTION, subscriptionDocFields } from '../../api/_lib/billing.js'
import { clearPaymentFailure, flagPaymentFailed, processStripeEvent } from '../../api/stripe-webhook.js'
import { memoryDb } from './helpers/memory-firestore.js'

const FAILED_AT = 1_800_000_000_000 // ms
const SECOND = 1000

const quiet = (t) => {
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'error', () => {})
}

// The users/uid_1 document of a customer whose newest invoice has failed.
const failingAccount = (subscription = {}) => ({
  'users/uid_1': {
    stripeCustomerId: 'cus_1',
    subscription: {
      status: 'active',
      paymentFailed: true,
      paymentFailedAt: FAILED_AT,
      hostedInvoiceUrl: 'https://pay.example/in_new',
      failedInvoiceId: 'in_new',
      ...subscription,
    },
  },
})

// A Stripe double that only knows how to read an invoice by id.
// `during` runs inside the lookup, which is where a real delivery can race.
function fakeStripe({ invoices = {}, error = null, during = null } = {}) {
  const calls = []
  const options = []
  return {
    calls,
    options,
    invoices: {
      async retrieve(id, opts) {
        calls.push(id)
        options.push(opts)
        if (during) await during(id)
        if (error) throw error
        if (!invoices[id]) throw new Error(`No such invoice: ${id}`)
        return invoices[id]
      },
    },
  }
}

const paidInvoice = (id, paidAtMs = null) => ({
  id,
  customer: 'cus_1',
  status: 'paid',
  status_transitions: paidAtMs == null ? {} : { paid_at: paidAtMs / SECOND },
})

const paidEvent = (invoice, id = 'evt_paid') => ({
  id, type: 'invoice.paid', created: 1_700_000_500, data: { object: invoice },
})

const stored = (db) => db.doc('users/uid_1').subscription
const failureStillOnRecord = (db) => {
  const sub = stored(db)
  assert.equal(sub.paymentFailed, true)
  assert.equal(sub.paymentFailedAt, FAILED_AT)
  assert.equal(sub.hostedInvoiceUrl, 'https://pay.example/in_new')
  assert.equal(sub.failedInvoiceId, 'in_new')
}

// ─────────────────────────────────────────────────────────────────────────────
// A paid invoice that is not the failing one
// ─────────────────────────────────────────────────────────────────────────────
test('a late invoice.paid for an older invoice leaves the newer failure in place', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({ invoices: { in_new: { id: 'in_new', status: 'open' } } })

  const outcome = await processStripeEvent(paidEvent(paidInvoice('in_old', FAILED_AT - 60 * SECOND)), { db, stripe })

  assert.equal(outcome, 'processed')
  failureStillOnRecord(db)
  assert.deepEqual(stripe.calls, ['in_new'], 'Stripe is asked about the invoice that failed, not the one just paid')
  assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_paid`).status, 'done', 'the event is still recorded as handled')
})

test('clearPaymentFailure reports kept_newer_failure and writes nothing', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const before = structuredClone(db.doc('users/uid_1'))
  const stripe = fakeStripe({ invoices: { in_new: { id: 'in_new', status: 'open' } } })

  assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'kept_newer_failure')
  assert.deepEqual(db.doc('users/uid_1'), before)
})

test('an uncollectible or draft failed invoice is still unpaid, so the failure stays', async (t) => {
  quiet(t)
  for (const status of ['open', 'uncollectible', 'draft']) {
    const db = memoryDb(failingAccount())
    const stripe = fakeStripe({ invoices: { in_new: { id: 'in_new', status } } })
    assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'kept_newer_failure', `status ${status}`)
    failureStillOnRecord(db)
  }
})

test('a different invoice whose failed invoice has since been paid or voided clears the failure', async (t) => {
  quiet(t)
  for (const status of ['paid', 'void']) {
    const db = memoryDb(failingAccount())
    const stripe = fakeStripe({ invoices: { in_new: { id: 'in_new', status } } })
    assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'cleared', `status ${status}`)
    const sub = stored(db)
    assert.equal(sub.paymentFailed, false)
    assert.equal(sub.paymentFailedAt, null)
    assert.equal(sub.hostedInvoiceUrl, null)
    assert.equal(sub.failedInvoiceId, null)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// The paid invoice is the failing one
// ─────────────────────────────────────────────────────────────────────────────
test('paying the failing invoice clears all four failure fields and keeps the rest', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe()

  const outcome = await processStripeEvent(paidEvent(paidInvoice('in_new', FAILED_AT + 60 * SECOND)), { db, stripe })

  assert.equal(outcome, 'processed')
  const sub = stored(db)
  assert.equal(sub.paymentFailed, false)
  assert.equal(sub.paymentFailedAt, null)
  assert.equal(sub.hostedInvoiceUrl, null)
  assert.equal(sub.failedInvoiceId, null)
  assert.equal(sub.status, 'active', 'unrelated subscription fields are untouched')
  assert.deepEqual(stripe.calls, [], 'no Stripe lookup is needed when the ids match')
})

test('invoice.paid with no failure on record changes nothing', async (t) => {
  quiet(t)
  const db = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1', subscription: { status: 'active', paymentFailed: false } } })
  const before = structuredClone(db.doc('users/uid_1'))
  assert.equal(await clearPaymentFailure(fakeStripe(), paidInvoice('in_x'), db), 'nothing_to_clear')
  assert.deepEqual(db.doc('users/uid_1'), before)
})

test('invoice.paid for a customer with no account writes nothing', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const before = structuredClone(db.doc('users/uid_1'))
  const stranger = { ...paidInvoice('in_new'), customer: 'cus_unknown' }
  assert.equal(await clearPaymentFailure(fakeStripe(), stranger, db), 'no_account')
  assert.deepEqual(db.doc('users/uid_1'), before)
})

// ─────────────────────────────────────────────────────────────────────────────
// Stripe cannot be read
// ─────────────────────────────────────────────────────────────────────────────
test('when the failed invoice cannot be read the event is not marked processed, and a retry succeeds', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const down = Object.assign(new Error('stripe unreachable'), { type: 'StripeConnectionError' })
  const event = paidEvent(paidInvoice('in_old', FAILED_AT - 60 * SECOND))

  await assert.rejects(processStripeEvent(event, { db, stripe: fakeStripe({ error: down }) }), /stripe unreachable/)
  failureStillOnRecord(db)
  assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_paid`), undefined, 'the claim is released so Stripe\'s retry runs the event again')

  // Stripe comes back and says the newer invoice was paid in the meantime.
  const outcome = await processStripeEvent(event, { db, stripe: fakeStripe({ invoices: { in_new: { id: 'in_new', status: 'paid' } } }) })
  assert.equal(outcome, 'processed')
  assert.equal(stored(db).paymentFailed, false)
})

// ─────────────────────────────────────────────────────────────────────────────
// A failure stored before failedInvoiceId existed
// ─────────────────────────────────────────────────────────────────────────────
const legacyAccount = (subscription = {}) => failingAccount({ failedInvoiceId: undefined, ...subscription })

test('legacy record: an invoice paid before the failure began leaves the failure in place', async (t) => {
  quiet(t)
  const db = memoryDb(legacyAccount())
  const stripe = fakeStripe()

  assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old', FAILED_AT - SECOND), db), 'kept_newer_failure')
  assert.equal(stored(db).paymentFailed, true)
  assert.equal(stored(db).paymentFailedAt, FAILED_AT)
  assert.deepEqual(stripe.calls, [], 'with no stored invoice id there is nothing to look up')
})

test('legacy record: an invoice paid after the failure began clears it', async (t) => {
  quiet(t)
  const db = memoryDb(legacyAccount())
  assert.equal(await clearPaymentFailure(fakeStripe(), paidInvoice('in_old', FAILED_AT + SECOND), db), 'cleared')
  assert.equal(stored(db).paymentFailed, false)
  assert.equal(stored(db).paymentFailedAt, null)
})

test('legacy record: an invoice paid in the same second the failure began clears it', async (t) => {
  quiet(t)
  const db = memoryDb(legacyAccount())
  assert.equal(await clearPaymentFailure(fakeStripe(), paidInvoice('in_old', FAILED_AT), db), 'cleared')
})

test('legacy record: an invoice with no paid time clears it, as it did before the id existed', async (t) => {
  quiet(t)
  const db = memoryDb(legacyAccount())
  assert.equal(await clearPaymentFailure(fakeStripe(), paidInvoice('in_old'), db), 'cleared')
  assert.equal(stored(db).paymentFailed, false)
})

test('legacy record: a failure with no start time clears on any paid invoice', async (t) => {
  quiet(t)
  const db = memoryDb(legacyAccount({ paymentFailedAt: null }))
  assert.equal(await clearPaymentFailure(fakeStripe(), paidInvoice('in_old', FAILED_AT - 60 * SECOND), db), 'cleared')
})

// ─────────────────────────────────────────────────────────────────────────────
// What flagPaymentFailed stores
// ─────────────────────────────────────────────────────────────────────────────
const failedInvoice = (id, url) => ({ id, customer: 'cus_1', hosted_invoice_url: url })
const openInvoices = (...ids) => fakeStripe({ invoices: Object.fromEntries(ids.map((id) => [id, { id, status: 'open' }])) })

test('flagging a failed invoice records which invoice failed', async (t) => {
  quiet(t)
  t.mock.method(Date, 'now', () => FAILED_AT)
  const db = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1', subscription: { status: 'active' } } })

  assert.equal(await flagPaymentFailed(openInvoices('in_old'), failedInvoice('in_old', 'https://pay.example/in_old'), db), 'flagged')
  const sub = stored(db)
  assert.equal(sub.failedInvoiceId, 'in_old')
  assert.equal(sub.paymentFailed, true)
  assert.equal(sub.paymentFailedAt, FAILED_AT)
  assert.equal(sub.hostedInvoiceUrl, 'https://pay.example/in_old')
})

test('a retried failure keeps the first paymentFailedAt but follows the newest failing invoice', async (t) => {
  quiet(t)
  const clock = t.mock.method(Date, 'now', () => FAILED_AT)
  const db = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1', subscription: { status: 'active' } } })
  const stripe = openInvoices('in_old', 'in_new')

  await flagPaymentFailed(stripe, failedInvoice('in_old', 'https://pay.example/in_old'), db)
  clock.mock.mockImplementation(() => FAILED_AT + 3 * 86_400_000)
  await flagPaymentFailed(stripe, failedInvoice('in_new', 'https://pay.example/in_new'), db)

  const sub = stored(db)
  assert.equal(sub.paymentFailedAt, FAILED_AT, 'the grace clock is stamped once')
  assert.equal(sub.failedInvoiceId, 'in_new')
  assert.equal(sub.hostedInvoiceUrl, 'https://pay.example/in_new')
})

test('an invoice.payment_failed event is flagged through the event path, re-reading the invoice first', async (t) => {
  quiet(t)
  t.mock.method(Date, 'now', () => FAILED_AT)
  const db = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1', subscription: { status: 'active' } } })
  const stripe = openInvoices('in_new')
  const event = { id: 'evt_fail', type: 'invoice.payment_failed', created: 1_700_000_400, data: { object: failedInvoice('in_new', 'https://pay.example/in_new') } }

  assert.equal(await processStripeEvent(event, { db, stripe }), 'processed')
  assert.deepEqual(stripe.calls, ['in_new'], 'the invoice is re-read before the failure is written')
  assert.equal(stored(db).paymentFailed, true)
  assert.equal(stored(db).failedInvoiceId, 'in_new')

  // The same invoice paid in the meantime: the failure is not written at all.
  const paidDb = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1', subscription: { status: 'active' } } })
  const paid = fakeStripe({ invoices: { in_new: { id: 'in_new', status: 'paid' } } })
  await processStripeEvent({ ...event, id: 'evt_fail_2' }, { db: paidDb, stripe: paid })
  assert.equal(stored(paidDb).paymentFailed, undefined)
})

test('failure on the old invoice, failure on the new one, then a late paid for the old one', async (t) => {
  quiet(t)
  t.mock.method(Date, 'now', () => FAILED_AT)
  const db = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1', subscription: { status: 'active' } } })
  const stripe = openInvoices('in_old', 'in_new')

  await flagPaymentFailed(stripe, failedInvoice('in_old', 'https://pay.example/in_old'), db)
  await flagPaymentFailed(stripe, failedInvoice('in_new', 'https://pay.example/in_new'), db)

  await processStripeEvent(paidEvent(paidInvoice('in_old', FAILED_AT + 10 * SECOND), 'evt_late'), { db, stripe })
  assert.equal(stored(db).paymentFailed, true, 'the late paid event for the older invoice must not clear the newer failure')
  assert.equal(stored(db).failedInvoiceId, 'in_new')

  await processStripeEvent(paidEvent(paidInvoice('in_new', FAILED_AT + 20 * SECOND), 'evt_new'), { db, stripe })
  assert.equal(stored(db).paymentFailed, false, 'paying the newer invoice does clear it')
  assert.equal(stored(db).failedInvoiceId, null)
})

// ─────────────────────────────────────────────────────────────────────────────
// A failure flagged while the decision is being made
// ─────────────────────────────────────────────────────────────────────────────
// The decision to clear is taken from a read before the Stripe lookup. These
// write to the account from inside the lookup, the way a second delivery would.
const writeSubscription = (db, subscription) =>
  db.collection('users').doc('uid_1').set({ subscription }, { merge: true })

const NEWER_FAILURE = {
  paymentFailed: true,
  paymentFailedAt: FAILED_AT + 5 * SECOND,
  hostedInvoiceUrl: 'https://pay.example/in_newest',
  failedInvoiceId: 'in_newest',
}

test('a newer failure flagged during the Stripe lookup survives a clear that was decided before it', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  // Stripe says the recorded failure (in_new) was paid, so on the first read the answer is "clear".
  const stripe = fakeStripe({
    invoices: { in_new: { id: 'in_new', status: 'paid' } },
    during: () => writeSubscription(db, NEWER_FAILURE),
  })

  assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'kept_newer_failure')
  const sub = stored(db)
  assert.equal(sub.paymentFailed, true)
  assert.equal(sub.failedInvoiceId, 'in_newest')
  assert.equal(sub.paymentFailedAt, FAILED_AT + 5 * SECOND)
  assert.equal(sub.hostedInvoiceUrl, 'https://pay.example/in_newest')
})

test('the same invoice failing again during the lookup (a new failure time) is also kept', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({
    invoices: { in_new: { id: 'in_new', status: 'paid' } },
    during: () => writeSubscription(db, { paymentFailedAt: FAILED_AT + 9 * SECOND }),
  })

  assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'kept_newer_failure')
  assert.equal(stored(db).paymentFailed, true)
  assert.equal(stored(db).paymentFailedAt, FAILED_AT + 9 * SECOND)
})

test('a failure cleared by someone else during the lookup is not rewritten', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({
    invoices: { in_new: { id: 'in_new', status: 'paid' } },
    during: () => writeSubscription(db, { paymentFailed: false, paymentFailedAt: null, hostedInvoiceUrl: null, failedInvoiceId: null, updatedAt: 111 }),
  })

  assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'nothing_to_clear')
  assert.equal(stored(db).updatedAt, 111, 'the write was skipped, so the other writer\'s record is untouched')
})

test('through the event path, a failure flagged mid-lookup survives and the event is still marked done', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({
    invoices: { in_new: { id: 'in_new', status: 'void' } },
    during: () => writeSubscription(db, NEWER_FAILURE),
  })

  const outcome = await processStripeEvent(paidEvent(paidInvoice('in_old', FAILED_AT + SECOND)), { db, stripe })

  assert.equal(outcome, 'processed')
  assert.equal(stored(db).paymentFailed, true)
  assert.equal(stored(db).failedInvoiceId, 'in_newest')
  assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_paid`).status, 'done')
})

// ─────────────────────────────────────────────────────────────────────────────
// Which Stripe read errors are worth retrying
// ─────────────────────────────────────────────────────────────────────────────
const stripeError = (props) => Object.assign(new Error(`stripe said ${props.type || props.statusCode || 'nothing'}`), props)

const PERMANENT_ERRORS = {
  'no such invoice (404 resource_missing)': { type: 'StripeInvalidRequestError', code: 'resource_missing', statusCode: 404 },
  'bad request (400)': { type: 'StripeInvalidRequestError', code: 'parameter_invalid_empty', statusCode: 400 },
  'key may not read invoices (403)': { type: 'StripePermissionError', statusCode: 403 },
}

const TRANSIENT_ERRORS = {
  'connection error': { type: 'StripeConnectionError' },
  'rate limit': { type: 'StripeRateLimitError', statusCode: 429 },
  'api error': { type: 'StripeAPIError', statusCode: 500 },
  'a 503 from a gateway': { statusCode: 503 },
  'a 503 carried on raw': { raw: { statusCode: 503 } },
  'a bare network failure with no Stripe verdict': {},
}

test('a permanent read error keeps the failure and returns, without throwing', async (t) => {
  quiet(t)
  for (const [name, props] of Object.entries(PERMANENT_ERRORS)) {
    const db = memoryDb(failingAccount())
    const stripe = fakeStripe({ error: stripeError(props) })
    assert.equal(await clearPaymentFailure(stripe, paidInvoice('in_old'), db), 'kept_newer_failure', name)
    failureStillOnRecord(db)
  }
})

test('a permanent read error completes the event instead of leaving it processing', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({ error: stripeError(PERMANENT_ERRORS['no such invoice (404 resource_missing)']) })

  assert.equal(await processStripeEvent(paidEvent(paidInvoice('in_old')), { db, stripe }), 'processed')
  assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_paid`).status, 'done')
  failureStillOnRecord(db)
  assert.equal(stripe.calls.length, 1, 'no point asking again')
})

test('a transient read error throws out of clearPaymentFailure and writes nothing', async (t) => {
  quiet(t)
  for (const [name, props] of Object.entries(TRANSIENT_ERRORS)) {
    const db = memoryDb(failingAccount())
    const error = stripeError(props)
    await assert.rejects(clearPaymentFailure(fakeStripe({ error }), paidInvoice('in_old'), db), (thrown) => thrown === error, name)
    failureStillOnRecord(db)
  }
})

test('after a transient read error the claim is released, so a redelivery runs and clears the failure', async (t) => {
  quiet(t)
  for (const [name, props] of Object.entries(TRANSIENT_ERRORS)) {
    const db = memoryDb(failingAccount())
    const event = paidEvent(paidInvoice('in_old'))

    await assert.rejects(processStripeEvent(event, { db, stripe: fakeStripe({ error: stripeError(props) }) }), name)
    assert.equal(db.doc(`${STRIPE_EVENTS_COLLECTION}/evt_paid`), undefined, `${name}: the claim is released`)

    const retry = fakeStripe({ invoices: { in_new: { id: 'in_new', status: 'paid' } } })
    assert.equal(await processStripeEvent(event, { db, stripe: retry }), 'processed', name)
    assert.equal(retry.calls.length, 1, `${name}: the redelivery really ran the handler`)
    assert.equal(stored(db).paymentFailed, false, name)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// The customer resubscribed: the failed invoice belongs to a cancelled subscription
// ─────────────────────────────────────────────────────────────────────────────
const onSubscription = (subscription) => ({
  parent: { type: 'subscription_details', subscription_details: { subscription } },
})
const failedOn = (subscription, status = 'open') => ({ id: 'in_new', status, ...onSubscription(subscription) })
const paidOn = (subscription) => ({ ...paidInvoice('in_paid', FAILED_AT + 60 * SECOND), ...onSubscription(subscription) })

const EXPAND = { expand: ['parent.subscription_details.subscription'] }

test('an open failed invoice on a cancelled subscription is cleared when the paid invoice is on a different one', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({ invoices: { in_new: failedOn({ id: 'sub_old', status: 'canceled' }) } })

  assert.equal(await clearPaymentFailure(stripe, paidOn('sub_new'), db), 'cleared')
  const sub = stored(db)
  assert.equal(sub.paymentFailed, false)
  assert.equal(sub.failedInvoiceId, null)
  assert.equal(sub.paymentFailedAt, null)
  assert.equal(sub.hostedInvoiceUrl, null)
  assert.deepEqual(stripe.options, [EXPAND], 'the failed invoice is read with its subscription expanded')
})

test('the same resubscribe case clears through the event path, and the paid invoice may carry an expanded subscription', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({ invoices: { in_new: failedOn({ id: 'sub_old', status: 'canceled' }) } })

  assert.equal(await processStripeEvent(paidEvent(paidOn({ id: 'sub_new', status: 'active' })), { db, stripe }), 'processed')
  assert.equal(stored(db).paymentFailed, false)
})

test('an open failed invoice stays when its subscription is cancelled but the paid invoice is on the same one', async (t) => {
  quiet(t)
  const db = memoryDb(failingAccount())
  const stripe = fakeStripe({ invoices: { in_new: failedOn({ id: 'sub_old', status: 'canceled' }) } })

  assert.equal(await clearPaymentFailure(stripe, paidOn('sub_old'), db), 'kept_newer_failure')
  failureStillOnRecord(db)
})

test('an open failed invoice stays when its subscription is still live', async (t) => {
  quiet(t)
  for (const status of ['active', 'past_due', 'unpaid', 'incomplete', 'trialing']) {
    const db = memoryDb(failingAccount())
    const stripe = fakeStripe({ invoices: { in_new: failedOn({ id: 'sub_old', status }) } })
    assert.equal(await clearPaymentFailure(stripe, paidOn('sub_new'), db), 'kept_newer_failure', `subscription ${status}`)
    failureStillOnRecord(db)
  }
})

test('without a readable subscription on both invoices the failure stays', async (t) => {
  quiet(t)
  const cases = {
    'failed invoice has the subscription as a bare id': [failedOn('sub_old'), paidOn('sub_new')],
    'failed invoice has no parent': [{ id: 'in_new', status: 'open' }, paidOn('sub_new')],
    'failed invoice parent is another type': [{ id: 'in_new', status: 'open', parent: { type: 'quote_details' } }, paidOn('sub_new')],
    'paid invoice has no parent': [failedOn({ id: 'sub_old', status: 'canceled' }), paidInvoice('in_paid', FAILED_AT + SECOND)],
  }
  for (const [name, [failed, paid]] of Object.entries(cases)) {
    const db = memoryDb(failingAccount())
    const stripe = fakeStripe({ invoices: { in_new: failed } })
    assert.equal(await clearPaymentFailure(stripe, paid, db), 'kept_newer_failure', name)
    failureStillOnRecord(db)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// A healthy subscription document drops the failed-invoice link too
// ─────────────────────────────────────────────────────────────────────────────
test('a healthy subscription document nulls all four failure fields', () => {
  for (const status of ['active', 'trialing']) {
    const doc = subscriptionDocFields({ id: 'sub_1', status }, 1_800_000_000_000)
    assert.equal(doc.paymentFailed, false, status)
    assert.equal(doc.paymentFailedAt, null, status)
    assert.equal(doc.hostedInvoiceUrl, null, status)
    assert.equal(doc.failedInvoiceId, null, status)
  }
})

test('an unhealthy subscription document leaves the failure fields alone', () => {
  for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete']) {
    const doc = subscriptionDocFields({ id: 'sub_1', status }, 1_800_000_000_000)
    for (const field of ['paymentFailed', 'paymentFailedAt', 'hostedInvoiceUrl', 'failedInvoiceId']) {
      assert.equal(field in doc, false, `${status} must not write ${field}`)
    }
  }
})
