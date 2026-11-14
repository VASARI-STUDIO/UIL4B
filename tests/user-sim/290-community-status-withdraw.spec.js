// YOUR OWN SUBMISSIONS ON THE COMMUNITY HUB, AND THE REVIEWER'S VIEW OF THEM.
//
// A submission is a thing with a status, and a person who made one should be
// able to see where it stands, take it back, and send it again if it never
// left. The reviewer should be able to see what they are approving.
//
//   1. STATUS. Pending, approved and not-approved designs and icons each carry
//      their own tag, read from the queue document, in "Your submissions" on the
//      member's own profile (/u/me). The V3 Community page is a showcase of
//      sample pieces and no longer mixes a member's own work into its grid, so
//      none of it appears there; a rejected design is listed as not approved.
//   2. WITHDRAW AND RETRY. A design can be withdrawn like an icon, behind an
//      undo toast rather than at once, and a design that failed to reach the
//      queue is marked "Not sent" and can be sent again.
//   3. THE ADMIN ROW. A design in the review queue shows its link and its
//      category, and a decision can be reversed.
//
// The queue is seeded as 97-community-icons.spec.js seeds it: documents in
// `community-submissions` handed to the session double through `signIn`.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { TOAST_ACTION_MIN_MS } from '../../src/utils/toastDuration.js'

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'

const designDoc = (over = {}) => ({
  kind: 'design',
  name: 'Harbour Dashboard',
  authorUid: 'test-uid-free',
  authorName: 'Freya Free',
  status: 'pending',
  payload: { author: 'Freya Free', category: 'Dashboard', url: 'https://example.com/harbour', c1: '#3B82F6', c2: '#8B5CF6' },
  createdAt: '2026-10-20T09:00:00.000Z',
  ...over,
})

const iconDoc = (over = {}) => ({
  kind: 'icon',
  name: 'Plus mark',
  authorUid: 'test-uid-free',
  authorName: 'Freya Free',
  status: 'pending',
  payload: { svg: ICON, author: 'Freya Free' },
  createdAt: '2026-10-20T09:00:00.000Z',
  ...over,
})

const queued = (page) => page.locator('#your-submissions')
const subRow = (page, name) => queued(page).locator('.cm-sub', { hasText: name })
const statusOfRow = (page, name) => subRow(page, name).locator('.cm-sub-status')
/** The member's own profile, where Your submissions lives (no handle chosen: /u/me). */
async function openYourSubmissions(page) {
  await go(page, '/u/me#your-submissions')
  await expect(page.getByRole('heading', { level: 2, name: 'Your submissions' })).toBeVisible()
}

test.describe('community · status on your own submissions', () => {
  test('a pending and an approved design each carry their own tag in Your submissions', async ({ page }) => {
    watch(page, 'a member with two designs in different states')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/d-pending': designDoc({ name: 'Waiting Design', createdAt: '2026-10-21T09:00:00.000Z' }),
        'community-submissions/d-approved': designDoc({ name: 'Passed Design', status: 'approved' }),
      },
    })
    await openYourSubmissions(page)

    await expect(statusOfRow(page, 'Waiting Design'),
      'a pending design must say it is pending review').toHaveText('Pending review')
    await expect(statusOfRow(page, 'Passed Design'),
      'an approved design must say it is approved, not still pending').toHaveText('Approved')
  })

  test('a rejected design is out of the showcase and listed under Your submissions as not approved', async ({ page }) => {
    watch(page, 'a member whose design was turned down')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/d-rejected': designDoc({ name: 'Turned Down Design', status: 'rejected' }),
        'community-submissions/d-pending': designDoc({ name: 'Waiting Design', createdAt: '2026-10-21T09:00:00.000Z' }),
      },
    })
    await go(page, '/community')
    await expect(page.locator('.cm-grid').first(), 'a rejected design must not be among the showcase pieces')
      .not.toContainText('Turned Down Design')
    // The page counts only what is still waiting: the pending one, not the rejected one.
    await expect(page.getByText(/You have 1 piece waiting for review/)).toBeVisible()

    await openYourSubmissions(page)
    // The control: the pending one is listed too, so an empty list is not why
    // the rejected one reads as it does.
    await expect(subRow(page, 'Waiting Design')).toHaveCount(1)
    await expect(subRow(page, 'Turned Down Design'), 'the rejected design is still listed for its author').toBeVisible()
    await expect(statusOfRow(page, 'Turned Down Design')).toHaveText('Not approved')
  })

  test('icons read pending, approved and not approved by their queue status', async ({ page }) => {
    watch(page, 'a member with three icons in different states')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/i-pending': iconDoc({ name: 'Icon waiting', createdAt: '2026-10-22T09:00:00.000Z' }),
        'community-submissions/i-approved': iconDoc({ name: 'Icon passed', status: 'approved', createdAt: '2026-10-21T09:00:00.000Z' }),
        'community-submissions/i-rejected': iconDoc({ name: 'Icon turned down', status: 'rejected' }),
      },
    })
    await openYourSubmissions(page)

    await expect(statusOfRow(page, 'Icon waiting')).toHaveText('Pending review')
    await expect(statusOfRow(page, 'Icon passed'), 'an approved icon must not read as pending').toHaveText('Approved')
    await expect(statusOfRow(page, 'Icon turned down'), 'a rejected icon must not read as pending').toHaveText('Not approved')
  })
})

const inQueue = (page) => page.evaluate(() =>
  [...(window.__UIL4B_TEST_STORE__?.docs?.keys() || [])].filter(k => k.startsWith('community-submissions/')).length)
const undoButton = (page) => page.locator('.toast.show .toast-action')

test.describe('community · withdraw with undo', () => {
  test('a design can be withdrawn, undone, and withdrawn again for good', async ({ page }) => {
    watch(page, 'a member changing their mind about a design')
    await signIn(page, {
      plan: 'free',
      docs: { 'community-submissions/d-1': designDoc({ name: 'Second Thoughts' }) },
    })
    await openYourSubmissions(page)
    await expect(subRow(page, 'Second Thoughts')).toHaveCount(1)
    expect(await inQueue(page), 'the seeded submission must be in the account to start with').toBe(1)

    // The row's buttons are named by what they do; the row names the design.
    const withdraw = () => subRow(page, 'Second Thoughts').getByRole('button', { name: 'Withdraw', exact: true })
    await withdraw().click()
    await expect(subRow(page, 'Second Thoughts'), 'a withdrawn design leaves the list at once').toHaveCount(0)
    await expect(undoButton(page), 'the toast must offer to take it back').toBeVisible()
    expect(await inQueue(page), 'the account copy must not go before the undo window closes').toBe(1)

    await undoButton(page).click()
    await expect(subRow(page, 'Second Thoughts'), 'undo must bring the design back').toHaveCount(1)
    // Past the window the first press would have used: it must stay.
    await page.waitForTimeout(TOAST_ACTION_MIN_MS + 1500)
    expect(await inQueue(page), 'an undone withdrawal must not delete the account copy').toBe(1)
    await expect(subRow(page, 'Second Thoughts')).toHaveCount(1)

    await withdraw().click()
    await expect(subRow(page, 'Second Thoughts')).toHaveCount(0)
    await expect.poll(() => inQueue(page), {
      message: 'an unrevoked withdrawal must remove the account copy',
      timeout: TOAST_ACTION_MIN_MS + 6000,
    }).toBe(0)
  })

  test('an icon is not withdrawn until the undo window closes', async ({ page }) => {
    watch(page, 'a member withdrawing an icon')
    await signIn(page, {
      plan: 'free',
      docs: { 'community-submissions/i-1': iconDoc({ name: 'Second Thoughts icon' }) },
    })
    await openYourSubmissions(page)
    const row = subRow(page, 'Second Thoughts icon')
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: /^Withdraw$/ }).click()
    await expect(row).toHaveCount(0)
    expect(await inQueue(page), 'the account copy must outlive the click, so undo has something to restore').toBe(1)

    await undoButton(page).click()
    await expect(row, 'undo must bring the icon back').toBeVisible()
    expect(await inQueue(page)).toBe(1)
  })

  test('a rejected design can be withdrawn from Your submissions', async ({ page }) => {
    watch(page, 'a member clearing away a design that was turned down')
    await signIn(page, {
      plan: 'free',
      docs: { 'community-submissions/d-no': designDoc({ name: 'Turned Down Design', status: 'rejected' }) },
    })
    await openYourSubmissions(page)
    const row = subRow(page, 'Turned Down Design')
    await row.getByRole('button', { name: /^Withdraw$/ }).click()
    await expect(row).toHaveCount(0)
    await expect.poll(() => inQueue(page), { timeout: TOAST_ACTION_MIN_MS + 6000 }).toBe(0)
  })
})

test.describe('community · a design that did not reach the queue', () => {
  test('a failed publish is marked Not sent and offers Retry', async ({ page }) => {
    watch(page, 'a member whose design could not be sent')
    await signIn(page, {
      plan: 'free',
      deny: [{ path: 'community-submissions', ops: ['set'] }],
    })
    await go(page, '/community')
    await page.locator('.cm-head').getByRole('button', { name: 'Share your work' }).click()
    const pick = page.getByRole('dialog', { name: 'Share your work' })
    await pick.getByRole('radio', { name: /A link/ }).check({ force: true })
    await pick.getByRole('button', { name: 'Next' }).click()
    const dialog = page.getByRole('dialog', { name: /Submit a design/i })
    await dialog.getByRole('textbox', { name: /^Name$/i }).fill('Offline Design')
    await dialog.getByRole('button', { name: /^Submit design$/i }).click()
    // The refused write is not passed off as sent: no "Sent for review" dialog,
    // and the member is told it is only kept in this browser.
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Sent for review' })).toHaveCount(0)
    await expect(page.locator('.toast.show'), 'a refused write must say it was only saved in this browser')
      .toContainText('Saved in this browser')

    await openYourSubmissions(page)
    const row = subRow(page, 'Offline Design')
    await expect(row, 'the design stays in this browser, in the list').toHaveCount(1)
    await expect(statusOfRow(page, 'Offline Design'), 'a design the account does not hold must not read as pending')
      .toHaveText('Not sent')
    await expect(row.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  })

  test('Retry sends a design that was only ever in this browser', async ({ page }) => {
    watch(page, 'a member retrying a design')
    await signIn(page, { plan: 'free' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-community-submissions', JSON.stringify([{
        id: 'u1730000000000', name: 'Offline Design', author: 'Freya Free', category: 'Landing',
        url: '#', c1: '#3B82F6', c2: '#8B5CF6', saves: 0, mine: true, createdAt: '2026-10-30T09:00:00.000Z',
      }]))
    })
    await openYourSubmissions(page)
    const row = subRow(page, 'Offline Design')
    await expect(statusOfRow(page, 'Offline Design')).toHaveText('Not sent')
    expect(await inQueue(page), 'nothing has been sent yet').toBe(0)

    await row.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(statusOfRow(page, 'Offline Design'), 'a sent design reads as pending review').toHaveText('Pending review')
    await expect(row.getByRole('button', { name: 'Retry', exact: true }), 'a sent design has no Retry').toHaveCount(0)
    expect(await inQueue(page), 'Retry must put the design in the account').toBe(1)
  })
})

// ── the reviewer's side ──────────────────────────────────────────────────────
// /api/verify-admin is stubbed as 204-admin-report-queue.spec.js stubs it
// (vite preview runs no functions); the claim on the signed token is what the
// rules read, and the session double stands in for Firestore.
async function openCommunityQueue(page, docs) {
  await signIn(page, { admin: true, claims: { admin: true, email_verified: true }, docs })
  await page.route((url) => url.pathname === '/api/verify-admin', (route) => route.fulfill({
    json: { isAdmin: true, uid: 'test-uid-admin', email: 'founder@uil4b.test', moderator: false, role: 'founder', claimUpdated: false, rosterError: null },
  }))
  await go(page, '/admin')
  await page.locator('#admtab-community').click()
}
const adminRow = (page, name) => page.locator('.cq-item', { hasText: name })
const statusOf = (page, id) => page.evaluate((k) => window.__UIL4B_TEST_STORE__?.docs?.get(k)?.status ?? null, `community-submissions/${id}`)

test.describe('admin · community queue shows what is being approved', () => {
  test('a design row shows its link, its category and the address the author typed', async ({ page }) => {
    watch(page, 'a founder reviewing a design')
    await openCommunityQueue(page, {
      'community-submissions/d-1': designDoc({ name: 'Harbour Dashboard', authorUid: 'test-uid-someone' }),
      'community-submissions/d-2': designDoc({
        name: 'Sneaky Design', authorUid: 'test-uid-someone', createdAt: '2026-10-19T09:00:00.000Z',
        payload: { author: 'X', category: 'Landing', url: 'javascript:alert(1)', c1: '#3B82F6', c2: '#8B5CF6' },
      }),
    })
    const row = adminRow(page, 'Harbour Dashboard')
    await expect(row).toBeVisible()
    await expect(row, 'the category the author chose').toContainText('Dashboard')
    const link = row.getByRole('link', { name: 'https://example.com/harbour' })
    await expect(link, 'the address must be shown as typed').toBeVisible()
    await expect(link).toHaveAttribute('href', 'https://example.com/harbour')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')

    // The control: an address that is not http(s) is named, never made a link.
    const sneaky = adminRow(page, 'Sneaky Design')
    await expect(sneaky).toContainText(/not an http or https address/i)
    await expect(sneaky.getByRole('link')).toHaveCount(0)
  })

  test('Delete asks once more before it deletes', async ({ page }) => {
    watch(page, 'a founder deleting a rejected design')
    await openCommunityQueue(page, {
      'community-submissions/d-1': designDoc({ name: 'Harbour Dashboard', status: 'rejected', authorUid: 'test-uid-someone' }),
    })
    await page.getByRole('tab', { name: /Rejected/ }).click()
    const row = adminRow(page, 'Harbour Dashboard')
    await row.getByRole('button', { name: /^Delete$/ }).click()
    expect(await inQueue(page), 'one press must not delete').toBe(1)
    await row.getByRole('button', { name: /^No, keep/ }).click()
    await expect(row.getByRole('button', { name: /^Delete$/ })).toBeVisible()
    expect(await inQueue(page), 'declining must not delete').toBe(1)

    await row.getByRole('button', { name: /^Delete$/ }).click()
    await row.getByRole('button', { name: /^Yes, delete/ }).click()
    await expect(row).toHaveCount(0)
    expect(await inQueue(page), 'confirming must delete').toBe(0)
  })

  test('a rejected submission can be moved back to pending', async ({ page }) => {
    watch(page, 'a founder reversing a decision')
    await openCommunityQueue(page, {
      'community-submissions/d-1': designDoc({ name: 'Harbour Dashboard', status: 'rejected', authorUid: 'test-uid-someone' }),
    })
    await page.getByRole('tab', { name: /Rejected/ }).click()
    await adminRow(page, 'Harbour Dashboard').getByRole('button', { name: /^Back to pending$/ }).click()
    await expect(adminRow(page, 'Harbour Dashboard'), 'it leaves the rejected list').toHaveCount(0)
    expect(await statusOf(page, 'd-1'), 'the stored status must be pending again').toBe('pending')

    await page.getByRole('tab', { name: /Awaiting review/ }).click()
    await expect(adminRow(page, 'Harbour Dashboard'), 'and it is waiting for review').toBeVisible()
  })
})
