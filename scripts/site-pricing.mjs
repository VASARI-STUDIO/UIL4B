// The money in index.html, derived rather than typed.
//
// ── The defect this exists to end ───────────────────────────────────────────
//
// index.html shipped a site-level `WebApplication` JSON-LD block declaring an
// `Offer` of "4.99" AUD for Pro, and a <noscript> paragraph reading "Upgrade to
// Pro from $4.99 AUD/month". #277 tied every price ON SCREEN to
// src/config/planLadder.js, but nothing reaches into index.html — so the only
// price a crawler, an LLM, or a visitor without JavaScript could read was the
// pre-ladder one. The approved ladder ($7 · $18 · $48 USD, CHANGELOG.md
// decision 2 of 2026-08-20) had been live on every rendered surface for weeks
// while the machine-readable copy still said $4.99 AUD.
//
// THE DEFECT WAS NEVER THE DIGITS. Typing "7" into index.html would have been
// correct for exactly as long as the ladder stayed still, and would have
// re-armed the identical trap. There were two sources of truth for one fact.
// There is now one: src/config/planLadder.js, read here at build time.
//
// ── Three further false claims, found while fixing the first ────────────────
//
// The <noscript> paragraph is the only pricing copy a non-JS reader ever gets,
// and every number in it was wrong, not just the price:
//
//   • "40 AI generations per day" (free) — the free daily cap is 5. 40 is the
//     MONTHLY cap, so the sentence quoted the wrong period as well as the wrong
//     number, promising 8x what the server grants.
//   • "1,000 AI generations per day" (Pro) — the Pro daily cap is 30. 1,000/day
//     is the pre-2026 number api/_lib/plans.js explicitly records as abandoned:
//     "not oversold at a thousand users — it is oversold at TWO".
//   • "higher-quality models" — src/pages/Plans.jsx answers this question
//     directly and in the negative: "No, and we will not claim otherwise. Free
//     and Pro run the same model today." The static HTML was contradicting the
//     app's own pricing page.
//
// So the limits come from src/config/plans.js the same way the price comes from
// the ladder, and the model claim is gone. What Pro actually buys is what
// Plans.jsx says it buys: capacity, the advanced colour controls, and
// watermark-free export.
//
// ── Where this runs ─────────────────────────────────────────────────────────
//
// `applyPricingHtml()` is called from vite.config.js's `transformIndexHtml`
// hook, NOT from scripts/prerender.mjs. The hook was chosen deliberately:
// prerender.mjs runs only under `npm run build` and never rewrites
// dist/index.html itself, so a prerender-side fix would have left the homepage
// — the one page the pricing paragraph survives on — carrying the placeholder
// under `npx vite build`, and would have shown it in `npm run dev` besides.
// The hook runs in dev, in `vite build`, and in `vite build --mode test`, so
// there is no build path that produces a shell without it.
//
// scripts/prerender.mjs asserts the substitution actually happened, so the hook
// silently failing to run fails the build rather than shipping a page with a
// visible HTML comment where its price should be.
//
// ── The failure mode is absence, never a wrong number ───────────────────────
//
// index.html holds PLACEHOLDER COMMENTS, not fallback numbers. If this module
// is never called the page ships with no JSON-LD and no pricing sentence, which
// is silent. A hard-coded fallback would ship a confident wrong price, which is
// the bug being fixed. tests/unit/index-html-pricing.test.js fails if a
// price-shaped string is ever typed back into index.html.
import {
  APPROVED_CURRENCY,
  cheapestPerMonth,
  formatMoney,
  purchasablePlans,
  resolvePlanLadder,
} from '../src/config/planLadder.js'
import { AI_LIMITS } from '../src/config/plans.js'
import { SITE_ORIGIN } from '../src/utils/routeMeta.js'
import { DEFAULT_DESCRIPTION } from '../src/data/routeMetaMap.js'

// Imported, not retyped. This file's own header says a second copy of a
// price is the defect; the same holds for the origin it is published under.
const ORIGIN = SITE_ORIGIN

// The markers index.html carries in place of any number. Distinctive enough
// that a grep finds every one, and an HTML comment so the un-substituted file
// is still valid HTML that renders nothing.
export const JSONLD_MARKER = '<!--uil4b:jsonld-->'
export const PRICING_MARKER = '<!--uil4b:pricing-->'

// ISO 4217, which is what schema.org's `priceCurrency` wants. Derived from the
// ladder's own APPROVED_CURRENCY — the old block said "AUD" over a ladder that
// has been denominated in USD since it was approved, so the currency was a
// second false claim sitting beside the false amount.
export const CURRENCY_CODE = APPROVED_CURRENCY.toUpperCase()

/** Escape for text inside an HTML element. */
const text = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The ladder as schema.org Offers.
 *
 * ONLY PURCHASABLE TIERS. Quarterly is defined in the ladder but has no
 * `checkoutPlan` and no Stripe price, so Checkout.jsx dead-ends on "Invalid
 * selection" — the upgrade modal already refuses to render it. Advertising a
 * machine-readable Offer for something nobody can buy is the same class of
 * false claim about money as quoting the wrong amount, so it is filtered out by
 * the ladder's own `purchasable` flag rather than by a list here.
 *
 * `priceSpecification` carries the billing period. Without it "price: 48" is
 * ambiguous between $48 a year and $48 once, and the ambiguity is in our
 * favour — which is exactly when it must be removed. `billingDuration` +
 * `unitCode: "MON"` is schema.org's way of saying "per N months", and N is the
 * ladder's own `months`.
 */
export function ladderOffers({ prices = null } = {}) {
  const resolved = resolvePlanLadder({ prices })
  const offers = [{
    '@type': 'Offer',
    name: 'Free',
    price: '0',
    priceCurrency: CURRENCY_CODE,
    url: `${ORIGIN}/plans`,
  }]
  for (const plan of purchasablePlans(resolved)) {
    offers.push({
      '@type': 'Offer',
      name: `Pro — ${plan.label}`,
      description: `UIL4B Pro, ${plan.cadence}.`,
      price: String(plan.total),
      priceCurrency: plan.currency.toUpperCase(),
      url: `${ORIGIN}/plans`,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.total,
        priceCurrency: plan.currency.toUpperCase(),
        billingDuration: plan.months,
        billingIncrement: 1,
        unitCode: 'MON',
      },
    })
  }
  return offers
}

/** The site-level WebApplication entity, with the ladder's offers on it. */
export function webApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'UIL4B Design Toolkit',
    url: ORIGIN,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    // IMPORTED, NOT RETYPED. This is the one description the runtime can never
    // repair: App.jsx rewrites <title> and the description/og/twitter META tags
    // on hydration, but nothing rewrites JSON-LD, so whatever is written here
    // ships to every structured-data consumer permanently. It carried a fourth,
    // hand-typed variant until 2026-09-14.
    description: DEFAULT_DESCRIPTION,
    offers: ladderOffers(),
  }
}

/** That entity as the <script> tag index.html used to hold literally. */
export function webApplicationJsonLd() {
  return '<script type="application/ld+json">\n'
    + `${JSON.stringify(webApplicationSchema(), null, 2)}\n`
    + '</script>'
}

/**
 * The <noscript> pricing sentence.
 *
 * "from $X" is the SAME arithmetic the upgrade modal's headline uses —
 * cheapestPerMonth() over the tiers that can actually reach checkout — so the
 * static shell and the rendered app cannot quote different lead prices. Today
 * that is the yearly tier's $48 / 12.
 *
 * The currency is named. On screen the app detects a currency from the
 * visitor's locale; a static shell cannot, so it quotes the approved USD ladder
 * and says so rather than leaving a bare "$4" to be read as local money.
 */
export function pricingSentence() {
  const lead = cheapestPerMonth(resolvePlanLadder())
  const price = lead
    ? `from ${formatMoney(lead.perMonth, lead.currency)} ${CURRENCY_CODE} a month`
    : null
  return 'Every core tool is free forever, with '
    + `${AI_LIMITS.free.daily} AI generations a day and ${AI_LIMITS.free.monthly} a month. `
    + (price ? `Pro is ${price}` : 'Pro')
    + ` and raises that to ${AI_LIMITS.pro.daily} a day and ${AI_LIMITS.pro.monthly} a month, `
    + 'adds the advanced colour controls, and removes the export watermark. '
    + 'Free and Pro run the same AI model.'
}

/** That sentence as the paragraph index.html used to hold literally. */
export function pricingParagraph() {
  return `<p>${text(pricingSentence())}</p>`
}

/**
 * Substitute both markers in one HTML document.
 *
 * Throws when a marker is missing. A silent no-op here is the failure this
 * whole module exists to prevent: the page would ship with no price at all
 * while the build stayed green, and the next reader would have no way to tell
 * that from a deliberate omission.
 */
export function applyPricingHtml(html, { file = 'index.html' } = {}) {
  let out = String(html)
  for (const [marker, replacement] of [
    [JSONLD_MARKER, webApplicationJsonLd()],
    [PRICING_MARKER, pricingParagraph()],
  ]) {
    if (!out.includes(marker)) {
      throw new Error(
        `site-pricing: ${file} does not contain ${marker}. The price in this page `
        + 'is generated from src/config/planLadder.js and must never be typed in — '
        + 'restore the marker rather than pasting a number.',
      )
    }
    out = out.split(marker).join(replacement)
  }
  return out
}
