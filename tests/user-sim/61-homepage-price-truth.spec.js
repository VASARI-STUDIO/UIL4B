// What the HOMEPAGE says about money, checked against the one ladder that
// knows which tiers can actually be bought.
//
// 54-plans-truth.spec.js does this for /plans. This file exists because /plans
// was not the only surface quoting a price, and it was not the one a visitor
// reads first. The homepage kept its own hand-typed PRICE_LADDER array, and by
// the 2026-09-06 sweep that copy had drifted into three claims the rest of the
// app had already retracted:
//
//   · a QUARTERLY tier, which planLadder.js marks `checkoutPlan: null` and its
//     own flag describes as dead-ending on "Invalid selection". /plans had
//     dropped it and scripts/site-pricing.mjs had already excluded it from the
//     structured data. The front page was the last surface still selling it.
//   · "Cancel any time" on the monthly row, which Plans.jsx removed under a
//     founder flag because the Stripe Customer Portal has no cancellation flow
//     enabled ([stripe-retention-config] is blocked).
//   · a typed "$4/month" headline, next to a planLadder.js export documented as
//     "the honest headline … never typed into copy".
//
// The rule this enforces is the one /plans already lives under: a sales surface
// may not advertise something the product cannot honour. It is asserted at the
// DOM rather than in the source because every figure in that panel is now
// derived, so the literals only exist after render.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture, and tests/unit/one-tap-stub.test.js
// fails the build for any spec that reaches past it.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'
import {
  PLAN_LADDER,
  cheapestPerMonth,
  purchasablePlans,
  resolvePlanLadder,
} from '../../src/config/planLadder.js'

const PERSONA = 'a first-time visitor reading the price on the front page'

// The ladder the page is supposed to be derived FROM, resolved the same way the
// page resolves it (no live prices — the homepage panel is display-only).
const RESOLVED = resolvePlanLadder()
const BUYABLE = purchasablePlans(RESOLVED)
const UNBUYABLE = RESOLVED.filter((p) => !p.purchasable)

// ─────────────────────────────────────────────────────────────────────────────
// THE PANEL MOVED, AND SO DID THE WAIT — ALL THE WAY OUT
// ─────────────────────────────────────────────────────────────────────────────
// Home.jsx's `.hprice-panel` is gone with the page. The front door's money is
// now the `#pricing` section of Spectrum: `.sp-billing` (one tab per cadence,
// from `LADDER`), two `.sp-plan` cards tagged `.sp-plan-tier` FREE / PRO, and
// `.sp-compare-foot`, which is where the derived cheapest rate is stated in a
// sentence. Every figure in it still comes from planLadder.js — Spectrum.jsx
// refuses to type a number — so this file's subject is unchanged.
//
// THE `revealPricing()` HELPER IS DELETED RATHER THAN RE-POINTED, and that is
// the interesting half. It existed because `[data-reveal]` STARTS at opacity 0
// and waits for a scroll observer, so the panel had to be brought into view
// before it could be read — the exact state that let a closing CTA ship
// invisible on /plans while Playwright clicked it happily.
//
// `[data-sp-reveal]` inverts that contract: it carries no opacity of its own,
// the entrance is a keyframe animation that only exists while `.is-in` is on
// the element, and its last frame is the element's ordinary appearance (see
// useSpectrumReveal.js, which measured 16 of 19 blocks left blank by the old
// ordering on a fast pass). So the resting state is VISIBLE and there is
// nothing to wait for.
//
// That makes the opacity assertion below STRONGER than it was, not weaker: it
// is now read WITHOUT scrolling to the section, so a reading of 1 is evidence
// about the resting state itself. Restore `opacity:0` to the reveal attribute
// and this fails on the next run, with no scroll to hide behind.
const PRICING = '#pricing'

/** What the front door's pricing section says, read where it rests. */
const readPricing = (page) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const plans = el.querySelector('.sp-plans')
  return {
    // textContent, not innerText: the claim is what the section SAYS, and a
    // block the reader has not scrolled to must not be able to hide a retired
    // tier from this sweep.
    text: el.textContent || '',
    opacity: Number(getComputedStyle(plans || el).opacity),
    // The two things that NAME a tier: the cadence tabs and the plan cards.
    cadenceCount: el.querySelectorAll('.sp-billing-tab').length,
    tierCount: el.querySelectorAll('.sp-plan-tier').length,
  }
}, PRICING)

test.describe('the homepage price panel only names tiers that can be bought', () => {
  test('no unpurchasable tier is advertised, and every purchasable one is', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)

    const panel = await readPricing(page)

    // ── Positive controls. Every assertion below is an absence or a match, and
    //    both are trivially satisfiable by a panel that failed to render.
    expect(panel, 'the pricing section is not in the DOM at all').not.toBeNull()
    expect(panel.cadenceCount, 'the pricing section rendered no cadence tabs — the tier assertions below would pass vacuously')
      .toBe(BUYABLE.length)
    expect(panel.tierCount, 'the pricing section rendered no plan cards — FREE and PRO are what the tier names hang on')
      .toBe(2)
    // Read WITHOUT scrolling to it, which is what makes this a statement about
    // the resting state rather than about a reveal that happened to fire.
    expect(panel.opacity, 'the pricing panel rests at opacity 0 — a visitor who has not scrolled to it '
      + 'sees nothing, which is the ordering useSpectrumReveal.js exists to prevent')
      .toBeGreaterThan(0.9)

    // ── The central guard. A tier with no `checkoutPlan` has nothing that can
    //    accept the click: Checkout.jsx only accepts monthly|yearly|lifetime.
    expect(UNBUYABLE.length, 'planLadder.js currently has no unpurchasable tier, so this guard is not exercising anything — if quarterly was wired up, delete this test with it')
      .toBeGreaterThan(0)

    // CASE-INSENSITIVELY, and that is load-bearing rather than tidy. The tab
    // and tier labels are uppercased in CSS, so what is PAINTED is "MONTHLY"
    // while the ladder says "Monthly". A case-SENSITIVE absence check would
    // have been satisfied by a panel with "QUARTERLY" printed across it — an
    // assertion that could not fail, guarding the one claim this file exists
    // for. (`textContent` returns the authored case, which is the same
    // argument from the other end: neither reading may decide the result.)
    const names = panel.text.toLowerCase()
    for (const plan of UNBUYABLE) {
      expect(
        names.includes(plan.label.toLowerCase()),
        `the homepage advertises the ${plan.label} tier, which has no checkoutPlan and dead-ends at "Invalid selection"`,
      ).toBe(false)
    }

    // ── …and both directions, so this cannot be satisfied by a panel that
    //    stopped naming tiers at all.
    for (const plan of BUYABLE) {
      expect(
        names.includes(plan.label.toLowerCase()),
        `the homepage no longer names the ${plan.label} tier, which is one the product does sell`,
      ).toBe(true)
    }
  })

  // THE HEADLINE FIGURE MOVED OUT OF THE HEADING, AND THAT IS THE POINT OF
  // RE-POINTING RATHER THAN RETIRING THIS.
  //
  // Home's `#hprice-title` quoted the rate in the heading itself. Spectrum's
  // `#sp-price-h` deliberately does not — it reads "The whole toolkit is free.
  // Pro adds room.", because /plans's own h1 is the position and a visitor must
  // not meet two different ones. The claim this test exists for did not move
  // with it: SOMEWHERE on the front door a headline rate is stated, and it must
  // be the cheapest one a person can actually buy. On Spectrum that sentence is
  // `.sp-compare-foot` ("…Pro starts at $4 a month"), rendered from `CHEAPEST`,
  // which is `cheapestPerMonth(RESOLVED)` — the same export this file resolves.
  //
  // The Pro card's own `$N / month` is asserted beside it because the two can
  // disagree: the card shows the PRESELECTED cadence's rate, which is seeded
  // from the ladder's `best` flag, and a ladder where the recommended cadence
  // is not the cheapest would put two different rates a card apart.
  test('the headline price is the cheapest tier that can actually be bought', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)

    const cheapest = cheapestPerMonth(RESOLVED)
    expect(cheapest?.perMonthLabel, 'the ladder resolved no purchasable per-month figure').toBeTruthy()

    const headline = (await page.locator('.sp-compare-foot').innerText()).replace(/\s+/g, ' ').trim()
    // POSITIVE CONTROL — the sentence is on the page and says something. An
    // empty string satisfies the absence half below for free.
    expect(headline.length, 'the front door no longer states a headline rate anywhere, so the '
      + 'checks below are guarding an empty string').toBeGreaterThan(20)

    expect(
      headline.includes(cheapest.perMonthLabel),
      `the headline reads "${headline}" but the cheapest buyable tier is ${cheapest.perMonthLabel}/month (${cheapest.label})`,
    ).toBe(true)

    // A typed headline survives a ladder change; a derived one cannot. Guard
    // the direction that matters: the headline must not quote a figure that
    // belongs only to a tier nobody can buy.
    for (const plan of UNBUYABLE) {
      if (!plan.perMonthLabel || plan.perMonthLabel === cheapest.perMonthLabel) continue
      expect(
        headline.includes(plan.perMonthLabel),
        `the headline quotes ${plan.perMonthLabel}, which is the ${plan.label} rate — a tier that cannot be bought`,
      ).toBe(false)
    }

    // …and the card a visitor clicks agrees with the sentence they just read.
    const card = (await page.locator('.sp-plan--pro .sp-plan-price').innerText()).replace(/\s+/g, ' ').trim()
    expect(
      card.includes(cheapest.perMonthLabel),
      `the Pro card leads with "${card}" while the sentence under the table says `
      + `${cheapest.perMonthLabel} — the preselected cadence is not the cheapest buyable one`,
    ).toBe(true)
  })

  test('the homepage does not promise a cancellation the billing portal cannot do', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)

    // textContent rather than innerText, for the reason 62-retired-taglines
    // records at length: the claim is that the sentence is not on the page,
    // including in a band the visitor has not scrolled to and including in
    // sr-only text a screen reader would announce.
    const bodyText = await page.evaluate(() => {
      const clone = document.body.cloneNode(true)
      clone.querySelectorAll('script, style, template, noscript').forEach((n) => n.remove())
      return clone.textContent || ''
    })

    expect(bodyText.length, 'the homepage rendered almost nothing — this absence check would pass vacuously')
      .toBeGreaterThan(500)
    expect(
      /cancel any time/i.test(bodyText),
      'the homepage says "cancel any time". [stripe-retention-config] is blocked: the Stripe Customer Portal has no cancellation flow enabled, so there is no control behind that sentence. Plans.jsx removed the same line under a founder flag — put both back together when the portal is configured.',
    ).toBe(false)
  })

  test('every tier the ladder calls purchasable has somewhere to go', async ({ page }) => {
    // Guards the OTHER direction of the same rule, and it is the one that would
    // catch a ladder edit rather than a copy edit: if a tier is marked
    // purchasable here it must be a plan Checkout actually accepts, or the
    // homepage will start advertising another dead end.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    for (const plan of PLAN_LADDER) {
      if (!plan.checkoutPlan) continue
      const res = await page.request.get(`/checkout?plan=${plan.checkoutPlan}`)
      expect(res.status(), `/checkout?plan=${plan.checkoutPlan} does not resolve`).toBeLessThan(400)
    }
  })
})
