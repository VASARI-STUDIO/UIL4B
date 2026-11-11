// /SITEMAP FITS A PHONE AND LINES UP ON A WIDE SCREEN.
//
// On a phone the row's arrow is gone so the text beside the plate has room, and the
// lede's jump links each have a 44px touch strip. At every width the row rules are
// square (a radius curled their ends), and at 1440 the heading starts where the
// sections do.
//
// MUTATIONS (each one turns a test below red):
//   the arrow stays at 390                 -> "on a phone"
//   the jump links lose their touch strip  -> "on a phone"
//   rows keep border-radius 12px           -> "square row rules"
//   .spm-intro keeps max-width 1460px      -> "lines up at 1440"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the rows drop the arrow and the jump links are 44px targets', async ({ page }) => {
    watch(page, 'a visitor browsing the site map on a phone')
    await go(page, '/sitemap')
    const row = page.locator('.spt-sitemap .spt-row:not(.spt-row--text)').first()
    await expect(row).toBeVisible()
    await expect(row.locator('.spt-row-go')).toBeHidden()
    // The text column takes the room the arrow had: at least 220px beside a 112px plate.
    const text = await row.locator('.spt-row-text').boundingBox()
    expect(text.width).toBeGreaterThanOrEqual(220)

    const links = page.locator('.spt-sitemap .spm-lede a')
    await expect(links).toHaveCount(3)
    for (const a of await links.all()) {
      const strip = await a.evaluate((el) => parseFloat(getComputedStyle(el, '::after').height))
      expect(strip, 'a 44px touch strip').toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('square row rules, and the heading lines up with the sections', async ({ page }) => {
    watch(page, 'a visitor browsing the site map on a laptop')
    await go(page, '/sitemap')
    const row = page.locator('.spt-sitemap .spt-row').first()
    await expect(row).toBeVisible()
    expect(await row.evaluate((el) => getComputedStyle(el).borderTopLeftRadius), 'square row rules').toBe('0px')
    const h1 = await page.locator('.spt-sitemap .spm-intro h1').boundingBox()
    const h2 = await page.locator('.spt-sitemap .spt-section .spt-h2').first().boundingBox()
    expect(Math.abs(h1.x - h2.x), 'lines up at 1440').toBeLessThanOrEqual(1)
  })
})
