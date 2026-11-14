// V3 project page states: an archived project offers Restore and says so, and a
// link to a project that is not there gets the project-missing page with a way back to the list,
// never a blank page (365-project-missing-page.spec.js covers that page in full).
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Drop the archived branch of `primary` in ProjectDetail.jsx: the archived test
// fails because the button says Export or Continue.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

test.use({ viewport: { width: 1440, height: 900 } })

const NOW = new Date().toISOString()

test('an archived project says so and its next action is Restore', async ({ page }) => {
  watch(page, 'a designer opening an archived project')
  const p = { id: 'old', name: 'Shallow End', design: structuredClone(DEFAULT_DESIGN), createdAt: NOW, updatedAt: NOW, archived: true }
  await signIn(page, { plan: 'free', projects: [p] })
  await go(page, '/projects/old')
  await expect(page.locator('.pjv-status')).toContainText('Archived')
  const restore = page.locator('.pjv-go', { hasText: 'Restore' })
  await expect(restore).toBeVisible()
  await restore.click()
  await expect(page.locator('.pjv-status')).not.toContainText('Archived')
})

test('an unknown project says so and offers the way back to the list', async ({ page }) => {
  watch(page, 'a designer following a link to a deleted project')
  await signIn(page, { plan: 'free', projects: [] })
  await go(page, '/projects/not-there')
  await expect(page).toHaveURL(/\/projects\/not-there$/)
  await expect(page.getByRole('heading', { level: 1, name: 'That project isn’t in your account' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open your workspace' })).toHaveAttribute('href', '/projects')
})
