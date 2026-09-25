// The 961–1343px band: two layout faults that only exist between the tablet
// breakpoint and full desktop, from the August 2026 responsive audit (B1, M2–M4).
// That audit was deleted 2026-09-05 — see docs/qa/defect-register-2026-08.md.
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
  // The colour system is the drawn System select (D:990). Where the row has
  // room it sits on the row; where it does not, it is the Tools overflow's
  // select. Either way it must take the pointer at every width in the band —
  // the audit found a trigger here that nothing could click.
  test('the colour system is reachable and takes the pointer at every width in the band', async ({ page }) => {
    watch(page, 'a designer choosing a colour harmony on a small laptop')
    await page.setViewportSize({ width: TOOLBAR_WIDTHS[0], height: 900 })
    await go(page, '/color/palette')
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).toBeVisible()
    await settle(page)

    const failures = []
    for (const width of TOOLBAR_WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await expect(bar).not.toHaveClass(/is-measuring/)
      await page.waitForTimeout(150)
      let scope = bar
      const inline = bar.getByRole('combobox', { name: 'Colour system' })
      if (!(await inline.count() && await inline.isVisible())) {
        await bar.getByRole('button', { name: 'Tools' }).click()
        scope = page.getByRole('dialog', { name: 'Tools' })
        await expect(scope).toBeVisible()
      }
      const select = scope.getByRole('combobox', { name: 'Colour system' })
      // Five points across the drawn control must all land on it.
      const covered = await select.evaluate((el) => {
        const box = el.closest('.tl-select').getBoundingClientRect()
        return [0.05, 0.2, 0.5, 0.8, 0.95]
          .filter((f) => {
            const hit = document.elementFromPoint(box.left + box.width * f, box.top + box.height / 2)
            return !(hit && hit.closest('.tl-select') === el.closest('.tl-select'))
          })
          .map((f) => `${f * 100}%`)
      })
      if (covered.length) failures.push(`${width}px: covered at ${covered.join(', ')}`)
      if (scope !== bar) {
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog', { name: 'Tools' })).toHaveCount(0)
      }
    }
    expect(failures, `the colour system is unreachable:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('the Tools overflow opens as a popover, not a bottom sheet, above 767px', async ({ page }) => {
    // What the row cannot hold goes to the overflow, a popover
    // under its button from 768px and a bottom sheet below. Nothing may paint
    // over the open popover.
    watch(page, 'a designer on a small laptop')
    await page.setViewportSize({ width: 1000, height: 900 })
    await go(page, '/color/palette')
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)
    await settle(page)

    await bar.getByRole('button', { name: 'Tools' }).click()
    const menu = page.getByRole('dialog', { name: 'Tools' })
    await expect(menu).toBeVisible()
    await expect(menu).toHaveClass(/tl-pop/)
    await expect(page.locator('.tl-sheet')).toHaveCount(0)

    // And nothing paints over it: sixteen points across the open menu.
    const behind = await menu.evaluate((pop) => {
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

  // Not tested: 'the 769–960 swipeable ribbon and the ≥1180 single row
  // are both untouched'. The palette's two-group toolbar with its scrolling
  // action ribbon is gone; the drawn toolbar is one row at every width with an
  // overflow, held for 320–1920 by 100-tool-toolbar-one-row.spec.js.
})

test.describe('workbench two-column threshold', () => {
  // The working column is the OUTPUT pane — the grid item the tool's result
  // lives in. Measuring that item rather than the innermost text box keeps the
  // assertion about the LAYOUT decision and not about a panel's padding; it is
  // itself a grid item, so its width IS the track's.
  //
  // It used to be found as `grid.firstElementChild`, which quietly assumed the
  // output pane comes first in source order. That assumption stopped being true
  // when Font Pair and Type Scale moved their controls ahead of their output
  // (the controls had been landing ~1,900px BELOW the thing they drive at
  // 1280). The layout was unchanged — the sidebar is still placed right at
  // ≥1344px — but the test began measuring the 340px sidebar and reporting a
  // 600px "shrink". Naming the pane makes the check immune to source order,
  // which is the right property for an assertion about rendered geometry.
  const workingColumn = (pane) => async (page) => page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? Math.round(el.getBoundingClientRect().width) : null
  }, pane)

  const cases = [
    { route: '/color/tint', grid: '.tt .tl-grid', pane: '.tt .tl-main', persona: 'a designer building a tonal ramp' },
    { route: '/typescale', grid: '.tsc-grid', pane: '.tsc-output', persona: 'a designer reading a type scale back' },
    { route: '/fontpairs', grid: '.fpr-grid', pane: '.fpr-output', persona: 'a designer testing a type pairing' },
  ]

  for (const { route, grid, pane, persona } of cases) {
    test(`${route} never narrows its working column as the window widens`, async ({ page }) => {
      watch(page, persona)
      await page.setViewportSize({ width: WORKBENCH_WIDTHS[0], height: 900 })
      await go(page, route)
      await expect(page.locator(grid)).toBeVisible()
      await settle(page)

      const measure = workingColumn(pane)
      const seen = []
      for (const width of WORKBENCH_WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForTimeout(140)
        const w = await measure(page)
        expect(w, `${pane} is not rendered inside ${grid} at ${width}px`).toBeGreaterThan(0)
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
    await expect(page.locator('.tt-cols').first()).toBeVisible()
    await settle(page)

    const missing = []
    for (const width of [981, 999, 1000, 1024, 1060, 1080, 1119, 1120]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(140)
      const hidden = await page.evaluate(() => {
        const ramp = document.querySelector('.tt-cols')
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

// Not tested: 'Palette Builder toolbar, 1097–1136px'. It pinned the
// band where the old toolbar's fitRail() credited itself with the row's
// padding and wrapped to 105px. That code is gone with the two-group toolbar;
// the shared ToolToolbar measures its own content box, and its single row at
// every width from 320 to 1920 — this band included — is asserted by
// 100-tool-toolbar-one-row.spec.js.
