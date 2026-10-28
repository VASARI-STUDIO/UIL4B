// CREATE-CHECKOUT REFUSES AN ACCOUNT WHOSE EMAIL IS NOT VERIFIED.
//
// Product rule: paid things need a verified email. A Google sign-in arrives
// verified; a password account is asked to verify first. The route reads the
// decoded ID token's `email_verified` and, when it is not exactly `true`, answers
// 403 { code: 'email-unverified' } before the rate limiter, Firestore or Stripe
// is touched. The real route runs against the in-memory fakes in
// helpers/api-stub-loader.mjs; nothing here reaches Firebase or Stripe.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('./helpers/api-stub-loader.mjs', import.meta.url)

const { fakeRes, fakeAuth, fakeDb, install } = await import('./helpers/api-fakes.js')
const { default: checkout } = await import('../../api/create-checkout.js')

delete process.env.STRIPE_PRICE_MONTHLY
delete process.env.STRIPE_PRICE_YEARLY

function world(tokens) {
  const db = fakeDb()
  const stripeCalls = []
  const stripe = {
    prices: {
      retrieve: async () => { stripeCalls.push('prices.retrieve'); throw new Error('not used') },
      list: async () => { stripeCalls.push('prices.list'); return { data: [{ id: 'price_live', active: true, recurring: { interval: 'month', interval_count: 1 } }] } },
    },
    customers: { create: async () => { stripeCalls.push('customers.create'); return { id: 'cus_1' } } },
    checkout: { sessions: { create: async () => { stripeCalls.push('sessions.create'); return { client_secret: 'cs_secret' } } } },
  }
  install({ auth: fakeAuth({ tokens }), db, stripe })
  return { db, stripeCalls }
}

async function call(bearer) {
  const res = fakeRes()
  await checkout({
    method: 'POST',
    headers: { authorization: `Bearer ${bearer}`, 'x-forwarded-for': '198.51.100.7' },
    body: { interval: 'monthly', currency: 'usd' },
  }, res)
  return res
}

const rateDocs = (db) => [...db.docs.keys()].filter((k) => k.startsWith('rate-limits/'))

test('an unverified account gets 403 email-unverified, with no Stripe call and nothing counted', async () => {
  const { db, stripeCalls } = world({ unverified: { uid: 'u1', email: 'u1@example.com', email_verified: false } })
  const res = await call('unverified')
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.code, 'email-unverified')
  assert.match(res.body.error, /verify your email/i)
  assert.match(res.body.error, /No payment session was created/)
  assert.deepEqual(stripeCalls, [], 'Stripe was called for an unverified account')
  assert.deepEqual(rateDocs(db), [], 'an unverified refusal used up the account\'s allowance')
})

test('a token with no email_verified claim at all is treated as unverified', async () => {
  const { stripeCalls } = world({ bare: { uid: 'u2', email: 'u2@example.com' } })
  const res = await call('bare')
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.code, 'email-unverified')
  assert.deepEqual(stripeCalls, [])
})

test('only a literal true counts as verified', async () => {
  const { stripeCalls } = world({ stringy: { uid: 'u3', email: 'u3@example.com', email_verified: 'true' } })
  const res = await call('stringy')
  assert.equal(res.statusCode, 403)
  assert.deepEqual(stripeCalls, [])
})

test('a verified account proceeds to a checkout session', async () => {
  const { stripeCalls } = world({ verified: { uid: 'u4', email: 'u4@example.com', email_verified: true } })
  const res = await call('verified')
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.clientSecret, 'cs_secret')
  assert.ok(stripeCalls.includes('sessions.create'), 'a verified account got no session')
})
