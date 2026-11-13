// V3 Libraries, palettes and gradients: the preview dialog a tile opens. It is
// a real dialog (focus goes in, Tab stays in, Escape closes and focus returns to
// the tile), its tab order matches its reading order with the editor link last,
// and on a phone it is a bottom sheet whose controls are all thumb-sized.
//
// MUTATIONS this file goes red on:
//   - move the editor link above the colour rows in GalleryPreviewDialog.jsx:
//     the tab-order assertion goes red;
//   - drop the Escape handler or the focus restore: the close assertions go red;
//   - shrink the sheet's primary below 52px or Close/Previous/Next below 44px:
//     the phone assertions go red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const LIBS = [
  { route: '/discover/palettes', noun: 'palette', editor: 'Open in Palette Builder' },
  { route: '/discover/gradients', noun: 'gradient', editor: 'Open in Gradient Generator' },
]
const OPEN_TILE = 'button[aria-label^="Preview "]:not([data-gate-fade] *)'

const nameOf = () => {
  const el = document.activeElement
  return el ? (el.getAttribute('aria-label') || el.textContent || '').trim() : ''
}

test.describe('preview dialog, desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const lib of LIBS) {
    test(`${lib.noun}: Enter opens it, Tab follows reading order, arrows move, Escape returns focus to the tile`, async ({ page }) => {
      watch(page, `a visitor previewing a ${lib.noun} with the keyboard`)
      await go(page, lib.route)
      const tile = page.locator(OPEN_TILE).first()
      const tileName = await tile.getAttribute('aria-label')
      await tile.focus()
      await page.keyboard.press('Enter')

      const dialog = page.getByRole('dialog', { name: tileName.replace(/^Preview /, '') })
      await expect(dialog).toBeVisible()
      expect(await dialog.evaluate((d) => d.contains(document.activeElement)), 'focus is inside the dialog').toBe(true)

      // Close is the first stop; walk Tab to the editor link.
      await dialog.getByRole('button', { name: 'Close' }).focus()
      const order = ['Close']
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('Tab')
        order.push(await page.evaluate(nameOf))
        if (order[order.length - 1] === lib.editor) break
      }
      expect(order.slice(0, 3)).toEqual(['Close', `Previous ${lib.noun}`, `Next ${lib.noun}`])
      expect(order[3], 'the first stop after Next is a colour row').toMatch(/^Copy /)
      expect(order[order.length - 1], 'the editor link is last').toBe(lib.editor)

      await expect(dialog.getByText(/^1 of \d+$/)).toBeVisible()
      await dialog.getByRole('button', { name: `Next ${lib.noun}` }).focus()
      await page.keyboard.press('ArrowRight')
      // The dialog takes the next item's name, so find it by role from here on.
      const moved = page.getByRole('dialog')
      await expect(moved.getByText(/^2 of \d+$/)).toBeVisible()
      await expect(moved).not.toHaveAccessibleName(tileName.replace(/^Preview /, ''))

      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator(`button[aria-label="${tileName}"]`).first()).toBeFocused()
    })
  }
})

test.describe('preview dialog, phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  for (const lib of LIBS) {
    test(`${lib.noun}: it is a bottom sheet with a 52px primary and 44px controls`, async ({ page }) => {
      watch(page, `a visitor previewing a ${lib.noun} on a phone`)
      await go(page, lib.route)
      await page.locator(OPEN_TILE).first().tap()
      const dialog = page.getByRole('dialog').last()
      await expect(dialog).toBeVisible()
      await expect.poll(async () => {
        const box = await dialog.boundingBox()
        return box ? Math.round(box.y + box.height) : -1
      }, { message: 'the sheet sits on the bottom edge' }).toBe(844)

      const primary = dialog.getByRole('link', { name: lib.editor })
      const pb = await primary.boundingBox()
      expect(Math.round(pb.height), 'the primary is 52 tall').toBe(52)
      expect(pb.y, 'the primary is in the bottom quarter').toBeGreaterThan(844 * 0.75)

      for (const name of ['Close', `Previous ${lib.noun}`, `Next ${lib.noun}`]) {
        const b = await dialog.getByRole('button', { name }).boundingBox()
        expect(b.width, `${name} is at least 44 wide`).toBeGreaterThanOrEqual(44)
        expect(b.height, `${name} is at least 44 tall`).toBeGreaterThanOrEqual(44)
      }
    })
  }
})
