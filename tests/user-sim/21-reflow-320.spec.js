// Nothing may be clipped out of reach at 320px (WCAG 1.4.10, Reflow).
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS ABOUT REACHABILITY, NOT WIDTH
// ─────────────────────────────────────────────────────────────────────────────
// `body { overflow-x: clip }` is set site-wide. That is a deliberate choice —
// it stops a stray wide element giving the whole page a horizontal scrollbar —
// but it has a sharp edge: anything wider than the viewport is silently CUT
// OFF rather than scrolled to. Content does not look broken, it just is not
// there.
//
// So "is it wider than the viewport" is the wrong question. Plenty of things
// legitimately are — a chip row, a code block, a wide table — and they are fine
// because they sit in their own scroller. The question is whether a person can
// REACH it. This sweep only reports an element that overflows the viewport AND
// has no scrollable ancestor.
//
// What it caught (2026-08-11 site audit, P2), all three from the same family
// of mistake — a flex item that refuses to shrink:
//
//   /create/palette      .plb-col-tools at right:367 vs a 315px viewport. Lock,
//                       copy and delete on every colour were simply unreachable.
//   /discover/prompts   .pl-add-btn — "Submit prompt", the primary CTA — at
//                       right:535. Entirely off screen.
//   /create/type-scale          .tsc-row-text at 1328px inside a 247px row. The rule
//                       already asked for an ellipsis; `min-width: auto` on the
//                       parent flex item meant it never applied.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// 320px is the narrowest viewport WCAG 1.4.10 requires (it is 400px CSS at
// 400% zoom). Chromium reports ~315px of client width after the scrollbar.
const NARROW = { width: 320, height: 800 }

const ROUTES = [
  '/',
  '/create/palette',
  '/discover/prompts',
  '/create/type-scale',
  '/create/icons',
  '/plans',
  '/create/font-pair',
  '/create/aspect-ratio',
]

/**
 * Every element that overflows the viewport with no scrollable ancestor.
 *
 * Returns descriptors rather than a bare count so a failure names the element,
 * which is the difference between a finding someone can act on and one that
 * starts another investigation.
 */
async function unreachable(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const hasScrollableAncestor = (el) => {
      let n = el.parentElement
      while (n && n !== document.body) {
        const cs = getComputedStyle(n)
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true
        n = n.parentElement
      }
      return false
    }
    const out = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // 1px of tolerance for sub-pixel rounding.
      if (r.right <= vw + 1) continue
      if (hasScrollableAncestor(el)) continue

      // Visually-hidden text. `.sr-only` is a 1x1 box with its own
      // `overflow:hidden` and `clip:rect(0,0,0,0)`, so a wide child inside it is
      // clipped by the parent and never reaches the page — verified by setting
      // body's overflow-x to visible and confirming the document still does not
      // scroll sideways. A screen reader reads it regardless of geometry, so it
      // is not "content clipped out of reach" in any sense 1.4.10 means.
      if (el.closest('.sr-only')) continue

      // Decorative-only nodes: aria-hidden with no text of their own. The
      // homepage's `.system-cta-beams i` are animated light beams that
      // deliberately extend past the fold. 1.4.10 is about content, and these
      // carry none — clipping them is the intended effect.
      if (el.closest('[aria-hidden="true"]') && !(el.textContent || '').trim()) continue

      const cls = (el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')
      out.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} → right:${Math.round(r.right)} (viewport ${vw})`)
    }
    return [...new Set(out)]
  })
}

test.describe('reflow at 320px', () => {
  for (const route of ROUTES) {
    test(`${route} keeps every element reachable`, async ({ page }) => {
      await page.setViewportSize(NARROW)
      watch(page, 'a visitor on a small phone')
      await go(page, route)
      // Fonts and lazy panels settle late, and a specimen measured mid-load is
      // measured at the wrong size. Bounded so a slow third party costs seconds
      // rather than the run.
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

      const clipped = await unreachable(page)
      expect(clipped, `clipped out of reach on ${route}:\n  ${clipped.join('\n  ')}`).toEqual([])
    })
  }

  test('the type scale truncates its specimens without shrinking the type', async ({ page }) => {
    // The distinction that makes this fix correct rather than convenient: a
    // type-scale tool that shrinks its own specimens to fit is lying about the
    // scale it exists to demonstrate. Truncating the sentence is fine; changing
    // the size is not.
    await page.setViewportSize(NARROW)
    watch(page, 'a designer checking a type scale on a phone')
    await go(page, '/create/type-scale')
    // The ladder is inside a lazily-loaded panel. Waiting for it with a locator
    // rather than snapshotting straight after navigation — an evaluate() that
    // runs first returns an empty list, which would pass a "nothing overflows"
    // check by measuring nothing at all.
    await expect(page.locator('.tsc-row-text').first()).toBeVisible()

    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('.tsc-row-text')].map(t => parseFloat(getComputedStyle(t).fontSize)))

    expect(sizes.length, 'the ladder renders its steps').toBeGreaterThan(4)
    // Strictly descending, and the top step is still genuinely large.
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i], `step ${i} is not smaller than step ${i - 1}`).toBeLessThan(sizes[i - 1])
    }
    expect(sizes[0], 'the display step is still rendered at its real size').toBeGreaterThan(40)
  })

  test('the palette row keeps its controls at a usable target size', async ({ page }) => {
    // The tools wrap onto their own line rather than shrinking into the ~206px
    // left beside the hex. Squeezing five buttons in there would have traded a
    // 1.4.10 failure for a 2.5.8 one.
    await page.setViewportSize(NARROW)
    watch(page, 'a designer editing a palette on a phone')
    await go(page, '/create/palette')
    await expect(page.locator('.plb-tool').first()).toBeVisible()

    // RENDERED tools only. `.plb-tool--more` is the touch-band overflow control
    // [palette-swatch-actions-tablet]: it is in the markup at every width but
    // `display:none` outside @media(min-width:769px) and (hover:none), so here
    // it measures 0x0. That is not a 2.5.8 failure — a display:none element is
    // out of the accessibility tree and cannot be tapped, which is a different
    // thing from the invisible-but-live target 24-mobile-overhaul hunts (opacity
    // 0 WITH pointer-events auto, a live 32x32 hit area painting nothing).
    // `offsetParent` is the cheap test for it and matches how that spec skips
    // zero-box elements.
    const tools = await page.evaluate(() =>
      [...document.querySelectorAll('.plb-tool')].filter(t => t.offsetParent !== null).map(t => {
        const r = t.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }
      }))

    // A floor the filter cannot sneak under: five columns each render a row of
    // tools at this width, so a result that collapsed to a handful would mean
    // the filter ate the population rather than that everything passed.
    expect(tools.length, 'the per-colour tools render').toBeGreaterThan(6)
    const vw = await page.evaluate(() => document.documentElement.clientWidth)
    for (const t of tools) {
      expect(t.right, 'every tool is on screen').toBeLessThanOrEqual(vw + 1)
      expect(Math.min(t.w, t.h), `a tool is ${t.w}x${t.h}, under the 24px minimum`).toBeGreaterThanOrEqual(24)
    }
  })

  test('the prompt library CTA is on screen and tappable', async ({ page }) => {
    await page.setViewportSize(NARROW)
    watch(page, 'a designer submitting a prompt from a phone')
    await go(page, '/discover/prompts')

    const cta = page.locator('.pl-add-btn')
    await expect(cta).toBeVisible()
    await expect(cta).toBeInViewport()
    const box = await cta.boundingBox()
    expect(box.height, 'the CTA is comfortably tappable').toBeGreaterThanOrEqual(24)
  })
})
