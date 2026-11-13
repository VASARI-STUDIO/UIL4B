// V3 Libraries: the number of tiles a viewer opens is the tier's cap, read from
// the constant, so the cap and the page cannot drift apart. Tiles in the fade
// behind the gate are not counted: they open nothing.
//
// MUTATION this file goes red on: change GALLERY_TIER_LIMITS.anonymous without
// the page (or the page without it): the count goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTES = ['/discover/palettes', '/discover/gradients']
const OPEN_TILES = 'button[aria-label^="Preview "]:not([data-gate-fade] *)'

for (const route of ROUTES) {
  test(`${route}: signed out opens exactly the anonymous cap`, async ({ page }) => {
    watch(page, `a signed-out visitor counting the open tiles on ${route}`)
    await go(page, route)
    await expect(page.locator('[data-gate-fade]')).toHaveCount(1)
    await expect(page.locator(OPEN_TILES)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
  })

  test(`${route}: a free account opens exactly the free cap`, async ({ page }) => {
    watch(page, `a free member counting the open tiles on ${route}`)
    await signIn(page, { plan: 'free' })
    await go(page, route)
    await expect(page.locator('[data-gate-fade]')).toHaveCount(1)
    await expect(page.locator(OPEN_TILES)).toHaveCount(GALLERY_TIER_LIMITS.free)
  })
}
