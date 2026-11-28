// /settings?section=<id> opens that section. Emails link to it (the trial
// reminder points at ?section=support), so it has to work at a phone and a
// desktop width, drop the parameter from the address, and ignore ids that are
// not sections.
//
// MUTATIONS (each turns the tests named red):
//   the ?section effect in Settings.jsx removed     -> "a link to ?section=support opens Plan and billing" (both widths)
//   `params.delete('section')` removed              -> same tests (the address keeps ?section)
//   the known-id check removed                      -> "an unknown section id is dropped" (no section panel matches)
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

for (const width of [390, 1440]) {
  test.describe(`settings section links at ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } })

    test(`a link to ?section=support opens Plan and billing at ${width}`, async ({ page }) => {
      watch(page, 'someone following the cancel link in a trial email')
      await signIn(page, { plan: 'pro' })
      await go(page, '/settings?section=support')
      await expect(page.locator('#set-support')).toBeVisible()
      await expect(page).toHaveURL(/\/settings$/)
    })

    test(`an unknown section id is dropped at ${width}`, async ({ page }) => {
      watch(page, 'someone with a mangled settings link')
      await signIn(page, { plan: 'free' })
      await go(page, '/settings?section=bogus')
      await expect(page).toHaveURL(/\/settings$/)
      await expect(page.locator('#set-bogus')).toHaveCount(0)
      if (width === 1440) await expect(page.locator('#set-account')).toBeVisible()
    })
  })
}

test('signed out, ?section=account falls back without a blank page', async ({ page }) => {
  watch(page, 'a signed-out visitor following an account link')
  await go(page, '/settings?section=account')
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.locator('#set-account')).toHaveCount(0)
})
