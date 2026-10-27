// A SAVED PROJECT'S OWN ADDRESS STAYS THE PROJECT'S ADDRESS.
//
// Opening /projects/:id straight (a bookmark, a reload, a shared link) on a
// signed-in account must settle on that project and stay there, not bounce to
// the workspace a second or two later once the account's projects have loaded.
// The project is checked both ways: seeded on this device, and held only by the
// account (no local copy, the account's read slowed) so the page's wait for the
// account is the thing under test. Each is held past 2s before the URL and
// heading are read, so a late redirect cannot slip through unnoticed.
// An id the account does not have still ends at the workspace (the not-found
// answer), never a blank page.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Dropping the wait in ProjectDetail.jsx (`const unknown = false`, so a missing
// project redirects at once) sends the account-only tests to the workspace
// while the account is still being read. The device-seeded tests do not notice:
// the project is already in the list, so they cannot see the wait.
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

const UID = 'test-uid-free'
const HOLD_MS = 1500

/** Opens the project with this device holding no copy of it: only the account has it, read slowly. */
async function openCloudOnly(page) {
  const project = savedProject()
  await signIn(page, {
    plan: 'free',
    projects: [],
    docs: {
      [`users/${UID}/sync/projects`]: { list: [project], v: 1, _updatedAt: Date.parse(project.updatedAt) },
    },
    slowReads: [{ path: 'sync/projects', ms: HOLD_MS }],
  })
  await go(page, '/projects/stay-put')
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

  test(`a project that only the account has waits for the account and then stays at ${width}`, async ({ page }) => {
    watch(page, 'a designer opening a saved project on a device that has never seen it')
    await page.setViewportSize({ width, height })
    await openCloudOnly(page)

    // The account has not answered yet: the page holds, and the address is the project's.
    await expect(page.locator('.uh-resolving')).toBeVisible()
    await expect(page).toHaveURL(/\/projects\/stay-put$/)

    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' }))
      .toBeVisible({ timeout: HOLD_MS + 8000 })
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
