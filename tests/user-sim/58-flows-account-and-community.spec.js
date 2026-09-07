// FLOW 6 AND 9 — THE TWO PLACES THE PRODUCT ASKS SOMETHING IRREVERSIBLE OF
// SOMEONE, AND WHAT IT TELLS THEM FIRST.
//
// Submitting work to the community publishes it under your name. Deleting your
// account destroys everything you have made and, if you pay, cancels the
// subscription. Both were unreachable from a signed-out session, so neither
// sentence the product says at those moments had ever been rendered by a test.
//
// ── WHY THE COPY IS THE ASSERTION, NOT THE BUTTON ──────────────────────────
//
// For a destructive or public action, a working button is not the feature — the
// disclosure is. A delete dialog that deletes correctly while failing to
// mention that it also cancels billing is a support ticket and a refund, and
// every automated check of "does delete work?" passes on it. So these tests
// read the sentences, and pair each one with the state where it must NOT
// appear, which is the only way to tell a rendered rule from a hard-coded
// string.
//
// #405 fixed the deletion cascade itself. This is the other half: that the
// person is told what the cascade does before they authorise it.
//
// ── MUTATION ───────────────────────────────────────────────────────────────
//
//   src/pages/Settings.jsx  {isPro && <li>Your subscription is cancelled…</li>}
//        → {false && …}  fails "a paying account is warned about its billing"
//        and leaves the free-account control green.
//   src/pages/Community.jsx  requireLogin('submit a design to the community', …)
//        → requireLogin('', …)  fails "a signed-out visitor is told what they
//        were doing", because LoginPopup derives its "Where you left off"
//        heading from that reason string.
//
// A FIRST ATTEMPT AT THAT SECOND MUTATION KILLED NOTHING, and the record is
// worth more than the tidy version. Deleting `setSubmitIntent(SUBMIT_SURFACE)`
// left all five tests green — because the intent SENTENCE comes from the
// reason argument above, while `setSubmitIntent` exists to resume the form
// after a sign-up detours through onboarding. They are two different promises
// that read like one. This spec covers the first; the second is a full
// sign-up round trip and is NOT covered here, which is why the gap is written
// down rather than implied by a passing file.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { COMMUNITY_SUBMIT_REASONS } from '../../src/utils/submitIntent.js'

test.describe('flow 6 — submitting a design to the community', () => {
  test('a signed-out visitor is told what they were doing and why an account is needed', async ({ page }) => {
    watch(page, 'a stranger who pressed Submit design')
    await go(page, '/community')
    await page.getByRole('button', { name: /Submit design/i }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog, 'pressing Submit must open something').toBeVisible()

    // The intent, carried across the sign-in. This is the sentence that makes
    // the gate feel like a step rather than an interruption.
    await expect(dialog, 'the gate must name what the visitor was in the middle of')
      .toContainText(/about to submit a design/i)

    // And the reasons, read from the array the product renders them from — so
    // editing the copy in one place cannot leave this test asserting the old
    // words.
    expect(COMMUNITY_SUBMIT_REASONS.length, 'vacuous if there are no reasons')
      .toBeGreaterThan(0)
    for (const reason of COMMUNITY_SUBMIT_REASONS) {
      await expect(dialog, 'every stated reason must actually be on screen')
        .toContainText(reason)
    }
  })

  test('a signed-in member gets the form itself, not the gate — the control', async ({ page }) => {
    // Without this, the test above passes for a build that shows the sign-in
    // wall to everybody, including people who are already signed in.
    watch(page, 'a member submitting a design')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    await page.getByRole('button', { name: /Submit design/i }).first().click()

    const dialog = page.getByRole('dialog', { name: /Submit a design/i })
    await expect(dialog, 'a member goes straight to the form').toBeVisible()
    await expect(dialog, 'and must not be asked to sign in again')
      .not.toContainText(/about to submit a design/i)

    // The form must also be honest about what happens next: nothing appears
    // publicly on submission.
    await expect(dialog, 'the form must say the submission is reviewed first')
      .toContainText(/reviewed|queued for review/i)
  })
})

test.describe('flow 9 — deleting your account', () => {
  /** Settings › Account › Delete account, opened. */
  async function openDangerZone(page) {
    await go(page, '/settings')
    await page.getByRole('tab', { name: 'Account', exact: true }).click()
    await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  }

  test('is reachable, and itemises what it destroys', async ({ page }) => {
    watch(page, 'a designer closing their account')
    await signIn(page, { plan: 'free', projects: 2 })
    await openDangerZone(page)

    const list = page.locator('.danger-confirm-list')
    await expect(list, 'the confirmation must itemise the damage').toBeVisible()
    await expect(list, 'the work the account holds').toContainText(/saved projects/i)
    await expect(list, 'and what it published').toContainText(/community/i)
    await expect(list, 'and that there is no way back').toContainText(/cannot be undone/i)

    // Destructive actions are confirmed, never one-click.
    await expect(page.getByRole('button', { name: /Permanently delete/i }),
      'the destructive action must be a second, separate press').toBeVisible()
  })

  test('a paying account is warned that deleting it cancels the billing', async ({ page }) => {
    watch(page, 'a Pro subscriber closing their account')
    await signIn(page, { plan: 'pro' })
    await openDangerZone(page)

    await expect(page.locator('.danger-confirm-list'),
      'a subscriber must be told the money stops, before they confirm')
      .toContainText(/subscription is cancelled/i)
  })

  test('and a free account is not told about a subscription it does not have', async ({ page }) => {
    // The control. Without it, the test above passes for a hard-coded line
    // shown to everyone — which would be its own small lie.
    watch(page, 'a free account closing their account')
    await signIn(page, { plan: 'free' })
    await openDangerZone(page)

    const list = page.locator('.danger-confirm-list')
    await expect(list, 'the panel must still be on screen').toBeVisible()
    await expect(list, 'a free account has no billing to warn about')
      .not.toContainText(/subscription is cancelled/i)
  })
})
