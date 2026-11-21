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
  // The mixed-pack grid on screen before the pack lands names each cell's pack (`has-pack`); the chosen
  // pack's own grid names none, so wait for that, or a cell from the old grid is read and then replaced.
  await expect(page.locator(`${REAL_CELL}.has-pack`)).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator(`${REAL_CELL} :is(img, svg.ig-sym)`).first()).toBeVisible({ timeout: 20_000 })
}

for (const width of [390, 1440]) {
  test.describe(`at ${width}px`, () => {
    test('a stroke icon cell has the mark, and its name says the line style is editable', async ({ page }) => {
      watch(page, `someone choosing a stroke icon at ${width}px`)
      await openPack(page, width, 'lucide')
      const cells = page.locator(REAL_CELL)
      const total = await cells.count()
      expect(total, 'the pack drew cells').toBeGreaterThan(8)
      // More cells can stream in after the count, so assert no cell lacks the mark rather than matching a fixed total.
      await expect(cells.filter({ hasNot: page.locator('.ic-edit') }), 'every Lucide cell has the mark').toHaveCount(0)
      const labels = await cells.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') || ''))
      for (const label of labels) expect(label.endsWith(SUFFIX), `${label} names the mark`).toBe(true)
      await expect(cells.first().locator('.ic-edit')).toHaveAttribute('aria-hidden', 'true')
    })

    test('a solid icon cell has no mark and no suffix', async ({ page }) => {
      watch(page, `someone choosing a solid icon at ${width}px`)
      await openPack(page, width, 'mdi')
      const cells = page.locator(REAL_CELL)
      expect(await cells.count(), 'the pack drew cells').toBeGreaterThan(8)
      await expect(cells.locator('.ic-edit'), 'no mark on a solid icon').toHaveCount(0)
      const labels = await cells.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') || ''))
      for (const label of labels) expect(label.includes('line style editable'), `${label} is not marked`).toBe(false)
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
      expect(m.mark.w, `the mark is 12px wide (${m.mark.w})`).toBeCloseTo(12, 0)
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

    // MUTATION: drop `hideEdit={category === 'editable'}` from the IconCell props in IconLibrary.jsx -> the pen is back on every Editable cell.
    test('the mark shows in All and is absent in the Editable category, where every cell is editable and the name still says so', async ({ page }) => {
      watch(page, `someone moving from All to Editable icons at ${width}px`)
      await openPack(page, width, 'lucide')
      const cells = page.locator(REAL_CELL)
      await expect(cells.locator('.ic-edit').first(), 'POSITIVE CONTROL: All draws the mark on a Lucide cell').toBeAttached()
      // On a phone the category control is in the quick row, wider it is on the row or behind the Category trigger.
      const group = page.getByRole('group', { name: 'Icon category' }).first()
      if (!await group.isVisible()) {
        const filters = page.getByRole('button', { name: /^Filters\b/ })
        if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
      }
      if (!await group.isVisible()) await page.locator('.lbry-filtertrig', { hasText: 'Category' }).first().click()
      await group.getByRole('button', { name: /^Editable/ }).click()
      await expect(page.getByRole('group', { name: 'Editable icon pack' })).toBeVisible({ timeout: 20_000 })
      await expect(cells.first()).toBeVisible({ timeout: 20_000 })
      await expect(cells.locator('.ic-edit'), 'no mark on any Editable cell').toHaveCount(0)
      await expect.poll(() => cells.evaluateAll((els, suffix) => els.length > 0 && els.every((el) => (el.getAttribute('aria-label') || '').endsWith(suffix)), SUFFIX), {
        message: 'every Editable cell still says its line style is editable', timeout: 20_000,
      }).toBe(true)
    })
  })
}
