// THE PROJECT-MISSING PAGE: a signed-in person follows a link to a project that
// is not in their account.
//
// It is a page, not a redirect: the address stays the one they were sent, the
// heading takes focus, and the words are the same whether the project was
// deleted or belongs to someone else, so they do not reveal which. The ways on
// are the workspace (the one pill), the homepage and the help centre, and the
// account's own projects when it has any, so the visit still ends somewhere useful.
//
// The waiting state and the signed-out path are in 123-project-deep-link.spec.js.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In ProjectMissing.jsx drop the `below` block or point "Open your workspace" at
// another route: the recent-projects and workspace tests fail. Make
// ProjectLinkGone return <Navigate to="/projects" replace />: every test fails at
// the first heading.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const TITLE = 'That project isn’t in your account'

function savedProject(id, name) {
  return {
    id,
    name,
    design: { palette: { colors: ['#101010', '#F0F0F0'] } },
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
  }
}

const heading = (page) => page.getByRole('heading', { level: 1, name: TITLE })
const workspace = (page) => page.getByRole('link', { name: 'Open your workspace' })
const home = (page) => page.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Back to the homepage' })
const help = (page) => page.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Help centre' })

for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
  test.describe(`the project-missing page at ${label}`, () => {
    test.use({ viewport: size })

    test('stays on the address they were sent, takes focus, and reads plainly', async ({ page }) => {
      watch(page, 'a designer opening a project link that is not theirs')
      await signIn(page, { plan: 'free', projects: [savedProject('p1', 'Autumn Rebrand')] })
      await go(page, '/projects/not-a-project')

      await expect(heading(page)).toBeVisible()
      await expect(heading(page), 'a screen reader should start at the problem').toBeFocused()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page).toHaveURL(/\/projects\/not-a-project$/)
      await expect(page).toHaveTitle(/^UI L4B/)
      await expect(page.getByText('It may have been deleted, here or on another device.')).toBeVisible()
      await expect(page.getByText('Your other projects are saved.')).toBeVisible()
      await expect(workspace(page)).toHaveAttribute('href', '/projects')
      await expect(home(page)).toHaveAttribute('href', '/')
      await expect(help(page)).toHaveAttribute('href', '/learn/help')
    })

    test('lists the account\'s own projects, and one of them opens', async ({ page }) => {
      watch(page, 'a designer who mistyped a project link')
      await signIn(page, { plan: 'free', projects: [savedProject('p1', 'Autumn Rebrand')] })
      await go(page, '/projects/not-a-project')
      await expect(heading(page)).toBeVisible()

      await expect(page.getByRole('heading', { level: 2, name: 'Your recent projects' })).toBeVisible()
      const row = page.getByRole('navigation', { name: 'Your recent projects' }).getByRole('link', { name: /Autumn Rebrand/ })
      await expect(row).toBeVisible()
      await row.click()
      await expect(page).toHaveURL(/\/projects\/p1$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Autumn Rebrand' })).toBeVisible()
    })

    test('an account with no projects shows no empty list', async ({ page }) => {
      watch(page, 'a new designer opening a project link')
      await signIn(page, { plan: 'free', projects: [] })
      await go(page, '/projects/not-a-project')
      await expect(heading(page)).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Your recent projects' })).toHaveCount(0)
    })

    test('Open your workspace goes to the workspace and the homepage link goes home', async ({ page }) => {
      watch(page, 'a designer leaving the project-missing page')
      await signIn(page, { plan: 'free', projects: [savedProject('p1', 'Autumn Rebrand')] })
      await go(page, '/projects/not-a-project/export')
      await expect(heading(page)).toBeVisible()
      await workspace(page).click()
      await expect(page).toHaveURL(/\/projects$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()

      await go(page, '/projects/not-a-project')
      await expect(heading(page)).toBeVisible()
      await home(page).click()
      // A signed-in visitor at the homepage is sent on to their workspace.
      await expect(page).toHaveURL(/\/(projects)?$/)
      await expect(heading(page)).toHaveCount(0)
    })
  })
}

test('the keyboard walks from the heading through every way on', async ({ page }) => {
  watch(page, 'a keyboard user opening a project link that is not theirs')
  await signIn(page, { plan: 'free', projects: [savedProject('p1', 'Autumn Rebrand')] })
  await go(page, '/projects/not-a-project')
  await expect(heading(page)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(workspace(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(home(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(help(page)).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(workspace(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/projects$/)
})
