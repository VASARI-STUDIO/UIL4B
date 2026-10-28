// Four things a toddler-style pass found on the sign-up form and /checkout.
//
//   * sign-up refuses a password of spaces (or under six characters that are
//     not spaces) with the inline error, and sends no sign-up request; the name
//     and email inputs carry their length caps
//   * a failed payment session shows this page's own sentence, never the
//     server's text, on its own line above Try again; the raw text goes to the
//     console
//   * on a 320x640 and a 390x640 screen the floating Feedback bubble is not
//     over the sign-up form or the checkout, and the submit button can be
//     scrolled to and hit
//   * the Terms and Privacy links are at least 24px tall, and the paragraph
//     they sit in did not grow
//
// Each test names the change that turns it red. None of them was run against a
// reverted source in the session that wrote them.
//
// The session request only fires in a build that carries a Stripe publishable
// key: without one /checkout says "Payments aren't configured" and the checkout
// tests skip, as in 105-checkout-change-plan.spec.js, whose Stripe stand-in
// this one trims down.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'

test.use({ locale: 'en-US' })

// /api/get-prices' shape, filled from the ladder's own amounts, so /checkout has
// a live price and builds its payment form (without one it shows "Checkout
// unavailable" for a different reason).
const PRICES = {
  source: Object.fromEntries(PLAN_LADDER.map((p) => [p.liveKey, 'live'])),
  ...Object.fromEntries(PLAN_LADDER.map((p) => [p.liveKey, { usd: p.approvedTotal }])),
}
const stubPrices = (page) => page.route('**/api/get-prices', (route) => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(PRICES)),
}))

const RAW_SERVER_TEXT = 'Stub raw failure: key_not_for_buyers'
const GENERIC = 'Checkout couldn’t start. Try again in a moment.'
const WEAK = 'Use at least 6 characters.'

// ─────────────────────────────────────────────────────────────────────────────
// Sign-up input
// ─────────────────────────────────────────────────────────────────────────────

// Answers every Firebase Auth call the sign-up could make. A sign-up request is
// counted and refused as "email exists", so a form that wrongly sends one ends
// in a visible answer and not in a real account.
async function trackSignUps(page) {
  const signUps = []
  await page.route(/identitytoolkit\.googleapis\.com/, (route) => {
    const url = route.request().url()
    if (url.includes('accounts:signUp')) {
      signUps.push(url)
      return route.fulfill({
        status: 400, contentType: 'application/json',
        body: JSON.stringify({ error: { code: 400, message: 'EMAIL_EXISTS', errors: [{ message: 'EMAIL_EXISTS' }] } }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return signUps
}

const field = (page, label) => page.getByLabel(label, { exact: true })
const createButton = (page) => page.getByRole('button', { name: 'Create account', exact: true })

async function fillSignUp(page, password) {
  await field(page, 'Name (optional)').fill('Tod Dler')
  await field(page, 'Email').fill('tod@dler.example')
  await field(page, 'Password').fill(password)
}

test.describe('the sign-up form checks what is typed before it asks for an account', () => {
  // MUTATION: in src/components/auth/AuthForm.jsx delete the
  //   `if (mode === 'signup' && passwordIsWeak(password))` line. The six spaces
  //   are sent, the alert never reads "Use at least 6 characters.", and the
  //   sign-up count is 1.
  test('a password of spaces, or under six real characters, is refused and nothing is sent', async ({ page }) => {
    watch(page, 'visitor typing spaces as a password')
    const signUps = await trackSignUps(page)
    await go(page, '/login?signup=1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your free account')

    for (const password of ['      ', '  ab c  ', '          ']) {
      await fillSignUp(page, password)
      await createButton(page).click()
      const alert = page.getByRole('alert').filter({ hasText: WEAK })
      await expect(alert, `"${password}" was not refused with the inline error`).toBeVisible()
      await expect(field(page, 'Password')).toHaveAttribute('aria-invalid', 'true')
      // The button is back, so the form was not left waiting on a request.
      await expect(createButton(page)).toBeEnabled()
    }
    // Let a wrongly sent request land before counting.
    await page.waitForTimeout(500)
    expect(signUps, 'a sign-up request went out for a password that was refused').toHaveLength(0)

    // POSITIVE CONTROL: a real password does send one, so the zero above is
    // about the refusal and not about this test's route.
    await fillSignUp(page, 'a real passphrase')
    await createButton(page).click()
    await expect.poll(() => signUps.length, 'a good password sent no sign-up request, so the counter above proves nothing').toBe(1)
  })

  // MUTATION: in AuthForm.jsx remove `maxLength={NAME_MAX}` or
  //   `maxLength={EMAIL_MAX}` from the input. Its attribute goes missing.
  test('the name takes 200 characters and the email 254, no more', async ({ page }) => {
    watch(page, 'visitor pasting a huge name')
    await go(page, '/login?signup=1')
    await expect(field(page, 'Name (optional)')).toHaveAttribute('maxlength', '200')
    await expect(field(page, 'Email')).toHaveAttribute('maxlength', '254')
    // The cap holds for typed text as well as the attribute.
    await field(page, 'Name (optional)').pressSequentially('n'.repeat(260), { delay: 0 })
    expect((await field(page, 'Name (optional)').inputValue()).length).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Checkout failure text
// ─────────────────────────────────────────────────────────────────────────────

// A stand-in for Stripe.js: loadStripe uses an existing window.Stripe. Its embed
// asks for the session secret and, when that fails, rethrows as the real one
// does.
function stripeStandIn() {
  const unused = () => { throw new Error('not part of this stand-in') }
  window.Stripe = () => ({
    elements: unused,
    createToken: unused,
    createPaymentMethod: unused,
    confirmCardPayment: unused,
    createEmbeddedCheckoutPage: async (options) => {
      await options.fetchClientSecret()
      return { mount() {}, unmount() {}, destroy() {} }
    },
  })
}

async function openFailingCheckout(page, { status, body }) {
  await page.route('**/api/create-checkout', (route) => route.fulfill({
    status, contentType: 'application/json', body: JSON.stringify(body),
  }))
  await page.addInitScript(stripeStandIn)
  await signIn(page, { plan: 'free' })
  await stubPrices(page)
  await go(page, '/checkout?plan=yearly')
  await expectRendered(page)
  const form = page.locator('.checkout-form')
  const notConfigured = form.filter({ hasText: /Payments aren.t configured/ })
  const failed = form.filter({ hasText: 'Checkout unavailable' })
  await expect(notConfigured.or(failed)).toBeVisible()
  test.skip(await notConfigured.isVisible(), 'this build carries no Stripe publishable key, so the embed never asks for a session')
  return form
}

test.describe('a failed payment session is told in the page\'s own words', () => {
  // MUTATION: in src/pages/Checkout.jsx change `setError(checkoutErrorText(err))`
  //   to `setError(err?.message)`. The raw text appears and the generic
  //   sentence does not.
  test('a 500 shows the generic sentence, not the server\'s text, and logs the raw text', async ({ page }) => {
    watch(page, 'buyer whose checkout fails')
    const warnings = []
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()) })
    const form = await openFailingCheckout(page, { status: 500, body: { error: RAW_SERVER_TEXT } })

    const alert = form.getByRole('alert')
    await expect(alert).toContainText(GENERIC)
    await expect(form, 'the server\'s own text reached the buyer').not.toContainText(RAW_SERVER_TEXT)
    await expect(form).not.toContainText('key_not_for_buyers')
    expect(warnings.some((w) => w.includes(RAW_SERVER_TEXT)), 'the raw text was not logged to the console').toBe(true)
  })

  // MUTATION: in src/styles/pages/checkout.css delete `display: block` from
  //   `.checkout-error-p`. The sentence and Try again share a row.
  test('the sentence sits on its own line above Try again', async ({ page }) => {
    watch(page, 'buyer whose checkout fails')
    const form = await openFailingCheckout(page, { status: 500, body: { error: RAW_SERVER_TEXT } })
    const message = await form.locator('.checkout-error-p').boundingBox()
    const retry = await form.getByRole('button', { name: 'Try again' }).boundingBox()
    expect(message, 'no message line').not.toBeNull()
    expect(retry, 'no Try again button').not.toBeNull()
    expect(message.height, 'the message has no height').toBeGreaterThan(0)
    expect(retry.y, 'Try again is not below the message').toBeGreaterThanOrEqual(message.y + message.height - 1)
  })

  // MUTATION: in src/utils/checkoutError.js delete the 429 entry. It falls
  //   through to the generic sentence.
  test('a 429 is told as too many attempts, still without the server\'s text', async ({ page }) => {
    watch(page, 'buyer who clicked checkout too often')
    const form = await openFailingCheckout(page, { status: 429, body: { error: RAW_SERVER_TEXT, retryAfter: 600 } })
    await expect(form.getByRole('alert')).toContainText('Too many checkout attempts')
    await expect(form).not.toContainText(RAW_SERVER_TEXT)
    await expect(form.getByRole('alert')).not.toContainText(GENERIC)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The Feedback bubble on a small screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the Feedback bubble stays off the forms on a short phone', () => {
  // MUTATION: in src/styles/global.css delete the `.global-feedback-btn--form`
  //   rule (or in FeedbackButton.jsx stop adding the class). At 320 and 390 the
  //   bubble is over the form and the submit is covered.
  for (const width of [320, 390]) {
    test(`at ${width}x640 on sign-up the bubble is clear of the form and the submit is reachable`, async ({ page }, testInfo) => {
      watch(page, `visitor on a ${width}x640 phone creating an account`)
      await page.setViewportSize({ width, height: 640 })
      await go(page, '/login?signup=1')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
      await expect(createButton(page)).toBeAttached()
      await page.screenshot({ path: testInfo.outputPath(`signup-${width}x640.png`) })

      // At the top, with the submit scrolled to the foot of the screen, and at
      // the very bottom: the bubble, if it is drawn at all, must be over none of
      // the form, and the submit's left, middle and right must each hit the
      // submit and nothing fixed.
      const seen = await page.evaluate(() => {
        const submit = document.querySelector('.auth-submit')
        const bubble = document.querySelector('.global-feedback-btn')
        const drawn = !!bubble && bubble.getClientRects().length > 0
        const root = document.scrollingElement
        const steps = {
          top: () => root.scrollTo(0, 0),
          'submit at the foot': () => submit.scrollIntoView({ block: 'end' }),
          bottom: () => root.scrollTo(0, root.scrollHeight),
        }
        const out = { drawn, covered: [], submitBlocked: [], offScreen: [] }
        for (const [name, scroll] of Object.entries(steps)) {
          scroll()
          if (drawn) {
            const b = bubble.getBoundingClientRect()
            for (const el of document.querySelectorAll('.auth-form-root input, .auth-form-root button, .auth-form-root a, .auth-form-root .auth-help, .auth-form-root .auth-legal')) {
              const r = el.getBoundingClientRect()
              if (r.width && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) {
                out.covered.push(`${name}: ${el.id || el.className || el.tagName}`)
              }
            }
          }
          const s = submit.getBoundingClientRect()
          if (name === 'submit at the foot' && (s.top < 0 || s.bottom > window.innerHeight)) out.offScreen.push(name)
          // Only a submit that is on screen can be hit-tested; off screen it is
          // reached by scrolling, which the 'submit at the foot' step covers.
          const onScreen = s.top >= 0 && s.bottom <= window.innerHeight
          for (const x of onScreen ? [s.left + 8, s.left + s.width / 2, s.right - 8] : []) {
            const hit = document.elementFromPoint(x, s.top + s.height / 2)
            if (!hit || !(hit === submit || submit.contains(hit))) out.submitBlocked.push(`${name} at x=${Math.round(x)}`)
          }
        }
        return out
      })
      expect(seen.covered, 'the Feedback bubble is over the sign-up form').toEqual([])
      expect(seen.submitBlocked, 'something is on top of the submit button').toEqual([])
      expect(seen.offScreen, 'the submit button cannot be scrolled fully on screen').toEqual([])
    })
  }

  // POSITIVE CONTROL for the two above: on a roomy screen the same page does
  // carry the bubble, so "not visible" at 320 is a decision of the stylesheet
  // and not a page that never had one.
  test('at 1440x900 the bubble is still on /login', async ({ page }) => {
    watch(page, 'visitor on a laptop with a sign-in problem')
    await go(page, '/login?signup=1')
    await expect(createButton(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Share feedback' })).toBeVisible()
  })

  // MUTATION: as above. Signed in at 390x640 the bubble would sit over the
  //   payment form's page.
  test('at 390x640 on /checkout the bubble is not on the page', async ({ page }, testInfo) => {
    watch(page, 'buyer on a short phone at checkout')
    await page.setViewportSize({ width: 390, height: 640 })
    await signIn(page, { plan: 'free' })
    await go(page, '/checkout?plan=yearly')
    await expectRendered(page)
    await page.screenshot({ path: testInfo.outputPath('checkout-390x640.png') })
    await expect(page.locator('.global-feedback-btn')).toBeHidden()
    const stillThere = await page.locator('.global-feedback-btn').count()
    // The button is in the page (hidden by CSS), so a missing element is not what passed.
    expect(stillThere, 'the bubble was never rendered on /checkout, so this proves nothing').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Small links
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the Terms and Privacy links on /login are targets', () => {
  // MUTATION: in src/styles/pages/auth.css delete `padding:6px 0` from
  //   `.auth-legal a`. Each link is 15px tall.
  for (const width of [390, 1440]) {
    test(`at ${width} both links are at least 24px tall and the paragraph did not grow`, async ({ page }) => {
      watch(page, `visitor on a ${width}px screen reading the terms`)
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/login?signup=1')
      const legal = page.locator('.auth-legal')
      await expect(legal).toBeVisible()
      for (const name of ['Terms', 'Privacy']) {
        const box = await legal.getByRole('link', { name: new RegExp(`^${name}`) }).boundingBox()
        expect(box, `${name} link is missing`).not.toBeNull()
        expect(box.height, `the ${name} link is ${box.height}px tall`).toBeGreaterThanOrEqual(24)
      }
      // The padding must not move the text: the paragraph is whole 18px lines.
      const lines = (await legal.boundingBox()).height / 18
      expect(Math.abs(lines - Math.round(lines)), `the legal line is ${lines} lines tall`).toBeLessThan(0.05)
    })
  }
})
