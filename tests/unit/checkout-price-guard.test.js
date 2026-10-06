// Checkout only sells a price Stripe reports as active for the interval.
//
// A STRIPE_PRICE_* value can point at a price that has since been archived, or
// at a price for the wrong interval. The price list (api/get-prices.js) already
// skips such a price and shows the lookup-key price instead; checkout must pick
// the same price, and must answer "unavailable" rather than open a session on a
// price Stripe would reject. Stripe is mocked; no network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { LOOKUP_KEYS, PRICE_ENV_KEYS, priceIsSellable } from '../../api/_lib/pricing.js'
import { PRICE_CACHE_TTL_MS, resolvePrice } from '../../api/create-checkout.js'

const NOW = 1_800_000_000_000

const price = (id, overrides = {}) => ({
  id,
  active: true,
  recurring: { interval: 'month', interval_count: 1 },
  ...overrides,
})

// A Stripe double: `prices` maps id → price for retrieve; `lookup` maps a
// lookup key → the price list() returns for it.
function fakeStripe({ prices = {}, lookup = {}, retrieveError = null, listError = null } = {}) {
  const calls = { retrieve: [], list: [] }
  return {
    calls,
    prices: {
      async retrieve(id) {
        calls.retrieve.push(id)
        if (retrieveError) throw retrieveError
        if (!prices[id]) throw Object.assign(new Error(`No such price: '${id}'`), { type: 'StripeInvalidRequestError' })
        return prices[id]
      },
      async list(params) {
        calls.list.push(params)
        if (listError) throw listError
        const found = lookup[params.lookup_keys[0]]
        // Stripe applies the `active` filter itself.
        return { data: found && (!params.active || found.active) ? [found] : [] }
      },
    },
  }
}

const quiet = (t) => t.mock.method(console, 'error', () => {})
const env = (interval, id) => ({ [PRICE_ENV_KEYS[interval]]: id })

test('an active configured price is used as given, with no lookup', async () => {
  const stripe = fakeStripe({ prices: { price_env: price('price_env') } })
  const id = await resolvePrice(stripe, 'monthly', { env: env('monthly', 'price_env'), cache: new Map(), now: NOW })
  assert.equal(id, 'price_env')
  assert.deepEqual(stripe.calls.retrieve, ['price_env'])
  assert.equal(stripe.calls.list.length, 0)
})

test('an inactive configured price is never sold — the lookup-key price is', async (t) => {
  quiet(t)
  const stripe = fakeStripe({
    prices: { price_archived: price('price_archived', { active: false }) },
    lookup: { [LOOKUP_KEYS.monthly]: price('price_live') },
  })
  const id = await resolvePrice(stripe, 'monthly', { env: env('monthly', 'price_archived'), cache: new Map(), now: NOW })
  assert.equal(id, 'price_live')
  assert.equal(stripe.calls.list[0].active, true, 'the fallback must ask Stripe for an active price only')
})

test('an inactive configured price with no live lookup price is unavailable, not an error', async (t) => {
  quiet(t)
  const stripe = fakeStripe({ prices: { price_archived: price('price_archived', { active: false }) } })
  const id = await resolvePrice(stripe, 'yearly', { env: env('yearly', 'price_archived'), cache: new Map(), now: NOW })
  assert.equal(id, null)
})

test('a configured price on the wrong recurrence is not sold for that interval', async (t) => {
  quiet(t)
  const stripe = fakeStripe({
    prices: { price_monthly: price('price_monthly') },
    lookup: { [LOOKUP_KEYS.yearly]: price('price_yearly', { recurring: { interval: 'year', interval_count: 1 } }) },
  })
  assert.equal(await resolvePrice(stripe, 'yearly', { env: env('yearly', 'price_monthly'), cache: new Map(), now: NOW }), 'price_yearly')
})

test('a configured price Stripe cannot find falls back, and a failed lookup is unavailable', async (t) => {
  quiet(t)
  const missing = fakeStripe({ lookup: { [LOOKUP_KEYS.quarterly]: price('price_q', { recurring: { interval: 'month', interval_count: 3 } }) } })
  assert.equal(await resolvePrice(missing, 'quarterly', { env: env('quarterly', 'price_gone'), cache: new Map(), now: NOW }), 'price_q')

  const down = fakeStripe({ retrieveError: new Error('Stripe is down'), listError: new Error('Stripe is down') })
  assert.equal(await resolvePrice(down, 'monthly', { env: env('monthly', 'price_env'), cache: new Map(), now: NOW }), null)
})

test('with no configured price, the lookup key decides, as before', async () => {
  const stripe = fakeStripe({ lookup: { [LOOKUP_KEYS.monthly]: price('price_live') } })
  assert.equal(await resolvePrice(stripe, 'monthly', { env: {}, cache: new Map(), now: NOW }), 'price_live')
  assert.equal(stripe.calls.retrieve.length, 0)
  assert.equal(await resolvePrice(fakeStripe(), 'monthly', { env: {}, cache: new Map(), now: NOW }), null)
})

test('the resolved price is cached briefly, and re-checked once the cache lapses', async (t) => {
  quiet(t)
  const prices = { price_env: price('price_env') }
  const stripe = fakeStripe({ prices, lookup: { [LOOKUP_KEYS.monthly]: price('price_live') } })
  const cache = new Map()
  const opts = (now) => ({ env: env('monthly', 'price_env'), cache, now })

  assert.equal(await resolvePrice(stripe, 'monthly', opts(NOW)), 'price_env')
  assert.equal(await resolvePrice(stripe, 'monthly', opts(NOW + PRICE_CACHE_TTL_MS - 1)), 'price_env')
  assert.equal(stripe.calls.retrieve.length, 1, 'a cached price was re-read from Stripe')

  // The price is archived in Stripe while cached. After the TTL it is re-read,
  // found inactive, and the lookup-key price is sold instead.
  prices.price_env = price('price_env', { active: false })
  assert.equal(await resolvePrice(stripe, 'monthly', opts(NOW + PRICE_CACHE_TTL_MS)), 'price_live')
  assert.equal(stripe.calls.retrieve.length, 2)
})

test('an unresolvable price is not cached, so fixing the configuration takes effect at once', async (t) => {
  quiet(t)
  const lookup = {}
  const stripe = fakeStripe({ lookup })
  const cache = new Map()
  assert.equal(await resolvePrice(stripe, 'monthly', { env: {}, cache, now: NOW }), null)
  lookup[LOOKUP_KEYS.monthly] = price('price_live')
  assert.equal(await resolvePrice(stripe, 'monthly', { env: {}, cache, now: NOW + 1 }), 'price_live')
})

test('priceIsSellable: active, and on the interval\'s recurrence', () => {
  const quarterly = { recurring: { interval: 'month', interval_count: 3 } }
  assert.equal(priceIsSellable(price('p'), 'monthly'), true)
  assert.equal(priceIsSellable(price('p', quarterly), 'quarterly'), true)
  assert.equal(priceIsSellable(price('p', { active: false }), 'monthly'), false)
  assert.equal(priceIsSellable(price('p'), 'yearly'), false)
  assert.equal(priceIsSellable(price('p', { recurring: { interval: 'year', interval_count: 1 } }), 'yearly'), true)
  assert.equal(priceIsSellable(price('p', { recurring: { interval: 'year', interval_count: 2 } }), 'yearly'), false)
  assert.equal(priceIsSellable(price('p', { recurring: null }), 'monthly'), false)
  assert.equal(priceIsSellable(null, 'monthly'), false)
  assert.equal(priceIsSellable(price('p'), 'weekly'), false)
})

// Monthly and quarterly share the 'month' unit; only interval_count tells them apart.
test('priceIsSellable: a monthly price is not sellable as quarterly', () => {
  assert.equal(priceIsSellable(price('p'), 'quarterly'), false)
})

test('priceIsSellable: a quarterly price is not sellable as monthly', () => {
  assert.equal(priceIsSellable(price('p', { recurring: { interval: 'month', interval_count: 3 } }), 'monthly'), false)
})

test('a monthly price configured for quarterly is not sold as quarterly', async (t) => {
  quiet(t)
  const stripe = fakeStripe({ prices: { price_monthly: price('price_monthly') } })
  assert.equal(await resolvePrice(stripe, 'quarterly', { env: env('quarterly', 'price_monthly'), cache: new Map(), now: NOW }), null)
})

test('the price list and checkout choose prices by the same rule', () => {
  const prices = stripComments(read('api/get-prices.js'))
  assert.match(prices, /priceIsSellable\(price, interval\)/)
  assert.doesNotMatch(prices, /function priceMatchesInterval/, 'get-prices has its own copy of the rule again')

  const checkout = stripComments(read('api/create-checkout.js'))
  const handler = checkout.slice(checkout.indexOf('export default async function handler'))
  assert.match(handler, /const priceId = await resolvePrice\(stripe, interval\)\s*if \(!priceId\) \{[\s\S]*?status\(503\)/,
    'an unresolved price must answer with the unavailable response')
})
