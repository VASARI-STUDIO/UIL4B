// THE SIGNED-OUT ICON GRID ENDS ON A FULL ROW, AND THE PACK NAME SHOWS ON HOVER ONLY.
//
// Two things a visitor sees on /create/icons, by acceptance criterion (icon library design, slice S6):
//   20. signed out at 1280, 1440, 1920, 768, 390 and 320 the grid holds a whole number of rows
//       (cells % columns === 0), and at 1440 exactly 65; it keeps that after a resize;
//   21. in the All packs view at 1440 no pack name is visible at rest; hovering a cell, or
//       keyboard focus on it, shows it; the cell's box is the same before and during hover;
//       where nothing can hover (touch) it is never drawn; and every cell's accessible name
//       carries the pack, so nothing depends on hover.
//
// The expected row counts are written out in tests/user-sim/icon-grid-rows.js, not read from
// src/data/iconPackTiers.js, so either side drifting fails here.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   anonCapForCols returns ANON_ICON_CAP (data/iconGridRows.js)   -> "the grid ends on a full row" (65 becomes 60)
//   IconLibrary stops trimming with capAnonList(fetchedIcons, anonCap)  -> "the grid ends on a full row" (75 cells)
//   the measuring effect never calls setGridCols                    -> "the grid ends on a full row" (60 at 1440)
//   .ic .ic-pack loses opacity:0 and visibility:hidden (global.css) -> "no pack name shows at rest"
//   .ic .ic-pack loses position:absolute (global.css)               -> "the pack name takes no room in the cell" (the hover test alone stays green: a hidden in-flow label still holds its row)
//   the :focus-visible rule is deleted (global.css)                 -> "keyboard focus on a cell shows its pack name"
//   the @media (hover:none) display:none rule is deleted            -> "where nothing can hover the pack name is never drawn"
//   cellLabel drops the pack (IconLibrary.jsx)                      -> "every cell's accessible name carries its pack"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { gridColumns, wholeRowCount } from './icon-grid-rows.js'

const PERSONA = 'a designer who has not signed up yet, browsing icon sets'

/** Wait until the real cells have replaced the skeleton, and return how many there are. */
async function loadedCells(page) {
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20_000 })
  return page.locator('.ig .ic').count()
}

test.describe('the signed-out grid ends on a full row', () => {
  for (const width of [1280, 1440, 1920, 768, 390, 320]) {
    test(`at ${width} the cells divide into whole rows`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/icons')
      const count = await loadedCells(page)
      const cols = await gridColumns(page)
      expect(cols, 'the grid has columns').toBeGreaterThan(0)
      expect(count % cols, `${count} cells across ${cols} columns leaves a ragged last row`).toBe(0)
      expect(count, 'the sample is never cut below the 60 it promises').toBeGreaterThanOrEqual(60)
      expect(count, 'and never grows past the ceiling').toBeLessThanOrEqual(72)
      expect(count, 'the count follows the independent whole-row rule').toBe(wholeRowCount(cols))
      if (width === 1440) {
        expect(cols, '1440 is thirteen columns').toBe(13)
        expect(count, 'five full rows of thirteen').toBe(65)
      }
      // No render loop and no late jump: the count is the same a moment later.
      await page.waitForTimeout(600)
      expect(await page.locator('.ig .ic').count()).toBe(count)
    })
  }

  test('a resize re-cuts the held icons to the new row length', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    expect(await loadedCells(page)).toBe(65)
    const requests = []
    page.on('request', (r) => requests.push(r.url()))
    for (const width of [1920, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect.poll(async () => {
        const cols = await gridColumns(page)
        return (await page.locator('.ig .ic').count()) === wholeRowCount(cols)
      }, { message: `at ${width} the grid never settled on whole rows`, timeout: 10_000 }).toBe(true)
    }
    expect(await page.locator('.ig .ic').count(), 'back at 1440 the grid is 65 again').toBe(65)
    const listing = requests.filter((u) => /\/collection|\/search/.test(u))
    expect(listing, 'a resize re-cuts what is held and lists nothing again (glyph batches for the extra cells are expected)').toEqual([])
  })
})

test.describe('the pack name shows on hover only', () => {
  test('no pack name shows at rest; hovering a cell shows its pack without moving the cell', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await loadedCells(page)
    const packs = page.locator('.ig .ic .ic-pack')
    expect(await packs.count(), 'the All packs view carries a pack name on every cell').toBe(65)
    // Rest: none is visible (hidden, not merely transparent).
    for (const state of await packs.evaluateAll((els) => els.map((el) => getComputedStyle(el).visibility))) {
      expect(state).toBe('hidden')
    }
    await expect(packs.first()).toBeHidden()

    const cell = page.locator('.ig .ic').nth(3)
    const box = (loc) => loc.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
    const before = await box(cell)
    await cell.hover()
    const label = cell.locator('.ic-pack')
    await expect(label).toBeVisible()
    await expect.poll(() => label.evaluate((el) => getComputedStyle(el).opacity), { message: 'the label fades in' }).toBe('1')
    expect(await box(cell), 'the pack name appears without moving the cell').toEqual(before)
    // It sits in the cell's top-left, inside the cell.
    const inside = await cell.evaluate((el) => {
      const c = el.getBoundingClientRect()
      const l = el.querySelector('.ic-pack').getBoundingClientRect()
      return { left: l.left - c.left, top: l.top - c.top, right: c.right - l.right }
    })
    expect(inside.left).toBeGreaterThanOrEqual(0)
    expect(inside.top).toBeGreaterThanOrEqual(0)
    expect(inside.right).toBeGreaterThanOrEqual(0)
    expect(await label.evaluate((el) => getComputedStyle(el).fontFamily), 'the label is UI sans, not mono').not.toMatch(/mono/i)
    // Leaving puts it away again, and only that cell showed it.
    await page.mouse.move(2, 2)
    await expect(label).toBeHidden()
    expect(await box(cell)).toEqual(before)
  })

  for (const width of [1440, 390]) {
    test(`at ${width} the pack name takes no room in the cell, shown or not`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/icons')
      await loadedCells(page)
      // Every cell's box, and where its glyph and its name sit inside it.
      const layout = () => page.locator('.ig .ic').evaluateAll((cells) => cells.map((cell) => {
        const c = cell.getBoundingClientRect()
        const at = (el) => { const r = el.getBoundingClientRect(); return [r.top - c.top, r.left - c.left, r.width, r.height].map(Math.round) }
        return { cell: [c.width, c.height].map(Math.round), glyph: at(cell.querySelector('.ig-chip, svg.ig-sym, img')), name: at(cell.querySelector('.ic-name')) }
      }))
      const withLabel = await layout()
      expect(withLabel.length).toBeGreaterThan(0)
      // Take the label out of the page altogether: if it held a row of its own, everything would now move.
      await page.addStyleTag({ content: '.ig .ic .ic-pack { display: none !important }' })
      expect(await layout(), 'with the pack label removed from the page no cell, glyph or name moves').toEqual(withLabel)
      // All the rows are one height, so a row is the same whichever cells it holds.
      expect(new Set(withLabel.map((l) => l.cell[1])).size, 'every cell is the same height').toBe(1)
    })
  }

  test('keyboard focus on a cell shows its pack name', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await loadedCells(page)
    await page.locator('.lbry-search input').first().focus()
    let landed = false
    for (let i = 0; i < 80 && !landed; i++) {
      await page.keyboard.press('Tab')
      landed = await page.evaluate(() => document.activeElement?.matches('.ig .ic') ?? false)
    }
    expect(landed, 'Tab reaches the grid').toBe(true)
    const focused = page.locator('.ig .ic:focus-visible')
    await expect(focused).toHaveCount(1)
    await expect(focused.locator('.ic-pack')).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.locator('.ig .ic .ic-pack:visible')).toHaveCount(1)
  })

  test('where nothing can hover the pack name is never drawn', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    watch(page, PERSONA)
    try {
      await go(page, '/create/icons')
      await loadedCells(page)
      expect(await page.evaluate(() => matchMedia('(hover: none)').matches), 'positive control: this context cannot hover').toBe(true)
      const shown = await page.locator('.ig .ic .ic-pack').evaluateAll((els) => els.map((el) => getComputedStyle(el).display))
      expect(shown.length, 'the label is in the markup').toBeGreaterThan(0)
      expect(new Set(shown)).toEqual(new Set(['none']))
      await page.locator('.ig .ic').first().focus()
      await expect(page.locator('.ig .ic .ic-pack:visible')).toHaveCount(0)
    } finally { await ctx.close() }
  })

  test("every cell's accessible name carries its pack", async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await loadedCells(page)
    const cells = await page.locator('.ig .ic').evaluateAll((els) => els.map((el) => ({
      label: el.getAttribute('aria-label'),
      name: el.querySelector('.ic-name')?.textContent.trim(),
      pack: el.querySelector('.ic-pack')?.textContent.trim(),
    })))
    expect(cells.length).toBe(65)
    for (const { label, name, pack } of cells) {
      expect(pack, `${name} has a pack name`).toBeTruthy()
      expect(label, `${name}'s accessible name`).toBe(`Customise ${name}, ${pack}`)
    }
    expect(new Set(cells.map((c) => c.pack)).size, 'the sample spans the five anonymous sets').toBe(5)
    await expect(page.getByRole('button', { name: `Customise ${cells[0].name}, ${cells[0].pack}`, exact: true })).toHaveCount(1)
  })
})
