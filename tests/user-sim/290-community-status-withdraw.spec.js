// YOUR OWN SUBMISSIONS ON THE COMMUNITY HUB, AND THE REVIEWER'S VIEW OF THEM.
//
// A submission is a thing with a status, and a person who made one should be
// able to see where it stands, take it back, and send it again if it never
// left. The reviewer should be able to see what they are approving.
//
//   1. STATUS. Pending, approved and not-approved designs and icons each carry
//      their own tag, read from the queue document. A rejected design is not in
//      the browse grid; it is listed under "Your submissions".
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

const queued = (page) => page.locator('section', { has: page.getByRole('heading', { name: 'Your submissions' }) })
const gridCard = (page, name) => page.locator('.ch-grid article.ch-card', { hasText: name })

test.describe('community · status on your own submissions', () => {
  test('a pending and an approved design each carry their own tag in the grid', async ({ page }) => {
    watch(page, 'a member with two designs in different states')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/d-pending': designDoc({ name: 'Waiting Design', createdAt: '2026-10-21T09:00:00.000Z' }),
        'community-submissions/d-approved': designDoc({ name: 'Passed Design', status: 'approved' }),
      },
    })
    await go(page, '/community')

    await expect(gridCard(page, 'Waiting Design').locator('.ch-card-own'),
      'a pending design must say it is pending review').toContainText('Pending review')
    await expect(gridCard(page, 'Passed Design').locator('.ch-card-own'),
      'an approved design must say it is approved').toContainText('Approved')
    await expect(gridCard(page, 'Passed Design').locator('.ch-card-own'),
      'an approved design must not still read as pending').not.toContainText('Pending')
  })

  test('a rejected design is out of the grid and listed under Your submissions as not approved', async ({ page }) => {
    watch(page, 'a member whose design was turned down')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/d-rejected': designDoc({ name: 'Turned Down Design', status: 'rejected' }),
        'community-submissions/d-pending': designDoc({ name: 'Waiting Design', createdAt: '2026-10-21T09:00:00.000Z' }),
      },
    })
    await go(page, '/community')

    // The control: the pending one is in the grid, so an empty grid is not why
    // the rejected one is missing from it.
    await expect(gridCard(page, 'Waiting Design')).toHaveCount(1)
    await expect(page.locator('.ch-grid'), 'a rejected design must not be among the browsable cards')
      .not.toContainText('Turned Down Design')

    const row = queued(page).locator('li', { hasText: 'Turned Down Design' })
    await expect(row, 'the rejected design is still listed for its author').toBeVisible()
    await expect(row).toContainText('Not approved')
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
    await go(page, '/community')

    const row = (name) => queued(page).locator('li', { hasText: name })
    await expect(row('Icon waiting')).toContainText('Pending review')
    await expect(row('Icon passed')).toContainText('Approved')
    await expect(row('Icon passed'), 'an approved icon must not read as pending').not.toContainText('Pending review')
    await expect(row('Icon turned down')).toContainText('Not approved')
    await expect(row('Icon turned down'), 'a rejected icon must not read as pending').not.toContainText('Pending review')
  })
})
