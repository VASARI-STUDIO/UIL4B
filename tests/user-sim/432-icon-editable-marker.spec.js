// ICON LIBRARY: NO "LINE STYLE EDITABLE" MARK ON ICON CELLS.
//
// A stroke icon (Lucide) can have its line style changed in the customiser, but the grid does not
// say so: no pen in the cell's corner (`.ic-edit`) and no ", line style editable" at the end of the
// cell's accessible name. The customiser and the Editable category are unchanged.
//
// MUTATIONS (each seen red, then restored):
//   IconCell draws a `.ic-edit` mark again               -> "the All grid carries no mark and no suffix"
//   cellLabel appends ", line style editable" again      -> "a stroke pack (Lucide) carries no mark and no suffix"
//   the mark is drawn in the Editable category only      -> "the Editable category carries no mark and no suffix"
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

const REAL_CELL = '.ig .ic:not(.ig-skel)'
const SUFFIX = 'line style editable'

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

async function expectNoMark(page, where) {
  const cells = page.locator(REAL_CELL)
  expect(await cells.count(), `${where} drew cells`).toBeGreaterThan(8)
  await expect(page.locator('.ic-edit'), `no pen mark in ${where}`).toHaveCount(0)
  const labels = await cells.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') || ''))
  for (const label of labels) expect(label.includes(SUFFIX), `${label} does not say its line style is editable`).toBe(false)
}

for (const width of [390, 1440]) {
  test.describe(`at ${width}px`, () => {
    test('the All grid carries no mark and no suffix', async ({ page }) => {
      watch(page, `someone browsing all icons at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
      await expectNoMark(page, 'the All grid')
    })

    test('a stroke pack (Lucide) carries no mark and no suffix', async ({ page }) => {
      watch(page, `someone choosing a stroke icon at ${width}px`)
      await openPack(page, width, 'lucide')
      await expectNoMark(page, 'the Lucide pack')
    })

    test('the Editable category carries no mark and no suffix', async ({ page }) => {
      watch(page, `someone moving from All to Editable icons at ${width}px`)
      await openPack(page, width, 'lucide')
      // On a phone the category control is in the quick row, wider it is on the row or behind the Category trigger.
      const group = page.getByRole('group', { name: 'Icon category' }).first()
      if (!await group.isVisible()) {
        const filters = page.getByRole('button', { name: /^Filters\b/ })
        if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
      }
      if (!await group.isVisible()) await page.locator('.lbry-filtertrig', { hasText: 'Category' }).first().click()
      await group.getByRole('button', { name: /^Editable/ }).click()
      await expect(page.getByRole('group', { name: 'Editable icon pack' })).toBeVisible({ timeout: 20_000 })
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
      await expectNoMark(page, 'the Editable category')
    })
  })
}
