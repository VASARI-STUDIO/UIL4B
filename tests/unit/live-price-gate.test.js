// A price that is not live from Stripe is never shown as buyable, and a
// checkout never changes the currency the buyer was shown.
//
// /api/get-prices fills every cadence and currency, from DEFAULT_PRICES when
// Stripe has nothing, and flags the difference in `source` and
// `currencyAvailability`. These tests hold the surfaces to those flags:
//
//   1. a fallback or unavailable cadence has no amount and is not offered
//   2. the saving and the monthly price beside it only compare live prices in
//      one currency
//   3. /checkout reads its amount and note off the ladder, not a two-way ternary
//   4. a currency Stripe cannot honour is a refusal, never a retry without it
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import {
  BILLING_OPTIONS, BILLED_EVERY, priceState, resolveOffers,
} from '../../src/config/planFacts.js'
import {
  cheapestPerMonth, livePlans, livePriceOf, resolvePlanLadder, savingsVsMonthly,
} from '../../src/config/planLadder.js'
import { CURRENCY_CODES } from '../../api/_lib/pricing.js'
import { createSessionInCurrency, currencyRefusal, intervalRefusal } from '../../api/create-checkout.js'

// /api/get-prices' own answer shape, built the way api/get-prices.js builds it.
function payload({ live = {}, currencies = ['usd', 'aud'] } = {}) {
  const response = { availability: {}, currencyAvailability: {}, source: {} }
  for (const interval of ['monthly', 'yearly']) {
    const map = live[interval] || null
    response[interval] = map || { usd: 7, aud: 11 }
    response.availability[interval] = !!map
    response.source[interval] = map ? 'live' : 'fallback'
    response.currencyAvailability[interval] = Object.fromEntries(
      currencies.map((c) => [c, !!map && map[c] != null]),
    )
  }
  return response
}
const offerOf = (offers, id) => offers.find((o) => o.id === id)

// ── 1. fallback prices are not offered ───────────────────────────────────────

test('a cadence served from the fallback table has no amount and is not available', () => {
  const prices = payload({ live: { monthly: { usd: 7, aud: 11 } } })
  const { offers, priceServiceDown } = resolveOffers({ prices, currency: 'aud', loaded: true })
  assert.equal(priceServiceDown, false, 'one cadence is live, so the service is not down')
  const yearly = offerOf(offers, 'yearly')
  assert.equal(yearly.available, false)
  assert.equal(yearly.amountLabel, null, 'a fallback default was printed as a price')
  assert.equal(yearly.totalLabel, null)
  assert.equal(yearly.billedNote, null)
  assert.match(yearly.unavailableNote, /^No AUD price for this billing period/)
  assert.equal(offerOf(offers, 'monthly').available, true)
  assert.equal(offerOf(offers, 'monthly').unavailableNote, null)
})

test('a currency the live Stripe price does not carry is unavailable, even though the table has a number', () => {
  // Monthly is live in USD only; the response still carries DEFAULT_PRICES' aud.
  const prices = payload({ live: { monthly: { usd: 7 }, yearly: { usd: 48, aud: 96 } } })
  assert.equal(prices.monthly.aud, undefined, 'the fixture should have no aud on the live monthly price')
  prices.monthly.aud = 11
  assert.equal(prices.currencyAvailability.monthly.aud, false)
  const { offers } = resolveOffers({ prices, currency: 'aud', loaded: true })
  assert.equal(offerOf(offers, 'monthly').amountLabel, null)
  assert.equal(offerOf(offers, 'monthly').available, false)
  assert.equal(livePriceOf(prices, 'monthly', 'aud'), undefined)
  assert.equal(livePriceOf(prices, 'monthly', 'usd'), 7)
})

test('when no cadence is live the service counts as down', () => {
  const { offers, priceServiceDown } = resolveOffers({ prices: payload(), currency: 'usd', loaded: true })
  assert.equal(priceServiceDown, true)
  assert.ok(offers.every((o) => !o.available && o.amountLabel === null))
})

test('livePriceOf fails closed: a price is live only when the payload says so for that currency', () => {
  const avail = { yearly: { usd: true } }
  assert.equal(livePriceOf({ yearly: { usd: 48 }, source: { yearly: 'fallback' }, currencyAvailability: avail }, 'yearly', 'usd'), undefined)
  assert.equal(livePriceOf({ yearly: { usd: 48 }, source: { yearly: 'live' }, currencyAvailability: avail }, 'yearly', 'usd'), 48)
  assert.equal(livePriceOf({ yearly: { usd: 48 }, currencyAvailability: { yearly: { usd: false } } }, 'yearly', 'usd'), undefined)
  // Live by `source`, but no availability flags at all: not a price.
  assert.equal(livePriceOf({ yearly: { usd: 48 }, source: { yearly: 'live' } }, 'yearly', 'usd'), undefined,
    'a bare payload with source "live" and no currencyAvailability counted as live')
  assert.equal(livePriceOf({ yearly: { usd: 48 } }, 'yearly', 'usd'), undefined)
  // Flags for another cadence or currency do not carry over.
  assert.equal(livePriceOf({ yearly: { usd: 48 }, currencyAvailability: { monthly: { usd: true } } }, 'yearly', 'usd'), undefined)
  assert.equal(livePriceOf({ yearly: { usd: 48, aud: 75 }, currencyAvailability: avail }, 'yearly', 'aud'), undefined)
  assert.equal(livePriceOf(null, 'yearly', 'usd'), undefined)
})

test('the price hook and the ladder resolve through livePriceOf', () => {
  const hook = stripComments(read('src/hooks/usePrices.js'))
  assert.match(hook, /livePriceOf\(prices, 'yearly', currency\)/,
    'useProPrice reads raw amounts again — a fallback default would print as a price')
  assert.match(hook, /livePriceOf\(prices, 'monthly', currency\)/)
  const aud = resolvePlanLadder({ prices: payload({ live: { yearly: { usd: 48, aud: 96 } } }), currency: 'aud' })
  assert.equal(aud.find((p) => p.id === 'monthly').isLive, false, 'a fallback monthly price was marked live')
  assert.equal(aud.find((p) => p.id === 'yearly').isLive, true)
})

test('/plans takes its amounts and button state from resolveOffers', () => {
  const page = stripComments(read('src/pages/Pricing.jsx'))
  assert.match(page, /resolveOffers\(\{ prices, currency, loaded: price\.loaded \}\)/)
  assert.doesNotMatch(page, /prices\?\.\[[^\]]+\]\?\.\[currency\]/, '/plans reads a raw price again')
  // The state is the shared priceState, and only `live` (canCheckout) sells.
  assert.match(page, /const state = priceState\(\{ price, offers, selectedId: billing, retrying \}\)/)
  assert.match(page, /const live = canCheckout\(state\)/)
  assert.doesNotMatch(page, /priceServiceDown/, '/plans keeps its own outage flag')
  // The Pro button slot: the switch-cadence button and the Retry both come
  // before the Link that starts a trial, and neither of them is a Link.
  const switchTo = page.indexOf("} else if (state === 'cadence-missing') {")
  const buy = page.indexOf('} else if (live) {', switchTo)
  const retry = page.indexOf('} else {', buy)
  const trial = page.indexOf('to={proTo}', switchTo)
  assert.ok(switchTo > 0, 'one unpriced cadence no longer gets the switch-cadence button')
  assert.ok(buy > switchTo, 'the buy branch no longer follows the switch-cadence branch')
  assert.ok(retry > buy, 'the other states no longer end in one Retry button')
  assert.ok(trial > buy && trial < retry, 'the link to checkout is outside the live branch')
  assert.doesNotMatch(page.slice(switchTo, buy), /<Link/, 'the switch-cadence state offers a link to checkout')
  assert.doesNotMatch(page.slice(retry, page.indexOf('const OUTAGE_STATES')), /<Link|to=\{proTo\}/, 'an unavailable state offers a link to checkout')
  assert.match(page.slice(switchTo, buy), /chooseBilling\(otherOffer\.id\)/, 'the switch button no longer switches cadence')
  assert.match(page.slice(retry, page.indexOf('const OUTAGE_STATES')), /\bretry\(\)/, 'the Retry button no longer asks for prices again')
})

test('Quarterly stays off sale', () => {
  assert.deepEqual(BILLING_OPTIONS.map((o) => o.id), ['monthly', 'yearly'])
  assert.deepEqual(resolveOffers({ prices: payload(), currency: 'usd' }).offers.map((o) => o.id), ['monthly', 'yearly'])
  assert.equal(intervalRefusal('quarterly').status, 400)
})

// ── 2. the compare note names a live monthly price in the same currency ──────

test('no saving unless the monthly price is live in the same currency', () => {
  // Yearly is live in AUD; monthly has no live price at all.
  const noMonthly = resolveOffers({
    prices: payload({ live: { yearly: { usd: 48, aud: 36 } } }), currency: 'aud', loaded: true,
  }).offers
  assert.equal(offerOf(noMonthly, 'yearly').available, true)
  assert.equal(offerOf(noMonthly, 'yearly').savingLabel, '', 'a fallback monthly price was compared with a live yearly one')
  assert.equal(offerOf(noMonthly, 'yearly').saving, 0)

  // Monthly is live in USD only, yearly in AUD: not comparable.
  const crossCurrency = resolveOffers({
    prices: payload({ live: { monthly: { usd: 7 }, yearly: { usd: 48, aud: 36 } } }), currency: 'aud', loaded: true,
  }).offers
  assert.equal(offerOf(crossCurrency, 'monthly').available, false)
  assert.equal(offerOf(crossCurrency, 'yearly').savingLabel, '')

  // Both live in AUD: a saving is stated.
  const both = resolveOffers({
    prices: payload({ live: { monthly: { usd: 7, aud: 11 }, yearly: { usd: 48, aud: 96 } } }), currency: 'aud', loaded: true,
  }).offers
  assert.match(offerOf(both, 'yearly').savingLabel, /^Save \d+%$/)
})

test('the Yearly note names no monthly price at all', () => {
  const page = stripComments(read('src/pages/Pricing.jsx'))
  assert.doesNotMatch(page, /monthlyForNote|sizedMonthly/, 'the note reads a monthly price again')
  assert.match(page, /billedLine\(o\)/, 'the Yearly note no longer calls billedLine(o), so it is not built from the offer alone')
})

test('the upgrade modal states no saving across two currencies', () => {
  // A live A$36 yearly beside a US$7 monthly fallback would read as 57% off.
  const ladder = resolvePlanLadder({ prices: payload({ live: { yearly: { usd: 48, aud: 36 } } }), currency: 'aud' })
  const yearly = ladder.find((p) => p.id === 'yearly')
  const monthly = ladder.find((p) => p.id === 'monthly')
  assert.notEqual(yearly.currency, monthly.currency, 'the fixture should mix currencies')
  assert.equal(savingsVsMonthly(yearly, ladder), 0)
})

// The upgrade modal lists `livePlans(ladder)`, so these three cases are the
// three rows it can show: none, one, or a mix of live and fallback cadences.
test('the upgrade modal lists no row when no cadence is live', () => {
  for (const prices of [payload(), null]) {
    const ladder = resolvePlanLadder({ prices, currency: 'aud' })
    assert.deepEqual(livePlans(ladder), [], 'a fallback row would be listed and offered')
    assert.equal(cheapestPerMonth(livePlans(ladder)), null, 'a headline was chosen with nothing live')
  }
  const page = stripComments(read('src/components/ProUpgradeModal.jsx'))
  assert.match(page, /const plans = useMemo\(\(\) => livePlans\(ladder\), \[ladder\]\)/, 'the modal lists rows that are not live')
  assert.match(page, /const priceUnavailable = settled && plans\.length === 0/,
    'a 200 made only of fallback prices no longer shows the prices-unavailable state')
})

test('the upgrade modal lists the one live row, in the currency shown', () => {
  const ladder = resolvePlanLadder({ prices: payload({ live: { yearly: { usd: 48, aud: 36 } } }), currency: 'aud' })
  const plans = livePlans(ladder)
  assert.deepEqual(plans.map((p) => p.id), ['yearly'], 'the fallback Monthly row was listed')
  assert.equal(plans[0].currency, 'aud')
  assert.equal(plans[0].totalLabel, 'A$36')
  assert.equal(cheapestPerMonth(plans).id, 'yearly')
  assert.equal(savingsVsMonthly(plans[0], plans), 0, 'a saving was stated with no live Monthly price beside it')
})

test('a mix of live and fallback cadences lists and compares only the live ones', () => {
  // Monthly live in USD, Yearly a fallback: the $4 fallback rate must not become the headline.
  const usd = resolvePlanLadder({ prices: payload({ live: { monthly: { usd: 7, aud: 11 } } }), currency: 'usd' })
  assert.deepEqual(livePlans(usd).map((p) => p.id), ['monthly'])
  assert.equal(cheapestPerMonth(usd).id, 'monthly', 'a fallback rate undercut the live one')
  assert.equal(cheapestPerMonth(livePlans(usd)).id, 'monthly')

  // Both live: the cheaper per-month rate wins and the saving is stated.
  const both = resolvePlanLadder({
    prices: payload({ live: { monthly: { usd: 7, aud: 11 }, yearly: { usd: 48, aud: 75 } } }), currency: 'aud',
  })
  assert.deepEqual(livePlans(both).map((p) => p.id), ['monthly', 'yearly'])
  assert.equal(cheapestPerMonth(both).id, 'yearly')
  assert.ok(savingsVsMonthly(livePlans(both)[1], livePlans(both)) > 0)

  // Two currencies never compete, whatever is passed in.
  const mixed = [
    { id: 'monthly', purchasable: true, isLive: true, currency: 'usd', perMonth: 7 },
    { id: 'yearly', purchasable: true, isLive: true, currency: 'aud', perMonth: 3 },
  ]
  assert.equal(cheapestPerMonth(mixed).id, 'monthly', 'rates in two currencies were compared')
})

test('the approved ladder still has a headline when no prices are passed (the static pages)', () => {
  const fallback = resolvePlanLadder()
  assert.ok(fallback.every((p) => !p.isLive))
  assert.equal(cheapestPerMonth(fallback).id, 'yearly')
})

// ── 3. checkout reads the ladder ─────────────────────────────────────────────

test('/checkout prints no rate until the chosen offer is available', () => {
  const page = stripComments(read('src/pages/Checkout.jsx'))
  const note = page.slice(page.indexOf('const note ='), page.indexOf('const sessionInterval'))
  assert.ok(note.length > 50, 'the note block was not found')
  assert.match(note, /^const note = !proPrice\.loaded/, 'the note no longer waits for the prices to settle')
  assert.doesNotMatch(note, /chosenOption\?\.months/, 'the rate branch is guarded by months alone again — "A$0.00/mo" before the prices land')
  assert.ok(note.indexOf('!amount') < note.indexOf('chosenOption.months'), 'the rate branch comes before the available check')
})

test('/checkout and Settings take the outage from the shared priceState, with the Retry', () => {
  for (const file of ['src/pages/Checkout.jsx', 'src/pages/Settings.jsx']) {
    const page = stripComments(read(file))
    assert.doesNotMatch(page, /serviceAvailable/, `${file} treats a 200 as "the service is up"`)
    assert.doesNotMatch(page, /priceServiceDown/, `${file} keeps its own outage flag`)
    assert.match(page, /priceState\(\{ price: proPrice, offers/, `${file} does not take the state from priceState`)
    assert.match(page, /priceStateCopy\(/, `${file} does not take its words from PRICE_STATE_COPY`)
    assert.match(page, /usePriceRetry\(\)/, `${file} has no way to ask for the prices again`)
    assert.match(page, /\bretry\(\)/, `${file} shows the outage without a Retry`)
  }
  // The Retry is a state-driven button: Checkout in the summary, Settings in the Pro button slot.
  const checkout = stripComments(read('src/pages/Checkout.jsx'))
  assert.match(checkout, /canRetryPrice\(priceStatus\) && \(\s*<button[\s\S]{0,400}?retry\(\)/, 'Checkout shows the outage without a Retry')
  const settings = stripComments(read('src/pages/Settings.jsx'))
  assert.match(settings, /className="btn btn-accent sub-tier-btn"[\s\S]{0,400}?retry\(\)/, 'Settings has no Retry in the Pro button slot')
  // The response that dead-ended both pages: 200, every cadence a fallback.
  const prices = payload()
  const { offers, priceServiceDown } = resolveOffers({ prices, currency: 'aud', loaded: true })
  assert.equal(priceServiceDown, true)
  const price = { loaded: true, serviceAvailable: true, source: prices.source }
  assert.equal(priceState({ price, offers, selectedId: 'yearly' }), 'unreachable')
})

test('/checkout reads its amount and note from the ladder, with no per-cadence ternary', () => {
  const page = stripComments(read('src/pages/Checkout.jsx'))
  assert.doesNotMatch(page, /planKey === '(monthly|quarterly|yearly)'/, 'a per-cadence ternary is back')
  assert.doesNotMatch(page, /proPrice\.(yearlyTotal|monthly|yearlyPerMonth|savingsPct)\b/)
  assert.match(page, /const amount = chosenOption\?\.available \? formatPrice\(chosenOption\.total, proPrice\.currency\) : null/)
  assert.match(page, /BILLED_EVERY\[chosenOption/)
})

test('/checkout opens no payment form for a cadence with no live price', () => {
  const page = stripComments(read('src/pages/Checkout.jsx'))
  const gate = page.indexOf(') : !canCheckout(priceStatus) || !amount ? (')
  const embed = page.indexOf('<CheckoutEmbed fetchClientSecret')
  assert.ok(gate > 0, 'the unavailable-price branch is gone, or no longer waits for a live price state')
  assert.ok(gate < embed, 'the payment form is reachable without a live price state and an amount')
  assert.match(page.slice(gate, embed), /Checkout unavailable/)
})

test('every buyable cadence resolves an amount, a per-month rate and a billing line from the ladder', () => {
  const live = { monthly: { usd: 7 }, yearly: { usd: 48 } }
  const { offers } = resolveOffers({ prices: payload({ live }), currency: 'usd', loaded: true })
  assert.deepEqual(offers.map((o) => o.id), BILLING_OPTIONS.map((o) => o.id))
  for (const o of offers) {
    assert.equal(o.total, live[o.id].usd)
    assert.ok(BILLED_EVERY[o.id], `${o.id} has no billing wording`)
    assert.ok(o.billedNote.includes('cancel any time'))
  }
  assert.equal(offerOf(offers, 'yearly').amountLabel, '$4')
})

// ── 4. a currency failure never becomes another currency ─────────────────────

const currencyFailure = () => Object.assign(
  new Error('You cannot combine currencies on a single customer. This customer has an active subscription, subscription schedule, discount, quote, or invoice item with currency usd.'),
  { type: 'StripeInvalidRequestError', param: 'currency' },
)
function fakeSessions(failures = []) {
  const calls = []
  return {
    calls,
    checkout: {
      sessions: {
        async create(params) {
          calls.push(params)
          const failure = failures.shift()
          if (failure) throw failure
          return { id: 'cs_test', client_secret: 'secret' }
        },
      },
    },
  }
}
const quiet = (t) => t.mock.method(console, 'error', () => {})

test('a currency Stripe refuses is a clear 409, and no session opens without the currency', async (t) => {
  quiet(t)
  const stripe = fakeSessions([currencyFailure()])
  const result = await createSessionInCurrency(stripe, { mode: 'subscription' }, 'aud')
  assert.equal(result.session, undefined, 'a session was opened after the currency failed')
  assert.equal(result.refusal.status, 409)
  assert.match(result.refusal.error, /AUD/)
  assert.match(result.refusal.error, /No payment session was created/)
  assert.equal(stripe.calls.length, 1, 'the request was retried')
  assert.equal(stripe.calls[0].currency, 'aud')
})

test('the requested currency is the one sent', async () => {
  const stripe = fakeSessions()
  const result = await createSessionInCurrency(stripe, { mode: 'subscription' }, 'nzd')
  assert.equal(result.session.id, 'cs_test')
  assert.equal(stripe.calls.length, 1)
  assert.equal(stripe.calls[0].currency, 'nzd')
})

test('an error that is not about the currency is thrown, not retried', async () => {
  const outage = Object.assign(new Error('Stripe is down'), { type: 'StripeAPIError' })
  const stripe = fakeSessions([outage])
  await assert.rejects(createSessionInCurrency(stripe, { mode: 'subscription' }, 'aud'), /Stripe is down/)
  assert.equal(stripe.calls.length, 1)
})

test('Stripe\'s `param` decides whether a failure is about the currency; the message is only the fallback', async (t) => {
  quiet(t)
  const otherField = Object.assign(new Error('Invalid value for currency preference on this customer'), { type: 'StripeInvalidRequestError', param: 'customer' })
  await assert.rejects(createSessionInCurrency(fakeSessions([otherField]), { mode: 'subscription' }, 'aud'), /currency preference/,
    'an error about another field was answered as a currency refusal')
  const noParam = Object.assign(new Error('You cannot combine currencies on a single customer.'), { type: 'StripeInvalidRequestError' })
  const result = await createSessionInCurrency(fakeSessions([noParam]), { mode: 'subscription' }, 'aud')
  assert.equal(result.refusal.status, 409, 'with no param the message still identifies a currency failure')
})

test('/plans shows the unavailable state as one more note state, with the recovery action in the Pro button slot', () => {
  const page = stripComments(read('src/pages/Pricing.jsx'))
  assert.doesNotMatch(page, /unavailableState|unavailableLines/, 'a reserved unavailable block or its own outage lines are back')
  // Every outage state is a note state whose words come from PRICE_STATE_COPY
  // through priceStateCopy, in both layouts.
  assert.match(page, /const OUTAGE_STATES = \['unreachable', 'no-currency', 'cadence-missing'\]/)
  assert.match(page, /priceStateCopy\(id, stateCtx\)/, 'the outage notes do not take their words from priceStateCopy')
  assert.match(page, /\.\.\.OUTAGE_STATES\.map\(\(id\) => \(\{ id, lines: \[outageCopy\[id\]\.line1, outageCopy\[id\]\.line2\]/, 'the ledger has no outage note states')
  assert.match(page, /\.\.\.OUTAGE_STATES\.map\(\(id\) => \(\{ id, billed: outageCopy\[id\]\.line1/, 'the offer layout has no outage note states')
  assert.match(page, /const activeNote = state === 'retrying' \? 'loading' : live \? offer\.id : state/)
  assert.equal(page.split("id={outage && state.id === activeNote ? 'pricing-noprice' : undefined}").length - 1, 2, 'only the shown copy may carry the id')
})

test('/checkout announces a refusal and brings it into view', () => {
  const page = stripComments(read('src/pages/Checkout.jsx'))
  assert.match(page, /className="checkout-error" role="alert" tabIndex=\{-1\} ref=\{errorRef\}/)
  assert.match(page, /errorRef\.current\.scrollIntoView/)
})

test('create-checkout no longer retries a failed session without its currency', () => {
  const route = stripComments(read('api/create-checkout.js'))
  assert.doesNotMatch(route, /delete sessionParams\.currency/)
  assert.match(route, /createSessionInCurrency\(stripe, sessionParams, wantCurrency\)/)
  assert.match(route, /currencyRefusal\(req\.body\?\.currency\)/, 'the handler no longer refuses an unknown currency')
})

test('a currency the route does not sell is a 400, not dropped', () => {
  assert.equal(currencyRefusal(undefined), null)
  assert.equal(currencyRefusal(null), null)
  for (const code of CURRENCY_CODES) assert.equal(currencyRefusal(code), null)
  assert.equal(currencyRefusal('AUD'), null)
  assert.equal(currencyRefusal('jpy').status, 400)
  assert.equal(currencyRefusal(7).status, 400)
  assert.equal(currencyRefusal('').status, 400)
})
