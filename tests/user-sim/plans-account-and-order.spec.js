// /plans for someone who already pays, and the order the page is read in.
//
//   1. A Pro account prints the cadence its subscription is on, with its own billed line.
//   2. A Pro account whose cadence the record cannot name prints no price at all.
//   3. The comparison head's checkout pill exists only for a live price on a Free account.
//   4. Pro is first in the markup when it has an action (the keyboard reaches it first), and Free
//      is first when it has none; side by side, Free sits on the left either way round.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-US' })

const LIVE = { source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } }
const USD_ONLY = { source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } }

const stub = (page, body = LIVE) => page.route('**/api/get-prices*', (route) => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(body)),
}))
const active = (extra) => ({ status: 'active', currentPeriodEnd: Date.now() + 30 * 86_400_000, cancelAtPeriodEnd: false, ...extra })
const pro = (page) => page.locator('.hpl-pro')

test.describe('a Pro account sees the cadence it pays on', () => {
  test('a monthly subscriber reads US$7 a month, billed monthly', async ({ page }) => {
    watch(page, 'a monthly subscriber checking their plan')
    await stub(page)
    await signIn(page, { plan: 'pro', subscription: active({ interval: 'monthly' }) })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-active')).toHaveText('Pro is active on this account.')
    await expect(pro(page).locator('.pa-amt')).toHaveText('US$7')
    await expect(pro(page).locator('.pa-per')).toHaveText('a month')
    await expect(pro(page).locator('.pa-slot')).toContainText('US$7 billed monthly.')
    await expect(pro(page).locator('.pa-slot')).not.toContainText(/yearly|US\$48/)
  })

  test('a yearly subscriber reads US$4 a month, billed yearly, and US$48 billed yearly', async ({ page }) => {
    watch(page, 'a yearly subscriber checking their plan')
    await stub(page)
    await signIn(page, { plan: 'pro', subscription: active({ interval: 'yearly' }) })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-amt')).toHaveText('US$4')
    await expect(pro(page).locator('.pa-per')).toHaveText('a month, billed yearly')
    await expect(pro(page).locator('.pa-slot')).toContainText('US$48 billed yearly.')
  })

  test('a Pro account whose cadence is unknown sees no price, only that Pro is active', async ({ page }) => {
    watch(page, 'a subscriber whose record names no cadence')
    await stub(page)
    await signIn(page, { plan: 'pro', subscription: active() })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-active')).toHaveText('Pro is active on this account.')
    await expect(pro(page).locator('.pa-amt'), 'a price was printed with no cadence to base it on').toHaveCount(0)
    await expect(pro(page).locator('.pa-per')).toHaveCount(0)
    await expect(pro(page).locator('.pa-slot')).not.toContainText(/US\$|billed/)
    await expect(pro(page), 'an outage word reached a Pro account').not.toContainText('Unavailable')
  })

  test('a Pro account in a price outage still sees no outage line and no price', async ({ page }) => {
    watch(page, 'a subscriber while the price service is down')
    await page.route('**/api/get-prices*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }))
    await signIn(page, { plan: 'pro', subscription: active({ interval: 'monthly' }) })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-active')).toHaveText('Pro is active on this account.')
    await expect(pro(page)).not.toContainText(/Unavailable|Stripe/)
    await expect(pro(page).locator('.pa-amt')).toHaveCount(0)
  })
})

test.describe('the comparison head offers checkout only for a live price on a Free account', () => {
  test('a Free account on a live price has the pill, linking to the chosen cadence', async ({ page }) => {
    watch(page, 'a free account choosing a cadence')
    await stub(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/plans')
    await expectRendered(page)
    await expect(page.locator('thead a.pl-pill')).toHaveCount(1)
    await expect(page.locator('thead a.pl-pill')).toHaveAttribute('href', '/checkout?plan=yearly')
  })

  test('a Pro account has no pill in the page at all', async ({ page }) => {
    watch(page, 'a subscriber reading the comparison')
    await stub(page)
    await signIn(page, { plan: 'pro', subscription: active({ interval: 'monthly' }) })
    await go(page, '/plans')
    await expectRendered(page)
    await expect(page.locator('a.pl-pill')).toHaveCount(0)
    await expect(page.locator('a[href*="/checkout"]'), 'a Pro account is offered a checkout link').toHaveCount(0)
  })

  test('with the price service down there is no pill in the page', async ({ page }) => {
    watch(page, 'a visitor while the price service is down')
    await page.route('**/api/get-prices*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }))
    await go(page, '/plans')
    await expectRendered(page)
    await expect(pro(page).locator('.pa-amt')).toHaveText('Unavailable')
    await expect(page.locator('a.pl-pill')).toHaveCount(0)
    await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0)
  })
})

test.describe('the order the pair is read in', () => {
  const order = (page) => page.locator('.pa-pair').evaluate((el) => [...el.children].map((c) => (c.classList.contains('hpl-pro') ? 'pro' : c.classList.contains('hpl-free') ? 'free' : 'other')))

  for (const width of [1440, 390]) {
    test(`at ${width} Pro comes first in the markup when it has an action, and Free sits left of it side by side`, async ({ page }) => {
      watch(page, 'a keyboard user reaching the Pro button')
      await page.setViewportSize({ width, height: 900 })
      await stub(page)
      await go(page, '/plans')
      await expect(pro(page).locator('.pa-amt')).toHaveText('US$4')
      expect(await order(page), 'Free comes before Pro in the markup').toEqual(['pro', 'free'])

      // The first Tab stop inside the pair is the Pro switch, not Free's button.
      await page.locator('.pa-pair').evaluate((el) => el.scrollIntoView())
      await page.locator('#main').focus()
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => document.activeElement.closest('.hpl-pro, .hpl-free')?.className.includes('hpl-pro')), 'the first stop in the pair is not in Pro').toBe(true)

      const [freeBox, proBox] = await Promise.all([page.locator('.hpl-free').boundingBox(), pro(page).boundingBox()])
      if (width >= 1200) expect(freeBox.x, 'Free is not seated on the left').toBeLessThan(proBox.x)
      else expect(proBox.y, 'Pro is not first on a narrow screen').toBeLessThan(freeBox.y)
    })
  }
})

test.describe('with no Pro action', () => {
  test.use({ locale: 'en-AU' })

  test('the markup puts Free first', async ({ page }) => {
    watch(page, 'an Australian visitor when Pro has no AUD price')
    await stub(page, USD_ONLY)
    await page.setViewportSize({ width: 390, height: 900 })
    await go(page, '/plans')
    await expect(page.locator('.hpl-pro .pa-cta')).toHaveCount(0)
    const kinds = await page.locator('.pa-pair').evaluate((el) => [...el.children].map((c) => (c.classList.contains('hpl-pro') ? 'pro' : 'free')))
    expect(kinds, 'Pro comes first although it has no action').toEqual(['free', 'pro'])
  })
})
