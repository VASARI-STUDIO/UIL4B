// A price counts only when the price service says it is live for the buyer's
// currency. Where that is not so, the surface says so and offers no checkout.
//
//   · /checkout prints no per-month rate before the prices have settled
//   · /checkout and Settings call the outage when a 200 answer carries nothing
//     but fallback defaults, and offer Retry
//   · the upgrade modal lists only live cadences, and with none shows its
//     prices-unavailable state
//   · /plans keeps the unavailable note and its Retry inside the note stack, so
//     the Pro button does not move when a cadence lands unavailable
//
// Amounts come from the stubbed answer, never typed into an assertion.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-US' })

const LIVE = { source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } }
// What the route sends when Stripe has nothing: the default table, flagged as such.
const FALLBACK_ONLY = {
  source: { monthly: 'fallback', yearly: 'fallback' },
  monthly: { usd: 7 },
  yearly: { usd: 48 },
  currencyAvailability: { monthly: { usd: false }, yearly: { usd: false } },
}
// Monthly live, Yearly served from the default table.
const MONTHLY_ONLY = {
  source: { monthly: 'live', yearly: 'fallback' },
  monthly: { usd: 7 },
  yearly: { usd: 48 },
  currencyAvailability: { monthly: { usd: true }, yearly: { usd: false } },
}

const answer = (body) => (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const stub = (page, body) => page.route('**/api/get-prices*', answer(withAvailability(body)))

test.describe('/checkout before the prices settle', () => {
  test('prints no per-month rate until the chosen offer is available', async ({ page }) => {
    watch(page, 'a free account opening checkout while the price service is slow')
    let release
    const held = new Promise((resolve) => { release = resolve })
    await page.route('**/api/get-prices*', async (route) => {
      await held
      await answer(withAvailability(LIVE))(route)
    })
    await signIn(page, { plan: 'free' })
    await page.goto('/checkout?plan=yearly', { waitUntil: 'domcontentloaded' })

    const note = page.locator('.checkout-plan-note')
    await expect(note).toHaveText('Checking the live price…')
    expect(await note.innerText(), 'a rate was printed before any price had landed').not.toMatch(/\/mo|[$€£]\s?\d/)

    release()
    // POSITIVE CONTROL: once the live price lands the same line names the rate.
    await expect(note).toContainText('/mo')
    await expect(note).toContainText('billed yearly')
  })
})

test.describe('a 200 answer made only of fallback prices is an outage', () => {
  test('/checkout says pricing is unreachable, offers Retry, and recovers when a live price lands', async ({ page }) => {
    watch(page, 'a free account at checkout while Stripe has no live prices')
    await stub(page, FALLBACK_ONLY)
    await signIn(page, { plan: 'free' })
    await go(page, '/checkout?plan=yearly')

    const note = page.locator('.checkout-plan-note')
    await expect(note).toContainText('Live pricing is unreachable')
    await expect(note).not.toContainText('null')
    await expect(page.locator('.checkout-plan-amount')).not.toHaveText(/\d/)
    const retry = page.getByRole('button', { name: 'Retry live pricing' })
    await expect(retry).toBeVisible()

    await page.unroute('**/api/get-prices*')
    await stub(page, LIVE)
    await retry.click()
    await expect(note).toContainText('/mo')
    await expect(retry).toHaveCount(0)
  })

  test('Settings says pricing is unreachable, offers Retry, and recovers when a live price lands', async ({ page }) => {
    watch(page, 'a free account comparing plans while Stripe has no live prices')
    await stub(page, FALLBACK_ONLY)
    await page.addInitScript(() => { try { localStorage.setItem('vs-settings-section', 'support') } catch { /* private mode */ } })
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    const pro = page.locator('.sub-tier-pro')
    await expect(pro.locator('.sub-tier-sub')).toContainText('Live pricing is unreachable')
    await expect(pro.locator('.sub-tier-amount')).toHaveText('Unavailable')
    const retry = pro.getByRole('button', { name: 'Retry live pricing' })
    await expect(retry).toBeVisible()

    await page.unroute('**/api/get-prices*')
    await stub(page, LIVE)
    await retry.click()
    await expect(pro.locator('.sub-tier-amount')).not.toHaveText('Unavailable')
    await expect(retry).toHaveCount(0)
  })
})

test.describe('the upgrade modal offers only live cadences', () => {
  // The modal is raised from the palette's colour-system wall.
  async function raiseWall(page) {
    const system = page.getByRole('button', { name: 'Colour system' }).first()
    if (!(await system.isVisible())) await page.getByRole('button', { name: /^Extra tools/ }).click()
    await chooseMenuOption(page, system, { label: 'Analogous, Pro' })
    const modal = page.getByRole('dialog', { name: /Unlock every colour system/i })
    await expect(modal).toBeVisible()
    return modal
  }

  test('with only fallback prices it lists no cadence and shows the prices-unavailable state', async ({ page }) => {
    watch(page, 'a free account hitting a wall while Stripe has no live prices')
    await stub(page, FALLBACK_ONLY)
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    const modal = await raiseWall(page)

    await expect(modal.locator('.ui-pro-plans-err')).toContainText(/couldn.t load current prices/i)
    await expect(modal.locator('.ui-pro-plan'), 'a fallback cadence was listed').toHaveCount(0)
    expect(await modal.locator('.ui-pro-body').innerText(), 'a default amount was printed as a price').not.toMatch(/[$€£]\s?\d/)
    await expect(modal.getByRole('button', { name: 'Upgrade to Pro' })).toHaveCount(0)
  })

  test('with one live cadence it lists that one and quotes no default beside it', async ({ page }) => {
    watch(page, 'a free account hitting a wall while only Monthly is live')
    await stub(page, MONTHLY_ONLY)
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    const modal = await raiseWall(page)

    const rows = modal.locator('.ui-pro-plan')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Monthly')
    await expect(rows.first()).toContainText('$7')
    await expect(modal.locator('.ui-pro-plans-err')).toHaveCount(0)
    await expect(modal.getByText('Yearly'), 'the fallback Yearly row was listed').toHaveCount(0)
  })
})

test.describe('/plans keeps the unavailable state in the note slot', () => {
  const proCta = (page) => page.locator('.pr-head--pro').locator('.pr-cta--pro, [aria-disabled="true"]').first()
  const topOf = async (page) => Math.round((await proCta(page).boundingBox()).y + await page.evaluate(() => window.scrollY))

  for (const width of [390, 1440]) {
    test(`at ${width}px the note and its Retry sit inside the stack, and the Pro button stays put`, async ({ page }) => {
      watch(page, 'a visitor choosing a cadence the service cannot price')
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await stub(page, MONTHLY_ONLY)
      await go(page, '/plans')
      const pro = page.locator('.pr-head--pro')
      await expect(pro.locator('.pr-amt')).toBeVisible()

      // Monthly is the cadence that is live; Yearly is the one that is not.
      const group = page.getByRole('radiogroup', { name: 'Billing' })
      const choose = (name) => group.locator('label', { hasText: new RegExp(`^${name}`) }).click()
      await choose('Monthly')
      await expect(pro.locator('.pr-amt')).toHaveText('$7')
      const live = await topOf(page)

      await choose('Yearly')
      await expect(pro.locator('.pr-amt')).toHaveText('Unavailable')
      const note = pro.locator('#pricing-noprice')
      await expect(note).toContainText('no checkout will be started')
      await expect(pro.locator('.pr-stack #pricing-noprice'), 'the unavailable note left the note stack').toHaveCount(1)
      const retry = pro.locator('.pr-stack').getByRole('button', { name: 'Retry live pricing' })
      await expect(retry, 'Retry left the note stack').toBeVisible()
      expect(await topOf(page), 'the Pro button moved when the cadence landed unavailable').toBe(live)

      await choose('Monthly')
      await expect(pro.locator('.pr-amt')).toHaveText('$7')
      expect(await topOf(page), 'the Pro button did not return').toBe(live)
    })
  }
})
