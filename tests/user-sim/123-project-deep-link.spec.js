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

// ── A LINK THAT CANNOT OPEN SAYS WHY ────────────────────────────────────────
//
// Signed in, the link stays at its own address and a page says the project is
// not in the account, in words that do not say whether it exists for someone
// else. Signed out, it goes to sign-in and, once they are in, to the project.
// Signing out from the project page itself is the visitor's own choice and goes
// to the workspace with nothing said.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In ProjectLinkGone.jsx return <Navigate to="/projects" replace /> for every
// case: the first two tests lose the page and land on /projects, and the
// signed-out ones stop at /projects.
const GONE_TITLE = /That project isn.t in your account/
const gonePage = (page) => page.getByRole('heading', { level: 1, name: GONE_TITLE })

for (const path of ['/projects/not-a-project', '/projects/not-a-project/export']) {
  test(`an unknown project link ${path.endsWith('export') ? '(export) ' : ''}stays put and says the project is not in the account once the account has answered`, async ({ page }) => {
    watch(page, 'a designer following a link to a project that does not exist')
    await freshDevice(page)
    await go(page, path)

    // Not bounced while the account is still being read.
    await expect(page.getByText('Opening your project…')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${path}$`))

    await expect(gonePage(page), 'the account answered and the page said nothing').toBeVisible({ timeout: HOLD_MS + 8000 })
    await expect(page.getByText('It may have been deleted, here or on another device.')).toBeVisible()
    await expect(page, 'the link in the bar must stay the one they were sent').toHaveURL(new RegExp(`${path}$`))

    await page.getByRole('link', { name: 'Open your workspace' }).click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
  })
}

for (const suffix of ['', '/export']) {
  test(`a signed-out project link${suffix ? ' (export)' : ''} goes to sign-in and back to the project once they are in`, async ({ page }) => {
    watch(page, 'someone opening an emailed project link while signed out')
    await signIn(page, { plan: 'free', lateSignIn: true, projects: [remoteProject('p1', 'Autumn Rebrand')] })
    await go(page, `/projects/p1${suffix}`)

    await expect.poll(() => new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
    await expect(gonePage(page), 'a signed-out visitor was told the project is not in their account').toHaveCount(0)

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow())
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe(`/projects/p1${suffix}`)
    if (!suffix) await expect(page.getByRole('heading', { level: 1, name: 'Autumn Rebrand' })).toBeVisible()
  })
}

test('signing out from a project page goes to the workspace, not to sign-in, and says nothing', async ({ page }) => {
  watch(page, 'a designer signing out while a project is open')
  await signIn(page, { plan: 'free', projects: [remoteProject('p1', 'Autumn Rebrand')] })
  await go(page, '/projects/p1')
  await expect(page.getByRole('heading', { level: 1, name: 'Autumn Rebrand' })).toBeVisible()

  await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signOutNow())
  await expect(page).toHaveURL(/\/projects$/)
  await expect(gonePage(page), 'signing out was met with a project-not-found page').toHaveCount(0)
})
