// The Firebase deferral, in the browser, on the DEFAULT (unflagged) build.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS CAN AND CANNOT PROVE, STATED FIRST
// ─────────────────────────────────────────────────────────────────────────────
// `VITE_DEFER_FIREBASE` is a BUILD flag — it changes which chunk the SDK lands
// in, which rolldown decides before a browser is involved. `npm run test:users`
// builds with `vite build --mode test` and no flag, so this suite cannot run the
// deferred code path at all. Pretending otherwise by asserting something that
// happens to be true in both builds is exactly the failure this repo has paid
// for four times: a test beside a correct fix that exercises nothing.
//
// So this spec guards the half that IS live on every build — the seams the
// deferral routes the app through, which now sit between App.jsx and Firebase on
// the default path too. If a seam is broken, the flagged build is irrelevant
// because the shipped one is already wrong.
//
// The deferred build's own behaviour is measured, not asserted, by
// `scripts/firebase-deferral-trial.mjs` + `scripts/home-field-metrics.mjs`,
// for the same reason #402 kept the timings out of this suite: they depend on
// the machine, and a guard that fails at random is one people learn to ignore.
// The STRUCTURE of the deferral — which is exact, and is what regresses
// silently — is guarded by `tests/unit/firebase-deferral.test.js` and by the
// build itself (`assertFirebaseIsDeferred` in vite.config.js).
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
  const hero = page.locator('.home-hero-h1')
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
  // founder-gated `GoogleOneTap.jsx`. On the default build it must be a
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
  watch(page, 'a signed-out visitor whose browser should be offered One Tap')
  await go(page, '/')
  await expectRendered(page, 'the homepage')

  await expect(
    page.locator(GIS_SCRIPT),
    'the app never injected the Google Identity Services script, so the One Tap mount seam did not render '
    + 'GoogleOneTap. Automatic sign-in is silently gone for every returning Google user.',
  ).toHaveCount(1, { timeout: 20000 })
})

test('the account affordance resolves, so auth still reaches the chrome', async ({ page }) => {
  // The end of the chain the broker sits in the middle of: AuthContext resolves,
  // `loading` clears, and the nav renders a sign-in affordance rather than
  // staying in its loading state forever. A deferral that never resolved would
  // look exactly like this test failing.
  watch(page, 'a signed-out visitor looking for the way in')
  await go(page, '/')
  await expectRendered(page, 'the homepage')

  const signIn = page.getByRole('link', { name: /sign in|log ?in/i })
    .or(page.getByRole('button', { name: /sign in|log ?in/i }))
  await expect(
    signIn.first(),
    'no sign-in affordance appeared — auth never resolved to "signed out", which is the state every '
    + 'public page load ends in',
  ).toBeVisible({ timeout: 20000 })
})
