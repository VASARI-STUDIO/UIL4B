// The 961–1343px band: two layout faults that only exist between the tablet
// breakpoint and full desktop, from docs/qa/responsive-audit-2026-08.md.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THESE ARE RENDERED TESTS AND NOT STYLESHEET GREPS
// ─────────────────────────────────────────────────────────────────────────────
// Both faults are invisible in the CSS. Every rule involved was individually
// correct; what broke was the ARITHMETIC BETWEEN them at widths no rule named:
//
//   B1  Palette Builder's toolbar let the title group shrink below its content
//       (flex:0 1 auto + min-width:0) while the action group refused to shrink
//       at all (flex:0 0 auto). Overflow must stay visible there — the dropdowns
//       open absolutely out of it — so the squeezed title group spilled right
//       and the later-painted action group covered the colour-system trigger.
//       At 961–1000px NO point on that control hit the control. A stylesheet
//       reader sees two reasonable rules; only a browser sees the overlap.
//
//   M2/M3/M4  Three tool workbenches flipped to `minmax(0,1fr) 340px` the
//       instant the viewport passed 980px, so the working column got NARROWER
//       as the window got WIDER — Type Scale's specimen halved across a single
//       pixel. No single rule is wrong; the pair of them is.
//
// So each test drives a real browser across the exact widths and asserts on
// measured geometry and on real interaction. `page.click` is used deliberately
// where the fault was reachability: Playwright's actionability check includes
// "receives pointer events", which is precisely what was failing.
//
// Mutation-verified — with the fixes reverted, the first test fails at 961/980/
// 981/999/1000/1024/1051 and the workbench tests fail on the 980→981 step.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// The audit's exact widths, plus the two neighbours that were already correct
// and must stay that way.
const TOOLBAR_WIDTHS = [961, 980, 981, 999, 1000, 1024, 1051, 1079, 1080]

// One ascending sweep. Consecutive pairs are compared, so 980→981 (the old
// flip) and 1343→1344 (the new one) are both crossed.
const WORKBENCH_WIDTHS = [980, 981, 1000, 1024, 1080, 1120, 1180, 1280, 1343, 1344, 1345, 1440, 1536, 1680, 1920]

const settle = async (page) => {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
}

test.describe('Palette Builder toolbar, 961–1080px', () => {
  test('the colour-system trigger is clickable at every width in the band', async ({ page }) => {
    watch(page, 'a designer choosing a colour harmony on a small laptop')
    await page.setViewportSize({ width: TOOLBAR_WIDTHS[0], height: 900 })
    await go(page, '/color/palette')
    await expect(page.locator('.plb-harm')).toBeVisible()
    await settle(page)

    const failures = []
    for (const width of TOOLBAR_WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(150)

      // Geometry first: five points across the control must all land on the
      // control. The audit sampled 20/50/80% and found none of them did.
      const covered = await page.evaluate(() => {
        const harm = document.querySelector('.plb-harm')
        const b = harm.getBoundingClientRect()
        return [0.05, 0.2, 0.5, 0.8, 0.95]
          .filter((f) => {
            const el = document.elementFromPoint(b.left + b.width * f, b.top + b.height / 2)
            return !(el && el.closest('.plb-harm'))
          })
          .map((f) => `${f * 100}%`)
      })
      if (covered.length) {
        failures.push(`${width}px: covered at ${covered.join(', ')}`)
        continue
      }

      // Then the real interaction. A short timeout so a regression reports in
      // seconds rather than stalling the run at 30s a width.
      try {
        await page.click('.plb-harm', { timeout: 2500 })
        await expect(page.locator('.plb-harmmenu')).toBeVisible({ timeout: 2500 })
        await page.keyboard.press('Escape')
        await page.waitForTimeout(120)
      } catch {
        failures.push(`${width}px: the trigger did not open the colour-system menu`)
      }
    }

    expect(failures, `the colour-system trigger is unreachable:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('the dropdown still opens as a popover, not a bottom sheet, above 960px', async ({ page }) => {
    // The 769–960 band turns the action group into a horizontal scroller, and a
    // scroll container clips on both axes, so its dropdowns have to escape as
    // fixed bottom sheets. Extending that treatment upward was the other way to
    // close this gap; wrapping was chosen so these widths keep their popovers.
    // If someone later swaps the wrap for a scroller, this is what tells them.
    watch(page, 'a designer on a small laptop')
    await page.setViewportSize({ width: 1000, height: 900 })
    await go(page, '/color/palette')
    await expect(page.locator('.plb-harm')).toBeVisible()
    await settle(page)

    await page.click('.plb-harm')
    const menu = page.locator('.plb-harmmenu')
    await expect(menu).toBeVisible()
    await expect(menu).toHaveCSS('position', 'absolute')

    // And nothing paints over it: sixteen points across the open menu.
    const behind = await page.evaluate(() => {
      const pop = document.querySelector('.plb-harmmenu')
      const b = pop.getBoundingClientRect()
      let n = 0
      for (let x = 1; x <= 4; x++) {
        for (let y = 1; y <= 4; y++) {
          const el = document.elementFromPoint(b.left + (b.width * x) / 5, b.top + (b.height * y) / 5)
          if (!(el && pop.contains(el))) n++
        }
      }
      return n
    })
    expect(behind, 'points of the open menu covered by something else').toBe(0)
  })

  test('the 769–960 swipeable ribbon and the ≥1180 single row are both untouched', async ({ page }) => {
    // The mid-band fix that already worked, and the desktop layout that was
    // already clean. Both are one row with the two groups side by side; only
    // the band between them wraps.
    watch(page, 'a designer resizing across the tablet and desktop bands')
    await page.setViewportSize({ width: 900, height: 900 })
    await go(page, '/color/palette')
    await expect(page.locator('.plb-harm')).toBeVisible()
    await settle(page)

    const shape = () => page.evaluate(() => {
      const tb = document.querySelector('.plb-toolbar')
      const groups = [...tb.querySelectorAll(':scope > .plb-toolbar-group')]
      const a = groups[0].getBoundingClientRect()
      const b = groups[groups.length - 1].getBoundingClientRect()
      return {
        sameRow: Math.abs(a.top - b.top) < 4,
        actionsScroll: groups[groups.length - 1].scrollWidth > groups[groups.length - 1].clientWidth + 1,
      }
    })

    // 769–960: one row, and the action group is the internal scroller.
    for (const width of [769, 900, 960]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(150)
      const s = await shape()
      expect(s.sameRow, `${width}px should keep both groups on one row`).toBe(true)
      expect(s.actionsScroll, `${width}px should keep the action group scrollable`).toBe(true)
    }

    // ≥1180: one row, and nothing needs to scroll.
    for (const width of [1180, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(150)
      const s = await shape()
      expect(s.sameRow, `${width}px should keep both groups on one row`).toBe(true)
      expect(s.actionsScroll, `${width}px should not need a scroller`).toBe(false)
    }
  })
})

test.describe('workbench two-column threshold', () => {
  // The working column is the grid's first track — the pane the tool's output
  // lives in. Measuring the track rather than the innermost text box keeps the
  // assertion about the LAYOUT decision and not about a panel's padding.
  const workingColumn = (grid) => async (page) => page.evaluate((sel) => {
    const g = document.querySelector(sel)
    if (!g) return null
    const first = g.firstElementChild
    return first ? Math.round(first.getBoundingClientRect().width) : null
  }, grid)

  const cases = [
    { route: '/color/tint', grid: '.tt-grid', persona: 'a designer building a tonal ramp' },
    { route: '/typescale', grid: '.tsc-grid', persona: 'a designer reading a type scale back' },
    { route: '/fontpairs', grid: '.fpr-grid', persona: 'a designer testing a type pairing' },
  ]

  for (const { route, grid, persona } of cases) {
    test(`${route} never narrows its working column as the window widens`, async ({ page }) => {
      watch(page, persona)
      await page.setViewportSize({ width: WORKBENCH_WIDTHS[0], height: 900 })
      await go(page, route)
      await expect(page.locator(grid)).toBeVisible()
      await settle(page)

      const measure = workingColumn(grid)
      const seen = []
      for (const width of WORKBENCH_WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForTimeout(140)
        const w = await measure(page)
        expect(w, `${grid} has no first track at ${width}px`).toBeGreaterThan(0)
        seen.push({ width, column: w })
      }

      // 1px of tolerance for sub-pixel track rounding; the fault this guards
      // was a 364px collapse, so the tolerance cannot hide it.
      const shrinks = seen
        .slice(1)
        .map((row, i) => ({ from: seen[i], to: row }))
        .filter(({ from, to }) => to.column < from.column - 1)
        .map(({ from, to }) => `${from.width}px→${to.width}px: ${from.column}px→${to.column}px`)

      expect(shrinks, `widening the window narrowed the working column:\n  ${shrinks.join('\n  ')}`).toEqual([])
    })
  }

  test('/color/tint renders all 11 stops inside the panel across 981–1119px', async ({ page }) => {
    // The page's status bar says "11 stops per scale" at every width. Between
    // 981 and 1119 only 8–10 were on screen: the ramp is a horizontal scroller,
    // its cells have a 60px floor, and the two-column flip left it under the
    // 660px the eleven need. The scroll hint that would at least have admitted
    // it only renders at ≤560px, so the darkest end of the ramp was simply
    // missing with nothing to say so.
    watch(page, 'a designer reading the dark end of a tonal ramp')
    await page.setViewportSize({ width: 981, height: 900 })
    await go(page, '/color/tint')
    await expect(page.locator('.tt-ramp').first()).toBeVisible()
    await settle(page)

    const missing = []
    for (const width of [981, 999, 1000, 1024, 1060, 1080, 1119, 1120]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(140)
      const hidden = await page.evaluate(() => {
        const ramp = document.querySelector('.tt-ramp')
        const r = ramp.getBoundingClientRect()
        const cells = [...ramp.querySelectorAll('.tt-cell')]
        return {
          total: cells.length,
          out: cells.filter((c) => c.getBoundingClientRect().right > r.right + 0.5).length,
        }
      })
      expect(hidden.total, `the ramp should render 11 stops at ${width}px`).toBe(11)
      if (hidden.out) missing.push(`${width}px: ${hidden.out} of 11 stops outside the panel`)
    }
    expect(missing, `stops rendered outside the ramp:\n  ${missing.join('\n  ')}`).toEqual([])
  })
})
