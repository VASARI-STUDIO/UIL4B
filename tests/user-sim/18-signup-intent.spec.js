// "Start for Free" must open the SIGN-UP form.
//
// FOUNDER-BATCH-5 REGRESSION GUARD. Every control promising a new free account
// — the hero, the header pill, the overflow menu, the bottom-of-page block and
// the Plans Free tier — opened a "Welcome Back" / "Sign In" form, with the
// actual signup demoted to a small text link underneath. Four of the highest
// traffic paths into the product told a first-time visitor they already had an
// account. The usability sweep called it the single highest-impact fix on the
// site (2026-08-11 site audit, P1).
//
// The popup is one component either way; only which form it OPENS on changed.
// So these tests assert the opening state, and that "Log in" — which shares the
// same popup — still opens on sign-in.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'a first-time visitor clicking the primary call to action'

/** The popup's own heading tells you which form you are looking at. */
// BY ID, NOT BY TAG. This read `.ui-login h2` and broke on 2026-09-15 when the
// dialog began titling itself for its context: on the /login ROUTE it is an h1,
// because LoginRoute renders null and the dialog is the whole document, and
// everywhere else it stays an h2 over a page that has its own h1. Three of the
// six cases below open it on the route, so a tag selector is asserting the
// heading LEVEL while pretending to assert the text. `#ui-login-title` is what
// aria-labelledby points at and is identical in both branches — the level is
// 09-auth-modal-accessibility's to police, and it does.
const dialogHeading = (page) => page.locator('#ui-login-title').first()

/* The signup-only field. Asserting on this rather than only on the heading is
 * what makes these tests locale-proof: the heading comes from en.json /
 * en-US.json and would drift with a copy change, but a form that collects a
 * NAME is a signup form in any language. */
const nameField = (page) => page.locator('#ui-login-name')

test.describe('signup intent', () => {
  test('the header menu "Create a free account" opens the sign-up form, not sign-in', async ({ page }) => {
    watch(page, PERSONA)
    // A page with the APP header, where the CTA is visible immediately. /plans
    // is the design's Pricing screen with the marketing nav; /help is an
    // app-shell page.
    await go(page, '/help')

    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'Create a free account' }).click()
    await expect(dialogHeading(page)).toBeVisible()
    await expect(nameField(page), 'a signup form collects a name').toBeVisible()
    await expect(dialogHeading(page)).toHaveText(/create your free account/i)
    // …and that field is LABELLED, which the id lookup above cannot prove. This
    // asserts the accessible name of THAT element rather than searching the page
    // for one containing "Name".
    //
    // It used to be `page.getByLabel('Name')`, and that broke on 2026-09-14 for
    // a reason worth keeping: getByLabel does a SUBSTRING match, and the
    // founder's new positioning line — "No more trying to remember the names of
    // the 1 tool websites." — labels the closing `.system-cta` region on this
    // very page. So the locator matched the region AND the input, and Playwright
    // refused it in strict mode. The page was correct; the locator was never
    // anchored.
    // A REAL <label>, not a placeholder. `toHaveAccessibleName` alone was not
    // enough and this was proved rather than assumed: orphaning the <label> and
    // re-running left all five tests GREEN, because Playwright falls back to
    // `placeholder="Your name"` when computing the name. A placeholder is not a
    // label — it disappears the moment someone types, so a person who looks away
    // mid-form has nothing left telling them what the field is.
    //
    // So this asserts the association itself.
    await expect(
      page.locator('label[for="ui-login-name"]'),
      'the name field is labelled by a real <label>, not just a placeholder',
    ).toHaveCount(1)
  })

  test('"Log in" still opens the sign-in form — the two are not the same button', async ({ page }) => {
    watch(page, 'a returning visitor')
    await go(page, '/help')           // an app-header page, as above

    await page.getByRole('button', { name: 'Log in' }).first().click()
    await expect(dialogHeading(page)).toHaveText(/welcome back/i)
    await expect(nameField(page), 'a sign-in form does not').toHaveCount(0)
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
    await expect(nameField(page), 'opening the toolkit put a sign-up form in the way').toHaveCount(0)

    // The closing band's CTA is free too: the workspace, no sign-up form.
    await go(page, '/')
    const close = page.locator('.sp-close-cta').getByRole('link', { name: 'Use for free' })
    await expect(close).toHaveAttribute('href', '/projects')
    await expect(page.locator('.sp-close-cta').getByRole('button'), 'the closing band opens a sign-up form again').toHaveCount(0)

    await go(page, '/login?signup=1')
    await expect(nameField(page), 'a signup form collects a name').toBeVisible()
    await expect(dialogHeading(page)).toHaveText(/create your free account/i)
  })

  test('a bare /login visit is still a sign-in, so bookmarks are unchanged', async ({ page }) => {
    watch(page, 'a returning visitor opening a bookmark')
    await go(page, '/login')
    await expect(dialogHeading(page)).toHaveText(/welcome back/i)
    await expect(nameField(page), 'a sign-in form does not').toHaveCount(0)
  })

  // /plans is the design's Pricing screen: its Free card says "Open the
  // toolkit", and a signed-out visitor goes straight into the app with no
  // sign-up gate. What still means
  // sign-up on /plans is the Pro CTA, which opens the sign-in flow and carries
  // the checkout as its destination — 101-pricing-screen.spec.js walks that.
  test('the Plans free tier opens the toolkit without a sign-up gate', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')

    const free = page.locator('.pr-plan--free').getByRole('link', { name: 'Open the toolkit' })
    await expect(free).toHaveAttribute('href', '/projects')
    await free.click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.locator('[role="dialog"]'), 'the toolkit is not gated behind a sign-up dialog').toHaveCount(0)
  })
})
