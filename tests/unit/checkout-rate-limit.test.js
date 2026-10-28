// CREATE-CHECKOUT IS RATE-LIMITED PER ACCOUNT AND PER ADDRESS (security audit H1,
// code part).
//
// A free account costs nothing to make, and every checkout call can create a
// Stripe customer and a Checkout session. The route now counts each signed-in
// call against 10 an hour per account and 30 an hour per address, using the same
// Firestore-backed limiter /api/support uses, and answers 429 with Retry-After.
// The real route and the real limiter run against an in-memory Admin SDK and a
// recording Stripe fake (helpers/api-stub-loader.mjs); nothing here touches
// Firebase or Stripe.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('./helpers/api-stub-loader.mjs', import.meta.url)

const { fakeRes, fakeAuth, fakeDb, install } = await import('./helpers/api-fakes.js')
const { default: checkout, checkoutRateLimit, CHECKOUT_LIMITS } = await import('../../api/create-checkout.js')

// Price ids come from Stripe's lookup key, not from the developer's environment.
delete process.env.STRIPE_PRICE_MONTHLY
delete process.env.STRIPE_PRICE_YEARLY

const UID_LIMIT = CHECKOUT_LIMITS.perUid.limit
const IP_LIMIT = CHECKOUT_LIMITS.perIp.limit

function fakeStripe() {
  const sessions = []
  return {
    sessions,
    prices: {
      retrieve: async () => { throw new Error('not used') },
      list: async () => ({ data: [{ id: 'price_live', active: true, recurring: { interval: 'month', interval_count: 1 } }] }),
    },
    customers: { create: async () => ({ id: 'cus_1' }) },
    checkout: { sessions: { create: async (params) => { sessions.push(params); return { client_secret: 'cs_secret' } } } },
  }
}

/** Accounts `u0..u{n-1}`, each with its own bearer token `t{i}`. */
function world(accounts = 60) {
  const tokens = {}
  for (let i = 0; i < accounts; i += 1) tokens[`t${i}`] = { uid: `u${i}`, email: `u${i}@example.com`, email_verified: true }
  const db = fakeDb()
  const stripe = fakeStripe()
  install({ auth: fakeAuth({ tokens }), db, stripe })
  return { db, stripe }
}

async function call(bearer, ip = '198.51.100.7') {
  const res = fakeRes()
  const headers = { authorization: `Bearer ${bearer}`, 'x-forwarded-for': ip }
  await checkout({ method: 'POST', headers, body: { interval: 'monthly', currency: 'usd' } }, res)
  return res
}

test('one account gets its allowance, then a 429 with Retry-After, and no session is made for the refused call', async () => {
  const { stripe } = world()
  for (let i = 0; i < UID_LIMIT; i += 1) {
    const res = await call('t0')
    assert.equal(res.statusCode, 200, `call ${i + 1} of ${UID_LIMIT} must be allowed`)
  }
  const refused = await call('t0')
  assert.equal(refused.statusCode, 429, `call ${UID_LIMIT + 1} must be refused`)
  assert.ok(Number(refused.headers['Retry-After']) > 0 && Number(refused.headers['Retry-After']) <= 3600, 'Retry-After is the wait in seconds')
  assert.equal(refused.body.retryAfter, Number(refused.headers['Retry-After']))
  assert.match(refused.body.error, /No payment session was created/)
  assert.equal(stripe.sessions.length, UID_LIMIT, 'a refused call opened a session')
})

test('another account on another address is not affected by the first being limited', async () => {
  world()
  for (let i = 0; i <= UID_LIMIT; i += 1) await call('t0', '198.51.100.7')
  assert.equal((await call('t0', '198.51.100.7')).statusCode, 429)
  assert.equal((await call('t1', '203.0.113.50')).statusCode, 200)
})

test('many accounts from one address are stopped by the address limit', async () => {
  const { stripe } = world()
  for (let i = 0; i < IP_LIMIT; i += 1) {
    assert.equal((await call(`t${i}`)).statusCode, 200, `account ${i + 1} of ${IP_LIMIT} from one address must be allowed`)
  }
  const refused = await call(`t${IP_LIMIT}`)
  assert.equal(refused.statusCode, 429, 'a new account from the same address must be refused')
  assert.equal(stripe.sessions.length, IP_LIMIT)
  assert.equal((await call('t59', '203.0.113.99')).statusCode, 200, 'a different address is unaffected')
})

test('the window rolls: the allowance returns after an hour', async () => {
  const { db } = world()
  const t0 = 1_800_000_000_000
  for (let i = 0; i < UID_LIMIT; i += 1) assert.equal(await checkoutRateLimit(db, { uid: 'u0', ip: '1.1.1.1', now: t0 }), null)
  const refused = await checkoutRateLimit(db, { uid: 'u0', ip: '1.1.1.1', now: t0 + 1000 })
  assert.ok(refused && refused.retryAfter > 0)
  assert.equal(await checkoutRateLimit(db, { uid: 'u0', ip: '1.1.1.1', now: t0 + CHECKOUT_LIMITS.perUid.windowMs }), null)
})

test('a call refused for the account does not use up the shared address allowance', async () => {
  const { db } = world()
  const t0 = 1_800_000_000_000
  for (let i = 0; i < UID_LIMIT + 5; i += 1) await checkoutRateLimit(db, { uid: 'u0', ip: '1.1.1.1', now: t0 })
  const ipDoc = [...db.docs.entries()].find(([k]) => k.startsWith('rate-limits/checkout-ip_'))
  assert.equal(ipDoc[1].count, UID_LIMIT, 'refused calls were counted against the address')
})

test('an unsigned or invalid call is a 401 and is not counted', async () => {
  const { db } = world()
  const res = await call('not-a-token')
  assert.equal(res.statusCode, 401)
  assert.deepEqual([...db.docs.keys()].filter((k) => k.startsWith('rate-limits/')), [])
})
