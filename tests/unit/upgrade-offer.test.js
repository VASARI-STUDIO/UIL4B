// The Pro button on the workspace and the project page prints the LIVE price
// in the visitor's own currency, or no amount at all. It never prints the USD
// fallback ladder's figure as if it were theirs (an Australian reads "$4" as A$4).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { upgradeOffer } from '../../src/components/userhome/workspace.js'
import { BILLING_INTERVALS, CURRENCY_CODES, DEFAULT_PRICES } from '../../api/_lib/pricing.js'

// The shape /api/get-prices returns (responseFromLive): a cadence Stripe has no
// price for carries the DEFAULT_PRICES table, `source: 'fallback'` and every
// currency unavailable; a live one carries Stripe's currency map.
const CADENCES = BILLING_INTERVALS
function payload(live = {}) {
  const out = { availability: {}, currencyAvailability: {}, source: {} }
  for (const cadence of CADENCES) {
    const map = live[cadence] || null
    out[cadence] = map || DEFAULT_PRICES[cadence]
    out.availability[cadence] = !!map
    out.source[cadence] = map ? 'live' : 'fallback'
    out.currencyAvailability[cadence] = Object.fromEntries(
      CURRENCY_CODES.map((c) => [c, !!map && map[c] != null]),
    )
  }
  return out
}

const LIVE = payload({
  monthly: { usd: 4.99, aud: 6.99 },
  quarterly: { usd: 13 },
  yearly: { usd: 48, aud: 59 },
})

test('live AUD prices print the cheapest per-month figure with the A$ label', () => {
  const offer = upgradeOffer({ prices: LIVE, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'Upgrade for A$4.92/mo')
  assert.equal(offer.billed, 'Billed yearly')
  assert.doesNotMatch(offer.label, /(^|[^A-Za-z])\$/, 'a bare $ is read as the visitor\'s own currency')
})

test('only a monthly price live: it is the cheapest on offer, billed monthly', () => {
  const offer = upgradeOffer({ prices: payload({ monthly: { aud: 6.99 } }), currency: 'aud', loaded: true })
  assert.equal(offer.label, 'Upgrade for A$6.99/mo')
  assert.equal(offer.billed, 'Billed monthly')
})

test('monthly live and yearly on the fallback table: the fallback figure is never offered', () => {
  // Live monthly must be dearer per month than the fallback yearly, or the fallback
  // would lose the "cheapest" pick anyway and this case could not catch it being offered.
  const prices = payload({ monthly: { usd: 9, aud: 12 } })
  assert.equal(prices.source.yearly, 'fallback')
  assert.equal(prices.yearly.aud, DEFAULT_PRICES.yearly.aud, 'fixture: the fallback table fills AUD')
  assert.ok(DEFAULT_PRICES.yearly.aud / 12 < 12,'fixture: the fallback yearly per-month figure undercuts the live monthly')
  const offer = upgradeOffer({ prices, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'Upgrade for A$12/mo')
  assert.equal(offer.billed, 'Billed monthly')
})

test('every cadence on the fallback table: no amount and no billed line', () => {
  const prices = payload()
  for (const currency of ['aud', 'usd']) {
    const offer = upgradeOffer({ prices, currency, loaded: true })
    assert.equal(offer.label, 'See Pro', currency)
    assert.equal(offer.billed, '', currency)
  }
})

test('a payload without currencyAvailability fails closed: no amount', () => {
  const { currencyAvailability: _currencyAvailability, ...bare } = LIVE
  const offer = upgradeOffer({ prices: bare, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'See Pro')
  assert.equal(offer.billed, '')
})

test('a live cadence is not offered in a currency Stripe has not priced it in', () => {
  const prices = payload({ monthly: { usd: 4.99 }, yearly: { usd: 48 } })
  prices.monthly.aud = 6.99 // an amount present while currencyAvailability.aud is false
  const offer = upgradeOffer({ prices, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'See Pro')
})

test('no prices, or prices not loaded: no amount and no billed line', () => {
  for (const args of [
    { prices: null, currency: 'aud', loaded: true },
    { prices: undefined, currency: 'aud', loaded: false },
    { prices: LIVE, currency: 'aud', loaded: false },
    {},
  ]) {
    const offer = upgradeOffer(args)
    assert.equal(offer.label, 'See Pro')
    assert.equal(offer.billed, '')
    assert.doesNotMatch(offer.label, /\d/)
  }
})

test('prices only in USD while the visitor is on AUD: no amount, never the USD figure', () => {
  const offer = upgradeOffer({ prices: payload({ monthly: { usd: 4.99 }, yearly: { usd: 48 } }), currency: 'aud', loaded: true })
  assert.equal(offer.label, 'See Pro')
  assert.equal(offer.billed, '')
})

test('the two upgrade surfaces read the live price and no longer import the frozen label', () => {
  const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
  for (const file of ['src/components/userhome/ProPanel.jsx', 'src/pages/ProjectDetail.jsx']) {
    const src = read(file)
    assert.match(src, /upgradeOffer\(/, `${file} does not use upgradeOffer`)
    assert.match(src, /usePrices/, `${file} does not read the live prices`)
    assert.doesNotMatch(src, /\bUPGRADE\b(?!_LINE)/, `${file} still reads the static UPGRADE`)
  }
  assert.doesNotMatch(read('src/components/userhome/workspace.js'), /resolvePlanLadder|cheapestPerMonth/,
    'workspace.js is back on the USD fallback ladder')
})
