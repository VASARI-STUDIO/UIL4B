// ICON LIBRARY: THE MARK ON ICONS WHOSE LINE STYLE CAN BE EDITED.
//
// A stroke icon (Lucide) can have its line weight, ends and corners changed in the customiser;
// a solid one (Material Design Icons) cannot. The grid says which is which before anyone opens
// one: a small pen in the cell's top-right corner, and ", line style editable" at the end of the
// cell's accessible name. Both come from the same rule (src/utils/iconEditable.js), so a cell
// has the mark exactly when its name says so. The mark sits inside the cell, clear of the glyph.
//
// MUTATIONS (each seen red, then restored):
//   IconCell draws <EditMark /> for every cell       -> "a solid icon cell has no mark"
//   IconCell never draws <EditMark />                -> "a stroke icon cell has the mark"
//   `.ic-edit` loses `position:absolute` (library.css) -> "the mark sits inside the cell, clear of the glyph"
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

const REAL_CELL = '.ig .ic:not(.ig-skel)'
const SUFFIX = ', line style editable'

async function choosePack(page, pack) {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const inPanel = !(await page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }).isVisible()) && await filters.isVisible()
  const panel = sheet.or(page.getByRole('group', { name: 'Filters', exact: true }))
  if (inPanel) {
    await filters.click()
    await expect(panel).toBeVisible()
  }
  await chooseMenuOption(page, (inPanel ? panel : page.locator('.ig-toolbar')).getByRole('button', { name: 'Icon pack' }), pack)
  if (await sheet.isVisible()) {
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  } else if (inPanel) {
    await filters.click()
    await expect(panel).toBeHidden()
  }
}

async function openPack(page, width, pack) {
  await page.setViewportSize({ width, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  await choosePack(page, pack)
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator(`${REAL_CELL} :is(img, svg.ig-sym)`).first()).toBeVisible({ timeout: 20_000 })
}

// The grid keeps drawing more cells while a test is reading it, so a count taken in one call and
// a mark count taken in the next can describe two different grids ("expected 120, received 214").
// Read every real cell, its marks and its name in ONE pass inside the page, so the numbers all
// describe the same moment and a cell added a moment later cannot make them disagree.
async function snapshot(page) {
  return page.locator(REAL_CELL).evaluateAll((els) => ({
    total: els.length,
    marks: els.reduce((n, el) => n + el.querySelectorAll('.ic-edit').length, 0),
    unmarked: els.filter((el) => !el.querySelector('.ic-edit')).map((el) => el.getAttribute('aria-label') || '(no name)'),
    labels: els.map((el) => el.getAttribute('aria-label') || ''),
    firstMarkHidden: els[0]?.querySelector('.ic-edit')?.getAttribute('aria-hidden') ?? null,
  }))
}

for (const width of [390, 1440]) {
  test.describe(`at ${width}px`, () => {
    test('a stroke icon cell has the mark, and its name says the line style is editable', async ({ page }) => {
      watch(page, `someone choosing a stroke icon at ${width}px`)
      await openPack(page, width, 'lucide')
      const grid = await snapshot(page)
      expect(grid.total, 'the pack drew cells').toBeGreaterThan(8)
      expect(grid.unmarked, 'every Lucide cell has the mark').toEqual([])
      expect(grid.marks, 'one mark on each Lucide cell').toBe(grid.total)
      for (const label of grid.labels) expect(label.endsWith(SUFFIX), `${label} names the mark`).toBe(true)
      expect(grid.firstMarkHidden, 'the mark is hidden from assistive tech').toBe('true')
    })

    test('a solid icon cell has no mark and no suffix', async ({ page }) => {
      watch(page, `someone choosing a solid icon at ${width}px`)
      await openPack(page, width, 'mdi')
      const grid = await snapshot(page)
      expect(grid.total, 'the pack drew cells').toBeGreaterThan(8)
      expect(grid.marks, 'no mark on a solid icon').toBe(0)
      for (const label of grid.labels) expect(label.includes('line style editable'), `${label} is not marked`).toBe(false)
    })

    test('the mark sits inside the cell, clear of the glyph, and moves nothing', async ({ page }) => {
      watch(page, `someone looking at the grid at ${width}px`)
      await openPack(page, width, 'lucide')
      const cell = page.locator(REAL_CELL).first()
      const read = () => cell.evaluate((el) => {
        const box = (n) => { const r = n.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
        return { cell: box(el), mark: box(el.querySelector('.ic-edit')), glyph: box(el.querySelector('img, svg.ig-sym')), name: box(el.querySelector('.ic-name')) }
      })
      const m = await read()
      expect(m.mark.w, 'the mark is 12px wide').toBeCloseTo(12, 0)
      expect(m.mark.h, 'the mark is 12px tall').toBeCloseTo(12, 0)
      expect(m.mark.l, 'inside the cell on the left').toBeGreaterThanOrEqual(m.cell.l)
      expect(m.mark.t, 'inside the cell at the top').toBeGreaterThanOrEqual(m.cell.t)
      expect(m.mark.r, 'inside the cell on the right').toBeLessThanOrEqual(m.cell.r)
      expect(m.mark.b, 'inside the cell at the bottom').toBeLessThanOrEqual(m.cell.b)
      expect(m.mark.l, 'in the right half of the cell').toBeGreaterThan(m.cell.l + m.cell.w / 2)
      expect(m.mark.t - m.cell.t, 'in the top corner').toBeLessThan(m.cell.h / 3)
      const overlaps = m.mark.l < m.glyph.r && m.mark.r > m.glyph.l && m.mark.t < m.glyph.b && m.mark.b > m.glyph.t
      expect(overlaps, 'the mark covers the glyph').toBe(false)
      // Taking the mark out leaves the glyph and the name exactly where they were.
      await cell.evaluate((el) => { el.querySelector('.ic-edit').style.display = 'none' })
      const bare = await read().catch(() => null)
      expect(bare, 'the cell still reads without its mark').not.toBeNull()
      expect(bare.glyph, 'the glyph does not move').toEqual(m.glyph)
      expect(bare.name, 'the name does not move').toEqual(m.name)
      expect(bare.cell, 'the cell does not resize').toEqual(m.cell)
    })
  })
}
