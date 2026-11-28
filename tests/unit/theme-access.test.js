// assertThemeAccess (api/_lib/themeAccess.js): the one function both export routes ask, so every Pro export is walked through it.
//
// What is pinned, and the change that makes each fail:
//  1. FREE IS REFUSED EVERYWHERE PRO: every theme x row x format on a Free plan is 403 pro_required, except the free tier written out
//     below (the guidelines in Label, Swiss Field and Flyleaf, the UI kit in Standards). The expected tier is written here, not read back
//     from isThemeExportPro, so loosening the table fails this too.
//     Break: make assertThemeAccess return { ok: true } for every plan.
//  2. PRO IS ALLOWED: the same walk on a Pro plan is ok for every combination in the tables.
//     Break: compare the plan with 'free' instead of 'pro'.
//  3. FAIL CLOSED: an unknown theme, row or format, odd types and prototype keys are denied for Pro and Free alike, and a missing,
//     odd or look-alike plan counts as Free.
//     Break: return ok when the theme is not in the table.
//  4. THE DOCUMENTS: every Pro document format is 403 for Free and ok for Pro; a made-up id is denied.
//     Break: drop `known.pro &&` in the document branch.
import test from 'node:test'
import assert from 'node:assert/strict'
import { assertThemeAccess } from '../../api/_lib/themeAccess.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, themeHasRow } from '../../src/data/exportThemes.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const FREE = { id: 'free' }
const PRO = { id: 'pro' }

// The free tier, written out: Label, Swiss Field and Flyleaf are free in every row they have; Standards' UI kit is free. Nothing else is.
const FREE_THEMES = ['25-label', '27-swissfield', '33-flyleaf']
const isFree = (theme, row) => FREE_THEMES.includes(theme) || (theme === '04-standards' && row === 'ui-kit')

const combos = []
for (const { id: theme } of EXPORT_THEMES) {
  for (const [row, formats] of Object.entries(THEME_ROW_FORMATS)) {
    if (!themeHasRow(theme, row)) continue
    for (const format of formats) combos.push({ theme, row, format })
  }
}

test('the walk covers every theme, row and format (a thin walk proves nothing)', () => {
  assert.ok(combos.length >= 80, `only ${combos.length} combinations`)
  assert.ok(combos.some((c) => !isFree(c.theme, c.row)) && combos.some((c) => isFree(c.theme, c.row)))
})

test('Free: every Pro theme, row and format is 403 pro_required; only the free tier is ok', () => {
  for (const c of combos) {
    const got = assertThemeAccess(FREE, c)
    if (isFree(c.theme, c.row)) assert.deepEqual(got, { ok: true }, `${c.theme} ${c.row} ${c.format}`)
    else assert.deepEqual(got, { ok: false, status: 403, code: 'pro_required' }, `${c.theme} ${c.row} ${c.format}`)
  }
})

test('Pro: every theme, row and format in the tables is ok', () => {
  for (const c of combos) assert.deepEqual(assertThemeAccess(PRO, c), { ok: true }, `${c.theme} ${c.row} ${c.format}`)
})

test('a missing, odd or look-alike plan is Free', () => {
  const pro = { theme: '01-presentation', row: 'book', format: 'pdf' }
  for (const plan of [undefined, null, {}, 'pro', 1, true, [], { id: 'PRO' }, { id: 'pro ' }, { id: ['pro'] }, { name: 'pro' }, { plan: 'pro' }]) {
    assert.deepEqual(assertThemeAccess(plan, pro), { ok: false, status: 403, code: 'pro_required' }, JSON.stringify(plan))
  }
})

test('unknown or malformed input is denied, for Pro as well as Free', () => {
  const bad = [
    [{ theme: 'nope', row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ theme: '__proto__', row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ theme: 'constructor', row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ theme: 1, row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ theme: null, row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ theme: ['01-presentation'], row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ row: 'book', format: 'pdf' }, 'unknown_theme'],
    [{ theme: '01-presentation', row: 'nope', format: 'pdf' }, 'unknown_row'],
    [{ theme: '01-presentation', row: '__proto__', format: 'pdf' }, 'unknown_row'],
    [{ theme: '01-presentation', row: 'toString', format: 'pdf' }, 'unknown_row'],
    [{ theme: '01-presentation', row: 7, format: 'pdf' }, 'unknown_row'],
    [{ theme: '01-presentation' }, 'unknown_row'],
    // A theme that lacks the row: Label has slides only.
    [{ theme: '25-label', row: 'book', format: 'pdf' }, 'unknown_row'],
    [{ theme: '25-label', row: 'ui-kit', format: 'zip' }, 'unknown_row'],
    [{ theme: '01-presentation', row: 'book', format: 'zip' }, 'unknown_format'],
    [{ theme: '01-presentation', row: 'ui-kit', format: 'pdf' }, 'unknown_format'],
    [{ theme: '01-presentation', row: 'book', format: '__proto__' }, 'unknown_format'],
    [{ theme: '01-presentation', row: 'book', format: ['pdf'] }, 'unknown_format'],
    [{ theme: '01-presentation', row: 'book' }, 'unknown_format'],
  ]
  for (const plan of [FREE, PRO]) {
    for (const [ask, code] of bad) {
      assert.deepEqual(assertThemeAccess(plan, ask), { ok: false, status: 400, code }, JSON.stringify(ask))
    }
  }
})

test('no argument and an empty ask are denied', () => {
  assert.equal(assertThemeAccess(PRO).ok, false)
  assert.equal(assertThemeAccess(PRO, {}).ok, false)
  assert.equal(assertThemeAccess(FREE, {}).ok, false)
})

test('documents: every live Pro format is 403 for Free and ok for Pro; a made-up id is denied', () => {
  const pro = EXPORT_FORMATS.filter((f) => f.live && f.pro)
  assert.ok(pro.length >= 5, 'the Pro formats')
  for (const f of pro) {
    assert.deepEqual(assertThemeAccess(FREE, { format: f.id }), { ok: false, status: 403, code: 'pro_required' }, f.id)
    assert.deepEqual(assertThemeAccess(PRO, { format: f.id }), { ok: true }, f.id)
  }
  // The ids the routes build, written out so a table edit that drops the flag fails here.
  for (const id of ['book', 'book-png', 'book-html', 'guidelines', 'guidelines-html', 'app-bundle']) {
    assert.equal(assertThemeAccess(FREE, { format: id }).status, 403, id)
  }
  for (const f of ['nope', '__proto__', 'constructor', 'toString', '', 7, null, undefined, ['book']]) {
    for (const plan of [FREE, PRO]) assert.equal(assertThemeAccess(plan, { format: f }).ok, false, String(f))
  }
  // An unbuilt format (`coming`, not live) is denied for Pro too.
  const unbuilt = EXPORT_FORMATS.find((f) => !f.live)
  if (unbuilt) assert.equal(assertThemeAccess(PRO, { format: unbuilt.id }).ok, false)
})
