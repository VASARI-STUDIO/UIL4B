// /checkout/return reports Pro only when checkout-status confirms THIS
// checkout, and keeps asking while it cannot.
//
//   - Confirmation is per kind: a one-off needs `entitlementActive`, a
//     subscription needs `subscriptionActive`. The signed-in account is never
//     consulted, because it can already hold Pro from another purchase or a
//     stale snapshot.
//   - Until the server confirms, the page reads "Payment received." and asks
//     again every 4 seconds, at most 15 more times, and stops the moment it is
//     confirmed or the page is left.
//   - A subscription that ends at the close of the period labels its date
//     "Access until", not "Renews".
//
// `checkout-status` is answered from the spec (vite preview runs no functions),
// and the page clock is driven by hand so the 4-second wait costs nothing.
import { test, expect } from './base.js'
import { signIn, go, watch } from './helpers.js'

const RETRY_MS = 4000
const RETRIES = 15

const SUBSCRIPTION_PENDING = { status: 'complete', mode: 'subscription', interval: 'monthly', subscriptionActive: false, customerEmail: 'a@uil4b.test' }
const SUBSCRIPTION_CONFIRMED = { ...SUBSCRIPTION_PENDING, subscriptionActive: true }
const ONE_OFF_PENDING = { status: 'complete', mode: 'payment', paymentStatus: 'paid', entitlementActive: false, customerEmail: 'a@uil4b.test' }
const ONE_OFF_CONFIRMED = { ...ONE_OFF_PENDING, entitlementActive: true }

// 15 March 2031, midday UTC: the same calendar day in every timezone a CI
// runner is likely to use, and far enough ahead never to read as lapsed.
const PERIOD_END = Date.UTC(2031, 2, 15, 12)

/**
 * Answer /api/checkout-status from `answers`: the nth request gets the nth
 * entry, and the last entry repeats. `requests()` is how many have arrived.
 */
async function answerStatus(page, answers) {
  let count = 0
  await page.route('**/api/checkout-status*', (route) => {
    const body = answers[Math.min(count, answers.length - 1)]
    count += 1
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  return { requests: () => count }
}

/**
 * Let anything the page started on the last clock jump finish. A poll that is
 * going to fire does so inside the jump and reaches the network a few promise
 * turns later; a round trip through the same page queues behind it.
 */
async function drain(page) {
  await page.route('**/api/__drain', (route) => route.fulfill({ status: 204 }))
  await page.evaluate(() => fetch('/api/__drain'))
}

const view = (page) => page.locator('.co-return')
const heading = (page) => page.locator('.co-return h1')

test.describe('the checkout return page only reports Pro when this checkout is confirmed', () => {
  test('an account that is already Pro is still told the payment is settling when the one-off is not confirmed', async ({ page }) => {
    watch(page, 'a Pro subscriber who just paid for a one-off that has not attached')
    await signIn(page, { plan: 'pro' })
    await answerStatus(page, [ONE_OFF_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_one_off_pending')

    await expect(heading(page)).toHaveText('Payment received.')
    await expect(view(page)).not.toContainText(/Pro is yours/i)
    await expect(view(page)).not.toContainText(/on UIL4B Pro/i)
    await expect(view(page).locator('.co-details dt', { hasText: /^Paid for$/ })).toHaveCount(1)
    await expect(view(page).getByRole('link', { name: 'Start building' })).toHaveCount(0)
  })

  test('an account that is already Pro is still told the payment is settling when the subscription is not confirmed', async ({ page }) => {
    watch(page, 'a Pro account paying again whose new subscription has not attached')
    await signIn(page, { plan: 'pro' })
    await answerStatus(page, [SUBSCRIPTION_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_sub_pending')

    await expect(heading(page)).toHaveText('Payment received.')
    await expect(view(page)).not.toContainText(/on UIL4B Pro/i)
    await expect(view(page).getByRole('button', { name: 'Check again' })).toBeVisible()
  })

  // Each answer is confirmed for the OTHER kind only; neither may land.
  for (const [name, answer] of [
    ['a one-off is not confirmed by the subscription flag', { ...ONE_OFF_PENDING, subscriptionActive: true }],
    ['a subscription is not confirmed by the one-off flag', { ...SUBSCRIPTION_PENDING, entitlementActive: true }],
  ]) {
    test(`${name}`, async ({ page }) => {
      watch(page, name)
      await signIn(page, { plan: 'free' })
      await answerStatus(page, [answer])
      await go(page, '/checkout/return?session_id=cs_test_wrong_flag')
      await expect(heading(page)).toHaveText('Payment received.')
      await expect(view(page)).not.toContainText(/on UIL4B Pro/i)
    })
  }

  test('a one-off confirmed by checkout-status lands on Pro with no renewal, even on a free account', async ({ page }) => {
    watch(page, 'a free account whose one-off purchase the server has confirmed')
    await signIn(page, { plan: 'free' })
    await answerStatus(page, [ONE_OFF_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_one_off_done')

    await expect(heading(page)).toHaveText('You’re on UIL4B Pro.')
    await expect(view(page).locator('.co-sub')).toContainText('Pro is yours with no renewal.')
    await expect(view(page).locator('.co-details dd', { hasText: 'Pro, one-off purchase' })).toHaveCount(1)
  })
})

test.describe('the date row says when access ends if the subscription is set to end', () => {
  const subscription = (cancelAtPeriodEnd) => ({
    status: 'active', interval: 'monthly', currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd,
  })

  test('a subscription set to cancel at the end of the period reads "Access until"', async ({ page }) => {
    watch(page, 'a subscriber who cancelled and is back on the return page')
    await signIn(page, { plan: 'pro', subscription: subscription(true) })
    await answerStatus(page, [SUBSCRIPTION_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_cancelling')

    await expect(heading(page)).toHaveText('You’re on UIL4B Pro.')
    const details = view(page).locator('.co-details')
    const row = details.locator('.co-detail', { has: page.locator('dt', { hasText: /^Access until$/ }) })
    await expect(row).toHaveCount(1)
    await expect(row.locator('dd')).toContainText('March')
    await expect(row.locator('dd')).toContainText('2031')
    await expect(details.locator('dt', { hasText: /^Renews$/ })).toHaveCount(0)
  })

  test('a subscription that will renew reads "Renews"', async ({ page }) => {
    watch(page, 'a subscriber whose plan renews')
    await signIn(page, { plan: 'pro', subscription: subscription(false) })
    await answerStatus(page, [SUBSCRIPTION_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_renewing')

    await expect(heading(page)).toHaveText('You’re on UIL4B Pro.')
    const details = view(page).locator('.co-details')
    const row = details.locator('.co-detail', { has: page.locator('dt', { hasText: /^Renews$/ }) })
    await expect(row.locator('dd')).toContainText('2031')
    await expect(details.locator('dt', { hasText: /^Access until$/ })).toHaveCount(0)
  })
})

test.describe('a settling payment keeps asking, then stops', () => {
  test('it asks again every 4 seconds and lands on Pro the moment the server confirms', async ({ page }) => {
    watch(page, 'a subscriber whose webhook arrives on the third ask')
    await page.clock.install()
    await signIn(page, { plan: 'free' })
    const status = await answerStatus(page, [SUBSCRIPTION_PENDING, SUBSCRIPTION_PENDING, SUBSCRIPTION_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_settles')

    await expect(heading(page)).toHaveText('Payment received.')
    await expect.poll(status.requests).toBe(1)

    // Just short of the wait, nothing more is asked.
    await page.clock.fastForward(RETRY_MS - 100)
    await drain(page)
    expect(status.requests(), 'asked again before the wait was over').toBe(1)

    await page.clock.fastForward(100)
    await expect.poll(status.requests).toBe(2)
    await expect(heading(page)).toHaveText('Payment received.')

    await page.clock.fastForward(RETRY_MS)
    await expect.poll(status.requests).toBe(3)
    await expect(heading(page)).toHaveText('You’re on UIL4B Pro.')

    // Confirmed: a long wait asks nothing further.
    await page.clock.fastForward('02:00')
    await drain(page)
    expect(status.requests(), 'kept asking after the server confirmed').toBe(3)
  })

  test('it gives up after 15 more asks when the server never confirms', async ({ page }) => {
    watch(page, 'a payment that never settles')
    await page.clock.install()
    await signIn(page, { plan: 'free' })
    const status = await answerStatus(page, [SUBSCRIPTION_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_never')
    await expect.poll(status.requests).toBe(1)

    for (let ask = 2; ask <= RETRIES + 1; ask++) {
      await page.clock.fastForward(RETRY_MS)
      await expect.poll(status.requests, `ask ${ask}`).toBe(ask)
    }
    await page.clock.fastForward('02:00')
    await drain(page)
    expect(status.requests(), 'one initial ask plus 15 re-asks, then no more').toBe(RETRIES + 1)
    await expect(heading(page)).toHaveText('Payment received.')
  })

  test('leaving the page while it settles stops the asking', async ({ page }) => {
    watch(page, 'a subscriber who leaves the return page while payment settles')
    await page.clock.install()
    await signIn(page, { plan: 'free' })
    const status = await answerStatus(page, [SUBSCRIPTION_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_leaves')
    await expect(heading(page)).toHaveText('Payment received.')
    await expect.poll(status.requests).toBe(1)

    // An in-app link: the route unmounts, the document stays.
    await view(page).getByRole('link', { name: 'Manage subscription' }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(view(page)).toHaveCount(0)

    await page.clock.fastForward('02:00')
    await drain(page)
    expect(status.requests(), 'kept asking after the page was left').toBe(1)
  })
})
