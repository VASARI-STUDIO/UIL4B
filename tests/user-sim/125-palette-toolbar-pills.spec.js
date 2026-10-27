// PALETTE BUILDER TOOLBAR: UNDO / REDO AND THE GALLERY'S PLACE.
//
// 1. Undo and redo are the toolbar's own round icon buttons, the same shape as
//    the back button, with no boxed tray around them.
// 2. Suggest and Explore each open their own dialog under the button that was
//    pressed, its right edge on the button's and inside the viewport. On a phone
//    it stays a bottom sheet.
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

  for (const [name, dialog] of [['Explore palettes', 'Explore palettes'], ['Suggest variations and brands', 'Suggest']]) {
    test(`1440px: ${name} opens its dialog under its button, right edges aligned`, async ({ page }) => {
      watch(page, 'someone opening the palette gallery')
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, ROUTE)
      const btn = page.getByRole('button', { name })
      await btn.click()
      const panel = page.getByRole('dialog', { name: dialog, exact: true })
      await expect(panel).toBeVisible()
      await expect(panel.getByText(dialog, { exact: true })).toBeVisible()
      const b = await btn.boundingBox()
      // Measured once the opening animation has settled. The popup is
      // right-aligned: its right edge sits on the button's right edge.
      await expect.poll(async () => {
        const p = await panel.boundingBox()
        return Math.round(Math.abs((p.x + p.width) - (b.x + b.width)))
      }, { message: 'the dialog does not end under its button' }).toBeLessThanOrEqual(1)
      const p = await panel.boundingBox()
      expect(p.x, 'the dialog grows leftwards from the button, not rightwards').toBeLessThan(b.x)
      expect(p.y - (b.y + b.height), 'the dialog is not just below its button').toBeGreaterThanOrEqual(4)
      expect(p.y - (b.y + b.height)).toBeLessThanOrEqual(16)
      expect(p.x).toBeGreaterThanOrEqual(16 - 1)
      expect(p.x + p.width).toBeLessThanOrEqual(1440 - 16 + 1)
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
    })
  }

  test('390px: the gallery is still a bottom sheet', async ({ page }) => {
    watch(page, 'someone exploring palettes on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, ROUTE)
    const suggest = page.getByRole('button', { name: 'Suggest variations and brands' })
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
