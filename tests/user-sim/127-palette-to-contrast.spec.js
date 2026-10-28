// PALETTE BUILDER TO CONTRAST CHECKER.
//
// A free (signed-out) visitor can send the board as shown to the Contrast
// Checker from Extra tools, and the checker opens on those colours.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const HEX = /#[0-9A-F]{6}\b/gi

test('a signed-out visitor opens the untouched board in the Contrast Checker', async ({ page }) => {
  watch(page, 'a visitor checking their palette for contrast')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/create/palette')
  const board = page.locator('.plb-col')
  await expect(board.first()).toBeVisible()
  const boardText = (await board.allInnerTexts()).join(' ')
  const hexes = [...new Set((boardText.match(HEX) || []).map((h) => h.toUpperCase()))]
  expect(hexes.length, 'no hex values read off the board').toBeGreaterThan(1)

  await page.getByRole('button', { name: /^Extra tools/ }).click()
  await page.getByRole('menuitem', { name: 'Check contrast' }).or(page.getByRole('button', { name: 'Check contrast' })).first().click()
  await expect(page).toHaveURL(/\/create\/contrast\?fg=[0-9A-F]{6}&bg=[0-9A-F]{6}&from=palette/)

  await expect.poll(async () => {
    const text = (await page.locator('main').innerText()).toUpperCase()
    return hexes.filter((h) => text.includes(h)).length
  }, { message: 'the checker did not open on the board colours' }).toBeGreaterThanOrEqual(2)
})
