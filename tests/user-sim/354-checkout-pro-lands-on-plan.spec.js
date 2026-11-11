// A Pro account that opens /checkout from an old link is sent to Settings and told
// why (spec 341). It lands on Plan and billing, the section that answer points at,
// not on whichever section Settings opens by default.
//
// MUTATION: drop `state: { section: 'support' }` from the already-Pro navigate in
// Checkout.jsx and both tests fail: Settings opens on its default section.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

for (const [w, h] of [[1440, 900], [390, 844]]) {
  test(`${w}px: a Pro account on /checkout lands on Plan and billing`, async ({ page }) => {
    watch(page, 'a Pro subscriber following an old checkout link')
    await page.setViewportSize({ width: w, height: h })
    await signIn(page, { plan: 'pro' })
    await go(page, '/checkout?plan=monthly')
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.locator('.toast.show').filter({ hasText: /already on Pro/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Plan and billing' })).toBeVisible()
  })
}
