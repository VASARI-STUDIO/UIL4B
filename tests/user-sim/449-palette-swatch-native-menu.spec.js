// Right-click on a Palette swatch opens the colour menu, but a field or panel
// inside the swatch keeps the browser's own menu (paste, spellcheck), and so
// does Shift+right-click.
//
// MUTATIONS (each turns the test named red):
//   the field/panel `closest(...)` guard removed from the swatch onContextMenu -> "a field inside the swatch keeps the browser menu"
//   the `e.shiftKey` check removed                                             -> "Shift+right-click on a swatch keeps the browser menu"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const colourMenu = (page) => page.getByRole('menu', { name: 'Colour actions' })

test('right-click on the bare swatch still opens the colour menu', async ({ page }) => {
  watch(page, 'a designer right-clicking a colour')
  await go(page, '/create/palette')
  await page.locator('.plb-col .plb-name').first().click({ button: 'right' })
  await expect(colourMenu(page)).toBeVisible()
})

test('a field inside the swatch keeps the browser menu', async ({ page }) => {
  watch(page, 'a designer pasting a hex into the HCT editor')
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  // The quick tools show on hover.
  await page.locator('.plb-col').first().hover()
  await page.getByRole('button', { name: 'Edit PRIMARY in HCT' }).click()
  const field = page.getByRole('textbox', { name: 'Hex value of PRIMARY' })
  await expect(field).toBeVisible()
  const prevented = await field.evaluate((el) => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 10, clientY: 10 })
    el.dispatchEvent(ev)
    return ev.defaultPrevented
  })
  expect(prevented, 'the page took the right-click away from the field').toBe(false)
  await expect(colourMenu(page)).toHaveCount(0)
})

test('Shift+right-click on a swatch keeps the browser menu', async ({ page }) => {
  watch(page, 'a designer asking for the browser menu')
  await go(page, '/create/palette')
  const prevented = await page.locator('.plb-col .plb-name').first().evaluate((el) => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, shiftKey: true, clientX: 10, clientY: 10 })
    el.dispatchEvent(ev)
    return ev.defaultPrevented
  })
  expect(prevented).toBe(false)
  await expect(colourMenu(page)).toHaveCount(0)
})
