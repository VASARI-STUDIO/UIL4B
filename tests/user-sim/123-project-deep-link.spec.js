// A PROJECT LINK OPENED ON A DEVICE THAT HAS NEVER SEEN THE ACCOUNT.
//
// /projects/:id used to answer "no such project" from the local list alone. On
// a fresh load that list is empty until the account's projects have been read,
// so a shared or bookmarked link bounced to /projects a moment after it opened.
// The page now waits for the read, shows a loading state, and only then says
// the project is not there.
//
// The account's read is held for HOLD_MS, so the wait is on screen and not a
// read that happened to be quick; the empty local store proves the project can
// only have come from the account.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Restoring `if (!canSaveProjects || !project) return <Navigate ...>` ahead of
// the loading check (or reading `projects` without `projectsLoading`) fails the
// first two tests: the URL is /projects when the account answers.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const UID = 'test-uid-free'
const HOLD_MS = 2500

function remoteProject(id, name) {
  return {
    id,
    name,
    design: { palette: { colors: ['#101010', '#F0F0F0'] } },
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
  }
}

/** A signed-in account whose projects exist only on the account, read slowly. */
async function freshDevice(page) {
  await signIn(page, {
    plan: 'free',
    projects: [],
    docs: {
      [`users/${UID}/sync/projects`]: {
        list: [remoteProject('p1', 'Autumn Rebrand')],
        v: 1,
        _updatedAt: Date.parse('2026-09-05T09:00:00.000Z'),
      },
    },
    slowReads: [{ path: 'sync/projects', ms: HOLD_MS }],
  })
}

for (const width of [390, 1440]) {
  test(`a project link on a fresh device waits for the account and opens the project at ${width}`, async ({ page }) => {
    watch(page, 'a designer opening a shared project link on a new device')
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await freshDevice(page)
    await go(page, '/projects/p1')

    // The account has not answered: a loading state, and the link is still the link.
    await expect(page.locator('.uh-resolving')).toBeVisible()
    await expect(page).toHaveURL(/\/projects\/p1$/)
    expect(await page.evaluate(() => localStorage.getItem('vs-projects') || '{}')
      .then((raw) => JSON.parse(raw))).toEqual({})

    // Then the project, on the same address.
    await expect(page.getByRole('heading', { level: 1, name: 'Autumn Rebrand' })).toBeVisible({ timeout: HOLD_MS + 8000 })
    await expect(page).toHaveURL(/\/projects\/p1$/)
  })
}

test('an unknown project id still ends at the workspace once the account has answered', async ({ page }) => {
  watch(page, 'a designer following a link to a project that does not exist')
  await freshDevice(page)
  await go(page, '/projects/not-a-project')

  // Not bounced while the account is still being read.
  await expect(page.locator('.uh-resolving')).toBeVisible()
  await expect(page).toHaveURL(/\/projects\/not-a-project$/)

  await expect(page).toHaveURL(/\/projects$/, { timeout: HOLD_MS + 8000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
})
