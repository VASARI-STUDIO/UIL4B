// WHERE A BUYER LANDS WHEN STRIPE SENDS THEM BACK WITHOUT A PAID ORDER.
//
// 69 (flow 2) and 80 cover the two good outcomes: complete, and complete with the
// access still attaching. This is the rest of what /api/checkout-status can say:
//
//   status "open"   the payment was never finished. The buyer goes back to
//                   /checkout on the SAME plan, and one who came from the export
//                   gallery keeps `from=kit-gallery`. No error card in between.
//   anything else   expired, an unpaid one-off, a 500, a dropped connection: the
//                   page says it could not confirm, and offers both ways on
//                   (Back to Plans, Back to settings), each of which works.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// CheckoutReturn.jsx, the `data.status === 'open'` branch:
//   · navigate to `/checkout?plan=yearly` whatever `data.interval` says
//     (the monthly test fails);
//   · drop the `&from=kit-gallery` suffix (the gallery test fails);
//   · make `open` fall through to setState('error') (every open test fails).
// The error branch: render nothing for 'error', or point "Back to Plans" at /checkout.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const pathOf = (page) => new URL(page.url()).pathname

const answerStatus = (page, status, body) => page.route('**/api/checkout-status*', (route) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
}))

const periodRadio = (page, label) => page
  .getByRole('radiogroup', { name: 'Billing period' })
  .getByRole('radio', { name: new RegExp(`^${label}`) })

async function arrive(page, url, status, body) {
  watch(page, 'a buyer sent back from Stripe')
  await signIn(page, { plan: 'free' })
  await answerStatus(page, status, body)
  await go(page, url)
}

test.describe('a checkout that was never finished goes back to checkout', () => {
  test('open on the monthly plan returns to /checkout?plan=monthly with Monthly chosen', async ({ page }) => {
    await arrive(page, '/checkout/return?session_id=cs_test_open_m', 200, { status: 'open', interval: 'monthly' })
    await expect.poll(() => page.url().replace(/^https?:\/\/[^/]+/, '')).toBe('/checkout?plan=monthly')
    await expect(periodRadio(page, 'Monthly')).toBeChecked()
    await expect(page.locator('.checkout-return-card'), 'no error card on the way back').toHaveCount(0)
  })

  test('open on the yearly plan returns to /checkout?plan=yearly with Yearly chosen', async ({ page }) => {
    await arrive(page, '/checkout/return?session_id=cs_test_open_y', 200, { status: 'open', interval: 'yearly' })
    await expect.poll(() => page.url().replace(/^https?:\/\/[^/]+/, '')).toBe('/checkout?plan=yearly')
    await expect(periodRadio(page, 'Yearly')).toBeChecked()
  })

  test('open from the export gallery keeps from=kit-gallery on the way back', async ({ page }) => {
    await arrive(page, '/checkout/return?session_id=cs_test_open_g&from=kit-gallery', 200, { status: 'open', interval: 'monthly' })
    await expect.poll(() => page.url().replace(/^https?:\/\/[^/]+/, '')).toBe('/checkout?plan=monthly&from=kit-gallery')
    await expect(periodRadio(page, 'Monthly')).toBeChecked()
  })

  test('open with no plan named falls back to the yearly plan', async ({ page }) => {
    await arrive(page, '/checkout/return?session_id=cs_test_open_none', 200, { status: 'open' })
    await expect.poll(() => page.url().replace(/^https?:\/\/[^/]+/, '')).toBe('/checkout?plan=yearly')
    await expect(periodRadio(page, 'Yearly')).toBeChecked()
  })

  test('the return page is replaced, so Back from checkout does not come round to it again', async ({ page }) => {
    await go(page, '/plans')
    await arrive(page, '/checkout/return?session_id=cs_test_open_back', 200, { status: 'open', interval: 'yearly' })
    await expect.poll(() => pathOf(page)).toBe('/checkout')
    await page.goBack()
    await expect.poll(() => pathOf(page), 'one step back is the page before the return, not the return').toBe('/plans')
  })
})

const FAILURES = [
  { name: 'an expired session', status: 200, body: { status: 'expired' } },
  { name: 'an unpaid one-off', status: 200, body: { status: 'complete', mode: 'payment', paymentStatus: 'unpaid' } },
  { name: 'a 500 from the status check', status: 500, body: { error: 'Stripe is having a moment' } },
  { name: 'a 404 for a session that does not exist', status: 404, body: { error: 'No such session' } },
]

test.describe('a checkout that cannot be confirmed says so and offers both ways on', () => {
  for (const failure of FAILURES) {
    test(`${failure.name}: the error card with Back to Plans and Back to settings`, async ({ page }) => {
      await arrive(page, '/checkout/return?session_id=cs_test_fail', failure.status, failure.body)
      const card = page.locator('.checkout-return-card')
      await expect(card.getByRole('heading', { level: 1 })).toHaveText(/couldn.t confirm your checkout/i)
      await expect(card.getByRole('link', { name: 'Back to Plans' })).toHaveAttribute('href', '/plans')
      await expect(card.getByRole('link', { name: 'Back to settings' })).toHaveAttribute('href', '/settings')
      await expect(card.getByText(/You.re on UI L4B Pro|Payment received/), 'it does not claim a payment').toHaveCount(0)
      expect(pathOf(page), 'it stays here rather than bouncing').toBe('/checkout/return')
    })
  }

  test('a dropped connection is the same error card', async ({ page }) => {
    watch(page, 'a buyer whose connection dropped on the way back')
    await signIn(page, { plan: 'free' })
    await page.route('**/api/checkout-status*', (route) => route.abort('connectionfailed'))
    await go(page, '/checkout/return?session_id=cs_test_drop')
    const card = page.locator('.checkout-return-card')
    await expect(card.getByRole('heading', { level: 1 })).toHaveText(/couldn.t confirm your checkout/i)
    await expect(card.getByRole('link', { name: 'Back to Plans' })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Back to settings' })).toBeVisible()
  })

  test('Back to Plans opens /plans and Back to settings opens /settings', async ({ page }) => {
    await arrive(page, '/checkout/return?session_id=cs_test_links', 200, { status: 'expired' })
    const card = page.locator('.checkout-return-card')
    await card.getByRole('link', { name: 'Back to Plans' }).click()
    await expect.poll(() => pathOf(page)).toBe('/plans')
    await page.goBack()
    await expect.poll(() => pathOf(page)).toBe('/checkout/return')
    await page.locator('.checkout-return-card').getByRole('link', { name: 'Back to settings' }).click()
    await expect.poll(() => pathOf(page)).toBe('/settings')
  })
})
