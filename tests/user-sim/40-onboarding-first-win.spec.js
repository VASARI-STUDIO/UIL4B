// Onboarding, walked.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS SPEC NEEDS A FIXTURE, AND WHAT THE FIXTURE IS NOT
// ─────────────────────────────────────────────────────────────────────────────
// /onboarding is signed-in only, and this suite has no way to create a real
// account: it runs against `vite preview`, there is no backend, and the audit
// that produced these items was marked `partial` precisely because signed-in
// surfaces are unreachable from a signed-out session.
//
// So the screen that replaced the pricing step could be reasoned about but never
// OBSERVED, which is how a flow ends up shipping with a card that navigates
// nowhere. This seeds Firebase Auth's own IndexedDB persistence with a
// restorable user so AuthContext resolves signed-in and the component mounts.
//
// WHAT THAT IS: a rendering fixture. Enough for the SPA to decide it has a user.
// WHAT IT IS NOT: a session. No token is valid, nothing is signed, every
// Firestore read fails, and the profile never hydrates — which is why the tests
// below assert only on what the component renders and where it navigates, never
// on persisted state coming back.
//
// If Firebase changes its persistence format this fixture stops working. It
// then FAILS LOUDLY on the first assertion (the screen simply will not be
// there) rather than skipping — a fixture that silently stops covering
// something is the exact failure mode base.js was written to end.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Mirrors the fallback in src/utils/firebase.js. The preview build has no
// VITE_FIREBASE_API_KEY, so this is the key the SDK actually uses; a unit test
// is not possible here, so the spec asserts the screen appears, which is the
// observable consequence of the key being right.
const API_KEY = 'AIzaSyADQoAyU3qwAls2bUW6rfE1csZa0Ud6EKE'

async function seedSignedIn(page, baseURL) {
  // Firebase VALIDATES a restored user against Google on the next load. A
  // forged token is answered with a 400, and the SDK then DELETES the persisted
  // record and signs out — which is correct of it, and is why simply writing
  // the record is not enough. (Observed: the record is present before the
  // navigation and gone after it, with the app back on /login.)
  //
  // Aborting those two hosts makes the same calls fail as a NETWORK error
  // instead, which the SDK treats as retryable and keeps the user for. The
  // suite already blocks every external host, so this changes the failure mode
  // of a request that was never going to succeed here, not whether it is made.
  //
  // Nothing is forged in the response: no fake token is minted and no auth
  // answer is faked. The app simply cannot reach Google, exactly as in the rest
  // of this suite, and falls back to the user it already had.
  await page.route('**://securetoken.googleapis.com/**', (r) => r.abort())
  await page.route('**://identitytoolkit.googleapis.com/**', (r) => r.abort())
  await go(page, baseURL + '/')
  const result = await page.evaluate(async (apiKey) => {
    const user = {
      uid: 'usersim-first-win',
      email: 'first.win@example.com',
      displayName: 'Ada Lovelace',
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
      apiKey,
      appName: '[DEFAULT]',
      stsTokenManager: {
        refreshToken: 'usersim', accessToken: 'usersim',
        expirationTime: Date.now() + 3600e3,
      },
      createdAt: String(Date.now()),
      lastLoginAt: String(Date.now()),
    }
    return await new Promise((resolve) => {
      const open = indexedDB.open('firebaseLocalStorageDb', 1)
      open.onupgradeneeded = () =>
        open.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' })
      open.onsuccess = () => {
        const tx = open.result.transaction('firebaseLocalStorage', 'readwrite')
        tx.objectStore('firebaseLocalStorage')
          .put({ fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`, value: user })
        tx.oncomplete = () => resolve('seeded')
        tx.onerror = () => resolve('tx-error')
      }
      open.onerror = () => resolve('open-error')
    })
  }, API_KEY)
  expect(result, 'the auth fixture must be written before onboarding is opened').toBe('seeded')
}

const firstWinStep = (page) => page.locator('[data-testid="onboarding-first-win"]')

test.describe('the first win is on the path, in place of the pricing step', () => {
  test('a brand-new account is asked what to make, not what to pay', async ({ page, baseURL }) => {
    watch(page, 'a brand-new account reaching onboarding')
    await seedSignedIn(page, baseURL)
    await go(page, baseURL + '/onboarding')

    const step = firstWinStep(page)
    await expect(step, 'the first-win screen must render for a signed-in account').toBeVisible()
    await expect(step.getByRole('heading', { name: 'What do you want to make first?' })).toBeVisible()

    // The three starting points are the three the sign-up dialog promises
    // ("Your palettes, type scales and gradients, kept") — see utils/firstWin.js.
    await expect(page.locator('[data-first-win]')).toHaveCount(3)
    for (const id of ['palette', 'type-scale', 'gradient']) {
      await expect(page.locator(`[data-first-win="${id}"]`)).toBeVisible()
    }

    // The step that asked for money before anything had been made is gone.
    await expect(page.locator('.onb-tiers')).toHaveCount(0)
    await expect(page.locator('.onb-billing')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Go Pro/ })).toHaveCount(0)

    // Gone from the path, not hidden: the tier truth stays, with a real link.
    await expect(step.getByRole('link', { name: 'Pro' })).toHaveAttribute('href', '/plans')
  })

  test('the heading takes focus, so the screen is announced', async ({ page, baseURL }) => {
    // App.jsx navigates here with replace:true and manages no focus of its own,
    // so without this a keyboard/AT user is dropped on <body> (audit C5 / QA Q3).
    watch(page, 'reaching onboarding with a keyboard')
    await seedSignedIn(page, baseURL)
    await go(page, baseURL + '/onboarding')
    await expect(firstWinStep(page)).toBeVisible()

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName), { timeout: 5000 })
      .toBe('H1')
    expect(await page.evaluate(() => document.activeElement?.textContent))
      .toContain('What do you want to make first?')
  })

  // Each card must OPEN ITS TOOL. A card that lands on the "still building"
  // state, or on the colour sales page, would be the first thing a new account
  // is shown — and nothing before this test could observe that.
  for (const [id, heading] of [
    ['palette', /palette/i],
    ['type-scale', /type scale/i],
    ['gradient', /gradient/i],
  ]) {
    test(`picking "${id}" opens the real tool`, async ({ page, baseURL }) => {
      watch(page, `a new account starting with ${id}`)
      await seedSignedIn(page, baseURL)
      await go(page, baseURL + '/onboarding')
      await expect(firstWinStep(page)).toBeVisible()

      await page.locator(`[data-first-win="${id}"]`).click()

      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 10000 })
        .toBe(`/create/${id}`)

      // Not merely the right URL: a LIVE tool. CreateTool renders the 🤫
      // still-building state for a `soon` route, and that state is what a
      // mistyped or retired route would land on.
      await expect(page.getByText(/still building|coming soon/i)).toHaveCount(0)
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()

      // Onboarding is finished, so the flow cannot re-appear on the next load.
      expect(await page.evaluate(() => localStorage.getItem('vs-onboarded'))).toBe('1')
      // ...and the time-to-value clock is running, which is what utils/
      // timeToValue.js measures the first activation against.
      expect(
        await page.evaluate(() => localStorage.getItem('vs-first-win-started')),
        'the time-to-value clock must start when the screen is answered',
      ).toMatch(/^\d+$/)
    })
  }

  test('declining still finishes onboarding and lands on the teaching empty state', async ({ page, baseURL }) => {
    // The decline path is the one that used to write localStorage only, so the
    // account never learned onboarding had happened and it returned forever on
    // every new browser. It must complete, and it must not invent an answer.
    watch(page, 'a new account declining all three starts')
    await seedSignedIn(page, baseURL)
    await go(page, baseURL + '/onboarding')
    await expect(firstWinStep(page)).toBeVisible()

    await page.getByRole('button', { name: /Not now/ }).click()

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toBe('/projects')
    expect(await page.evaluate(() => localStorage.getItem('vs-onboarded'))).toBe('1')
    expect(await page.evaluate(() => localStorage.getItem('vs-first-win-started'))).toMatch(/^\d+$/)
  })

  test('the three unread survey questions are gone from the flow', async ({ page, baseURL }) => {
    // onboarding-survey-unused. Asserted on the RENDERED flow rather than on
    // source text: the question is whether a new account is still made to
    // answer them, not whether a string survives somewhere.
    watch(page, 'checking the survey is really gone')
    await seedSignedIn(page, baseURL)
    await go(page, baseURL + '/onboarding')
    await expect(firstWinStep(page)).toBeVisible()

    await expect(page.getByText('How did you hear about us?')).toHaveCount(0)
    await expect(page.getByText('What best describes you?')).toHaveCount(0)
    await expect(page.getByText(/Quick question \d of \d/)).toHaveCount(0)
    // One screen, so the progress rail and the corner Skip went with it.
    await expect(page.locator('.onb-dot')).toHaveCount(0)
    await expect(page.locator('.onb-skip')).toHaveCount(0)
  })
})

test.describe('onboarding stays signed-in only', () => {
  test('a signed-out visitor is sent to sign in, not shown the flow', async ({ page, baseURL }) => {
    watch(page, 'a signed-out visitor opening /onboarding directly')
    await go(page, baseURL + '/onboarding')
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toBe('/login')
    await expect(firstWinStep(page)).toHaveCount(0)
  })

  test('the sign-up promise still names the three starting points', async ({ page, baseURL }) => {
    // utils/firstWin.js derives the three from this sentence. If the dialog's
    // promise changes, the first wins must change with it — a unit test pins
    // the source, and this pins what a person is actually shown.
    watch(page, 'reading the sign-up dialog')
    await go(page, baseURL + '/discover/palettes')
    await page.getByRole('button', { name: 'Start for Free' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/palettes, type scales and gradients/)).toBeVisible()
  })
})
