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
    // To the middle of the grid, not a fixed 6000px: the page now ends with the close and the
    // footer, so it is only ~1800px longer than the grid and a long scroll lands below the
    // grid, where no cell is mounted at all.
    await page.evaluate(() => {
      const grid = document.querySelector('.emoji-virt').getBoundingClientRect()
      window.scrollTo(0, window.scrollY + grid.top + grid.height / 2 - window.innerHeight / 2)
    })
    // The first cell of the old window is unmounted; wait for the new window.
    await expect.poll(async () => glyphOf(page.locator(CELL).first())).not.toBe(before)
    // Pin ONE node that is fully on screen. A positional locator (.nth) is
    // resolved again at every step, and the window keeps moving under it while
    // the scroll settles and the click scrolls, so the glyph read and the cell
    // clicked could be two different cells. A node on screen needs no scroll to
    // be clicked, so the window stays put; if it were unmounted anyway, the
    // handle would fail loudly rather than point at a neighbour.
    const handle = await page.evaluateHandle((sel) => {
      const fits = (el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight }
      return [...document.querySelectorAll(sel)].filter(fits)[3]
    }, CELL)
    const cell = handle.asElement()
    expect(cell, 'no emoji cell fully on screen after the scroll').not.toBeNull()
    const glyph = await cell.evaluate((el) => el.querySelector('.emoji-char').textContent)
    expect(glyph, 'the pinned cell is not one that was mounted before the scroll').not.toBe(before)
    await cell.click()
    // The copy is written asynchronously; read it back once the cell reports it.
    await expect.poll(() => cell.evaluate((el) => el.classList.contains('copied'))).toBe(true)
    await expect.poll(() => clipboard(page)).toBe(glyph)
  })
})
