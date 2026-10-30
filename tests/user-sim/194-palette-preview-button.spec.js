// The Palette Builder's Preview button is a main toolbar action.
//
// It is the highest-priority item on the row, just left of Save or share, so it
// is the last action to leave for Extra tools. Its word shows from 360px; under
// that it keeps only its icon (and its name). The row never wraps.
//
// To make it fail: set `priority: 6` on the `preview` item in
// src/pages/PaletteBuilder.jsx back to 3 (the one-tap-away widths go red: the
// button leaves the row at 320 or 390); delete the
// `@media (max-width: 359.98px)` block for `.plb-preview-btn` in
// src/styles/pages/palette-builder.css (the label is visible at 320 and the
// row spills); put `collapse` back on the button (no word at 390).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { paletteToolbar } from './palette-helpers.js'

const WIDTHS = [320, 390, 768, 1440]

const settle = async (page) => {
  await expect(paletteToolbar(page)).not.toHaveClass(/is-measuring/)
  await page.waitForTimeout(120)
}

/** Every painted child of the toolbar row, left to right, with its box. */
const rowBoxes = (page) => paletteToolbar(page).evaluate((bar) => [...bar.children]
  .filter((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).position !== 'absolute')
  .map((el) => {
    const r = el.getBoundingClientRect()
    return {
      id: el.getAttribute('data-tl-item') || (el.hasAttribute('data-tl-more') ? 'more' : el.classList.contains('tl-primary') ? 'primary' : el.tagName.toLowerCase()),
      top: r.top, left: r.left, right: r.right, width: r.width,
    }
  }))

test.describe('Preview is a main toolbar button', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer who wants to see the palette on a real design') })

  for (const width of WIDTHS) {
    test(`${width}px: one row, Preview on it, just left of Save or share`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/palette')
      await settle(page)

      const bar = paletteToolbar(page)
      const preview = bar.locator('.plb-preview-btn')
      await expect(preview, `${width}px: Preview is on the row`).toBeVisible()
      await expect(preview).toHaveAccessibleName('Preview')

      const boxes = await rowBoxes(page)
      const tops = boxes.map((b) => b.top)
      expect(Math.max(...tops) - Math.min(...tops), `${width}px: every item on the row shares one line (${boxes.map((b) => b.id).join(', ')})`).toBeLessThanOrEqual(2)
      expect(await bar.evaluate((el) => el.scrollWidth > el.clientWidth + 1), `${width}px: the toolbar does not scroll`).toBe(false)

      // Left to right: Preview comes after every other action and before the primary.
      const ids = boxes.map((b) => b.id)
      const at = ids.indexOf('preview')
      expect(at, `${width}px: order on the row is ${ids.join(' > ')}`).toBeGreaterThan(-1)
      expect(ids.at(-1), 'the primary ends the row').toBe('primary')
      expect(ids.slice(at + 1).filter((id) => id !== 'more' && id !== 'primary'), 'nothing but More and Save sits to the right of Preview').toEqual([])
    })
  }

  test('the word "Preview" shows from 360px and is gone at 320', async ({ page }) => {
    await go(page, '/create/palette')
    const label = paletteToolbar(page).locator('.plb-preview-btn .tl-btn-label')
    for (const [width, shown] of [[320, false], [359, false], [360, true], [390, true], [768, true], [1440, true]]) {
      await page.setViewportSize({ width, height: 900 })
      await settle(page)
      await expect(paletteToolbar(page).locator('.plb-preview-btn'), `${width}px: Preview is on the row`).toBeVisible()
      if (shown) await expect(label, `${width}px: the word shows`).toBeVisible()
      else await expect(label, `${width}px: the icon stands alone`).toBeHidden()
      await expect(paletteToolbar(page).locator('.plb-preview-btn')).toHaveAccessibleName('Preview')
    }
  })

  test('a click opens the preview dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/palette')
    await settle(page)
    const preview = paletteToolbar(page).locator('.plb-preview-btn')
    await expect(preview).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(preview).toHaveAttribute('aria-expanded', 'false')
    await preview.click()
    await expect(page.locator('[role=dialog][aria-label="Palette preview"]')).toBeVisible()
  })

  test('it is the last action to leave: still on the row when its neighbours have gone to Extra tools', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await go(page, '/create/palette')
    await settle(page)
    const bar = paletteToolbar(page)
    await expect(bar.locator('.plb-preview-btn')).toBeVisible()
    await bar.getByRole('button', { name: 'Extra tools' }).click()
    const panel = page.getByRole('dialog', { name: 'Extra tools' })
    await expect(panel).toBeVisible()
    // Explore (2), From image (3) and Back (2) have left; Preview (6) has not.
    await expect(panel.getByRole('button', { name: 'Explore palettes', exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Preview', exact: true }), 'Preview is not doubled in Extra tools').toHaveCount(0)
  })
})
