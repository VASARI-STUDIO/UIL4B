// A visitor on a marketing page who wants to pay for Pro: every route to /plans
// ends at the Pro button, and a signed-out press starts the login popup with the
// checkout kept for afterwards. 99-pricing-screen.spec.js owns the page itself;
// this file owns the way there.
//
//   · home hero "View plans" and the /tools closing "See the plans" both land on /plans
//   · the nav's Plans link names the screen it leads to
//   · signed out, the Pro button opens the login popup over /plans and remembers /checkout
//   · signed in, the same journey goes straight to /checkout
//   · the free tier's button goes to the toolkit, not to a payment
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-US' })

const PERSONA = 'a visitor on the sales pages who wants Pro'

const LIVE = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { usd: 7 },
  yearly: { usd: 48 },
}
const stubPrices = (page) => page.route('**/api/get-prices*', (route) => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(LIVE)),
}))
const proCta = (page) => page.locator('.hpl-pro .pa-cta').locator('a, button').first()

test.describe('reaching /plans from the marketing pages', () => {
  test('the home hero "View plans" opens the plans page', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await stubPrices(page)
    await go(page, '/')
    await page.locator('.hh-ghost', { hasText: 'View plans' }).click()
    await expect(page).toHaveURL(/\/plans$/)
    await expectRendered(page)
    await expect(page.locator('.hpl-pro')).toBeVisible()
  })

  test('the /tools closing "See the plans" opens the plans page', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/tools')
    await page.locator('.hm-close-ghost', { hasText: 'See the plans' }).click()
    await expect(page).toHaveURL(/\/plans$/)
    await expect(page.locator('.hpl-pro')).toBeVisible()
  })

  test('the nav Plans link opens the plans page and is marked as where you are', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await stubPrices(page)
    await go(page, '/tools')
    const link = page.locator('.spnav-quiet-link', { hasText: /^Plans$/ })
    await expect(link).not.toHaveAttribute('aria-current', 'page')
    await link.click()
    await expect(page).toHaveURL(/\/plans$/)
    await expect(page.locator('.spnav-quiet-link', { hasText: /^Plans$/ })).toHaveAttribute('aria-current', 'page')
  })
})

test.describe('the upgrade button, reached from a marketing page', () => {
  test('signed out, it opens the Pro sign-up layer on /plans', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await stubPrices(page)
    await go(page, '/')
    await page.locator('.hh-ghost', { hasText: 'View plans' }).click()
    await expect(page).toHaveURL(/\/plans$/)
    await expect(proCta(page)).toHaveAttribute('href', '/checkout?plan=yearly')
    await proCta(page).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    // The Pro sign-up layer keeps its step in the URL.
    await expect(page).toHaveURL(/\/plans\?up=1$/)
    // A sign-up in the layer skips onboarding: its last step hands off to the
    // chosen checkout itself, so nothing is stashed for after onboarding.
    expect(
      await page.evaluate(() => sessionStorage.getItem('vs-resume-after-onboarding')),
      'the layer left a resume stash for a flow that skips onboarding',
    ).toBeNull()
  })

  test('signed in on the free plan, the closing button on /tools goes through /plans to checkout', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'free' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await stubPrices(page)
    await go(page, '/tools')
    await page.locator('.hm-close-ghost', { hasText: 'See the plans' }).click()
    await expect(page).toHaveURL(/\/plans$/)
    await expect(proCta(page)).toHaveAttribute('href', '/checkout?plan=yearly')
    await proCta(page).click()
    await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('the free tier button goes to the toolkit and starts no payment', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await page.locator('.hpl-free').getByRole('link', { name: 'Open the toolkit' }).click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
