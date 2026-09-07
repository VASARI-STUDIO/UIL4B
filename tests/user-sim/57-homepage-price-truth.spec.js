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

// Bring the pricing panel into view and let its reveal finish. `.hprice-panel`
// carries `data-reveal`, and global.css starts every one of those at
// `opacity: 0` — the exact state that let an entire closing CTA ship invisible
// on /plans while Playwright clicked it happily, so the opacity assertion in
// the first test below is the one that matters most here.
//
// WAITING FOR STABILITY ALONE IS THE WRONG WAIT, and the first version of this
// helper did exactly that: it polled until the opacity had held the same value
// for six frames. `0` is a perfectly stable value, so the loop returned
// immediately — before the reveal had begun — and reported a panel that
// reveals fine as invisible. Verified in a browser afterwards: the panel
// reaches opacity 1 under a real wheel gesture, the End key AND
// scrollIntoView. So this waits for the panel to ARRIVE and only treats the
// timeout as an answer, leaving the assertion to report the measured number
// rather than throwing a wait error over it.
async function revealPricing(page) {
  await page.evaluate(() => document.querySelector('.hprice-panel')?.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.hprice-panel')
      return !!el && Number(getComputedStyle(el).opacity) > 0.9
    },
    null,
    { timeout: 10000, polling: 'raf' },
  ).catch(() => {})
}

test.describe('the homepage price panel only names tiers that can be bought', () => {
  test('no unpurchasable tier is advertised, and every purchasable one is', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)
    await revealPricing(page)

    const panel = await page.evaluate(() => {
      const el = document.querySelector('.hprice-panel')
      if (!el) return null
      return {
        text: el.innerText,
        opacity: Number(getComputedStyle(el).opacity),
        rowCount: el.querySelectorAll('.hprice-row').length,
      }
    })

    // ── Positive controls. Every assertion below is an absence or a match, and
    //    both are trivially satisfiable by a panel that failed to render.
    expect(panel, 'the pricing panel is not in the DOM at all').not.toBeNull()
    expect(panel.rowCount, 'the pricing panel rendered no rows — the tier assertions below would pass vacuously')
      .toBeGreaterThan(0)
    expect(panel.opacity, 'the pricing panel is on the page at opacity 0 — a visitor cannot read any of this')
      .toBeGreaterThan(0.9)

    // ── The central guard. A tier with no `checkoutPlan` has nothing that can
    //    accept the click: Checkout.jsx only accepts monthly|yearly|lifetime.
    expect(UNBUYABLE.length, 'planLadder.js currently has no unpurchasable tier, so this guard is not exercising anything — if quarterly was wired up, delete this test with it')
      .toBeGreaterThan(0)

    // CASE-INSENSITIVELY, and that is load-bearing rather than tidy. The row
    // labels are uppercased in CSS, so `innerText` reads "MONTHLY" while the
    // ladder says "Monthly". A case-SENSITIVE absence check would have been
    // satisfied by a panel with "QUARTERLY" printed across it — an assertion
    // that could not fail, guarding the one claim this file exists for.
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

  test('the headline price is the cheapest tier that can actually be bought', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)
    await revealPricing(page)

    const heading = await page.locator('#hprice-title').innerText()
    const cheapest = cheapestPerMonth(RESOLVED)

    expect(cheapest?.perMonthLabel, 'the ladder resolved no purchasable per-month figure').toBeTruthy()
    expect(
      heading.includes(cheapest.perMonthLabel),
      `the headline reads "${heading.replace(/\s+/g, ' ').trim()}" but the cheapest buyable tier is ${cheapest.perMonthLabel}/month (${cheapest.label})`,
    ).toBe(true)

    // A typed headline survives a ladder change; a derived one cannot. Guard
    // the direction that matters: the headline must not quote a figure that
    // belongs only to a tier nobody can buy.
    for (const plan of UNBUYABLE) {
      if (!plan.perMonthLabel || plan.perMonthLabel === cheapest.perMonthLabel) continue
      expect(
        heading.includes(plan.perMonthLabel),
        `the headline quotes ${plan.perMonthLabel}, which is the ${plan.label} rate — a tier that cannot be bought`,
      ).toBe(false)
    }
  })

  test('the homepage does not promise a cancellation the billing portal cannot do', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page)
    await revealPricing(page)

    const bodyText = await page.evaluate(() => document.body.innerText)

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
