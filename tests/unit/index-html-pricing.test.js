// The price a crawler reads must be the price the app charges.
//
// ── What went wrong, and why nothing caught it ──────────────────────────────
//
// index.html carried a site-level `WebApplication` JSON-LD block declaring an
// `Offer` of "4.99" AUD for Pro, plus a <noscript> paragraph quoting "$4.99
// AUD/month". Both were literal. #277 tied every price ON SCREEN to
// src/config/planLadder.js and tests/unit/price-consistency.test.js guards that
// — but that guard walks `src/`, and index.html is not in `src/`. So the one
// document served to every non-JS reader (social unfurlers, LLM crawlers,
// anyone with JavaScript off) kept quoting the pre-ladder price for weeks,
// green build after green build.
//
// ── What this file guards, and what it deliberately does not ────────────────
//
// THE POINT IS NOT THAT THE DIGITS ARE RIGHT TODAY. Asserting index.html says
// "$7" would re-create the defect one level up: a second place to edit when the
// ladder moves. Every assertion here compares the GENERATED html against
// src/config/planLadder.js's own arithmetic, so moving the ladder moves the
// expectation with it — and the file is required to contain no amount of its
// own at all.
//
// SCOPE, as in the sibling price tests: this is about the DISPLAYED and
// MACHINE-READABLE fallback. What Stripe charges lives in price objects outside
// this repository and no test here can see them.
//
// THE WIRING IS TESTED, NOT JUST THE MODULE. `pricing hook` below reaches into
// vite.config.js's real plugin array and runs the real hook over the real
// index.html. A correct scripts/site-pricing.mjs that nothing calls would leave
// the page exactly as broken as it was, and a module-only test would be green
// through it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  APPROVED_CURRENCY,
  PLAN_LADDER,
  cheapestPerMonth,
  formatMoney,
  purchasablePlans,
  resolvePlanLadder,
} from '../../src/config/planLadder.js'
import { AI_LIMITS } from '../../src/config/plans.js'
import { PRICE_SYMBOLS } from '../../src/utils/currency.js'
import {
  CURRENCY_CODE,
  JSONLD_MARKER,
  PRICING_MARKER,
  applyPricingHtml,
  ladderOffers,
  pricingSentence,
  webApplicationSchema,
} from '../../scripts/site-pricing.mjs'
import viteConfig from '../../vite.config.js'

const REPO = process.cwd()
const INDEX = path.join(REPO, 'index.html')
const source = () => fs.readFileSync(INDEX, 'utf8')

// A currency symbol followed by a number — the same shape
// tests/unit/price-consistency.test.js scans `src/` for, built from the app's
// own symbol table so a newly supported currency is covered without an edit.
const PRICE_SHAPED = new RegExp(
  `[${Object.values(PRICE_SYMBOLS).filter((s) => s.length === 1).map((s) => `\\${s}`).join('')}]`
  + '\\s?\\d(?:[\\d,]*\\d)?(?:\\.\\d{1,2})?',
  'g',
)

/** Run the REAL configured hook over the REAL index.html. */
function renderIndex() {
  const config = viteConfig({ command: 'build', mode: 'production' })
  const plugin = config.plugins.flat(Infinity).find((p) => p?.name === 'uil4b-pricing-html')
  assert.ok(plugin,
    'vite.config.js no longer registers the uil4b-pricing-html plugin, so nothing '
    + 'fills index.html\'s pricing markers and the page ships without a price')
  const hook = plugin.transformIndexHtml
  const handler = typeof hook === 'function' ? hook : hook.handler
  return handler.call(plugin, source(), { filename: INDEX, path: '/index.html' })
}

const jsonLdFrom = (html) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  assert.ok(m, 'the generated index.html carries no JSON-LD block at all')
  return JSON.parse(m[1])
}

test('index.html states no price of its own — the ladder is the only source', () => {
  // The load-bearing assertion. Everything else in this file checks that the
  // derivation is correct; this one checks that nobody quietly went back to
  // typing a number, which is how the original defect was created and is the
  // only way it can return.
  //
  // Scanned RAW, comments included. In a source file a comment mentioning a
  // price is harmless prose. Here it is a number in the one document that must
  // hold none, and a comment stating today's ladder is a comment that will be
  // wrong after the next pricing decision.
  const hits = [...source().matchAll(PRICE_SHAPED)].map((m) => m[0])
  assert.deepEqual(hits, [],
    `index.html contains price-shaped strings: ${hits.join(', ')}.\n`
    + 'Its prices are generated from src/config/planLadder.js by '
    + 'scripts/site-pricing.mjs. Putting an amount back into the HTML — even '
    + 'the correct one — restores the two-sources-of-truth defect this test '
    + 'exists to prevent.')
})

test('index.html carries both pricing markers for the build to fill', () => {
  const html = source()
  assert.ok(html.includes(JSONLD_MARKER), `index.html is missing ${JSONLD_MARKER}`)
  assert.ok(html.includes(PRICING_MARKER), `index.html is missing ${PRICING_MARKER}`)
})

test('the generated JSON-LD offers are exactly the ladder, tier for tier', () => {
  const schema = jsonLdFrom(renderIndex())
  assert.equal(schema['@type'], 'WebApplication')

  const resolved = resolvePlanLadder()
  const buyable = purchasablePlans(resolved)
  assert.ok(buyable.length >= 1, 'the ladder resolved no purchasable tier at all')

  // Free, then one Offer per purchasable tier. Nothing else.
  assert.equal(schema.offers.length, buyable.length + 1,
    `expected ${buyable.length + 1} offers (Free + ${buyable.length} purchasable Pro tiers), `
    + `got ${schema.offers.length}: ${schema.offers.map((o) => o.name).join(', ')}`)

  const free = schema.offers[0]
  assert.equal(free.name, 'Free')
  assert.equal(free.price, '0')

  for (const plan of buyable) {
    const offer = schema.offers.find((o) => o.name === `Pro — ${plan.label}`)
    assert.ok(offer, `no Offer for the ${plan.id} tier`)
    assert.equal(offer.price, String(plan.total),
      `${plan.id}: the JSON-LD quotes ${offer.price} but the ladder charges ${plan.total}`)
    assert.equal(offer.priceCurrency, plan.currency.toUpperCase(),
      `${plan.id}: the JSON-LD declares ${offer.priceCurrency}`)
    // The billing period, or "price: 48" reads as $48 once — an ambiguity that
    // happens to flatter us, which is exactly when it has to be closed.
    assert.equal(offer.priceSpecification.billingDuration, plan.months)
    assert.equal(offer.priceSpecification.unitCode, 'MON')
    assert.equal(offer.priceSpecification.price, plan.total)
  }
})

test('the currency is the ladder\'s, not the AUD the old block claimed', () => {
  // A separate false claim sitting beside the false amount: the block said AUD
  // over a ladder that has been denominated in USD since it was approved.
  assert.equal(CURRENCY_CODE, APPROVED_CURRENCY.toUpperCase())
  for (const offer of webApplicationSchema().offers) {
    assert.equal(offer.priceCurrency, APPROVED_CURRENCY.toUpperCase(),
      `an Offer declares ${offer.priceCurrency}, which is not the approved ladder currency`)
  }
})

test('no tier that cannot reach checkout is advertised as an Offer', () => {
  // Quarterly is defined in the ladder, has an approved amount, and has no
  // Stripe price or Checkout.jsx entry — src/pages/Checkout.jsx dead-ends it on
  // "Invalid selection". A machine-readable Offer for something nobody can buy
  // is the same class of false claim about money as the wrong amount.
  const unbuyable = PLAN_LADDER.filter((p) => !p.checkoutPlan)
  assert.ok(unbuyable.length >= 1,
    'every tier is purchasable, so this guard is asserting nothing — if that is '
    + 'genuinely true now, delete it rather than leaving it green and empty')
  const names = ladderOffers().map((o) => o.name)
  for (const plan of unbuyable) {
    assert.ok(!names.includes(`Pro — ${plan.label}`),
      `${plan.id} has no checkoutPlan but is advertised as a buyable Offer`)
  }
})

test('the noscript sentence quotes the ladder and the real AI allowances', () => {
  const sentence = pricingSentence()

  // "from $X" is cheapestPerMonth() over the purchasable tiers — the same
  // arithmetic ProUpgradeModal's headline uses, so the static shell and the
  // rendered app cannot lead with different prices.
  const lead = cheapestPerMonth(resolvePlanLadder())
  assert.ok(lead, 'the ladder produced no lead price')
  assert.ok(sentence.includes(`from ${formatMoney(lead.perMonth, lead.currency)} ${CURRENCY_CODE}`),
    `the sentence does not quote the ladder's lead price:\n${sentence}`)

  // Every price-shaped string in it has to be an amount the ladder can produce.
  const allowed = new Set(resolvePlanLadder().flatMap((p) => [p.totalLabel, p.perMonthLabel]))
  allowed.add(formatMoney(0, APPROVED_CURRENCY))
  for (const hit of sentence.match(PRICE_SHAPED) || []) {
    assert.ok(allowed.has(hit),
      `the sentence quotes ${hit}, which the ladder cannot produce (${[...allowed].join(', ')})`)
  }

  // The allowances. The old copy said "40 AI generations per day" free and
  // "1,000 per day" Pro; the real caps are 5/day-40/month and 30/day-300/month,
  // so it quoted the monthly figure as a daily one AND inflated Pro ~33x.
  for (const [label, n] of [
    ['free daily', AI_LIMITS.free.daily], ['free monthly', AI_LIMITS.free.monthly],
    ['pro daily', AI_LIMITS.pro.daily], ['pro monthly', AI_LIMITS.pro.monthly],
  ]) {
    assert.match(sentence, new RegExp(`\\b${n}\\b`),
      `the sentence never states the ${label} allowance (${n})`)
  }
})

test('the noscript sentence does not claim Pro buys a better model', () => {
  // src/pages/Plans.jsx answers this question in the negative, in the app's own
  // words: "No, and we will not claim otherwise. Free and Pro run the same
  // model today." The static HTML used to promise "higher-quality models",
  // contradicting our own pricing page to the only readers who cannot see it.
  const sentence = pricingSentence().toLowerCase()
  for (const phrase of ['higher-quality model', 'higher quality model', 'better model']) {
    assert.ok(!sentence.includes(phrase), `the sentence claims "${phrase}"`)
  }
  assert.ok(sentence.includes('same ai model'),
    'the sentence should state what Plans.jsx states — that Free and Pro run the same model')
})

test('a missing marker throws rather than passing the page through', () => {
  // The failure mode that matters. A hook that silently no-ops ships a page
  // with no price at all while the build stays green — the same invisible
  // failure as the wrong price, one step later.
  assert.throws(() => applyPricingHtml('<html><head></head></html>'), /uil4b:jsonld/)
  assert.throws(() => applyPricingHtml(`<html>${JSONLD_MARKER}</html>`), /uil4b:pricing/)
})

test('the rendered page carries no marker and no stale amount', () => {
  const html = renderIndex()
  assert.ok(!html.includes(JSONLD_MARKER) && !html.includes(PRICING_MARKER),
    'a marker survived the hook, so the page would ship a visible HTML comment')
  // Everything price-shaped in the OUTPUT must be a ladder amount. This is the
  // end-to-end statement of the whole file: whatever index.html plus the hook
  // produce, the ladder can account for.
  const allowed = new Set(resolvePlanLadder().flatMap((p) => [p.totalLabel, p.perMonthLabel]))
  allowed.add(formatMoney(0, APPROVED_CURRENCY))
  const hits = [...html.matchAll(PRICE_SHAPED)].map((m) => m[0])
  assert.ok(hits.length >= 1, 'the rendered page quotes no price at all — the hook did nothing')
  for (const hit of hits) {
    assert.ok(allowed.has(hit),
      `the rendered index.html quotes ${hit}, which src/config/planLadder.js cannot produce. `
      + `The ladder allows: ${[...allowed].join(', ')}`)
  }
})
