// PALETTE BUILDER TOOLBAR: UNDO / REDO AND THE GALLERY'S PLACE.
//
// 1. Undo and redo are the toolbar's own round icon buttons, the same shape as
//    the back button, with no boxed tray around them.
// 2. Suggest and Explore open the gallery under the button that was pressed,
//    inside the viewport. On a phone it stays a bottom sheet.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/palette'

const radiusOf = (loc) => loc.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)

test.describe('palette toolbar pills and anchored gallery', () => {
  for (const width of [1440, 1024]) {
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
      const group = page.getByRole('group', { name: 'History' })
      await expect(group).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    })
  }

  for (const [name, title] of [['Explore palettes', 'Community gallery'], ['Suggest a palette', 'Suggestions']]) {
    test(`1440px: ${name} opens the gallery under its button`, async ({ page }) => {
      watch(page, 'someone opening the palette gallery')
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, ROUTE)
      const btn = page.getByRole('button', { name })
      await btn.click()
      const panel = page.getByRole('dialog', { name: 'Colour gallery' })
      await expect(panel).toBeVisible()
      await expect(panel.getByText(title, { exact: true })).toBeVisible()
      const b = await btn.boundingBox()
      // Measured once the opening animation has settled.
      await expect.poll(async () => Math.round(Math.abs((await panel.boundingBox()).x - b.x)), { message: 'the gallery does not start under its button' }).toBeLessThanOrEqual(1)
      const p = await panel.boundingBox()
      expect(p.y - (b.y + b.height), 'the gallery is not just below its button').toBeGreaterThanOrEqual(4)
      expect(p.y - (b.y + b.height)).toBeLessThanOrEqual(16)
      expect(p.x + p.width).toBeLessThanOrEqual(1440 - 16 + 1)
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
    })
  }

  test('390px: the gallery is still a bottom sheet', async ({ page }) => {
    watch(page, 'someone exploring palettes on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, ROUTE)
    const suggest = page.getByRole('button', { name: 'Suggest a palette' })
    if (await suggest.isVisible()) await suggest.click()
    else {
      await page.getByRole('button', { name: /^Extra tools/ }).click()
      await page.getByRole('button', { name: 'Suggest', exact: true }).click()
    }
    const panel = page.getByRole('dialog', { name: 'Colour gallery' })
    await expect(panel).toBeVisible()
    const p = await panel.boundingBox()
    expect(Math.round(p.x)).toBe(0)
    expect(Math.round(p.width)).toBe(390)
    expect(Math.round(p.y + p.height)).toBeGreaterThanOrEqual(843)
  })
})
