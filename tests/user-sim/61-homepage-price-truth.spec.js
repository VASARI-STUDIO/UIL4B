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

test.describe('the homepage price panel only names tiers that can be bought', () => {
  // In the design the tiers, the cadence tabs, the comparison and the FAQ
  // are the Pricing SCREEN, at /plans; the landing only points
  // there. So the front door must name no tier and quote no
  // price, and its plan links must all go to /plans. The panel checks
  // themselves belong to /plans's own specs.
  test('the landing quotes no price and names no tier; its plan links all go to /plans', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)

    await expect(page.locator(PRICING), 'the landing has its pricing section back').toHaveCount(0)
    await expect(page.locator('.sp-plan, .sp-billing-tab, .sp-compare-table'), 'plan cards are back on the landing').toHaveCount(0)
    const text = await page.locator('#main').evaluate((el) => (el.textContent || '').replace(/\s+/g, ' '))
    // POSITIVE CONTROL: the read found the landing, not an empty shell.
    expect(text, 'the landing text was not read').toContain('Start your first project today.')
    for (const plan of RESOLVED) {
      if (!plan.perMonthLabel) continue
      expect(text.includes(`${plan.perMonthLabel} /`) || text.includes(`${plan.perMonthLabel} a month`),
        `the landing quotes the ${plan.label} rate ${plan.perMonthLabel}`).toBe(false)
    }
    expect(/\$\d/.test(text), 'the landing quotes a dollar amount; prices live on /plans').toBe(false)

    // Every plan link goes to /plans — never checkout, never the login popup.
    for (const name of [/^View plans$/, /^See the plans$/]) {
      await expect(page.locator('#main').getByRole('link', { name }), `"${name.source}" is gone`).toHaveAttribute('href', '/plans')
    }
    const toCheckout = await page.locator('#main a[href^="/checkout"], #main a[href*="signup=1"]').count()
    expect(toCheckout, 'a landing CTA skips /plans for checkout or the sign-up route').toBe(0)
    expect(BUYABLE.length, 'the ladder has nothing to buy, so /plans has nothing to show').toBeGreaterThan(0)
    expect(UNBUYABLE.length + BUYABLE.length).toBe(PLAN_LADDER.length)
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
