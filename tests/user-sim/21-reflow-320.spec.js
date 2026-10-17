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
    // `.first()` used to resolve to `.plb-tool--grip`, and the grip is
    // `display:none` below 769px now — HTML5 drag does not fire from a touch, so
    // at this width it was a slot spent on a gesture that cannot happen. Wait on
    // the first tool that is actually painted instead of on a fixed index.
    await expect(page.locator('.plb-tool:visible').first()).toBeVisible()

    // RENDERED tools only. `.plb-tool--more` is the touch-band overflow control
    // [palette-swatch-actions-tablet]: it is in the markup at every width but
    // `display:none` outside @media(min-width:769px) and (hover:none), so here
    // it measures 0x0. That is not a 2.5.8 failure — a display:none element is
    // out of the accessibility tree and cannot be tapped, which is a different
    // thing from the invisible-but-live target 24-mobile-overhaul hunts (opacity
    // 0 WITH pointer-events auto, a live 32x32 hit area painting nothing).
    // `offsetParent` is the cheap test for it and matches how that spec skips
    // zero-box elements.
    //
    // The Edit / Swap / Remove quick tools are a tablet-and-up feature: below
    // 768px the swatch shows only the lock and the "more actions" button, and
    // the quick tools are `display:none`.
    // They are asserted ABSENT below, and the same three actions are asserted
    // REACHABLE through each swatch's menu, which is what 1.4.10 cares about:
    // nothing a person needs is clipped away or lost at this width.
    const probe = () => page.evaluate(() => {
      const state = (t) => {
        let opacity = 1
        for (let n = t; n && n !== document.body; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity)
        const r = t.getBoundingClientRect()
        return { quick: !!t.closest('.plb-col-quick'), rendered: t.offsetParent !== null, opacity,
          pointer: getComputedStyle(t).pointerEvents, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }
      }
      return [...document.querySelectorAll('.plb-tool')].map(state)
    })
    const all = await probe()
    const quick = all.filter(t => t.quick && t.rendered)
    // Usable now: laid out, visible, and able to take a pointer.
    const tools = all.filter(t => t.rendered && t.opacity > 0 && t.pointer !== 'none')

    // The phone contract: no quick tool takes any space, and none is in the
    // accessibility tree. Both halves matter: `rendered` alone would pass if
    // the probe had missed the buttons, so the role query checks the same fact
    // by a different route.
    expect(quick, 'no quick tool is rendered below 768px').toEqual([])
    expect(tools.some(t => t.quick), 'no quick tool counts as usable on a phone').toBe(false)
    for (const label of [/^Edit .+ in HCT$/, /^Choose a direction to swap /, /^Remove /]) {
      await expect(page.getByRole('button', { name: label }), `${label} is not exposed on a phone`).toHaveCount(0)
    }

    // A floor the filter cannot sneak under: five columns each render a row of
    // tools at this width, so a result that collapsed to a handful would mean
    // the filter ate the population rather than that everything passed.
    // Five columns x two usable tools (the drawn lock, and the colour's
    // actions menu) = 10; it was three per column before the drawn board.
    expect(tools.length, 'the per-colour tools render').toBeGreaterThan(6)
    expect(tools.length, 'every column contributes its row').toBe(10)
    const vw = await page.evaluate(() => document.documentElement.clientWidth)
    for (const t of tools) {
      expect(t.right, 'every tool is on screen').toBeLessThanOrEqual(vw + 1)
      expect(Math.min(t.w, t.h), `a tool is ${t.w}x${t.h}, under the 24px minimum`).toBeGreaterThanOrEqual(24)
    }

    // Edit, Swap and Remove have moved into each swatch's "..." menu. Open it on
    // every swatch and check the menu is on screen horizontally and offers all
    // three (Swap is a direction: the first swatch has no left, the last no
    // right). A menu clipped past the viewport edge, or one missing an item,
    // would be those actions lost at 320px, not moved.
    const cols = page.locator('.plb-col')
    const count = await cols.count()
    expect(count, 'the five palette columns render').toBe(5)
    const menu = page.getByRole('menu', { name: 'Colour actions', exact: true })
    for (let i = 0; i < count; i++) {
      const more = cols.nth(i).getByRole('button', { name: /^More actions for / })
      await more.scrollIntoViewIfNeeded()
      await more.click()
      await expect(menu, `swatch ${i + 1}: the menu opens`).toBeVisible()
      const names = (await menu.getByRole('menuitem').allTextContents()).map(s => s.trim())
      expect(names, `swatch ${i + 1}: Edit is in the menu`).toContain('Edit in HCT')
      expect(names, `swatch ${i + 1}: Remove is in the menu`).toContain('Remove')
      expect(names.includes('Swap left'), `swatch ${i + 1}: Swap left is offered unless it is the first`).toBe(i > 0)
      expect(names.includes('Swap right'), `swatch ${i + 1}: Swap right is offered unless it is the last`).toBe(i < count - 1)
      const box = await menu.boundingBox()
      expect(box.x, `swatch ${i + 1}: the menu starts on screen`).toBeGreaterThanOrEqual(-1)
      expect(box.x + box.width, `swatch ${i + 1}: the menu ends on screen`).toBeLessThanOrEqual(vw + 1)
      await page.keyboard.press('Escape')
      await expect(menu, `swatch ${i + 1}: Escape closes the menu`).toBeHidden()
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
