// Checkout never sells a price whose product has been archived, and a price that
// stops being sellable after it was cached is reported as unavailable (503), not
// as a generic failure (500).
//
// These run the real create-checkout and get-prices handlers. Only things outside
// our code are replaced: Firebase's token check and Firestore (a service account
// generated here, so the Admin SDK initialises offline, then its token verifier
// and database swapped for doubles), and the methods on the Stripe client that
// would reach the network. No request leaves the process.
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import Stripe from 'stripe'
import { memoryDb } from './helpers/memory-firestore.js'

// Must be set before the API modules are imported: the Admin SDK reads its
// credential on first use.
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: 'service_account',
  project_id: 'demo-checkout-test',
  private_key: privateKey,
  client_email: 'checkout-test@demo-checkout-test.iam.gserviceaccount.com',
})
process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key'

const { adminAuth, adminDb } = await import('../../api/_lib/firebase-admin.js')
const { getStripeServer } = await import('../../api/_lib/stripe.js')
const { DEFAULT_PRICES, LOOKUP_KEYS, PRICE_ENV_KEYS, priceIsSellable } = await import('../../api/_lib/pricing.js')
const { default: checkout, forgetCachedPrice, isUnsellablePriceError, resolvePrice } = await import('../../api/create-checkout.js')
const { default: getPrices } = await import('../../api/get-prices.js')

// This file has its own process: start with no price configured, whatever the
// machine running it has set.
for (const key of Object.values(PRICE_ENV_KEYS)) delete process.env[key]

// ── Fixtures ─────────────────────────────────────────────────────────────────
const MONTHLY = { interval: 'month', interval_count: 1 }
const YEARLY = { interval: 'year', interval_count: 1 }

const price = (id, { product = { id: 'prod_1', active: true }, recurring = MONTHLY, ...rest } = {}) => ({
  id, active: true, product, recurring, currency: 'usd', unit_amount: 700, ...rest,
})
const archivedProduct = { id: 'prod_1', active: false }

const unsellable = (message = 'The price specified is inactive. This field only accepts active prices.') =>
  Stripe.errors.StripeError.generate({
    type: 'invalid_request_error', message, param: 'line_items[0][price]', code: 'resource_missing',
  })

function fakeRes() {
  const res = {
    statusCode: null, body: undefined, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
    end() { return res },
  }
  return res
}

/**
 * Wire the shared clients to doubles for one test and put everything back after.
 * `prices` maps id -> price (retrieve); `lookup` maps lookup key -> price (list).
 * `createSession` is the checkout.sessions.create implementation.
 */
function setup(t, { prices = {}, lookup = {}, createSession = async () => ({ client_secret: 'cs_secret_1' }) } = {}) {
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'warn', () => {})
  const stripe = getStripeServer()
  const calls = { retrieve: [], list: [], sessions: [], customers: [] }

  t.mock.method(stripe.prices, 'retrieve', async (id, params) => {
    calls.retrieve.push([id, params])
    if (!prices[id]) throw Object.assign(new Error(`No such price: '${id}'`), { type: 'StripeInvalidRequestError' })
    return structuredClone(prices[id])
  })
  t.mock.method(stripe.prices, 'list', async (params) => {
    calls.list.push(params)
    const found = lookup[params.lookup_keys[0]]
    return { data: found && (!params.active || found.active) ? [structuredClone(found)] : [] }
  })
  t.mock.method(stripe.checkout.sessions, 'create', async (params) => {
    calls.sessions.push(structuredClone(params))
    return createSession(params)
  })
  t.mock.method(stripe.customers, 'create', async (params) => {
    calls.customers.push(params)
    return { id: 'cus_new' }
  })

  const db = memoryDb()
  t.mock.method(adminAuth(), 'verifyIdToken', async () => ({ uid: 'uid_1', email: 'person@example.test' }))
  t.mock.method(adminDb(), 'collection', db.collection)
  t.mock.method(adminDb(), 'runTransaction', db.runTransaction)

  // A test sets the price env vars it needs before calling setup; the cache and
  // the vars are cleared again afterwards.
  forgetCachedPrice('*')
  t.after(() => {
    forgetCachedPrice('*')
    for (const key of Object.values(PRICE_ENV_KEYS)) delete process.env[key]
  })
  return { calls, db }
}

const startCheckout = async (interval = 'monthly', extra = {}) => {
  const res = fakeRes()
  await checkout({
    method: 'POST',
    headers: { authorization: 'Bearer test-token', host: 'localhost' },
    body: { interval, ...extra },
  }, res)
  return res
}

// ─────────────────────────────────────────────────────────────────────────────
// The rule
// ─────────────────────────────────────────────────────────────────────────────
test('a price on an active product is sellable', () => {
  assert.equal(priceIsSellable(price('p'), 'monthly'), true)
  assert.equal(priceIsSellable(price('p', { recurring: YEARLY }), 'yearly'), true)
})

test('a price on an archived product is not sellable', () => {
  assert.equal(priceIsSellable(price('p', { product: archivedProduct }), 'monthly'), false)
})

test('a price whose product was not expanded cannot be checked, so it is not sellable', () => {
  assert.equal(priceIsSellable(price('p', { product: 'prod_1' }), 'monthly'), false)
  assert.equal(priceIsSellable(price('p', { product: null }), 'monthly'), false)
  const missing = price('p')
  delete missing.product
  assert.equal(priceIsSellable(missing, 'monthly'), false)
  assert.equal(priceIsSellable(price('p', { product: { id: 'prod_1', deleted: true } }), 'monthly'), false)
})

test('an archived product is refused even when the price is otherwise right', () => {
  const noProductCheck = price('p', { product: { id: 'prod_1', active: false } })
  assert.equal(noProductCheck.active, true)
  assert.deepEqual(noProductCheck.recurring, MONTHLY)
  assert.equal(priceIsSellable(noProductCheck, 'monthly'), false)
})

// ─────────────────────────────────────────────────────────────────────────────
// resolvePrice asks Stripe for the product
// ─────────────────────────────────────────────────────────────────────────────
test('the configured price is read with its product expanded', async (t) => {
  const { calls } = setup(t, { prices: { price_env: price('price_env') } })
  const id = await resolvePrice(getStripeServer(), 'monthly', { env: { [PRICE_ENV_KEYS.monthly]: 'price_env' }, cache: new Map(), now: 1 })
  assert.equal(id, 'price_env')
  assert.deepEqual(calls.retrieve, [['price_env', { expand: ['product'] }]])
})

test('the lookup-key price is listed with its product expanded', async (t) => {
  const { calls } = setup(t, { lookup: { [LOOKUP_KEYS.monthly]: price('price_lookup') } })
  const id = await resolvePrice(getStripeServer(), 'monthly', { env: {}, cache: new Map(), now: 1 })
  assert.equal(id, 'price_lookup')
  assert.equal(calls.list.length, 1)
  assert.deepEqual(calls.list[0].expand, ['data.product'])
})

test('a configured price on an archived product gives way to a sellable lookup-key price', async (t) => {
  setup(t, {
    prices: { price_env: price('price_env', { product: archivedProduct }) },
    lookup: { [LOOKUP_KEYS.monthly]: price('price_lookup') },
  })
  const id = await resolvePrice(getStripeServer(), 'monthly', { env: { [PRICE_ENV_KEYS.monthly]: 'price_env' }, cache: new Map(), now: 1 })
  assert.equal(id, 'price_lookup')
})

test('with every candidate on an archived product there is no price', async (t) => {
  setup(t, {
    prices: { price_env: price('price_env', { product: archivedProduct }) },
    lookup: { [LOOKUP_KEYS.monthly]: price('price_lookup', { product: archivedProduct }) },
  })
  const cache = new Map()
  assert.equal(await resolvePrice(getStripeServer(), 'monthly', { env: { [PRICE_ENV_KEYS.monthly]: 'price_env' }, cache, now: 1 }), null)
  assert.equal(cache.size, 0, 'an unsellable price is never cached')
})

// ─────────────────────────────────────────────────────────────────────────────
// The checkout handler
// ─────────────────────────────────────────────────────────────────────────────
test('a price on an active product opens a session', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  const { calls } = setup(t, { prices: { price_env: price('price_env') } })
  const res = await startCheckout('monthly')

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.clientSecret, 'cs_secret_1')
  assert.equal(calls.sessions.length, 1)
  assert.deepEqual(calls.sessions[0].line_items, [{ price: 'price_env', quantity: 1 }])
  assert.equal(calls.customers.length, 1, 'the control reaches customer creation, so the refusals below are the guard working')
})

test('a configured price on an archived product answers 503 and creates nothing', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  const { calls } = setup(t, { prices: { price_env: price('price_env', { product: archivedProduct }) } })
  const res = await startCheckout('monthly')

  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /monthly price is temporarily unavailable/)
  assert.match(res.body.error, /No payment session was created/)
  assert.equal(calls.customers.length, 0, 'no Stripe customer is created')
  assert.equal(calls.sessions.length, 0, 'no checkout session is created')
})

test('a lookup-key price on an archived product answers 503 and creates nothing', async (t) => {
  const { calls } = setup(t, { lookup: { [LOOKUP_KEYS.yearly]: price('price_year', { product: archivedProduct, recurring: YEARLY }) } })
  const res = await startCheckout('yearly')

  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /No payment session was created/)
  assert.equal(calls.customers.length, 0)
  assert.equal(calls.sessions.length, 0)
})

test('a price whose product comes back unexpanded answers 503 and creates nothing', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  const { calls } = setup(t, { prices: { price_env: price('price_env', { product: 'prod_1' }) } })
  const res = await startCheckout('monthly')

  assert.equal(res.statusCode, 503)
  assert.equal(calls.customers.length, 0)
  assert.equal(calls.sessions.length, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// A price that was sellable when cached and is refused by Stripe now
// ─────────────────────────────────────────────────────────────────────────────
test('a cached price Stripe now refuses answers 503, not 500, and is re-checked next time', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  let archived = false
  const prices = { price_env: price('price_env') }
  const { calls } = setup(t, {
    prices,
    createSession: async () => {
      if (archived) throw unsellable()
      return { client_secret: 'cs_secret_1' }
    },
  })

  // 1. The first checkout resolves the price from Stripe and caches it.
  assert.equal((await startCheckout('monthly')).statusCode, 200)
  assert.equal(calls.retrieve.length, 1)

  // 2. The product is archived in Stripe. The cache still holds the price, so
  //    Stripe is not asked about it; the session create is what refuses it.
  archived = true
  const refused = await startCheckout('monthly')
  assert.equal(calls.retrieve.length, 1, 'the second request used the cached price')
  assert.equal(calls.sessions.length, 2, 'the session create was attempted and rejected')
  assert.equal(refused.statusCode, 503)
  assert.equal(refused.body.error, 'The monthly price is temporarily unavailable. No payment session was created.')
  assert.match(refused.body.correlationId, /^[0-9a-z]+$/, 'the 503 carries the reference id the server log is filed under')

  // 3. The cache entry was dropped, so the next request asks Stripe again, finds
  //    the product archived, and never reaches the session create.
  prices.price_env = price('price_env', { product: archivedProduct })
  const next = await startCheckout('monthly')
  assert.equal(calls.retrieve.length, 2, 'Stripe was asked again after the entry was dropped')
  assert.equal(calls.sessions.length, 2, 'no further session create after the re-check')
  assert.equal(next.statusCode, 503)
})

test('a refused price answers 503 on the first attempt, even when a currency was sent, and is not retried', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  const { calls } = setup(t, {
    prices: { price_env: price('price_env') },
    createSession: async () => { throw unsellable() },
  })
  const res = await startCheckout('monthly', { currency: 'eur' })

  assert.equal(res.statusCode, 503)
  assert.equal(res.body.error, 'The monthly price is temporarily unavailable. No payment session was created.')
  assert.equal(calls.sessions.length, 1, 'a session is never retried without the currency the buyer was shown')
  assert.equal(calls.sessions[0].currency, 'eur')
})

test('a currency the customer is locked out of is refused with 409, not mistaken for an unsellable price', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  let locked = false
  const { calls } = setup(t, {
    prices: { price_env: price('price_env') },
    createSession: async (params) => {
      if (locked && params.currency) {
        throw Stripe.errors.StripeError.generate({
          type: 'invalid_request_error', param: 'currency', message: 'You cannot combine currencies on a single customer.',
        })
      }
      return { client_secret: 'cs_secret_1' }
    },
  })
  assert.equal((await startCheckout('monthly')).statusCode, 200)

  locked = true
  const res = await startCheckout('monthly', { currency: 'eur' })
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /can't be opened in EUR/)
  assert.equal(calls.sessions.length, 2, 'one earlier success and the refused attempt, with no retry in another currency')

  // The price itself is fine, so it stays cached.
  locked = false
  assert.equal((await startCheckout('monthly')).statusCode, 200)
  assert.equal(calls.retrieve.length, 1, 'the cached price was kept')
})

test('a price that turns inactive after being cached answers 503 with a reference id even when a currency was sent', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  let archived = false
  const prices = { price_env: price('price_env') }
  const { calls } = setup(t, {
    prices,
    createSession: async () => {
      if (archived) throw unsellable()
      return { client_secret: 'cs_secret_1' }
    },
  })

  assert.equal((await startCheckout('monthly')).statusCode, 200)
  assert.equal(calls.retrieve.length, 1)

  archived = true
  const refused = await startCheckout('monthly', { currency: 'eur' })
  assert.equal(refused.statusCode, 503)
  assert.equal(refused.body.error, 'The monthly price is temporarily unavailable. No payment session was created.')
  assert.match(refused.body.correlationId, /^[0-9a-z]+$/)
  assert.equal(calls.sessions.length, 2, 'one earlier success, then the single refused attempt')

  // The entry is gone: the next request asks Stripe again and stops at the guard.
  prices.price_env = price('price_env', { product: archivedProduct })
  assert.equal((await startCheckout('monthly')).statusCode, 503)
  assert.equal(calls.retrieve.length, 2, 'Stripe was asked about the price again')
  assert.equal(calls.sessions.length, 2)
})

test('an error that mentions the price but not that it is inactive stays a 500 and keeps the cached price', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  const errors = {
    'a price param with no resource_missing code': { param: 'line_items[0][price]', message: 'The price currency does not match the customer.' },
  }
  for (const [name, fields] of Object.entries(errors)) {
    let broken = false
    const { calls } = setup(t, {
      prices: { price_env: price('price_env') },
      createSession: async () => {
        if (broken) throw Stripe.errors.StripeError.generate({ type: 'invalid_request_error', ...fields })
        return { client_secret: 'cs_secret_1' }
      },
    })

    assert.equal((await startCheckout('monthly')).statusCode, 200, name)
    broken = true
    const failed = await startCheckout('monthly')
    assert.equal(failed.statusCode, 500, name)
    assert.match(failed.body.error, /No payment was taken/, name)

    broken = false
    assert.equal((await startCheckout('monthly')).statusCode, 200, name)
    assert.equal(calls.retrieve.length, 1, `${name}: the cached price was kept`)
  }
})

test('forgetCachedPrice drops one interval, everything on "*", and nothing on a missing interval', () => {
  const filled = () => new Map([['monthly', 'price_m'], ['yearly', 'price_y']])

  const one = filled()
  forgetCachedPrice('monthly', one)
  assert.deepEqual([...one.keys()], ['yearly'])

  const all = filled()
  forgetCachedPrice('*', all)
  assert.equal(all.size, 0)

  for (const missing of [undefined, null, '', 'weekly']) {
    const untouched = filled()
    forgetCachedPrice(missing, untouched)
    assert.deepEqual([...untouched.keys()], ['monthly', 'yearly'], `interval ${JSON.stringify(missing)}`)
  }
})

test('a failure that is not about the price stays a 500 and keeps the cached price', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  let down = false
  const { calls } = setup(t, {
    prices: { price_env: price('price_env') },
    createSession: async () => {
      if (down) throw Stripe.errors.StripeError.generate({ type: 'api_error', message: 'An unknown error occurred' })
      return { client_secret: 'cs_secret_1' }
    },
  })

  assert.equal((await startCheckout('monthly')).statusCode, 200)
  down = true
  const failed = await startCheckout('monthly')
  assert.equal(failed.statusCode, 500)
  assert.match(failed.body.error, /No payment was taken/)

  down = false
  assert.equal((await startCheckout('monthly')).statusCode, 200)
  assert.equal(calls.retrieve.length, 1, 'an unrelated failure does not throw the cached price away')
})

test('only an invalid-request error about a price or product counts as an unsellable price', () => {
  const invalid = (extra) => Stripe.errors.StripeError.generate({ type: 'invalid_request_error', message: 'x', ...extra })
  assert.equal(isUnsellablePriceError(invalid({ param: 'line_items[0][price]', code: 'resource_missing' })), true)
  assert.equal(isUnsellablePriceError(invalid({ param: 'line_items[0][price]' })), false, 'a param that mentions price is not enough on its own')
  assert.equal(isUnsellablePriceError(invalid({ param: 'currency', code: 'resource_missing' })), false)
  assert.equal(isUnsellablePriceError(invalid({ message: 'The product is archived.' })), true)
  assert.equal(isUnsellablePriceError(invalid({ message: 'This price is no longer active.' })), true)
  assert.equal(isUnsellablePriceError(invalid({ param: 'customer', message: 'No such customer' })), false)
  assert.equal(isUnsellablePriceError(Stripe.errors.StripeError.generate({ type: 'api_error', param: 'price', message: 'price inactive' })), false)
  assert.equal(isUnsellablePriceError(new Error('The price is inactive')), false)
  assert.equal(isUnsellablePriceError(null), false)
})

// ─────────────────────────────────────────────────────────────────────────────
// The price list
// ─────────────────────────────────────────────────────────────────────────────
// get-prices keeps its own five-minute cache, keyed on Date.now(), so each test
// moves the clock on by an hour to start from an empty cache.
let clock = 1_900_000_000_000
const listPrices = async (t) => {
  clock += 3_600_000
  t.mock.method(Date, 'now', () => clock)
  const res = fakeRes()
  await getPrices({ method: 'GET', headers: {} }, res)
  return res
}

test('the price list shows the fallback for a price on an archived product', async (t) => {
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  process.env[PRICE_ENV_KEYS.yearly] = 'price_env_year'
  const { calls } = setup(t, {
    prices: {
      price_env: price('price_env', { product: archivedProduct }),
      price_env_year: price('price_env_year', { recurring: YEARLY, unit_amount: 4800 }),
    },
  })
  const res = await listPrices(t)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.availability.monthly, false)
  assert.equal(res.body.source.monthly, 'fallback')
  assert.deepEqual(res.body.monthly, DEFAULT_PRICES.monthly)
  assert.equal(res.body.availability.yearly, true, 'the other interval is unaffected')
  assert.equal(res.body.source.yearly, 'live')
  assert.deepEqual(res.body.yearly.usd, 48)
  assert.ok(calls.retrieve.every(([, params]) => params.expand.includes('product')), 'the product is asked for on every retrieve')
  assert.ok(calls.list.every((params) => params.expand.includes('data.product')), 'the product is asked for on every list')
})

test('the price list passes over an archived configured product for a sellable lookup-key price', async (t) => {
  setup(t, {
    prices: { price_env: price('price_env', { product: archivedProduct, unit_amount: 900 }) },
    lookup: { [LOOKUP_KEYS.monthly]: price('price_lookup', { unit_amount: 700 }) },
  })
  process.env[PRICE_ENV_KEYS.monthly] = 'price_env'
  const res = await listPrices(t)

  assert.equal(res.body.source.monthly, 'live')
  assert.equal(res.body.monthly.usd, 7, 'the lookup-key price is shown, not the archived one')
})

test('the price list shows the fallback for a price whose product is unexpanded', async (t) => {
  setup(t, { lookup: { [LOOKUP_KEYS.monthly]: price('price_lookup', { product: 'prod_1' }) } })
  const res = await listPrices(t)

  assert.equal(res.body.availability.monthly, false)
  assert.equal(res.body.source.monthly, 'fallback')
})

test('the price list shows a live price on an active product', async (t) => {
  setup(t, { lookup: { [LOOKUP_KEYS.monthly]: price('price_lookup', { unit_amount: 700 }) } })
  const res = await listPrices(t)

  assert.equal(res.body.availability.monthly, true)
  assert.equal(res.body.source.monthly, 'live')
  assert.equal(res.body.monthly.usd, 7)
})
