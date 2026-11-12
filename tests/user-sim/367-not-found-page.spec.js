// THE 404: someone follows a link that leads nowhere.
//
// What they need is to be told in plain words, to keep the address they were
// sent (so they can see the typo), and to leave by a route that fits who they
// are: the homepage when signed out, their workspace when signed in, and the
// pages the site really has. A link into a section (Learn, Create, Discover)
// gets that section's own pages. The focus rules, the report link and the 320
// layout are in 224-error-recovery-cards.spec.js.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In NotFound.jsx swap the signed-in and signed-out pills, drop the
// `document.title` effect, or make sectionSuggestions() return startRows() for
// every path: the matching tests below fail. Put the old
// <Navigate to="/" replace /> back in App.jsx: every test fails at the heading.
import { test, expect } from './base.js'
import { go, goRaw, signIn, watch } from './helpers.js'
import { pushInApp } from './edge-cards.js'

const HEADING = 'That page doesn’t exist'

const heading = (page) => page.getByRole('heading', { level: 1, name: HEADING })
const suggestions = (page) => page.getByRole('navigation', { name: 'Suggested pages' })
const trail = (page) => page.getByRole('navigation', { name: 'More ways back' })
const homePill = (page) => page.getByRole('link', { name: 'Back to the homepage' })
const workspacePill = (page) => page.getByRole('link', { name: 'Open your workspace' })
const sitemap = (page) => page.getByRole('link', { name: 'See every page' })
const report = (page) => trail(page).getByRole('link', { name: 'Report a broken link' })
const help = (page) => trail(page).getByRole('link', { name: 'Help centre' })

function savedProject(id, name) {
  return {
    id,
    name,
    design: { palette: { colors: ['#101010', '#F0F0F0'] } },
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
  }
}

for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
  test.describe(`the 404 at ${label}, signed out`, () => {
    test.use({ viewport: size })

    test('keeps the address, names it, and has its own title', async ({ page }) => {
      watch(page, 'a visitor following a mistyped link')
      await goRaw(page, '/plan-s')

      await expect(heading(page)).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page).toHaveURL(/\/plan-s$/)
      await expect(page).toHaveTitle('UI L4B | Page not found')
      await expect(page.locator('.ed-body'), 'the page names the address that failed').toContainText('/plan-s')
      await expect(page.locator('.ed-body')).toContainText('It may have moved, or the link may have been mistyped.')
    })

    test('offers the homepage, every page, and the report and help links, and no workspace', async ({ page }) => {
      watch(page, 'a signed-out visitor on a dead link')
      await goRaw(page, '/plan-s')
      await expect(heading(page)).toBeVisible()

      await expect(homePill(page)).toHaveAttribute('href', '/')
      await expect(sitemap(page)).toHaveAttribute('href', '/sitemap')
      await expect(report(page)).toHaveAttribute('href', /^\/feedback\?type=bug&page=%2Fplan-s/)
      await expect(help(page)).toHaveAttribute('href', '/learn/help')
      await expect(workspacePill(page), 'a signed-out visitor has no workspace to open').toHaveCount(0)
    })

    test('suggests real tools, and one of them opens', async ({ page }) => {
      watch(page, 'a visitor choosing a page from the 404')
      await goRaw(page, '/plan-s')
      await expect(heading(page)).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Start with a tool' })).toBeVisible()

      const rows = suggestions(page).getByRole('link')
      expect(await rows.count(), 'the suggestions list should have more than one page').toBeGreaterThan(1)
      const href = await rows.first().getAttribute('href')
      expect(href).toMatch(/^\/[a-z]/)
      await rows.first().click()
      await expect(page).toHaveURL(new RegExp(`${href}$`))
      await expect(heading(page), 'a suggested page must not be another 404').toHaveCount(0)
    })

    test('Back to the homepage goes home and See every page opens the sitemap', async ({ page }) => {
      watch(page, 'a visitor leaving the 404')
      await goRaw(page, '/plan-s')
      await expect(heading(page)).toBeVisible()
      await sitemap(page).click()
      await expect(page).toHaveURL(/\/sitemap$/)
      await expect(heading(page)).toHaveCount(0)

      await goRaw(page, '/plan-s')
      await expect(heading(page)).toBeVisible()
      await homePill(page).click()
      await expect(page).toHaveURL(/\/$/)
      await expect(heading(page)).toHaveCount(0)
    })
  })
}

test.describe('the 404 inside a section', () => {
  for (const [path, title, line, prefix] of [
    ['/learn/not-a-guide', 'Start with a guide', 'That link was for a Learn guide. These are the guides.', /^\/learn\//],
    ['/create/not-a-tool', 'Start with a tool', 'That link was for a Create tool. These are the tools.', /^\/create\//],
    ['/discover/not-a-library', 'Start with a library', 'That link was for a Discover library. These are the libraries.'],
  ]) {
    test(`${path} suggests that section's own pages`, async ({ page }) => {
      watch(page, 'a visitor with a dead link into a section')
      await goRaw(page, path)
      await expect(heading(page)).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible()
      await expect(page.getByText(line)).toBeVisible()
      const hrefs = await suggestions(page).getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('href')))
      expect(hrefs.length).toBeGreaterThan(0)
      // Learn and Create list pages under their own prefix; the Discover libraries
      // live at their own routes, so they are told apart by their "Library" label.
      if (prefix) {
        for (const href of hrefs) expect(href, 'a section suggestion left its section').toMatch(prefix)
      } else {
        await expect(suggestions(page).getByText('Library', { exact: true })).toHaveCount(hrefs.length)
      }
    })
  }
})

test.describe('the 404, signed in', () => {
  test('offers the workspace instead of the homepage pill, and lists their projects', async ({ page }) => {
    watch(page, 'a designer on a dead link')
    await signIn(page, { plan: 'free', projects: [savedProject('p1', 'Autumn Rebrand')] })
    await go(page, '/plan-s')
    await expect(heading(page)).toBeVisible()

    await expect(workspacePill(page)).toHaveAttribute('href', '/projects')
    await expect(sitemap(page)).toHaveAttribute('href', '/sitemap')
    await expect(trail(page).getByRole('link', { name: 'Back to the homepage' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('heading', { level: 2, name: 'Your recent projects' })).toBeVisible()
    const row = page.getByRole('navigation', { name: 'Your recent projects' }).getByRole('link', { name: /Autumn Rebrand/ })
    await row.click()
    await expect(page).toHaveURL(/\/projects\/p1$/)
  })

  test('an account with no projects is not shown an empty list', async ({ page }) => {
    watch(page, 'a new designer on a dead link')
    await signIn(page, { plan: 'free', projects: [] })
    await go(page, '/plan-s')
    await expect(heading(page)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Your recent projects' })).toHaveCount(0)
    await expect(page.getByText('Projects you save from a tool appear in your workspace.')).toBeVisible()
    await workspacePill(page).click()
    await expect(page).toHaveURL(/\/projects$/)
  })
})

test('the keyboard reaches every way on, in reading order', async ({ page }) => {
  watch(page, 'a keyboard user on a dead link')
  await go(page, '/privacy')
  await pushInApp(page, '/plan-s')
  await expect(heading(page)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(homePill(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(sitemap(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(report(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(help(page)).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(homePill(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/$/)
})
