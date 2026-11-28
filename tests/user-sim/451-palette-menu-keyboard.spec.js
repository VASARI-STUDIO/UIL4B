// The per-swatch colour menu works from the keyboard: a key press lands on the
// first row, a right-click lets the arrow keys in, Escape hands focus back to
// the swatch's "More" button, and Tab leaves without a trap.
//
// MUTATIONS (each turns the test named red):
//   the `ctxMenu.keyboard` first-row focus removed from the menu's layout effect -> "Enter on More lands on the first row"
//   the `el.focus(...)` for a pointer-opened menu removed                         -> "right-click then ArrowDown lands on a row"
//   the Escape handler's returnMenuFocus call removed                             -> both "Escape" tests
//   the Tab branch of the menu's onKeyDown removed                                -> "Tab closes the menu"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const more = (page) => page.getByRole('button', { name: 'More actions for PRIMARY' })
const colourMenu = (page) => page.getByRole('menu', { name: 'Colour actions' })

test('Enter on More lands on the first row, ArrowDown moves to the second', async ({ page }) => {
  watch(page, 'a keyboard user opening a swatch menu')
  await go(page, '/create/palette')
  await more(page).focus()
  await page.keyboard.press('Enter')
  const items = colourMenu(page).getByRole('menuitem')
  await expect(items.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(items.nth(1)).toBeFocused()
})

test('Escape returns focus to the More button', async ({ page }) => {
  watch(page, 'a keyboard user dismissing a swatch menu')
  await go(page, '/create/palette')
  await more(page).focus()
  await page.keyboard.press('Enter')
  await expect(colourMenu(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(colourMenu(page)).toHaveCount(0)
  await expect(more(page)).toBeFocused()
})

test('right-click then ArrowDown lands on a row', async ({ page }) => {
  watch(page, 'a designer right-clicking then using the arrow keys')
  await go(page, '/create/palette')
  await page.locator('.plb-col .plb-name').first().click({ button: 'right' })
  await expect(colourMenu(page)).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(colourMenu(page).getByRole('menuitem').first()).toBeFocused()
})

test('Escape after a right-click focuses the swatch\'s More button', async ({ page }) => {
  watch(page, 'a designer dismissing a right-click menu')
  await go(page, '/create/palette')
  await page.locator('.plb-col .plb-name').first().click({ button: 'right' })
  await expect(colourMenu(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(colourMenu(page)).toHaveCount(0)
  await expect(more(page)).toBeFocused()
})

test('Tab closes the menu without trapping focus', async ({ page }) => {
  watch(page, 'a keyboard user tabbing out of a swatch menu')
  await go(page, '/create/palette')
  await more(page).focus()
  await page.keyboard.press('Enter')
  await expect(colourMenu(page).getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(colourMenu(page)).toHaveCount(0)
})
