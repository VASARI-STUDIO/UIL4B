// The Prompt Library (/discover/prompts) is parked: admins can open it, nobody
// else can, and nothing public points at it. The Community row, which is open,
// is held in the second block at the foot of this file.
//
// Three things are held here, each from the visitor's side:
//   1. a signed-out visitor who types or follows the URL sees the not-found page;
//   2. the Discover menu does not list the library;
//   3. the sitemap does not advertise it.
// An admin still gets the page, so the gate is shown to be a gate and not a
// route that has been deleted.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const ROUTE = '/discover/prompts'

test.describe('the parked Prompt Library', () => {
  test('a signed-out visitor to /discover/prompts sees the not-found page at that address', async ({ page }) => {
    watch(page, 'a signed-out visitor following an old Prompt Library link')
    await go(page, ROUTE)
    await expect(page).toHaveURL((url) => url.pathname === ROUTE)
    await expect(page).toHaveTitle('UI L4B | Page not found')
    await expect(page.locator('.pl-toolbar, .pl-gallery, .pl-search')).toHaveCount(0)
  })

  test('the Discover menu has no Prompt Library link', async ({ page }) => {
    watch(page, 'a visitor opening the Discover menu')
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Discover', exact: true }).click()
    const menu = page.getByRole('region', { name: 'Discover menu' })
    await expect(menu).toBeVisible()
    // POSITIVE CONTROL: the menu has links in it, so an empty match below is
    // the library being absent rather than the menu being empty. The suggested
    // gallery at the top of the menu can also be the Palette Library, so the
    // control reads the menu's own row.
    await expect(menu.locator('a:not(.pnav-reco-link)', { hasText: 'Palette Library' })).toBeVisible()
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

// The Discover Community row is the opposite case: it points at /community, a
// public page, and the row is open. Held here so the Prompt Library's parking
// above is shown not to have swept it up with it:
//   1. the Discover menu lists Community under its Inspiration column;
//   2. /sitemap lists it;
//   3. /community is a public page and is in sitemap.xml;
//   4. an admin sees the row too, with no Soon badge.
test.describe('the open Community row', () => {
  test('the Discover menu lists Community, with no Soon badge', async ({ page }) => {
    watch(page, 'a visitor opening the Discover menu')
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Discover', exact: true }).click()
    const menu = page.getByRole('region', { name: 'Discover menu' })
    await expect(menu).toBeVisible()
    // POSITIVE CONTROL: the menu still has its other column and links.
    await expect(menu.locator('a:not(.pnav-reco-link)', { hasText: 'Palette Library' })).toBeVisible()
    await expect(menu.locator('.pnav-col-label', { hasText: 'Browse' })).toHaveCount(1)
    const row = menu.locator('[data-row-id="inspiration"]')
    await expect(row).toHaveCount(1)
    await expect(row).toHaveAttribute('href', '/community')
    await expect(row.locator('.soon-badge')).toHaveCount(0)
  })

  test('/sitemap lists Community in the Discover column', async ({ page }) => {
    watch(page, 'a visitor on the visual sitemap')
    await go(page, '/sitemap')
    const discover = page.locator('[data-sitemap-section="discover"]')
    // POSITIVE CONTROL: the Discover column rendered with a live row in it.
    await expect(discover.locator('a:not(.pnav-reco-link)', { hasText: 'Palette Library' })).toBeVisible()
    await expect(discover.locator('[data-route="/community"]')).toHaveCount(1)
  })

  test('/community stays public and in sitemap.xml', async ({ page, request }) => {
    watch(page, 'a signed-out visitor following a Community link')
    await go(page, '/community')
    await expect(page).toHaveURL((url) => url.pathname === '/community')
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBe(true)
    expect(await res.text()).toContain('/community')
  })

  test('an admin sees the row with no Soon badge', async ({ page }) => {
    watch(page, 'the site owner opening the Discover menu')
    await signIn(page, { admin: true })
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Discover', exact: true }).click()
    const menu = page.getByRole('region', { name: 'Discover menu' })
    const row = menu.locator('[data-row-id="inspiration"]')
    await expect(row).toHaveCount(1)
    await expect(row.locator('.soon-badge')).toHaveCount(0)
  })
})
