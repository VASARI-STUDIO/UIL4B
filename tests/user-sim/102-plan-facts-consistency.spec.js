// /plans AND SETTINGS → SUBSCRIPTION SAY THE SAME THING.
//
// Both surfaces read src/config/planFacts.js;
// this drives both pages with the same live prices and asserts that every
// cadence shows the same per-month amount and the same billed line, and that
// every Free and Pro line on Settings is a line /plans shows too.
//
// /plans is the design's Pricing screen (src/pages/Pricing.jsx).
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PRICES = {
  monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 }, lifetime: { usd: 89.99 },
  source: { monthly: 'live', quarterly: 'live', yearly: 'live', lifetime: 'live' },
  currencyAvailability: { monthly: { usd: true }, quarterly: { usd: true }, yearly: { usd: true }, lifetime: { usd: true } },
}

test.use({ locale: 'en-US', timezoneId: 'America/New_York' })

test('every cadence, amount, billed line and plan line on Settings matches /plans', async ({ page }) => {
  watch(page, 'a free account comparing Settings with /plans')
  await page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRICES) }))
  await signIn(page, { plan: 'free' })

  // Settings first: read every cadence it offers.
  await page.addInitScript(() => { try { localStorage.setItem('vs-settings-section', 'support') } catch { /* private mode */ } })
  await go(page, '/settings')
  const section = page.locator('#set-support')
  await expect(section.locator('.sub-tier-pro .sub-tier-amount')).not.toHaveText('—')
  const tabs = section.locator('.sub-billing-toggle [role="tab"]')
  const labels = (await tabs.locator('.sub-tab-label').allInnerTexts()).map((t) => t.trim())
  // Quarterly is shown whenever the ladder offers it, and this spec then
  // sees three.
  expect(labels.length, 'Settings offers fewer than two cadences').toBeGreaterThanOrEqual(2)

  const settings = {}
  for (const label of labels) {
    await tabs.filter({ hasText: label }).click()
    settings[label] = {
      amount: (await section.locator('.sub-tier-pro .sub-tier-amount').innerText()).trim(),
      billed: (await section.locator('.sub-tier-pro .sub-tier-sub').innerText()).trim(),
    }
  }
  const lines = (await section.locator('.sub-tier-list li').allInnerTexts()).map((t) => t.trim()).filter(Boolean)
  expect(lines.length).toBeGreaterThan(6)

  // Then /plans, the same cadences.
  await go(page, '/plans')
  const planTabs = page.getByRole('tablist').first().getByRole('tab')
  const planLabels = (await planTabs.allInnerTexts()).map((t) => t.split('\n')[0].trim())
  for (const label of labels) {
    expect(planLabels, `/plans does not offer ${label}`).toContain(label)
    await planTabs.filter({ hasText: label }).first().click()
    const body = await page.locator('main').innerText()
    expect(body, `${label}: /plans does not show ${settings[label].amount}`).toContain(settings[label].amount)
    expect(body, `${label}: /plans does not say "${settings[label].billed}"`).toContain(settings[label].billed)
  }
  expect(planLabels.length, 'the two pages offer a different number of cadences').toBe(labels.length)

  const plansText = await page.locator('main').innerText()
  for (const line of lines) {
    expect(plansText, `Settings says "${line}" and /plans does not`).toContain(line)
  }
})
