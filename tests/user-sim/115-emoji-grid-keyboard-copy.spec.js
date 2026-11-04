// The Emoji Library's windowed grid, from the keyboard and the mouse: a cell is
// reachable by Tab, Enter or a click opens that emoji's detail dialog, the dialog
// shows exactly the glyph the cell showed, and its Copy emoji button copies it.
// That includes a cell mounted only after a scroll. 32-emoji-library covers the
// windowing and search; 242-emoji-advanced-popup covers the rest of the dialog.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/emoji'
const SEARCH = 'input[type="search"]'
const CELL = '.emoji-cell'
const DIALOG = '.emd-panel'

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const glyphOf = (cell) => cell.locator('.emoji-char').textContent()

/** The dialog is up, shows `glyph` large, and Copy emoji puts it on the clipboard. */
async function copiesFromDialog(page, glyph) {
  const dialog = page.locator(DIALOG)
  await expect(dialog, 'the cell opens the detail dialog').toBeVisible()
  await expect(dialog.locator('.emd-glyph'), 'the dialog shows the glyph the cell showed').toHaveText(glyph)
  await dialog.getByRole('button', { name: 'Copy emoji' }).click()
  await expect(dialog.getByRole('button', { name: 'Copied emoji' })).toBeVisible()
  await expect.poll(() => clipboard(page)).toBe(glyph)
}

test.describe('emoji grid copy', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'someone copying one emoji')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, ROUTE)
    await expect(page.locator(SEARCH)).toBeVisible()
    await expect(page.locator(CELL).first()).toBeVisible()
  })

  // MUTATION: EmojiGrid.jsx EmojiCell onClick calls a copy again instead of onOpen -> no dialog, all three fail.
  // MUTATION: EmojiDetailDialog.jsx "Copy emoji" calls onCopy with the wrong text (the name, say) -> the clipboard poll in all three fails.
  test('Tab reaches a cell and Enter opens its dialog, which copies the glyph', async ({ page }) => {
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
    await copiesFromDialog(page, glyph)
  })

  test('a click opens the dialog for the glyph under the pointer, and it copies', async ({ page }) => {
    const cell = page.locator(CELL).nth(5)
    const glyph = await glyphOf(cell)
    await cell.click()
    await copiesFromDialog(page, glyph)
  })

  test('a cell that only mounted after scrolling still opens and copies its own glyph', async ({ page }) => {
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
    await copiesFromDialog(page, glyph)
  })
})
