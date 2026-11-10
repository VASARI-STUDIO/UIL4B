// The Google button on the sign-in form stays disabled (aria-busy) until the auth
// SDK is in, then enables. signInWithPopup has to run inside the click, and
// awaiting the SDK download first can lose the browser's user activation.
//
// The auth SDK chunk is held at the network, so "before it loads" is a state the
// test controls rather than a race it hopes to win. Removing the readiness
// condition from the button turns the first assertion red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const AUTH_SDK_CHUNK = /\/assets\/firebase-auth-[\w-]{6,}\.js/

test('the Google button is disabled and busy until the auth SDK loads, then enabled', async ({ page }) => {
  watch(page, 'a visitor on the log-in page while the auth SDK is still downloading')

  let release
  const held = new Promise((resolve) => { release = resolve })
  let heldRequests = 0
  await page.route(AUTH_SDK_CHUNK, async (route) => {
    heldRequests += 1
    await held
    await route.continue().catch(() => {})
  })

  try {
    await go(page, '/login')
    const google = page.locator('main .auth-google-btn')
    await expect(google, 'the log-in page must show the Google button').toBeVisible()
    await expect.poll(() => heldRequests, 'the page never asked for the auth SDK').toBeGreaterThan(0)

    await expect(google, 'the button must not be pressable before the SDK is in').toBeDisabled()
    await expect(google).toHaveAttribute('aria-busy', 'true')
  } finally {
    release()
  }

  const google = page.locator('main .auth-google-btn')
  await expect(google, 'the button must enable once the SDK has loaded').toBeEnabled()
  await expect(google).not.toHaveAttribute('aria-busy', /.*/)
})
