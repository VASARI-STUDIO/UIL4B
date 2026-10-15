// /plans AND SETTINGS → SUBSCRIPTION AGREE ON THE FACTS.
//
// Both surfaces read src/config/planFacts.js. This drives both pages with the
// same live prices and asserts, for every cadence Settings offers, that /plans
// offers it too with the same per-month amount, the same billed total and the
// same trial length; and that every figure and Pro-only export name on a Free or
// Pro line in Settings is also on /plans. The two pages phrase things
// differently (Settings lists points, /plans is a ledger), so the comparison is
// of facts, not of sentences.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { proOnlyFormats } from '../../src/config/exportFormats.js'

const PRICES = {
  monthly: { usd: 7 }, yearly: { usd: 48 },
  source: { monthly: 'live', yearly: 'live' },
  currencyAvailability: { monthly: { usd: true }, yearly: { usd: true } },
}

test.use({ locale: 'en-US', timezoneId: 'America/New_York' })

test('every cadence, amount, billed total and plan figure on Settings matches /plans', async ({ page }) => {
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
  expect(labels, 'Settings does not offer exactly Monthly and Yearly').toEqual(['Monthly', 'Yearly'])

  const settings = {}
  for (const label of labels) {
    await tabs.filter({ hasText: label }).click()
    settings[label] = {
      amount: (await section.locator('.sub-tier-pro .sub-tier-amount').innerText()).trim(),
      billed: (await section.locator('.sub-tier-pro .sub-tier-sub').innerText()).trim(),
    }
  }
  const tierLines = async (tier) => (await section.locator(`.sub-tier-${tier} .sub-tier-list li`).allInnerTexts())
    .map((t) => t.trim()).filter(Boolean)
  const freeLines = await tierLines('free')
  const proLines = await tierLines('pro')
  const lines = [...freeLines, ...proLines]
  expect(lines.length).toBeGreaterThan(6)

  // Then /plans, the same cadences.
  await go(page, '/plans')
  const group = page.getByRole('radiogroup', { name: 'Billing' })
  const planLabels = (await group.locator('.pr-billing-opt').allInnerTexts()).map((t) => t.split('·')[0].trim())
  expect(planLabels, 'the two pages offer different cadences').toEqual(labels)
  for (const label of labels) {
    await group.locator('label', { hasText: new RegExp(`^${label}`) }).click()
    await expect(group.getByRole('radio', { name: new RegExp(`^${label}`) })).toBeChecked()
    const head = page.locator('.pr-head--pro')
    await expect(head.locator('.pr-amt'), `${label}: /plans does not show ${settings[label].amount}`)
      .toHaveText(settings[label].amount)
    const body = await head.innerText()
    // Every money figure and trial length in Settings' billed line is on /plans.
    for (const money of settings[label].billed.match(/\$\d[\d,.]*/g) || []) {
      expect(body, `${label}: Settings bills ${money} and /plans does not say so`).toContain(money)
    }
    for (const [, days] of settings[label].billed.matchAll(/(\d+)-day/g)) {
      expect(body, `${label}: Settings promises a ${days}-day trial and /plans does not`)
        .toMatch(new RegExp(`\\b${days}[- ]days?\\b`))
    }
  }

  // Every limit on a Settings line is compared with the /plans cell that holds
  // it, row by row and plan by plan, so a wrong number on one surface cannot be
  // covered by the same digits turning up somewhere else on the other.
  const plansText = await page.locator('main').innerText()
  expect(plansText.length, 'read nothing from /plans — this test would pass vacuously').toBeGreaterThan(500)
  const plansCell = async (rowLabel, plan) => {
    const row = page.locator('main tr').filter({ has: page.getByRole('rowheader', { name: rowLabel, exact: true }) })
    await expect(row, `/plans has no "${rowLabel}" row`).toHaveCount(1)
    const text = await row.locator('td').nth(plan === 'free' ? 0 : 1).innerText()
    return text.replace(/^(Free|Pro)\s*/, '').replace(/\s+/g, ' ').trim()
  }
  const claimed = new Set()
  for (const [plan, planLines] of [['free', freeLines], ['pro', proLines]]) {
    for (const line of planLines) {
      const ai = line.match(/^(\d+) AI generations a day, (\d+) a month$/)
      if (ai) {
        expect(await plansCell('AI generations', plan), `Settings says "${line}" and the ${plan} cell on /plans differs`)
          .toBe(`${ai[1]} a day, ${ai[2]} a month`)
        claimed.add(line)
      }
      const saved = line.match(/^(\d+) saved projects and (\d+) custom icons$/)
      if (saved) {
        expect(await plansCell('Saved projects', plan), `Settings says "${line}" and the saved-projects cell on /plans differs`).toBe(saved[1])
        expect(await plansCell('Custom icons', plan), `Settings says "${line}" and the custom-icons cell on /plans differs`).toBe(saved[2])
        claimed.add(line)
      }
      if (/^Unlimited saved projects and custom icons$/.test(line)) {
        expect(await plansCell('Saved projects', plan), `Settings says "${line}" and /plans does not`).toBe('Unlimited')
        expect(await plansCell('Custom icons', plan), `Settings says "${line}" and /plans does not`).toBe('Unlimited')
        claimed.add(line)
      }
      const systems = line.match(/^All (\d+) colour systems\b/)
      if (systems) {
        expect(await plansCell('Colour systems', plan), `Settings says "${line}" and /plans differs`)
          .toMatch(new RegExp(`^All ${systems[1]}\\b`))
        claimed.add(line)
      }
      if (/^All \w+ tools$/.test(line)) {
        expect(plansText, `Settings says "${line}" and /plans does not`).toContain(line)
        claimed.add(line)
      }
    }
  }
  // A line that carries a figure no check above reads is a new fact this test
  // has not been taught; fail it rather than let it go unchecked.
  for (const line of lines) {
    const figures = line.replace(/UIL4B/g, '').match(/\d+/g) || []
    expect(figures.length === 0 || claimed.has(line), `Settings line "${line}" has figures this test does not compare with /plans`).toBe(true)
  }
  // The Pro-only exports are named on both pages.
  const settingsText = lines.join('\n')
  for (const format of proOnlyFormats()) {
    expect(settingsText, `Settings no longer names "${format.name}"`).toContain(format.name)
    expect(plansText, `/plans no longer names "${format.name}"`).toContain(format.name)
  }
})
