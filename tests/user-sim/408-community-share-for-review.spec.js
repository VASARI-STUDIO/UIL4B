// Sharing work for review from the Community Hub, and finding it again under
// "Your submissions" on your own profile (signed in).
//
// Journeys:
//   1. Desktop: Share your work, a project, Share for review. One record is
//      queued as pending, the dialog says it was sent, and See your profile
//      lands on Your submissions with the row marked Pending review.
//   2. Phone (390, touch): a link submission and an inspiration image both end
//      up as rows under Your submissions: the link as Pending review, the image
//      as Not sent (uploads are not open, so it is kept in the tab only).
//   3. Withdraw takes a row out at once and Undo brings it back.
//   4. A signed-out visitor is asked to sign in first and sees no form.
//
// MUTATION (restore after each; written, not yet run: see the hand-over):
//   ShareDialogs.jsx ProjectStep.send: change `if (ok) onSent('design')` to `if (ok) hub.setOpen(null)`
//       -> "1. a project shared for review is queued as pending and lands in Your submissions"
//   ShareDialogs.jsx UploadStep.send: delete the `hub.addUpload(...)` call
//       -> "2. on a phone a link and an inspiration image both end up in Your submissions"
//   useCommunityHub.js ask: skip the `if (!uid)` sign-in gate
//       -> "4. a signed-out visitor is asked to sign in first"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const docsIn = (page, collection) => page.evaluate(
  (c) => window.__UIL4B_TEST_STORE__.list(c).map((d) => d.data), collection,
)
const dialog = (page, name) => page.getByRole('dialog', { name })
const header = (page) => page.locator('.cm-head')
const submissions = (page) => page.locator('#your-submissions')
const row = (page, name) => submissions(page).locator('.cm-sub', { hasText: name })

async function seeYourSubmissions(page, title) {
  await dialog(page, title).getByRole('button', { name: 'See your profile' }).click()
  await expect(page).toHaveURL(/\/u\/[^/]+#your-submissions$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Your submissions' })).toBeVisible()
}

test.describe('Community Hub: share for review', () => {
  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('1. a project shared for review is queued as pending and lands in Your submissions', async ({ page }) => {
      watch(page, 'a member sharing a project')
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/community')

      await header(page).getByRole('button', { name: 'Share your work' }).click()
      await expect(dialog(page, 'Share your work')).toBeVisible()
      await expect(dialog(page, 'Share your work').getByRole('radio', { name: /A project/ })).toBeChecked()
      await dialog(page, 'Share your work').getByRole('button', { name: 'Next' }).click()

      const step = dialog(page, 'Share a project')
      await expect(step).toBeVisible()
      // The projects load after the dialog opens and the title is filled from
      // the first one once they have: wait for that, do not read it mid-render.
      await expect(step.getByRole('textbox', { name: 'Title' }), 'the title starts as the project name').not.toHaveValue('')
      const title = await step.getByRole('textbox', { name: 'Title' }).inputValue()
      expect(title.trim(), 'the title starts as the project name').not.toBe('')
      // MUTATION: make ProjectStep.send close the dialog instead of moving to "sent" and this fails.
      await step.getByRole('button', { name: 'Share for review' }).click()
      await expect(dialog(page, 'Sent for review'), '1. a project shared for review is queued as pending and lands in Your submissions').toBeVisible()
      await expect(dialog(page, 'Sent for review')).toContainText('Pending review')

      const queued = await docsIn(page, 'community-submissions')
      expect(queued).toHaveLength(1)
      expect(queued[0].status).toBe('pending')
      expect(queued[0].name).toBe(title.trim())

      await seeYourSubmissions(page, 'Sent for review')
      const mine = row(page, title.trim())
      await expect(mine).toBeVisible()
      await expect(mine.locator('.cm-sub-status')).toHaveText('Pending review')
    })

    test('3. Withdraw takes a row out at once and Undo brings it back', async ({ page }) => {
      watch(page, 'a member taking a submission back')
      await signIn(page, {
        plan: 'free',
        docs: {
          'community-submissions/d-1': {
            kind: 'design', name: 'Harbour Dashboard', authorUid: 'test-uid-free', authorName: 'Freya Free', status: 'pending',
            payload: { author: 'Freya Free', category: 'Dashboard', url: 'https://example.com/harbour', c1: '#3B82F6', c2: '#8B5CF6' },
            createdAt: '2026-10-20T09:00:00.000Z',
          },
        },
      })
      await go(page, '/community')
      await expect(page.getByText(/You have 1 piece waiting for review/)).toBeVisible()
      await page.getByRole('link', { name: 'See your profile' }).click()
      await expect(page).toHaveURL(/#your-submissions$/)

      await expect(row(page, 'Harbour Dashboard').locator('.cm-sub-status')).toHaveText('Pending review')
      await row(page, 'Harbour Dashboard').getByRole('button', { name: 'Withdraw' }).click()
      await expect(row(page, 'Harbour Dashboard')).toHaveCount(0)
      await page.locator('.toast.show .toast-action').click()
      await expect(row(page, 'Harbour Dashboard')).toBeVisible()
    })

    test('4. a signed-out visitor is asked to sign in first and sees no form', async ({ page }) => {
      watch(page, 'a visitor choosing Share your work')
      await go(page, '/community')
      // MUTATION: skip the `if (!uid)` gate in useCommunityHub.ask and this fails.
      await header(page).getByRole('button', { name: 'Share your work' }).click()
      await expect(page.getByRole('dialog', { name: /sign|log in|account/i }), '4. a signed-out visitor is asked to sign in first').toBeVisible()
      await expect(dialog(page, 'Share your work')).toHaveCount(0)
      await expect(page.getByRole('textbox', { name: 'Title' })).toHaveCount(0)
    })
  })

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('2. on a phone a link and an inspiration image both end up in Your submissions', async ({ page }) => {
      watch(page, 'a member sharing from a phone')
      await signIn(page, { plan: 'free' })
      await go(page, '/community')

      await header(page).getByRole('button', { name: 'Share your work' }).tap()
      const pick = dialog(page, 'Share your work')
      await pick.getByRole('radio', { name: /A link/ }).check({ force: true })
      await pick.getByRole('button', { name: 'Next' }).tap()
      const link = dialog(page, 'Submit a design')
      await link.getByRole('textbox', { name: 'Name', exact: true }).fill('Harbour Dashboard')
      await link.getByRole('button', { name: 'Submit design' }).tap()
      await expect(dialog(page, 'Sent for review')).toBeVisible()
      expect(await docsIn(page, 'community-submissions')).toHaveLength(1)
      await dialog(page, 'Sent for review').getByRole('button', { name: 'Done' }).tap()

      await header(page).getByRole('button', { name: 'Upload inspiration' }).tap()
      const upload = dialog(page, 'Upload inspiration')
      await upload.locator('input[type="file"]').setInputFiles({ name: 'bus-shelter.png', mimeType: 'image/png', buffer: PNG })
      await expect(upload.getByRole('textbox', { name: 'Title' })).toHaveValue('bus-shelter')
      await upload.getByRole('checkbox', { name: /right to share/ }).check()
      // MUTATION: delete the hub.addUpload call in UploadStep.send and this fails.
      await upload.getByRole('button', { name: 'Upload for review' }).tap()
      await expect(dialog(page, 'Not sent yet')).toBeVisible()
      await expect(dialog(page, 'Not sent yet')).toContainText('Not sent')
      expect(await docsIn(page, 'community-submissions'), 'an image is never sent').toHaveLength(1)

      await seeYourSubmissions(page, 'Not sent yet')
      await expect(row(page, 'Harbour Dashboard').locator('.cm-sub-status'), '2. on a phone a link and an inspiration image both end up in Your submissions').toHaveText('Pending review')
      await expect(row(page, 'bus-shelter').locator('.cm-sub-status')).toHaveText('Not sent')
    })
  })
})
