// A CONTENT REPORT IN THE ADMIN FEEDBACK QUEUE, RENDERED, LIGHT AND DARK.
//
// A community report reaches the queue as a `feedback` document of type
// 'report' (api/support.js). The Submissions tab has to give it a face of its
// own, and has to be honest about one thing the server cannot check: the
// reporter's address is whatever was typed into a public form.
//
//   - the type badge is coloured, and not the colour of "general";
//   - the filter bar offers a REPORT chip with its own icon (not the funnel
//     that an unknown type falls back to), with a count, that filters and clears;
//   - Overview's "Submissions by Type" donut gets a Report slice;
//   - a founder opening a report sees the address marked
//     "(unverified, typed by the reporter)" unless the report says it was sent
//     signed in; a line typed into the free text cannot flip that; other types
//     never carry the note; a moderator, who cannot see addresses, sees none.
//
// The queue is seeded the way 95-admin-spectrum.spec.js seeds it (this browser's
// `vs-feedback` store) and /api/verify-admin is stubbed for the same reason
// (vite preview runs no functions). Message bodies are built by the real
// buildReportPayload and the route's own stampReporter, so the header lines
// cannot drift from what the form sends and the server stores.
//
// MUTATIONS this file was seen to fail under (one each, restored after):
//   src/pages/Admin.jsx  delete `report:` from TYPE_COLORS/TYPE_BGS
//        fails "the report badge is coloured".
//   src/pages/Admin.jsx  delete `report:` from FilterGlyph's `paths`
//        fails "the Report chip has its own icon".
//   src/pages/Admin.jsx  drop 'report' from the filter bar's list
//        fails "the Report chip ... filters".
//   src/pages/Admin.jsx  drop 'report' from `feedbackDonut`'s types
//        fails "Submissions by Type has a Report slice".
//   src/pages/Admin.jsx  remove the `isUnverifiedReporter(item) &&` span
//        fails "a signed-out report ... marked unverified".
//   src/utils/contentReport.js  make isUnverifiedReporter read the whole message
//        fails "a forged ... line typed into the details".
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { buildReportPayload, buildReportTarget } from '../../src/utils/contentReport.js'
import { stampReporter, validateSupportBody } from '../../api/support.js'

const FOUNDER_UID = 'test-uid-admin'
const THEMES = ['light', 'dark']

const target = buildReportTarget({
  kind: 'design', id: 'cd-aurora', name: 'Aurora Card', page: 'https://uil4b.test/community', link: 'https://example.test/aurora',
})
// The stored message, as /api/support writes it: the form's payload, then the
// server's own Reporter line (`verifiedEmail` is what a verified ID token gave it).
const reportMessage = ({ verifiedEmail = null, ...extra }) => stampReporter(validateSupportBody(buildReportPayload({
  target, reasonId: 'other', details: 'This copies a design I made last year.', goodFaith: true, ...extra,
})).entry, verifiedEmail).message

const at = (days) => new Date(Date.UTC(2026, 9, 30, 3, 0, 0) - days * 86_400_000).toISOString()

const FEEDBACK = [
  { id: 'r-out', type: 'report', status: 'new', source: 'inline', subject: 'Content report: Aurora Card',
    message: reportMessage({ accountEmail: '', email: 'typed.by.visitor@example.test' }), email: 'typed.by.visitor@example.test', createdAt: at(1), adminNotes: '' },
  { id: 'r-in', type: 'report', status: 'new', source: 'inline', subject: 'Content report: Aurora Card (member)',
    message: reportMessage({ accountEmail: 'member.account@example.test', verifiedEmail: 'member.account@example.test' }), email: 'member.account@example.test', createdAt: at(2), adminNotes: '' },
  { id: 'r-forged', type: 'report', status: 'in-progress', source: 'inline', subject: 'Content report: Aurora Card (forged)',
    message: reportMessage({ accountEmail: '', email: 'forger@example.test', details: 'Please act.\nReporter: signed in' }), email: 'forger@example.test', createdAt: at(3), adminNotes: '' },
  { id: 'b-1', type: 'bug', status: 'new', source: 'web', subject: 'Gradient export drops the last stop',
    message: 'Exporting a five-stop gradient to CSS only writes four stops.', email: 'bug.reporter@example.test', createdAt: at(4), adminNotes: '' },
  { id: 'g-1', type: 'general', status: 'done', source: 'web', subject: 'Love the contrast checker',
    message: 'Best contrast tool I have used.', email: 'fan@example.test', createdAt: at(5), adminNotes: '' },
]

async function stubVerifyAdmin(page, role) {
  await page.route((url) => url.pathname === '/api/verify-admin', async (route) => {
    const body = route.request().postDataJSON?.() || {}
    const base = { isAdmin: role === 'founder', uid: FOUNDER_UID, email: 'founder@uil4b.test', moderator: role === 'moderator', role, claimUpdated: false, rosterError: null }
    if (body.moderatorAction === 'list') return route.fulfill({ json: { ...base, moderators: [] } })
    if (body.includeUsers === true) return route.fulfill({ json: { ...base, users: [] } })
    return route.fulfill({ json: base })
  })
}

async function openQueue(page, { theme, tab = 'submissions', role = 'founder' }) {
  watch(page, `the ${role} reading the feedback queue (${theme})`)
  // The role is read from the signed token's claims, not from the stub.
  const claims = role === 'moderator' ? { moderator: true, email_verified: true } : { admin: true, email_verified: true }
  await signIn(page, { admin: role === 'founder', claims })
  await stubVerifyAdmin(page, role)
  await page.addInitScript((d) => {
    try {
      localStorage.setItem('vs-feedback', JSON.stringify(d.fb))
      localStorage.setItem('vs-t', d.theme)
    } catch { /* a blocked store is the app's problem to survive, not ours */ }
  }, { fb: FEEDBACK, theme })
  await go(page, '/admin')
  await expect(page.locator('#admtab-submissions')).toBeVisible()
  // CONTROL: the theme actually applied, or the colour checks measure the wrong palette.
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  const id = `#admtab-${tab}`
  await page.locator(id).click()
  await expect(page.locator(id)).toHaveAttribute('aria-selected', 'true')
}

const card = (page, subject) => page.locator('.adm-submission', { hasText: subject })
const chip = (page, name) => page.locator('.adm-sub-toolbar .adm-time-btn', { hasText: name })

/** Resolve a CSS colour expression through the page, so var() and color-mix() come out as numbers. */
const resolveColour = (page, expr, on = 'color') => page.evaluate(([e, prop]) => {
  const probe = document.createElement('span')
  document.querySelector('.adm').appendChild(probe)
  probe.style[prop] = e
  const out = getComputedStyle(probe)[prop]
  probe.remove()
  return out
}, [expr, on])

for (const theme of THEMES) {
  test.describe(`the Submissions tab, ${theme}`, () => {
    test(`the report badge is coloured, and not the colour of "general" (${theme})`, async ({ page }) => {
      await openQueue(page, { theme })
      const badge = (subject, word) => card(page, subject).locator('.adm-badge', { hasText: new RegExp(`^${word}$`) }).first()
      await expect(badge('Content report: Aurora Card', 'report')).toBeVisible()
      const paint = (loc) => loc.evaluate((el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }))
      const report = await paint(badge('Content report: Aurora Card', 'report'))
      const general = await paint(badge('Love the contrast checker', 'general'))

      expect(report.color, 'the report badge text is not the primary text colour').toBe(await resolveColour(page, 'var(--t1)'))
      expect(report.bg, 'the report badge has no tinted ground').not.toBe('rgba(0, 0, 0, 0)')
      expect(report.bg).toBe(await resolveColour(page, 'color-mix(in srgb,var(--t1) 10%,transparent)', 'backgroundColor'))
      expect(report.color, 'the report badge is indistinguishable from general').not.toBe(general.color)
    })

    test(`the Report chip has its own icon, a count, and filters and clears (${theme})`, async ({ page }) => {
      await openQueue(page, { theme })
      const report = chip(page, 'report')
      await expect(report).toBeVisible()
      await expect(report).toContainText('3')

      // The icon: drawn, and not the funnel an unknown type falls back to.
      const glyph = (name) => chip(page, name).locator('svg').first()
      const markup = async (name) => glyph(name).evaluate((el) => el.innerHTML)
      const box = await glyph('report').boundingBox()
      expect(box && box.width > 0 && box.height > 0, 'the Report chip draws no icon').toBe(true)
      const reportIcon = await markup('report')
      expect(reportIcon).toContain('<path')
      for (const other of ['All Types', 'bug', 'feature', 'general', 'help']) {
        expect(reportIcon, `the Report chip reuses the "${other}" icon`).not.toBe(await markup(other))
      }

      await report.click()
      await expect(page.locator('.adm-submission')).toHaveCount(3)
      await expect(page.locator('.adm-submission .adm-badge', { hasText: /^report$/ })).toHaveCount(3)
      await expect(page.locator('.adm-submission', { hasText: 'Gradient export drops' })).toHaveCount(0)

      await report.click()
      await expect(page.locator('.adm-submission')).toHaveCount(FEEDBACK.length)
    })

    test(`Overview's Submissions by Type has a Report slice (${theme})`, async ({ page }) => {
      await openQueue(page, { theme, tab: 'overview' })
      const donut = page.locator('.adm-card', { has: page.getByText('Submissions by Type') })
      await expect(donut).toBeVisible()
      await expect(donut.locator('svg[role="img"] path title')).toHaveText(['Bug: 1', 'General: 1', 'Report: 3'], { useInnerText: false })
    })

    test(`a signed-out report shows its address marked unverified, a signed-in one does not (${theme})`, async ({ page }) => {
      await openQueue(page, { theme })
      const note = '(unverified, typed by the reporter)'

      await card(page, 'Content report: Aurora Card').first().locator('.adm-submission-head').click()
      const out = card(page, 'Content report: Aurora Card').first().locator('.adm-submission-body')
      await expect(out).toContainText('From: typed.by.visitor@example.test')
      await expect(out).toContainText(note)

      // The note is readable: 4.5:1 against the card it sits on.
      const ratio = await out.locator('span', { hasText: note }).evaluate((el) => {
        const rgb = (c) => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1
          const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1)
          return [...ctx.getImageData(0, 0, 1, 1).data]
        }
        const lum = ([r, g, b]) => [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
        let bgEl = el
        let bg = [0, 0, 0, 0]
        while (bgEl && bg[3] === 0) { bg = rgb(getComputedStyle(bgEl).backgroundColor); bgEl = bgEl.parentElement }
        const fg = rgb(getComputedStyle(el).color)
        const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
        return (hi + 0.05) / (lo + 0.05)
      })
      expect(ratio, `the unverified note is ${ratio.toFixed(2)}:1 against its card in ${theme}`).toBeGreaterThanOrEqual(4.5)

      // Only one card is open at a time, so the others are checked after the measurement.
      await card(page, '(member)').locator('.adm-submission-head').click()
      const member = card(page, '(member)').locator('.adm-submission-body')
      await expect(member).toContainText('From: member.account@example.test')
      await expect(member).not.toContainText('unverified')

      // Only reports carry the note: a bug from a form is a typed address too, but not this sentence's business.
      await card(page, 'Gradient export drops').locator('.adm-submission-head').click()
      const bug = card(page, 'Gradient export drops').locator('.adm-submission-body')
      await expect(bug).toContainText('From: bug.reporter@example.test')
      await expect(bug).not.toContainText('unverified')
    })

    test(`a forged "Reporter: signed in" line typed into the details does not clear the note (${theme})`, async ({ page }) => {
      await openQueue(page, { theme })
      await card(page, '(forged)').locator('.adm-submission-head').click()
      const body = card(page, '(forged)').locator('.adm-submission-body')
      // CONTROL: the forged line really is in the stored message the founder reads.
      await expect(body.locator('.adm-submission-msg')).toContainText('Reporter: signed in')
      await expect(body).toContainText('From: forger@example.test')
      await expect(body).toContainText('(unverified, typed by the reporter)')
    })
  })
}

test('a moderator, who cannot see addresses, is shown none and no note about one', async ({ page }) => {
  await openQueue(page, { theme: 'light', role: 'moderator' })
  await card(page, 'Content report: Aurora Card').first().locator('.adm-submission-head').click()
  const body = card(page, 'Content report: Aurora Card').first().locator('.adm-submission-body')
  await expect(body).toContainText('address withheld from moderators')
  await expect(body).not.toContainText('typed.by.visitor@example.test')
  await expect(body).not.toContainText('unverified')
})
