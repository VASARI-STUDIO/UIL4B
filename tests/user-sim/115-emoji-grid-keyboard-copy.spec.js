// The Emoji Library's windowed grid, from the keyboard and the mouse: a cell is
// reachable by Tab, Enter copies exactly the glyph the cell shows, a click does
// the same, and a cell mounted only after a scroll still copies. 32-emoji-library
// covers the windowing and search; this covers the copy path.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/emoji'
const SEARCH = 'input[type="search"]'
const CELL = '.emoji-cell'

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const glyphOf = (cell) => cell.locator('.emoji-char').textContent()

test.describe('emoji grid copy', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'someone copying one emoji')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, ROUTE)
    await expect(page.locator(SEARCH)).toBeVisible()
    await expect(page.locator(CELL).first()).toBeVisible()
  })

  test('Tab reaches a cell and Enter copies the glyph it shows', async ({ page }) => {
    await page.locator(SEARCH).focus()
    let landed = false
    for (let i = 0; i < 40 && !landed; i++) {
      await page.keyboard.press('Tab')
      landed = await page.evaluate(() => document.activeElement?.classList.contains('emoji-cell'))
    }
    expect(landed, 'Tab never reached an emoji cell').toBe(true)
    const cell = page.locator(`${CELL}:focus`)
    const glyph = await glyphOf(cell)
    await page.keyboard.press('Enter')
    await expect(cell).toHaveClass(/copied/)
    expect(await clipboard(page)).toBe(glyph)
  })

  test('a click copies the glyph under the pointer', async ({ page }) => {
    const cell = page.locator(CELL).nth(5)
    const glyph = await glyphOf(cell)
    await cell.click()
    await expect(cell).toHaveClass(/copied/)
    expect(await clipboard(page)).toBe(glyph)
  })

  test('a cell that only mounted after scrolling still copies its own glyph', async ({ page }) => {
    const before = await glyphOf(page.locator(CELL).first())
    await page.evaluate(() => window.scrollBy(0, 6000))
    // The first cell of the old window is unmounted; wait for the new window.
    await expect.poll(async () => glyphOf(page.locator(CELL).first())).not.toBe(before)
    const cell = page.locator(CELL).filter({ has: page.locator('.emoji-char') }).nth(3)
    await cell.scrollIntoViewIfNeeded()
    const glyph = await glyphOf(cell)
    await cell.click()
    expect(await clipboard(page)).toBe(glyph)
  })
})
