// The Google button on the sign-in form is aria-disabled and aria-busy until the
// auth SDK is in: still focusable (the dialog focuses it on open), but a click
// does nothing. signInWithPopup has to run inside the click, and awaiting the SDK
// download first can lose the browser's user activation.
//
// The auth SDK chunk is held at the network, so "before it loads" is a state the
// test controls rather than a race it hopes to win. Dropping aria-disabled, or
// the early return in handleGoogle, turns this red.
//
// The test build's auth double refuses a Google sign-in with a visible error, so
// a click that reaches the sign-in shows "Opening Google…" and then #ui-login-error.
// The click after release is the control that shows the click path is live.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const AUTH_SDK_CHUNK = /\/assets\/firebase-auth-[\w-]{6,}\.js/

test('the Google button is focusable but inert and busy until the auth SDK loads, then live', async ({ page }) => {
  watch(page, 'a visitor on the log-in page while the auth SDK is still downloading')

  const popups = []
  page.on('popup', (p) => popups.push(p.url()))

  let release
  const held = new Promise((resolve) => { release = resolve })
  let heldRequests = 0
  await page.route(AUTH_SDK_CHUNK, async (route) => {
    heldRequests += 1
    await held
    await route.continue().catch(() => {})
  })

  const google = page.locator('main .auth-google-btn')
  const loginError = page.locator('#ui-login-error')

  try {
    await go(page, '/login')
    await expect(google, 'the log-in page must show the Google button').toBeVisible()
    await expect.poll(() => heldRequests, 'the page never asked for the auth SDK').toBeGreaterThan(0)

    await expect(google).toHaveAttribute('aria-disabled', 'true')
    await expect(google).toHaveAttribute('aria-busy', 'true')
    await expect(google, 'it is aria-disabled, not disabled').not.toHaveAttribute('disabled', /.*/)
    await google.focus()
    await expect(google, 'the busy button must still accept focus').toBeFocused()

    // force: Playwright's actionability check counts aria-disabled as disabled
    // and would wait forever; a real pointer press is what is being modelled.
    await google.click({ force: true })
    await expect(google, 'a click before the SDK is in must not start a sign-in').toHaveText(/continue with google/i)
    await expect(google).toHaveAttribute('aria-busy', 'true')
    await expect(loginError, 'a click before the SDK is in must not reach sign-in').toHaveCount(0)
    expect(popups, 'a click before the SDK is in must not open a popup').toEqual([])
  } finally {
    release()
  }

  await expect(google, 'aria-disabled must clear once the SDK has loaded').not.toHaveAttribute('aria-disabled', /.*/)
  await expect(google, 'aria-busy must clear once the SDK has loaded').not.toHaveAttribute('aria-busy', /.*/)

  await google.click()
  await expect(loginError, 'after the SDK loads the same click must reach sign-in').toBeVisible()
})
