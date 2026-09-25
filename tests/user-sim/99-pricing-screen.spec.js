// /plans — the design's Pricing screen (src/pages/Pricing.jsx, built from
// "UIL4B - Spectrum.dc.html"). Two behaviours
// the legacy specs never covered, because the legacy page did not have them in
// this shape:
//
//   1. THE BILLING TOGGLE. The design's segmented pill with the design's three cadences —
//      Monthly, Quarterly, Yearly (quarterly
//      is live in Stripe and switched on) — each with the LIVE saving in the
//      design's yellow wash. Every figure it shows is computed here
//      from the stubbed /api/get-prices answer, never typed, so a page that
//      starts typing a price goes red.
//   2. THE PRO CTA FLOW. This page IS /plans, so its Pro button starts the real
//      upgrade: signed in, straight to /checkout for the chosen cadence; signed
//      out, through the sign-in flow and on to that same checkout.
//
// The suite's preview has no serverless functions, so /api/get-prices is
// stubbed with production's own answer shape. The outage path — which is what
// the preview shows without a stub — is asserted too, because a pricing page
// that cannot name a price must not start a checkout.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'

// Production's /api/get-prices answer, trimmed to the currency under test.
const LIVE = {
  source: { monthly: 'live', quarterly: 'live', yearly: 'live' },
  monthly: { usd: 7 },
  quarterly: { usd: 18 },
  yearly: { usd: 48 },
}
// Each cadence's saving against monthly, from the live amounts — the rule
// planLadder.js applies (per-month rate vs monthly, whole percent).
const saving = (total, months) => Math.round((1 - (total / months) / LIVE.monthly.usd) * 100)
const SAVING = saving(LIVE.yearly.usd, 12)
const SAVING_Q = saving(LIVE.quarterly.usd, 3)
const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`

const PERSONA = 'someone choosing how to pay for Pro'

test.use({ locale: 'en-US' })

async function stubPrices(page, body = LIVE, status = 200) {
  await page.route('**/api/get-prices', (route) => route.fulfill({
    status, contentType: 'application/json', body: JSON.stringify(body),
  }))
}

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(`^${name}`) })
const pro = (page) => page.locator('.pr-plan--pro')

test.describe('the billing toggle', () => {
  test('offers the design\'s three cadences, yearly first-selected, each with its live saving', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    const tabs = page.getByRole('tablist', { name: 'Choose how to pay for Pro' }).getByRole('tab')
    await expect(tabs).toHaveCount(3)
    await expect(tabs.nth(0)).toHaveText(/^Monthly/)
    await expect(tabs.nth(1)).toHaveText(/^Quarterly/)
    await expect(tabs.nth(2)).toHaveText(/^Yearly/)

    await expect(tab(page, 'Yearly')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'Yearly').locator('.pr-billing-save')).toHaveText(`${SAVING}% off`)
    await expect(tab(page, 'Quarterly').locator('.pr-billing-save')).toHaveText(`${SAVING_Q}% off`)
    await expect(tab(page, 'Monthly').locator('.pr-billing-save'), 'monthly claims a saving against itself').toHaveCount(0)

    // The Pro card on yearly: per-month, the monthly rate struck through, the
    // real total and the trial, and the saving as the design's badge.
    await expect(pro(page).locator('.pr-plan-amount')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(pro(page).locator('.pr-plan-per')).toHaveText('/ month')
    await expect(pro(page).locator('.pr-plan-was')).toHaveText(`was ${money(LIVE.monthly.usd)}`)
    await expect(pro(page).locator('.pr-plan-note'))
      .toHaveText(`Billed ${money(LIVE.yearly.usd)} yearly, 7-day free trial, cancel any time. Keep every export you made.`)
    await expect(pro(page).locator('.pr-plan-badge')).toHaveText(`${SAVING}% OFF`)
  })

  test('switching to monthly re-prices the card, by click and by arrow key', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    // Keyboard first: the tablist's roving focus is the a11y contract.
    // The design's order is Monthly, Quarterly, Yearly, so one step left of Yearly is
    // Quarterly and a second is Monthly.
    await tab(page, 'Yearly').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(tab(page, 'Quarterly')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'Quarterly')).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(tab(page, 'Monthly')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'Monthly')).toBeFocused()
    await expect(tab(page, 'Yearly')).toHaveAttribute('tabindex', '-1')

    await expect(pro(page).locator('.pr-plan-amount')).toHaveText(money(LIVE.monthly.usd))
    await expect(pro(page).locator('.pr-plan-was'), 'monthly strikes through its own price').toHaveCount(0)
    await expect(pro(page).locator('.pr-plan-note')).toHaveText('Billed monthly, cancel any time. Keep every export you made.')
    await expect(pro(page).locator('.pr-plan-badge')).toHaveText('RECOMMENDED')
    await expect(pro(page)).toHaveAttribute('aria-labelledby', 'pricing-tab-monthly')

    // And back by click.
    await tab(page, 'Yearly').click()
    await expect(pro(page).locator('.pr-plan-amount')).toHaveText(money(LIVE.yearly.usd / 12))
  })

  test('quarterly is priced per month from the live quarter, with its own saving and its trial', async ({ page }) => {
    // The design's note for this cadence is "Billed $10.80 every three
    // months"; the amount is the live one, and the 7-day trial the server
    // grants quarterly (TRIAL_DAYS in api/_lib/pricing.js) is said, not only
    // yearly's.
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await tab(page, 'Quarterly').click()
    await expect(tab(page, 'Quarterly')).toHaveAttribute('aria-selected', 'true')
    await expect(pro(page).locator('.pr-plan-amount')).toHaveText(money(LIVE.quarterly.usd / 3))
    await expect(pro(page).locator('.pr-plan-was')).toHaveText(`was ${money(LIVE.monthly.usd)}`)
    await expect(pro(page).locator('.pr-plan-note'))
      .toHaveText(`Billed ${money(LIVE.quarterly.usd)} every three months, 7-day free trial, cancel any time. Keep every export you made.`)
    await expect(pro(page).locator('.pr-plan-badge')).toHaveText(`${SAVING_Q}% OFF`)
    await expect(pro(page).getByRole('link', { name: 'Upgrade to Pro' })).toBeVisible()
  })

  test('the saving badge wears the design’s tertiary yellow wash until its tab is selected', async ({ page }) => {
    // The design's chip is the tertiary #E8C547 at 16% when unselected, and
    // the page ground at 10% on the selected (ink) tab. Measured, not assumed.
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans?billing=monthly')
    await expectRendered(page)
    await expect(tab(page, 'Monthly'), '?billing=monthly no longer seeds the toggle').toHaveAttribute('aria-selected', 'true')

    const chip = tab(page, 'Yearly').locator('.pr-billing-save')
    const bg = await chip.evaluate((el) => getComputedStyle(el).backgroundColor)
    // Chrome serialises a color-mix() result as `color(srgb r g b / a)` with
    // 0–1 channels, and a plain colour as `rgba(r, g, b, a)`; read either.
    const nums = bg.match(/[\d.]+/g).map(Number)
    const srgb = bg.startsWith('color(')
    const [r, g, b] = nums.slice(0, 3).map((v) => Math.round(srgb ? v * 255 : v))
    const a = nums[3] ?? 1
    expect([r, g, b], `the saving chip is not the tertiary yellow (${bg})`).toEqual([232, 197, 71])
    expect(a).toBeCloseTo(0.16, 2)
  })

  test('?billing= seeds any offered cadence, and one the toggle cannot show falls back to yearly', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans?billing=quarterly')
    await expectRendered(page)
    await expect(tab(page, 'Quarterly')).toHaveAttribute('aria-selected', 'true')
    await go(page, '/plans?billing=lifetime')
    await expectRendered(page)
    await expect(tab(page, 'Yearly')).toHaveAttribute('aria-selected', 'true')
  })

  test('?plan= from the upgrade dialog arrives with that cadence selected', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans?plan=monthly')
    await expectRendered(page)
    await expect(tab(page, 'Monthly'), '?plan=monthly no longer seeds the toggle').toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('the Pro CTA starts the real upgrade', () => {
  test('signed in, it goes straight to checkout for the chosen cadence', async ({ page }) => {
    watch(page, 'a free account upgrading')
    await signIn(page, { plan: 'free' })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    const cta = pro(page).getByRole('link', { name: 'Upgrade to Pro' })
    await expect(cta).toHaveAttribute('href', '/checkout?plan=yearly')
    await tab(page, 'Monthly').click()
    await expect(cta).toHaveAttribute('href', '/checkout?plan=monthly')
    await cta.click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
  })

  test('signed in, quarterly reaches a quarterly checkout that says what it bills', async ({ page }) => {
    watch(page, 'a free account choosing quarterly')
    await signIn(page, { plan: 'free' })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await tab(page, 'Quarterly').click()
    const cta = pro(page).getByRole('link', { name: 'Upgrade to Pro' })
    await expect(cta).toHaveAttribute('href', '/checkout?plan=quarterly')
    await cta.click()
    await expect(page).toHaveURL(/\/checkout\?plan=quarterly$/)
    // Checkout accepts the plan (no "Invalid selection"), names the cadence,
    // states the quarterly trial, and does not call a quarter "monthly".
    await expect(page.locator('.checkout-plan-cadence')).toHaveText('Quarterly plan')
    await expect(page.getByText(/7-day free trial/).first()).toBeVisible()
    await expect(page.locator('.checkout-plan-note')).not.toContainText(/billed monthly/i)
  })

  test('signed out, it opens sign-in and then continues to that checkout', async ({ page }) => {
    watch(page, 'a visitor upgrading before they have an account')
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    const cta = pro(page).getByRole('link', { name: 'Upgrade to Pro' })
    await expect(cta).toHaveAttribute('href', '/login')
    await cta.click()

    // The sign-in flow, carrying the checkout as where to go next.
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('dialog')).toBeVisible()
    const from = await page.evaluate(() => window.history.state?.usr?.from)
    expect(from, 'the sign-in flow does not know the visitor was headed to checkout').toBe('/checkout?plan=yearly')

    // Complete it: the session exists on the next load, and /login, finding a
    // user, forwards to the destination it was handed. History state survives
    // the reload, exactly as it survives the popup's own success path.
    await signIn(page, { plan: 'free' })
    await page.reload()
    await expect(page).toHaveURL(/\/checkout\?plan=yearly$/, { timeout: 10000 })
  })

  test('a Pro account is sent to its account, not to a second checkout', async ({ page }) => {
    watch(page, 'a Pro subscriber reading the plans')
    await signIn(page, { plan: 'pro' })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(pro(page).getByRole('link', { name: 'View account details' })).toHaveAttribute('href', '/settings')
    await expect(pro(page).getByRole('link', { name: 'Upgrade to Pro' })).toHaveCount(0)
  })

  test('the button is the design’s #2A60E8 fill with #F4F7FF, at AA, in both themes', async ({ browser }) => {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ colorScheme: theme, locale: 'en-US' })
      await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
      const page = await ctx.newPage()
      await stubPrices(page)
      await go(page, '/plans')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const button = pro(page).getByRole('link', { name: 'Upgrade to Pro' })
      await expect(button).toBeVisible()
      // Polled: the button eases from its loading state into the fill (.16s).
      // Every colour is normalised through a canvas to `rgb(r, g, b)`: Chrome
      // serialises a color-mix() result as `color(srgb …)` or `oklab(…)`, and a
      // parser that only reads rgb() digits reads those as nonsense — which is
      // how a first draft of the hover check passed a failing hover.
      const read = () => button.evaluate((el) => {
        const s = getComputedStyle(el)
        const ctx = document.createElement('canvas').getContext('2d')
        const norm = (c) => {
          ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = '#000'; ctx.fillStyle = c
          ctx.fillRect(0, 0, 1, 1)
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
          return `rgb(${r}, ${g}, ${b})`
        }
        return { bg: norm(s.backgroundColor), fg: norm(s.color) }
      })
      await expect.poll(async () => (await read()).bg, { message: `${theme}: the Pro CTA fill` }).toBe('rgb(42, 96, 232)')
      const { bg, fg } = await read()
      expect(fg, `${theme}: the Pro CTA ink`).toBe('rgb(244, 247, 255)')
      const lum = (rgb) => {
        const c = rgb.match(/\d+/g).slice(0, 3).map((v) => {
          const x = Number(v) / 255
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      }
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
      expect(ratio(fg, bg), `${theme}: Pro CTA contrast`).toBeGreaterThanOrEqual(4.5)
      // HOVERED TOO. The design's hover mixes toward paper and measured
      // 3.98:1 — a button that passes at rest and fails under the pointer.
      await button.hover()
      await expect.poll(async () => (await read()).bg, { message: `${theme}: the hover never changed the fill` }).not.toBe('rgb(42, 96, 232)')
      await page.waitForTimeout(250) // the .16s background transition, settled
      const hovered = await read()
      expect(ratio(hovered.fg, hovered.bg), `${theme}: Pro CTA contrast while hovered (${hovered.bg})`).toBeGreaterThanOrEqual(4.5)
      await ctx.close()
    }
  })
})

test.describe('when the price service cannot answer', () => {
  test('the page says so, starts no checkout, and recovers on retry', async ({ page }) => {
    watch(page, 'a visitor on a bad connection')
    await stubPrices(page, { error: 'down' }, 503)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pr-plan-amount')).toHaveText('Unavailable')
    await expect(pro(page).locator('.pr-plan-amount')).toHaveClass(/is-word/)
    await expect(pro(page).locator('.pr-plan-per'), 'a cadence is printed beside no price').toHaveCount(0)
    await expect(pro(page).getByRole('link', { name: 'Upgrade to Pro' }), 'a checkout is offered with no price').toHaveCount(0)
    const off = pro(page).getByRole('button', { name: 'Pricing unavailable right now' })
    await expect(off).toHaveAttribute('aria-disabled', 'true')
    await expect(pro(page).locator('#pricing-noprice')).toContainText('no checkout will be started')
    await expect(page.locator('.pr-billing-save'), 'a saving is claimed with no prices to compute it').toHaveCount(0)

    // Recovery: the service answers on retry, and the offer returns.
    await page.unroute('**/api/get-prices')
    await stubPrices(page)
    await pro(page).getByRole('button', { name: 'Retry live pricing' }).click()
    await expect(pro(page).locator('.pr-plan-amount')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(pro(page).getByRole('link', { name: 'Upgrade to Pro' })).toBeVisible()
  })
})
