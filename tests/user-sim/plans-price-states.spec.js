// The price states on /plans, /checkout and Settings. Stripe is stubbed, so no
// payment is ever made. For each answer the stub gives:
//   · no Pro button is disabled with "Pricing unavailable right now", and
//     "unavailable" appears at most twice on the page
//   · Retry fills its slot's width and reads "Checking Stripe…" while it checks
//   · nothing outside the live state links to /checkout
//   · no button's label wraps to a second line at 1024
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-US' })

const LIVE = { source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } }
const NO_LIVE = {
  source: { monthly: 'fallback', yearly: 'fallback' }, monthly: { usd: 7 }, yearly: { usd: 48 },
  currencyAvailability: { monthly: { usd: false }, yearly: { usd: false } },
}
// Live in USD only; the visitor's currency (AUD) has no price.
const USD_ONLY = { source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } }

const answer = (body, status = 200) => (route) => route.fulfill({
  status, contentType: 'application/json', body: JSON.stringify(status === 200 ? withAvailability(body) : body),
})
const stub = (page, body, status) => page.route('**/api/get-prices*', answer(body, status))

const STATES = [
  { name: 'unreachable (request fails)', body: {}, status: 500, locale: 'en-US' },
  { name: 'unreachable (no live source)', body: NO_LIVE, locale: 'en-US' },
  { name: 'no-currency (AUD visitor, USD only)', body: USD_ONLY, locale: 'en-AU' },
]
const WIDTHS = [[320, 640], [390, 844], [1024, 800], [1440, 900]]

const surfaces = {
  plans: { path: '/plans', slot: '.hpl-pro', button: '.hpl-pro .pa-cta button' },
  checkout: { path: '/checkout?plan=yearly', slot: '.ck-sum', button: '.ck-out .ck-ghost', signedIn: true },
  settings: { path: '/settings', slot: '.sub-tier-pro', button: '.sub-tier-pro .sub-tier-btn', signedIn: true, support: true },
}

for (const [surfaceName, surface] of Object.entries(surfaces)) {
  for (const state of STATES) {
    test.describe(`${surfaceName}: ${state.name}`, () => {
    test.use({ locale: state.locale })
    for (const [width, height] of WIDTHS) {
      test(`at ${width}`, async ({ page }) => {
        watch(page, `someone on ${surfaceName} while pricing is down`)
        await page.setViewportSize({ width, height })
        await stub(page, state.body, state.status)
        if (surface.signedIn) await signIn(page, { plan: 'free' })
        await go(page, surface.path)
        // On a phone Settings opens on its list of sections; the tablet and desktop layout opens one already.
        if (surface.support) {
          if (width <= 720) await page.locator('#settab-support').click()
          else await page.getByRole('tab', { name: 'Plan and billing' }).click()
        }

        const slot = page.locator(surface.slot).first()
        // The page's board design gives a missing currency no Pro action at all (open call for the owner): no button, no checkout link, and the words say why.
        if (surfaceName === 'plans' && state.name.startsWith('no-currency')) {
          await expect(slot).toContainText('Unavailable')
          await expect(slot).toContainText('Pro has no AUD price yet.')
          await expect(page.locator('.hpl-pro .pa-cta'), 'a Pro action is offered with no price in the visitor currency').toHaveCount(0)
          await expect(page.locator('main a[href*="/checkout"]').filter({ visible: true })).toHaveCount(0)
          return
        }
        const button = page.locator(surface.button).first()
        await expect(button).toBeVisible()
        await expect(slot).toContainText(/Unavailable/)

        // The Pro button is enabled, there is no "Pricing unavailable" heading, and "unavailable" appears at most twice.
        await expect(page.getByText('Pricing unavailable right now')).toHaveCount(0)
        const text = await page.locator('main, .checkout-page, .stg').first().innerText()
        expect((text.match(/unavailable/gi) || []).length, 'unavailable is said more than twice').toBeLessThanOrEqual(2)
        expect(text).not.toMatch(/unreachable/i)
        expect(await button.isDisabled(), 'the Pro button is disabled').toBe(false)

        // Retry fills the slot's width (checkout's design draws it as a ghost button
        // under the outage lines, so there it is a full 44px target instead), and
        // one line holds its label.
        await expect(button).toHaveText('Retry live pricing')
        const box = await button.boundingBox()
        if (surfaceName === 'checkout') {
          expect(box.height, 'Retry is under 44px tall').toBeGreaterThanOrEqual(44)
        } else {
          const slotBox = await (surfaceName === 'plans' ? button.locator('xpath=..') : slot).boundingBox()
          const slotMin = surfaceName === 'plans' ? 0.5 : 0.7
          // Settings' plan card sizes its button to its label (min 168px, left-aligned) from 720 up, and stretches it below that.
          if (surfaceName === 'settings' && width >= 720) expect(box.width, 'Retry is under its 168px minimum').toBeGreaterThanOrEqual(167.5)
          else expect(box.width, 'Retry is not full width').toBeGreaterThan(slotBox.width * slotMin)
        }
        const lines = await button.evaluate((el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size
        })
        expect(lines, 'the label wraps').toBe(1)

        // Nothing here may link to checkout.
        if (surfaceName !== 'checkout') expect(await page.locator('main a[href*="/checkout"], .stg a[href*="/checkout"]').filter({ visible: true }).count(), 'a visible link to checkout without a price').toBe(0)

        // While it checks, the same button reads "Checking Stripe…".
        let release
        const held = new Promise((resolve) => { release = resolve })
        await page.unroute('**/api/get-prices*')
        await page.route('**/api/get-prices*', async (route) => { await held; await answer(LIVE)(route) })
        await button.click()
        await expect(button).toHaveText('Checking Stripe…')
        await expect(button).toHaveAttribute('aria-disabled', 'true')
        release()
        if (surfaceName === 'settings' && state.name.startsWith('no-currency')) {
          // The stub answers in USD only, so an AUD visitor stays unpriced; the check ends and Retry comes back.
          await expect(button).not.toHaveAttribute('aria-disabled', 'true')
          await expect(button).toHaveText('Retry live pricing')
        } else {
          await expect(slot).not.toContainText(/Unavailable/)
        }
      })
    }
    })
  }
}

test('plans: a cadence with no price offers a switch, not a checkout link', async ({ page }) => {
  watch(page, 'a visitor choosing a cadence Stripe cannot price')
  await stub(page, { source: { monthly: 'live', yearly: 'fallback' }, monthly: { usd: 7 }, yearly: { usd: 48 } })
  await go(page, '/plans')
  const pro = page.locator('.hpl-pro')
  await expect(pro.locator('.pa-amt')).toHaveText('Unavailable')
  await expect(pro.locator('#pricing-noprice p')).toHaveText(['No USD price for Yearly yet.', 'Monthly can be bought in USD.'])
  await expect(pro.getByRole('button', { name: 'Switch to Monthly' })).toBeVisible()
  expect(await page.locator('main a[href*="/checkout"]').filter({ visible: true }).count()).toBe(0)
})

test('checkout: no "per" label and no trial band without a price', async ({ page }) => {
  watch(page, 'a free account at checkout while Stripe has no live prices')
  await stub(page, NO_LIVE)
  await signIn(page, { plan: 'free' })
  await go(page, '/checkout?plan=yearly')
  await expect(page.locator('.ck-out .ck-fig')).toHaveText('Unavailable')
  // No bill stops (today, then, later), so no "a month" figure and no trial date.
  await expect(page.locator('.ck-stop')).toHaveCount(0)
  await expect(page.locator('.ck-bill')).not.toContainText(/free trial|a\s+(month|year)\b/i)
})
