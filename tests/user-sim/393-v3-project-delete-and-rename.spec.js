// V3 project page: Rename says what is wrong when the name is empty, and Delete
// needs the project's name typed before it will go.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Remove the empty-name guard in saveRename (ProjectDetail.jsx): the rename test
// fails because no alert appears.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

test.use({ viewport: { width: 1440, height: 900 } })

const NOW = new Date().toISOString()
const project = (id, name) => ({ id, name, design: structuredClone(DEFAULT_DESIGN), createdAt: NOW, updatedAt: NOW })

test('Rename says what is wrong when the name is empty, then renames', async ({ page }) => {
  watch(page, 'a designer renaming a project')
  await signIn(page, { plan: 'free', projects: [project('p1', 'Kerbside')] })
  await go(page, '/projects/p1')
  await page.getByRole('button', { name: 'Actions for Kerbside' }).first().click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  const field = page.getByRole('textbox', { name: 'Project name' })
  await field.fill('')
  await field.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Give the project a name')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await field.fill('Offcut')
  await field.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Offcut' })).toBeVisible()
})

test('Delete stays disabled until the name is typed, then returns to the list', async ({ page }) => {
  watch(page, 'a designer deleting a project')
  await signIn(page, { plan: 'free', projects: [project('p1', 'Kerbside'), project('p2', 'Tenner')] })
  await go(page, '/projects/p1')
  await page.getByRole('button', { name: 'Actions for Kerbside' }).click()
  await page.getByRole('menuitem', { name: /Delete/ }).click()

  const dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', { name: 'Permanently delete' })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill('Kerbside')
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page).toHaveURL(/\/projects$/)
})
