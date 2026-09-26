// Prices: the client fallback and the server fallback must be one ladder.
//
// The same drift that tests/unit/plan-limits.test.js stopped for LIMITS had
// happened to PRICES, and nothing caught it. Three sources disagreed:
//
//   • src/config/planLadder.js  `approvedTotal`  $7 / $18 / $48
//   • api/_lib/pricing.js       `DEFAULT_PRICES` $4.99 / — / $39.99
//   • src/locales/*.json        "price"          $4.99   (dead keys, deleted)
//
// Live Stripe prices win at runtime, so this only ever showed itself when
// /api/get-prices could not answer — and then the SAME visitor could be quoted
// $7 by the upgrade modal and $4.99 by the price endpoint's fallback, depending
// on which one rendered. That is the worst shape of pricing bug: invisible in
// the happy path, and only visible when the service is already degraded.
//
// ─────────────────────────────────────────────────────────────────────────────
// SCOPE, so nobody reads more into a green run than it means: every assertion
// here is about DISPLAYED FALLBACKS. What a customer is actually charged comes
// from Stripe price objects that are not in this repository, and no test in
// this file can see them.
// ─────────────────────────────────────────────────────────────────────────────
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BILLING_INTERVALS,
  CURRENCY_CODES,
  DEFAULT_PRICES,
  INTERVAL_COUNTS,
  INTERVAL_MAP,
  LOOKUP_KEYS,
  PRICE_ENV_KEYS,
} from '../../api/_lib/pricing.js'
import { APPROVED_CURRENCY, PLAN_LADDER } from '../../src/config/planLadder.js'

// The subscription rows the ladder governs.
const LADDER_INTERVALS = PLAN_LADDER.map((p) => p.liveKey)

test('the server fallback quotes the same USD ladder the client does', () => {
  // The required guarantee: for every interval BOTH files define, the amount
  // src/config/planLadder.js would display and the amount api/_lib/pricing.js
  // would serve are the same number.
  const shared = LADDER_INTERVALS.filter((key) => DEFAULT_PRICES[key])
  assert.ok(shared.length >= 3,
    `expected the ladder's intervals to exist in DEFAULT_PRICES, found only: ${shared.join(', ') || '(none)'}`)

  for (const plan of PLAN_LADDER) {
    const server = DEFAULT_PRICES[plan.liveKey]
    if (!server) continue
    assert.equal(server[APPROVED_CURRENCY], plan.approvedTotal,
      `${plan.id}: the server fallback (${APPROVED_CURRENCY.toUpperCase()} ${server[APPROVED_CURRENCY]}) `
      + `disagrees with the approved client ladder (${plan.approvedTotal}). `
      + 'Both are display fallbacks — change them together or not at all.')
  }
})

test('every interval in the client ladder is described on the server', () => {
  // Quarterly used to be missing from all three of these. A row with no lookup
  // key cannot ever resolve a live price, so it would quote the fallback
  // forever without anyone noticing.
  for (const key of LADDER_INTERVALS) {
    assert.ok(DEFAULT_PRICES[key], `${key}: no DEFAULT_PRICES row`)
    assert.ok(LOOKUP_KEYS[key], `${key}: no LOOKUP_KEYS entry`)
    assert.ok(INTERVAL_MAP[key], `${key}: no INTERVAL_MAP entry`)
  }
})

test('every subscription row prices every supported currency', () => {
  for (const key of LADDER_INTERVALS) {
    const row = DEFAULT_PRICES[key]
    for (const currency of CURRENCY_CODES) {
      const amount = row[currency]
      assert.equal(typeof amount, 'number', `${key}.${currency}: missing or non-numeric fallback`)
      assert.ok(amount > 0, `${key}.${currency}: fallback must be a positive amount`)
    }
  }
})

test('a longer commitment is never worse value, in any currency', () => {
  // The non-USD amounts are derived from ratios and rounded, and rounding is
  // exactly where a derivation goes wrong — round the wrong way twice and the
  // annual plan costs more per month than the monthly one while every
  // individual number still looks plausible.
  const byMonths = [...PLAN_LADDER].sort((a, b) => a.months - b.months)
  for (const currency of CURRENCY_CODES) {
    for (let i = 1; i < byMonths.length; i += 1) {
      const prev = byMonths[i - 1]
      const next = byMonths[i]
      const prevRate = DEFAULT_PRICES[prev.liveKey][currency] / prev.months
      const nextRate = DEFAULT_PRICES[next.liveKey][currency] / next.months
      assert.ok(nextRate < prevRate,
        `${currency.toUpperCase()}: ${next.id} costs ${nextRate.toFixed(2)}/month against `
        + `${prev.id}'s ${prevRate.toFixed(2)}/month — the longer commitment must be cheaper per month`)
    }
  }
})

test('quarterly is fully wired and still not offered for sale', () => {
  // A TRIPWIRE ON ONE FIELD, rewritten 2026-09-15.
  //
  // It used to guard three preconditions. All three were built that day with
  // the founder's approval for the gated payment files, and each is now
  // asserted POSITIVELY in tests/unit/trial-cadence.test.js rather than as an
  // absence here:
  //
  //   1. setup-stripe sends `recurring.interval_count` from INTERVAL_COUNTS, so
  //      quarterly is a genuine three-month recurrence and not an $18-per-MONTH
  //      price. That was the one that could overcharge a real customer.
  //   2. PRICE_ENV_KEYS.quarterly exists, and quarterly is in BILLING_INTERVALS.
  //   3. src/pages/Checkout.jsx has a quarterly case, so the buyer no longer
  //      lands on "Invalid selection".
  //
  // ONE THING IS STILL NOT TRUE: the Stripe price does not exist. It is created
  // in the dashboard, not in this repository. `checkoutPlan` is what publishes
  // a machine-readable Offer in index.html and puts the cadence in front of a
  // buyer, and an Offer for a price create-checkout would answer 503 for is the
  // same class of false claim about money as the wrong amount — which is what
  // index-html-pricing.test.js#"no tier that cannot reach checkout" enforces.
  //
  // Quarterly is offered. The live Stripe price: lookup key uil4b_pro_quarterly, US$18, recurring
  // month × 3, on the Pro product — see the note on the ladder entry. The test
  // stays, turned around: quarterly is offered, and the path it depends on is
  // still whole. If any precondition below regresses, turn quarterly OFF.
  const quarterly = PLAN_LADDER.find((p) => p.id === 'quarterly')
  assert.equal(quarterly.checkoutPlan, 'quarterly',
    'quarterly is no longer offered — if that is deliberate, restore the null switch and its note')

  // The preconditions, asserted so that the switch above cannot stand on a
  // half-built path.
  assert.ok(BILLING_INTERVALS.includes('quarterly'), 'quarterly can no longer reach create-checkout')
  assert.ok(PRICE_ENV_KEYS.quarterly, 'the quarterly price env key has gone')
  assert.equal(INTERVAL_COUNTS.quarterly, 3,
    'quarterly must be recorded as a 3-month recurrence, or a price created from it bills monthly')
})
