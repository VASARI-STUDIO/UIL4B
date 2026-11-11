// never signed in downloads no Firebase, and the moment they ask to sign in (or
// are known to have a session) it arrives and works.
//
// WHAT THIS PROVES, AND ON WHICH BUILD. It runs against the deferred build, which
// is now the default for production and for `--mode test`. Built with
// `VITE_DEFER_FIREBASE=0` the first test fails: that is the check that it can fail.
//
// "Firebase was requested" is read off the network, not off the app's own state:
//   · the SDK chunks by file name (`firebase-*.js`, `firebase-auth-*`,
//     `firebase-firestore-*`, and `test-session-*`, which is what `--mode test`
//     puts in their place — the doubles never reach the real hosts);
//   · the three Google hosts the real SDK talks to, which a production build
//     would hit and this one must not even attempt.
// The 3.5 s wait before the negative assertion is deliberate: the idle backstop
// that used to fetch the SDK for every visitor was 2.5 s, so a wait shorter than
// that would pass for the very regression this guards.
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'

const SDK_CHUNK = /\/assets\/(?:firebase|firebase-auth|firebase-firestore|firebase-storage|test-session)-[\w-]{6,}\.js/
const GOOGLE_API = /(?:identitytoolkit|securetoken|firestore)\.googleapis\.com/
const IDLE_BACKSTOP_MS = 2500

function trackFirebase(page) {
  const hits = []
  page.on('request', (req) => {
    const url = req.url()
    if (SDK_CHUNK.test(url) || GOOGLE_API.test(url)) hits.push(url.replace(/^https?:\/\/[^/]+/, '').slice(0, 90) || url)
  })
  return hits
}

// The homepage has no Log in button of its own: signed out is the absence of the account button, and the way in is the toolkit link, then Log in on the workspace.
const account = (page) => page.getByRole('button', { name: 'Account and settings' })
const openToolkit = (page) => page.locator('#top').getByRole('link', { name: 'Open the toolkit' })

test.describe('Firebase is fetched only for a visitor who needs it', () => {
  test('a cold signed-out visit to / requests no Firebase SDK and calls no Firebase API', async ({ page }) => {
    watch(page, 'a first-time visitor reading the homepage')
    const hits = trackFirebase(page)
    await go(page, '/')
    await expectRendered(page, 'the homepage')
    await expect(openToolkit(page), 'the homepage must be usable without waiting for an answer').toBeVisible()
    await expect(account(page)).toHaveCount(0)
    await page.waitForTimeout(IDLE_BACKSTOP_MS + 1000)
    expect(hits, 'a visitor who never asked to sign in downloaded Firebase').toEqual([])
  })

  test('opening sign-in then loads Firebase and shows the form', async ({ page }) => {
    watch(page, 'a first-time visitor who decides to sign in')
    const hits = trackFirebase(page)
    await go(page, '/')
    await expectRendered(page, 'the homepage')
    expect(hits, 'precondition: nothing is loaded before the click').toEqual([])
    await openToolkit(page).click()
    await page.getByRole('button', { name: 'Log in' }).first().click()
    await expect(page.locator('#ui-login-email'), 'the sign-in form never appeared').toBeVisible()
    await expect.poll(() => hits.length, 'opening sign-in never fetched the SDK').toBeGreaterThan(0)
  })

  test('a returning visitor with a session hint is restored without asking', async ({ page }) => {
    watch(page, 'a returning member opening the site')
    const hits = trackFirebase(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/')
    await expect(account(page)).toBeVisible()
    expect(hits.length, 'the session was shown without the SDK ever loading').toBeGreaterThan(0)
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_AUTH__?.answered)).toBe(true)
    await expect(account(page)).toBeVisible()
  })

  test('a live session the hint missed shows signed out on /, and is restored when sign-in opens', async ({ page }) => {
    // The documented cost of the deferral. A browser with no `vs-session` hint is
    // treated as signed out on a page that asks nothing of Firebase; the session
    // comes back as soon as anything opens auth.
    watch(page, 'a member whose session hint was cleared')
    const hits = trackFirebase(page)
    await signIn(page, { plan: 'free', returning: false })
    await go(page, '/')
    await expectRendered(page, 'the homepage')
    await expect(account(page)).toHaveCount(0)
    await page.waitForTimeout(IDLE_BACKSTOP_MS + 1000)
    expect(hits, 'a browser with no hint downloaded Firebase on a page that asked nothing of it').toEqual([])
    await go(page, '/login')
    // LoginPage leaves only once it has a user, so arriving at /home is the session coming back.
    await expect(page).toHaveURL(/\/home\/?$/)
  })
})
