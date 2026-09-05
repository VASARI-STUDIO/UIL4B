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
// WHAT THIS PINS, AND WHAT IT DELIBERATELY DOES NOT
// ─────────────────────────────────────────────────────────────────────────────
// The collapse is MEASURED, not banded (utils/toolbarFit.js), with one explicit
// exemption: 769–960 is the shipped ribbon and is pinned by
// 36-rail-overflow.spec.js and 23-responsive-mid-band.spec.js. Those two remain
// the authority there; this file asserts the exemption holds so a future change
// to the rule cannot quietly swallow their band.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const RAIL = '.plb-toolbar-group.rail-overflow'
const TRIGGER = '.plb-toolsbtn'
const PANEL = '.plb-tools--panel'

/** Rail geometry plus every control that is not fully inside it. */
const shape = (page) => page.evaluate((rail) => {
  const g = document.querySelector(rail)
  const r = g.getBoundingClientRect()
  const btns = [...g.querySelectorAll('button')].filter(b => b.offsetParent !== null && b.getBoundingClientRect().width > 0)
  const panel = document.querySelector('.plb-tools--panel')
  return {
    toolbarH: Math.round(document.querySelector('.plb-toolbar').getBoundingClientRect().height),
    scrolls: g.scrollWidth > g.clientWidth + 1,
    collapsed: !!panel,
    triggerVisible: !!document.querySelector('.plb-toolsbtn'),
    offRail: btns
      .filter(b => b.getBoundingClientRect().right > r.right + 0.5)
      .map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18)),
  }
}, RAIL)

test.describe('palette toolbar fits the row it is given', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer on a narrow laptop') })

  test('THE REPORT: nothing is clipped at 662px, or anywhere near it', async ({ page }) => {
    await go(page, '/create/palette')
    await expect(page.locator('.plb-toolbar')).toBeVisible()
    const bad = []
    for (const width of [600, 640, 641, 662, 700, 768]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(220)
      const s = await shape(page)
      if (s.offRail.length) bad.push(`${width}px: ${s.offRail.join(', ')} past the rail's right edge`)
      expect(s.triggerVisible, `${width}px should collapse to a labelled trigger`).toBe(true)
    }
    expect(bad, `controls clipped mid-row:\n  ${bad.join('\n  ')}`).toEqual([])
  })

  test('the overflow control is a WORD, not a tenth icon', async ({ page }) => {
    // The desktop half of the report is a run of icon-only buttons reading as
    // unresolved. Answering an overflow with one more glyph would deepen
    // exactly that. Mobbin: Substack collapses its editor toolbar to "More ▾"
    // beside its other labelled dropdowns.
    await page.setViewportSize({ width: 662, height: 900 })
    await go(page, '/create/palette')
    const trigger = page.locator(TRIGGER)
    await expect(trigger).toBeVisible()
    await expect(trigger).toContainText(/tools/i)
    // It must carry a visible word, not only an accessible name.
    const text = (await trigger.innerText()).trim()
    expect(text.length, 'the trigger renders no visible label').toBeGreaterThan(2)
  })

  test('the collapsed cluster opens, and every control inside it is reachable', async ({ page }) => {
    await page.setViewportSize({ width: 662, height: 900 })
    await go(page, '/create/palette')
    await expect(page.locator(PANEL)).toBeHidden()
    await page.locator(TRIGGER).click()
    const panel = page.locator(PANEL)
    await expect(panel).toBeVisible()
    // The five that collapsed, all named, all clickable — not a menu of icons.
    for (const name of ['Image', 'Explore', 'Preview', 'Gradient']) {
      await expect(panel.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(panel.getByRole('button', { name: /vision type/i })).toBeVisible()
    // And it does something: Image opens the from-image dialog.
    await panel.getByRole('button', { name: 'Image', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Pull colours from an image' })).toBeVisible()
  })

  test('the two-row wrap at 981–1080 is gone, and 1180+ is untouched', async ({ page }) => {
    // The band nobody had reported. The rail FIT there (712 of 712) and the
    // toolbar still wrapped, because lead + rail + gap exceeded the row: 105px
    // of chrome on a common laptop, which is half of "reads as unresolved".
    await go(page, '/create/palette')
    for (const width of [981, 1000, 1080]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(220)
      const s = await shape(page)
      expect(s.toolbarH, `${width}px should be one row, not a 105px wrap`).toBeLessThan(80)
      expect(s.offRail, `${width}px should clip nothing`).toEqual([])
    }
    for (const width of [1180, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(220)
      const s = await shape(page)
      expect(s.collapsed, `${width}px must NOT collapse — everything fits`).toBe(false)
      expect(s.scrolls, `${width}px must not need a scroller`).toBe(false)
      expect(s.offRail, `${width}px should clip nothing`).toEqual([])
    }
  })

  test('the shipped 769–960 ribbon is exempt and unchanged', async ({ page }) => {
    // Not this change's band. 769–960 is the swipeable ribbon with the
    // irreversible controls promoted ahead of the fade — argued in
    // `palette-save-export-off-rail` and pinned by two other specs. This
    // asserts the measured rule does not reach in and take it.
    await go(page, '/create/palette')
    for (const width of [769, 834, 900, 960]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(220)
      const s = await shape(page)
      expect(s.collapsed, `${width}px is the ribbon band and must not collapse`).toBe(false)
      expect(s.scrolls, `${width}px must stay a scroller`).toBe(true)
    }
  })
})
