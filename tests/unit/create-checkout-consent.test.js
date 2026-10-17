// Checkout asks Stripe to collect agreement to the Terms. Stripe refuses that
// while the account has no Terms of Service URL, so the session is retried once
// without consent collection and checkout keeps working. Any other failure is
// not retried. Stripe is mocked; no network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import { createSession, isTermsUrlError, sessionCurrency, CONSENT_DROPPED_TAG } from '../../api/create-checkout.js'

const TERMS_ERROR = 'Consent to the terms of service cannot be collected until a terms of service URL is saved on the account.'

// What the Stripe SDK throws for a refused request: an invalid-request error, HTTP 400.
const stripeError = (message, extra = {}) => Object.assign(new Error(message), { type: 'StripeInvalidRequestError', statusCode: 400 }, extra)

function fakeStripe(outcomes) {
  const calls = []
  return {
    calls,
    checkout: {
      sessions: {
        async create(params) {
          calls.push(params)
          const next = outcomes[calls.length - 1]
          if (next instanceof Error) throw next
          return next
        },
      },
    },
  }
}

const params = () => ({ mode: 'subscription', currency: 'aud', consent_collection: { terms_of_service: 'required' } })
const quiet = (t) => t.mock.method(console, 'error', () => {})

test('the session request asks for required Terms consent', () => {
  assertStripperWorks(assert)
  const src = stripComments(read('api/create-checkout.js'))
  assert.match(src, /consent_collection: \{ terms_of_service: 'required' \}/)
  assert.match(src, /clientSecret: session\.client_secret,\s*currency: sessionCurrency\(session, sessionParams\)/, 'the response must report the currency the session was created in')
})

test('a normal session is created once, with consent collection', async () => {
  const stripe = fakeStripe([{ id: 'cs_1' }])
  const session = await createSession(stripe, params())
  assert.equal(session.id, 'cs_1')
  assert.equal(stripe.calls.length, 1)
  assert.deepEqual(stripe.calls[0].consent_collection, { terms_of_service: 'required' })
})

test('the Terms-URL error retries once without consent collection and logs an error with a fixed tag', async (t) => {
  const logged = t.mock.method(console, 'error', () => {})
  const warned = t.mock.method(console, 'warn', () => {})
  const stripe = fakeStripe([stripeError(TERMS_ERROR), { id: 'cs_2' }])
  const input = params()
  const session = await createSession(stripe, input)
  assert.equal(session.id, 'cs_2')
  assert.equal(stripe.calls.length, 2)
  assert.equal('consent_collection' in stripe.calls[1], false, 'the retry must drop consent collection')
  assert.equal(stripe.calls[1].currency, 'aud', 'every other parameter is unchanged')
  assert.deepEqual(input.consent_collection, { terms_of_service: 'required' }, 'the caller\'s params are not mutated')
  assert.equal(logged.mock.callCount(), 1)
  assert.equal(warned.mock.callCount(), 0, 'dropping consent is an error, not a warning')
  // Fixed text only: no Stripe error text, session id, key or uid.
  assert.deepEqual(logged.mock.calls[0].arguments, ['[checkout] consent_collection dropped: terms URL not set'])
  assert.equal(CONSENT_DROPPED_TAG, '[checkout] consent_collection dropped: terms URL not set')
})

test('sessionCurrency reports the currency the session was created in, never an unused one', () => {
  assert.equal(sessionCurrency({ currency: 'USD' }, { currency: 'aud' }), 'usd', 'the session\'s own currency wins')
  assert.equal(sessionCurrency({}, { currency: 'aud' }), 'aud', 'the requested currency, while it was kept')
  assert.equal(sessionCurrency({}, {}), null, 'currency dropped on the locked-currency retry and not reported: unknown')
  assert.equal(sessionCurrency(null, undefined), null)
})

test('any other error is thrown as it is, with no retry', async (t) => {
  quiet(t)
  for (const message of ['Invalid currency: xyz', 'No such price: price_x', 'Your card was declined']) {
    const failure = new Error(message)
    const stripe = fakeStripe([failure, { id: 'never' }])
    await assert.rejects(createSession(stripe, params()), (e) => e === failure)
    assert.equal(stripe.calls.length, 1, `"${message}" must not be retried`)
  }
})

test('a second failure on the retry is thrown, and only one retry is made', async (t) => {
  quiet(t)
  const second = stripeError('Something else broke')
  const stripe = fakeStripe([stripeError(TERMS_ERROR), second, { id: 'never' }])
  await assert.rejects(createSession(stripe, params()), (e) => e === second)
  assert.equal(stripe.calls.length, 2)
})

test('isTermsUrlError matches the Terms-URL refusal and nothing generic', () => {
  assert.equal(isTermsUrlError(stripeError(TERMS_ERROR)), true)
  assert.equal(isTermsUrlError(stripeError('Invalid URL: return_url')), false)
  assert.equal(isTermsUrlError(stripeError('terms of service accepted')), false)
  assert.equal(isTermsUrlError(null), false)
})

test('a matching message is not enough: the error must be a Stripe invalid-request error', async (t) => {
  quiet(t)
  // Same text, but a plain Error, a server failure and a network failure.
  for (const failure of [
    new Error(TERMS_ERROR),
    Object.assign(new Error(TERMS_ERROR), { type: 'StripeAPIError', statusCode: 500 }),
    Object.assign(new Error(TERMS_ERROR), { type: 'StripeConnectionError' }),
  ]) {
    assert.equal(isTermsUrlError(failure), false)
    const stripe = fakeStripe([failure, { id: 'never' }])
    await assert.rejects(createSession(stripe, params()), (e) => e === failure)
    assert.equal(stripe.calls.length, 1, 'a non-400 error must not be retried')
  }
  // Either marker of a Stripe refusal is enough.
  assert.equal(isTermsUrlError(Object.assign(new Error(TERMS_ERROR), { statusCode: 400 })), true)
  assert.equal(isTermsUrlError(Object.assign(new Error(TERMS_ERROR), { type: 'StripeInvalidRequestError' })), true)
})

test('isTermsUrlError also matches on the consent_collection parameter', () => {
  assert.equal(isTermsUrlError(stripeError('A valid URL must be set before this can be collected.', { param: 'consent_collection[terms_of_service]' })), true)
  assert.equal(isTermsUrlError(stripeError('Invalid value for this field.', { param: 'consent_collection[terms_of_service]' })), false, 'no URL in the message')
  assert.equal(isTermsUrlError(stripeError('A valid URL must be set.', { param: 'return_url' })), false)
  assert.equal(isTermsUrlError(Object.assign(new Error('A valid URL must be set.'), { param: 'consent_collection[terms_of_service]' })), false, 'not a Stripe invalid-request error')
})

test('isTermsUrlError also matches other plausible spellings of the same refusal', () => {
  // Stripe's exact error text is not a stable contract. These are made-up
  // messages covering the casing and parameter-name variants one could use.
  for (const message of [
    'A valid terms of service URL has to be set in the account settings first.',
    'To use consent_collection[terms_of_service], set a Terms of Service URL at https://dashboard.stripe.com/settings/public',
    'You cannot collect consent to the Terms-of-Service unless a URL is set in your public details.',
  ]) {
    assert.equal(isTermsUrlError(stripeError(message)), true, message)
  }
  assert.equal(isTermsUrlError(stripeError('Invalid consent_collection[terms_of_service]: must be one of required')), false)
})
