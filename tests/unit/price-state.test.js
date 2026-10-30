// priceState(): the one state every Pro button and price slot reads. Six states,
// one set of outage words, and only `live` may open a checkout.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import {
  PRICE_STATE_COPY, canCheckout, priceState, priceStateCopy, resolveOffers,
} from '../../src/config/planFacts.js'

// The /api/get-prices answer, in the shape the route sends.
function answer({ monthly = 'live', yearly = 'live', currencies = ['usd'] } = {}) {
  const amounts = (n) => Object.fromEntries(currencies.map((c) => [c, n]))
  return {
    source: { monthly, yearly },
    monthly: amounts(7),
    yearly: amounts(48),
    currencyAvailability: {
      monthly: Object.fromEntries(currencies.map((c) => [c, monthly === 'live'])),
      yearly: Object.fromEntries(currencies.map((c) => [c, yearly === 'live'])),
    },
  }
}

// What useProPrice() carries, for the fields priceState reads.
function view(prices, { loaded = true, currency = 'usd' } = {}) {
  return {
    loaded,
    currency,
    currencyLabel: currency.toUpperCase(),
    serviceAvailable: !!prices,
    source: { monthly: prices?.source?.monthly || 'unavailable', yearly: prices?.source?.yearly || 'unavailable' },
  }
}

function stateOf(prices, { loaded = true, currency = 'usd', selectedId = 'yearly', retrying = false } = {}) {
  const { offers } = resolveOffers({ prices, currency, loaded })
  return priceState({ price: view(prices, { loaded, currency }), offers, selectedId, retrying })
}

test('loading: the fetch has not settled', () => {
  assert.equal(stateOf(null, { loaded: false }), 'loading')
})

test('retrying: not settled after a Retry', () => {
  assert.equal(stateOf(null, { loaded: false, retrying: true }), 'retrying')
})

test('unreachable: the request failed, or Stripe has no live price for any cadence', () => {
  assert.equal(stateOf(null), 'unreachable')
  assert.equal(stateOf(answer({ monthly: 'fallback', yearly: 'fallback' })), 'unreachable')
})

test('no-currency: a live price exists, but not in this currency', () => {
  assert.equal(stateOf(answer({ currencies: ['usd'] }), { currency: 'aud' }), 'no-currency')
})

test('cadence-missing: the selected cadence has no price, another has', () => {
  const prices = answer({ yearly: 'fallback' })
  assert.equal(stateOf(prices, { selectedId: 'yearly' }), 'cadence-missing')
  assert.equal(stateOf(prices, { selectedId: 'monthly' }), 'live')
})

test('live: the selected cadence has an amount', () => {
  assert.equal(stateOf(answer()), 'live')
  assert.equal(stateOf(answer(), { selectedId: 'monthly' }), 'live')
})

test('only live may open a checkout', () => {
  const states = ['loading', 'retrying', 'unreachable', 'no-currency', 'cadence-missing', 'live']
  assert.deepEqual(states.filter(canCheckout), ['live'])
  assert.deepEqual(Object.keys(PRICE_STATE_COPY).sort(), [...states].sort())
})

test('no-currency never uses the unreachable words, and the outage says "Unavailable" once', () => {
  const ctx = { currencyLabel: 'AUD', selectedLabel: 'Yearly', otherLabel: 'Monthly' }
  const unreachable = priceStateCopy('unreachable', ctx)
  const noCurrency = priceStateCopy('no-currency', ctx)
  assert.notEqual(noCurrency.line1, unreachable.line1)
  assert.match(noCurrency.line1, /AUD/)
  for (const id of ['unreachable', 'no-currency', 'cadence-missing']) {
    const copy = priceStateCopy(id, ctx)
    const all = [copy.word, copy.line1, copy.line2, copy.button, copy.under].join(' ')
    assert.equal((all.match(/unavailable/gi) || []).length, 1, `${id} says "unavailable" once`)
    assert.doesNotMatch(all, /unreachable|Pricing unavailable right now/)
  }
  assert.equal(priceStateCopy('retrying', ctx).button, 'Checking Stripe…')
})

test('the three surfaces read the shared state and keep no outage words of their own', () => {
  for (const file of ['src/pages/Pricing.jsx', 'src/pages/Checkout.jsx', 'src/pages/Settings.jsx']) {
    const src = stripComments(read(file))
    assert.match(src, /priceState\(/, `${file} reads priceState`)
    assert.doesNotMatch(src, /Pricing unavailable right now|Live pricing is unreachable|Live prices didn/, `${file} has its own outage words`)
  }
})
