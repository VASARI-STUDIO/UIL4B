// A PRO ACCOUNT OPENING /checkout IS TOLD WHY IT LANDS ON SETTINGS.
//
// /checkout has nothing to sell an account that is already on Pro, so it sends
// them to /settings. That used to happen without a word, so an old link looked
// like a page that had broken. The redirect now says why, through the app's one
// toast. A Free account still gets the checkout and no such line.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In Checkout.jsx delete the window.dispatchEvent(...) line in the already-Pro
// effect: the Pro tests lose the line. Delete the effect's navigate('/settings')
// and the Pro tests stay on /checkout.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const ALREADY_PRO = /already on Pro/

for (const url of ['/checkout', '/checkout?plan=yearly', '/checkout?plan=bogus']) {
  test(`a Pro account opening ${url} lands on Settings and is told it is already on Pro`, async ({ page }) => {
    watch(page, 'a Pro account following an old checkout link')
    await signIn(page, { plan: 'pro' })
    await go(page, url)

    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('.toast.show').filter({ hasText: ALREADY_PRO }), 'the redirect said nothing').toBeVisible()
  })
}

test('a Free account opening /checkout stays there and is not told it is on Pro', async ({ page }) => {
  watch(page, 'a Free account opening checkout')
  await signIn(page, { plan: 'free' })
  await go(page, '/checkout?plan=yearly')

  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.locator('.toast').filter({ hasText: ALREADY_PRO })).toHaveCount(0)
})
