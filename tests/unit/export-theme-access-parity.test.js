// The preview route and the themed export route each decide Pro access, and must never disagree.
//
//   preview: serveExportPreview -> assertThemeAccess (api/_lib/themeAccess.js)
//   export:  serveExportDocument -> serveThemeExport, which has its own inline check (api/_lib/exportThemeRoute.js)
//
// Both are driven through their real handlers, with an engine stub whose projectToBrand throws. A 500 build_failed therefore means
// "the gate let the request through and the build began"; a 403 pro_required means the gate refused. Nothing is rendered.
//
// What is pinned, and the change that makes each fail:
//  1. PARITY: for a Free and a Pro account, every theme x preview page gives the same verdict (allow, pro_required, or a 400 with the
//     same code) in the preview route as the export route gives for that page's row and format.
//     Break: change one side's rule for one theme (e.g. `isThemeExportPro(row, theme) && theme !== '07-spec'` in either route).
//  2. THE VERDICT ITSELF, hand-checked and not derived from isThemeExportPro: Free may have the slides of the two free themes and the
//     UI kit of Standards; every other theme and row is pro_required. Pro may have everything the theme has.
//     Break: make isThemeExportPro in src/data/exportThemes.js return false for a Pro row.
//  3. assertThemeAccess agrees with the export route for every theme, row and format in the table, including the 400s.
//     Break: change the 403 condition in assertThemeAccess for one row.
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { serveExportPreview } from '../../api/_lib/exportPreview.js'
import { assertThemeAccess } from '../../api/_lib/themeAccess.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS } from '../../src/data/exportThemes.js'

const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } }, 'free-1': {} }
const PLANS = { free: { id: 'free' }, pro: { id: 'pro' } }
const TOKENS = { free: 'tok-free', pro: 'tok-pro' }

// The preview page ids the Export dialog sends, each with the row and file format the access table is asked about. Written out by hand
// here (not imported) so a wrong mapping in the route shows up as a failure of the hand-checked verdicts below.
const PREVIEW_PAGES = {
  kitScreen: { row: 'ui-kit', format: 'zip' },
  kitButtons: { row: 'ui-kit', format: 'zip' },
  guideCover: { row: 'slides', format: 'pdf' },
  guidePalette: { row: 'slides', format: 'pdf' },
  book: { row: 'book', format: 'pdf' },
}

const FREE_SLIDES_THEMES = ['25-label', '27-swissfield']
const FREE_UI_KIT_THEME = '04-standards'
const GUIDELINES_ONLY = new Set(FREE_SLIDES_THEMES)

// What a Free account may have, by hand: slides in a free theme, the UI kit of Standards, nothing else. A 400 where the theme lacks the row.
function expectedFor(plan, theme, row) {
  if (GUIDELINES_ONLY.has(theme) && row !== 'slides') return 'unknown_row'
  if (plan === 'pro') return 'allow'
  if (row === 'slides' && FREE_SLIDES_THEMES.includes(theme)) return 'allow'
  if (row === 'ui-kit' && theme === FREE_UI_KIT_THEME) return 'allow'
  return 'pro_required'
}

function fakeRes() {
  const res = {
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.code = code; return res },
    json(body) { res.body = body; return res },
    send(buf) { res.buffer = buf; return res },
  }
  return res
}

const deps = () => ({
  verifyIdToken: async (token) => ({ uid: token === 'tok-pro' ? 'pro-1' : 'free-1' }),
  readUser: async (uid) => USERS[uid],
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
  engine: { projectToBrand() { throw new Error('stop here') } },
})

// Reduce a response to its verdict: allow (past the gate; the stub then fails the build with 500), or the refusal's code.
function verdictOf(res) {
  if (res.code === 500 && res.body?.code === 'build_failed') return 'allow'
  if (res.code === 200) return 'allow'
  assert.ok(res.code === 403 || res.code === 400, `unexpected response ${res.code} ${JSON.stringify(res.body)}`)
  return res.body.code
}

async function previewVerdict(plan, theme, page) {
  const res = fakeRes()
  await serveExportPreview({ headers: { authorization: `Bearer ${TOKENS[plan]}` }, body: { theme, page, brand: { name: 'Tide & Co.', design: DESIGN } } }, res, deps())
  return verdictOf(res)
}

async function exportVerdict(plan, theme, row, format) {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: `Bearer ${TOKENS[plan]}` }, body: { theme, row, format, projectName: 'Tide & Co.', design: DESIGN } }, res, deps())
  return verdictOf(res)
}

// The routes log build failures by name; the stub engine fails every build on purpose, so keep that out of the output.
mock.method(console, 'error', () => {})

const THEME_IDS = EXPORT_THEMES.map((t) => t.id)

test('the table is the size this test expects, so a new theme or row is walked on purpose', () => {
  assert.equal(THEME_IDS.length, 22)
  assert.deepEqual(Object.keys(THEME_ROW_FORMATS), ['ui-kit', 'book', 'slides'])
  assert.deepEqual(EXPORT_THEMES.filter((t) => t.free).map((t) => t.id), FREE_SLIDES_THEMES)
})

for (const plan of ['free', 'pro']) {
  test(`${plan}: preview and export give the same verdict for every theme and preview page, and it is the hand-checked one`, async () => {
    for (const theme of THEME_IDS) {
      for (const [page, { row, format }] of Object.entries(PREVIEW_PAGES)) {
        const preview = await previewVerdict(plan, theme, page)
        const exported = await exportVerdict(plan, theme, row, format)
        assert.equal(preview, exported, `${plan} ${theme} ${page} (${row}/${format}): preview ${preview}, export ${exported}`)
        assert.equal(preview, expectedFor(plan, theme, row), `${plan} ${theme} ${page}`)
      }
    }
  })

  test(`${plan}: preview and export agree for every theme, row and format in the table`, async () => {
    for (const theme of THEME_IDS) {
      for (const [row, formats] of Object.entries(THEME_ROW_FORMATS)) {
        for (const format of formats) {
          const exported = await exportVerdict(plan, theme, row, format)
          const gate = assertThemeAccess(PLANS[plan], { theme, row, format })
          const gateVerdict = gate.ok ? 'allow' : gate.code
          assert.equal(gateVerdict, exported, `${plan} ${theme} ${row}/${format}: assertThemeAccess ${gateVerdict}, export ${exported}`)
          assert.equal(exported, expectedFor(plan, theme, row), `${plan} ${theme} ${row}/${format}`)
        }
      }
    }
  })
}

test('a theme or row outside the table is refused alike by both routes, for Free and Pro', async () => {
  for (const plan of ['free', 'pro']) {
    for (const [theme, row, format] of [['nope', 'ui-kit', 'zip'], ['04-standards', 'nope', 'zip'], ['04-standards', 'ui-kit', 'pdf'], ['__proto__', 'slides', 'pdf']]) {
      const exported = await exportVerdict(plan, theme, row, format)
      const gate = assertThemeAccess(PLANS[plan], { theme, row, format })
      assert.equal(gate.ok, false, `${plan} ${theme} ${row} ${format}`)
      assert.equal(gate.code, exported, `${plan} ${theme} ${row} ${format}`)
    }
  }
})
