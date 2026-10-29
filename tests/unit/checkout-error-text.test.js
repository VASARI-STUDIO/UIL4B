// What /checkout shows when the payment session fails (src/utils/checkoutError.js).
// MUTATION: make checkoutErrorText return err.message and the raw-text cases go red.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { checkoutErrorText, checkoutErrorAction, plainError, CHECKOUT_GENERIC } from '../../src/utils/checkoutError.js'

const failure = (status, message = 'raw server text', extra = {}) => Object.assign(new Error(message), { status, ...extra })

test('a server error is never shown as the server wrote it', () => {
  for (const status of [400, 401, 403, 409, 429, 500, 502, 503]) {
    const text = checkoutErrorText(failure(status, 'Stub session failure: secret_key_xyz'))
    assert.ok(!text.includes('Stub session failure'), `${status} leaked the server text`)
    assert.ok(!text.includes('secret_key_xyz'), `${status} leaked the server text`)
  }
})

test('an unrecognised failure reads as the generic sentence', () => {
  assert.equal(CHECKOUT_GENERIC, 'Checkout couldn’t start. Try again in a moment.')
  assert.equal(checkoutErrorText(failure(500)), CHECKOUT_GENERIC)
  assert.equal(checkoutErrorText(failure(403)), CHECKOUT_GENERIC)
  assert.equal(checkoutErrorText(new TypeError('Failed to fetch')), CHECKOUT_GENERIC)
  assert.equal(checkoutErrorText(undefined), CHECKOUT_GENERIC)
})

test('the refusals a buyer can act on get their own sentence', () => {
  const seen = new Set()
  for (const status of [400, 401, 409, 429, 503]) {
    const text = checkoutErrorText(failure(status))
    assert.notEqual(text, CHECKOUT_GENERIC, `${status} fell through to the generic sentence`)
    seen.add(text)
  }
  assert.equal(seen.size, 5, 'two statuses share a sentence')
  assert.match(checkoutErrorText(failure(429)), /Too many checkout attempts/)
})

test('an unverified email keeps its reason code and reads as a plain sentence', () => {
  const text = checkoutErrorText(failure(403, 'Verify your email address before subscribing. No payment session was created.', { code: 'email-unverified' }))
  assert.equal(text, 'Verify your email address before you subscribe.')
})

test('the page\'s own sentences pass through, and a reference id is kept', () => {
  assert.equal(checkoutErrorText(plainError('The payment form couldn’t load.')), 'The payment form couldn’t load.')
  assert.equal(checkoutErrorText(failure(500, 'x', { correlationId: 'abc123' })), `${CHECKOUT_GENERIC} Reference: abc123`)
})

test('only an expired sign-in swaps Try again for a log-in', () => {
  assert.equal(checkoutErrorAction(failure(401)), 'log-in')
  for (const status of [400, 403, 409, 429, 500, 503, undefined]) {
    assert.equal(checkoutErrorAction(failure(status)), '', `${status} should keep Try again`)
  }
  assert.equal(checkoutErrorAction(plainError('x')), '')
})

test('a 429 says to wait', () => {
  assert.match(checkoutErrorText(failure(429)), /wait a few minutes/i)
})

test('the billing helper hands the status and reference id to the page', () => {
  const src = fs.readFileSync('src/contexts/SubscriptionContext.jsx', 'utf8')
  assert.match(src, /error\.status = status/)
  assert.match(src, /error\.correlationId = data\.correlationId/)
})
