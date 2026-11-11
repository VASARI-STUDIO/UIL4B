// A BUYER WHO HAS NO ACCOUNT YET: SIGN UP, ONBOARDING, BACK TO THE CHECKOUT RETURN.
//
// Stripe sends the buyer to /checkout/return?session_id=... A visitor with no account
// is turned away to /login with that address as `from`; LoginPage stashes it for a
// new account to resume (vs-resume-after-onboarding). This walks the whole seam as a
// person does, with nothing signed in at the start:
//
//   /checkout/return?session_id=...   signed out, so /login
//   switch to "Create one", fill the email and password, "Create account"
//   /onboarding                       AppInner sends every new account here, and the
//                                     account's document holds an OPEN onboarding
//                                     record (openedAt, no completedAt)
//   "Not now, take me to my projects" the buyer is not dropped on /projects: the stash
//                                     takes them back to /checkout/return?session_id=...
//                                     and the record is now complete
//
// A second walk with nothing to resume ends on /projects, the control for the first
// (the resume is what differs, not the button).
//
// The sign-up is made by the fixture (test-session.js signUpNow, reached through
// createUserWithEmailAndPassword on a `lateSignIn` page): a new uid, no name, made
// just now. Everything after it is the app's own: the profile write, the onboarding
// record, the redirect.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// LoginPage.jsx: delete `useEffect(() => { stashResumeTarget(from) }, [from])` (the
// buyer lands on /projects and the resume test fails). Onboarding.jsx skipFirstWin:
// `navigate(FIRST_RUN_DESTINATION)` without takeResumeTarget (same test). AuthContext
// signup: drop `onboarding: openOnboardingRecord(...)` from the new profile (the
// record test fails, and the app skips onboarding). AppInner: stop sending a new
// account to /onboarding (the /onboarding wait fails).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SESSION = 'cs_test_signup_resume'
const RETURN = `/checkout/return?session_id=${SESSION}`
const NEW_UID = 'test-uid-new'
const EMAIL = 'new.buyer@uil4b.test'
const RESUME_KEY = 'vs-resume-after-onboarding'

const here = (page) => {
  const u = new URL(page.url())
  return u.pathname + u.search
}
const record = (page) => page.evaluate((uid) => window.__UIL4B_TEST_STORE__.get(`users/${uid}`)?.onboarding ?? null, NEW_UID)

const answerStatus = (page) => page.route('**/api/checkout-status*', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ status: 'complete', mode: 'subscription', subscriptionActive: false, customerEmail: EMAIL }),
}))

async function createAccount(page) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
  await page.getByRole('button', { name: /Create one$/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
  await page.locator('#ui-login-email').fill(EMAIL)
  await page.locator('#ui-login-password').fill('a-long-test-password')
  await page.getByRole('button', { name: 'Create account' }).click()
}

test('a signed-out buyer on the checkout return signs up, onboards, and is sent back to the return', async ({ page }) => {
  watch(page, 'a buyer with no account back from Stripe')
  await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
  await answerStatus(page)

  await go(page, RETURN)
  await expect.poll(() => new URL(page.url()).pathname, { message: 'a visitor with no account is turned away' }).toBe('/login')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
  await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY), { message: 'the login page stashed where the buyer was headed' }).toBe(RETURN)

  await createAccount(page)

  await expect.poll(() => new URL(page.url()).pathname, { message: 'a new account goes to onboarding' }).toBe('/onboarding')
  await expect(page.getByRole('heading', { level: 1, name: 'What do you want to make first?' })).toBeVisible()
  expect(await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signedIn), 'the account the form made is the signed-in one').toBe(true)
  await expect.poll(async () => (await record(page))?.openedAt, { message: 'the new account document holds an open onboarding record' }).toEqual(expect.any(Number))
  const open = await record(page)
  expect(open.completedAt, 'owed, not finished').toBeUndefined()
  const doc = await page.evaluate((uid) => window.__UIL4B_TEST_STORE__.get(`users/${uid}`), NEW_UID)
  expect(doc.email, 'the document is the new buyer\'s').toBe(EMAIL)
  expect(doc.subscription, 'a new account has no plan').toBeUndefined()

  await page.getByRole('button', { name: 'Not now, take me to my projects' }).click()
  await expect.poll(() => here(page), { message: 'the buyer resumes where they were headed, not on /projects' }).toBe(RETURN)
  // The redesigned return page (#569) shows only the last 8 characters of the session id, as
  // "…p_resume" under Reference; the full id is no longer in the page. The URL (the `here` check
  // above) carries the whole id, so it proves the buyer is back on THEIR session; the page's own
  // reference proves the return page read it. The mocked status is a paid subscription still
  // settling, so the headline is "Payment received."
  await expect(page.locator('.co-return h1')).toHaveText('Payment received.')
  await expect(page.locator('.co-details .co-detail', { has: page.locator('dt', { hasText: /^Reference$/ }) }).locator('.co-ref-code')).toHaveText(`…${SESSION.slice(-8)}`)
  await expect.poll(async () => (await record(page))?.completedAt, { message: 'onboarding is recorded as finished' }).toEqual(expect.any(Number))
  expect(await page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY), 'the stash is used up').toBeNull()
})

test('the same sign-up with nothing to resume ends on /projects', async ({ page }) => {
  watch(page, 'a new visitor signing up from the login page')
  await signIn(page, { plan: 'free', lateSignIn: true, returning: false })

  await go(page, '/login')
  await createAccount(page)

  await expect.poll(() => new URL(page.url()).pathname).toBe('/onboarding')
  await expect.poll(async () => (await record(page))?.openedAt).toEqual(expect.any(Number))
  await page.getByRole('button', { name: 'Not now, take me to my projects' }).click()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/projects')
  await expect.poll(async () => (await record(page))?.completedAt).toEqual(expect.any(Number))
})
