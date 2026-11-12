// DRAFT, NOT YET RUN. Target path: tests/user-sim/v3-pro-checkout.spec.js
// /checkout and /checkout/return, the V3 pages: the "today, then, later" bill,
// the billing-period switch, the failure panels and the return states.
//
// One test() per journey. The shared journeys run at 1440 and 390; the narrow
// one at 320.
//
// Not run, because the page does not carry the feature:
//   - the cancelled-checkout notice
//   - the already-Pro card (a Pro account is sent to /settings; one test below)
//   - the return page's ledger, details and Copy button
//
// Money never reaches Stripe: a stand-in `window.Stripe` and answered
// /api/create-checkout, /api/get-prices and /api/checkout-status. Every amount
// and the trial length is read from the plan ladder, never typed here. The
// clock is pinned to Tuesday 10 November 2026 so the bill's dates can be
// hand-checked (a 7-day trial ends Tuesday 17 November; a year later is
// Wednesday 17 November 2027).
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { PRO_POINTS } from '../../src/config/planFacts.js'
import { formatCurrency } from '../../src/utils/currency.js'

const LADDER = Object.fromEntries(PLAN_LADDER.map((p) => [p.id, p]))
const PRICES = {
  source: Object.fromEntries(PLAN_LADDER.map((p) => [p.liveKey, 'live'])),
  ...Object.fromEntries(PLAN_LADDER.map((p) => [p.liveKey, { usd: p.approvedTotal }])),
}
const money = (n) => formatCurrency(n, 'usd')
const YEARLY = money(LADDER.yearly.approvedTotal)
const MONTHLY = money(LADDER.monthly.approvedTotal)
const NOW = new Date(2026, 10, 10, 10, 0, 0)

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, wide: true },
  { name: '390', width: 390, height: 844, wide: false },
]

test.use({ locale: 'en-US' })

// Stripe.js: one embedded Checkout at a time, like the real one. The last
// instance's options stay on window.__stubCheckout so a test can raise Stripe's
// callbacks.
function stripeStandIn() {
  const state = { live: 0, refused: 0 }
  window.__stubEmbeds = state
  const unused = () => { throw new Error('not part of this stand-in') }
  window.Stripe = () => ({
    elements: unused,
    createToken: unused,
    createPaymentMethod: unused,
    confirmCardPayment: unused,
    createEmbeddedCheckoutPage: async (options) => {
      if (state.live > 0) { state.refused += 1; throw new Error('You cannot have multiple Embedded Checkout objects.') }
      state.live += 1
      let secret
      try { secret = await options.fetchClientSecret() } catch (e) { state.live -= 1; throw e }
      window.__stubCheckout = options
      let node = null
      return {
        mount(el) { node = el; el.setAttribute('data-stub-session', secret); el.textContent = 'Stripe Checkout' },
        unmount() { node?.removeAttribute('data-stub-session'); if (node) node.textContent = '' },
        destroy() { this.unmount(); state.live -= 1 },
      }
    },
  })
}

// Answers /api/create-checkout with a stub secret. `respond(n, interval)` may
// return { status, body } to refuse call number n (1-based), or nothing to answer it.
async function answerSessions(page, respond = () => null) {
  const calls = []
  await page.route('**/api/create-checkout', async (route) => {
    const { interval } = JSON.parse(route.request().postData() || '{}')
    calls.push(interval)
    const refusal = await respond(calls.length, interval)
    if (refusal) {
      await route.fulfill({ status: refusal.status, contentType: 'application/json', body: JSON.stringify(refusal.body) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ clientSecret: `cs_test_stub_${interval}` }) })
  })
  return calls
}

const liveBody = () => JSON.stringify(withAvailability(PRICES))
// `answer(n)` returns a body string, 'fail' for a 500, or awaits a held promise.
async function answerPrices(page, answer = () => liveBody()) {
  let n = 0
  await page.route('**/api/get-prices*', async (route) => {
    n += 1
    const out = await answer(n)
    if (out === 'fail') await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    else await route.fulfill({ status: 200, contentType: 'application/json', body: out })
  })
}

// Opens /checkout the way a buyer arrives. `session` and `prices` shape the stubs.
async function openCheckout(page, vp, url, { signedIn = true, session, prices, account = {} } = {}) {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await page.clock.setFixedTime(NOW)
  const calls = await answerSessions(page, session)
  await page.addInitScript(stripeStandIn)
  watch(page, 'a buyer at checkout')
  if (signedIn) await signIn(page, { plan: 'free', ...account })
  await answerPrices(page, prices)
  await go(page, url)
  await expectRendered(page)
  return calls
}

const nokey = (page) => page.locator('.ck-nokey')
const mountedForm = (page) => page.locator('.ck-frame [data-stub-session]')
// Waits for the payment form, or skips when the build carries no Stripe key.
async function formMounted(page) {
  await expect(nokey(page).or(mountedForm(page))).toBeVisible()
  test.skip(await nokey(page).isVisible(), 'this build carries no Stripe publishable key, so the form never opens')
  return mountedForm(page)
}
// Same wait for the failure panel, which also needs the key to be reached.
async function failurePanel(page) {
  const heading = page.getByRole('heading', { name: /Checkout unavailable|Verify your email to continue/ })
  await expect(nokey(page).or(heading)).toBeVisible()
  test.skip(await nokey(page).isVisible(), 'this build carries no Stripe publishable key, so the form never asks for a session')
  return heading
}

const group = (page) => page.getByRole('radiogroup', { name: 'Billing period' })
const period = (page, label) => group(page).getByRole('radio', { name: new RegExp(`^${label}`) })
const stops = (page) => page.locator('.ck-bill .ck-stops:not(.gh) .ck-stop')
const fresh = (page) => page.url().replace(/^https?:\/\/[^/]+/, '')
const boxOf = async (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) } })
const ringOf = async (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: s.outlineWidth } })

for (const vp of VIEWPORTS) {
  test.describe(`at ${vp.name}`, () => {
    test('1 reading the bill: today, then, later; switch Monthly and back; Terms opens apart', async ({ page }) => {
      expect(LADDER.yearly.trialDays, 'the dates below are worked for a 7-day trial').toBe(7)
      expect(LADDER.monthly.trialDays).toBe(0)
      await openCheckout(page, vp, '/checkout?plan=yearly')

      await expect(page.locator('main'), 'the checkout is one main landmark').toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Upgrade to Pro')
      await expect(period(page, 'Yearly')).toBeChecked()

      await expect(stops(page)).toHaveCount(3)
      await expect(stops(page).nth(0).locator('.ck-lab')).toHaveText('Today')
      await expect(stops(page).nth(0).locator('.ck-fig')).toHaveText(money(0))
      await expect(stops(page).nth(0).locator('.ck-sen')).toHaveText(`Pro opens on this account and your ${LADDER.yearly.trialDays}-day free trial starts.`)
      await expect(stops(page).nth(1).locator('.ck-lab')).toHaveText('Tuesday 17 November')
      await expect(stops(page).nth(1).locator('.ck-fig')).toHaveText(YEARLY)
      await expect(stops(page).nth(2).locator('.ck-lab')).toHaveText('Wednesday 17 November 2027')
      await expect(stops(page).nth(2).locator('.ck-fig')).toHaveText(YEARLY)
      const later = stops(page).nth(2).locator('.ck-sen')
      await expect(later).toHaveText(`Nothing more to pay for 12 months. Then ${YEARLY} again, every year until you cancel.`)
      expect(await later.innerText(), 'the yearly later line says "free"').not.toMatch(/free/i)

      await period(page, 'Monthly').click()
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
      await expect(period(page, 'Monthly')).toBeChecked()
      await expect(stops(page)).toHaveCount(2)
      await expect(stops(page).nth(0).locator('.ck-fig')).toHaveText(MONTHLY)
      await expect(stops(page).nth(0).locator('.ck-sen')).toHaveText('Monthly has no trial, so the first payment is taken today.')
      await expect(stops(page).nth(1).locator('.ck-lab')).toHaveText('Then')
      await expect(stops(page).nth(1).locator('.ck-fig')).toHaveText(`${MONTHLY} a month`)
      await expect(stops(page).nth(1).locator('.ck-sen')).toHaveText('Renews every month until you cancel.')
      await expect(page.locator('.ck-bill .ck-other').first()).toHaveText(`Yearly works out at ${money(LADDER.yearly.approvedTotal / 12)} a month.`)

      await period(page, 'Yearly').click()
      await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(stops(page)).toHaveCount(3)
      await expect(stops(page).nth(2).locator('.ck-sen')).toHaveText(`Nothing more to pay for 12 months. Then ${YEARLY} again, every year until you cancel.`)
      await expect(page.locator('.ck-bill .ck-other').first()).toHaveText(`Monthly is ${MONTHLY} a month, with no free trial.`)

      const terms = page.getByRole('link', { name: 'Terms' })
      await expect(terms).toHaveAttribute('href', '/terms')
      await expect(terms).toHaveAttribute('target', '_blank')
      const [popup] = await Promise.all([page.waitForEvent('popup'), terms.click()])
      await expect.poll(() => new URL(popup.url()).pathname).toBe('/terms')
      await popup.close()
      await expect(page, 'the checkout tab was left').toHaveURL(/\/checkout\?plan=yearly$/)
    })

    test('2 keyboard only: Tab reaches the switch with a ring, arrows and Home/End change it, Shift+Tab goes back', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly')
      const back = page.getByRole('link', { name: 'Back to Plans' })
      await back.focus()
      await page.keyboard.press('Tab')
      await expect(period(page, 'Yearly'), 'Tab from Back to Plans lands on the checked period').toBeFocused()
      expect(await ringOf(period(page, 'Yearly')), 'no ring on the focused period').toEqual({ style: 'solid', width: '2px' })

      await page.keyboard.press('ArrowRight')
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
      await expect(period(page, 'Monthly')).toBeChecked()
      await expect(period(page, 'Monthly'), 'the choice and the focus move together').toBeFocused()
      await page.keyboard.press('End')
      await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(period(page, 'Yearly')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
      await expect(period(page, 'Monthly')).toBeFocused()
      await expect(stops(page)).toHaveCount(2)

      await expect(period(page, 'Yearly')).toHaveAttribute('tabindex', '-1')
      await page.keyboard.press('Shift+Tab')
      await expect(back, 'Shift+Tab from the switch returns to Back to Plans').toBeFocused()

      if (!vp.wide) {
        const summary = page.locator('.ck-det > summary')
        await summary.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('.ck-det')).toHaveAttribute('open', '')
        await page.keyboard.press('Space')
        await expect(page.locator('.ck-det')).not.toHaveAttribute('open', '')
      }
    })

    test('3 a refusal: the heading takes focus with a ring, Try again by keyboard asks again, no raw error text', async ({ page }) => {
      const calls = await openCheckout(page, vp, '/checkout?plan=yearly', {
        session: () => ({ status: 500, body: { error: 'Stripe exploded: Failed to fetch (stack trace)' } }),
      })
      const heading = await failurePanel(page)
      await expect(heading).toHaveText('Checkout unavailable')
      await expect(heading, 'the refusal was not given focus').toBeFocused()
      const text = await page.locator('.ck').innerText()
      expect(text).toContain('Checkout couldn’t start. Try again in a moment.')
      expect(text, 'a raw server or network message reached the page').not.toMatch(/Failed to fetch|exploded|stack trace/i)
      await expect(page.getByRole('alert')).toBeVisible()
      const before = await boxOf(page.locator('.ck-sum'))

      await page.keyboard.press('Tab')
      const again = page.getByRole('button', { name: 'Try again' })
      await expect(again).toBeFocused()
      expect((await again.boundingBox()).height, 'Try again is under 44px').toBeGreaterThanOrEqual(44)
      await page.keyboard.press('Enter')
      await expect.poll(() => calls.length, 'Try again did not ask for a new session').toBe(2)
      await expect(heading, 'the second refusal did not take focus').toBeFocused()
      expect(await ringOf(heading), 'a keyboard user sees focus vanish: no ring on the refusal').toEqual({ style: 'solid', width: '2px' })
      const after = await boxOf(page.locator('.ck-sum'))
      expect(Math.abs(after.top - before.top) + Math.abs(after.height - before.height), 'the summary moved on retry').toBeLessThanOrEqual(1)

      if (!vp.wide) await expect(page.getByRole('button', { name: 'Report a problem' })).toBeVisible()
      await period(page, 'Monthly').click()
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
      await expect(page.getByRole('heading', { name: 'Checkout unavailable' }), 'the old period’s refusal stayed').toHaveCount(0)
    })

    test('3b a refusal then Try again that works lands focus on the payment form', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly', {
        session: (n) => (n === 1 ? { status: 500, body: { error: 'x' } } : null),
      })
      await failurePanel(page)
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      await mountedForm(page).waitFor()
      await expect(page.getByRole('group', { name: 'Payment form' }), 'focus was lost with the panel that was used').toBeFocused()
      await expect(page.getByRole('heading', { name: 'Checkout unavailable' })).toHaveCount(0)
      const frame = await boxOf(page.locator('.ck-frame:not(.stat)'))
      expect(frame.height, 'the payment frame is shorter than the form it holds').toBeGreaterThanOrEqual(vp.wide ? 560 : 485)
    })

    test('4 outage: price "Unavailable", no figure, Retry live pricing keeps focus and nothing moves', async ({ page }) => {
      let release
      const held = new Promise((r) => { release = r })
      let phase = 'down'
      const calls = await openCheckout(page, vp, '/checkout?plan=yearly', {
        prices: async () => (phase === 'down' ? 'fail' : (await held, liveBody())),
      })
      await expect(page.locator('.ck-out .ck-fig')).toHaveText('Unavailable')
      await expect(page.locator('.ck-bill')).not.toContainText(/[$€£]\s?\d/)
      await expect(page.locator('.ck-frame'), 'a payment form opened with no live price').toHaveCount(0)
      expect(calls, 'a session was requested with no live price').toHaveLength(0)
      await expect(page.getByText('Stripe didn’t answer, so no checkout can start.').locator('visible=true')).toHaveCount(1)
      await expect(page.locator('.ck-fp')).toContainText('Everything on Free keeps working.')

      const retry = page.getByRole('button', { name: 'Retry live pricing' })
      await retry.focus()
      const before = await boxOf(page.locator('.ck-sum'))
      phase = 'hold'
      await page.keyboard.press('Enter')
      const checking = page.getByRole('button', { name: 'Checking Stripe…' })
      await expect(checking).toBeFocused()
      await expect(checking).toHaveAttribute('aria-busy', 'true')
      await expect(checking).toHaveAttribute('aria-disabled', 'true')
      const during = await boxOf(page.locator('.ck-sum'))
      expect(Math.abs(during.height - before.height), 'the summary jumped while Stripe was being asked again').toBeLessThanOrEqual(1)
      release()
      await expect(page.locator('.ck-out')).toHaveCount(0)
      await expect(stops(page)).toHaveCount(3)
      await expect(stops(page).nth(1).locator('.ck-fig')).toHaveText(YEARLY)
    })

    test('5 backing out: Escape does nothing, Back to Plans and Back to settings lead out and Back returns', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly')
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Upgrade to Pro')

      await page.getByRole('link', { name: 'Back to Plans' }).click()
      await expect(page).toHaveURL(/\/plans\?billing=yearly$/)
      await page.goBack()
      await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Upgrade to Pro')

      const settings = page.getByRole('link', { name: 'Back to settings' })
      await expect(settings).toHaveAttribute('href', '/settings')
      await settings.click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/settings')
    })

    test('6 signed out: the gate says why, the choice stays, Log in to continue opens the sign-in', async ({ page }) => {
      let sessionRequests = 0
      await page.route('**/api/create-checkout', (route) => { sessionRequests += 1; return route.abort() })
      await openCheckout(page, vp, '/checkout?plan=yearly', { signedIn: false })
      await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(page.getByRole('heading', { name: 'Log in or create an account to pay' })).toHaveCount(1)
      await expect(page.getByText('Your yearly choice stays selected.')).toBeVisible()
      await period(page, 'Monthly').click()
      await expect(page.getByText('Your monthly choice stays selected.')).toBeVisible()
      await expect(stops(page)).toHaveCount(2)

      const login = page.getByRole('button', { name: 'Log in to continue' })
      await expect(login, 'one log-in button, not two').toHaveCount(1)
      expect((await login.boundingBox()).height).toBeGreaterThanOrEqual(44)
      if (!vp.wide) {
        const gate = await boxOf(login)
        expect(gate.top, 'the log-in sits below the bill on a phone').toBeLessThan((await boxOf(page.locator('.ck-bill'))).top)
      }
      await login.click()
      await expect(page.getByRole('dialog', { name: 'Log in to continue' })).toBeVisible()
      await expect(page, 'the choice left the URL').toHaveURL(/\/checkout\?plan=monthly$/)
      expect(sessionRequests, 'a payment session was requested without an account').toBe(0)
    })

    test('7 payment in progress: the switch is locked, the reason is said, nothing moves', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly')
      await formMounted(page)
      const radios = group(page).getByRole('radio')
      await period(page, 'Yearly').focus()
      const sum = await boxOf(page.locator('.ck-sum'))
      const panel = await boxOf(page.locator('.ck-fp'))

      await page.evaluate(() => window.__stubCheckout.onAnalyticsEvent({ eventType: 'checkoutSubmitted', details: {} }))
      for (const r of await radios.all()) await expect(r).toHaveAttribute('aria-disabled', 'true')
      await expect(page.getByRole('status').filter({ hasText: 'Payment in progress, so the billing period can’t change now.' })).toBeVisible()
      await expect(period(page, 'Yearly'), 'focus was lost when the switch locked').toBeFocused()

      await period(page, 'Monthly').click({ force: true })
      await page.keyboard.press('ArrowRight')
      await expect(page, 'the period changed while payment was in progress').toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(stops(page)).toHaveCount(3)
      const sumAfter = await boxOf(page.locator('.ck-sum'))
      const panelAfter = await boxOf(page.locator('.ck-fp'))
      expect(Math.abs(sumAfter.height - sum.height) + Math.abs(panelAfter.height - panel.height), 'the layout shifted when the switch locked').toBeLessThanOrEqual(2)

      await page.evaluate(() => window.__stubCheckout.onAnalyticsEvent({ eventType: 'checkoutSubmitFailed', details: {} }))
      for (const r of await radios.all()) await expect(r).not.toHaveAttribute('aria-disabled', 'true')
      await period(page, 'Monthly').click()
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    })

    test('9 waiting: the price check shows dashes and no payable form, then the figures arrive', async ({ page }) => {
      let release
      const held = new Promise((r) => { release = r })
      const calls = await openCheckout(page, vp, '/checkout?plan=yearly', { prices: async () => { await held; return liveBody() } })
      await expect(page.getByRole('status').filter({ hasText: 'Checking the live Stripe price…' })).toBeVisible()
      await expect(page.locator('.ck-frame')).toHaveAttribute('aria-busy', 'true')
      for (const fig of await page.locator('.ck-bill .ck-stops:not(.gh) .ck-fig').all()) await expect(fig).toHaveText('—')
      await expect(page.locator('.ck-bill')).not.toContainText(/[$€£]\s?\d/)
      await expect(page.getByText('Checking the live price…').first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Terms' }), 'the Terms were not shown while the price loaded').toBeVisible()
      expect(calls, 'a session was requested before the price was live').toHaveLength(0)
      release()
      await expect(stops(page).nth(1).locator('.ck-fig')).toHaveText(YEARLY)
    })

    test('9b waiting: while the form loads the words, the bill and the Terms are already there; the ready frame holds its height', async ({ page }) => {
      let release
      const held = new Promise((r) => { release = r })
      await openCheckout(page, vp, '/checkout?plan=yearly', { session: async () => { await held; return null } })
      const loading = page.getByRole('status').filter({ hasText: 'Loading payment form…' })
      await expect(nokey(page).or(loading)).toBeVisible()
      test.skip(await nokey(page).isVisible(), 'this build carries no Stripe publishable key')
      await expect(page.getByRole('group', { name: 'Payment form' })).toHaveAttribute('aria-busy', 'true')
      await expect(stops(page)).toHaveCount(3)
      await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible()
      await expect(page.locator('.checkout-renewal')).not.toBeEmpty()
      release()
      await mountedForm(page).waitFor()
      await expect(page.getByRole('group', { name: 'Payment form' })).toHaveAttribute('aria-busy', 'false')
      const frame = await boxOf(page.locator('.ck-frame:not(.stat)'))
      expect(frame.height, 'the ready payment frame is below its reserved height').toBeGreaterThanOrEqual(vp.wide ? 560 : 485)
    })

    test('10 the period lives in the URL: ?plan= and the ?period= alias, a switch rewrites it, a reload keeps it', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?period=monthly')
      await expect(period(page, 'Monthly'), '?period= was ignored').toBeChecked()
      await expect(stops(page)).toHaveCount(2)
      await go(page, '/checkout?period=monthly&plan=yearly')
      await expect(period(page, 'Monthly'), '?period= does not win over ?plan=').toBeChecked()
      await go(page, '/checkout?period=yearly')
      await expect(period(page, 'Yearly')).toBeChecked()
      await period(page, 'Monthly').click()
      await expect.poll(() => fresh(page), 'the alias was left in the URL beside the new choice').toBe('/checkout?plan=monthly')
      await page.reload()
      await expect(period(page, 'Monthly'), 'the choice did not survive a reload').toBeChecked()
      await expect(page.locator('main')).toHaveCount(1)
    })

    test('11 an unusable link lands on the invalid-selection card, which takes focus', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=weekly')
      const h1 = page.getByRole('heading', { level: 1, name: 'Invalid checkout selection' })
      await expect(h1).toBeFocused()
      await expect(page.getByText('No payment session was created.')).toBeVisible()
      await expect(page.getByRole('radiogroup', { name: 'Billing period' })).toHaveCount(0)
      await expect(page.locator('main')).toHaveCount(1)
      await page.getByRole('link', { name: 'Back to Plans' }).click()
      await expect(page).toHaveURL(/\/plans$/)
    })

    test('12 What’s included: open beside the form wide, folded on a phone', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly')
      if (vp.wide) {
        await expect(page.locator('.ck-det')).toHaveCount(0)
        for (const point of PRO_POINTS) await expect(page.locator('.ck-pts').getByText(point, { exact: true })).toBeVisible()
      } else {
        const det = page.locator('.ck-det')
        await expect(det).not.toHaveAttribute('open', '')
        await expect(det.locator('.ck-pts')).toBeHidden()
        await det.locator('summary').click()
        for (const point of PRO_POINTS) await expect(det.locator('.ck-pts').getByText(point, { exact: true })).toBeVisible()
        const formFirst = await page.evaluate(() => {
          const panel = document.querySelector('.ck-fp')
          const link = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Back to settings'))
          return !!(panel.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)
        })
        expect(formFirst, 'Back to settings comes before the payment panel in the tab order').toBe(true)
      }
    })

    test('13 the sign-in expired: the message names the fix, Log in opens the sign-in, the terms stay', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly', {
        session: () => ({ status: 401, body: { error: 'token expired' } }),
      })
      await failurePanel(page)
      const sentence = vp.wide ? 'Your sign-in has expired. Log in again to continue.' : 'Your sign-in has expired. Log in again below to continue.'
      await expect(page.getByText(sentence).locator('visible=true')).toHaveCount(1)
      await expect(page.getByRole('button', { name: 'Try again' }), 'a retry would fail the same way').toHaveCount(0)
      await expect(page.locator('.checkout-renewal'), 'the renewal sentence went with the form').not.toBeEmpty()
      await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible()
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('14 verify email: the prompt takes focus, Send link says so, "I’ve verified, try again" brings the form back', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly', {
        session: (n) => (n === 1 ? { status: 403, body: { error: 'unverified', code: 'email-unverified' } } : null),
        account: { emailVerified: false },
      })
      const heading = await failurePanel(page)
      await expect(heading).toHaveText('Verify your email to continue')
      await expect(heading).toBeFocused()
      const panel = page.locator('.ck-fp')
      await expect(panel.getByRole('status').filter({ hasText: 'We sent a link to free.user@uil4b.test' })).toBeVisible()
      await panel.getByRole('button', { name: 'Send link' }).click()
      await expect(panel.getByRole('status').filter({ hasText: 'Link sent to free.user@uil4b.test' })).toBeVisible()
      await expect(panel.getByRole('button', { name: 'Resend link' })).toBeVisible()

      const verified = page.getByRole('button', { name: 'I’ve verified, try again' })
      await verified.focus()
      await page.keyboard.press('Enter')
      await mountedForm(page).waitFor()
      await expect(page.getByRole('group', { name: 'Payment form' }), 'focus fell to the page body when the prompt was replaced').toBeFocused()
    })

    test('15 no price for this period: Switch to Monthly works and Yearly returns to the outage', async ({ page }) => {
      const body = JSON.stringify(withAvailability({ ...PRICES, source: { ...PRICES.source, [LADDER.yearly.liveKey]: 'fallback' } }))
      const calls = await openCheckout(page, vp, '/checkout?plan=yearly', { prices: () => body })
      await expect(page.locator('.ck-out .ck-fig')).toHaveText('Unavailable')
      await expect(page.getByText('No USD price for Yearly yet.')).toBeVisible()
      await expect(page.getByText('Monthly can be bought in USD.')).toBeVisible()
      await expect(page.locator('.ck-frame')).toHaveCount(0)
      await page.getByRole('button', { name: 'Switch to Monthly' }).click()
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
      await expect(period(page, 'Monthly'), 'focus was lost with the button').toBeFocused()
      await expect(stops(page).nth(0).locator('.ck-fig')).toHaveText(MONTHLY)
      await period(page, 'Yearly').click()
      await expect(page.locator('.ck-out .ck-fig')).toHaveText('Unavailable')
      expect(calls.filter((i) => i === 'yearly'), 'a yearly session was requested with no live yearly price').toHaveLength(0)
    })

    test('16 a Pro account has nothing to buy and is sent to Settings', async ({ page }) => {
      await openCheckout(page, vp, '/checkout?plan=yearly', { account: { plan: 'pro' } })
      await expect.poll(() => new URL(page.url()).pathname).toBe('/settings')
      await expect(page.getByRole('heading', { name: 'Upgrade to Pro' })).toHaveCount(0)
    })
  })
}

test('17 both columns stay in view only on a wide, tall screen', async ({ page }) => {
  await openCheckout(page, VIEWPORTS[0], '/checkout?plan=yearly')
  const position = () => page.evaluate(() => [...document.querySelectorAll('.ck-grid > .ck-col, .ck-grid > .ck-fp')].map((el) => getComputedStyle(el).position))
  for (const [width, height, expected] of [[1440, 900, 'sticky'], [1100, 900, 'sticky'], [1440, 800, 'static'], [1000, 1000, 'static'], [390, 900, 'static']]) {
    await page.setViewportSize({ width, height })
    expect(await position(), `${width}x${height}`).toEqual([expected, expected])
  }
})

test('18 at 320 nothing scrolls sideways, targets hold 44px, dates stack and the first charge is on the first screen', async ({ page }) => {
  const small = { width: 320, height: 640, wide: false }
  await openCheckout(page, small, '/checkout?plan=yearly')
  await formMounted(page)
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(await sideways(), 'the page scrolls sideways at 320').toBeLessThanOrEqual(0)
  for (const seg of await group(page).getByRole('radio').all()) expect((await seg.boundingBox()).height, 'a period target is under 44px').toBeGreaterThanOrEqual(44)
  expect((await page.getByRole('link', { name: 'Back to Plans' }).boundingBox()).height).toBeGreaterThanOrEqual(44)
  const row = stops(page).nth(1).locator('.ck-row')
  expect(await row.evaluate((el) => getComputedStyle(el).flexDirection), 'the date and the amount do not stack').toBe('column')
  const firstCharge = await stops(page).nth(1).locator('.ck-fig').boundingBox()
  expect(firstCharge.y + firstCharge.height, 'the first charge is below the first screen').toBeLessThanOrEqual(small.height)

  await page.unroute('**/api/create-checkout')
  await answerSessions(page, () => ({ status: 500, body: { error: 'x' } }))
  await page.reload()
  await failurePanel(page)
  expect(await sideways(), 'the error panel scrolls sideways at 320').toBeLessThanOrEqual(0)
  for (const control of [page.getByRole('button', { name: 'Try again' }), page.getByRole('button', { name: 'Report a problem' })]) {
    expect((await control.boundingBox()).height, 'a control is under 44px').toBeGreaterThanOrEqual(44)
  }
})

async function openReturn(page, vp, url, { status = 200, body, hold, account = {} } = {}) {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await page.clock.setFixedTime(NOW)
  watch(page, 'a buyer sent back from Stripe')
  await signIn(page, { plan: 'free', ...account })
  const answers = []
  await page.route('**/api/checkout-status*', async (route) => {
    answers.push(route.request().url())
    if (hold) await hold
    const out = typeof body === 'function' ? body(answers.length) : body
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(out) })
  })
  await go(page, url)
  return answers
}
const returnH1 = (page, name) => page.getByRole('heading', { level: 1, name })

for (const vp of VIEWPORTS) {
  test.describe(`return at ${vp.name}`, () => {
    test('R1 success: the result, a reference, two ways on, the heading holds focus', async ({ page }) => {
      await openReturn(page, vp, '/checkout/return?session_id=cs_test_abcd1234', {
        body: { status: 'complete', mode: 'subscription', subscriptionActive: true },
      })
      const h1 = returnH1(page, 'You’re on UI L4B Pro')
      await expect(h1).toBeVisible()
      await expect(h1, 'the result heading did not take focus').toBeFocused()
      await expect(page.locator('main')).toHaveCount(1)
      await expect(page.getByRole('status')).toHaveText('Your Pro subscription is active across the toolkit.')
      await expect(page.locator('.ck-ref')).toContainText('Confirmation reference')
      await expect(page.locator('.ck-ref code')).toHaveText('…abcd1234')
      const start = page.getByRole('link', { name: 'Start building' })
      await expect(start, 'the first-run link goes anywhere but /projects').toHaveAttribute('href', '/projects')
      await expect(page.getByRole('link', { name: 'Manage subscription' })).toHaveAttribute('href', '/settings')
      await page.keyboard.press('Tab')
      await expect(start, 'Tab from the heading does not reach the first action').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Manage subscription' })).toBeFocused()
      await start.click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/projects')
    })

    test('R2 a trial: the same heading, the day the trial ends, nothing charged before it', async ({ page }) => {
      const ends = new Date(2026, 10, 17, 12, 0, 0).getTime()
      await openReturn(page, vp, '/checkout/return?session_id=cs_test_trial0001', {
        body: { status: 'complete', mode: 'subscription', subscriptionActive: true },
        account: { subscription: { status: 'trialing', interval: 'yearly', trialEndsAt: ends, currentPeriodEnd: ends, cancelAtPeriodEnd: false } },
      })
      await expect(returnH1(page, 'You’re on UI L4B Pro')).toBeFocused()
      await expect(page.getByRole('status')).toContainText('Your free trial runs until November 17, 2026, and you won’t be charged before then.')
    })

    test('R3 confirming, then payment received: announced, no actions yet, focus follows the new heading', async ({ page }) => {
      let release
      const hold = new Promise((r) => { release = r })
      await openReturn(page, vp, '/checkout/return?session_id=cs_test_wait5678', {
        hold, body: { status: 'complete', mode: 'subscription', subscriptionActive: false },
      })
      await expect(returnH1(page, 'Confirming your checkout…')).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('This only takes a moment.')
      await expect(page.locator('.ck-ract'), 'actions shown before the result is known').toHaveCount(0)
      await expect(page.locator('.ck-ref')).toHaveCount(0)
      release()
      const settled = returnH1(page, 'Payment received')
      await expect(settled).toBeFocused()
      await expect(page.getByRole('status')).toContainText('Pro access is still being attached to this account.')
      await expect(page.locator('.ck-ref code')).toHaveText('…wait5678')
      await expect(page.getByRole('link', { name: 'Start building' })).toHaveAttribute('href', '/projects')
    })

    test('R4 failed: what to check first, Settings, Plans, Report a problem', async ({ page }) => {
      await openReturn(page, vp, '/checkout/return?session_id=cs_test_fail9999', { status: 500, body: { error: 'x' } })
      const h1 = returnH1(page, 'We couldn’t confirm your checkout')
      await expect(h1).toBeFocused()
      await expect(page.getByText('Check Settings → Plan and billing before you try again, so you don’t pay twice.')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Back to settings' })).toHaveAttribute('href', '/settings')
      await expect(page.getByRole('link', { name: 'Back to Plans' })).toHaveAttribute('href', '/plans')
      await expect(page.locator('.ck-ref code')).toHaveText('…fail9999')
      await expect(page.getByText(/You’re on UI L4B Pro|Payment received/), 'it claims a payment it could not confirm').toHaveCount(0)
      expect(fresh(page), 'it bounced away from the return page').toContain('/checkout/return')
      if (!vp.wide) await expect(page.getByRole('button', { name: 'Report a problem' })).toBeVisible()
      await page.getByRole('link', { name: 'Back to Plans' }).click()
      await expect(page).toHaveURL(/\/plans$/)
    })

    test('R5 no session id: says nothing was charged and leads to Plans', async ({ page }) => {
      await openReturn(page, vp, '/checkout/return', { body: { status: 'expired' } })
      await expect(returnH1(page, 'This link has no payment attached')).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('Nothing was charged from this page. Pick a plan to start again.')
      await expect(page.locator('.ck-ref'), 'a reference shown with no session').toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Back to Plans' })).toHaveAttribute('href', '/plans')
      await expect(page.getByRole('link', { name: 'Back to settings' })).toHaveAttribute('href', '/settings')
    })
  })
}
