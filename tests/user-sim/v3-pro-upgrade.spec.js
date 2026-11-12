// The Pro sign-up layer on /plans: the journeys a visitor takes from "Start 7-day
// free trial" to the payment form, run at 1440 and at 390, plus two at 320.
//
//   1  open the layer: URL, step, copy, focus inside, the page behind inert
//   2  Continue goes to the password step: URL, step label, Back, focus
//   3  Back and Back to plans walk out one screen at a time
//   4  the browser's Back and Forward follow the steps
//   5  Escape steps back, then closes, and focus returns to the button
//   6  creating the account lands on the plan step with focus on its heading
//   7  the plan step: yearly by default, the arrow keys change cadence, the copy follows
//   8  Start the trial hands off to checkout and replaces the layer's history entry
//   9  "Not now, keep Free" closes the layer and the page behind comes back
//  10  a signed-in visitor opening ?up=3 lands on the plan step
//  11  a Pro sign-up does not detour through onboarding
//  12  an email that already has an account is named, with a way to log in
//  13  a link straight to ?up=1 opens the layer; closing it leaves /plans
//  14  the whole layer by keyboard
//  320 (two tests) no sideways scroll on the account step; the plan step fits
//
// A page that must SUCCEED declares `lateSignIn` and the form completes the
// sign-in in place. The "account exists" answer comes from the real SDK's Identity
// Toolkit call, answered here so nothing leaves the machine. Expected strings are
// the copy as written, never read back from the page.
//
// KNOWN DEPARTURES FROM THE DESIGN, asserted as built:
//   - the wall is labelled "Sample exports made with UI L4B"
//   - the way out reads "Back to plans" (steps 1 and 3) and "Back" (step 2)
//   - there is no file row and no step-out animation
//   - a tablet gets one centred column
//   - the plan step opens on Yearly, the default cadence, whichever button opened it
//   - a signed-in visitor opening the layer lands on the plan step
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'

const EMAIL = 'dana@example.com'
const PASSWORD = 'a-long-password'
const IDENTITY = /identitytoolkit\.googleapis\.com/

const SIZES = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

async function stubPrices(page) {
  await page.route('**/api/get-prices*', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(withAvailability({ monthly: { usd: 7 }, yearly: { usd: 48 } })),
  }))
}

// The checkout the layer hands off to: a stand-in session and a stand-in Stripe.
async function stubCheckout(page) {
  await page.route('**/api/create-checkout', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ clientSecret: 'cs_test_stub' }),
  }))
  await page.addInitScript(() => {
    const unused = () => { throw new Error('not part of this stand-in') }
    window.Stripe = () => ({
      elements: unused,
      createToken: unused,
      createPaymentMethod: unused,
      confirmCardPayment: unused,
      createEmbeddedCheckoutPage: async (options) => {
        const secret = await options.fetchClientSecret()
        let node = null
        return {
          mount(el) { node = el; el.setAttribute('data-stub-session', secret); el.textContent = 'Stripe Checkout' },
          unmount() { node?.removeAttribute('data-stub-session'); if (node) node.textContent = '' },
          destroy() { this.unmount() },
        }
      },
    })
  })
}

// Every Identity Toolkit call is refused as "this email is taken".
async function stubAccountExists(page) {
  await page.route(IDENTITY, (route) => route.fulfill({
    status: 400, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 400, message: 'EMAIL_EXISTS', errors: [{ message: 'EMAIL_EXISTS' }] } }),
  }))
}

const proButton = (page) => page.locator('.hpl-pro .pa-cta').locator('a, button').first()

async function openLayer(page) {
  await stubPrices(page)
  await go(page, '/plans')
  const cta = proButton(page)
  await expect(cta, 'the Pro button never got its price').toHaveText('Start 7-day free trial')
  await cta.click()
  const layer = page.locator('[data-pro-layer]')
  await expect(layer).toBeVisible()
  return { layer, cta }
}

const toPassword = async (layer) => {
  await layer.locator('#ui-login-email').fill(EMAIL)
  await layer.getByRole('button', { name: 'Continue with email' }).click()
  await expect(layer.locator('#ui-login-password')).toBeVisible()
}

// Signs a new account up in the layer and waits for the plan step.
async function reachPlanStep(page) {
  await signIn(page, { plan: 'free', lateSignIn: true, returning: false, onboarded: false })
  await stubCheckout(page)
  const { layer, cta } = await openLayer(page)
  await toPassword(layer)
  await layer.locator('#ui-login-password').fill(PASSWORD)
  await layer.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(layer).toHaveAttribute('data-step', '3')
  return { layer, cta }
}

for (const size of SIZES) {
  test.describe(`Pro sign-up layer at ${size.name}`, () => {
    test.use(size.use)

    // MUTATION: in Pricing.jsx drop `inert={proLayer.open || undefined}`. The page behind
    //   the layer stays reachable and the inert assertion below goes red.
    test('1 opening the layer: step 1 of 3 at ?up=1, the copy, focus inside, and the page behind inert', async ({ page }) => {
      watch(page, 'a visitor starting the Pro trial')
      const { layer } = await openLayer(page)
      await expect(page).toHaveURL(/\/plans\?up=1$/)
      await expect(layer).toHaveAttribute('role', 'dialog')
      await expect(layer).toHaveAttribute('aria-modal', 'true')
      await expect(layer).toHaveAttribute('data-step', '1')
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
      await expect(layer.locator('#ui-login-title')).toHaveText('Create your account for Pro')
      await expect(layer).toContainText('Pro is attached to your account, so payment needs one.')
      await expect(layer.locator('h2.pf-h')).toHaveText('Sample exports made with UI L4B')
      await expect(layer.getByRole('button', { name: 'Back to plans' })).toBeVisible()
      await expect(layer.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
      await expect(layer.locator('#ui-login-password'), 'the password is asked for after the email').toHaveCount(0)
      await expect.poll(() => page.evaluate(() => !!document.activeElement.closest('[data-pro-layer]')),
        'focus stayed on the page behind').toBe(true)
      await expect(page.locator('.pricing'), 'the page behind is not inert').toHaveAttribute('inert', '')
    })

    // MUTATION: in AuthForm.jsx make handleContinue call `handleSubmit` (or skip `setStep(2)`).
    //   Continue goes straight to the account call, and the step label never reads "Step 2 of 3".
    test('2 Continue goes to the password step: ?up=2, "Step 2 of 3", the way out reads Back, focus in the password', async ({ page }) => {
      watch(page, 'a visitor typing an email')
      const { layer } = await openLayer(page)
      await toPassword(layer)
      await expect(page).toHaveURL(/\/plans\?up=2$/)
      await expect(layer).toHaveAttribute('data-step', '2')
      await expect(layer.locator('.pf-step')).toHaveText('Step 2 of 3')
      await expect(layer.locator('.pf-back')).toHaveText('Back')
      await expect(layer.locator('#ui-login-title')).toHaveText('Choose a password')
      await expect(layer.locator('#ui-login-password')).toBeFocused()
      await expect(layer.locator('#ui-login-promise')).toContainText(`For ${EMAIL}.`)
    })

    test('3 Back from the password step returns to the account step, and Back to plans closes the layer', async ({ page }) => {
      watch(page, 'a visitor backing out of the trial')
      const { layer, cta } = await openLayer(page)
      await toPassword(layer)
      await layer.locator('.pf-back').click()
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
      await expect(page).toHaveURL(/\/plans\?up=1$/)
      await expect(layer.locator('#ui-login-email'), 'the email typed is kept').toHaveValue(EMAIL)
      await layer.getByRole('button', { name: 'Back to plans' }).click()
      await expect(layer).toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(page.locator('.pricing'), 'the page is still inert after the layer closed').not.toHaveAttribute('inert', '')
      await expect(cta).toBeVisible()
    })

    // MUTATION: in useProUpgradeLayer.js `onStep`, push the step back with `goUp(n, {state: ...})`
    //   instead of stepping the history. The browser Back then stays inside the layer.
    test('4 the browser Back and Forward follow the layer: password, account, closed, and forward again', async ({ page }) => {
      watch(page, 'a visitor using the browser buttons')
      const { layer } = await openLayer(page)
      await toPassword(layer)
      await expect(page).toHaveURL(/\/plans\?up=2$/)
      await page.goBack()
      await expect(page).toHaveURL(/\/plans\?up=1$/)
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
      await page.goBack()
      await expect(page).toHaveURL(/\/plans$/)
      await expect(layer).toHaveCount(0)
      await page.goForward()
      await expect(page).toHaveURL(/\/plans\?up=1$/)
      await expect(layer).toBeVisible()
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
    })

    test('5 Escape steps back one screen at a time, then closes, and focus returns to the Pro button', async ({ page }) => {
      watch(page, 'a keyboard visitor pressing Escape')
      await stubPrices(page)
      await go(page, '/plans')
      const cta = proButton(page)
      await expect(cta).toHaveText('Start 7-day free trial')
      await cta.focus()
      await page.keyboard.press('Enter')
      const layer = page.locator('[data-pro-layer]')
      await expect(layer).toBeVisible()
      await layer.locator('#ui-login-email').fill(EMAIL)
      await page.keyboard.press('Enter')
      await expect(layer.locator('.pf-step')).toHaveText('Step 2 of 3')
      await page.keyboard.press('Escape')
      await expect(layer.locator('.pf-step'), 'Escape on step 2 went out instead of back').toHaveText('Step 1 of 3')
      await page.keyboard.press('Escape')
      await expect(layer).toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(cta, 'focus did not return to the button that opened the layer').toBeFocused()
    })

    test('6 creating the account lands on the plan step: "Step 3 of 3", the heading has focus, and the account is named', async ({ page }) => {
      watch(page, 'a new visitor creating an account to pay')
      const { layer } = await reachPlanStep(page)
      await expect(page).toHaveURL(/\/plans\?up=3$/)
      await expect(layer.locator('.pf-step')).toHaveText('Step 3 of 3')
      await expect(layer.locator('#pro-layer-title')).toHaveText('Choose how you pay')
      await expect(layer.locator('#pro-layer-title'), 'the plan step heading takes focus').toBeFocused()
      await expect(layer).toHaveAttribute('aria-labelledby', 'pro-layer-title')
      await expect(layer.locator('.auth-sub')).toHaveText(/^Logged in as \S+@\S+\.\S+\.$/)
      await expect(layer.getByRole('button', { name: 'Back to plans' })).toBeVisible()
      await expect(layer.getByRole('button', { name: 'Not now, keep Free' })).toBeVisible()
      await expect(layer.locator('.pl-fine')).toHaveText('Secure checkout by Stripe.')
    })

    test('7 the plan step: Yearly is picked, the arrow keys change the cadence and the price, the lines say what happens', async ({ page }) => {
      watch(page, 'someone choosing how to pay')
      const { layer } = await reachPlanStep(page)
      const group = layer.getByRole('radiogroup', { name: 'Billing' })
      await expect(group.getByRole('radio')).toHaveCount(2)
      const yearly = group.getByRole('radio', { name: /^Yearly/ })
      const monthly = group.getByRole('radio', { name: 'Monthly' })
      await expect(yearly).toHaveText(/^Yearly · /)
      await expect(yearly).toHaveAttribute('aria-checked', 'true')
      await expect(monthly).toHaveAttribute('aria-checked', 'false')
      await expect(layer.locator('.pl-fig-n')).toContainText('48')
      await expect(layer.locator('.pl-fig-u')).toHaveText('a year')
      await expect(layer.locator('.pl-lines')).toContainText(/Free for 7 days, then .*48.* a year\./)
      await expect(layer.locator('.pl-lines')).toContainText(/Monthly is .*7.* a month, with no free trial\./)
      await expect(layer.locator('.pl-go')).toHaveText('Start 7-day free trial')

      await yearly.focus()
      await page.keyboard.press('ArrowRight')
      await expect(monthly).toHaveAttribute('aria-checked', 'true')
      await expect(monthly, 'the arrow key moves focus with the choice').toBeFocused()
      await expect(layer.locator('.pl-fig-n')).toContainText('7')
      await expect(layer.locator('.pl-fig-u')).toHaveText('a month')
      await expect(layer.locator('.pl-lines')).toContainText('Billed monthly. No free trial on Monthly; billing starts today.')
      await expect(layer.locator('.pl-go')).toHaveText('Upgrade to Pro')
      await page.keyboard.press('ArrowLeft')
      await expect(yearly).toHaveAttribute('aria-checked', 'true')
      await expect(layer.locator('.pl-go')).toHaveText('Start 7-day free trial')
    })

    // MUTATION: in ProUpgradeLayer.jsx `handOff`, drop `{ replace: true }`. The layer's history
    //   entry stays, history.length grows by one, and the length assertion goes red.
    test('8 Start the trial goes to checkout on the chosen plan and replaces the layer in history', async ({ page }) => {
      watch(page, 'someone starting the yearly trial')
      const { layer } = await reachPlanStep(page)
      const entries = await page.evaluate(() => history.length)
      await layer.locator('.pl-go').click()
      await expect(page).toHaveURL(/\/checkout\?plan=yearly$/)
      await expect(layer).toHaveCount(0)
      expect(await page.evaluate(() => history.length), 'the hand-off pushed a history entry').toBe(entries)
    })

    test('8b the monthly choice goes to checkout on the monthly plan', async ({ page }) => {
      watch(page, 'someone choosing monthly')
      const { layer } = await reachPlanStep(page)
      await layer.getByRole('radio', { name: 'Monthly' }).click()
      await layer.locator('.pl-go').click()
      await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
    })

    test('9 Not now, keep Free closes the layer and the page behind comes back', async ({ page }) => {
      watch(page, 'someone who decided to stay on Free')
      const { layer } = await reachPlanStep(page)
      await layer.getByRole('button', { name: 'Not now, keep Free' }).click()
      await expect(layer).toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(page.locator('.pricing')).not.toHaveAttribute('inert', '')
    })

    test('10 a signed-in visitor opening ?up=3 lands on the plan step with their email', async ({ page }) => {
      watch(page, 'a signed-in person choosing to upgrade')
      await signIn(page, { plan: 'free', email: 'sam@example.com' })
      await stubPrices(page)
      await go(page, '/plans?up=3')
      const layer = page.locator('[data-pro-layer]')
      await expect(layer).toBeVisible()
      await expect(layer).toHaveAttribute('data-step', '3')
      await expect(layer.locator('.pf-step')).toHaveText('Step 3 of 3')
      // Opened straight on the plan step, focus lands on the layer itself rather than the
      // heading (it does reach the heading after signing up here); either way it is inside.
      await expect.poll(() => page.evaluate(() => !!document.activeElement.closest('[data-pro-layer]'))).toBe(true)
      await expect(layer.locator('.auth-sub')).toHaveText('Logged in as sam@example.com.')
      await expect(layer.locator('#ui-login-email'), 'a signed-in visitor was asked for an email').toHaveCount(0)
    })

    // MUTATION: in App.jsx drop the `isProSignup() &&` guard (or have it always be false). A brand-new
    //   account is sent on to /onboarding and the URL assertion goes red.
    test('11 a new account made in the layer stays on the plan step and is not sent to onboarding', async ({ page }) => {
      watch(page, 'a new visitor who came to pay, not to be onboarded')
      const { layer } = await reachPlanStep(page)
      await expect(page).toHaveURL(/\/plans\?up=3$/)
      await expect(layer).toBeVisible()
      // Give any late redirect a moment to arrive, then check it did not.
      await page.waitForTimeout(800)
      await expect(page).not.toHaveURL(/\/onboarding/)
      await expect(layer).toHaveAttribute('data-step', '3')
    })

    test('12 an email that already has an account is named, with a way to log in instead', async ({ page }) => {
      watch(page, 'a returning person who tried to sign up')
      await stubAccountExists(page)
      const { layer } = await openLayer(page)
      await toPassword(layer)
      await layer.locator('#ui-login-password').fill(PASSWORD)
      await layer.getByRole('button', { name: 'Create account', exact: true }).click()
      const alert = layer.getByRole('alert')
      await expect(alert).toContainText("There's already an account for that email.")
      await alert.getByRole('button', { name: 'Log in instead' }).click()
      await expect(layer.locator('#ui-login-title')).toHaveText('Log in to continue')
      await expect(layer.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
      await expect(layer, 'switching to log in left the layer').toBeVisible()
    })

    test('13 a link straight to ?up=1 opens the layer, and Back to plans leaves it on /plans', async ({ page }) => {
      watch(page, 'someone following a shared Pro link')
      await stubPrices(page)
      await go(page, '/plans?up=1')
      const layer = page.locator('[data-pro-layer]')
      await expect(layer).toBeVisible()
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
      await layer.getByRole('button', { name: 'Back to plans' }).click()
      await expect(layer).toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(page.locator('.pricing')).not.toHaveAttribute('inert', '')
    })

    test('14 the layer by keyboard: Tab stays inside it and the plan step is reachable without a mouse', async ({ page }) => {
      watch(page, 'a keyboard-only visitor')
      await signIn(page, { plan: 'free', lateSignIn: true })
      await stubPrices(page)
      await go(page, '/plans')
      const cta = proButton(page)
      await expect(cta).toHaveText('Start 7-day free trial')
      await cta.focus()
      await page.keyboard.press('Enter')
      const layer = page.locator('[data-pro-layer]')
      await expect(layer).toBeVisible()
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab')
        expect(await page.evaluate(() => !!document.activeElement.closest('[data-pro-layer]')),
          `Tab ${i + 1} left the layer`).toBe(true)
      }
      await layer.locator('#ui-login-email').focus()
      await page.keyboard.type(EMAIL)
      await page.keyboard.press('Enter')
      await expect(layer.locator('#ui-login-password')).toBeFocused()
      await page.keyboard.type(PASSWORD)
      await page.keyboard.press('Enter')
      await expect(layer).toHaveAttribute('data-step', '3')
      await expect(layer.locator('#pro-layer-title')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(layer.getByRole('radio', { name: /Yearly/ }), 'only the chosen radio is a Tab stop').toBeFocused()
    })
  })
}

test.describe('Pro sign-up layer at 320', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true })

  const fits = (page) => page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    layer: document.querySelector('[data-pro-layer]').scrollWidth,
    width: window.innerWidth,
  }))

  test('the account step does not scroll sideways at 320', async ({ page }) => {
    watch(page, 'a visitor on a small phone')
    const { layer } = await openLayer(page)
    await expect(layer.locator('#ui-login-email')).toBeVisible()
    const m = await fits(page)
    expect(m.scroll, 'the page scrolls sideways').toBeLessThanOrEqual(m.width)
    expect(m.layer, 'the layer is wider than the screen').toBeLessThanOrEqual(m.width)
    await toPassword(layer)
    const p = await fits(page)
    expect(p.layer, 'the password step is wider than the screen').toBeLessThanOrEqual(p.width)
  })

  test('the plan step fits at 320: the heading, the choice and the button are all on screen', async ({ page }) => {
    watch(page, 'a new visitor on a small phone')
    const { layer } = await reachPlanStep(page)
    const m = await fits(page)
    expect(m.layer, 'the plan step is wider than the screen').toBeLessThanOrEqual(m.width)
    expect(m.scroll, 'the page scrolls sideways').toBeLessThanOrEqual(m.width)
    for (const [name, loc] of [
      ['heading', layer.locator('#pro-layer-title')],
      ['billing choice', layer.getByRole('radiogroup', { name: 'Billing' })],
      ['start button', layer.locator('.pl-go')],
    ]) {
      const box = await loc.boundingBox()
      expect(box, `${name} is not on the page`).not.toBeNull()
      expect(box.x, `${name} starts left of the screen`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `${name} runs off the right edge`).toBeLessThanOrEqual(320)
    }
  })
})
