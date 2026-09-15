// The admin Stripe panel must offer every interval the route will accept.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG THIS EXISTS FOR, found 2026-09-15
// ─────────────────────────────────────────────────────────────────────────────
// /api/setup-stripe validates its POST against BILLING_INTERVALS and answers
// 400 for anything short of the full set:
//
//     for (const interval of BILLING_INTERVALS) {
//       const map = prices?.[interval]
//       if (!map) return `Missing ${interval} prices`
//
// src/pages/Admin.jsx built, edited, rendered and posted the literal
// ['monthly', 'yearly'] in six separate places. So from the day `quarterly`
// joined BILLING_INTERVALS, the Save button on the ONLY screen in the product
// that can create a Stripe price answered "Missing quarterly prices" and
// created nothing — while the panel itself looked entirely healthy, because
// the failure is on the server and the two columns it drew were the two
// columns it meant to draw.
//
// That is a bad shape of bug: the founder is told to go and set his prices in
// the admin panel, the panel loads, shows the right currencies, takes his
// edits, and refuses at the last step for a reason that names an interval the
// screen never mentioned.
//
// THE FIX was to stop restating the list: the route's GET already returns
// `defaults` (DEFAULT_PRICES), whose keys ARE the intervals and whose
// per-interval keys are the currencies approved for each. The panel reads the
// shape off that payload.
//
// WHAT THIS TEST PINS is that it keeps doing so. It is a source scan, which is
// the honest layer for it: the failure is a literal typed into a component,
// and asserting the RENDER would need a DOM, a signed-in admin and a live
// Stripe response to prove something a reader can see in one line.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BILLING_INTERVALS, DEFAULT_PRICES } from '../../api/_lib/pricing.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ADMIN = path.join(ROOT, 'src/pages/Admin.jsx')
const source = fs.readFileSync(ADMIN, 'utf8')

// Just the panel. The rest of Admin.jsx is 2,000 lines about other things, and
// an interval name appearing in, say, a billing filter elsewhere is not this
// bug.
function stripeSetupPanelSource() {
  const start = source.indexOf('function StripeSetupPanel')
  assert.ok(start > -1, 'StripeSetupPanel has been renamed — re-point this test')
  // To the next top-level declaration.
  const rest = source.slice(start + 1)
  const nextFn = rest.search(/\n(?:function |const |export )/)
  return nextFn === -1 ? rest : rest.slice(0, nextFn)
}

test('the panel does not restate the interval list as a literal', () => {
  const panel = stripeSetupPanelSource()

  // An array literal of quoted interval names, e.g. ['monthly', 'yearly'].
  // This is precisely what the bug looked like, in all six places.
  const names = BILLING_INTERVALS.join('|')
  const literalList = new RegExp(
    `\\[\\s*'(?:${names})'(?:\\s*,\\s*'(?:${names})'\\s*)+\\]`,
    'g',
  )
  const found = panel.match(literalList)

  assert.equal(found, null,
    'StripeSetupPanel hardcodes an interval list: ' + (found || []).join(' , ') +
    '. /api/setup-stripe validates the POST against every entry of ' +
    'BILLING_INTERVALS and answers 400 "Missing <interval> prices" for a ' +
    'partial body, so a typed list here silently disables the Save button the ' +
    'moment an interval is added to the route. Derive the intervals from the ' +
    'GET payload (Object.keys(config.defaults)) instead.')
})

test('an object literal keyed by interval is not built by hand either', () => {
  // The other half of the same bug: `const prices = { monthly: {}, yearly: {} }`
  // is a hardcoded list without square brackets, and it is what the save
  // handler actually shipped.
  const panel = stripeSetupPanelSource()
  const names = BILLING_INTERVALS.join('|')
  const literalObject = new RegExp(
    `\\{\\s*(?:${names})\\s*:\\s*\\{\\s*\\}\\s*(?:,\\s*(?:${names})\\s*:\\s*\\{\\s*\\}\\s*)+\\}`,
    'g',
  )
  const found = panel.match(literalObject)

  assert.equal(found, null,
    'StripeSetupPanel builds an interval-keyed object by hand: ' +
    (found || []).join(' , ') + '. Build it from the payload so a new interval ' +
    'cannot be dropped from the POST.')
})

test('every interval the route validates has an approved amount to offer', () => {
  // The panel derives its columns from DEFAULT_PRICES. If the route validates
  // an interval that DEFAULT_PRICES has no row for, the panel cannot draw a
  // column for it, the POST cannot carry it, and Save is unfixably broken.
  // This is the invariant the derivation depends on.
  for (const interval of BILLING_INTERVALS) {
    assert.ok(DEFAULT_PRICES[interval],
      `BILLING_INTERVALS contains "${interval}" but DEFAULT_PRICES has no row ` +
      'for it. The admin panel derives its columns from DEFAULT_PRICES, so the ' +
      'Save button would post a body the route rejects and no price could be ' +
      'created. Add the row, or take the interval off the allowlist.')

    const codes = Object.keys(DEFAULT_PRICES[interval])
    assert.ok(codes.length > 0, `DEFAULT_PRICES.${interval} is empty`)
  }
})

test('the base currency is offered for every interval, because the route demands it', () => {
  // validatePrices: `if (!(BASE_CURRENCY in map)) return '<interval>: base
  // currency (USD) is required'`. A DEFAULT_PRICES row missing USD would draw
  // a column of inputs that can never save.
  for (const interval of BILLING_INTERVALS) {
    assert.ok('usd' in DEFAULT_PRICES[interval],
      `DEFAULT_PRICES.${interval} has no USD amount, and /api/setup-stripe ` +
      'requires the base currency for every interval.')
  }
})
