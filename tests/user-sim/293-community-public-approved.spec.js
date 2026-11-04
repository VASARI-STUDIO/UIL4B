// APPROVED DESIGNS ARE PUBLIC ON THE COMMUNITY HUB.
//
// A design a reviewer approved shows in the grid to every visitor, signed out
// included, ahead of the starter cards. A design that is pending, rejected or
// withdrawn shows to nobody but its author, and the author's own entries keep
// their status tag.
//
// Seeded as 290-community-status-withdraw.spec.js seeds it: documents in
// `community-submissions` handed to the session double through `signIn`.
// `lateSignIn` leaves the page signed out, so the same store answers a visitor.
//
// The double does not enforce firestore.rules: what it can prove is that the
// page ASKS for approved designs only, and draws what comes back safely. The
// rules half is tests/rules/community-public-approved.test.js.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const designDoc = (over = {}) => ({
  kind: 'design',
  name: 'Harbour Dashboard',
  authorUid: 'someone-else',
  authorName: 'Sam Stranger',
  status: 'approved',
  payload: { author: 'Sam Stranger', category: 'Dashboard', url: 'https://example.com/harbour', c1: '#3B82F6', c2: '#8B5CF6' },
  createdAt: '2026-10-20T09:00:00.000Z',
  reviewedAt: '2026-10-21T09:00:00.000Z',
  reviewedBy: 'a-reviewer',
  ...over,
})

const strangers = () => ({
  'community-submissions/s-approved': designDoc({ name: 'Approved Stranger Design' }),
  'community-submissions/s-pending': designDoc({ name: 'Pending Stranger Design', status: 'pending', reviewedAt: null }),
  'community-submissions/s-rejected': designDoc({ name: 'Rejected Stranger Design', status: 'rejected' }),
  'community-submissions/s-withdrawn': designDoc({ name: 'Withdrawn Stranger Design', status: 'withdrawn' }),
  // Approved, but not a design: the page has no place for it.
  'community-submissions/s-palette': designDoc({ name: 'Approved Stranger Palette', kind: 'palette', payload: { colors: ['#111827', '#38BDF8'] } }),
})

const gridCard = (page, name) => page.locator('.ch-grid article.ch-card', { hasText: name })

test.describe('community · approved designs are public', () => {
  test('a signed-out visitor sees a stranger\'s approved design, and only that one', async ({ page }) => {
    watch(page, 'a signed-out visitor on the hub')
    await signIn(page, { lateSignIn: true, returning: false, docs: strangers() })
    await go(page, '/community')

    const card = gridCard(page, 'Approved Stranger Design')
    await expect(card, 'an approved design must be in the grid for a visitor with no account').toHaveCount(1)
    await expect(card).toContainText('Sam Stranger')
    await expect(card).toContainText('Dashboard')
    // The control: the starter cards are there too, so an empty grid is not why
    // the others are missing.
    await expect(page.locator('.ch-grid article.ch-card').filter({ hasNotText: 'Stranger' }).first()).toBeVisible()
    for (const name of ['Pending Stranger Design', 'Rejected Stranger Design', 'Withdrawn Stranger Design', 'Approved Stranger Palette']) {
      await expect(gridCard(page, name), `${name} must not be shown to a visitor`).toHaveCount(0)
    }
    // Another member's design is not the visitor's own: no status, no withdraw.
    await expect(card.locator('.ch-card-own')).toHaveCount(0)
  })

  test('a Free member sees the same stranger designs, and the approved one comes before the starter cards', async ({ page }) => {
    watch(page, 'a Free member on the hub')
    await signIn(page, { plan: 'free', docs: strangers() })
    await go(page, '/community')

    await expect(gridCard(page, 'Approved Stranger Design')).toHaveCount(1)
    for (const name of ['Pending Stranger Design', 'Rejected Stranger Design', 'Withdrawn Stranger Design']) {
      await expect(gridCard(page, name), `${name} belongs to someone else and is not approved`).toHaveCount(0)
    }
    const names = await page.locator('.ch-grid article.ch-card .ch-card-name').allTextContents()
    expect(names[0], 'the header says submissions appear above the starter cards').toBe('Approved Stranger Design')
    expect(names.length, 'the starter cards still follow').toBeGreaterThan(1)
  })

  test('the credit comes from the stored author, and the link is drawn only when it is http(s)', async ({ page }) => {
    watch(page, 'a visitor reading two members\' credits and links')
    await signIn(page, {
      lateSignIn: true,
      returning: false,
      docs: {
        'community-submissions/good': designDoc({ name: 'Good Link Design' }),
        'community-submissions/noauthor': designDoc({
          name: 'Unsigned Design',
          authorName: 'Account Name',
          payload: { category: 'Landing', url: 'https://example.com/u', c1: '#3B82F6', c2: '#8B5CF6' },
        }),
        'community-submissions/bad': designDoc({
          name: 'Script Link Design',
          payload: { author: 'Sam Stranger', category: 'Landing', url: 'javascript:alert(1)', c1: 'nope', c2: '#8B5CF6' },
        }),
      },
    })
    await go(page, '/community')

    const good = gridCard(page, 'Good Link Design')
    const link = good.locator('a.ch-thumb')
    await expect(link).toHaveAttribute('href', 'https://example.com/harbour')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link, 'an outbound link must not pass authority or opener').toHaveAttribute('rel', 'noopener noreferrer nofollow')

    await expect(gridCard(page, 'Unsigned Design'), 'with no typed author the account name is the credit')
      .toContainText('Account Name')

    const bad = gridCard(page, 'Script Link Design')
    await expect(bad, 'the card with a script link still shows').toHaveCount(1)
    await expect(bad.locator('a'), 'a non-http(s) link must not be drawn as a link').toHaveCount(0)
    expect(await page.locator('.ch-grid a[href^="javascript:" i]').count()).toBe(0)
  })

  test('a member\'s own designs keep their status, and an approved one is not shown twice', async ({ page }) => {
    watch(page, 'a member with an approved, a pending and a rejected design')
    const own = (over) => designDoc({ authorUid: 'test-uid-free', authorName: 'Freya Free', ...over })
    await signIn(page, {
      plan: 'free',
      docs: {
        ...strangers(),
        'community-submissions/o-approved': own({ name: 'My Approved Design' }),
        'community-submissions/o-pending': own({ name: 'My Pending Design', status: 'pending', reviewedAt: null }),
        'community-submissions/o-rejected': own({ name: 'My Rejected Design', status: 'rejected' }),
      },
    })
    await go(page, '/community')

    const approved = gridCard(page, 'My Approved Design')
    await expect(approved, 'an approved design of the viewer\'s own must appear once, not as an entry and again as a public one')
      .toHaveCount(1)
    await expect(approved.locator('.ch-card-own')).toContainText('Approved')
    await expect(gridCard(page, 'My Pending Design').locator('.ch-card-own')).toContainText('Pending review')
    await expect(page.locator('.ch-grid'), 'a rejected design is not browsable').not.toContainText('My Rejected Design')
    // The stranger's approved design is still there beside them.
    await expect(gridCard(page, 'Approved Stranger Design')).toHaveCount(1)
  })

  test('only a page of members\' designs loads at first, and Show more brings the rest', async ({ page }) => {
    watch(page, 'a visitor on a hub with more approved designs than one page')
    const docs = {}
    for (let i = 1; i <= 26; i++) {
      const n = String(i).padStart(2, '0')
      docs[`community-submissions/m-${n}`] = designDoc({
        name: `Member design ${n}`,
        reviewedAt: `2026-10-${String(30 - i).padStart(2, '0')}T09:00:00.000Z`,
      })
    }
    await signIn(page, { lateSignIn: true, returning: false, docs })
    await go(page, '/community')

    await expect(gridCard(page, 'Member design'), 'one page of 24 loads first').toHaveCount(24)
    await expect(gridCard(page, 'Member design 01'), 'the newest approval comes first').toHaveCount(1)
    await expect(gridCard(page, 'Member design 26'), 'the oldest waits for Show more').toHaveCount(0)

    await page.getByRole('button', { name: 'Show more designs' }).click()
    await expect(gridCard(page, 'Member design')).toHaveCount(26)
    await expect(gridCard(page, 'Member design 26')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Show more designs' }), 'no button once everything is loaded').toHaveCount(0)
  })

  test('a refused read leaves the starter cards, and nothing breaks', async ({ page }) => {
    watch(page, 'a visitor whose public read is refused')
    await signIn(page, {
      lateSignIn: true,
      returning: false,
      docs: strangers(),
      deny: [{ path: 'community-submissions', ops: ['list'] }],
    })
    await go(page, '/community')
    await expect(page.locator('.ch-grid article.ch-card').first()).toBeVisible()
    await expect(gridCard(page, 'Approved Stranger Design')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Show more designs' })).toHaveCount(0)
  })
})
