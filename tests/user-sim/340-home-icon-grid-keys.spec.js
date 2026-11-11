// HOME "TRY THE TOOLS": THE ICON GRID IS ONE TAB STOP WITH ARROW KEYS.
//
// The grid held about 90 buttons in the tab order (the folded rows too), so a keyboard
// visitor tabbed through every icon to reach the next section. It is now a listbox with a
// roving tabindex: Tab lands on the picked icon, the next Tab leaves, arrows move by one
// cell or one row, Home and End by the row, Ctrl+Home and Ctrl+End by the grid, and Enter or
// Space picks as a click does. Run at 1440 (nine rows) and 390 (four rows, fewer columns).
//
//   1. Exactly one icon is in the tab order. Tab from the control before the grid lands on
//      the picked icon, and the next Tab leaves the grid.
//   2. Arrow keys: Right and Left by one, Down and Up by a row (the live column count),
//      nothing past an edge, Home and End to the row's ends, Ctrl+Home and Ctrl+End to the
//      first and last icon in view. Focus never lands on an icon in a folded row.
//   3. Enter and Space pick the focused icon: the preview names it and the cell is selected.
//   4. Leaving the grid and coming back lands on the picked icon again, not the last cell moved to.
//   5. The focused icon has a visible ring wholly inside the grid's clipped box.
//
// MUTATIONS (each turns a test red):
//   - leave tabIndex off the cells in IconTool.jsx (every cell tabbable) -> tests 1 and 4.
//   - make gridTarget ArrowDown step by 1, or read a fixed column count -> test 2.
//   - count every cell as shown in gridShape (drop the bottom test) -> test 2 (Ctrl+End lands in a folded row).
//   - drop the Enter/Space path (preventDefault on every key) or the onClick -> test 3.
//   - drop onGridBlur -> test 4.
//   - remove `.ht.ht .ht-ic-t:focus-visible { outline-offset: -2px }` in home-try.css -> test 5.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { gridColumns } from './icon-grid-rows.js'

const TABBABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const CELLS = '#ht-s-1 .ht-ic-grid [role="option"]'

/** Every control in the tab order that is drawn, in document order, each with its place relative to the grid. */
const tabOrder = (page) => page.evaluate((sel) => {
  const grid = document.querySelector('#ht-s-1 .ht-ic-grid')
  return [...document.querySelectorAll(sel)]
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
    .map((el) => ({ inGrid: grid.contains(el), label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30) }))
}, TABBABLE)

/** Focus the tab-order control just before the grid's tab stop. */
const focusBeforeGrid = (page) => page.evaluate((sel) => {
  const grid = document.querySelector('#ht-s-1 .ht-ic-grid')
  const list = [...document.querySelectorAll(sel)]
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
  const at = list.findIndex((el) => grid.contains(el))
  list[at - 1].focus()
  return list[at - 1].getAttribute('aria-label') || list[at - 1].textContent.trim().slice(0, 30)
}, TABBABLE)

/** Where focus is in the grid: its index among the cells, the label, and how many cells sit inside the clipped box. */
const where = (page) => page.evaluate(() => {
  const grid = document.querySelector('#ht-s-1 .ht-ic-grid')
  const box = grid.getBoundingClientRect()
  const cells = [...grid.children]
  const on = cells.indexOf(document.activeElement)
  const inView = cells.filter((c) => c.getBoundingClientRect().bottom <= box.bottom + 1).length
  const r = on >= 0 ? cells[on].getBoundingClientRect() : null
  return { on, label: on >= 0 ? cells[on].getAttribute('aria-label') : null, inView, inBox: !!r && r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.left >= box.left - 1 && r.right <= box.right + 1 }
})

async function openIcons(page) {
  await go(page, '/')
  await page.locator('#try').scrollIntoViewIfNeeded()
  await page.locator('#ht-n-1').click()
  await expect(page.locator('#ht-s-1')).toBeVisible()
  await expect(page.locator(CELLS).first()).toBeVisible({ timeout: 15000 })
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`home icon grid keys at ${width}`, () => {
    test.use({ viewport: { width, height } })

    test.beforeEach(async ({ page }) => {
      watch(page, 'someone using only the keyboard')
      await openIcons(page)
    })

    test('the grid is one tab stop: Tab lands on the picked icon, the next Tab leaves', async ({ page }) => {
      // Mutation: give every cell tabindex 0 and the count is the whole list, not one.
      await expect(page.locator(`${CELLS}[tabindex="0"]`)).toHaveCount(1)
      const order = await tabOrder(page)
      expect(order.filter((s) => s.inGrid).length, 'icons in the tab order').toBe(1)

      await focusBeforeGrid(page)
      await page.keyboard.press('Tab')
      const first = await where(page)
      expect(first.on, 'Tab did not land on an icon').toBeGreaterThanOrEqual(0)
      await expect(page.locator(`${CELLS}[aria-selected="true"]`)).toHaveAttribute('aria-label', first.label)
      await page.keyboard.press('Tab')
      expect((await where(page)).on, 'a second Tab stayed in the grid').toBe(-1)
      await expect(page.locator('#ht-s-1 .ht-ic-grid:focus-within')).toHaveCount(0)
    })

    test('arrows move by a cell and by a row, Home and End by the row, Ctrl+Home and Ctrl+End by the grid', async ({ page }) => {
      const cols = await gridColumns(page)
      await focusBeforeGrid(page)
      await page.keyboard.press('Tab')
      const start = await where(page)
      const inView = start.inView
      expect(start.on, 'the picked icon starts the grid').toBe(0)
      expect(inView, 'the grid shows more than one row').toBeGreaterThan(cols)
      const at = async (key, want, why) => {
        await page.keyboard.press(key)
        const w = await where(page)
        expect(w.on, why).toBe(want)
        expect(w.inBox, `${why}: focus is outside the grid's box`).toBe(true)
      }

      await at('ArrowLeft', 0, 'ArrowLeft at the first icon stays')
      await at('ArrowUp', 0, 'ArrowUp at the first row stays')
      await at('ArrowRight', 1, 'ArrowRight moves one icon')
      await at('ArrowDown', 1 + cols, 'ArrowDown moves one row')
      await at('ArrowLeft', cols, 'ArrowLeft moves one icon')
      await at('ArrowLeft', cols, 'ArrowLeft at a row start does not wrap to the row above')
      await at('ArrowUp', 0, 'ArrowUp moves one row')
      await at('End', cols - 1, 'End goes to the end of the row')
      await at('ArrowRight', cols - 1, 'ArrowRight at a row end does not wrap to the next row')
      await at('ArrowDown', 2 * cols - 1, 'ArrowDown from the row end')
      await at('Home', cols, 'Home goes to the start of the row')
      await at('End', 2 * cols - 1, 'End on the second row')
      await at('Control+End', inView - 1, 'Ctrl+End goes to the last icon in view')
      await at('ArrowDown', inView - 1, 'ArrowDown at the last row stays')
      await at('ArrowRight', inView - 1, 'ArrowRight at the last icon stays')
      await at('Control+Home', 0, 'Ctrl+Home goes to the first icon')
      // Mutation: a fixed 9 or 4 rows, or counting folded cells, puts Ctrl+End past the box.
      expect((await where(page)).inBox).toBe(true)
    })

    test('Enter and Space pick the focused icon', async ({ page }) => {
      await focusBeforeGrid(page)
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      const third = (await where(page)).label
      await page.keyboard.press('Enter')
      // Mutation: preventDefault on Enter, or no onClick on the cell, and the preview keeps the old name.
      await expect(page.locator('#ht-s-1 .ht-ic-name')).toHaveText(third)
      await expect(page.locator(`${CELLS}[aria-selected="true"]`)).toHaveAttribute('aria-label', third)

      await page.keyboard.press('ArrowDown')
      const below = (await where(page)).label
      expect(below).not.toBe(third)
      await page.keyboard.press('Space')
      await expect(page.locator('#ht-s-1 .ht-ic-name')).toHaveText(below)
      await expect(page.locator(`${CELLS}[aria-selected="true"]`)).toHaveAttribute('aria-label', below)
    })

    test('leaving the grid and coming back lands on the picked icon', async ({ page }) => {
      await focusBeforeGrid(page)
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowDown')
      const moved = (await where(page)).on
      expect(moved).toBeGreaterThan(1)
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      // Mutation: drop onGridBlur and focus returns to the cell moved to, not the picked icon (index 0).
      expect((await where(page)).on).toBe(0)
      await expect(page.locator(`${CELLS}[tabindex="0"]`)).toHaveCount(1)
    })

    test('the focused icon has a ring inside the clipped grid', async ({ page }) => {
      await focusBeforeGrid(page)
      await page.keyboard.press('Tab')
      const ring = await page.evaluate(() => {
        const el = document.activeElement
        const cs = getComputedStyle(el)
        const box = document.querySelector('#ht-s-1 .ht-ic-grid').getBoundingClientRect()
        const r = el.getBoundingClientRect()
        const out = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset)
        return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), clipped: r.left - out < box.left || r.top - out < box.top }
      })
      expect(ring.style, 'no focus ring on the icon').not.toBe('none')
      expect(ring.width).toBeGreaterThanOrEqual(2)
      // Mutation: remove the inset outline-offset and the first icon's ring is cut by the grid's overflow.
      expect(ring.clipped, 'the ring is cut off by the grid edge').toBe(false)
    })
  })
}
