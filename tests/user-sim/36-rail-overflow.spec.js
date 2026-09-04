// The shared horizontal-rail affordance, and the two "shipped broken" defects
// that earned it a test file of its own.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THESE ASSERTIONS ARE ABOUT REACHABILITY, NOT ABOUT CSS
// ─────────────────────────────────────────────────────────────────────────────
// Nine rails in global.css were `overflow-x:auto` with the scrollbar deleted on
// BOTH `scrollbar-width` and `::-webkit-scrollbar`. Every one of them passed
// every test the suite had, because nothing in the DOM changes when content
// slides past a clipped edge: `innerText` still reads "Randomise", the button is
// still focusable, the accessible name is still right, and a screen reader is
// entirely unaffected. Only a sighted user loses the control.
//
// So a test that asserts "the element exists" is worth nothing here. What these
// assert is where the painted box actually sits relative to the box that clips
// it, and — for the shared utility — whether the affordance that says "there is
// more" is switched on when there is, and off when there is not.
//
// The two pins:
//
//   A2  /plans at 390px. `.plans-compare-table{min-width:520px}` inside a 358px
//       box put the ENTIRE Pro column 162px past the right edge. A shopper read
//       what Free gives them and never saw a single Pro value, on the page whose
//       whole job is to sell Pro. The fix is not a better hint — the table fits
//       now — so the assertion is that no gesture is needed at all.
//
//   A4  /create/palette at 834px. The action ribbon opened on Image / Explore /
//       Preview and put "Randomise" 560px past the right edge: 7 of 11 controls
//       off-screen, including the tool's primary action and the one that owns
//       the Space-bar shortcut. `.plb-random{order:-1}` existed for ≤768px and
//       was never extended to the 769–960 band.
import { test, expect } from './base.js'
import { go, expectRendered, watch } from './helpers.js'

const PHONE = { width: 390, height: 844 }
const TABLET = { width: 834, height: 1112 }
const DESKTOP = { width: 1440, height: 900 }

/**
 * Settle the rail's scroll-driven edge fades.
 *
 * These are not a timed animation — they are a function of `scrollLeft`, driven
 * by `animation-timeline: scroll(self inline)` — so there is nothing to wait
 * OUT, only a frame to wait FOR. Two rAFs: one for the scroll to be committed,
 * one for the timeline to sample it. This is deliberately not `restingScrollY`,
 * which measures the WINDOW coming to rest under Lenis; nothing here scrolls the
 * window, and an inner container's `scrollLeft` assignment is synchronous.
 */
const settleRail = (page) => page.evaluate(
  () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
)

test.describe('the Pro column is reachable on a phone (A2)', () => {
  test.use({ viewport: PHONE })

  test('every Pro value is inside the viewport at 390px, with no gesture', async ({ page }) => {
    watch(page, 'someone deciding whether to pay, on their phone')
    await go(page, '/plans')
    await expectRendered(page)
    await expect(page.locator('.plans-compare-table')).toBeVisible()

    const report = await page.evaluate(() => {
      const wrap = document.querySelector('.plans-compare-wrap')
      const vw = document.documentElement.clientWidth
      const cells = [...document.querySelectorAll('.plans-compare-table .pct-pro')]
      return {
        // The table needs no horizontal scroll at all any more.
        needsScroll: wrap.scrollWidth > wrap.clientWidth + 1,
        proCells: cells.length,
        // A cell whose right edge is past the viewport, or past the box that
        // clips it, is a value the reader cannot see.
        offscreen: cells
          .map((c) => ({ text: c.textContent.trim(), right: Math.round(c.getBoundingClientRect().right) }))
          .filter((c) => c.right > Math.min(vw, Math.round(wrap.getBoundingClientRect().right)) + 1),
        // …and one clipped to nothing is just as unreadable.
        collapsed: cells.filter((c) => c.getBoundingClientRect().width < 40).length,
      }
    })

    expect(report.proCells, 'the comparison table should still have Pro cells to check').toBeGreaterThan(5)
    expect(report.needsScroll, 'the plans table should not need a horizontal gesture at 390px').toBe(false)
    expect(report.offscreen, 'Pro values sitting past the right edge').toEqual([])
    expect(report.collapsed, 'Pro cells crushed too narrow to read').toBe(0)
  })
})

test.describe('the primary action is reachable on a tablet (A4)', () => {
  test.use({ viewport: TABLET })

  test('Randomise is fully visible in the action ribbon at 834px', async ({ page }) => {
    watch(page, 'a designer opening Palette Builder on an iPad')
    await go(page, '/create/palette')
    await expectRendered(page)
    const random = page.locator('.plb-random')
    await expect(random).toBeVisible()

    const report = await page.evaluate(() => {
      const group = document.querySelector('.plb-toolbar-group.rail-overflow')
      const btn = document.querySelector('.plb-random')
      const g = group.getBoundingClientRect()
      const b = btn.getBoundingClientRect()
      return {
        railScrolls: group.scrollWidth > group.clientWidth + 1,
        scrollLeft: Math.round(group.scrollLeft),
        // Fully inside the ribbon's own visible box, at rest, with no swipe.
        insideAtRest: b.left >= g.left - 1 && b.right <= g.right + 1,
        btn: { left: Math.round(b.left), right: Math.round(b.right) },
        rail: { left: Math.round(g.left), right: Math.round(g.right) },
      }
    })

    // The ribbon is still a scroller here — that is the design, and it is what
    // makes "the primary action is the one you get for free" a real choice
    // rather than a side effect of everything happening to fit.
    expect(report.railScrolls, '834px should still make the action group a scroller').toBe(true)
    expect(report.scrollLeft, 'the ribbon should open at its start, not pre-scrolled').toBe(0)
    expect(
      report.insideAtRest,
      `Randomise must be visible without swiping: button ${JSON.stringify(report.btn)} vs rail ${JSON.stringify(report.rail)}`,
    ).toBe(true)
  })
})

//   A6  /create/gradient at 1440px. The preset strip is sixteen named gradients
//       in one `grid-auto-flow:column` row: 2422px of tiles inside a 1142px box,
//       so SEVEN showed and 1280px of library sat behind the 34px fade with no
//       scrollbar - on a page that had ~300px of empty ground under the card.
//       Wrapping is the fix rather than a fourth affordance, so, as with A2, the
//       assertion is that no gesture is needed at all.
test.describe('the whole preset library is on screen on a desktop (A6)', () => {
  test.use({ viewport: DESKTOP })

  test('all sixteen gradient presets are visible at 1440px, with no gesture', async ({ page }) => {
    watch(page, 'a designer picking a gradient on a laptop')
    await go(page, '/create/gradient')
    await expectRendered(page)
    await expect(page.locator('.ggn-presets')).toBeVisible()

    const report = await page.evaluate(() => {
      const rail = document.querySelector('.ggn-presets')
      const box = rail.getBoundingClientRect()
      const cs = getComputedStyle(rail)
      const tiles = [...rail.children]
      return {
        total: tiles.length,
        needsScroll: rail.scrollWidth > rail.clientWidth + 1,
        // A fade is a claim that there is more. There is not, so it must be off.
        masked: (cs.maskImage || 'none') !== 'none',
        rows: new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().top))).size,
        offscreen: tiles
          .map((t) => ({ name: t.textContent.trim(), right: Math.round(t.getBoundingClientRect().right) }))
          .filter((t) => t.right > Math.round(box.right) + 1),
      }
    })

    expect(report.total, 'the curated set should still be sixteen presets').toBeGreaterThanOrEqual(16)
    expect(report.needsScroll, 'the preset library should not need a horizontal gesture at 1440px').toBe(false)
    expect(report.masked, 'a set that fits must not claim there is more behind a fade').toBe(false)
    expect(report.offscreen, 'presets sitting past the right edge').toEqual([])
    expect(report.rows, 'sixteen presets should wrap into rows, not run off in one').toBeGreaterThan(1)
  })
})

test.describe('the shared rail affordance', () => {
  // One rail per shape: a tab strip, a preset gallery, a control ribbon.
  const RAILS = [
    { name: 'home workbench tabs', path: '/', sel: '.hw-tabs', viewport: PHONE },
    { name: 'gradient preset rail', path: '/create/gradient', sel: '.ggn-presets', viewport: PHONE },
    { name: 'palette action ribbon', path: '/create/palette', sel: '.plb-toolbar-group.rail-overflow', viewport: TABLET },
  ]

  for (const rail of RAILS) {
    test(`${rail.name}: says there is more, and stops saying it at the end`, async ({ page }) => {
      await page.setViewportSize(rail.viewport)
      watch(page, `someone reaching the ${rail.name}`)
      await go(page, rail.path)
      await expectRendered(page)
      await expect(page.locator(rail.sel).first()).toBeVisible()
      await settleRail(page)

      const atRest = await page.evaluate((sel) => {
        const el = document.querySelector(sel)
        const cs = getComputedStyle(el)
        return {
          overflows: el.scrollWidth > el.clientWidth + 1,
          scrollLeft: Math.round(el.scrollLeft),
          // NEVER `none`. Deleting the scrollbar is the original defect.
          scrollbarWidth: cs.scrollbarWidth,
          masked: (cs.maskImage || 'none') !== 'none',
          right: cs.getPropertyValue('--rail-r').trim(),
          left: cs.getPropertyValue('--rail-l').trim(),
        }
      }, rail.sel)

      expect(atRest.overflows, `${rail.name} should be a scroller at this width`).toBe(true)
      expect(atRest.scrollbarWidth, `${rail.name} must not delete its scrollbar`).not.toBe('none')
      expect(atRest.masked, `${rail.name} should carry the edge fade`).toBe(true)
      expect(Number(atRest.right), `${rail.name} should fade its RIGHT edge while there is more to the right`).toBeGreaterThan(0)
      expect(Number(atRest.left), `${rail.name} should not fade its left edge before anything has been scrolled past`).toBe(0)

      // Drive it to the end and the claim must be withdrawn — a fade that stays
      // on at the end is the vignette that made `.plans-compare-wrap` read as
      // decoration rather than as an affordance.
      await page.evaluate((sel) => { document.querySelector(sel).scrollLeft = 1e6 }, rail.sel)
      await settleRail(page)
      const atEnd = await page.evaluate((sel) => {
        const cs = getComputedStyle(document.querySelector(sel))
        return { right: cs.getPropertyValue('--rail-r').trim(), left: cs.getPropertyValue('--rail-l').trim() }
      }, rail.sel)

      expect(Number(atEnd.right), `${rail.name} should stop fading its right edge once there is nothing more`).toBe(0)
      expect(Number(atEnd.left), `${rail.name} should fade its left edge once content is behind it`).toBeGreaterThan(0)
    })
  }

  test('a rail that fits claims nothing — /plans at desktop', async ({ page }) => {
    // The counter-case, and the reason the fade is scroll-driven rather than a
    // static mask: `.plans-compare-wrap` carries `.rail-overflow` at every
    // width, and at a desktop width it must not suggest there is anything to
    // the right, because there is not.
    await page.setViewportSize({ width: 1440, height: 900 })
    watch(page, 'a visitor reading the plans table on a laptop')
    await go(page, '/plans')
    await expectRendered(page)
    await expect(page.locator('.plans-compare-table')).toBeVisible()
    await settleRail(page)

    const state = await page.evaluate(() => {
      const el = document.querySelector('.plans-compare-wrap')
      const cs = getComputedStyle(el)
      return {
        overflows: el.scrollWidth > el.clientWidth + 1,
        right: cs.getPropertyValue('--rail-r').trim(),
        left: cs.getPropertyValue('--rail-l').trim(),
      }
    })

    expect(state.overflows, 'the plans table should fit at 1440px').toBe(false)
    expect(Number(state.right), 'a rail with nothing to the right must not fade its right edge').toBe(0)
    expect(Number(state.left), 'a rail with nothing behind it must not fade its left edge').toBe(0)
  })
})

test.describe('the journey can be finished, and undone, on a touch device (A5)', () => {
  // The 2026-09-03 audit measured the palette action ribbon at four touch
  // widths and found Save / export off the right edge at EVERY one of them,
  // with Undo and Reset alongside it:
  //
  //   390px   4 of 11 fully visible, 6 hidden, 669px of scroll
  //   640px   6 of 11 fully visible, 4 hidden, 419px
  //   641px   6 of 11 fully visible, 4 hidden, 418px
  //   834px   3 of 11 fully visible, 7 hidden, 691px
  //
  // Save / export is the only route from a finished palette to a file, so on a
  // phone the journey simply could not be finished without first discovering
  // that the row scrolls. Undo and Reset are the worse half: a mis-tap could
  // not be taken back.
  //
  // THIS ASSERTS REACHABILITY AT REST, NOT THAT NOTHING SCROLLS. The rail is a
  // scroller by design at these widths and the A4 test above pins that; the
  // question this file exists to answer is WHICH controls you get for free.
  // Exploratory controls (Explore, Preview, Vision, Gradient, History) are
  // still behind a swipe and that is the deliberate trade.
  const FREE = ['Randomise', 'Undo', 'Reset', 'Save / export']

  for (const width of [390, 640, 641, 834]) {
    test(`Save / export, Undo and Reset need no swipe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1112 })
      watch(page, `someone finishing a palette on a ${width}px screen`)
      await go(page, '/create/palette')
      await expectRendered(page)
      await expect(page.locator('.plb-random')).toBeVisible()
      await settleRail(page)

      const report = await page.evaluate((names) => {
        const rail = document.querySelector('.plb-toolbar-group.rail-overflow')
        const g = rail.getBoundingClientRect()
        const out = { scrollLeft: Math.round(rail.scrollLeft), controls: {} }
        for (const name of names) {
          // Randomise has no aria-label; it is named by its text.
          const btn = rail.querySelector(`[aria-label="${name}"]`)
            || [...rail.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(name))
          if (!btn) { out.controls[name] = { missing: true }; continue }
          const b = btn.getBoundingClientRect()
          out.controls[name] = {
            // Fully inside the ribbon's own clipping box, at rest, no swipe.
            inside: b.left >= g.left - 1 && b.right <= g.right + 1,
            box: [Math.round(b.left), Math.round(b.right)],
            rail: [Math.round(g.left), Math.round(g.right)],
          }
        }
        return out
      }, FREE)

      expect(report.scrollLeft, 'the ribbon should open at its start, not pre-scrolled').toBe(0)
      for (const name of FREE) {
        const c = report.controls[name]
        expect(c.missing, `${name} should exist in the action ribbon`).toBeFalsy()
        expect(
          c.inside,
          `${name} must be reachable without swiping at ${width}px: button ${JSON.stringify(c.box)} vs rail ${JSON.stringify(c.rail)}`,
        ).toBe(true)
      }
    })
  }

  test('the promoted controls keep their accessible names when the label is hidden', async ({ page }) => {
    // Undo and Reset go icon-only below 961px, which is what buys the room for
    // Save / export. That trades a visible word for a visible BUTTON and must
    // not trade away the name a screen reader reads.
    await page.setViewportSize({ width: 390, height: 844 })
    watch(page, 'a screen-reader user on a phone')
    await go(page, '/create/palette')
    await expectRendered(page)

    for (const name of ['Undo', 'Reset', 'Save / export']) {
      await expect(
        page.locator('.plb-toolbar').getByRole('button', { name, exact: true }),
      ).toHaveCount(1)
    }
    const labelHidden = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      return {
        undo: getComputedStyle(q('.plb-undo .plb-lbl')).display,
        reset: getComputedStyle(q('.plb-reset .plb-lbl')).display,
      }
    })
    expect(labelHidden.undo, 'Undo should be icon-only at 390px').toBe('none')
    expect(labelHidden.reset, 'Reset should be icon-only at 390px').toBe('none')
  })
})
