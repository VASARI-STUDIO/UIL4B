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
// The banner itself needs a signed-in user with a failing Stripe subscription,
// which this suite has no way to create. So the markup is injected and the
// REAL stylesheet is measured against it. That tests exactly the half unit
// tests can't reach, and nothing it already covers.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Mirrors BillingBanner.jsx's rendered structure. If that component's class
// names change, this stops measuring anything and the assertions below will
// fail loudly rather than pass vacuously — see the sanity check in each test.
const MARKUP = `
  <div class="bill-banner bill-banner--urgent" role="status">
    <div class="bill-banner-body">
      <p class="bill-banner-title">Your last payment didn't go through</p>
      <p class="bill-banner-text">Pro stays on for 5 more days while you update your card.</p>
      <div class="bill-banner-actions">
        <button type="button" class="bill-banner-cta">Update payment method</button>
        <a class="bill-banner-link" href="/settings">Settings</a>
      </div>
    </div>
    <button type="button" class="bill-banner-x" aria-label="Dismiss this notice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>`

async function mount(page) {
  await page.evaluate((html) => {
    document.querySelector('.bill-banner')?.remove()
    document.body.insertAdjacentHTML('beforeend', html)
  }, MARKUP)
  // Vacuity guard: if the stylesheet no longer has these rules, the banner
  // would be an unstyled static div and every geometry assertion below would
  // pass by accident.
  const positioned = await page.evaluate(
    () => getComputedStyle(document.querySelector('.bill-banner')).position,
  )
  expect(positioned, 'the .bill-banner rules must still exist in global.css').toBe('fixed')
}

test.describe('billing banner layout', () => {
  test('does not cover the feedback button at 320px', async ({ page }) => {
    watch(page, 'a Pro user with a failing card on a small phone')
    await page.setViewportSize({ width: 320, height: 800 })
    await go(page, '/plans')
    await mount(page)

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
    await go(page, '/plans')
    await mount(page)

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
    await go(page, '/plans')
    await mount(page)

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

  /* The project-quota note (audit B6) must never reach a signed-out visitor.
   *
   * Same limitation as the banner above: the note itself needs a signed-in user
   * with saved projects, which this suite has no way to create, so the WARNED
   * states are pinned exhaustively in tests/unit/project-quota.test.js instead.
   * What only a browser can check is the half that is not quota maths at all —
   * that nothing on the way in leaks a free-plan allowance at a stranger.
   *
   * Worth recording, because it surprised this change: /projects is wrapped in
   * RequireAuth (App.jsx), which redirects to /login before Projects.jsx renders
   * anything. The `!canSaveProjects` sign-in panel INSIDE Projects.jsx is
   * therefore unreachable for a signed-out visitor — so this test asserts the
   * redirect that actually happens rather than a screen that does not. Unwrap
   * that route, or hoist the quota block somewhere public, and a person who has
   * never signed in gets told what their plan allows. */
  test('a signed-out visitor is redirected and never told about a project allowance', async ({ page }) => {
    watch(page, 'a stranger opening Projects before signing in')
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/projects')

      // Vacuity guard: prove we actually landed somewhere, so a blank render
      // cannot make the absence below pass by accident.
      await page.locator('main, .sec, #root > *').first().waitFor()
      await expect(page, `${width}px: /projects is behind RequireAuth`).toHaveURL(/\/login/)

      await expect(
        page.getByTestId('project-quota-note'),
        `at ${width}px a signed-out visitor has no allowance to be told about`,
      ).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText('on the free plan')
    }
  })
})
