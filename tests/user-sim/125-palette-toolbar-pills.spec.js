// PALETTE BUILDER TOOLBAR: UNDO / REDO AND THE GALLERY'S PLACE.
//
// 1. Undo and redo are the toolbar's own round icon buttons, the same shape as
//    the back button, with no boxed tray around them.
// 2. Suggest and Explore each open their own panel. At 1440 it is a docked
//    region at the right of the board (beside it, below the toolbar, inside the
//    viewport, not a popup under the button). On a phone it stays a bottom sheet.
//    The full geometry is pinned by 147-palette-suggest-explore.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/palette'

const radiusOf = (loc) => loc.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)

test.describe('palette toolbar pills and anchored gallery', () => {
  // 1280 and up: the Back button (priority 2) is on the row to compare against.
  for (const width of [1440, 1280]) {
    test(`${width}px: undo and redo match the back button and sit in no tray`, async ({ page }) => {
      watch(page, 'someone undoing a palette change')
      await page.setViewportSize({ width, height: 900 })
      await go(page, ROUTE)
      const undo = page.getByRole('button', { name: 'Undo' })
      const redo = page.getByRole('button', { name: 'Redo' })
      const back = page.locator('.tl-toolbar a.tl-btn--square').first()
      await expect(undo).toBeVisible()
      await expect(page.locator('.tl-tray')).toHaveCount(0)
      expect(await radiusOf(undo)).toBe(await radiusOf(back))
      expect(await radiusOf(redo)).toBe(await radiusOf(back))
      const [u, b] = [await undo.boundingBox(), await back.boundingBox()]
      expect(Math.round(u.width)).toBe(Math.round(b.width))
      expect(Math.round(u.height)).toBe(Math.round(b.height))
      // Undo and Redo are toolbar items of their own, not a "History" group.
      await expect(page.getByRole('group', { name: 'History' })).toHaveCount(0)
    })
  }

  for (const [name, dialog] of [['Explore palettes and brands', 'Explore palettes and brands'], ['Suggest variations', 'Suggest']]) {
    test(`1440px: ${name} opens as a docked panel beside the board, below the toolbar`, async ({ page }) => {
      watch(page, 'someone opening the palette gallery')
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, ROUTE)
      const btn = page.getByRole('button', { name })
      await btn.click()
      const panel = page.getByRole('complementary', { name: dialog, exact: true })
      await expect(panel).toBeVisible()
      await expect(panel.getByText(dialog.replace(/ palettes and brands$/, ''), { exact: true })).toBeVisible()
      const b = await btn.boundingBox()
      // Measured once the opening animation has settled.
      await expect.poll(async () => Math.round((await panel.boundingBox()).x), { message: 'the panel has not settled at the right of the board' }).toBeGreaterThan(900)
      const p = await panel.boundingBox()
      expect(p.y, 'the panel starts below the toolbar button, not over it').toBeGreaterThanOrEqual(b.y + b.height)
      expect(p.x + p.width, 'the panel runs off the right edge').toBeLessThanOrEqual(1440 + 1)
      expect(p.width, 'the panel is 360px wide').toBeGreaterThanOrEqual(358)
      expect(p.width).toBeLessThanOrEqual(362)
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
    })
  }

  test('390px: the gallery is still a bottom sheet', async ({ page }) => {
    watch(page, 'someone exploring palettes on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, ROUTE)
    const suggest = page.getByRole('button', { name: 'Suggest variations' })
    if (await suggest.isVisible()) await suggest.click()
    else {
      await page.getByRole('button', { name: /^Extra tools/ }).click()
      await page.getByRole('button', { name: 'Suggest', exact: true }).click()
    }
    const panel = page.getByRole('dialog', { name: 'Suggest', exact: true })
    await expect(panel).toBeVisible()
    const p = await panel.boundingBox()
    expect(Math.round(p.x)).toBe(0)
    expect(Math.round(p.width)).toBe(390)
    expect(Math.round(p.y + p.height)).toBeGreaterThanOrEqual(843)
  })
})
