// Community (/community) is findable: it is a row in the Discover menu on a
// desktop and on a phone, a card on the /discover hub, and a result in site
// search for the words a visitor would type. Each of these was missing while
// the row was parked as Soon.
//
// The footer is deliberately not covered: /community is an app page like the
// libraries beside it, and the site footer stays off app pages
// (src/components/nav/footerRoutes.js).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

test.describe('Community is findable from Discover', () => {
  test('the Discover menu lists Community at 1440', async ({ page }) => {
    watch(page, 'a visitor looking for the community page in the Discover menu')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Discover', exact: true }).click()
    const menu = page.getByRole('region', { name: 'Discover menu' })
    await expect(menu).toBeVisible()
    // POSITIVE CONTROL: a library row is in the same menu.
    await expect(menu.locator('a:not(.pnav-reco-link)', { hasText: 'Palette Library' })).toBeVisible()
    const row = menu.locator('a.pnav-tool', { hasText: 'Community' })
    await expect(row).toHaveCount(1)
    await expect(row).toHaveAttribute('href', '/community')
    await expect(row.locator('.soon-badge')).toHaveCount(0)
  })

  test('the 390 phone menu lists Community as a 44px target', async ({ page }) => {
    watch(page, 'a phone visitor looking for the community page')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Menu' }).first().click()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: /Discover/ }).first().click()
    const link = sheet.locator('a.pnav-acc-link[href="/community"]')
    await expect(link).toBeVisible()
    await expect(link).toContainText('Community')
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44)
  })

  test('the /discover hub links to Community', async ({ page }) => {
    watch(page, 'a visitor on the Discover hub')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover')
    // POSITIVE CONTROL: a library card is on the hub.
    await expect(page.locator('main a[href="/discover/palettes"]').first()).toBeVisible()
    const card = page.locator('main a.surface-card--link[href="/community"]')
    await expect(card).toHaveCount(1)
    await expect(card.locator('.surface-card-title')).toHaveText('Community')
    await card.click()
    await expect(page).toHaveURL((url) => url.pathname === '/community')
  })

  for (const word of ['community', 'inspiration', 'submit']) {
    test(`site search for "${word}" finds Community`, async ({ page }) => {
      watch(page, `a visitor searching for ${word}`)
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, '/discover')
      await page.locator('.pnav-search-field').click()
      const input = page.locator('.cp-input')
      await expect(input).toBeVisible()
      await input.fill(word)
      await expect(page.locator('.cp-empty')).toHaveCount(0)
      const hit = page.locator('.cp-item', { hasText: 'Community' }).first()
      await expect(hit).toBeVisible()
      await hit.click()
      await expect(page).toHaveURL((url) => url.pathname === '/community')
    })
  }
})
