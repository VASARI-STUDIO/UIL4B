// A SAVED PROJECT'S OWN ADDRESS STAYS THE PROJECT'S ADDRESS.
//
// Opening /projects/:id straight (a bookmark, a reload, a shared link) on a
// signed-in account must settle on that project and stay there, not bounce to
// the workspace a second or two later once the account's projects have loaded.
// The project is seeded on this device; the page is held past 2s before the URL
// and heading are read, so a late redirect cannot slip through unnoticed.
// An id the account does not have still ends at the workspace (the not-found
// answer), never a blank page.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Redirecting to /projects while the account's projects are still loading
// (`!project || projectsLoading` in the Navigate condition) sends the first two
// tests to the workspace.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const SETTLE_MS = 2600

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  const now = new Date().toISOString()
  return { id: 'stay-put', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

for (const { width, height } of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`a project opened by its address stays on that project at ${width}`, async ({ page }) => {
    watch(page, 'a designer reloading a saved project page')
    await page.setViewportSize({ width, height })
    await signIn(page, { plan: 'free', projects: [savedProject()] })
    await go(page, '/projects/stay-put')

    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
    await page.waitForTimeout(SETTLE_MS)
    await expect(page).toHaveURL(/\/projects\/stay-put$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
  })
}

test('an id the account does not have still ends at the workspace', async ({ page }) => {
  watch(page, 'a designer following a link to a project that is gone')
  await signIn(page, { plan: 'free', projects: [savedProject()] })
  await go(page, '/projects/no-such-project')

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
})
