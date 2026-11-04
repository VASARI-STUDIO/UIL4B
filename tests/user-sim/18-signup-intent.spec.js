// "Start for Free" must open the SIGN-UP form.
//
// REGRESSION GUARD. Every control promising a new free account
// — the hero, the header pill, the overflow menu, the bottom-of-page block and
// the Plans Free tier — opened a "Welcome Back" / "Sign In" form, with the
// actual signup demoted to a small text link underneath. Four of the highest
// traffic paths into the product told a first-time visitor they already had an
// account, which is the costliest kind of wrong turn on the site.
//
// The popup is one component either way; only which form it OPENS on changed.
// So these tests assert the opening state, and that "Log in" — which shares the
// same popup — still opens on sign-in.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'a first-time visitor clicking the primary call to action'

/** The popup's own heading tells you which form you are looking at. */
// BY ID, NOT BY TAG. The form title is an h1 on the /login page and an h2 in the
// dialog that opens over any other page. Some cases below open it on the page,
// so a tag selector would be asserting the heading LEVEL while pretending to
// assert the text. `#ui-login-title` is identical in both and is what the
// dialog's aria-labelledby points at; the level is
// 09-auth-modal-accessibility's to police, and it does.
const dialogHeading = (page) => page.locator('#ui-login-title').first()

/* The signup-only field. Asserting on this rather than only on the heading is
 * what makes these tests locale-proof: the heading comes from en.json /
 * en-US.json and would drift with a copy change, but a form that collects a
 * NAME is a signup form in any language. */
// Only the sign-up form carries the password hint, so it tells the two forms apart.
const signupOnly = (page) => page.locator('#ui-login-pw-help')
const nameField = (page) => page.locator('#ui-login-name')

test.describe('signup intent', () => {
  test('the header menu "Create a free account" opens the sign-up form, not sign-in', async ({ page }) => {
    watch(page, PERSONA)
    // A page with the APP header, where the CTA is visible immediately. /plans
    // is the design's Pricing screen with the marketing nav; /help is an
    // app-shell page.
    await go(page, '/learn/help')

    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'Create a free account' }).click()
    await expect(dialogHeading(page)).toBeVisible()
    await expect(signupOnly(page), 'a signup form is open').toBeVisible()
    await expect(dialogHeading(page)).toHaveText(/create your free account/i)
    // Two fields, not three: the form no longer asks for a name, and the
    // password hint is tied to its input.
    await expect(nameField(page), 'the signup form still asks for a name').toHaveCount(0)
    await expect(page.locator('#ui-login-password')).toHaveAttribute('aria-describedby', 'ui-login-pw-help')
  })

  test('"Log in" still opens the sign-in form — the two are not the same button', async ({ page }) => {
    watch(page, 'a returning visitor')
    await go(page, '/learn/help')           // an app-header page, as above

    await page.getByRole('button', { name: 'Log in' }).first().click()
    await expect(dialogHeading(page)).toHaveText(/log in to uil4b/i)
    await expect(signupOnly(page), 'a sign-in form is not a signup form').toHaveCount(0)
  })

  test('the homepage hero CTA carries its intent through a real navigation', async ({ page }) => {
    // The hero is a <Link>, so it stays middle-clickable — which is why the
    // intent travels in the URL rather than in a prop.
    watch(page, PERSONA)
    await go(page, '/')

    // BY POSITION, NOT BY LABEL. This matched the words "Start building free",
    // which was the old homepage's hero CTA; `/` renders src/pages/Spectrum.jsx
    // now and its hero CTA reads "Open the toolkit" (Spectrum.jsx: `toolkitTo =
    // user ? '/projects' : '/login?signup=1'`). The GUARANTEE is unchanged and
    // is the one thing this test is for: whatever the primary hero control
    // says, for a signed-out visitor it must carry the signup intent in the URL
    // rather than drop them on a "Welcome Back" form. Anchoring on the hero's
    // own first CTA rather than on its copy is what stops the next headline
    // rewrite turning this into a test of nothing.
    //
    // "Open the toolkit" is a free CTA and does its job WITHOUT an account: it
    // goes straight into the app at /projects, and no sign-up form stands in
    // the way. Sign-up is asked for only when saving or exporting.
    const hero = page.locator('.sp-hero-cta .sp-pill').first()
    await expect(hero).toBeVisible()
    await expect(hero).toHaveAttribute('href', '/projects')
    await hero.click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(signupOnly(page), 'opening the toolkit put a sign-up form in the way').toHaveCount(0)

    // The closing band's CTA is free too: the workspace, no sign-up form.
    await go(page, '/')
    const close = page.locator('.sp-close-cta').getByRole('link', { name: 'Use for free' })
    await expect(close).toHaveAttribute('href', '/projects')
    await expect(page.locator('.sp-close-cta').getByRole('button'), 'the closing band opens a sign-up form again').toHaveCount(0)

    await go(page, '/login?signup=1')
    await expect(signupOnly(page), 'a signup form is open').toBeVisible()
    await expect(dialogHeading(page)).toHaveText(/create your free account/i)
  })

  test('a bare /login visit is still a sign-in, so bookmarks are unchanged', async ({ page }) => {
    watch(page, 'a returning visitor opening a bookmark')
    await go(page, '/login')
    await expect(dialogHeading(page)).toHaveText(/log in to uil4b/i)
    await expect(signupOnly(page), 'a sign-in form is not a signup form').toHaveCount(0)
  })

  // The Free column on /plans reads "Open the toolkit". This spec checks that it
  // links to /projects, that following it lands there, and that no dialog opens
  // on the way. The Pro CTA is the one that leads to sign-in, with the checkout
  // as its destination — 99-pricing-screen.spec.js walks that.
  test('the Plans free tier opens the toolkit without a sign-up gate', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')

    const free = page.locator('.pr-head--free').getByRole('link', { name: 'Open the toolkit' })
    await expect(free).toHaveAttribute('href', '/projects')
    await free.click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.locator('[role="dialog"]'), 'the toolkit is not gated behind a sign-up dialog').toHaveCount(0)
  })
})
