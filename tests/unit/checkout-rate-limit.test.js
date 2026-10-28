// CREATE-CHECKOUT IS RATE-LIMITED PER ACCOUNT AND PER ADDRESS (security audit H1,
// code part).
//
// A free account costs nothing to make, and every checkout call can create a
// Stripe customer and a Checkout session. The route now counts each signed-in
// call against 10 an hour per account and 60 an hour per address, using the same
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
function world(accounts = 80) {
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
  assert.equal((await call('t79', '203.0.113.99')).statusCode, 200, 'a different address is unaffected')
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

/* ── Fix round 2: items 2 and 9 ───────────────────────────────────────────── */

async function callWith({ bearer = 't0', headers = {}, body = { interval: 'monthly', currency: 'usd' } } = {}) {
  const res = fakeRes()
  await checkout({ method: 'POST', headers: { authorization: `Bearer ${bearer}`, ...headers }, body }, res)
  return res
}

const rateDocs = (db) => [...db.docs.keys()].filter((k) => k.startsWith('rate-limits/'))

test('the per-address allowance is 60 an hour and the per-account one stays 10', () => {
  assert.equal(CHECKOUT_LIMITS.perIp.limit, 60)
  assert.equal(CHECKOUT_LIMITS.perUid.limit, 10)
})

test('a malformed body is a 400 and does not use up the buyer\'s allowance', async () => {
  const { db, stripe } = world()
  for (let i = 0; i < UID_LIMIT + 3; i += 1) {
    const bad = await callWith({ headers: { 'x-forwarded-for': '198.51.100.7' }, body: { interval: 'fortnightly', currency: 'usd' } })
    assert.equal(bad.statusCode, 400)
  }
  const badCurrency = await callWith({ headers: { 'x-forwarded-for': '198.51.100.7' }, body: { interval: 'monthly', currency: 'zzz' } })
  assert.equal(badCurrency.statusCode, 400)
  assert.deepEqual(rateDocs(db), [], 'a refused body was counted')
  assert.equal((await callWith({ headers: { 'x-forwarded-for': '198.51.100.7' } })).statusCode, 200, 'the buyer still has the whole allowance')
  assert.equal(stripe.sessions.length, 1)
})

test('a request with no address is refused, nothing is counted and no session is made', async () => {
  const { db, stripe } = world()
  const res = await callWith({ headers: {} })
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /No payment session was created/)
  assert.deepEqual(rateDocs(db), [], 'a refused request was counted')
  assert.equal(stripe.sessions.length, 0)
})

test('x-vercel-forwarded-for is the address that is limited, not a spoofable x-forwarded-for', async () => {
  const { db } = world()
  await callWith({ bearer: 't0', headers: { 'x-vercel-forwarded-for': '203.0.113.5', 'x-forwarded-for': '1.1.1.1' } })
  await callWith({ bearer: 't1', headers: { 'x-vercel-forwarded-for': '203.0.113.5', 'x-forwarded-for': '2.2.2.2' } })
  const ipDocs = [...db.docs.entries()].filter(([k]) => k.startsWith('rate-limits/checkout-ip_'))
  assert.equal(ipDocs.length, 1, 'two different x-forwarded-for values split one real address into two buckets')
  assert.equal(ipDocs[0][1].count, 2)
})

test('a counter that cannot be updated under contention is a 429, not a free checkout', async () => {
  const { db, stripe } = world()
  const aborted = Object.assign(new Error('aborted'), { code: 10 })
  db.runTransaction = async () => { throw aborted }
  const res = await callWith({ headers: { 'x-forwarded-for': '198.51.100.7' } })
  assert.equal(res.statusCode, 429)
  assert.ok(Number(res.headers['Retry-After']) >= 1)
  assert.equal(stripe.sessions.length, 0)
})
