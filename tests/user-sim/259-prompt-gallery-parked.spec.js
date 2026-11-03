// The Prompt Library (/discover/prompts) is parked: admins can open it, nobody
// else can, and nothing public points at it.
//
// Three things are held here, each from the visitor's side:
//   1. a signed-out visitor who types or follows the URL ends on the homepage;
//   2. the Discover menu does not list the library;
//   3. the sitemap does not advertise it.
// An admin still gets the page, so the gate is shown to be a gate and not a
// route that has been deleted.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const ROUTE = '/discover/prompts'

test.describe('the parked Prompt Library', () => {
  test('a signed-out visitor to /discover/prompts ends on the homepage', async ({ page }) => {
    watch(page, 'a signed-out visitor following an old Prompt Library link')
    await go(page, ROUTE)
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await expect(page.locator('.pl-toolbar, .pl-gallery, .pl-search')).toHaveCount(0)
  })

  test('the Discover menu has no Prompt Library link', async ({ page }) => {
    watch(page, 'a visitor opening the Discover menu')
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Discover', exact: true }).click()
    const menu = page.getByRole('region', { name: 'Discover menu' })
    await expect(menu).toBeVisible()
    // POSITIVE CONTROL: the menu has links in it, so an empty match below is
    // the library being absent rather than the menu being empty.
    await expect(menu.getByRole('link', { name: /Palette Library/ })).toBeVisible()
    await expect(menu.getByRole('link', { name: /Prompt/i })).toHaveCount(0)
    await expect(menu.locator(`a[href="${ROUTE}"]`)).toHaveCount(0)
  })

  test('the Discover index does not list it', async ({ page }) => {
    watch(page, 'a visitor on the Discover index')
    await go(page, '/discover')
    await expect(page.locator('main a[href*="/discover/palettes"]').first()).toBeVisible()
    await expect(page.locator(`main a[href="${ROUTE}"]`)).toHaveCount(0)
  })

  test('sitemap.xml does not advertise it', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBe(true)
    const xml = await res.text()
    // POSITIVE CONTROL: a sibling Discover page is still there.
    expect(xml).toContain('/discover/palettes')
    expect(xml).not.toContain(ROUTE)
  })

  test('an admin still opens the library', async ({ page }) => {
    watch(page, 'the site owner opening the parked Prompt Library')
    await signIn(page, { admin: true })
    await go(page, ROUTE)
    await expect(page).toHaveURL((url) => url.pathname === ROUTE)
    await expect(page.locator('.pl-search, .pl-toolbar').first()).toBeVisible({ timeout: 20000 })
  })
})
