// ADMIN → GENERATED: REPORTS NOBODY TYPED, LISTED APART FROM WHAT PEOPLE WROTE.
//
// Crash reports (src/utils/errorReport.js) land in the same `feedback`
// collection as the feedback form, so Submissions used to mix the two. A crash
// report now carries `source: 'auto'` (api/support.js keeps it) and Admin
// splits the one list on it:
//
//   - Submissions lists every row that is NOT 'auto', and nothing else;
//   - Generated lists the 'auto' rows, with the same card and the same status /
//     notes / delete handlers, and a search and filter of its own;
//   - the Submissions tab badge counts people's reports only;
//   - on a phone the Generated toolbar keeps each of its rows on one line, its
//     controls are 44px targets, and nothing makes the page scroll sideways.
//
// The queue is seeded the way 204-admin-report-queue.spec.js seeds it (this
// browser's `vs-feedback` store), and /api/verify-admin is stubbed for the same
// reason: `vite preview` runs no functions.
//
// MUTATIONS this file was meant to fail under (one each, restore after). They
// are named, not yet watched: the author could not run Playwright in this lane.
//   src/pages/Admin.jsx  make `humanFeedback` the whole `feedback` list
//        fails "Submissions lists only the typed report" and the badge test.
//   src/pages/Admin.jsx  make `autoFeedback` the whole `feedback` list
//        fails "Generated lists only the crash report".
//   src/pages/Admin.jsx  count `feedback` instead of `humanFeedback` for newCount
//        fails "the Submissions badge counts only what people wrote".
//   src/pages/Admin.jsx  drop `onDelete={handleDelete}` from the Generated cards
//        fails "the Generated card has the same actions ... and they work".
//   src/pages/Admin.jsx  share `subSearch` with the Generated search box
//        fails "each tab keeps its own search".
//   src/styles/deferred/admin.css  set `.adm-gen-chips{flex-wrap:wrap}`
//        fails "on a phone the Generated toolbar ...".
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const FOUNDER_UID = 'test-uid-admin'

const at = (days) => new Date(Date.UTC(2026, 9, 30, 3, 0, 0) - days * 86_400_000).toISOString()

const TYPED = 'Gradient export drops the last stop'
const CRASH = 'Crash on /admin: TypeError reading join'

const FEEDBACK = [
  { id: 'typed-1', type: 'bug', status: 'new', source: 'inline', subject: TYPED,
    message: 'Exporting a five-stop gradient to CSS only writes four stops.', email: 'bug.reporter@example.test', createdAt: at(1), adminNotes: '' },
  { id: 'crash-1', type: 'bug', status: 'new', source: 'auto', subject: CRASH,
    message: 'Automatic report (render) — nobody typed this.\nRoute: /admin\nError: Cannot read properties of undefined (reading \'join\')', email: '', createdAt: at(2), adminNotes: '' },
]

async function stubVerifyAdmin(page) {
  await page.route((url) => url.pathname === '/api/verify-admin', async (route) => {
    const body = route.request().postDataJSON?.() || {}
    const base = { isAdmin: true, uid: FOUNDER_UID, email: 'founder@uil4b.test', moderator: false, role: 'founder', claimUpdated: false, rosterError: null }
    if (body.moderatorAction === 'list') return route.fulfill({ json: { ...base, moderators: [] } })
    if (body.includeUsers === true) return route.fulfill({ json: { ...base, users: [] } })
    return route.fulfill({ json: base })
  })
}

async function openTab(page, tab) {
  watch(page, `the founder reading the ${tab} tab`)
  await signIn(page, { admin: true, claims: { admin: true, email_verified: true } })
  await stubVerifyAdmin(page)
  await page.addInitScript((d) => {
    try {
      localStorage.setItem('vs-feedback', JSON.stringify(d.fb))
      localStorage.setItem('vs-t', 'light')
    } catch { /* a blocked store is the app's problem to survive, not ours */ }
  }, { fb: FEEDBACK })
  await go(page, '/admin')
  await expect(page.locator('#admtab-submissions')).toBeVisible()
  await selectTab(page, tab)
}

async function selectTab(page, tab) {
  await page.locator(`#admtab-${tab}`).click()
  await expect(page.locator(`#admtab-${tab}`)).toHaveAttribute('aria-selected', 'true')
}

const card = (page, subject) => page.locator('.adm-submission', { hasText: subject })
const cardTitles = (page) => page.locator('.adm-submission .adm-submission-title')

test.describe('the Submissions and Generated tabs split one list', () => {
  test('Submissions lists only the typed report', async ({ page }) => {
    await openTab(page, 'submissions')
    await expect(cardTitles(page)).toHaveText([TYPED])
    await expect(card(page, CRASH)).toHaveCount(0)
    await expect(page.locator('.adm-section-title')).toContainText('Submissions (1)')
    // CONTROL: the crash row is in the store, so its absence is the split and not a failed seed.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-feedback')).map((f) => f.source))).toEqual(['inline', 'auto'])
  })

  test('Generated lists only the crash report', async ({ page }) => {
    await openTab(page, 'generated')
    await expect(cardTitles(page)).toHaveText([CRASH])
    await expect(card(page, TYPED)).toHaveCount(0)
    await expect(page.locator('.adm-section-title')).toContainText('Generated (1)')
    // The row says where it came from.
    await expect(card(page, CRASH).locator('.adm-badge', { hasText: /^auto$/ })).toBeVisible()
  })

  test('the Submissions badge counts only what people wrote', async ({ page }) => {
    await openTab(page, 'generated')
    // One typed report (new) and one crash report (new): the badge says 1, not 2.
    await expect(page.locator('#admtab-submissions .adm-tab-badge')).toHaveText('1')
    // The Generated tab carries no badge of its own.
    await expect(page.locator('#admtab-generated .adm-tab-badge')).toHaveCount(0)
  })

  test('the Generated card has the same actions as a Submissions card, and they work', async ({ page }) => {
    await openTab(page, 'submissions')
    const actionsOf = async (subject) => {
      await card(page, subject).locator('.adm-submission-head').click()
      const body = card(page, subject).locator('.adm-submission-body')
      await expect(body).toBeVisible()
      const buttons = await body.locator('.btn').allTextContents()
      return buttons.map((t) => t.trim())
    }
    const typedActions = await actionsOf(TYPED)
    expect(typedActions, 'the Submissions card shows its triage buttons').toEqual(expect.arrayContaining(['Mark as In Progress', 'Add notes', 'Delete']))

    await selectTab(page, 'generated')
    const crashActions = await actionsOf(CRASH)
    expect(crashActions, 'the Generated card offers the same buttons as the Submissions card').toEqual(typedActions)

    // Status: moves the Generated count, and not the Submissions badge.
    await card(page, CRASH).getByRole('button', { name: 'Mark as In Progress' }).click()
    await expect(page.locator('.adm-sub-summary')).toContainText('1 in progress')
    await expect(page.locator('#admtab-submissions .adm-tab-badge')).toHaveText('1')

    // Notes: saved on the crash row.
    await card(page, CRASH).getByRole('button', { name: 'Add notes' }).click()
    await card(page, CRASH).locator('textarea').fill('Seen on the 30th, fixed in the next deploy.')
    await card(page, CRASH).getByRole('button', { name: 'Save' }).click()
    await expect(card(page, CRASH)).toContainText('Seen on the 30th, fixed in the next deploy.')

    // Delete: asks first, then removes the crash row and leaves the typed one.
    await card(page, CRASH).getByRole('button', { name: 'Delete' }).click()
    await card(page, CRASH).getByRole('button', { name: 'Yes' }).click()
    await expect(page.locator('.adm-submission')).toHaveCount(0)
    await expect(page.locator('.adm-empty')).toContainText('No generated reports yet.')
    await selectTab(page, 'submissions')
    await expect(cardTitles(page)).toHaveText([TYPED])
  })

  test('each tab keeps its own search', async ({ page }) => {
    await openTab(page, 'generated')
    await page.getByLabel('Search generated reports').fill('no such crash')
    await expect(page.locator('.adm-empty')).toContainText('No generated reports match filters.')

    await selectTab(page, 'submissions')
    await expect(page.locator('.adm-sub-toolbar .adm-search')).toHaveValue('')
    await expect(cardTitles(page)).toHaveText([TYPED])

    // And back: the Generated search is where it was left.
    await selectTab(page, 'generated')
    await expect(page.getByLabel('Search generated reports')).toHaveValue('no such crash')
  })
})

test.describe('the Generated tab on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  // Break it: set `.adm-gen-chips{flex-wrap:wrap}` in src/styles/deferred/admin.css
  // and the status chips fall onto a second line.
  test('the toolbar keeps each row on one line, its controls are 44px, and the page does not scroll sideways', async ({ page }) => {
    await openTab(page, 'generated')
    const chips = page.locator('.adm-gen-chips .adm-time-btn')
    await expect(chips.first()).toBeVisible()

    const m = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) } }
      const search = document.querySelector('.adm-gen-toolbar .adm-search')
      const row = document.querySelector('.adm-gen-chips')
      const buttons = [...row.querySelectorAll('.adm-time-btn')].map((b) => ({ label: b.textContent.trim(), ...box(b) }))
      return {
        search: box(search),
        row: { ...box(row), flexWrap: getComputedStyle(row).flexWrap },
        buttons,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }
    })

    expect(m.buttons.length, 'All, New, In Progress, Done and the sort').toBe(5)
    // One line: every chip sits at the same height as the first, and the row is
    // not allowed to wrap.
    expect(m.row.flexWrap).toBe('nowrap')
    for (const b of m.buttons) expect(b.top, `"${b.label}" is on its own line`).toBe(m.buttons[0].top)
    // The search is above the chips, full width, not squeezed beside them.
    expect(m.search.bottom, 'the search sits above the status row').toBeLessThanOrEqual(m.row.top)
    expect(m.search.right - m.search.left, 'the search spans the toolbar').toBeGreaterThan(250)
    // 44px targets.
    expect(m.search.height, 'the search field is 44px').toBeGreaterThanOrEqual(44)
    for (const b of m.buttons) expect(b.height, `"${b.label}" is ${b.height}px tall`).toBeGreaterThanOrEqual(44)
    // The page itself stays the width of the phone.
    expect(m.scrollWidth, 'the page scrolls sideways').toBeLessThanOrEqual(m.innerWidth)
  })

  test('the Submissions tab does not scroll sideways either', async ({ page }) => {
    await openTab(page, 'submissions')
    await expect(cardTitles(page)).toHaveText([TYPED])
    const w = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(w.scrollWidth, 'the page scrolls sideways').toBeLessThanOrEqual(w.innerWidth)
  })
})
