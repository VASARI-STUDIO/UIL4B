// THE HOMEPAGE EXPORTS SECTION: CARD 2'S ROWS, ART AND COPY, THE EXPORT-THEMES
// SWITCH BOTH WAYS, AND WHERE ITS COUNTS COME FROM.
//
// Card 2 reads one switch (the `live` prop, which defaults to EXPORT_THEMES_LIVE).
// Off, it shows what the export panel makes today. On, it shows the four exports
// of a theme. Both branches are run here through the data functions, so the
// switch flipping is a test input and not an edit to the config.
//
// The counts and the prices are never typed in this section; they come from the
// config. The source checks below read the section's files with their comments
// stripped, so a comment that names a count is not mistaken for code.
import test from 'node:test'
import assert from 'node:assert/strict'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { exportCopy, exportRows, projectsLimit } from '../../src/components/home/homeExportsData.js'
import { PROJECTS, artCaption, footnote } from '../../src/components/home/homeExportsKit.js'
import { EXPORT_GROUPS, EXPORT_THEME_EXPORTS, isGroupPro } from '../../src/config/exportFormats.js'
import { THEME_FACTS, numberWord } from '../../src/config/planFacts.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'

const FILES = {
  jsx: 'src/components/home/HomeExports.jsx',
  data: 'src/components/home/homeExportsData.js',
  kit: 'src/components/home/homeExportsKit.js',
}
const RAW = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))
const CODE = Object.fromEntries(Object.entries(RAW).map(([k, s]) => [k, stripComments(s)]))

const MARK = 'ships with the export themes'

test('the stripper still works, so the source reads below can be trusted', () => {
  assertStripperWorks(assert)
})

// ── Card 2's rows ───────────────────────────────────────────────────────────

test('with the themes live, card 2 has the four exports of a theme, in the config order and tiers', () => {
  const rows = exportRows(true)
  assert.deepEqual(rows.map((r) => r.id), ['brand-guidelines', 'brand-book', 'brand-kit', 'ui-kit'])
  assert.equal(rows.length, EXPORT_THEME_EXPORTS.length)
  for (const row of rows) {
    const exp = EXPORT_THEME_EXPORTS.find((e) => e.id === row.id)
    assert.equal(row.name, exp.name, `${row.id} is not named as the config names it`)
    assert.equal(row.tag, exp.proOnly ? 'Pro' : THEME_FACTS.freeTag, `${row.id} carries the wrong tier tag`)
  }
  // The only free export says in how many themes, from the theme data.
  assert.equal(rows.filter((r) => r.tag !== 'Pro').length, 1)
  assert.equal(rows.find((r) => r.id === 'ui-kit').tag, `Free in ${THEME_FACTS.freeCount} themes`)
})

test('the guidelines row states the page count the config holds', () => {
  const guidelines = EXPORT_THEME_EXPORTS.find((e) => e.id === 'brand-guidelines')
  assert.ok(Number.isInteger(guidelines.guidelinesPages) && guidelines.guidelinesPages > 0)
  assert.ok(
    exportRows(true).find((r) => r.id === 'brand-guidelines').sub.startsWith(`${guidelines.guidelinesPages} pages`),
    'the row does not show the page count from the config',
  )
})

test('with the themes off, card 2 shows what the export panel makes today and never mentions a theme', () => {
  const rows = exportRows(false)
  assert.deepEqual(rows.map((r) => r.id), ['guidelines', 'book', 'kit'])
  const group = (id) => EXPORT_GROUPS.find((g) => g.id === id)
  for (const row of rows) {
    assert.equal(row.name, group(row.id).name)
    assert.equal(row.sub, group(row.id).desc)
    assert.equal(row.tag, isGroupPro(row.id) ? 'Pro' : 'Free')
    assert.doesNotMatch(`${row.name} ${row.sub} ${row.tag}`, /theme/i, `${row.id} talks about themes while they are off`)
  }
  assert.ok(!rows.some((r) => r.id === 'brand-kit'), 'the brand kit is not an export of the live panel')
})

// ── Card 2's art ────────────────────────────────────────────────────────────

// The pictures are listed in HomeExports.jsx as { key, art, image }.
const OBJECTS = [...CODE.jsx.matchAll(/key: '(\w+)', art: '([\w-]+)', image: '([\w-]+)'/g)]
  .map(([, key, art, image]) => ({ key, art, image }))

test('the art list was read from the component (five pictures)', () => {
  assert.deepEqual(OBJECTS.map((o) => o.key), ['gb', 'gf', 'kt', 'bk', 'ui'])
})

test('with the themes live every row brings a picture forward and no picture is left over', () => {
  const rowArts = new Set(exportRows(true).map((r) => r.art))
  for (const art of rowArts) assert.ok(OBJECTS.some((o) => o.art === art), `row "${art}" has no picture`)
  for (const o of OBJECTS) assert.ok(rowArts.has(o.art), `picture "${o.key}" belongs to no row`)
})

test('with the themes off every row still has a picture, and only the brand kit sheet drops out', () => {
  const rowArts = new Set(exportRows(false).map((r) => r.art))
  for (const art of rowArts) assert.ok(OBJECTS.some((o) => o.art === art), `row "${art}" has no picture`)
  const dropped = OBJECTS.filter((o) => !rowArts.has(o.art)).map((o) => o.image)
  assert.deepEqual(dropped, ['brandkit-palette'])
})

test('the caption names the Presentation theme only while the themes are live', () => {
  assert.match(artCaption(true), /Presentation theme/)
  assert.doesNotMatch(artCaption(false), /theme/i)
  assert.match(artCaption(false), /sample brand/, 'the caption lost its sample-brand label')
})

// ── Card 2's copy and the footnote ──────────────────────────────────────────

test('with the themes live the copy takes its counts from the theme facts', () => {
  const { body, note } = exportCopy(true)
  assert.ok(body.includes(`leave as ${THEME_FACTS.exportsPerThemeWord} exports`), body)
  assert.ok(body.includes(`Choose from ${THEME_FACTS.countWord} themes`), body)
  assert.equal(note, `${THEME_FACTS.uiKitNote}. Everything else is Pro.`)
})

test('with the themes off the copy lists the panel exports and says nothing of themes', () => {
  const { body, note } = exportCopy(false)
  assert.doesNotMatch(`${body} ${note}`, /theme/i)
  for (const row of exportRows(false)) {
    const first = /^[A-Z]{2}/.test(row.name) ? row.name : row.name.charAt(0).toLowerCase() + row.name.slice(1)
    assert.ok(body.includes(first), `the body does not name "${row.name}"`)
  }
  assert.match(note, /Pro\.$/)
})

test('the footnote claims real exports only while the themes are live, and names every sample brand', () => {
  assert.match(footnote(true), /real export/)
  assert.doesNotMatch(footnote(false), /real export/)
  for (const brand of PROJECTS.map((p) => p.name.split(',')[0])) {
    assert.ok(footnote(false).includes(brand), `the footnote leaves out ${brand}`)
  }
})

// ── Card 3's pill ───────────────────────────────────────────────────────────

test('card 3 counts its projects against the real Free limit', () => {
  const limit = FREE_SAVE_LIMITS.projects
  assert.equal(projectsLimit(PROJECTS.length).pill, `${PROJECTS.length} of ${limit}`)
  assert.equal(projectsLimit(limit).full, true)
  assert.equal(projectsLimit(limit - 1).full, false)
  assert.equal(projectsLimit(limit).note, `${numberWord(limit).replace(/^./, (c) => c.toUpperCase())} projects on Free, unlimited on Pro.`)
  assert.ok(PROJECTS.length <= limit, 'the card shows more projects than a Free account can hold')
})

// ── The export-themes comment ───────────────────────────────────────────────

// True when the marker is on one of the `span` lines above the line holding `needle`.
function markedAbove(src, needle, span = 6) {
  const lines = src.split('\n')
  const at = lines.findIndex((l) => l.includes(needle))
  assert.ok(at > -1, `"${needle}" is not in the source`)
  return lines.slice(Math.max(0, at - span), at).some((l) => l.includes(MARK))
}

test('every line that depends on the export themes carries the marker comment', () => {
  const sites = [
    ['data', 'export function exportRows('],
    ['data', 'export function exportCopy('],
    ['kit', 'export function footnote('],
    ['kit', 'export function artCaption('],
    ['jsx', 'const OBJECTS = ['],
    ['jsx', '<p>{copy.body}</p>'],
    ['jsx', '<p className="hx-note">{copy.note}</p>'],
    ['jsx', '<p className="hx-cap">{artCaption(live)}</p>'],
    ['jsx', '<p className="hx-foot">{footnote(live)}</p>'],
  ]
  for (const [file, needle] of sites) {
    assert.ok(markedAbove(RAW[file], needle), `${FILES[file]}: "${needle}" lost its "${MARK}" comment`)
  }
})

test('the marker check can fail: the same lines without the comment are caught', () => {
  const bare = RAW.jsx.split('\n').filter((l) => !l.includes(MARK)).join('\n')
  assert.equal(markedAbove(bare, '<p>{copy.body}</p>'), false)
})

test('the component reads card 2 through the live switch, not around it', () => {
  assert.match(CODE.jsx, /exportRows\(live\)/)
  assert.match(CODE.jsx, /exportCopy\(live\)/)
  assert.match(CODE.jsx, /artCaption\(live\)/)
  assert.match(CODE.jsx, /footnote\(live\)/)
  assert.match(CODE.jsx, /live = EXPORT_THEMES_LIVE/)
})

// ── No typed count or price ─────────────────────────────────────────────────

// A count word or digit next to the thing it counts, or a price.
const TYPED_COUNT = /(?<![\d.])\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[ \t]+(?:themes?|exports?|projects?|pages?|tools?|icons?)\b/i
const TYPED_PRICE = /[$£€]\s?\d|\b\d+(?:\.\d+)?\s?(?:USD|AUD)\b|\/\s?(?:month|year)\b/i

test('the count and price detectors can fail', () => {
  assert.match('Choose from ten themes', TYPED_COUNT)
  assert.match('3 projects on Free', TYPED_COUNT)
  assert.match('Pro is $9 a month', TYPED_PRICE)
  assert.doesNotMatch('Choose from themes', TYPED_COUNT)
})

test('no count or price is typed in the section: the strings carry none', () => {
  for (const [file, src] of Object.entries(CODE)) {
    assert.doesNotMatch(src, TYPED_COUNT, `${FILES[file]} types a count`)
    assert.doesNotMatch(src, TYPED_PRICE, `${FILES[file]} types a price`)
  }
})

test('the counts come from the config files', () => {
  assert.match(CODE.data, /from '\.\.\/\.\.\/config\/planFacts\.js'/)
  assert.match(CODE.data, /from '\.\.\/\.\.\/config\/plans\.js'/)
  assert.match(CODE.data, /FREE_SAVE_LIMITS\.projects/)
  assert.match(CODE.data, /THEME_FACTS\.(?:exportsPerThemeWord|countWord|uiKitNote)/)
  assert.match(CODE.data, /guidelinesPages/)
})
