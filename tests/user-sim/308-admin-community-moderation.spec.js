// A FOUNDER MODERATES COMMUNITY SUBMISSIONS: APPROVE, REJECT AND REMOVE.
//
// 290-community-status-withdraw.spec.js already proves the reviewer's row (its
// link and category), that a decision can be reversed, that Delete asks twice,
// and what each status looks like to the author when the document is seeded.
// This file closes the loop between the two: the decision is made through the
// admin UI, written to the queue, and then read back by the author.
//
// For a design and for an icon, each test walks the same three steps:
//   1. the admin presses the control and the row leaves the list it was in;
//   2. the stored queue document says what the admin chose (or is gone);
//   3. the author, signed in on the same session, sees the result under "Your
//      submissions" on their own profile (/u/me).
//
// The seams are the ones 204 and 290 use: /api/verify-admin is stubbed (vite
// preview runs no functions), the queue is documents in `community-submissions`
// handed to the session double through signIn(), and the double stands in for
// Firestore. The author is reached by switching the signed-in account under the
// mounted page and moving to the profile without a reload, because a reload
// would empty the in-memory store the decision was written to.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
const AUTHOR = { uid: 'test-uid-free', email: 'free.user@uil4b.test', displayName: 'Freya Free', claims: {} }

const designDoc = (over = {}) => ({
  kind: 'design',
  name: 'Harbour Dashboard',
  authorUid: AUTHOR.uid,
  authorName: 'Freya Free',
  status: 'pending',
  payload: { author: 'Freya Free', category: 'Dashboard', url: 'https://example.com/harbour', c1: '#3B82F6', c2: '#8B5CF6' },
  createdAt: '2026-10-20T09:00:00.000Z',
  ...over,
})
const iconDoc = (over = {}) => ({
  kind: 'icon',
  name: 'Plus mark',
  authorUid: AUTHOR.uid,
  authorName: 'Freya Free',
  status: 'pending',
  payload: { svg: ICON, author: 'Freya Free' },
  createdAt: '2026-10-20T09:00:00.000Z',
  ...over,
})

// What differs between the two kinds: how to make one. Where the author finds
// it does not: the V3 Community page is a showcase of sample pieces, so a
// design and an icon are both only ever a row under "Your submissions" on the
// author's own profile.
const KINDS = {
  design: { make: designDoc, subject: 'Harbour Dashboard', other: 'Pier Landing' },
  icon: { make: iconDoc, subject: 'Plus mark', other: 'Minus mark' },
}

const queueRow = (page, name) => page.locator('#your-submissions .cm-sub', { hasText: name })
// The tag the author reads for one of their own submissions.
const authorTag = (page, name) => queueRow(page, name).locator('.cm-sub-status')

const adminRow = (page, name) => page.locator('.cq-item', { hasText: name })
const docOf = (page, id) => page.evaluate((k) => {
  const d = window.__UIL4B_TEST_STORE__?.docs?.get(k)
  return d ? JSON.parse(JSON.stringify(d)) : null
}, `community-submissions/${id}`)

let admin
// Opens the admin dashboard on the community queue, as 290 does.
async function openAdminQueue(page, docs) {
  admin = await signIn(page, { admin: true, claims: { admin: true, email_verified: true }, docs })
  await page.route((url) => url.pathname === '/api/verify-admin', (route) => route.fulfill({
    json: { isAdmin: true, uid: 'test-uid-admin', email: admin.email, moderator: false, role: 'founder', claimUpdated: false, rosterError: null },
  }))
  await go(page, '/admin')
  await page.locator('#admtab-community').click()
}
// Change who is signed in and move to another page without a reload.
async function actAs(page, who, path) {
  await page.evaluate(({ who, path }) => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.__UIL4B_TEST_AUTH__.switchTo(who)
  }, { who, path })
}
const asAuthor = (page) => actAs(page, AUTHOR, '/u/me#your-submissions')
async function asAdmin(page) {
  await actAs(page, { uid: 'test-uid-admin', email: admin.email, displayName: 'Founder', claims: { admin: true, email_verified: true } }, '/admin')
  await page.locator('#admtab-community').click()
}

for (const [kind, k] of Object.entries(KINDS)) {
  test.describe(`admin · community ${kind}`, () => {
    // MUTATION: in src/components/admin/CommunityQueue.jsx make `decide` write
    // `next === 'approved' ? 'rejected' : next` instead of `next` (approve stores
    // 'rejected'). Red at "listed under Approved", the first place it shows.
    test(`approving a pending ${kind} stores approved and the author sees it approved`, async ({ page }) => {
      watch(page, `a founder approving a ${kind}`)
      await openAdminQueue(page, { 'community-submissions/s-1': k.make({ name: k.subject }) })

      await adminRow(page, k.subject).getByRole('button', { name: /^Approve$/ }).click()
      await expect(adminRow(page, k.subject), 'it leaves the awaiting-review list').toHaveCount(0)
      await page.getByRole('tab', { name: /^Approved/ }).click()
      await expect(adminRow(page, k.subject), 'and is listed under Approved').toBeVisible()
      expect((await docOf(page, 's-1')).status, 'the stored document must say approved').toBe('approved')

      await asAuthor(page)
      await expect(authorTag(page, k.subject), 'the author reads it as approved').toHaveText('Approved')
    })

    // MUTATION: in src/components/admin/CommunityQueue.jsx make `decide` write
    // `next === 'rejected' ? 'approved' : next` (reject stores 'approved').
    // Red at "listed under Rejected", the first place it shows.
    test(`rejecting a pending ${kind} stores rejected and the author sees it not approved`, async ({ page }) => {
      watch(page, `a founder rejecting a ${kind}`)
      await openAdminQueue(page, {
        'community-submissions/s-1': k.make({ name: k.subject }),
        // The control: a different pending submission by the same author, left alone.
        'community-submissions/s-2': k.make({ name: k.other, createdAt: '2026-10-19T09:00:00.000Z' }),
      })

      await adminRow(page, k.subject).getByRole('button', { name: /^Reject$/ }).click()
      await expect(adminRow(page, k.subject), 'it leaves the awaiting-review list').toHaveCount(0)
      await expect(adminRow(page, k.other), 'the one left alone is still waiting').toBeVisible()
      await page.getByRole('tab', { name: /^Rejected/ }).click()
      await expect(adminRow(page, k.subject), 'and is listed under Rejected').toBeVisible()
      expect((await docOf(page, 's-1')).status, 'the stored document must say rejected').toBe('rejected')
      expect((await docOf(page, 's-2')).status, 'the other document is untouched').toBe('pending')

      await asAuthor(page)
      await expect(authorTag(page, k.subject), 'the author reads it as not approved').toHaveText('Not approved')
      // The control: the one the admin left alone still reads as waiting.
      await expect(authorTag(page, k.other), 'the one left alone is still pending for the author').toHaveText('Pending review')
    })

    // MUTATION: in src/components/admin/CommunityQueue.jsx make `remove` skip the
    // write: replace `await deleteSubmission(item.id)` with `await Promise.resolve()`.
    // The row still leaves the admin list, but "the document must be gone"
    // goes red.
    test(`removing an approved ${kind} deletes the document and takes it off the author's page`, async ({ page }) => {
      watch(page, `a founder removing an approved ${kind}`)
      await openAdminQueue(page, {
        'community-submissions/s-1': k.make({ name: k.subject, status: 'approved' }),
        // The control: another approved one by the same author, which must stay.
        'community-submissions/s-2': k.make({ name: k.other, status: 'approved', createdAt: '2026-10-19T09:00:00.000Z' }),
      })

      // The author has it to begin with, so its absence later means something.
      await asAuthor(page)
      await expect(queueRow(page, k.subject)).toBeVisible()
      await asAdmin(page)

      await page.getByRole('tab', { name: /^Approved/ }).click()
      const row = adminRow(page, k.subject)
      await row.getByRole('button', { name: /^Delete$/ }).click()
      expect(await docOf(page, 's-1'), 'one press must not delete').not.toBeNull()
      await row.getByRole('button', { name: /^Yes, delete/ }).click()
      await expect(row, 'it leaves the admin list').toHaveCount(0)
      expect(await docOf(page, 's-1'), 'the document must be gone').toBeNull()
      expect(await docOf(page, 's-2'), 'the other document must stay').not.toBeNull()

      await asAuthor(page)
      await expect(queueRow(page, k.other), 'the account has answered').toBeVisible()
      await expect(queueRow(page, k.subject), 'the removed one is off the author page').toHaveCount(0)
    })
  })
}
