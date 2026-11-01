// The price list never shows a price Stripe has archived.
//
// api/get-prices.js is driven through its real handler. An archived price (or
// one on the wrong recurrence) must be hidden: the interval falls back to the
// DEFAULT_PRICES display table, flagged `source: 'fallback'` and
// `availability: false`. An active price is returned as live. Only the Stripe
// client is replaced (its methods are stubbed on the real instance); the clock
// is pinned so the handler's five minute cache cannot carry one test into the next.
import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/get-prices.js'
import { getStripeServer } from '../../api/_lib/stripe.js'
import { DEFAULT_PRICES, LOOKUP_KEYS, PRICE_ENV_KEYS } from '../../api/_lib/pricing.js'

process.env.STRIPE_SECRET_KEY = 'sk_test_unit_only_not_a_real_key'

const TEN_MINUTES = 10 * 60 * 1000
let clock = 1_800_000_000_000

const monthlyPrice = (id, overrides = {}) => ({
  id,
  active: true,
  product: { id: 'prod_1', active: true },
  currency: 'usd',
  unit_amount: 900,
  currency_options: {},
  recurring: { interval: 'month', interval_count: 1 },
  ...overrides,
})
const yearlyPrice = (id, overrides = {}) => monthlyPrice(id, {
  unit_amount: 6000,
  recurring: { interval: 'year', interval_count: 1 },
  ...overrides,
})

// Stubs the real Stripe client's price calls. `prices` maps id -> price for
// retrieve; `lookup` maps a lookup key -> the price list() hands back.
// `honoursActiveFilter: false` models a list that returns an archived price
// even though `active: true` was asked for, so the handler's own check is tested.
function setup(t, { env = {}, prices = {}, lookup = {}, honoursActiveFilter = true, listError = null } = {}) {
  clock += TEN_MINUTES
  t.mock.method(Date, 'now', () => clock)
  t.mock.method(console, 'warn', () => {})
  const errors = []
  t.mock.method(console, 'error', (...args) => { errors.push(args) })

  const saved = {}
  for (const key of Object.values(PRICE_ENV_KEYS)) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  Object.assign(process.env, env)
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  const calls = { retrieve: [], list: [] }
  const stripe = getStripeServer()
  t.mock.method(stripe.prices, 'retrieve', async (id) => {
    calls.retrieve.push(id)
    if (!prices[id]) throw Object.assign(new Error(`No such price: '${id}'`), { type: 'StripeInvalidRequestError' })
    return prices[id]
  })
  t.mock.method(stripe.prices, 'list', async (params) => {
    calls.list.push(params)
    if (listError) throw listError
    const found = lookup[params.lookup_keys[0]]
    const visible = found && (!honoursActiveFilter || !params.active || found.active)
    return { data: visible ? [found] : [] }
  })
  return { calls, errors }
}

async function getPrices() {
  const res = {
    statusCode: null,
    body: undefined,
    headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
    end() { return res },
  }
  await handler({ method: 'GET', headers: {} }, res)
  return res
}

test('an archived configured price is hidden: the interval shows the fallback table, flagged as not live', async (t) => {
  const { calls } = setup(t, {
    env: { [PRICE_ENV_KEYS.monthly]: 'price_archived' },
    prices: { price_archived: monthlyPrice('price_archived', { active: false, unit_amount: 1234 }) },
  })
  const res = await getPrices()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.availability.monthly, false)
  assert.equal(res.body.source.monthly, 'fallback')
  assert.deepEqual(res.body.monthly, DEFAULT_PRICES.monthly)
  assert.notEqual(res.body.monthly.usd, 12.34, 'the archived price amount reached the page')
  assert.deepEqual(calls.retrieve, ['price_archived'])
})

test('an archived configured price gives way to an active lookup-key price', async (t) => {
  const { calls } = setup(t, {
    env: { [PRICE_ENV_KEYS.monthly]: 'price_archived' },
    prices: { price_archived: monthlyPrice('price_archived', { active: false, unit_amount: 1234 }) },
    lookup: { [LOOKUP_KEYS.monthly]: monthlyPrice('price_live', { unit_amount: 800 }) },
  })
  const res = await getPrices()
  assert.equal(res.body.source.monthly, 'live')
  assert.equal(res.body.availability.monthly, true)
  assert.equal(res.body.monthly.usd, 8)
  const monthlyLookup = calls.list.find((p) => p.lookup_keys[0] === LOOKUP_KEYS.monthly)
  assert.equal(monthlyLookup.active, true, 'the lookup must ask Stripe for an active price only')
})

test('an active configured price is returned as live', async (t) => {
  const { calls } = setup(t, {
    env: { [PRICE_ENV_KEYS.monthly]: 'price_ok', [PRICE_ENV_KEYS.yearly]: 'price_ok_year' },
    prices: {
      price_ok: monthlyPrice('price_ok', { unit_amount: 700, currency_options: { eur: { unit_amount: 650 } } }),
      price_ok_year: yearlyPrice('price_ok_year', { unit_amount: 4800 }),
    },
  })
  const res = await getPrices()
  assert.equal(res.body.source.monthly, 'live')
  assert.equal(res.body.source.yearly, 'live')
  assert.equal(res.body.monthly.usd, 7)
  assert.equal(res.body.monthly.eur, 6.5)
  assert.equal(res.body.yearly.usd, 48)
  assert.equal(res.body.currencyAvailability.monthly.usd, true)
  assert.equal(calls.list.length, 0, 'an active configured price needs no lookup')
})

test('an archived price returned by the lookup is still hidden', async (t) => {
  setup(t, {
    lookup: { [LOOKUP_KEYS.monthly]: monthlyPrice('price_old', { active: false, unit_amount: 999 }) },
    honoursActiveFilter: false,
  })
  const res = await getPrices()
  assert.equal(res.body.availability.monthly, false)
  assert.equal(res.body.source.monthly, 'fallback')
  assert.deepEqual(res.body.monthly, DEFAULT_PRICES.monthly)
})

test('only the archived interval falls back; the other interval stays live', async (t) => {
  setup(t, {
    env: { [PRICE_ENV_KEYS.monthly]: 'price_archived', [PRICE_ENV_KEYS.yearly]: 'price_year' },
    prices: {
      price_archived: monthlyPrice('price_archived', { active: false }),
      price_year: yearlyPrice('price_year'),
    },
  })
  const res = await getPrices()
  assert.equal(res.body.source.monthly, 'fallback')
  assert.equal(res.body.source.yearly, 'live')
  assert.equal(res.body.yearly.usd, 60)
  assert.deepEqual(res.body.monthly, DEFAULT_PRICES.monthly)
})

test('a configured price on the wrong recurrence is hidden', async (t) => {
  setup(t, {
    env: { [PRICE_ENV_KEYS.monthly]: 'price_quarter' },
    prices: {
      price_quarter: monthlyPrice('price_quarter', { recurring: { interval: 'month', interval_count: 3 } }),
    },
  })
  const res = await getPrices()
  assert.equal(res.body.availability.monthly, false)
  assert.equal(res.body.source.monthly, 'fallback')
})

test('when nothing is live the fallback is not cached, so a restored price shows at once', async (t) => {
  const stripeState = { prices: { price_env: monthlyPrice('price_env', { active: false }) } }
  const { calls } = setup(t, { env: { [PRICE_ENV_KEYS.monthly]: 'price_env' }, prices: stripeState.prices })
  const first = await getPrices()
  assert.equal(first.body.source.monthly, 'fallback')
  const retrievesAfterFirst = calls.retrieve.length

  stripeState.prices.price_env = monthlyPrice('price_env', { unit_amount: 700 })
  const second = await getPrices()
  assert.ok(calls.retrieve.length > retrievesAfterFirst, 'the second request never re-asked Stripe')
  assert.equal(second.body.source.monthly, 'live')
})

test('a Stripe failure serves the fallback table with a 200 and is logged', async (t) => {
  const { errors } = setup(t, { listError: Object.assign(new Error('Stripe is down'), { type: 'StripeAPIError' }) })
  const res = await getPrices()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.source.monthly, 'fallback')
  assert.equal(res.body.source.yearly, 'fallback')
  assert.deepEqual(res.body.yearly, DEFAULT_PRICES.yearly)
  assert.equal(errors.length, 1)
  assert.match(String(errors[0][1]?.error), /Stripe is down/)
})
