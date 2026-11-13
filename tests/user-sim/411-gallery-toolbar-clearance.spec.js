// V3 Libraries: after a filter change the page keeps the results heading below
// the sticky toolbar. Choosing a filter from a scrolled page left the H1 hidden
// under the toolbar tray.
//
// MUTATION this file goes red on: drop the scroll-margin rule or the scroll
// after a filter change in the gallery pages: the heading box lands under the
// toolbar and the assertion goes red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { pickGradientType } from './gallery-filter-helpers.js'

for (const vp of [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]) {
  test.describe(`toolbar clearance at ${vp.name}`, () => {
    test.use(vp.use)

    test('choosing Radial from a scrolled page leaves the results heading clear of the toolbar', async ({ page }) => {
      watch(page, 'a visitor scrolling the gradient library and then filtering')
      await go(page, '/discover/gradients')
      await page.evaluate(() => window.scrollTo(0, 600))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
      await pickGradientType(page, 'Radial')
      const heading = page.locator('#grg-grid-heading')
      const toolbar = page.locator('.lbry-toolbar').first()
      await expect.poll(async () => {
        const h = await heading.boundingBox()
        const t = await toolbar.boundingBox()
        return h && t ? Math.round(h.y - (t.y + t.height)) : -9999
      }, { timeout: 5000, message: 'the heading sits at or below the toolbar' }).toBeGreaterThanOrEqual(0)
    })
  })
}
