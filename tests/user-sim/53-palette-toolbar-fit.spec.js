// The Palette Builder toolbar, measured across the widths the founder reported.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FAULT
// ─────────────────────────────────────────────────────────────────────────────
// Founder, 2026-09-05, two screenshots.
//   DESKTOP: the toolbar "is a run of icon-only buttons of uneven weight and
//   spacing sitting beside two labelled buttons and a select, and it reads as
//   unresolved rather than designed."
//   NARROW (662px, device toolbar): "the row overflows — Save/export, Image,
//   Explore, Preview, Vision type and Gradient are visible with the row clipped
//   mid-control."
//
// Measured before the change, `.plb-toolbar-group.rail-overflow` scrollWidth
// over clientWidth, at 21 widths:
//     >=1180   712/712   one row, 57px           correct
//     981-1080 712/712   the rail FITS and the toolbar wrapped to 105px
//     769-960  1033/425-551  the shipped swipeable ribbon
//     <=768    964/366-744   TWO ROWS and the rail still clipped 3 to 6
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS PINS NOW
// ─────────────────────────────────────────────────────────────────────────────
// The palette's toolbar is the design's drawn one (D:947-1015) on
// the shared ToolToolbar, which measures its row and moves what does not fit
// into a "Tools" overflow (a toolbar never wraps and never
// scrolls). There is no rail, 769–960 swipeable band or utils/toolbarFit.js.
// The original report is still the test: nothing clipped mid-row at
// 662px or near it, one row on a laptop, and everything that left the row
// reachable by name.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const BAR = '.plb [data-tool-toolbar]'

/** Toolbar geometry plus every painted control that is not fully inside it. */
const shape = (page) => page.evaluate((sel) => {
  const bar = document.querySelector(sel)
  const r = bar.getBoundingClientRect()
  const btns = [...bar.querySelectorAll('button, a, select')]
    .filter(b => b.offsetParent !== null && b.getBoundingClientRect().width > 0)
  return {
    toolbarH: Math.round(r.height),
    scrolls: bar.scrollWidth > bar.clientWidth + 1,
    controls: btns.length,
    offRow: btns
      .filter(b => { const x = b.getBoundingClientRect(); return x.right > r.right + 0.5 || x.left < r.left - 0.5 })
      .map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18)),
  }
}, BAR)

const settle = async (page) => {
  await expect(page.locator(BAR)).not.toHaveClass(/is-measuring/)
  await page.waitForTimeout(120)
}

test.describe('palette toolbar fits the row it is given', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer on a narrow laptop') })

  test('THE REPORT: nothing is clipped at 662px, or anywhere near it', async ({ page }) => {
    await go(page, '/create/palette')
    await expect(page.locator(BAR)).toBeVisible()
    const bad = []
    for (const width of [600, 640, 641, 662, 700, 768]) {
      await page.setViewportSize({ width, height: 900 })
      await settle(page)
      const s = await shape(page)
      expect(s.controls, `${width}px: the row measured no controls, so this proves nothing`).toBeGreaterThan(3)
      if (s.offRow.length) bad.push(`${width}px: ${s.offRow.join(', ')} past the toolbar's edge`)
      if (s.scrolls) bad.push(`${width}px: the toolbar scrolls`)
      await expect(page.locator(BAR).getByRole('button', { name: 'Tools' }), `${width}px keeps its overflow`).toBeVisible()
    }
    expect(bad, `controls clipped mid-row:\n  ${bad.join('\n  ')}`).toEqual([])
  })

  test('the overflow control is a WORD on a laptop, and a named icon on a phone', async ({ page }) => {
    // The desktop half of the report is a run of icon-only buttons reading as
    // unresolved; answering an overflow with one more glyph would deepen it
    // (Mobbin: Substack collapses its editor toolbar to "More"). Below 768px
    // the drawn toolbar drops every button's words for its icon (D:73), and
    // the overflow follows the row it sits on.
    const trigger = page.locator(BAR).getByRole('button', { name: 'Tools' })
    for (const width of [1000, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/palette')
      await settle(page)
      await expect(trigger).toBeVisible()
      const text = (await trigger.innerText()).trim()
      expect(text, `${width}px: the trigger renders no visible word`).toMatch(/tools/i)
    }
    await page.setViewportSize({ width: 662, height: 900 })
    await settle(page)
    await expect(trigger, 'the icon keeps its name').toHaveAccessibleName('Tools')
  })

  test('what left the row is in Tools, named, and works', async ({ page }) => {
    await page.setViewportSize({ width: 662, height: 900 })
    await go(page, '/create/palette')
    await settle(page)
    await page.locator(BAR).getByRole('button', { name: 'Tools' }).click()
    const panel = page.getByRole('dialog', { name: 'Tools' })
    await expect(panel).toBeVisible()
    // Always in Tools, at every width.
    for (const name of ['Explore palettes', 'Preview on a UI', 'Open in Gradient', 'History', 'Reset palette']) {
      await expect(panel.getByRole('button', { name, exact: true })).toBeVisible()
    }
    // And at 662 the row has handed over its lowest-priority controls too: the
    // System and Vision selects (priority 0) are here, not on the row.
    const bar = page.locator(BAR)
    for (const name of ['Colour system', 'Colour vision check']) {
      await expect(bar.getByRole('combobox', { name }), `${name} left the row`).toHaveCount(0)
      await expect(panel.getByRole('combobox', { name }), `${name} is in Tools`).toBeVisible()
    }
    // What is in Tools does something: Open in Gradient hands the palette on.
    await panel.getByRole('button', { name: 'Open in Gradient', exact: true }).click()
    await expect(page).toHaveURL(/\/create\/gradient/)
  })

  test('one row on every laptop and tablet width, nothing clipped', async ({ page }) => {
    // The band nobody had reported was 981–1080, where the old toolbar wrapped
    // to 105px; 769–960 was a swipeable ribbon. Both are one row now.
    await go(page, '/create/palette')
    for (const width of [769, 834, 900, 960, 981, 1000, 1080, 1180, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await settle(page)
      const s = await shape(page)
      // The drawn toolbar is 61px (9px padding, the 42px undo tray, a hairline).
      expect(s.toolbarH, `${width}px should be one row, not a wrap`).toBeLessThanOrEqual(62)
      expect(s.scrolls, `${width}px must not need a scroller`).toBe(false)
      expect(s.offRow, `${width}px should clip nothing`).toEqual([])
    }
  })
})
