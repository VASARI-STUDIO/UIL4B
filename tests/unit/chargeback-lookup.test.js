// THE LOOKUP THAT REVOKES PRO AFTER A CHARGEBACK, WHICH WENT DEAD IN SILENCE.
//
// api/stripe-webhook.js traces a reversed charge back to the subscription it
// paid for, so the entitlement can be taken away. Until 2026-09-15 it did that
// by walking `intent.invoice` and then `invoice.subscription`, and Stripe's
// Basil release (2025-03-31) removed BOTH fields — "Removed the `invoice` field
// from the PaymentIntent and Charge objects", and the Invoice lost its
// top-level `subscription` in the same release.
//
// So the first guard returned null on every call and the revocation below it
// was unreachable: a chargeback or refund on a renewal left Pro active while
// the money went back.
//
// IT WAS INVISIBLE BECAUSE IT WAS INERT RATHER THAN WRONG. Nothing threw,
// nothing logged, the catch never ran, and the function returned the same
// `null` it returns for a legitimate one-off payment. No test failed, because
// billing.test.js covers the decision helpers DOWNSTREAM of this lookup and
// nothing covered the lookup. That is the gap this file closes.
//
// The client is a stub built to the SHAPE THE CURRENT API RETURNS. That is the
// point: a stub built to the old shape would let the old code pass, so the
// fixtures here carry `parent.subscription_details` and no top-level
// `subscription`, exactly as a Basil-or-later account answers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionForPaymentIntent } from '../../api/stripe-webhook.js'

const SUB = { id: 'sub_live', metadata: { firebaseUid: 'uid_123' }, status: 'active' }

/**
 * A Stripe double that answers the way a current account does, and records what
 * was asked of it. `calls` is what makes the regression assertion possible: the
 * dead version reached paymentIntents.retrieve and never invoicePayments.list.
 */
function stripeDouble({ invoicePayments = [{ invoice: 'in_1' }], invoice, sub = SUB } = {}) {
  const calls = []
  return {
    calls,
    invoicePayments: {
      list(params) {
        calls.push(['invoicePayments.list', params])
        return Promise.resolve({ data: invoicePayments })
      },
    },
    invoices: {
      retrieve(id) {
        calls.push(['invoices.retrieve', id])
        return Promise.resolve(invoice !== undefined ? invoice : {
          id,
          parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_live' } },
        })
      },
    },
    subscriptions: {
      retrieve(id) {
        calls.push(['subscriptions.retrieve', id])
        return Promise.resolve({ ...sub, id })
      },
    },
    // Present so a regression to the old code path RESOLVES rather than throwing
    // — otherwise the mutation would fail on a TypeError and this file would be
    // asserting that the stub is incomplete, not that the lookup is correct.
    paymentIntents: {
      retrieve(id) {
        calls.push(['paymentIntents.retrieve', id])
        return Promise.resolve({ id, invoice: null })
      },
    },
  }
}

test('a reversed subscription charge is traced to its subscription', async () => {
  const stripe = stripeDouble()
  const sub = await subscriptionForPaymentIntent(stripe, 'pi_renewal')

  assert.ok(sub, 'the lookup found no subscription for a renewal charge — this is the '
    + 'state the whole revocation path was stuck in, and it revokes nothing')
  assert.equal(sub.id, 'sub_live')
  assert.equal(sub.metadata.firebaseUid, 'uid_123',
    'the subscription metadata is the user link the caller reads; it must survive')
})

test('it asks the endpoint that still exists, with the documented filter', async () => {
  // THE REGRESSION GUARD. The dead version called paymentIntents.retrieve and
  // read `.invoice` off it. Asserting only on the returned subscription would
  // pass against a stub generous enough to answer both shapes, so this asserts
  // WHICH call was made.
  const stripe = stripeDouble()
  await subscriptionForPaymentIntent(stripe, 'pi_renewal')
  const names = stripe.calls.map(([name]) => name)

  assert.ok(names.includes('invoicePayments.list'),
    'the lookup did not use the Invoice Payment endpoint. `intent.invoice` and '
    + '`invoice.subscription` were both removed in Stripe Basil, so any path through '
    + 'them returns null forever — see the note above the function.')
  assert.ok(!names.includes('paymentIntents.retrieve'),
    'the lookup went back to PaymentIntent.invoice, which this API version does not '
    + 'return. That is the shape that made this function inert.')

  const [, params] = stripe.calls.find(([name]) => name === 'invoicePayments.list')
  assert.deepEqual(params.payment, { type: 'payment_intent', payment_intent: 'pi_renewal' },
    "the filter is Stripe's documented one: payment[type] and payment[payment_intent]")
})

test('the subscription is read from the invoice parent, not the removed field', async () => {
  // An invoice that carries ONLY the old top-level field — which is what a
  // pre-Basil fixture looks like. The lookup must not find anything here, or it
  // is reading a field the API no longer sends and would be green against a
  // stale stub while broken in production.
  const stripe = stripeDouble({ invoice: { id: 'in_1', subscription: 'sub_live' } })
  assert.equal(await subscriptionForPaymentIntent(stripe, 'pi_renewal'), null,
    'the lookup read `invoice.subscription`, which Basil removed')
})

test('an invoice raised for something other than a subscription is not guessed at', async () => {
  const stripe = stripeDouble({
    invoice: { id: 'in_1', parent: { type: 'quote_details', quote_details: { quote: 'qt_1' } } },
  })
  assert.equal(await subscriptionForPaymentIntent(stripe, 'pi_one_off'), null,
    'a non-subscription parent produced a subscription')
})

test('a one-off payment has no invoice payment, and that is not an error', async () => {
  const stripe = stripeDouble({ invoicePayments: [] })
  assert.equal(await subscriptionForPaymentIntent(stripe, 'pi_lifetime'), null)
  // It must stop there rather than fetching an invoice with an undefined id.
  assert.ok(!stripe.calls.some(([name]) => name === 'invoices.retrieve'),
    'the lookup tried to retrieve an invoice it never found')
})

test('no payment intent id is answered without calling Stripe at all', async () => {
  const stripe = stripeDouble()
  assert.equal(await subscriptionForPaymentIntent(stripe, undefined), null)
  assert.deepEqual(stripe.calls, [], 'a missing id still reached the network')
})

test('a Stripe failure is swallowed into null rather than crashing the webhook', async () => {
  // The handler must still return 200 to Stripe; a throw here would make the
  // event retry forever.
  const stripe = stripeDouble()
  stripe.invoicePayments.list = () => Promise.reject(new Error('rate limited'))
  assert.equal(await subscriptionForPaymentIntent(stripe, 'pi_renewal'), null)
})
