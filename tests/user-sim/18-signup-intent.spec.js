// "Start for Free" must open the SIGN-UP form.
//
// FOUNDER-BATCH-5 REGRESSION GUARD. Every control promising a new free account
// — the hero, the header pill, the overflow menu, the bottom-of-page block and
// the Plans Free tier — opened a "Welcome Back" / "Sign In" form, with the
// actual signup demoted to a small text link underneath. Four of the highest
// traffic paths into the product told a first-time visitor they already had an
// account. The usability sweep called it the single highest-impact fix on the
// site (docs/audit-2026-08-11.md, P1).
//
// The popup is one component either way; only which form it OPENS on changed.
// So these tests assert the opening state, and that "Log in" — which shares the
// same popup — still opens on sign-in.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

const PERSONA = 'a first-time visitor clicking the primary call to action'

/** The popup's own heading tells you which form you are looking at. */
const dialogHeading = (page) => page.locator('.ui-login h2').first()

/* The signup-only field. Asserting on this rather than only on the heading is
 * what makes these tests locale-proof: the heading comes from en.json /
 * en-US.json and would drift with a copy change, but a form that collects a
 * NAME is a signup form in any language. */
const nameField = (page) => page.locator('#ui-login-name')

test.describe('signup intent', () => {
  test('the header "Start for Free" opens the sign-up form, not sign-in', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')          // a page where the CTA is visible immediately

    await page.getByRole('button', { name: 'Start for Free' }).first().click()
    await expect(dialogHeading(page)).toBeVisible()
    await expect(nameField(page), 'a signup form collects a name').toBeVisible()
    await expect(dialogHeading(page)).toHaveText(/create your free account/i)
    // …and the form actually collects what a signup needs.
    await expect(page.getByLabel('Name')).toBeVisible()
  })

  test('"Log in" still opens the sign-in form — the two are not the same button', async ({ page }) => {
    watch(page, 'a returning visitor')
    await go(page, '/plans')

    await page.getByRole('button', { name: 'Log in' }).first().click()
    await expect(dialogHeading(page)).toHaveText(/welcome back/i)
    await expect(nameField(page), 'a sign-in form does not').toHaveCount(0)
  })

  test('the homepage hero CTA carries its intent through a real navigation', async ({ page }) => {
    // The hero is a <Link>, so it stays middle-clickable — which is why the
    // intent travels in the URL rather than in a prop.
    watch(page, PERSONA)
    await go(page, '/')

    const hero = page.getByRole('link', { name: /Start building free/ })
    await expect(hero).toHaveAttribute('href', '/login?signup=1')

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

  test('the bottom-of-page block and the Plans free tier both mean sign-up', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')

    // The Plans Free tier is a link, like the hero.
    await expect(page.getByRole('link', { name: 'Start on Free' }))
      .toHaveAttribute('href', '/login?signup=1')

    // The SystemCTA block at the foot of the page opens in place.
    await page.getByRole('button', { name: /Start building free/ }).click()
    await expect(nameField(page), 'a signup form collects a name').toBeVisible()
    await expect(dialogHeading(page)).toHaveText(/create your free account/i)
  })
})
