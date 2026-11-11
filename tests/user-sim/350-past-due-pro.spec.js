// A PRO ACCOUNT WHOSE CARD FAILED: TOLD, KEPT ON PRO FOR SEVEN DAYS, THEN PAUSED.
//
// 20-billing-banner.spec.js measures where the banner sits. This is what the buyer is
// told and what each answer does, with a subscription document shaped the way the
// Stripe webhook writes it (status past_due, paymentFailed, paymentFailedAt,
// hostedInvoiceUrl):
//
//   inside the 7-day grace   still Pro (no Upgrade pill, "You're on Pro."), a banner
//                            "Your last payment didn't go through" counting the days
//                            left, and a call to action that opens Stripe's invoice
//                            page for the exact unpaid invoice.
//   after the grace          Free again ("You're on Free.", the Upgrade pill is back),
//                            a banner "Pro is paused - payment failed" with the same
//                            call to action.
//   no invoice link          the call to action opens the billing portal instead.
//   dismissed                gone for the rest of the visit, including after a reload.
//
// The invoice and portal pages are Stripe's, so both are answered here; nothing leaves
// the machine.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// billingState.js: PAST_DUE_GRACE_MS 7 -> 0 days, or isWithinPastDueGrace -> false
// (the grace tests fail: the nav shows Upgrade, the banner says paused). BillingBanner:
// swap the two `cta` strings, drop the `hostedInvoiceUrl` branch of openBilling, or
// stop writing the dismissal (the dismissed test fails after the reload).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const DAY = 86_400_000
const INVOICE = 'https://billing.stripe.test/i/in_test_unpaid'
const PORTAL = 'https://billing.stripe.test/p/session_test'

const failing = (daysAgo, extra = {}) => ({
  status: 'past_due',
  paymentFailed: true,
  paymentFailedAt: Date.now() - daysAgo * DAY,
  hostedInvoiceUrl: INVOICE,
  interval: 'monthly',
  currentPeriodEnd: Date.now() + 25 * DAY,
  cancelAtPeriodEnd: false,
  updatedAt: Date.now() - daysAgo * DAY,
  ...extra,
})

const pathOf = (page) => new URL(page.url()).pathname

// Stripe's pages, answered with a stub so a click that leaves the app can be seen to arrive.
const answerStripe = (page) => page.route('https://billing.stripe.test/**', (route) => route.fulfill({
  status: 200,
  contentType: 'text/html',
  body: '<!doctype html><title>Stripe</title><p>stub</p>',
}))

const banner = (page) => page.locator('.bill-banner')

test.describe('a Pro account inside the 7-day grace', () => {
  test('is still Pro: no Upgrade pill, and the plan line says Pro', async ({ page }) => {
    watch(page, 'a Pro subscriber one day into a failed payment')
    await signIn(page, { plan: 'pro', subscription: failing(1), projects: 1 })
    await go(page, '/projects')
    await expect(banner(page), 'the notice is up, so the account state was read').toBeVisible()
    await expect(page.locator('.pnav-upgrade')).toHaveCount(0)
    await expect(page.locator('.db-plan').getByText('You’re on Pro.')).toBeVisible()
    await expect(page.getByRole('link', { name: /^See (all )?plans$/i })).toHaveCount(0)
  })

  test('the banner says the payment failed, counts the days left and offers Update payment method', async ({ page }) => {
    watch(page, 'a Pro subscriber one day into a failed payment')
    await signIn(page, { plan: 'pro', subscription: failing(1), projects: 1 })
    await go(page, '/projects')
    const notice = banner(page)
    await expect(notice).toHaveAttribute('role', 'status')
    await expect(notice.getByText('Your last payment didn’t go through')).toBeVisible()
    await expect(notice.getByText('Pro stays on for 6 more days while you update your card.')).toBeVisible()
    await expect(notice.getByRole('button', { name: 'Update payment method' })).toBeEnabled()
    await expect(notice.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    await expect(notice.getByRole('button', { name: /^Upgrade|See plans|Subscribe/i }), 'no upgrade pitch inside the notice').toHaveCount(0)
  })

  test('the notice follows the buyer to other pages', async ({ page }) => {
    watch(page, 'a Pro subscriber one day into a failed payment')
    await signIn(page, { plan: 'pro', subscription: failing(1) })
    for (const route of ['/projects', '/settings', '/learn/help']) {
      await go(page, route)
      await expect(banner(page).getByText('Your last payment didn’t go through'), `the notice on ${route}`).toBeVisible()
    }
  })

  test('Update payment method opens the unpaid invoice Stripe gave us', async ({ page }) => {
    watch(page, 'a Pro subscriber fixing their card')
    await signIn(page, { plan: 'pro', subscription: failing(1), projects: 1 })
    await answerStripe(page)
    await go(page, '/projects')
    await banner(page).getByRole('button', { name: 'Update payment method' }).click()
    await expect.poll(() => page.url()).toBe(INVOICE)
  })

  test('with no invoice link it opens the billing portal instead', async ({ page }) => {
    watch(page, 'a Pro subscriber whose invoice link never arrived')
    await signIn(page, { plan: 'pro', subscription: failing(1, { hostedInvoiceUrl: null }), projects: 1 })
    await answerStripe(page)
    let asked = null
    await page.route('**/api/create-portal', (route) => {
      asked = route.request().method()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: PORTAL }) })
    })
    await go(page, '/projects')
    await banner(page).getByRole('button', { name: 'Update payment method' }).click()
    await expect.poll(() => page.url()).toBe(PORTAL)
    expect(asked, 'the portal was asked for').toBe('POST')
  })

  test('a portal that cannot open says so and keeps the button', async ({ page }) => {
    watch(page, 'a Pro subscriber whose billing portal is down')
    await signIn(page, { plan: 'pro', subscription: failing(1, { hostedInvoiceUrl: null }), projects: 1 })
    await page.route('**/api/create-portal', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Portal is down' }) }))
    await go(page, '/projects')
    await banner(page).getByRole('button', { name: 'Update payment method' }).click()
    await expect(banner(page).getByRole('alert')).toBeVisible()
    await expect(banner(page).getByRole('button', { name: 'Update payment method' }), 'the buyer can try again').toBeEnabled()
    expect(pathOf(page)).toBe('/projects')
  })

  test('dismissing the notice hides it for the visit, including after a reload', async ({ page }) => {
    watch(page, 'a Pro subscriber dismissing the notice')
    await signIn(page, { plan: 'pro', subscription: failing(1), projects: 1 })
    await go(page, '/projects')
    await banner(page).getByRole('button', { name: 'Dismiss this notice' }).click()
    await expect(banner(page)).toHaveCount(0)
    await go(page, '/projects')
    await expect(page.locator('.db-plan').getByText('You’re on Pro.'), 'the page is back, still Pro').toBeVisible()
    await expect(banner(page), 'still dismissed after a reload').toHaveCount(0)
  })
})

test.describe('a Pro account past the 7-day grace', () => {
  test('is Free again: the Upgrade pill is back and the plan line says Free', async ({ page }) => {
    watch(page, 'a subscriber ten days into a failed payment')
    await signIn(page, { plan: 'free', subscription: failing(10), projects: 1 })
    await go(page, '/projects')
    await expect(banner(page), 'the notice is up, so the account state was read').toBeVisible()
    await expect(page.locator('.pnav-upgrade')).toBeVisible()
    await expect(page.locator('.pnav-upgrade')).toHaveAttribute('href', '/plans')
    await expect(page.locator('.db-plan').getByText('You’re on Free.')).toBeVisible()
  })

  test('the banner says Pro is paused and still offers Update payment method', async ({ page }) => {
    watch(page, 'a subscriber ten days into a failed payment')
    await signIn(page, { plan: 'free', subscription: failing(10), projects: 1 })
    await answerStripe(page)
    await go(page, '/projects')
    const notice = banner(page)
    await expect(notice.getByText('Pro is paused — payment failed')).toBeVisible()
    await expect(notice.getByText('Your projects and saved work are all still here. Updating your card switches Pro back on.')).toBeVisible()
    await expect(notice.getByText(/Pro stays on for/), 'no countdown once it has run out').toHaveCount(0)
    await notice.getByRole('button', { name: 'Update payment method' }).click()
    await expect.poll(() => page.url()).toBe(INVOICE)
  })

  test('a cancelled subscription with a stale failure flag shows no payment banner', async ({ page }) => {
    watch(page, 'a subscriber whose cancelled plan still carries a failure flag')
    await signIn(page, { plan: 'free', subscription: failing(10, { status: 'canceled' }), projects: 1 })
    await go(page, '/projects')
    await expect(page.locator('.pnav-upgrade'), 'the page is up, and Free').toBeVisible()
    await expect(banner(page)).toHaveCount(0)
  })
})
