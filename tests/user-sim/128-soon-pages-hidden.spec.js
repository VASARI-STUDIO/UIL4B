// PAGES FLAGGED `soon` ARE HIDDEN FROM EVERYONE BUT ADMINS.
//
// Signed out (and signed in as anyone off the owner allowlist) there is no sign
// of an unfinished page: not in the mega menu, the footer or /sitemap, and its
// URL redirects to the nearest live page. An admin still sees the menu row with
// its Soon badge and can open the page. The soon tool is read from the tool
// index (toolTree.js's own flag), never named here.
import { test, expect } from './base.js'
import { go, goRaw, signIn, watch } from './helpers.js'
import { TOOL_ENTRIES } from '../../src/data/toolIndex.js'
import { soonRedirect } from '../../src/data/toolTree.js'

const SOON = TOOL_ENTRIES.filter((t) => t.soon && t.path.startsWith('/create/'))
const SOON_TOOL = SOON[0]
const SOON_ROUTES = SOON.map((t) => t.path)
const TARGET = soonRedirect(SOON_TOOL.path)

test('the fixture is not vacuous: the tool index has a soon tool with a redirect target', () => {
  expect(SOON.length).toBeGreaterThan(0)
  expect(TARGET).toBeTruthy()
  expect(soonRedirect(TARGET), 'the redirect target is itself soon').toBeNull()
})

const pathOf = (page) => new URL(page.url()).pathname

for (const width of [390, 1440]) {
  test.describe(`signed out at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('the soon URL redirects to a live page', async ({ page }) => {
      watch(page, 'visitor following an old link to an unfinished tool')
      await goRaw(page, SOON_TOOL.path)
      await expect.poll(() => pathOf(page)).not.toBe(SOON_TOOL.path)
      await expect.poll(() => pathOf(page)).not.toMatch(/^\/create\/(components|box-shadow|component-designer|ai-prompt|landing-prompts)$/)
      await expect(page.getByText(/still in the workshop/i)).toHaveCount(0)
      expect(['/create', TARGET]).toContain(pathOf(page).replace(/^\/create\/palette$/, '/create'))
    })

    test('the footer and /sitemap list no soon page', async ({ page }) => {
      watch(page, 'visitor looking for what is available')
      await go(page, '/sitemap')
      await expect(page.locator('.spt-soon, [data-soon]')).toHaveCount(0)
      await expect(page.locator('li[data-route]').first()).toBeVisible()
      await expect(page.locator('.app-footer-soon-link, .sp-footer [data-soon]')).toHaveCount(0)
      for (const route of SOON_ROUTES) {
        await expect(page.locator(`li[data-route="${route}"]`)).toHaveCount(0)
        await expect(page.locator(`.app-footer a[href="${route}"], .sp-footer a[href="${route}"]`)).toHaveCount(0)
      }
    })
  })
}

test.describe('signed out, desktop menu', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('no section of the mega menu has a soon row', async ({ page }) => {
    watch(page, 'visitor opening every menu')
    await go(page, '/discover')
    for (const name of ['Create', 'Discover', 'Learn']) {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(page.getByRole('region', { name: `${name} menu` })).toBeVisible()
      await expect(page.locator('#pnav-mega .pnav-tool').first()).toBeVisible()
      await expect(page.locator('#pnav-mega [data-soon], #pnav-mega .soon-badge')).toHaveCount(0)
      for (const route of SOON_ROUTES) {
        await expect(page.locator(`#pnav-mega a[href="${route}"]`)).toHaveCount(0)
      }
      await page.keyboard.press('Escape')
    }
  })
})

test.describe('admin', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('sees the Soon badge in the menu and can open the soon page', async ({ page }) => {
    watch(page, 'admin checking unfinished work')
    await signIn(page, { admin: true })
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Create menu' })).toBeVisible()
    const row = page.locator(`#pnav-mega a.pnav-tool[href="${SOON_TOOL.path}"]`)
    await expect(row).toHaveAttribute('data-soon', 'true')
    await expect(row.locator('.soon-badge')).toHaveText(/soon/i)
    await page.keyboard.press('Escape')

    await goRaw(page, SOON_TOOL.path)
    await expect(page.getByText(/still in the workshop/i)).toBeVisible()
    expect(pathOf(page)).toBe(SOON_TOOL.path)
  })

  test('sees the soon page on /sitemap, badged and not a link', async ({ page }) => {
    watch(page, 'admin reading the map')
    await signIn(page, { admin: true })
    await go(page, '/sitemap')
    const row = page.locator(`li[data-route="${SOON_TOOL.path}"]`)
    await expect(row).toHaveCount(1)
    await expect(row).toHaveAttribute('data-soon', 'true')
    await expect(row.locator('.spt-soon')).toHaveText(/soon/i)
    await expect(row.locator('a')).toHaveCount(0)
    await expect(row.locator('div.spt-row')).toHaveCount(1)

    // No Soon row anywhere on the map is a link.
    await expect(page.locator('li[data-soon="true"]').first()).toBeVisible()
    await expect(page.locator('li[data-soon="true"] a')).toHaveCount(0)
  })
})
