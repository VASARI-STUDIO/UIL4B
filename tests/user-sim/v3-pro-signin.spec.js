// The sign-in form, on the /login page and in the sign-in dialog: the journeys a
// person takes through it, run at 1440 and at 390.
//
//   1  log in by email: Show/Hide, then the signed-in line takes focus
//   2  the same by keyboard alone
//   3  a wrong password, the reset it offers, the sent screen, and the way back
//   4  backing out: Change, Create one / Log in, Forgot password / Back to log in
//   5  sign-up, then the signed-in line; and its busy pill and the "already exists" answer
//   6  paying for Pro: the full-screen layer opens, steps to the password, and closes
//   7  the same layer by keyboard: Enter, Escape one step at a time, focus returned
//   8  the sign-in dialog from the header: Google first, wrong password, reset, Escape, Not now
//   9  the export dialog: kit pane, focus trap, Escape, Close, scrim, Not now
//  10  the save dialog: swatch strip, Close, scrim, focus back on Save
//  11  the dialog while a request is in flight: Close, Escape, scrim, Not now are locked
//  12  the switch-account dialog from "Add account"
//  13  Report a problem is there and is 44px tall
//  14  the page, the dialog and the Pro layer share the same first-step controls in the same order
//
// How the form is driven: a signed-out page with no declared session talks to the
// real Firebase SDK, so its Identity Toolkit requests are answered here (wrong
// password, account exists, reset sent) and nothing leaves the machine. A page
// that must SUCCEED declares `lateSignIn`, and the form completes the sign-in in
// place. Expected strings are the copy as written, never read back from the page.
//
// KNOWN DEPARTURES FROM THE DESIGN, asserted as built:
//   - the wall is labelled "Sample exports"
//   - the page's way out reads "Back to plans" (the design says "Back to your export")
//   - the export dialog's chip reads "Sample kit export"
//   - the Google button is not disabled offline (offline shows the status line)
//   - the signed-in line reads "You’re logged in. Taking you back…" with a curly apostrophe
//   - the resend wait is 30 seconds
import { test, expect } from './base.js'
import { go, watch, signIn, openChosenDialog } from './helpers.js'
import { withAvailability } from './price-payload.js'

const EMAIL = 'dana@example.com'
const PASSWORD = 'a-long-password'
const IDENTITY = /identitytoolkit\.googleapis\.com/
const SIGNED_IN_LINE = 'You’re logged in. Taking you back…'

const SIZES = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

// Answers the real SDK's Identity Toolkit calls. `held` keeps one operation
// waiting until `held.until` settles, which is how a request "in flight" is made
// to stay in flight.
async function stubIdentity(page, held = null) {
  const calls = []
  await page.route(IDENTITY, async (route) => {
    const op = (route.request().url().match(/accounts:(\w+)/) || [])[1] || 'other'
    calls.push({ op, body: route.request().postData() || '' })
    if (held && held.op === op) await held.until
    const refuse = (message) => route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ error: { code: 400, message, errors: [{ message }] } }),
    })
    if (op === 'signInWithPassword') return refuse('INVALID_LOGIN_CREDENTIALS')
    if (op === 'signUp') return refuse('EMAIL_EXISTS')
    if (op === 'sendOobCode') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: EMAIL }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return calls
}

function hold(op) {
  let release
  const until = new Promise((resolve) => { release = resolve })
  return { op, until, release }
}

// The signed-in line is on screen for a moment before the page leaves, so its
// focus is recorded at the moment it happens, not looked for afterwards.
async function recordStatusFocus(page) {
  await page.addInitScript(() => {
    window.__statusFocus = []
    document.addEventListener('focusin', (e) => {
      if (e.target.matches && e.target.matches('.pf-status')) window.__statusFocus.push(e.target.textContent)
    }, true)
  })
}
const statusFocus = (page) => page.evaluate(() => window.__statusFocus)

async function stubPrices(page) {
  await page.route('**/api/get-prices*', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(withAvailability({ monthly: { usd: 7 }, yearly: { usd: 48 } })),
  }))
}

async function openProLayer(page) {
  await stubPrices(page)
  await go(page, '/plans')
  const cta = page.locator('.hpl-pro .pa-cta').locator('a, button').first()
  await expect(cta, 'the Pro button never got its price').toHaveText('Start 7-day free trial')
  await cta.click()
  const layer = page.locator('[data-pro-layer]')
  await expect(layer).toBeVisible()
  return { layer, cta }
}

const emailThenContinue = async (scope, email = EMAIL) => {
  await scope.locator('#ui-login-email').fill(email)
  await scope.getByRole('button', { name: 'Continue with email' }).click()
  await expect(scope.locator('#ui-login-password')).toBeVisible()
}

// Opens Save or share on a tool page and presses the named item.
async function openToolGate(page, route, item) {
  await go(page, route)
  const opener = page.getByRole('button', { name: 'Save or share' })
  await expect(opener).toBeVisible()
  await opener.click()
  const menu = page.locator('.plb-savemenu, [aria-label^="Save, share"]').first()
  await expect(menu).toBeVisible()
  const control = menu.getByRole('button', item)
  await control.click()
  return { menu, control }
}

for (const size of SIZES) {
  const wide = size.name === '1440'

  test.describe(`sign-in at ${size.name}`, () => {
    test.use(size.use)

    // MUTATION: in LoginPage.jsx delete the `statusRef.current?.focus()` effect.
    //   The signed-in line is shown but is never focused, so the recorded focus list stays empty.
    test('1 log in by email: Show reveals the password and the signed-in line takes focus', async ({ page }) => {
      watch(page, 'a returning person logging in by email')
      await recordStatusFocus(page)
      await signIn(page, { plan: 'free', lateSignIn: true })
      await go(page, '/login')
      const main = page.locator('main.pf')

      await expect(main.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
      await expect(main).toContainText('Your projects, palettes and kits are where you left them.')
      await expect(main.getByRole('link', { name: 'Back to plans' })).toHaveAttribute('href', '/plans')
      await expect(main.getByRole('link', { name: 'UI L4B home' })).toHaveAttribute('href', '/')
      await expect(main.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
      await expect(main.locator('#ui-login-password'), 'the password is asked for before the email').toHaveCount(0)

      await emailThenContinue(main)
      const password = main.locator('#ui-login-password')
      await expect(password, 'the password field takes focus on step 2').toBeFocused()
      await expect(main.locator('#ui-login-promise')).toContainText(`For ${EMAIL}.`)
      await expect(main.getByRole('button', { name: 'Change' })).toBeVisible()

      await password.fill(PASSWORD)
      const show = main.getByRole('button', { name: 'Show' })
      await expect(show).toHaveAttribute('aria-pressed', 'false')
      await expect(password).toHaveAttribute('type', 'password')
      await show.click()
      await expect(password).toHaveAttribute('type', 'text')
      await expect(main.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true')
      await main.getByRole('button', { name: 'Hide' }).click()
      await expect(password).toHaveAttribute('type', 'password')

      await main.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(page).toHaveURL(/\/projects$/)
      expect(await statusFocus(page), 'the signed-in line was never focused').toEqual([SIGNED_IN_LINE])
    })

    test('2 log in by keyboard alone: Tab, Enter and Space do everything', async ({ page }) => {
      watch(page, 'a keyboard-only person logging in')
      await signIn(page, { plan: 'free', lateSignIn: true })
      await go(page, '/login')
      const main = page.locator('main.pf')
      await expect(main.locator('.auth-google-btn')).toBeVisible()

      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Skip to content' }), 'the first Tab stop is the skip link').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(main.getByRole('link', { name: 'UI L4B home' }), 'then the wordmark').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(main.getByRole('link', { name: 'Back to plans' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(main.getByRole('button', { name: 'Continue with Google' }), 'then Google, before the email').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(main.locator('#ui-login-email'), 'Tab goes from Google to the email').toBeFocused()
      await page.keyboard.type(EMAIL)
      await page.keyboard.press('Tab')
      await expect(main.getByRole('button', { name: 'Continue with email' })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(main.locator('#ui-login-password')).toBeFocused()
      await page.keyboard.type(PASSWORD)
      await page.keyboard.press('Tab')
      const show = main.getByRole('button', { name: 'Show' })
      await expect(show).toBeFocused()
      await page.keyboard.press('Space')
      await expect(main.locator('#ui-login-password')).toHaveAttribute('type', 'text')
      await page.keyboard.press('Tab')
      await expect(main.getByRole('button', { name: 'Forgot password?' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(main.getByRole('button', { name: 'Log in', exact: true })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/projects$/)
    })

    test('3 a wrong password says so, offers the reset, and Back to log in returns to the password', async ({ page }) => {
      watch(page, 'someone who mistyped their password')
      const calls = await stubIdentity(page)
      await go(page, '/login')
      const main = page.locator('main.pf')
      await emailThenContinue(main)
      const password = main.locator('#ui-login-password')
      await password.fill('not-the-password')
      await main.getByRole('button', { name: 'Log in', exact: true }).click()

      const alert = main.getByRole('alert')
      await expect(alert).toHaveText("That email and password don't match. Try again, or reset your password.")
      await expect(password, 'the wrong password is cleared').toHaveValue('')
      await expect(password, 'the cursor is back in the password').toBeFocused()
      await expect(password).toHaveAttribute('aria-invalid', 'true')
      await expect(main.getByRole('button', { name: 'Forgot password?' }), 'two ways to reset on one screen').toHaveCount(0)

      await alert.getByRole('button', { name: 'reset your password' }).click()
      await expect(main.locator('#ui-login-title')).toHaveText('Check your email')
      await expect(main.locator('#ui-login-title')).toBeFocused()
      await expect(main.locator('#ui-login-promise')).toContainText(`If there's an account for ${EMAIL}, a reset link is on its way.`)
      const resend = main.getByRole('button', { name: /Send again in \d+s/ })
      await expect(resend, 'the resend is held for a wait').toHaveAttribute('aria-disabled', 'true')
      expect(calls.filter((c) => c.op === 'sendOobCode')).toHaveLength(1)
      expect(calls.find((c) => c.op === 'sendOobCode').body).toContain(EMAIL)

      await main.getByRole('button', { name: 'Back to log in' }).click()
      await expect(main.locator('#ui-login-title')).toHaveText('Log in to UI L4B')
      await expect(password, 'back from the sent screen lands on the password, email kept').toBeFocused()
      await expect(main.locator('#ui-login-promise')).toContainText(`For ${EMAIL}.`)
    })

    test('4 backing out: Change, Create one and Log in swap the form on the same history entry', async ({ page }) => {
      watch(page, 'someone changing their mind on the log-in page')
      await go(page, '/login')
      const main = page.locator('main.pf')
      const entries = await page.evaluate(() => history.length)

      await emailThenContinue(main)
      await main.getByRole('button', { name: 'Change' }).click()
      await expect(main.locator('#ui-login-email'), 'Change keeps what was typed').toHaveValue(EMAIL)
      await expect(main.locator('#ui-login-password')).toHaveCount(0)
      await expect(main.locator('#ui-login-title')).toBeFocused()

      await main.getByRole('button', { name: 'No account? Create one' }).click()
      await expect(main.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
      await expect(page).toHaveURL(/\/login\?signup=1$/)
      await expect(main).toHaveAttribute('data-mode', 'signup')
      await main.getByRole('button', { name: 'Have an account? Log in' }).click()
      await expect(main.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
      await expect(page).toHaveURL(/\/login$/)
      expect(await page.evaluate(() => history.length), 'swapping the form added history entries').toBe(entries)

      await emailThenContinue(main)
      await main.getByRole('button', { name: 'Forgot password?' }).click()
      await expect(main.locator('#ui-login-title')).toHaveText('Reset your password')
      await expect(main.locator('#ui-login-email'), 'the reset form takes focus in its email').toBeFocused()
      await expect(main.locator('#ui-login-email')).toHaveValue(EMAIL)
      await main.getByRole('button', { name: 'Back to log in' }).click()
      await expect(main.locator('#ui-login-title')).toHaveText('Log in to UI L4B')
      await expect(main.locator('#ui-login-password')).toBeFocused()
    })

    test('5 sign-up: choose a password, create the account, the signed-in line takes focus', async ({ page }) => {
      watch(page, 'a new person creating an account')
      await recordStatusFocus(page)
      await signIn(page, { plan: 'free', lateSignIn: true, returning: false, onboarded: false })
      await go(page, '/login?signup=1')
      const main = page.locator('main.pf')
      await expect(main.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
      await expect(main).toContainText('Save palettes, type scales and gradients as projects you can reopen on any device.')
      await emailThenContinue(main)
      await expect(main.getByRole('heading', { level: 1 })).toHaveText('Choose a password')
      await expect(main.locator('#ui-login-password')).toBeFocused()
      await expect(main).toContainText('At least 6 characters.')
      await main.locator('#ui-login-password').fill(PASSWORD)
      await main.getByRole('button', { name: 'Create account', exact: true }).click()
      await expect.poll(() => statusFocus(page), 'the signed-in line was never focused').toEqual([SIGNED_IN_LINE])
      await expect(page, 'a new account goes on to onboarding').toHaveURL(/\/onboarding/)
    })

    test('5b sign-up: the pill keeps focus while working, then an existing account is named with a way to log in', async ({ page }) => {
      watch(page, 'someone signing up with an email that has an account')
      const gate = hold('signUp')
      await stubIdentity(page, gate)
      await go(page, '/login?signup=1')
      const main = page.locator('main.pf')
      await emailThenContinue(main)
      await main.locator('#ui-login-password').fill(PASSWORD)
      const submit = main.getByRole('button', { name: 'Create account', exact: true })
      await submit.click()

      const working = main.getByRole('button', { name: 'Creating your account…' })
      await expect(working).toHaveAttribute('aria-busy', 'true')
      await expect(working).toHaveAttribute('aria-disabled', 'true')
      await expect(working, 'a working pill keeps focus').toBeFocused()
      await expect(main.getByRole('button', { name: 'Show' }), 'the form is locked while it works').toBeDisabled()

      gate.release()
      await expect(main.getByRole('alert')).toContainText("There's already an account for that email.")
      await main.getByRole('alert').getByRole('button', { name: 'Log in instead' }).click()
      await expect(main.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
      await expect(page).toHaveURL(/\/login$/)
    })

    test('6 paying for Pro: the full-screen layer opens on the account step, goes to the password, and Back to plans closes it', async ({ page }) => {
      watch(page, 'a visitor starting the Pro trial')
      const { layer, cta } = await openProLayer(page)
      await expect(page).toHaveURL(/\/plans\?up=1$/)
      await expect(layer).toHaveAttribute('role', 'dialog')
      await expect(layer).toHaveAttribute('aria-modal', 'true')
      await expect(layer).toHaveAttribute('data-step', '1')
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
      await expect(layer.locator('#ui-login-title')).toHaveText('Create your account for Pro')
      await expect(layer).toContainText('Pro is attached to your account, so payment needs one.')
      await expect(layer.getByRole('button', { name: 'Back to plans' })).toBeVisible()
      await expect(layer.locator('h2.pf-h')).toHaveText('Sample exports made with UI L4B')

      await emailThenContinue(layer)
      await expect(page).toHaveURL(/\/plans\?up=2$/)
      await expect(layer.locator('.pf-step')).toHaveText('Step 2 of 3')
      await expect(layer.locator('#ui-login-password')).toBeFocused()
      await expect(layer.locator('.pf-back'), 'the second step names its way out "Back"').toHaveText('Back')

      await layer.locator('.pf-back').click()
      await expect(layer.locator('.pf-step')).toHaveText('Step 1 of 3')
      await layer.getByRole('button', { name: 'Back to plans' }).click()
      await expect(layer).toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(cta).toBeVisible()
    })

    test('7 the Pro layer by keyboard: Enter opens it, Escape steps back one screen at a time, focus returns', async ({ page }) => {
      watch(page, 'a keyboard-only visitor starting the Pro trial')
      await stubPrices(page)
      await go(page, '/plans')
      const cta = page.locator('.hpl-pro .pa-cta').locator('a, button').first()
      await expect(cta).toHaveText('Start 7-day free trial')
      await cta.focus()
      await page.keyboard.press('Enter')
      const layer = page.locator('[data-pro-layer]')
      await expect(layer).toBeVisible()
      await expect(layer.locator('#ui-login-title')).toBeVisible()
      // Focus lands inside the layer, not behind it.
      await expect.poll(() => page.evaluate(() => !!document.activeElement.closest('[data-pro-layer]'))).toBe(true)

      await layer.locator('#ui-login-email').fill(EMAIL)
      await page.keyboard.press('Enter')
      await expect(layer.locator('.pf-step')).toHaveText('Step 2 of 3')
      await expect(layer.locator('#ui-login-password')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(layer.locator('.pf-step'), 'Escape on step 2 goes back one step, not out').toHaveText('Step 1 of 3')
      await page.keyboard.press('Escape')
      await expect(layer).toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(cta, 'focus goes back to the button that opened the layer').toBeFocused()
    })

    test('8 the sign-in dialog from the header: Google has focus, a wrong password and the reset work, Escape and Not now close it', async ({ page }) => {
      watch(page, 'a visitor logging in from the header')
      await stubIdentity(page)
      await openChosenDialog(page, 'Log in')
      const dialog = page.getByRole('dialog', { name: 'Log in to UI L4B' })
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('data-gate', 'modal-login')
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      await expect(dialog.getByRole('button', { name: 'Continue with Google' }), 'the dialog opens on Google').toBeFocused()

      await emailThenContinue(dialog)
      await dialog.locator('#ui-login-password').fill('not-the-password')
      await dialog.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(dialog.getByRole('alert')).toContainText("That email and password don't match.")
      await dialog.getByRole('alert').getByRole('button', { name: 'reset your password' }).click()
      // The dialog's own name changes with its title, so it is found by class from here.
      const sent = page.locator('.ui-login.pp')
      await expect(sent.locator('#ui-login-title')).toHaveText('Check your email')

      await page.keyboard.press('Escape')
      await expect(sent).toHaveCount(0)
      await expect.poll(() => page.evaluate((wide) => {
        const a = document.activeElement
        // A desktop returns to the header menu; on a phone the menu sheet that opened the
        // dialog has closed, so focus falls to the app shell and must not be dropped on the body.
        return !!a && a !== document.body && (wide ? !!a.closest('nav') : !!a.closest('.app-shell'))
      }, wide), 'focus was dropped on the page body').toBe(true)

      await openChosenDialog(page, 'Log in')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'Not now' }).click()
      await expect(dialog).toBeHidden()
    })

    test('9 the export dialog: kit pane at 768 and up, focus stays inside, Escape, Close, the scrim and Not now all close it', async ({ page }) => {
      watch(page, 'a visitor asked to log in to download')
      await openToolGate(page, '/create/gradient', { name: /Download SVG/ })
      const dialog = page.getByRole('dialog', { name: /create your free account/i })
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('data-gate', 'export')
      await expect(dialog).toContainText('You were about to download this gradient as an SVG')
      if (wide) {
        await expect(dialog.locator('.pp-kit')).toHaveCount(2)
        await expect(dialog.locator('.pp-chip')).toHaveText('Sample kit export')
      } else {
        await expect(dialog.locator('.pp-left'), 'a phone gets the form alone').toBeHidden()
      }

      const close = dialog.getByRole('button', { name: 'Close' })
      await close.focus()
      await page.keyboard.press('Shift+Tab')
      await expect(dialog.getByRole('button', { name: 'Not now' }), 'Shift+Tab off Close wraps to the last control').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(close, 'Tab off the last control wraps to Close').toBeFocused()

      // The menu may still be open behind the dialog; open it only if it is not.
      const reopen = async () => {
        const item = page.getByRole('button', { name: /Download SVG/ })
        if (!(await item.isVisible())) await page.getByRole('button', { name: 'Save or share' }).click()
        await item.click()
        await expect(dialog).toBeVisible()
      }
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await reopen()
      await close.click()
      await expect(dialog).toBeHidden()
      await reopen()
      await page.mouse.click(4, 4)
      await expect(dialog, 'the scrim closes it').toBeHidden()
      await reopen()
      await dialog.getByRole('button', { name: 'Not now' }).click()
      await expect(dialog).toBeHidden()
    })

    test('10 the save dialog: a five-swatch strip at 768 and up, Close and the scrim give focus back to Save', async ({ page }) => {
      watch(page, 'a visitor asked to log in to save')
      const { control } = await openToolGate(page, '/palette', { name: 'Save', exact: true })
      const dialog = page.getByRole('dialog', { name: /create your free account/i })
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('data-gate', 'save')
      await expect(dialog).toContainText('save this palette')
      if (wide) {
        await expect(dialog.locator('.pp-strip span')).toHaveCount(5)
      } else {
        await expect(dialog.locator('.pp-left')).toBeHidden()
      }
      await dialog.getByRole('button', { name: 'Close' }).click()
      await expect(dialog).toBeHidden()
      await expect(control, 'Close gives focus back to the Save control that raised the dialog').toBeFocused()

      await control.click()
      await expect(dialog).toBeVisible()
      await page.mouse.click(4, 4)
      await expect(dialog).toBeHidden()
      await expect(control, 'the scrim gives focus back to Save').toBeFocused()
    })

    // MUTATION: in LoginPopup.jsx change `if (!loadingRef.current) dismissRef.current()` to call
    //   dismissRef.current() unconditionally. Escape then closes the dialog while the request is out.
    test('11 while a request is in flight the dialog cannot be closed; when it fails the error shows and the way out is back', async ({ page }) => {
      watch(page, 'someone logging in on a slow connection')
      const gate = hold('signInWithPassword')
      await stubIdentity(page, gate)
      await openChosenDialog(page, 'Log in')
      const dialog = page.getByRole('dialog', { name: 'Log in to UI L4B' })
      await emailThenContinue(dialog)
      await dialog.locator('#ui-login-password').fill('not-the-password')
      await dialog.getByRole('button', { name: 'Log in', exact: true }).click()

      const working = dialog.getByRole('button', { name: 'Logging in…' })
      await expect(working).toHaveAttribute('aria-busy', 'true')
      await expect(working).toBeFocused()
      await expect(dialog.getByRole('button', { name: 'Close' })).toBeDisabled()
      await expect(dialog.getByRole('button', { name: 'Not now' })).toBeDisabled()
      await page.keyboard.press('Escape')
      await page.mouse.click(4, 4)
      await expect(dialog, 'Escape or the scrim closed the dialog mid-request').toBeVisible()

      gate.release()
      await expect(dialog.getByRole('alert')).toContainText("That email and password don't match.")
      await expect(dialog.getByRole('button', { name: 'Close' })).toBeEnabled()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    })

    test('12 the switch-account dialog from Add account: the dashboard pane, Google first, Escape closes', async ({ page }) => {
      watch(page, 'a signed-in person adding a second account')
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/projects')
      if (wide) {
        await page.getByRole('button', { name: 'Account and settings' }).click()
        await page.locator('#pnav-account-pop').getByRole('button', { name: 'Add account' }).click()
      } else {
        await page.locator('.pnav-tab', { hasText: 'You' }).click()
        await page.locator('#pnav-sheet-account').getByRole('button', { name: 'Add account' }).click()
      }
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('data-gate', 'switch')
      await expect(dialog.locator('#ui-login-title')).toHaveText('Log in to continue')
      await expect(dialog).toContainText('You were about to add another account.')
      await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeFocused()
      if (wide) await expect(dialog.locator('.pp-dash .pp-kit')).toHaveCount(2)
      else await expect(dialog.locator('.pp-left')).toBeHidden()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    })

    test('13 one way to report a problem: the link on the form on a phone, the Feedback bubble on a desktop, big enough to hit, and it reaches feedback', async ({ page }) => {
      watch(page, 'someone who cannot log in')
      await go(page, '/login')
      const link = page.locator('main.pf').getByRole('button', { name: 'Report a problem' })
      const bubble = page.getByRole('button', { name: 'Share feedback' })
      // A screen carries one of the two, never both.
      const phone = size.name === '390'
      await expect(phone ? bubble : link, 'both feedback controls are drawn').toBeHidden()
      const report = phone ? link : bubble
      await expect(report).toBeVisible()
      const box = await report.boundingBox()
      // A finger needs 44px; a pointer needs the 24px floor.
      expect(box.height, 'the report control is too short to hit').toBeGreaterThanOrEqual(phone ? 44 : 24)
      await report.click()
      await expect.poll(async () => /\/feedback/.test(page.url())
        || await page.getByRole('dialog').filter({ hasText: /feedback|problem|bug/i }).count() > 0,
      'Report a problem opened nothing').toBe(true)
    })

    test('14 one sign-in: the page, the dialog and the Pro layer put the same first-step controls in the same order', async ({ page }) => {
      watch(page, 'someone meeting the sign-up form in three places')
      const order = (scope) => scope.evaluate((root) => {
        const parts = ['.auth-google-btn', '.auth-divider', '#ui-login-email', '.auth-continue', '.auth-legal']
        const els = parts.map((s) => root.querySelector(s))
        const inOrder = els.every((el, i) => el && (i === 0 || (els[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)))
        return {
          inOrder,
          google: els[0] && els[0].textContent.trim(),
          divider: els[1] && els[1].textContent.trim(),
          next: els[3] && els[3].textContent.trim(),
        }
      })
      const want = { inOrder: true, google: 'Continue with Google', divider: 'or with email', next: 'Continue with email' }

      await go(page, '/login?signup=1')
      expect(await order(page.locator('main.pf')), 'the /login page').toEqual(want)

      await openChosenDialog(page, 'Create a free account')
      const dialog = page.getByRole('dialog', { name: /create your free account/i })
      await expect(dialog).toBeVisible()
      expect(await order(dialog), 'the sign-in dialog').toEqual(want)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()

      const { layer } = await openProLayer(page)
      expect(await order(layer), 'the Pro layer').toEqual(want)
    })
  })
}
