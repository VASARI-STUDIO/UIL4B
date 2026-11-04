// THE ADMIN OVERVIEW'S RANGE SELECTOR, RENDERED.
//
// The overview used to report a fixed 30 days. It now has a selector for 7, 30,
// 60 and 90 days, 6 months and 1 year, and each of these tests states one thing
// a person relies on:
//
//   1. Choosing a range changes every figure to that range's total.
//   2. Every chart and stat says which range it covers.
//   3. The choice is in the URL (?range=90d) and survives a reload.
//   4. The selector is one row that never wraps and never pushes the page wide,
//      at a phone width and a desktop width, and is set in the UI sans face.
//   5. The feedback cards follow the range too, and say when open bugs older
//      than it are being left out.
//
// ── THE DATA ───────────────────────────────────────────────────────────────
// "Today" is pinned to 3 Nov 2026. Seven daily documents sit at known ages and
// each holds ten times the views of the one before it, so a total names exactly
// which days were summed:
//
//   age (days)   day          views     first range that includes it
//        3       2026-10-31         1    7 days
//       19       2026-10-15        10    30 days
//       44       2026-09-20       100    60 days
//       75       2026-08-20     1 000    90 days
//      146       2026-06-10    10 000    6 months  (window starts 4 May)
//      266       2026-02-10   100 000    1 year    (window starts 4 Nov 2025)
//      428       2025-09-01 1 000 000    none of them
//
// The Firestore double in the test build answers the reader's `day >= start`
// query itself, so these are read the way production reads them.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'admin1')
fs.mkdirSync(SHOTS, { recursive: true })

const DAYS = [
  ['2026-10-31', 1],
  ['2026-10-15', 10],
  ['2026-09-20', 100],
  ['2026-08-20', 1000],
  ['2026-06-10', 10000],
  ['2026-02-10', 100000],
  ['2025-09-01', 1000000],
]

const DOCS = Object.fromEntries(DAYS.map(([day, views]) => [
  `analytics-daily/${day}`,
  { day, views, view__plans: views, 'tool__font-copy': 1, 'open__palette': 1 },
]))

// What each range should show: the Total Page Views figure as fmtNum writes it,
// how many seeded days fall inside, and the words that name the range.
const RANGES = [
  { id: '7d', raw: '1', name: '7 days', total: '1', active: '1', phrase: 'last 7 days' },
  { id: '30d', raw: '11', name: '30 days', total: '11', active: '2', phrase: 'last 30 days' },
  { id: '60d', raw: '111', name: '60 days', total: '111', active: '3', phrase: 'last 60 days' },
  { id: '90d', raw: '1111', name: '90 days', total: '1.1k', active: '4', phrase: 'last 90 days' },
  { id: '6m', raw: '11111', name: '6 months', total: '11.1k', active: '5', phrase: 'last 6 months' },
  { id: '1y', raw: '111111', name: '1 year', total: '111.1k', active: '6', phrase: 'last 12 months' },
]

const at = (y, m, d) => new Date(y, m, d, 12, 0, 0).toISOString()
const FEEDBACK = [
  { id: 'b-new', type: 'bug', status: 'new', subject: 'Export drops the last stop', message: 'Four of five stops are written.', email: '', source: 'web', createdAt: at(2026, 10, 1), adminNotes: '' },
  { id: 'b-old', type: 'bug', status: 'in-progress', subject: 'Search fails on two words', message: 'Zero results.', email: '', source: 'web', createdAt: at(2026, 7, 20), adminNotes: '' },
  { id: 'b-done', type: 'bug', status: 'done', subject: 'Fixed long ago', message: 'Closed.', email: '', source: 'web', createdAt: at(2026, 7, 21), adminNotes: '' },
  { id: 'f-1', type: 'feature', status: 'new', subject: 'Pin a palette', message: 'Keep favourites at the top.', email: '', source: 'web', createdAt: at(2026, 9, 15), adminNotes: '' },
]

async function openOverview(page, search = '') {
  watch(page, 'founder')
  await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0, 0))
  await signIn(page, {
    admin: true,
    claims: { admin: true, email_verified: true },
    docs: DOCS,
  })
  await page.route((url) => url.pathname === '/api/verify-admin', (route) => route.fulfill({
    json: { isAdmin: true, uid: 'test-uid-admin', email: 'founder@uil4b.test', moderator: false, role: 'founder', claimUpdated: false, rosterError: null },
  }))
  await page.route((url) => url.pathname === '/api/ai', (route) => route.fulfill({
    json: { providerHealth: { status: 'ok', windowDays: 7, summary: 'OpenRouter served all 10 generations in the last 7 days.', totals: { openrouterOk: 10, openrouterFail: 0, geminiOk: 0, noProvider: 0 } } },
  }))
  await page.addInitScript((fb) => {
    try { localStorage.setItem('vs-feedback', JSON.stringify(fb)) } catch { /* a blocked store is the app's problem */ }
  }, FEEDBACK)
  await go(page, `/admin${search}`)
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
  await expect(page.locator('.adm-range')).toBeVisible()
}

const picker = (page) => page.getByRole('group', { name: 'Date range for the overview' })
const choose = (page, name) => picker(page).getByRole('button', { name, exact: true }).click()
const stat = (page, label) => page.locator('.adm-stat').filter({ hasText: label })
const audience = (page) => page.locator('.adm-cat').first()

for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`admin overview range at ${vp.width}px`, () => {
    test.use({ viewport: vp })

    test('opens on 30 days with no range in the URL', async ({ page }) => {
      // MUTATION: change DEFAULT_RANGE_ID in src/utils/adminRange.js to '7d'
      // and the pressed segment, the totals and the labels all go red.
      await openOverview(page)
      await expect(picker(page).getByRole('button', { name: '30 days', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(picker(page).locator('[aria-pressed="true"]')).toHaveCount(1)
      await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText('11')
      expect(new URL(page.url()).searchParams.has('range')).toBe(false)
      await page.screenshot({ path: path.join(SHOTS, `overview-30d-${vp.width}.png`) })
    })

    test('every range changes the figures to its own total', async ({ page }) => {
      // MUTATION: delete the `since: win.startDay` option in loadAggregate()
      // (src/pages/Admin.jsx). The read is then the newest `days` documents
      // regardless of date, all seven seeded days are under every limit, and
      // 7 days reports 1.1m instead of 1.
      // MUTATION: delete the second useEffect (the one that calls
      // loadAggregate) and no figure moves when a segment is chosen.
      await openOverview(page)
      for (const r of RANGES) {
        await choose(page, r.name)
        await expect(picker(page).getByRole('button', { name: r.name, exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect(stat(page, 'Total Page Views').locator('.adm-stat-value'), `${r.name}: total views`).toHaveText(r.total)
        await expect(stat(page, 'Active Days').locator('.adm-stat-value'), `${r.name}: active days`).toHaveText(r.active)
        // The ranked lists are re-read too: the one page everything was
        // viewed on carries the same sum as the headline, as a plain number.
        await expect(audience(page).locator('.adm-bar-row', { hasText: 'plans' }).locator('.adm-bar-value'), `${r.name}: top page`)
          .toHaveText(r.raw)
      }
    })

    test('every chart and stat in the audience block names the range it covers', async ({ page }) => {
      // MUTATION: replace `range.phrase` with the literal 'last 30 days' in
      // any one of the stat captions, the TopList/ToolUsageCard `range` props
      // or the `.adm-cat-desc` line and the loop below goes red on the other
      // five ranges.
      await openOverview(page)
      for (const r of RANGES) {
        await choose(page, r.name)
        await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText(r.total)
        await expect(audience(page).locator('.adm-cat-desc')).toContainText(r.phrase)
        const subs = audience(page).locator('.adm-stat-sub')
        await expect(subs).toHaveCount(4)
        for (let i = 0; i < 4; i++) await expect(subs.nth(i), `${r.name}: stat caption ${i + 1}`).toContainText(r.phrase)
        // Top Pages, Tools, Top Icons, Top Icon Packs and Funnel.
        const cards = audience(page).locator('.adm-card-range')
        await expect(cards).toHaveCount(5)
        for (let i = 0; i < 5; i++) await expect(cards.nth(i), `${r.name}: card caption ${i + 1}`).toHaveText(r.phrase)
      }
    })

    test('the choice is in the URL and survives a reload', async ({ page }) => {
      // MUTATION: keep the range in useState instead of reading
      // searchParams.get('range') in Admin.jsx. The URL assertion and the
      // reload assertion both go red.
      await openOverview(page)
      await choose(page, '90 days')
      await expect(page).toHaveURL(/[?&]range=90d(&|$)/)
      await page.reload()
      await expect(page.locator('.adm-range')).toBeVisible()
      await expect(picker(page).getByRole('button', { name: '90 days', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText('1.1k')
      // Choosing the default again takes it back out of the query.
      await choose(page, '30 days')
      await expect.poll(() => new URL(page.url()).searchParams.has('range')).toBe(false)
    })

    test('a link to a range lands on it, and a value that is not a range falls back to 30 days', async ({ page }) => {
      // MUTATION: make parseRangeId() return its argument unchanged and the
      // `?range=bogus` half goes red (no segment is pressed).
      await openOverview(page, '?range=1y')
      await expect(picker(page).getByRole('button', { name: '1 year', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText('111.1k')
      await go(page, '/admin?range=bogus')
      await expect(page.locator('.adm-range')).toBeVisible()
      await expect(picker(page).getByRole('button', { name: '30 days', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText('11')
    })

    test('the feedback cards follow the range and own up to open bugs older than it', async ({ page }) => {
      // MUTATION: render `feedback` instead of `rangeFeedback` in the donut or
      // `rangeFeatures` in the Feature Requests card and the 7-day counts are
      // wrong. Delete the `olderOpenBugs` note and the 7-day half goes red.
      await openOverview(page)
      const bugs = page.locator('.adm-card').filter({ has: page.getByText('Open Bugs', { exact: true }) })
      const features = page.locator('.adm-card').filter({ has: page.getByText('Feature Requests', { exact: true }) })

      await choose(page, '7 days')
      await expect(bugs.getByText('Export drops the last stop')).toBeVisible()
      await expect(bugs.getByText('Search fails on two words')).toHaveCount(0)
      await expect(bugs.getByTestId('adm-older-bugs')).toHaveText(/1 older open bug is not shown/)
      await expect(features.getByText('0 filed')).toBeVisible()
      await expect(features.locator('.adm-card-header .adm-card-range')).toHaveText('last 7 days')
      await expect(bugs.locator('.adm-card-header .adm-card-range')).toHaveText('filed in the last 7 days')

      await choose(page, '30 days')
      await expect(features.getByText('1 filed')).toBeVisible()
      await expect(features.getByText('Pin a palette')).toBeVisible()

      await choose(page, '90 days')
      await expect(bugs.getByText('Search fails on two words')).toBeVisible()
      await expect(bugs.getByText('Fixed long ago')).toHaveCount(0)
      await expect(bugs.getByTestId('adm-older-bugs')).toHaveCount(0)
    })

    test('the selector is one row in the UI sans face, and the page does not scroll sideways', async ({ page }) => {
      // MUTATION: delete `.adm-range-long { display: none; }` from
      // deferred/admin.css and at 390px the full labels no longer fit one
      // line: the row overflows and the width assertions go red.
      // MUTATION: set `.adm-range { flex-wrap: wrap; }` and give the buttons
      // `flex: 0 0 auto` at 390px: the buttons stack onto a second row and the
      // one-row assertion goes red.
      // MUTATION: set `font-family: var(--mono)` on `.adm-range-btn` and the
      // face assertion goes red.
      await openOverview(page)
      const buttons = picker(page).getByRole('button')
      await expect(buttons).toHaveCount(6)

      const boxes = await buttons.evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: r.left, right: r.right, text: el.innerText, scroll: el.scrollWidth, client: el.clientWidth }
      }))
      expect(new Set(boxes.map(b => b.top)).size, 'all six segments share one row').toBe(1)
      for (const b of boxes) expect(b.scroll, `"${b.text}" fits its segment`).toBeLessThanOrEqual(b.client + 1)

      const bar = await picker(page).evaluate(el => ({
        scroll: el.scrollWidth, client: el.clientWidth, right: el.getBoundingClientRect().right,
        height: el.getBoundingClientRect().height,
      }))
      expect(bar.scroll, 'the selector does not overflow itself').toBeLessThanOrEqual(bar.client + 1)
      expect(bar.right, 'the selector stays inside the viewport').toBeLessThanOrEqual(vp.width)
      expect(bar.height, 'one row of segments, not two').toBeLessThan(60)

      const page$ = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }))
      expect(page$.doc, 'no horizontal scroll on the page').toBeLessThanOrEqual(page$.win)

      const face = await buttons.first().evaluate(el => getComputedStyle(el).fontFamily.toLowerCase())
      expect(face).not.toContain('mono')
      expect(face).toContain('switzer')

      // Short labels on a phone, full labels on a desktop.
      const shown = boxes.map(b => b.text.trim())
      if (vp.width < 640) expect(shown).toEqual(['7d', '30d', '60d', '90d', '6m', '1y'])
      else expect(shown).toEqual(['7 days', '30 days', '60 days', '90 days', '6 months', '1 year'])
    })

    test('the range can be chosen from the keyboard', async ({ page }) => {
      // MUTATION: render the segments as <div>s with onClick and Tab never
      // reaches them, so the first assertion goes red.
      await openOverview(page)
      const sixty = picker(page).getByRole('button', { name: '60 days', exact: true })
      await sixty.focus()
      await expect(sixty).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(sixty).toHaveAttribute('aria-pressed', 'true')
      await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText('111')
    })

    test('screenshots: the longest range', async ({ page }) => {
      await openOverview(page, '?range=1y')
      await expect(stat(page, 'Total Page Views').locator('.adm-stat-value')).toHaveText('111.1k')
      await page.screenshot({ path: path.join(SHOTS, `overview-1y-${vp.width}.png`) })
    })
  })
}
