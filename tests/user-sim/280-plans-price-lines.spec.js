// TWO PRICE LINES BESIDE /plans, RENDERED, IN A NON-DOLLAR CURRENCY.
//
//   · Settings → Plan and billing prices Free in the page's currency. A "$0" typed
//     into the markup reads fine to a US visitor and wrong next to "£6".
//   · The upgrade dialog's timeline: the free days are 1 to 7 and the charge
//     lands on the day after, so no day is both free and charged.
//
// The visitor is in Great Britain (en-GB), prices are stubbed live in GBP, and
// every amount asserted comes from that stub, never from a literal in the page.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { openPaletteTools } from './palette-helpers.js'

test.use({ locale: 'en-GB', timezoneId: 'Europe/London' })

const PRICES = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { usd: 7, gbp: 6 },
  yearly: { usd: 48, gbp: 40 },
}

const VIEWPORTS = [[390, 844], [1440, 900]]

async function prepare(page) {
  await page.route('**/api/get-prices*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(PRICES)),
  }))
  await signIn(page, { plan: 'free' })
}

for (const [width, height] of VIEWPORTS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height } })

    test('Settings prices Free in pounds, not dollars', async ({ page }) => {
      watch(page, `a free account in Britain reading Settings (${width}px)`)
      await prepare(page)
      await go(page, '/settings')
      await page.locator('#settab-support').click()
      const section = page.locator('#set-support')
      await expect(section).toBeVisible()
      // Settled on the GBP price first, so the page really is in pounds.
      await expect(section.locator('.sub-tier-pro .sub-tier-amount')).toContainText('£')

      const free = section.locator('.sub-tier-free .sub-tier-amount')
      await expect(free).toHaveText('£0')
      await expect(section.locator('.sub-tier-free')).not.toContainText('$')
    })

    test('the upgrade dialog frees days 1 to 7 and charges on day 8', async ({ page }) => {
      watch(page, `a free account reading the Pro dialog's timeline (${width}px)`)
      await prepare(page)
      await go(page, '/create/palette')

      // A Pro colour system raises the wall; the control is on the toolbar or in Extra tools.
      let system = page.getByRole('button', { name: 'Colour system' }).first()
      if (!(await system.isVisible())) {
        const tools = await openPaletteTools(page)
        system = tools.getByRole('button', { name: 'Colour system' })
      }
      await chooseMenuOption(page, system, { label: 'Analogous, Pro' })
      const modal = page.getByRole('dialog', { name: /Unlock every colour system/i })
      await expect(modal).toBeVisible()

      // Yearly is the default selection and the cadence that carries the trial:
      // the free trial starts today, and the first payment lands 7 days on.
      const steps = modal.locator('.pg-ly:not(.is-off) .pg-stops')
      await expect(steps).toHaveCount(1)
      // Dates are worked out in the page's own clock and zone, as the dialog does.
      const when = (days) => page.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) }, days)
      await expect(steps).toContainText('your 7-day free trial starts')
      await expect(steps).toContainText(await when(7))
      await expect(steps).not.toContainText(await when(6))
      await expect(steps).toContainText('£40')
    })
  })
}
