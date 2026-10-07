// /checkout lets a buyer change billing period without leaving the page, and
// go back to /plans with the period they chose.
//
//   · the period group is a radio group of the ladder's buyable cadences; a
//     change rewrites ?plan= and the summary (cadence, price, trial) follows it
//   · the session request the embedded checkout makes carries the new plan
//   · "Back to Plans" opens /plans with that period selected
//   · at 390px the group is one row of targets at least 44px tall
//   · signed out, the page renders and only the payment form asks for a login;
//     at 390px that ask sits above the features list
//   · stepping through periods makes one session request and one
//     checkout_started; a failed request for a period already left is ignored
//   · "Loading payment form…" fills the panel between one form and the next
//   · once payment is submitted the period radios are locked
//   · a form that never arrives, or Stripe.js failing to load, ends in the
//     panel's error with a Try again that works
//
// Every amount and trial length comes from the plan ladder, never typed here.
//
// The session request only fires in a build that carries a Stripe publishable
// key: without one the page shows "Payments aren't configured" and never
// starts the embed. Every signed-in test installs a stand-in `window.Stripe`
// and answers /api/create-checkout itself, so nothing reaches Stripe; the two
// session tests skip in a keyless build.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { formatCurrency } from '../../src/utils/currency.js'

const LADDER = Object.fromEntries(PLAN_LADDER.map((p) => [p.id, p]))
// /api/get-prices' shape, filled from the ladder's own amounts.
const PRICES = {
  source: Object.fromEntries(PLAN_LADDER.map((p) => [p.liveKey, 'live'])),
  ...Object.fromEntries(PLAN_LADDER.map((p) => [p.liveKey, { usd: p.approvedTotal }])),
}
const amountOf = (id) => formatCurrency(LADDER[id].approvedTotal, 'usd')

const PERSONA = 'a free account changing billing period at checkout'

test.use({ locale: 'en-US' })

async function stubPrices(page) {
  await page.route('**/api/get-prices', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(PRICES),
  }))
}

// `ownStubs`: the test has already installed its own Stripe stand-in and
// session answers (a later route would take precedence over them).
async function openCheckout(page, plan, { ownStubs = false } = {}) {
  if (!ownStubs) {
    await answerSessions(page)
    await stubStripe(page)
  }
  watch(page, PERSONA)
  await signIn(page, { plan: 'free' })
  await stubPrices(page)
  await go(page, `/checkout?plan=${plan}`)
  await expectRendered(page)
}

const group = (page) => page.getByRole('radiogroup', { name: 'Billing period' })
const period = (page, label) => group(page).getByRole('radio', { name: new RegExp(`^${label}`) })

test.describe('changing billing period at checkout', () => {
  test('the period group offers every buyable cadence with the URL\'s one checked', async ({ page }) => {
    await openCheckout(page, 'yearly')
    const buyable = PLAN_LADDER.filter((p) => p.checkoutPlan)
    await expect(group(page).getByRole('radio')).toHaveCount(buyable.length)
    for (const p of buyable) await expect(period(page, p.label)).toBeVisible()
    await expect(period(page, LADDER.yearly.label)).toBeChecked()
  })

  test('a new period rewrites ?plan= and the summary, by click and by arrow key', async ({ page }) => {
    await openCheckout(page, 'yearly')
    const summary = page.locator('.checkout-summary-card')
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Yearly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('yearly'))

    await period(page, LADDER.quarterly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=quarterly$/)
    await expect(period(page, LADDER.quarterly.label)).toBeChecked()
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Quarterly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('quarterly'))
    await expect(summary.locator('.checkout-plan-per')).toHaveText('per quarter')
    await expect(summary.locator('.checkout-trial')).toContainText(`${LADDER.quarterly.trialDays}-day free trial`)

    // Native radios: an arrow key moves the choice and the focus together.
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    await expect(period(page, LADDER.monthly.label)).toBeChecked()
    await expect(period(page, LADDER.monthly.label)).toBeFocused()
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Monthly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('monthly'))
    // Monthly carries no trial in the ladder, so the summary promises none.
    expect(LADDER.monthly.trialDays).toBe(0)
    await expect(summary.locator('.checkout-trial')).toHaveCount(0)
  })

  test('Back to Plans opens /plans with the chosen period selected', async ({ page }) => {
    await openCheckout(page, 'yearly')
    await period(page, LADDER.quarterly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=quarterly$/)

    const back = page.getByRole('link', { name: 'Back to Plans' })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/plans\?billing=quarterly$/)
    await expectRendered(page)
    await expect(page.getByRole('tab', { name: new RegExp(`^${LADDER.quarterly.label}`) })).toHaveAttribute('aria-selected', 'true')
  })

  test('at 390px the group is one row of 44px targets, and Back to Plans is one too', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openCheckout(page, 'monthly')
    const boxes = await group(page).locator('.checkout-period-opt').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      const label = el.querySelector('.checkout-period-label')
      return { top: Math.round(r.top), height: r.height, clipped: label.scrollWidth > label.clientWidth + 0.5 }
    }))
    expect(boxes.length).toBeGreaterThan(1)
    expect(new Set(boxes.map((b) => b.top)).size, 'the period group wrapped onto a second row').toBe(1)
    for (const b of boxes) {
      expect(b.height, 'a period target is shorter than 44px').toBeGreaterThanOrEqual(44)
      expect(b.clipped, 'a period label does not fit its segment').toBe(false)
    }
    const back = await page.getByRole('link', { name: 'Back to Plans' }).boundingBox()
    expect(back.height, 'Back to Plans is shorter than 44px on a phone').toBeGreaterThanOrEqual(44)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'the page scrolls sideways at 390px').toBeLessThanOrEqual(0)
  })

  test('signed out, the summary and period choice work and only payment asks for a login', async ({ page }) => {
    const sessionRequests = []
    await page.route('**/api/create-checkout', (route) => {
      sessionRequests.push(route.request().url())
      return route.abort()
    })
    // Stripe.js loads only for a signed-in buyer, so a signed-out visit never
    // fetches it, with or without a publishable key in the build.
    const stripeScripts = []
    await page.route('https://js.stripe.com/**', (route) => {
      stripeScripts.push(route.request().url())
      return route.abort()
    })
    watch(page, 'a signed-out visitor choosing a billing period at checkout')
    await stubPrices(page)
    await go(page, '/checkout?plan=yearly')
    await expectRendered(page)

    await expect(page, 'a signed-out visitor was sent away from checkout').toHaveURL(/\/checkout\?plan=yearly$/)
    await expect(period(page, LADDER.yearly.label)).toBeChecked()
    await period(page, LADDER.quarterly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=quarterly$/)
    const summary = page.locator('.checkout-summary-card')
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Quarterly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('quarterly'))

    await expect(page.locator('.checkout-form')).toContainText('Log in or create an account to pay')
    const login = page.locator('.checkout-form').getByRole('button', { name: 'Log in to continue' })
    await expect(login).toBeVisible()
    await login.click()
    await expect(page.getByRole('dialog', { name: 'Log in to continue' })).toBeVisible()
    // The popup opens over the page: the chosen period is still the URL's.
    await expect(page).toHaveURL(/\/checkout\?plan=quarterly$/)
    expect(sessionRequests, 'a payment session was requested without an account').toHaveLength(0)
    expect(stripeScripts, 'Stripe.js was fetched without an account').toHaveLength(0)
  })

  test('the session request carries the newly chosen plan', async ({ page }) => {
    const intervals = await answerSessions(page)
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const mounted = await embedOrSkip(page)

    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_yearly')
    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_monthly')
    expect(intervals.at(-1), 'the last session request was not for the chosen plan').toBe('monthly')
    expect(intervals).toContain('yearly')
    expect(await page.evaluate(() => window.__stubEmbeds), 'an embedded Checkout was left behind').toEqual({ live: 1, refused: 0 })
  })

  test('a period changed while the first session is still loading replaces it cleanly', async ({ page }) => {
    let release
    const held = new Promise((resolve) => { release = resolve })
    const intervals = await answerSessions(page, { hold: 'yearly', until: held })
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const notConfigured = page.locator('.checkout-form', { hasText: /Payments aren.t configured/ })
    await expect.poll(async () => intervals.length > 0 || await notConfigured.isVisible()).toBe(true)
    test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so the embed never asks for a session')
    expect(intervals).toEqual(['yearly'])

    // The yearly session is still in flight when the buyer switches.
    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    release()

    const mounted = page.locator('.checkout-form [data-stub-session]')
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_monthly')
    expect(intervals).toEqual(['yearly', 'monthly'])
    expect(await page.evaluate(() => window.__stubEmbeds), 'a second embedded Checkout was refused or one was left behind').toEqual({ live: 1, refused: 0 })
  })

  test('a failed session for a period already left is ignored', async ({ page }) => {
    let release
    const held = new Promise((resolve) => { release = resolve })
    const intervals = await answerSessions(page, { hold: 'yearly', until: held, failHeld: true })
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const notConfigured = page.locator('.checkout-form', { hasText: /Payments aren.t configured/ })
    await expect.poll(async () => intervals.length > 0 || await notConfigured.isVisible()).toBe(true)
    test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so the embed never asks for a session')

    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    // The yearly request fails after the buyer has moved on.
    release()

    const mounted = page.locator('.checkout-form [data-stub-session]')
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_monthly')
    await expect(page.locator('.checkout-form'), 'the old period’s failure was shown').not.toContainText('Checkout unavailable')
    expect(intervals).toEqual(['yearly', 'monthly'])
    expect(await page.evaluate(() => window.__stubEmbeds)).toEqual({ live: 1, refused: 0 })
  })

  test('stepping through periods requests one session and sends checkout_started once', async ({ page }) => {
    const intervals = await answerSessions(page)
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const mounted = await embedOrSkip(page)
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_yearly')

    // Two changes in quick succession: only the one the buyer stops on gets a session.
    await period(page, LADDER.quarterly.label).click()
    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_monthly')
    expect(intervals, 'a session was requested for a period passed through').toEqual(['yearly', 'monthly'])

    const started = await page.evaluate(() => (window.vaq || [])
      .filter((q) => q[0] === 'event' && q[1]?.name === 'checkout_started'))
    expect(started, 'checkout_started was sent more than once in one visit').toHaveLength(1)
  })

  test('"Loading payment form…" fills the panel from one form until the next mounts', async ({ page }) => {
    let release
    const held = new Promise((resolve) => { release = resolve })
    await answerSessions(page, { hold: 'monthly', until: held })
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const mounted = await embedOrSkip(page)
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_yearly')
    const status = page.locator('.checkout-form').getByRole('status')
    await expect(status).toHaveText('')

    await period(page, LADDER.monthly.label).click()
    // The yearly form is gone at once, and the panel says what is happening.
    await expect(mounted).toHaveCount(0)
    await expect(status).toHaveText('Loading payment form…')
    await expect(status).toBeVisible()
    const panel = await page.locator('.checkout-form').boundingBox()
    expect(panel.height, 'the panel collapsed while loading').toBeGreaterThanOrEqual(420)

    release()
    await expect(page.locator('.checkout-form [data-stub-session]')).toHaveAttribute('data-stub-session', 'cs_test_stub_monthly')
    await expect(status).toHaveText('')
  })

  test('once payment is submitted the period radios are locked', async ({ page }) => {
    await openCheckout(page, 'yearly')
    await embedOrSkip(page)
    const radios = group(page).getByRole('radio')
    for (const r of await radios.all()) await expect(r).toBeEnabled()

    await page.evaluate(() => window.__stubCheckout.onAnalyticsEvent({ eventType: 'checkoutSubmitted', details: {} }))
    for (const r of await radios.all()) await expect(r, 'a period can still change after payment was submitted').toBeDisabled()
    await expect(page.locator('.checkout-period-locked')).toBeVisible()

    // A payment that failed hands the choice back.
    await page.evaluate(() => window.__stubCheckout.onAnalyticsEvent({ eventType: 'checkoutSubmitFailed', details: {} }))
    for (const r of await radios.all()) await expect(r).toBeEnabled()

    // The session finishes by redirecting to its return page, so the embed is
    // given no completion callback to clash with that.
    const hasOnComplete = await page.evaluate(() => 'onComplete' in window.__stubCheckout)
    expect(hasOnComplete, 'the embed was given an onComplete callback').toBe(false)
  })

  test('a form that never arrives ends in the error with Try again', async ({ page }) => {
    await page.clock.install()
    // The yearly session never answers, so the monthly form waits behind it.
    const intervals = await answerSessions(page, { hold: 'yearly', until: new Promise(() => {}) })
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const notConfigured = page.locator('.checkout-form', { hasText: /Payments aren.t configured/ })
    await expect.poll(async () => intervals.length > 0 || await notConfigured.isVisible()).toBe(true)
    test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so the embed never asks for a session')

    await period(page, LADDER.monthly.label).click()
    await expect(page.locator('.checkout-form').getByRole('status')).toHaveText('Loading payment form…')
    // Past the period debounce, until the monthly form is waiting in line…
    await page.clock.fastForward('00:01')
    await expect(page.locator('.checkout-form .checkout-embed')).toHaveCount(1)
    // …then past the time it may wait.
    await page.clock.fastForward('00:21')
    const form = page.locator('.checkout-form')
    await expect(form).toContainText('Checkout unavailable')
    await expect(form).toContainText('taking too long')
    await expect(form.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('Stripe.js failing to load shows an error, and Try again loads it', async ({ page }) => {
    // An empty script loads without defining window.Stripe: Stripe.js's own
    // "not available" failure, with no network error in the console.
    let serveStripe = false
    const loads = []
    await page.route('https://js.stripe.com/**', (route) => {
      loads.push(serveStripe)
      return route.fulfill({
        status: 200, contentType: 'application/javascript', body: serveStripe ? `(${stripeStandIn.toString()})()` : '',
      })
    })
    await answerSessions(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const form = page.locator('.checkout-form')
    const notConfigured = form.filter({ hasText: /Payments aren.t configured/ })
    await expect(notConfigured.or(form.filter({ hasText: 'Checkout unavailable' }))).toBeVisible()
    test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so Stripe.js is never loaded')

    await expect(form).toContainText('The payment form couldn’t load')
    serveStripe = true
    await form.getByRole('button', { name: 'Try again' }).click()
    await expect(form.locator('[data-stub-session]'), 'Try again reused the failed load').toHaveAttribute('data-stub-session', 'cs_test_stub_yearly')
    expect(loads.at(-1)).toBe(true)
  })

  test('at 390px signed out, the log-in sits above the features list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    watch(page, 'a signed-out visitor at checkout on a phone')
    await stubPrices(page)
    await go(page, '/checkout?plan=yearly')
    await expectRendered(page)

    await expect(page.getByText('Log in or create an account to pay', { exact: true }).locator('visible=true')).toHaveCount(1)
    const login = page.getByRole('button', { name: 'Log in to continue' })
    await expect(login, 'one log-in button, not two').toHaveCount(1)
    await expect(login).toBeVisible()
    const button = await login.boundingBox()
    const features = await page.locator('.checkout-features').boundingBox()
    expect(button.y + button.height, 'the log-in comes after the features list on a phone').toBeLessThanOrEqual(features.y)
    expect(button.height).toBeGreaterThanOrEqual(44)
    await login.click()
    await expect(page.getByRole('dialog', { name: 'Log in to continue' })).toBeVisible()
  })
})

// Answers /api/create-checkout with a stub client secret per interval, so no
// request reaches Stripe. `hold` keeps one interval's answer back until
// `until`; with `failHeld` that answer is a server error.
async function answerSessions(page, { hold, until, failHeld = false } = {}) {
  const intervals = []
  await page.route('**/api/create-checkout', async (route) => {
    const { interval } = JSON.parse(route.request().postData() || '{}')
    intervals.push(interval)
    if (interval === hold) {
      await until
      if (failHeld) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Stub session failure' }) })
        return
      }
    }
    await route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ clientSecret: `cs_test_stub_${interval}` }),
    })
  })
  return intervals
}

// A stand-in for Stripe.js (loadStripe uses an existing window.Stripe rather
// than fetching the script). Like the real one it allows a single embedded
// Checkout per page, counted from the moment it is created, and refuses a
// second until the first is destroyed. The last instance's options are kept
// on window.__stubCheckout so a test can raise Stripe's callbacks.
function stripeStandIn() {
  const state = { live: 0, refused: 0 }
  window.__stubEmbeds = state
  const unused = () => { throw new Error('not part of this stand-in') }
  window.Stripe = () => ({
    // The shape a wrapper checks before accepting an object as Stripe.
    elements: unused,
    createToken: unused,
    createPaymentMethod: unused,
    confirmCardPayment: unused,
    createEmbeddedCheckoutPage: async (options) => {
      if (state.live > 0) {
        state.refused += 1
        throw new Error('You cannot have multiple Embedded Checkout objects.')
      }
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

async function stubStripe(page) {
  await page.addInitScript(stripeStandIn)
}

async function embedOrSkip(page) {
  const notConfigured = page.locator('.checkout-form', { hasText: /Payments aren.t configured/ })
  const mounted = page.locator('.checkout-form [data-stub-session]')
  await expect(notConfigured.or(mounted)).toBeVisible()
  test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so the embed never asks for a session')
  return mounted
}
