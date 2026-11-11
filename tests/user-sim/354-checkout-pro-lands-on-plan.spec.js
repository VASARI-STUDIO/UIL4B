// A Pro account that opens /checkout from an old link has nothing to buy. It lands
// on Settings, open at Plan and billing, and a toast says why it is there.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const WHY = 'You’re already on Pro, so there’s nothing to buy. Your plan is here.'

for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const path of ['/checkout', '/checkout?plan=monthly', '/checkout?plan=yearly']) {
    test(`${w}px: Pro on ${path} lands on Plan and billing and is told why`, async ({ page }) => {
      watch(page, 'a Pro subscriber following an old checkout link')
      await page.setViewportSize({ width: w, height: h })
      await signIn(page, { plan: 'pro' })
      await go(page, path)
      await expect(page).toHaveURL(/\/settings$/)
      await expect(page.locator('.toast.show')).toHaveText(WHY)
      await expect(page.getByRole('heading', { name: 'Plan and billing' })).toBeVisible()
    })
  }
}

test('a free account on /checkout stays there and sees no such toast', async ({ page }) => {
  watch(page, 'a free account about to pay')
  await signIn(page, { plan: 'free' })
  await go(page, '/checkout?plan=monthly')
  await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
  await expect(page.locator('.toast.show')).toHaveCount(0)
})
