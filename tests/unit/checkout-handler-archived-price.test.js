// Checkout refuses an archived price, driven through the real handler.
//
// When the configured STRIPE_PRICE_* id has been archived and Stripe has no
// active price under the interval's lookup key, the handler must answer 503
// and create nothing: no Stripe customer, no checkout session. When an active
// lookup-key price exists it is the one sold. Only outside services are
// replaced: the Stripe client's methods and the Firebase token check and
// Firestore are stubbed on the real instances; the handler and its helpers run
// as shipped. The clock moves on between tests so the handler's price cache
// cannot carry a result from one to the next.
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import handler from '../../api/create-checkout.js'
import { adminAuth, adminDb } from '../../api/_lib/firebase-admin.js'
import { getStripeServer } from '../../api/_lib/stripe.js'
import { LOOKUP_KEYS, PRICE_ENV_KEYS } from '../../api/_lib/pricing.js'

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: 'service_account',
  project_id: 'unit-test-project',
  private_key: privateKey,
  client_email: 'unit-test@unit-test-project.iam.gserviceaccount.com',
})
process.env.STRIPE_SECRET_KEY = 'sk_test_unit_only_not_a_real_key'

const TEN_MINUTES = 10 * 60 * 1000
let clock = 1_800_000_000_000

const price = (id, overrides = {}) => ({
  id,
  active: true,
  recurring: { interval: 'month', interval_count: 1 },
  ...overrides,
})

// `honoursActiveFilter: false` models a list that returns an archived price even
// though `active: true` was asked for, so the handler's own check is tested.
function setup(t, { configured, prices = {}, lookup = {}, honoursActiveFilter = true }) {
  clock += TEN_MINUTES
  t.mock.method(Date, 'now', () => clock)
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'warn', () => {})

  const saved = {}
  for (const key of Object.values(PRICE_ENV_KEYS)) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  if (configured) process.env[PRICE_ENV_KEYS.monthly] = configured
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  const calls = { customersCreate: [], sessionsCreate: [], retrieve: [], list: [] }
  const stripe = getStripeServer()
  t.mock.method(stripe.prices, 'retrieve', async (id) => {
    calls.retrieve.push(id)
    if (!prices[id]) throw Object.assign(new Error(`No such price: '${id}'`), { type: 'StripeInvalidRequestError' })
    return prices[id]
  })
  t.mock.method(stripe.prices, 'list', async (params) => {
    calls.list.push(params)
    const found = lookup[params.lookup_keys[0]]
    return { data: found && (!honoursActiveFilter || !params.active || found.active) ? [found] : [] }
  })
  t.mock.method(stripe.customers, 'create', async (params) => {
    calls.customersCreate.push(params)
    return { id: 'cus_new' }
  })
  t.mock.method(stripe.checkout.sessions, 'create', async (params) => {
    calls.sessionsCreate.push(params)
    return { client_secret: 'cs_secret_test' }
  })

  t.mock.method(adminAuth(), 'verifyIdToken', async () => ({ uid: 'uid_1', email: 'person@example.com', email_verified: true }))
  const db = adminDb()
  const userDoc = { get: async () => ({ exists: false, data: () => undefined }) }
  t.mock.method(db, 'collection', () => ({ doc: () => userDoc }))
  t.mock.method(db, 'runTransaction', async (fn) => fn({
    get: async () => ({ data: () => undefined }),
    set() {},
  }))
  return calls
}

async function checkout(body = { interval: 'monthly', currency: 'usd' }) {
  const res = {
    statusCode: null,
    body: undefined,
    headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(payload) { res.body = payload; return res },
    end() { return res },
  }
  await handler({ method: 'POST', headers: { authorization: 'Bearer test-token', 'x-forwarded-for': '198.51.100.20' }, body }, res)
  return res
}

test('an archived configured price with no active lookup price is refused with a 503 and nothing is created', async (t) => {
  const calls = setup(t, {
    configured: 'price_archived',
    prices: { price_archived: price('price_archived', { active: false }) },
  })
  const res = await checkout()
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /monthly price is temporarily unavailable/)
  assert.match(res.body.error, /No payment session was created/)
  assert.equal(calls.customersCreate.length, 0, 'a Stripe customer was created for a refused checkout')
  assert.equal(calls.sessionsCreate.length, 0, 'a checkout session was created on an archived price')
  assert.deepEqual(calls.retrieve, ['price_archived'])
  assert.equal(calls.list[0].active, true, 'the fallback lookup must ask for an active price only')
})

test('an archived configured price is replaced by the active lookup-key price in the session', async (t) => {
  const calls = setup(t, {
    configured: 'price_archived',
    prices: { price_archived: price('price_archived', { active: false }) },
    lookup: { [LOOKUP_KEYS.monthly]: price('price_live') },
  })
  const res = await checkout()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.clientSecret, 'cs_secret_test')
  assert.equal(calls.sessionsCreate.length, 1)
  assert.deepEqual(calls.sessionsCreate[0].line_items, [{ price: 'price_live', quantity: 1 }])
  assert.equal(JSON.stringify(calls.sessionsCreate).includes('price_archived'), false,
    'the archived price id reached the session')
})

test('with no configured price and only an archived lookup-key price, checkout is refused', async (t) => {
  const calls = setup(t, {
    lookup: { [LOOKUP_KEYS.monthly]: price('price_old', { active: false }) },
    honoursActiveFilter: false,
  })
  const res = await checkout()
  assert.equal(res.statusCode, 503)
  assert.equal(calls.customersCreate.length, 0)
  assert.equal(calls.sessionsCreate.length, 0)
})

test('an active configured price opens a session on that price', async (t) => {
  const calls = setup(t, {
    configured: 'price_ok',
    prices: { price_ok: price('price_ok') },
  })
  const res = await checkout()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(calls.sessionsCreate[0].line_items, [{ price: 'price_ok', quantity: 1 }])
  assert.equal(calls.list.length, 0, 'an active configured price needs no lookup')
  assert.equal(calls.customersCreate.length, 1, 'the control request should reach customer creation')
})
