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
    await go(page, '/community')
    await expect(gridCard(page, 'Second Thoughts')).toHaveCount(1)
    expect(await inQueue(page), 'the seeded submission must be in the account to start with').toBe(1)

    const withdraw = () => page.getByRole('button', { name: 'Withdraw Second Thoughts' })
    await withdraw().click()
    await expect(gridCard(page, 'Second Thoughts'), 'a withdrawn design leaves the grid at once').toHaveCount(0)
    await expect(undoButton(page), 'the toast must offer to take it back').toBeVisible()
    expect(await inQueue(page), 'the account copy must not go before the undo window closes').toBe(1)

    await undoButton(page).click()
    await expect(gridCard(page, 'Second Thoughts'), 'undo must bring the design back').toHaveCount(1)
    // Past the window the first press would have used: it must stay.
    await page.waitForTimeout(TOAST_ACTION_MIN_MS + 1500)
    expect(await inQueue(page), 'an undone withdrawal must not delete the account copy').toBe(1)
    await expect(gridCard(page, 'Second Thoughts')).toHaveCount(1)

    await withdraw().click()
    await expect(gridCard(page, 'Second Thoughts')).toHaveCount(0)
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
    await go(page, '/community')
    const row = queued(page).locator('li', { hasText: 'Second Thoughts icon' })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: /^Withdraw$/ }).click()
    await expect(page.locator('li', { hasText: 'Second Thoughts icon' })).toHaveCount(0)
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
    await go(page, '/community')
    const row = queued(page).locator('li', { hasText: 'Turned Down Design' })
    await row.getByRole('button', { name: /^Withdraw$/ }).click()
    await expect(page.locator('li', { hasText: 'Turned Down Design' })).toHaveCount(0)
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
    await page.getByRole('button', { name: /Submit design/i }).first().click()
    const dialog = page.getByRole('dialog', { name: /Submit a design/i })
    await dialog.getByRole('textbox', { name: /^Name$/i }).fill('Offline Design')
    await dialog.getByRole('button', { name: /^Submit design$/i }).click()
    await expect(dialog).toHaveCount(0)

    const card = gridCard(page, 'Offline Design')
    await expect(card, 'the design stays in this browser, in the grid').toHaveCount(1)
    await expect(card.locator('.ch-card-own'), 'a design the account does not hold must not read as pending')
      .toContainText('Not sent')
    await expect(card.locator('.ch-card-own')).not.toContainText('Pending review')
    await expect(page.getByRole('button', { name: 'Retry sending Offline Design' })).toBeVisible()
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
    await go(page, '/community')
    const card = gridCard(page, 'Offline Design')
    await expect(card.locator('.ch-card-own')).toContainText('Not sent')
    expect(await inQueue(page), 'nothing has been sent yet').toBe(0)

    await page.getByRole('button', { name: 'Retry sending Offline Design' }).click()
    await expect(card.locator('.ch-card-own'), 'a sent design reads as pending review').toContainText('Pending review')
    await expect(page.getByRole('button', { name: 'Retry sending Offline Design' }), 'a sent design has no Retry').toHaveCount(0)
    expect(await inQueue(page), 'Retry must put the design in the account').toBe(1)
  })
})
