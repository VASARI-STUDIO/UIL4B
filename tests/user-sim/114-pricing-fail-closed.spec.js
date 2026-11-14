// A price counts only when the price service says it is live for the buyer's
// currency. Where that is not so, the surface says so and offers no checkout.
//
//   · /checkout prints no per-month rate before the prices have settled
//   · /checkout and Settings call the outage when a 200 answer carries nothing
//     but fallback defaults, and offer Retry
//   · the upgrade modal lists only live cadences, and with none shows its
//     prices-unavailable state
//   · /plans shows the unavailable state in the slots the buyable state uses: two
//     short note lines, and the recovery action in the Pro button's place, so the
//     Pro button does not move when a cadence lands unavailable
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
    await go(page, '/checkout?plan=yearly')

    // The bill is on the page, but every figure is a dash and its closing line
    // says the price is being checked.
    const bill = page.locator('.ck-bill .ck-stops:not(.gh)')
    await expect(bill.locator('.ck-other')).toHaveText('Checking the live price…')
    await expect(bill.locator('.ck-fig').first()).toHaveText('—')
    expect(await bill.innerText(), 'a figure or rate was printed before any price had landed').not.toMatch(/[$€£]\s?\d|a\s+month|per month|\/mo/)

    release()
    // POSITIVE CONTROL: once the live price lands the same bill carries the
    // figure and names the other period's monthly rate.
    await expect(bill.locator('.ck-fig').nth(1)).toHaveText(/^\$\d+/)
    await expect(bill).toContainText(/Monthly is \$\d+(\.\d+)?\s+a\s+month/)
    await expect(bill.locator('.ck-other')).not.toContainText('Checking the live price')
  })
})

test.describe('a 200 answer made only of fallback prices is an outage', () => {
  test('/checkout says Stripe didn’t answer, offers Retry, and recovers when a live price lands', async ({ page }) => {
    watch(page, 'a free account at checkout while Stripe has no live prices')
    await stub(page, FALLBACK_ONLY)
    await signIn(page, { plan: 'free' })
    await go(page, '/checkout?plan=yearly')

    // The outage block takes the bill's place: the word, the reason, the one action.
    const out = page.locator('.ck-bill .ck-out')
    await expect(out).toContainText('Stripe didn’t answer')
    await expect(out).not.toContainText('null')
    await expect(out.locator('.ck-fig')).toHaveText('Unavailable')
    await expect(page.locator('.ck-bill .ck-stops'), 'a bill was drawn with no live price').toHaveCount(0)
    const retry = page.getByRole('button', { name: 'Retry live pricing' })
    await expect(retry).toBeVisible()

    await page.unroute('**/api/get-prices*')
    await stub(page, LIVE)
    await retry.click()
    await expect(page.locator('.ck-bill .ck-stops:not(.gh)').locator('.ck-fig').nth(1)).toHaveText(/^\$\d+/)
    await expect(page.locator('.ck-bill .ck-out')).toHaveCount(0)
    await expect(retry).toHaveCount(0)
  })

  test('Settings says Stripe didn’t answer, offers Retry, and recovers when a live price lands', async ({ page }) => {
    watch(page, 'a free account comparing plans while Stripe has no live prices')
    await stub(page, FALLBACK_ONLY)
    await page.addInitScript(() => { try { localStorage.setItem('vs-settings-section', 'support') } catch { /* private mode */ } })
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    const pro = page.locator('.sub-tier-pro')
    await expect(pro.locator('.sub-tier-sub')).toContainText('Stripe didn’t answer')
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
  // One layer per cadence that has a live price; the loading and error layers are not prices.
  const PRICE_LAYERS = '.pg-ly:not([data-layer="ld"]):not([data-layer="er"])'
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

    await expect(modal.locator('.pg-out')).toContainText(/couldn.t load current prices/i)
    await expect(modal.locator(PRICE_LAYERS), 'a fallback cadence was listed').toHaveCount(0)
    await expect(modal.getByRole('radiogroup', { name: 'Billing' }), 'the switch offered cadences with no live price').toHaveAttribute('aria-disabled', 'true')
    expect(await modal.locator('.pg-main').innerText(), 'a default amount was printed as a price').not.toMatch(/[$€£]\s?\d/)
    await expect(modal.getByRole('button', { name: 'Upgrade to Pro' })).toHaveCount(0)
  })

  test('with one live cadence it lists that one and quotes no default beside it', async ({ page }) => {
    watch(page, 'a free account hitting a wall while only Monthly is live')
    await stub(page, MONTHLY_ONLY)
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    const modal = await raiseWall(page)

    const rows = modal.locator(PRICE_LAYERS)
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Monthly')
    await expect(rows.first()).toContainText('$7')
    await expect(modal.getByRole('radiogroup', { name: 'Billing' }), 'one live cadence needs no switch').toHaveCount(0)
    await expect(modal.locator('.pg-out')).toHaveText('')
    await expect(modal.getByText('Yearly'), 'the fallback Yearly row was listed').toHaveCount(0)
  })
})

// The Pro action's slot is `.pa-cta`; the unavailable words sit in `.pa-slot` (#pricing-noprice) and `.pa-foot`.
test.describe('/plans shows the unavailable state in the buyable state\'s slots', () => {
  const pro = (page) => page.locator('.hpl-pro')
  const slotAction = (page) => pro(page).locator('.pa-cta').locator('a, button').first()
  const topOf = async (page) => Math.round((await slotAction(page).boundingBox()).y + await page.evaluate(() => window.scrollY))

  for (const width of [1440, 390]) {
    test(`at ${width}px the Pro button stays put and becomes the switch to the live cadence`, async ({ page }) => {
      watch(page, 'a visitor choosing a cadence the service cannot price')
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await stub(page, MONTHLY_ONLY)
      await go(page, '/plans')
      await expect(pro(page).locator('.pa-amt')).toBeVisible()

      // Monthly is the cadence that is live; Yearly is the one that is not.
      const group = page.getByRole('radiogroup', { name: 'Billing' })
      const choose = (name) => group.getByRole('radio', { name: new RegExp(`^${name}`) }).click()
      await choose('Monthly')
      await expect(pro(page).locator('.pa-amt')).toHaveText('US$7')
      await expect(pro(page).locator('.pa-cta button'), 'a live price carries no button in the Pro slot').toHaveCount(0)
      await expect(pro(page).locator('.pa-cta').getByRole('link')).toHaveAttribute('href', '/checkout?plan=monthly')
      await expect(page.locator('#pricing-noprice')).toHaveCount(0)
      const live = await topOf(page)

      await choose('Yearly')
      await expect(pro(page).locator('.pa-amt')).toHaveText('Unavailable')
      const note = pro(page).locator('#pricing-noprice')
      await expect(note.locator('p')).toHaveText(['No USD price for Yearly yet.', 'Monthly can be bought in USD.'])
      const lines = await note.locator('p').evaluateAll((nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)))
      expect(Math.max(...lines), 'an unavailable line wrapped').toBeLessThan(Math.min(...lines) * 1.5)
      const sw = pro(page).locator('.pa-cta').getByRole('button', { name: 'Switch to Monthly' })
      await expect(sw, 'the recovery action is not in the Pro button slot').toBeVisible()
      await expect(pro(page).locator('.pa-cta').getByRole('link'), 'a link to checkout is offered with no price').toHaveCount(0)
      await expect(pro(page).locator('.pa-foot')).toContainText('Everything on Free keeps working.')
      expect(await topOf(page), 'the Pro button moved when the cadence landed unavailable').toBe(live)

      // The switch buys the live cadence, and focus stays on the Pro button.
      await sw.click()
      await expect(pro(page).locator('.pa-amt')).toHaveText('US$7')
      await expect(group.getByRole('radio', { name: /^Monthly/ })).toBeChecked()
      await expect(pro(page).locator('.pa-cta').getByRole('link', { name: /free trial|Upgrade to Pro/ })).toBeFocused()
      expect(await topOf(page), 'the Pro button did not return').toBe(live)
    })
  }

  test('while the price is checked, the Pro button and the closing Choose Pro are not links to checkout', async ({ page }) => {
    watch(page, 'a visitor on a slow connection')
    let release
    const held = new Promise((resolve) => { release = resolve })
    await page.route('**/api/get-prices*', async (route) => { await held; await answer(withAvailability(LIVE))(route) })
    await go(page, '/plans')
    await expect(pro(page).locator('.pa-amt')).toHaveText('—')
    await expect(pro(page).locator('.pa-cta').getByRole('link'), 'a checkout link while the price is unknown').toHaveCount(0)
    await expect(pro(page).locator('.pa-cta button')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('.hm-close').getByRole('link', { name: 'Choose Pro' }), 'closing Choose Pro links to checkout before a price').toHaveCount(0)
    release()
    await expect(pro(page).locator('.pa-amt')).toHaveText('US$4')
    await expect(pro(page).locator('.pa-cta').getByRole('link')).toHaveAttribute('href', '/checkout?plan=yearly')
    await expect(page.locator('.hm-close').getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/checkout?plan=yearly')
  })

  test('with prices already cached, Retry live pricing fetches again and lands on the buy link', async ({ page }) => {
    watch(page, 'a visitor who reached /plans after another page cached an all-fallback answer')
    let calls = 0
    await page.route('**/api/get-prices*', (route) => {
      calls += 1
      return answer(withAvailability(calls === 1 ? FALLBACK_ONLY : LIVE))(route)
    })
    await signIn(page, { plan: 'free' })
    await go(page, '/checkout?plan=yearly')
    await expect(page.locator('.ck-bill .ck-out')).toContainText('Stripe didn’t answer')
    expect(calls).toBe(1)

    // A client-side move to /plans: the page mounts with the cache already filled.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/plans')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(pro(page).locator('.pa-amt')).toHaveText('Unavailable')
    await expect(pro(page).locator('#pricing-noprice')).toContainText('Stripe didn’t answer')
    expect(calls, 'opening /plans refetched cached prices').toBe(1)
    const retry = pro(page).locator('.pa-cta').getByRole('button', { name: 'Retry live pricing' })
    await expect(retry, 'Retry is not in the Pro button slot').toBeVisible()
    await retry.click()

    await expect(pro(page).locator('.pa-amt')).toHaveText('US$4')
    expect(calls, 'Retry made no request').toBe(2)
    await expect(retry).toHaveCount(0)
    await expect(pro(page).locator('.pa-cta').getByRole('link', { name: /free trial|Upgrade to Pro/ })).toBeFocused()
  })
})
