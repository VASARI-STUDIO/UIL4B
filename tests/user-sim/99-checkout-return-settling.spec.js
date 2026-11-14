// /checkout/return reports Pro only when checkout-status confirms THIS
// checkout, and keeps asking while it cannot.
//
//   - Confirmation is per kind: a one-off needs `entitlementActive`, a
//     subscription needs `subscriptionActive`. The signed-in account is never
//     consulted, because it can already hold Pro from another purchase or a
//     stale snapshot.
//   - Until the server confirms, the page reads "Payment received" and asks
//     again every 4 seconds, at most 15 more times, and stops the moment it is
//     confirmed or the page is left.
//   - A free trial states the day it ends and that nothing is charged before it.
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

const view = (page) => page.locator('.ck-ret')
const heading = (page) => page.locator('.ck-ret h1')
// The line under the heading is the page's status region.
const statusLine = (page) => page.locator('.ck-ret .ck-rp[role="status"]')

test.describe('the checkout return page only reports Pro when this checkout is confirmed', () => {
  test('an account that is already Pro is still told the payment is settling when the one-off is not confirmed', async ({ page }) => {
    watch(page, 'a Pro subscriber who just paid for a one-off that has not attached')
    await signIn(page, { plan: 'pro' })
    await answerStatus(page, [ONE_OFF_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_one_off_pending')

    await expect(heading(page)).toHaveText('Payment received')
    await expect(view(page)).not.toContainText(/Pro is yours/i)
    await expect(view(page)).not.toContainText(/on UI L4B Pro/i)
    await expect(statusLine(page)).toContainText('still being attached')
    // A one-off has no subscription to manage, settling or not.
    await expect(view(page).getByRole('link', { name: 'View account details' })).toBeVisible()
    await expect(view(page).getByRole('link', { name: 'Manage subscription' })).toHaveCount(0)
  })

  test('an account that is already Pro is still told the payment is settling when the subscription is not confirmed', async ({ page }) => {
    watch(page, 'a Pro account paying again whose new subscription has not attached')
    await signIn(page, { plan: 'pro' })
    await answerStatus(page, [SUBSCRIPTION_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_sub_pending')

    await expect(heading(page)).toHaveText('Payment received')
    await expect(view(page)).not.toContainText(/on UI L4B Pro/i)
    await expect(statusLine(page)).toContainText('still being attached')
    // The reference is the tail of the session id, so the buyer can quote it.
    await expect(view(page).locator('.ck-ref code')).toHaveText('…_pending')
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
      await expect(heading(page)).toHaveText('Payment received')
      await expect(view(page)).not.toContainText(/on UI L4B Pro/i)
    })
  }

  test('a one-off confirmed by checkout-status lands on Pro with no renewal, even on a free account', async ({ page }) => {
    watch(page, 'a free account whose one-off purchase the server has confirmed')
    await signIn(page, { plan: 'free' })
    await answerStatus(page, [ONE_OFF_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_one_off_done')

    await expect(heading(page)).toHaveText('You’re on UI L4B Pro')
    await expect(statusLine(page)).toContainText('Your Pro access is active across the toolkit, with no renewal.')
    await expect(view(page).getByRole('link', { name: 'View account details' })).toBeVisible()
    await expect(view(page).getByRole('link', { name: 'Manage subscription' })).toHaveCount(0)
  })
})

test.describe('a free trial says when it ends', () => {
  const trialing = { status: 'trialing', interval: 'yearly', trialEndsAt: PERIOD_END, currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd: false }
  const TRIAL_CONFIRMED = { ...SUBSCRIPTION_CONFIRMED, interval: 'yearly' }

  test('a subscription in its trial names the day the trial ends and that nothing is charged before it', async ({ page }) => {
    watch(page, 'a subscriber back from Stripe on a free trial')
    await signIn(page, { plan: 'pro', subscription: trialing })
    await answerStatus(page, [TRIAL_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_trialing')

    await expect(heading(page)).toHaveText('You’re on UI L4B Pro')
    await expect(statusLine(page)).toContainText('Your free trial runs until')
    await expect(statusLine(page)).toContainText('March')
    await expect(statusLine(page)).toContainText('2031')
    await expect(statusLine(page)).toContainText('you won’t be charged before then')
  })

  test('a paid subscription, with no trial, states no trial date', async ({ page }) => {
    watch(page, 'a subscriber whose plan bills straight away')
    await signIn(page, { plan: 'pro', subscription: { status: 'active', interval: 'monthly', currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd: false } })
    await answerStatus(page, [SUBSCRIPTION_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_renewing')

    await expect(heading(page)).toHaveText('You’re on UI L4B Pro')
    await expect(statusLine(page)).toContainText('Your Pro subscription is active across the toolkit.')
    await expect(view(page)).not.toContainText('free trial')
  })
})

test.describe('a settling payment keeps asking, then stops', () => {
  test('it asks again every 4 seconds and lands on Pro the moment the server confirms', async ({ page }) => {
    watch(page, 'a subscriber whose webhook arrives on the third ask')
    await page.clock.install()
    await signIn(page, { plan: 'free' })
    const status = await answerStatus(page, [SUBSCRIPTION_PENDING, SUBSCRIPTION_PENDING, SUBSCRIPTION_CONFIRMED])
    await go(page, '/checkout/return?session_id=cs_test_settles')

    await expect(heading(page)).toHaveText('Payment received')
    await expect.poll(status.requests).toBe(1)

    // The clock runs on its own after install(), so on a loaded runner real
    // time eats into any short margin. Stop it, then move it only by hand. The
    // pause jumps 500 ms, so the next ask is now at most 3.5 s away.
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500)

    // Well short of the wait, nothing more is asked.
    await page.clock.fastForward(2500)
    await drain(page)
    expect(status.requests(), 'asked again before the wait was over').toBe(1)

    // Past the 4 s mark in all, it has asked.
    await page.clock.fastForward(1500)
    await expect.poll(status.requests).toBe(2)
    await expect(heading(page)).toHaveText('Payment received')

    await page.clock.fastForward(RETRY_MS)
    await expect.poll(status.requests).toBe(3)
    await expect(heading(page)).toHaveText('You’re on UI L4B Pro')

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
    await expect(heading(page)).toHaveText('Payment received')
  })

  test('leaving the page while it settles stops the asking', async ({ page }) => {
    watch(page, 'a subscriber who leaves the return page while payment settles')
    await page.clock.install()
    await signIn(page, { plan: 'free' })
    const status = await answerStatus(page, [SUBSCRIPTION_PENDING])
    await go(page, '/checkout/return?session_id=cs_test_leaves')
    await expect(heading(page)).toHaveText('Payment received')
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
