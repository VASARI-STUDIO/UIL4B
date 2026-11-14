// V3 export page (/projects/:id/export): the page opens the export dialog on
// arrival, a row opens it on that kind of file, and Pro rows are tagged.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Make openRow in ProjectExport.jsx ignore its row (setPreset(resolvePreset(DEFAULT_PRESET))):
// the row test fails because the dialog opens on the default kind, not Code.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { exportPanel } from './export-rows.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

test.use({ viewport: { width: 1440, height: 900 } })

const NOW = new Date().toISOString()
function harbour() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.tints.scale = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  return { id: 'harbour', name: 'Harbour', design, createdAt: NOW, updatedAt: NOW }
}

test('the page names the project and opens the dialog on arrival', async ({ page }) => {
  watch(page, 'a designer finishing the brand-kit walkthrough')
  await signIn(page, { plan: 'free', projects: [harbour()] })
  await go(page, '/projects/harbour/export')
  await expect(page.getByRole('heading', { level: 1, name: 'Export Harbour' })).toBeVisible()
  await expect(exportPanel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(exportPanel(page)).toHaveCount(0)
  await expect(page.locator('.pjv-xr')).toHaveCount(6)
})

test('a row opens the dialog on that kind of file and closing returns focus to it', async ({ page }) => {
  watch(page, 'a designer picking Code from the list')
  await signIn(page, { plan: 'free', projects: [harbour()] })
  await go(page, '/projects/harbour/export')
  await expect(exportPanel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(exportPanel(page)).toHaveCount(0)

  const row = page.locator('.pjv-xr').filter({ has: page.locator('.pjv-xnm', { hasText: /^Code/ }) })
  await row.click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('radio', { checked: true }).first()).toContainText('Code')
  await page.keyboard.press('Escape')
  await expect(exportPanel(page)).toHaveCount(0)
  await expect(row, 'focus goes back to the row that opened it').toBeFocused()
})

test('Pro kinds carry a Pro tag and free ones do not', async ({ page }) => {
  watch(page, 'a free designer reading the list')
  await signIn(page, { plan: 'free', projects: [harbour()] })
  await go(page, '/projects/harbour/export')
  await expect(exportPanel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.pjv-xr').filter({ has: page.locator('.pjv-xnm', { hasText: /^Code/ }) }).locator('.pjv-xtg', { hasText: 'Pro' })).toHaveCount(0)
  expect(await page.locator('.pjv-xtg', { hasText: /^Pro$/ }).count(), 'at least one Pro row is tagged').toBeGreaterThan(0)
})

test('Rename asks for a name, says why when it is empty, then renames', async ({ page }) => {
  watch(page, 'a designer renaming from the export page')
  await signIn(page, { plan: 'free', projects: [harbour()] })
  await go(page, '/projects/harbour/export')
  await expect(exportPanel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Rename' }).click()
  const field = page.getByRole('textbox', { name: 'Project name' })
  await field.fill('')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('alert')).toContainText('Give the project a name')
  await field.fill('Quay')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Export Quay' })).toBeVisible()
})
