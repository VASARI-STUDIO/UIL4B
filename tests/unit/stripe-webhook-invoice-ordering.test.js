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
import { STRIPE_EVENTS_COLLECTION } from '../../api/_lib/billing.js'
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
function fakeStripe({ invoices = {}, error = null } = {}) {
  const calls = []
  return {
    calls,
    invoices: {
      async retrieve(id) {
        calls.push(id)
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
