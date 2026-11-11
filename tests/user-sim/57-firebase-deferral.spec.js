// The Firebase access broker, in the browser, on the default (deferred) build.
//
// This guards that the seams the deferral routes the app through boot and
// render: a broken export in `src/utils/firebaseAccess` throws while the module
// graph evaluates and paints nothing. What the deferral actually saves (no SDK
// request for a cold signed-out visit, the SDK arriving when sign-in opens) is
// asserted in `57-firebase-cold-visit.spec.js`; the import-graph structure is
// guarded by `tests/unit/firebase-deferral.test.js` and by the build itself
// (`assertFirebaseIsDeferred` in vite.config.js).
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

// Matched by PATH, not by host, on purpose. `tests/unit/one-tap-stub.test.js`
// fails the build if any spec but the One Tap guard spec names that host in
// code, so that one mechanism handles it and two cannot race. This spec has no
// need to name it: it is asking whether the app injected the script tag, and
// the path identifies that uniquely.
const GIS_SCRIPT = 'script[src$="/gsi/client"]'

test('the homepage boots through the Firebase access broker and renders real content', async ({ page }) => {
  watch(page, 'a first-time visitor on the homepage after the broker was introduced')
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  await go(page, '/')
  await expectRendered(page, 'the homepage')

  // POSITIVE CONTROL, first. `src/utils/analytics.js`, `ProjectContext` and
  // `App.jsx` now reach Firebase through `src/utils/firebaseAccess`, and a
  // broken export there throws while the module graph is still evaluating —
  // which paints nothing at all. A page that renders nothing paints fast and
  // passes every check that does not look at its text.
  // The headline is the one `h1.hh-h1`. The control does one job: a broken export
  // in firebaseAccess throws while the module graph is evaluating, which paints
  // nothing, and a blank page passes every check below.
  const hero = page.locator('section#top h1.hh-h1')
  await expect(hero).toBeVisible()
  const heroText = (await hero.innerText()).trim()
  expect(
    heroText.length,
    `the homepage headline rendered ${heroText.length} characters — everything below is meaningless on a blank page`,
  ).toBeGreaterThan(20)

  expect(pageErrors, `the page threw while booting: ${pageErrors.join(' | ')}`).toEqual([])
})

test('the One Tap mount seam is live — the app still injects Google Identity Services', async ({ page }) => {
  // `src/components/oneTapMount.jsx` is the seam that lets a deferred build hold
  // One Tap back until the Firebase gate opens, WITHOUT editing the
  // approval-gated `GoogleOneTap.jsx`. On the default build it must be a
  // transparent re-export, and the only way to see that from the browser is
  // that One Tap still does the one thing it does on a signed-out page: inject
  // the GIS script.
  //
  // The request never leaves the machine — `base.js` serves an empty script
  // from a browser-level stub — so this asserts the app's own behaviour, not
  // Google's. It deliberately waits for the app to inject the tag rather than
  // injecting one itself: a tag this spec added would prove nothing about the
  // seam. That is the opposite choice to `26-one-tap-stub.spec.js`, which is
  // guarding the stub rather than the mount and must not depend on auth.
  //
  // One Tap mounts only on the routes in src/components/oneTapRoutes.js, so the
  // sign-in page is where it must load, and a tool page is where it must not.
  watch(page, 'a signed-out visitor whose browser should be offered One Tap')
  await go(page, '/login')

  await expect(
    page.locator(GIS_SCRIPT),
    'the app never injected the Google Identity Services script on /login, so the One Tap mount seam did not render '
    + 'GoogleOneTap. Automatic sign-in is silently gone for every returning Google user.',
  ).toHaveCount(1, { timeout: 20000 })
})

test('One Tap stays off a page someone is only browsing', async ({ page }) => {
  watch(page, 'a signed-out visitor using a tool, who has not asked to sign in')
  await go(page, '/create/palette')
  await expectRendered(page, 'the palette tool')
  // Long enough for the mount to have injected the script if it were going to.
  await page.waitForTimeout(3000)
  await expect(page.locator(GIS_SCRIPT), 'One Tap loaded on a tool page').toHaveCount(0)
})

test('the account affordance resolves, so auth still reaches the chrome', async ({ page }) => {
  // The end of the chain the broker sits in the middle of: AuthContext resolves,
  // `loading` clears, and the nav renders a sign-in affordance rather than
  // staying in its loading state forever. A deferral that never resolved would
  // look exactly like this test failing.
  watch(page, 'a signed-out visitor looking for the way in')
  await go(page, '/')
  await expectRendered(page, 'the homepage')

  // THROUGH THE FRONT DOOR'S ONE WAY IN. The marketing chrome is the design
  // exactly: a flat bar with no account block. The hero's "Open the
  // toolkit" enters the app with no sign-up gate, so the sign-in affordance a
  // signed-out visitor meets is the app header's, one press from `/`. It is
  // still rendered from `user`, so it cannot show "Log in" until AuthContext
  // has resolved to signed out — which is the whole point of this test.
  await page.locator('#top .hh-go').click()
  await expect(page).toHaveURL(/\/projects$/)

  const signIn = page.getByRole('link', { name: /sign in|log ?in/i })
    .or(page.getByRole('button', { name: /sign in|log ?in/i }))
  await expect(
    signIn.first(),
    'no sign-in affordance appeared — auth never resolved to "signed out", which is the state every '
    + 'public page load ends in',
  ).toBeVisible({ timeout: 20000 })
})
