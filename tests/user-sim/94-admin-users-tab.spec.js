// THE USERS TAB, RENDERED: what the founder can see about a person, what he
// can do to them, and what the table does on a phone.
//
// 2026-09-16, verbatim: "make sure my admin dashboard has a much better ux in
// terms of managing user resources". Each test here is the rendered evidence
// for one of the four things that means — find a person, see what they are
// paying, change what they can reach, act on a problem account — and every
// one was watched go red with the corresponding piece reverted (the mutation
// is named on the test).
//
// ── WHY /api/verify-admin IS STUBBED ───────────────────────────────────────
// `vite preview` serves dist/ as static files and runs no Vercel functions, so
// every request under /api answers 404 here and the panel would fall back to
// this browser's profile cache — a list of one. The stub answers the three
// questions the panel asks the route (the role handshake, `includeUsers`, and
// `moderatorAction: 'list'`) with a fixture of five accounts chosen so that
// every plan state the table distinguishes is on screen at once. What the stub
// cannot prove — that the real route refuses a non-founder — is proved by
// tests/unit/moderation-role.test.js.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn, REPORT_DIR } from './helpers.js'

const FOUNDER_UID = 'test-uid-admin'

// Five accounts, one per situation the table has to tell apart. The past-due
// row is the one the tab used to hide: until 2026-09-16 every status that was
// not active/trialing rendered as the word "Free".
const USERS = [
  { uid: 'u-past-due', email: 'card.expired@example.test', displayName: 'Cara Expired', provider: 'email', emailVerified: true,
    createdAt: '2026-03-02T09:00:00.000Z', lastLoginAt: '2026-09-15T09:00:00.000Z',
    subscription: { status: 'past_due', interval: 'monthly' }, onboarding: { firstWin: null, role: null, use: null }, location: 'Brisbane, AU', company: '' },
  { uid: 'u-pro', email: 'paying.pro@example.test', displayName: 'Pia Pro', provider: 'google', emailVerified: true,
    createdAt: '2026-05-10T09:00:00.000Z', lastLoginAt: '2026-09-16T09:00:00.000Z',
    subscription: { status: 'active', interval: 'yearly' }, onboarding: { role: 'Designer', use: 'Client work' }, location: 'Berlin, DE', company: 'Studio Pia' },
  { uid: 'u-mod', email: 'mona.moderator@example.test', displayName: 'Mona Mod', provider: 'email', emailVerified: true,
    createdAt: '2026-01-20T09:00:00.000Z', lastLoginAt: '2026-09-14T09:00:00.000Z',
    subscription: { status: null, interval: null }, onboarding: {}, location: '', company: '' },
  { uid: 'u-free', email: 'freya.free@example.test', displayName: 'Freya Free', provider: 'email', emailVerified: false,
    createdAt: '2026-08-30T09:00:00.000Z', lastLoginAt: null,
    subscription: { status: null, interval: null }, onboarding: {}, location: '', company: '' },
  { uid: 'u-cancelled', email: 'gone.customer@example.test', displayName: 'Gus Gone', provider: 'email', emailVerified: true,
    createdAt: '2025-11-01T09:00:00.000Z', lastLoginAt: '2026-06-01T09:00:00.000Z',
    subscription: { status: 'canceled', interval: 'monthly' }, onboarding: {}, location: 'Austin, US', company: '' },
]

/** Answer /api/verify-admin the way the patched route does, and record every write. */
async function stubVerifyAdmin(page, { moderators = ['u-mod'] } = {}) {
  const writes = []
  const roster = new Set(moderators)
  await page.route((url) => url.pathname === '/api/verify-admin', async (route) => {
    const body = route.request().postDataJSON?.() || {}
    const base = { isAdmin: true, uid: FOUNDER_UID, email: 'founder@uil4b.test', moderator: false, role: 'founder', claimUpdated: false, rosterError: null }
    if (body.moderatorAction === 'list') {
      return route.fulfill({ json: { ...base, moderators: [...roster].map((uid) => ({ uid })) } })
    }
    if (body.moderatorAction === 'grant' || body.moderatorAction === 'revoke') {
      writes.push({ action: body.moderatorAction, targetUid: body.targetUid })
      if (body.moderatorAction === 'grant') roster.add(body.targetUid); else roster.delete(body.targetUid)
      return route.fulfill({ json: { ...base, [body.moderatorAction === 'grant' ? 'granted' : 'revoked']: body.targetUid } })
    }
    if (body.includeUsers === true) return route.fulfill({ json: { ...base, users: USERS } })
    return route.fulfill({ json: base })
  })
  return writes
}

async function openUsersTab(page) {
  await signIn(page, { admin: true, claims: { admin: true, email_verified: true } })
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Users', exact: true }).click()
  // CONTROL: the stubbed list arrived, or every row assertion below is
  // measuring the profile-cache fallback.
  await expect(page.getByText('All accounts · server data')).toBeVisible()
  const table = page.locator('.adm-users-table')
  await expect(table.locator('tbody tr').filter({ hasText: /example\.test|@/ }).first()).toBeVisible()
  return table
}

const row = (table, uid) => table.locator(`tbody tr:has(button[aria-expanded]):has-text("${USERS.find((u) => u.uid === uid).displayName}")`).first()

test.describe('seeing who somebody is and what they are paying', () => {
  test('a past-due subscriber is not called Free, and the tiles count them', async ({ page }) => {
    // MUTATION: restore `plan: status === 'active' || status === 'trialing' ? 'pro' : 'free'`
    // in Admin.jsx — the past-due row reads "Free" and the attention tile reads 0.
    watch(page, 'the founder looking for the customer whose card failed')
    await stubVerifyAdmin(page)
    const table = await openUsersTab(page)

    await expect(row(table, 'u-past-due').locator('.adm-plan')).toHaveText('Past due')
    await expect(row(table, 'u-pro').locator('.adm-plan')).toHaveText('Pro')
    await expect(row(table, 'u-cancelled').locator('.adm-plan')).toHaveText('Cancelled')
    await expect(row(table, 'u-free').locator('.adm-plan')).toHaveText('Free')

    // The tiles are counts over the WHOLE list, and each one is a filter.
    const tile = (label) => page.locator('.adm-user-view').filter({ hasText: label })
    await expect(tile('All accounts').locator('.adm-user-view-n')).toHaveText('5')
    await expect(tile('Paying').locator('.adm-user-view-n')).toHaveText('2')
    await expect(tile('Needs attention').locator('.adm-user-view-n')).toHaveText('1')
    await expect(tile('Moderators').locator('.adm-user-view-n')).toHaveText('1')

    await tile('Needs attention').click()
    await expect(tile('Needs attention')).toHaveAttribute('aria-pressed', 'true')
    const shown = table.locator('tbody tr:has(button[aria-expanded])')
    await expect(shown).toHaveCount(1)
    await expect(shown.first()).toContainText('Cara Expired')
  })

  test('search finds a person by the handles the founder actually has', async ({ page }) => {
    // MUTATION: drop `r.uid` from the search fields — the uid search finds nobody.
    watch(page, 'the founder pasting a user id from a support email')
    await stubVerifyAdmin(page)
    const table = await openUsersTab(page)
    const search = page.getByRole('searchbox', { name: 'Search users' })

    await search.fill('u-cancelled')
    await expect(table.locator('tbody tr:has(button[aria-expanded])')).toHaveCount(1)
    await expect(page.locator('.adm-user-count')).toHaveText('1 of 5')

    await search.fill('Studio Pia')
    await expect(table.locator('tbody tr:has(button[aria-expanded])')).toHaveCount(1)
    await expect(table).toContainText('Pia Pro')

    await search.fill('nobody-here')
    await expect(page.getByText('No users match the current filters')).toBeVisible()
  })

  test('the detail panel carries the two handles and says what it cannot know', async ({ page }) => {
    // MUTATION: change `entitled: 'grace'` to `true` in utils/adminUsers.js —
    // "Pro access now" answers Yes for a row the dashboard cannot decide.
    watch(page, 'the founder opening one account')
    await stubVerifyAdmin(page)
    const table = await openUsersTab(page)

    const r = row(table, 'u-past-due')
    await r.getByRole('button', { name: 'Details' }).click()
    const detail = table.locator('.adm-detail').first()
    await expect(detail).toBeVisible()
    // The uid was not rendered anywhere on the old tab. It is the one string
    // the founder needs to act in the Firebase console or Stripe.
    await expect(detail.locator('.adm-copy-row').filter({ hasText: 'User ID' })).toContainText('u-past-due')
    await expect(detail.locator('.adm-copy-row').filter({ hasText: 'Email' })).toContainText('card.expired@example.test')
    await expect(detail.getByRole('button', { name: 'Copy' })).toHaveCount(2)
    // Not Yes, not No.
    const access = detail.locator('dt', { hasText: 'Pro access now' }).locator('+ dd')
    await expect(access).toContainText(/grace/i)
    await expect(access).not.toHaveText(/^(Yes|No)$/)
    await expect(detail.locator('dt', { hasText: 'Stripe status' }).locator('+ dd')).toHaveText('past_due')
    // And what the dashboard will not pretend to do.
    await expect(detail.locator('.adm-detail-foot')).toContainText(/not done from here/i)
  })
})

test.describe('changing what somebody can reach', () => {
  test('granting the role asks first, states the grant, and only then writes', async ({ page }) => {
    // MUTATION: wire the row's "Make moderator" straight to setModerator() —
    // the write lands before the confirmation is on screen.
    watch(page, 'the founder appointing a moderator')
    const writes = await stubVerifyAdmin(page)
    const table = await openUsersTab(page)

    await expect(row(table, 'u-mod').locator('.adm-access')).toHaveText('Moderator')
    await expect(row(table, 'u-pro').locator('.adm-access')).toHaveText('User')
    await expect(row(table, 'u-mod').locator('.adm-access')).toHaveText('Moderator')

    const r = row(table, 'u-pro')
    await r.getByRole('button', { name: 'Details' }).click()
    const panel = table.locator('.adm-detail-access').first()
    await panel.getByRole('button', { name: 'Make moderator' }).click()

    // Nothing has been written yet — the confirmation is the next thing on screen.
    expect(writes, 'the grant was written before the founder confirmed it').toEqual([])
    const confirm = panel.locator('.adm-confirm')
    await expect(confirm).toBeVisible()
    await expect(confirm).toContainText('Pia Pro')
    await expect(confirm).toContainText(/triage and delete feedback/)
    await expect(confirm).toContainText(/cannot see a reporter/)
    await expect(confirm).toContainText(/appoint another moderator/)

    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toHaveCount(0)
    expect(writes, 'cancelling still wrote the grant').toEqual([])

    await panel.getByRole('button', { name: 'Make moderator' }).click()
    await panel.locator('.adm-confirm').getByRole('button', { name: 'Make moderator' }).click()
    await expect.poll(() => writes).toEqual([{ action: 'grant', targetUid: 'u-pro' }])
    // The roster is re-read from the server, not patched locally.
    await expect(row(table, 'u-pro').locator('.adm-access')).toHaveText('Moderator')
  })

  test('removing the role names the hour-long lag before it offers the button', async ({ page }) => {
    // MUTATION: drop MODERATOR_REVOKE_LAG from the revoke branch — the
    // confirmation no longer says the old token keeps working.
    watch(page, 'the founder removing a moderator')
    const writes = await stubVerifyAdmin(page)
    const table = await openUsersTab(page)

    await row(table, 'u-mod').getByRole('button', { name: 'Details' }).click()
    const panel = table.locator('.adm-detail-access').first()
    await panel.getByRole('button', { name: 'Remove the role' }).click()
    const confirm = panel.locator('.adm-confirm--danger')
    await expect(confirm).toBeVisible()
    await expect(confirm).toContainText(/up to an hour/)
    await expect(confirm).toContainText(/removes the access, not the record/i)
    expect(writes).toEqual([])
    await confirm.getByRole('button', { name: 'Remove the role' }).click()
    await expect.poll(() => writes).toEqual([{ action: 'revoke', targetUid: 'u-mod' }])
    await expect(row(table, 'u-mod').locator('.adm-access')).toHaveText('User')
  })

  test('the founder is never offered the role on his own row', async ({ page }) => {
    // MUTATION: make isFounderRow() return false — his own row grows a
    // "Make moderator" button, offering him less than he already has.
    watch(page, 'the founder finding his own account')
    // His own account is in the list the route returns, as it is in production.
    // The address has to be the one signIn() resolves for `admin: true`,
    // because isFounderRow() compares a digest of it against the bundled
    // allowlist — a made-up founder address would render as an ordinary user
    // and this test would pass for the wrong reason.
    const { email } = await signIn(page, { admin: true, claims: { admin: true, email_verified: true } })
    await page.route((url) => url.pathname === '/api/verify-admin', async (route) => {
      const body = route.request().postDataJSON?.() || {}
      const base = { isAdmin: true, uid: FOUNDER_UID, email, moderator: false, role: 'founder' }
      if (body.moderatorAction === 'list') return route.fulfill({ json: { ...base, moderators: [] } })
      if (body.includeUsers === true) {
        const me = { uid: FOUNDER_UID, email, displayName: 'Founder', provider: 'google', emailVerified: true, createdAt: '2025-01-01T00:00:00.000Z', lastLoginAt: '2026-09-16T00:00:00.000Z', subscription: { status: null, interval: null }, onboarding: {}, location: '', company: '' }
        return route.fulfill({ json: { ...base, users: [me, ...USERS] } })
      }
      return route.fulfill({ json: base })
    })
    await go(page, '/admin')
    await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
    await page.getByRole('tab', { name: 'Users', exact: true }).click()
    await expect(page.getByText('All accounts · server data')).toBeVisible()
    const table = page.locator('.adm-users-table')
    const me = table.locator('tbody tr:has(button[aria-expanded])').filter({ hasText: 'Founder' }).first()
    await expect(me.locator('.adm-access')).toHaveText('Founder')
    await me.getByRole('button', { name: 'Details' }).click()
    const panel = table.locator('.adm-detail-access').first()
    await expect(panel).toContainText(/founder account/i)
    await expect(panel.getByRole('button', { name: /moderator|role/i })).toHaveCount(0)
  })
})

test.describe('the table at three widths', () => {
  // 390 is the founder's phone, 834 an iPad in portrait, 1440 his desktop.
  // The three are the same DOM: the decision at each width is recorded in
  // src/styles/deferred/admin.css above the two media rules.
  const SHOTS = path.join(REPORT_DIR, 'admin-users')

  for (const [width, mode] of [[390, 'cards'], [834, 'table'], [1440, 'table']]) {
    test(`at ${width} the rows are ${mode}, nothing overflows, and every state is still legible`, async ({ browser }) => {
      // MUTATION: delete the `@media(max-width:680px)` block — at 390 the table
      // scrolls sideways and the identity column leaves the viewport.
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: width < 500, hasTouch: width < 500 })
      const page = await ctx.newPage()
      watch(page, `the founder on a ${width}px screen`)
      await stubVerifyAdmin(page)
      const table = await openUsersTab(page)
      await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) })

      // No horizontal page scroll at any width.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `the page scrolls sideways by ${overflow}px at ${width}`).toBeLessThanOrEqual(0)

      const first = row(table, 'u-past-due')
      const cell = first.locator('td').first()
      const display = await first.evaluate((el) => getComputedStyle(el).display)
      if (mode === 'cards') {
        expect(display, 'a row is still a table-row at phone width').toBe('block')
        // Every cell names itself, because the header is gone.
        const label = await first.locator('td[data-label="Plan"]').evaluate((el) => getComputedStyle(el, '::before').content)
        expect(label).toMatch(/Plan/)
        // The identity is fully inside the viewport, not scrolled off the left.
        const box = await cell.boundingBox()
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      } else {
        expect(display, 'a row is not a table-row at tablet/desktop width').toBe('table-row')
        await expect(table.locator('thead th', { hasText: 'Plan' })).toBeVisible()
      }
      // The states are on screen whichever layout it is.
      await expect(first.locator('.adm-plan')).toHaveText('Past due')
      await expect(first.getByRole('button', { name: 'Details' })).toBeVisible()

      // Open one so the screenshot shows the panel too.
      await first.getByRole('button', { name: 'Details' }).click()
      await expect(table.locator('.adm-detail').first()).toBeVisible()
      const inner = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(inner, `opening the detail panel made the page scroll sideways by ${inner}px at ${width}`).toBeLessThanOrEqual(0)

      fs.mkdirSync(SHOTS, { recursive: true })
      await page.screenshot({ path: path.join(SHOTS, `users-${width}.png`), fullPage: true })
      await ctx.close()
    })
  }
})
