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
//   · at 390px the features list is folded and the payment panel comes before
//     "Back to settings"; at 1440px the list is open
//   · a quick monthly, yearly, monthly ends on one live monthly form, asks for
//     no session for the monthly it passed through, and sends one
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
import { withAvailability } from './price-payload.js'
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
    status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(PRICES)),
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

    await expect(summary.locator('.checkout-plan-per')).toHaveText('per year')
    await expect(summary.locator('.checkout-trial')).toContainText(`${LADDER.yearly.trialDays}-day free trial`)

    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    await expect(period(page, LADDER.monthly.label)).toBeChecked()
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Monthly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('monthly'))
    await expect(summary.locator('.checkout-plan-per')).toHaveText('per month')
    // Monthly carries no trial in the ladder, so the summary promises none.
    expect(LADDER.monthly.trialDays).toBe(0)
    await expect(summary.locator('.checkout-trial')).toHaveCount(0)

    // Native radios: an arrow key moves the choice and the focus together.
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
    await expect(period(page, LADDER.yearly.label)).toBeChecked()
    await expect(period(page, LADDER.yearly.label)).toBeFocused()
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Yearly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('yearly'))
    await expect(summary.locator('.checkout-trial')).toContainText(`${LADDER.yearly.trialDays}-day free trial`)
  })

  test('Back to Plans opens /plans with the chosen period selected', async ({ page }) => {
    await openCheckout(page, 'yearly')
    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)

    const back = page.getByRole('link', { name: 'Back to Plans' })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/plans\?billing=monthly$/)
    await expectRendered(page)
    // Yearly is /plans' default, so Monthly being selected came from the link.
    await expect(page.getByRole('radiogroup', { name: 'Billing' }).getByRole('radio', { name: /^Monthly/ })).toBeChecked()
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

  test('at 390px the features list is folded, the payment panel comes before Back to settings, and the form starts on the first screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openCheckout(page, 'yearly')
    const included = page.locator('.checkout-included')
    await expect(included, 'the features list starts folded on a phone').not.toHaveAttribute('open', /.*/)
    await expect(included.locator('.checkout-features')).toBeHidden()
    const form = await page.locator('.checkout-form').boundingBox()
    const back = await page.getByRole('link', { name: 'Back to settings' }).boundingBox()
    expect(form.y, 'the payment panel sits below Back to settings').toBeLessThan(back.y)
    expect(form.y, 'the payment panel starts below the first screen').toBeLessThan(844)

    await included.locator('summary').click()
    await expect(included.locator('.checkout-features')).toBeVisible()
  })

  test('at 1440px the features list is open and has no summary to fold it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openCheckout(page, 'yearly')
    const included = page.locator('.checkout-included')
    await expect(included, 'the features list is folded at 1440px').toHaveAttribute('open', /.*/)
    await expect(included.locator('.checkout-features')).toBeVisible()
    await expect(included.locator('summary')).toBeHidden()
  })

  test('a period with no saving shows no empty saving line and its switch stays 48px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openCheckout(page, 'monthly')
    const save = (label) => period(page, label).locator('xpath=ancestor::label').locator('.checkout-period-save')

    // Control: a period that does carry a saving shows it, so "empty" below is
    // a real state and not just a missing element.
    await expect(save(LADDER.yearly.label)).toBeVisible()
    await expect(save(LADDER.yearly.label)).toHaveText(/^Save \d+%$/)

    // Monthly has no saving: its line is in the DOM, empty, and takes no space.
    const monthlySave = save(LADDER.monthly.label)
    await expect(monthlySave).toHaveCount(1)
    await expect(monthlySave).toBeEmpty()
    await expect(monthlySave).toHaveCSS('display', 'none')

    const monthlyBox = await period(page, LADDER.monthly.label).locator('xpath=ancestor::label').boundingBox()
    expect(monthlyBox.height, 'the Monthly switch is not 48px tall').toBeCloseTo(48, 0)
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
    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    const summary = page.locator('.checkout-summary-card')
    await expect(summary.locator('.checkout-plan-cadence')).toHaveText('Monthly plan')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('monthly'))

    await expect(page.locator('.checkout-form')).toContainText('Log in or create an account to pay')
    const login = page.locator('.checkout-form').getByRole('button', { name: 'Log in to continue' })
    await expect(login).toBeVisible()
    await login.click()
    await expect(page.getByRole('dialog', { name: 'Log in to continue' })).toBeVisible()
    // The popup opens over the page: the chosen period is still the URL's.
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
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

  test('a quick monthly, yearly, monthly ends on one monthly form and sends checkout_started once', async ({ page }) => {
    const intervals = await answerSessions(page)
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const mounted = await embedOrSkip(page)
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_yearly')

    // Back on the period the form was built for, the form is mounted again at
    // once (a new yearly session); the monthly passed through is never built.
    await period(page, LADDER.monthly.label).click()
    await period(page, LADDER.yearly.label).click()
    await period(page, LADDER.monthly.label).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    await expect(mounted).toHaveAttribute('data-stub-session', 'cs_test_stub_monthly')
    await expect(page.locator('.checkout-form'), 'a period passed through showed a failure').not.toContainText('Checkout unavailable')
    expect(intervals[0], 'the first session was not for the period the page opened on').toBe('yearly')
    expect(intervals.at(-1), 'the last session was not for the period the buyer stopped on').toBe('monthly')
    expect(intervals.filter((i) => i === 'monthly'), 'a session was requested for the monthly passed through').toHaveLength(1)
    expect(intervals.slice(0, -1).every((i) => i === 'yearly'), 'a session was requested for a period nobody stopped on').toBe(true)
    expect(intervals.length, 'more sessions were requested than periods the form was built for').toBeLessThanOrEqual(3)
    expect(await page.evaluate(() => window.__stubEmbeds), 'a second embedded Checkout was refused or one was left behind').toEqual({ live: 1, refused: 0 })

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
    const features = await page.locator('.checkout-included').boundingBox()
    expect(button.y + button.height, 'the log-in comes before the features list on a phone').toBeLessThanOrEqual(features.y)
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

// A price the service only serves from its fallback table is not a price: the
// summary says so and the payment form is never built, so no session is asked
// for and nothing is charged that the buyer was not shown.
test.describe('a cadence with no live price', () => {
  test('opens no payment form and asks for no session', async ({ page }) => {
    let sessionRequests = 0
    await page.route('**/api/create-checkout', async (route) => {
      sessionRequests += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ clientSecret: 'cs_test_stub_monthly' }) })
    })
    await stubStripe(page)
    watch(page, PERSONA)
    await signIn(page, { plan: 'free' })
    await page.route('**/api/get-prices', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(withAvailability({
        ...PRICES,
        source: { ...PRICES.source, [LADDER.monthly.liveKey]: 'fallback' },
        [LADDER.monthly.liveKey]: { usd: 7 },
      })),
    }))
    await go(page, '/checkout?plan=monthly')
    await expectRendered(page)

    const summary = page.locator('.checkout-summary-card')
    await expect(summary.locator('.checkout-plan-amount')).toHaveText('Unavailable')
    await expect(summary).toContainText('No USD price for this billing period right now')
    await expect(page.locator('.checkout-form')).toContainText('Checkout unavailable')
    await expect(page.locator('.checkout-form [data-stub-session]'), 'a payment form opened with no live price').toHaveCount(0)
    // The other cadence is live and still buyable.
    await period(page, LADDER.yearly.label).click()
    await expect(summary.locator('.checkout-plan-amount')).toHaveText(amountOf('yearly'))
    await expect(page.locator('.checkout-form')).not.toContainText('Checkout unavailable')
    expect(sessionRequests, 'a session was requested for the cadence with no live price').toBe(0)
  })

  test('a currency Stripe refuses (409) is shown as the refusal, not retried', async ({ page }) => {
    const bodies = []
    await page.route('**/api/create-checkout', async (route) => {
      bodies.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Checkout cannot be opened in AUD for this account right now. No payment session was created and nothing was charged.' }),
      })
    })
    await stubStripe(page)
    await openCheckout(page, 'yearly', { ownStubs: true })
    const notConfigured = page.locator('.checkout-form', { hasText: /Payments aren.t configured/ })
    const refused = page.locator('.checkout-form', { hasText: 'nothing was charged' })
    await expect(notConfigured.or(refused)).toBeVisible()
    test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so the embed never asks for a session')

    await expect(refused).toContainText('Checkout unavailable')
    // The refusal is announced and focused, so it is not missed below the fold.
    const alert = page.getByRole('alert').filter({ hasText: 'nothing was charged' })
    await expect(alert).toBeVisible()
    await expect(alert, 'the refusal was not given focus').toBeFocused()
    await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect((await alert.getByRole('button', { name: 'Try again' }).boundingBox()).height, 'Try again is under 44px').toBeGreaterThanOrEqual(44)
    await expect(page.locator('.checkout-form [data-stub-session]')).toHaveCount(0)
    expect(bodies.length, 'the refused session was requested again').toBe(1)
  })
})
