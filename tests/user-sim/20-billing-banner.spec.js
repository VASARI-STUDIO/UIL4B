// The billing banner's LAYOUT, which unit tests cannot see.
//
// tests/unit/billing-state.test.js already covers every rule about who keeps
// Pro and what they're told. What it cannot cover is where the thing lands on
// a real page — and that is where both of this feature's bugs were:
//
//   1. At 320px the banner goes full-width and sat directly on top of the
//      feedback FAB. Banner z-index 120 beats the FAB's 80, so the FAB was
//      covered and unclickable. A notice that disables the "report a problem"
//      button is a notice that guarantees the problem goes unreported.
//   2. The dismiss button rendered 23x23 — one pixel under WCAG 2.5.8's 24px
//      minimum, from padding maths rather than an explicit box.
//
// ── THIS FILE USED TO INJECT ITS OWN MARKUP. IT NOW RENDERS THE COMPONENT ──
//
// The header here read, for as long as this file has existed:
//
//     "The banner itself needs a signed-in user with a failing Stripe
//      subscription, which this suite has no way to create. So the markup is
//      injected and the REAL stylesheet is measured against it."
//
// That was true and it was the best available answer, but it bought the
// geometry at the price of the wiring. A hand-written copy of the component's
// DOM measures the STYLESHEET against a shape a test author typed. It cannot
// see the component render the wrong class for a severity, put the dismiss
// button outside the flex row, or — the failure that would matter most — never
// render at all for the state it exists to announce. The old MARKUP constant
// carried a comment admitting exactly this: "if that component's class names
// change, this stops measuring anything."
//
// `signIn()` (tests/user-sim/helpers.js) closed the gap the header described.
// The session below is a Pro subscriber whose card failed two days ago, stated
// as the `subscription` document api/stripe-webhook.js would have written —
// so `billingAlert()` classifies it, `BillingBanner` chooses its own copy and
// its own severity class, and what is measured is what ships. The geometry
// assertions are unchanged; they now have something real underneath them.
//
// THE VACUITY GUARD MOVED WITH IT, and got stronger. It used to check that
// `.bill-banner` computed to `position: fixed`, which proved the stylesheet
// still had rules. It now also reads the TITLE the component chose, so a
// banner that renders for the wrong reason — or renders the lapsed copy for a
// subscription still inside its grace window — fails here rather than passing
// as a correctly positioned rectangle.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

// Two days into the seven-day past-due grace, so `billingAlert()` returns
// `payment-failed` (urgent, still Pro) rather than `payment-lapsed`. The five
// remaining days are arithmetic the component does, and are asserted below
// rather than assumed — a banner that quietly said "0 more days" would be
// telling a paying customer the wrong thing.
const FAILED_DAYS_AGO = 2
const GRACE_DAYS = 7

function failingCard() {
  const failedAt = Date.now() - FAILED_DAYS_AGO * 86_400_000
  return {
    status: 'past_due',
    interval: 'monthly',
    paymentFailed: true,
    paymentFailedAt: failedAt,
    currentPeriodEnd: failedAt + 28 * 86_400_000,
    updatedAt: failedAt,
  }
}

/**
 * Put a Pro subscriber with a failing card on `/plans`, and wait for the app's
 * own banner.
 *
 * Returns nothing: everything the tests need is on the page. The guard here is
 * the whole reason this is a function — every assertion below is geometry, and
 * geometry on an element that never rendered is the vacuous pass this suite
 * keeps having to design against.
 */
async function withFailingCard(page) {
  await signIn(page, { plan: 'pro', subscription: failingCard() })
  // An app-shell page, where the fixed feedback button also sits. /plans is a
  // marketing page (the Pricing screen) that takes no feedback button, like `/`.
  await go(page, '/help')

  const banner = page.locator('.bill-banner')
  await expect(banner, 'the app must raise its own banner for a failing card').toBeVisible()

  // It must be the URGENT variant, chosen by the component from the alert's
  // severity — the modifier the 320px layout rules key off.
  await expect(banner).toHaveClass(/bill-banner--urgent/)

  // And it must be saying the right thing. `daysLeft` is computed from the
  // failure instant, so this is the component's arithmetic, not a literal.
  await expect(banner.locator('.bill-banner-title'))
    .toHaveText(/Your last payment didn’t go through/)
  await expect(banner.locator('.bill-banner-text'))
    .toHaveText(new RegExp(`Pro stays on for ${GRACE_DAYS - FAILED_DAYS_AGO} more days`))

  // The stylesheet is still doing the positioning. Kept from the injected
  // version: without it every geometry assertion below could pass against an
  // unstyled static div.
  const positioned = await banner.evaluate((el) => getComputedStyle(el).position)
  expect(positioned, 'the .bill-banner rules must still exist in global.css').toBe('fixed')
}

test.describe('billing banner layout', () => {
  test('does not cover the feedback button at 320px', async ({ page }) => {
    watch(page, 'a Pro user with a failing card on a small phone')
    await page.setViewportSize({ width: 320, height: 800 })
    await withFailingCard(page)

    const result = await page.evaluate(() => {
      const banner = document.querySelector('.bill-banner').getBoundingClientRect()
      const fab = document.querySelector('.global-feedback-btn')?.getBoundingClientRect()
      if (!fab) return { fab: false }
      // Geometry is the symptom; hit-testing is the actual user consequence.
      const hit = document.elementFromPoint((fab.left + fab.right) / 2, (fab.top + fab.bottom) / 2)
      return {
        fab: true,
        overlaps: !(banner.right < fab.left || banner.left > fab.right
          || banner.bottom < fab.top || banner.top > fab.bottom),
        clickReachesFab: !!hit?.closest('.global-feedback-btn'),
        withinViewport: banner.left >= 0 && banner.right <= window.innerWidth && banner.top >= 0,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      }
    })

    expect(result.fab, 'the feedback FAB must be present for this test to mean anything').toBe(true)
    expect(result.overlaps, 'the banner must not sit on top of the feedback FAB').toBe(false)
    expect(result.clickReachesFab, 'a click on the FAB must still reach the FAB').toBe(true)
    expect(result.withinViewport, 'the banner must be fully on screen at 320px').toBe(true)
    expect(result.horizontalOverflow, 'the banner must not force the page sideways').toBe(false)
  })

  test('every control meets the 24px minimum target size', async ({ page }) => {
    watch(page, 'a Pro user dismissing a billing notice by touch')
    await page.setViewportSize({ width: 390, height: 844 })
    await withFailingCard(page)

    const sizes = await page.evaluate(() => {
      const of = (sel) => {
        const r = document.querySelector(sel).getBoundingClientRect()
        return [Math.round(r.width), Math.round(r.height)]
      }
      return { dismiss: of('.bill-banner-x'), cta: of('.bill-banner-cta') }
    })

    // WCAG 2.2 SC 2.5.8 (Target Size, Minimum).
    for (const [name, [w, h]] of Object.entries(sizes)) {
      expect(w, `${name} is ${w}px wide, under the 24px minimum`).toBeGreaterThanOrEqual(24)
      expect(h, `${name} is ${h}px tall, under the 24px minimum`).toBeGreaterThanOrEqual(24)
    }
  })

  test('reads at AA and shows a visible focus ring', async ({ page }) => {
    watch(page, 'a keyboard user reading a billing notice')
    await page.setViewportSize({ width: 1440, height: 900 })
    await withFailingCard(page)

    const m = await page.evaluate(() => {
      const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
      const lum = (s) => {
        const [r, g, b] = s.match(/\d+/g).map(Number)
        return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
      }
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p)
        return +((hi + 0.05) / (lo + 0.05)).toFixed(2)
      }
      const banner = document.querySelector('.bill-banner')
      const bg = getComputedStyle(banner).backgroundColor
      const cta = banner.querySelector('.bill-banner-cta')
      // Focus it for real: getComputedStyle(el, ':focus-visible') reads nothing,
      // because only pseudo-ELEMENTS are addressable that way.
      cta.focus()
      const ring = getComputedStyle(cta)
      return {
        title: ratio(getComputedStyle(banner.querySelector('.bill-banner-title')).color, bg),
        body: ratio(getComputedStyle(banner.querySelector('.bill-banner-text')).color, bg),
        ctaLabel: ratio(getComputedStyle(cta).color, getComputedStyle(cta).backgroundColor),
        ringWidth: parseFloat(ring.outlineWidth),
        ringVsCard: ratio(ring.outlineColor, bg),
      }
    })

    expect(m.title, 'the urgent title must reach AA against the card').toBeGreaterThanOrEqual(4.5)
    expect(m.body, 'the body copy must reach AA').toBeGreaterThanOrEqual(4.5)
    expect(m.ctaLabel, 'the CTA label must reach AA against its own fill').toBeGreaterThanOrEqual(4.5)
    // 1.4.11 non-text contrast, 2.4.11 focus appearance.
    expect(m.ringWidth, 'the focus ring must be at least 2px').toBeGreaterThanOrEqual(2)
    expect(m.ringVsCard, 'the focus ring must reach 3:1 against the card').toBeGreaterThanOrEqual(3)
  })

  /* THE POSITIVE CONTROL FOR ALL THREE TESTS ABOVE.
   *
   * They now depend on a banner the app decided to render, so the thing that
   * would make them vacuous is a banner that renders for EVERYONE — at which
   * point they would keep passing while every healthy subscriber got a payment
   * warning. Dismissal is the same shape of hazard from the other side.
   *
   * A Pro subscriber whose card is fine must see nothing at all, and the same
   * banner must go away for good when it is dismissed. */
  test('a healthy subscription raises no banner, and a dismissed one stays dismissed', async ({ page }) => {
    watch(page, 'a Pro subscriber whose card is perfectly fine')
    await signIn(page, { plan: 'pro' })
    await go(page, '/help')   // an app-shell page with the feedback button; see withFailingCard
    // Something must have rendered, or "no banner" is a statement about a blank
    // page rather than about billing.
    await expect(page.locator('.global-feedback-btn')).toBeVisible()
    await expect(
      page.locator('.bill-banner'),
      'a subscriber with nothing wrong must not be warned about their card',
    ).toHaveCount(0)
  })

  test('a dismissed notice stays dismissed for the visit', async ({ page }) => {
    watch(page, 'a Pro user dismissing a billing notice')
    await withFailingCard(page)
    await page.getByRole('button', { name: 'Dismiss this notice' }).click()
    await expect(page.locator('.bill-banner')).toHaveCount(0)

    // Same visit, different page: sessionStorage keeps it down. This is the
    // half a unit test cannot reach, because the key is written by the
    // component and read by the next mount of it.
    await go(page, '/settings')
    await expect(
      page.locator('.bill-banner'),
      'a notice dismissed once must not reappear on the next page of the same visit',
    ).toHaveCount(0)
  })

  /* The project-quota note (audit B6) must never reach a signed-out visitor.
   *
   * THE SIGNED-IN HALF OF THIS IS NOW COVERED, in
   * 57-signed-in-session.spec.js: a free account is told its allowance and the
   * cap refuses the fourth save by name. This test keeps the half that is not
   * quota maths at all — that nothing on the way in leaks a free-plan allowance
   * at a stranger — and it is the direction that can only be checked here.
   *
   * THIS TEST CHANGED SHAPE ON 2026-09-05, and the property did not.
   *
   * It used to assert that /projects REDIRECTS a signed-out visitor to /login,
   * and recorded that the redirect was not immediate: RequireAuth held a loader
   * until Firebase's onAuthStateChanged fired, MEASURED AT ~1s HERE. That
   * measurement is why /projects is no longer behind RequireAuth — it is the page
   * signed-in visitors now land on, and a second of blank loader on the front
   * door is worse than the sales page it replaced. The route renders its own
   * signed-out state instead, which also removes a redirect loop (see the route
   * note in App.jsx).
   *
   * So the visitor now STAYS on /projects and sees the sign-in panel that has sat
   * unreachable inside Projects.jsx since it was written. What must not change is
   * the thing in this test's title: the free-plan allowance lives BELOW that
   * early return and a stranger must never be told what their plan allows. That
   * is asserted more directly than before — against the page they actually reach,
   * rather than against a page they never did.
   *
   * Hoist the quota block above the `canSaveProjects` return and this fails. */
  test('a signed-out visitor gets the page, and is never told about a project allowance', async ({ page }) => {
    watch(page, 'a stranger opening Projects before signing in')
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/projects')

      // Auto-retrying, so this reads the SETTLED signed-out state rather than
      // whatever is on screen while auth is still resolving.
      await expect(
        page.getByRole('button', { name: /sign in/i }).first(),
        `${width}px: the signed-out state must actually render`,
      ).toBeVisible()
      await expect(page, `${width}px: /projects must not bounce a stranger anywhere`)
        .toHaveURL(/\/projects$/)

      await expect(
        page.getByTestId('project-quota-note'),
        `at ${width}px a signed-out visitor has no allowance to be told about`,
      ).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText('on the free plan')
    }
  })
})
