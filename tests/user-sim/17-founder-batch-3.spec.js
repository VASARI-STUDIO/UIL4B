// Regression coverage for the third founder-reported batch.
//
// Same rule as batches 1 and 2 (14- and 16-): each of these reached the founder
// because nothing measured the rendered result. These tests measure it.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

/* ── D5 · Auth from the nav must not navigate ────────────────────────────────
 * Founder: on the Palette Library, "Start for Free" changed the URL to /login,
 * and closing the popup landed on /home instead of back on the library.
 * Was: the nav CTAs were <Link to="/login">, so the SPA left the page before
 * any popup existed — and LoginRoute's dismiss handler fell back to /home. */

/** Where onboarding will send a brand-new sign-up when it finishes. */
const resumeTarget = (page) =>
  page.evaluate(() => sessionStorage.getItem('vs-resume-after-onboarding'))

test.describe('nav auth opens over the page you are on', () => {
  test('Start for Free keeps the Palette Library underneath, and the X leaves you on it', async ({ page }) => {
    watch(page, 'browsing the palette library, signed out')
    await go(page, '/discover/palettes')

    const cta = page.getByRole('button', { name: 'Start for Free' })
    await expect(cta).toBeVisible()

    // Somewhere down the page, so losing the page would be obvious. The gallery
    // grows as it renders and the page uses smooth scrolling, so wheel until it
    // has actually moved rather than assuming one gesture is enough.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(2000)
    for (let i = 0; i < 8 && (await page.evaluate(() => window.scrollY)) < 400; i++) {
      await page.mouse.wheel(0, 700)
      await page.waitForTimeout(250)
    }
    const scrolledTo = await page.evaluate(() => window.scrollY)
    expect(scrolledTo, 'the visitor is well down the library').toBeGreaterThan(400)

    await cta.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // THE BUG, stated: opening auth is not a navigation.
    expect(new URL(page.url()).pathname).toBe('/discover/palettes')
    // The library is still mounted behind the popup.
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached()

    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    // …and dismissing it is not a navigation either. This is the founder's
    // report: the X used to land on /home.
    expect(new URL(page.url()).pathname).toBe('/discover/palettes')
    // Nothing remounted, so the scroll position survived. (The popup locks and
    // releases body scroll, which the smooth-scroll layer settles over a frame
    // or two — hence the tolerance rather than an exact match. The bug this
    // guards against was landing on a different page at scrollY 0.)
    await page.waitForTimeout(600)
    const landedAt = await page.evaluate(() => window.scrollY)
    expect(Math.abs(landedAt - scrolledTo), `stayed put (was ${scrolledTo}, now ${landedAt})`).toBeLessThan(200)
  })

  test('Escape behaves the same as the X', async ({ page }) => {
    watch(page, 'keyboard user on the palette library')
    await go(page, '/discover/palettes')

    await page.getByRole('button', { name: 'Log in' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    expect(new URL(page.url()).pathname).toBe('/discover/palettes')
  })

  test('/login still works as a route, for bookmarks and RequireAuth redirects', async ({ page }) => {
    watch(page, 'arriving on a bookmarked sign-in URL')
    await go(page, '/login')
    await expect(page.getByRole('dialog')).toBeVisible()

    // A protected route still bounces a signed-out visitor here rather than
    // rendering an empty page — and carries the plan it was asked for.
    await go(page, '/checkout?plan=yearly')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/login')
    expect(await resumeTarget(page), 'the chosen plan survives the auth gate').toBe('/checkout?plan=yearly')
  })

  // The carry-over risk in moving auth off the /login route: the stash that
  // lets a brand-new sign-up resume where it started used to live in
  // LoginRoute, so nav-initiated sign-up would have skipped it entirely. It
  // lives in LoginPromptProvider now — where the popup actually opens.
  test('a nav-initiated sign-up still knows where to send the user after onboarding', async ({ page }) => {
    watch(page, 'signing up from the palette library')
    await go(page, '/discover/palettes')

    await page.getByRole('button', { name: 'Start for Free' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await resumeTarget(page), 'onboarding will return them to the library').toBe('/discover/palettes')

    // Dismissing and then arriving at the bare /login launcher must not leave
    // the old page behind as a destination.
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
    await go(page, '/login')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await resumeTarget(page), 'a launcher is not a destination').toBeNull()
  })
})

/* ── D3 · The Font Pair config panel must fit the viewport ───────────────────
 * Founder: the "choose the pair" panel ran off the bottom of the screen and cut
 * off "Build a scale from this pair".
 * Was: .fpr-config was position:sticky with no max-height, inside
 * .fpr-panel{overflow:hidden}, so the overhang could not even be scrolled to.
 * It overflowed at any width >= 981px whenever the viewport was under ~992px. */

function measurePanel(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const box = el.getBoundingClientRect()
    return {
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      height: Math.round(box.height),
      viewport: window.innerHeight,
      position: getComputedStyle(el).position,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }
  })
}

/**
 * Park the page far enough down that the sticky panel is actually stuck.
 *
 * FLAKE ROOT CAUSE — this failed CI twice while passing locally every time,
 * and the numbers gave it away. The panel measured 933px, then 1448px, against
 * a 768px viewport. Both are `naturalDocumentTop + 666`, and 666px is EXACTLY
 * the max-height the CSS bound it to. So the panel was never unbounded: it was
 * correctly sized and simply not stuck, sitting at its resting offset.
 *
 * The app runs Lenis smooth scroll (src/hooks/useSmoothScroll.js), which owns
 * the scroller. A raw window.scrollTo is therefore advisory — Lenis can animate
 * from it or re-apply its own target on the next rAF — so a fixed 500ms wait is
 * a guess about someone else's animation, and on a loaded CI runner the guess
 * lost.
 *
 * Polling on scrollY would only move the guess. What the test actually needs is
 * "the panel is stuck", so that is what this waits for: the element's viewport
 * top sitting at its own computed `top` offset, which is true only once sticky
 * has engaged.
 */
async function settleSticky(page, selector = '.fpr-config') {
  await expect.poll(async () => page.evaluate((sel) => {
    window.scrollTo(0, 1400)
    const el = document.querySelector(sel)
    if (!el) return Number.POSITIVE_INFINITY
    const stickyTop = parseFloat(getComputedStyle(el).top)
    if (!Number.isFinite(stickyTop)) return Number.POSITIVE_INFINITY
    return Math.abs(el.getBoundingClientRect().top - stickyTop)
  }, selector), {
    timeout: 10000,
    intervals: [100, 200, 300, 500],
    message: `${selector} never became stuck — the scroll did not settle`,
  }).toBeLessThanOrEqual(2)
}

test.describe('Font Pair · the sticky config panel is bounded by the viewport', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    test(`it fits at ${viewport.width}x${viewport.height}, and the hand-off is reachable`, async ({ page }) => {
      await page.setViewportSize(viewport)
      watch(page, 'designer pairing fonts on a laptop')
      await go(page, '/create/font-pair')

      await expect(page.locator('.fpr-config')).toBeVisible()
      await settleSticky(page)

      const panel = await measurePanel(page, '.fpr-config')
      expect(panel.position, 'the founder likes the sticky movement').toBe('sticky')
      // THE BUG, stated: the panel used to end 92px (1440x900) and 224px
      // (1366x768) below the fold.
      expect(panel.bottom, 'the panel ends inside the viewport').toBeLessThanOrEqual(panel.viewport)
      expect(panel.top, 'and still starts below the nav').toBeGreaterThan(0)

      // Whatever no longer fits is scrolled, not clipped.
      const handoff = page.locator('.fpr-config .fpr-handoff').first()
      await handoff.scrollIntoViewIfNeeded()
      await expect(handoff).toBeInViewport()
    })
  }

  test('it still fits when the panel content grows — a family with a third weight row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    watch(page, 'designer pairing a family with a dozen weights')
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-config')).toBeVisible()

    // A 12-variant family wraps each weight picker onto a third row, ~68px a
    // piece. Add that height directly so the bound is tested rather than a
    // particular font's catalogue entry.
    await page.locator('.fpr-config').first().evaluate((el) => {
      const spacer = document.createElement('div')
      spacer.style.height = '160px'
      spacer.style.flex = '0 0 auto'
      el.appendChild(spacer)
    })
    await settleSticky(page)

    const panel = await measurePanel(page, '.fpr-config')
    expect(panel.bottom).toBeLessThanOrEqual(panel.viewport)
    expect(panel.scrollHeight, 'the extra height went into the scroller').toBeGreaterThan(panel.clientHeight)
  })

  test('below 981px it goes back to a plain stacked panel with no inner scroller', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    watch(page, 'designer pairing fonts on a tablet')
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-config')).toBeVisible()

    const panel = await measurePanel(page, '.fpr-config')
    expect(panel.position).toBe('static')
    // A stacked panel scrolls with the page; a nested scrollbar here would be
    // the fix leaking into the layout it does not apply to.
    expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight + 1)
  })
})

/* ── D1 · Temperature must not jump across zero ──────────────────────────────
 * Founder: dragging Temperature slowly across zero went 7 → 0 → −7.
 * Was: snapValue() was a hard step, discontinuous by exactly snapRadius (6) at
 * the boundary — an ~8px dead band mid-track then a seven-unit leap. The unit
 * contract is in tests/unit/slider-snap.test.js; this is the rendered drag. */

test.describe('Palette Builder · Temperature crosses zero continuously', () => {
  test('a slow drag across zero never leaps, and reaches values either side', async ({ page }) => {
    watch(page, 'designer warming a palette by hand')
    await go(page, '/create/palette')

    const slider = page.locator('input[type=range][aria-label*="Temperature" i]').first()
    await expect(slider).toBeVisible()
    const readout = page.locator('.plb-adjust-field', { has: slider }).locator('.snapv-value').first()
    await expect(readout).toBeVisible()

    const box = await slider.boundingBox()
    const centreX = box.x + box.width / 2
    const centreY = box.y + box.height / 2

    await page.mouse.move(centreX, centreY)
    await page.mouse.down()
    const seen = []
    for (let dx = -8; dx <= 8; dx++) {
      await page.mouse.move(centreX + dx, centreY)
      await page.waitForTimeout(25)
      seen.push(Number(await readout.textContent()))
    }
    await page.mouse.up()

    // THE BUG, stated: one pixel of pointer travel used to move the value by 7
    // (and by 8 on a narrower track), because the snap switched off at the
    // radius instead of fading out. The ~100px-wide track already carries ~2
    // track units per pixel with no snapping at all, so 3 is one unit of
    // magnetism on top of the track's own resolution — not a leap.
    let worst = 0
    for (let i = 1; i < seen.length; i++) worst = Math.max(worst, Math.abs(seen[i] - seen[i - 1]))
    expect(worst, `no leap across zero (saw ${seen.join(',')})`).toBeLessThanOrEqual(3)

    // …and the band the leap used to erase now holds real values.
    const nearZero = seen.filter((v) => Math.abs(v) >= 1 && Math.abs(v) <= 6)
    expect(nearZero.length, `values between 0 and ±6 are reachable (saw ${seen.join(',')})`).toBeGreaterThan(2)

    // The snap itself survives: the middle of the track still reads 0.
    expect(seen).toContain(0)
  })

  test('keyboard stepping still bypasses the snap entirely', async ({ page }) => {
    watch(page, 'keyboard user tuning temperature')
    await go(page, '/create/palette')

    const slider = page.locator('input[type=range][aria-label*="Temperature" i]').first()
    await slider.focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('End')
    await expect.poll(() => slider.inputValue()).toBe('100')
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft')
    await expect.poll(() => slider.inputValue()).toBe('97')
  })
})
