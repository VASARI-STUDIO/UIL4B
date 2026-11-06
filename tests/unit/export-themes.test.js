// The export themes are data in src/config/exportFormats.js: ten looks, four
// exports each, with the gate on every export. They are not export formats the
// panel can build, so nothing here may leak into EXPORT_FORMATS.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  EXPORT_FORMATS,
  EXPORT_THEMES,
  EXPORT_THEMES_LIVE,
  EXPORT_THEME_EXPORTS,
  EXPORT_THEME_SHAPES,
  assertFormatsCoherent,
  assertThemesCoherent,
  freeThemes,
  isThemeExportPro,
  proThemes,
  themeById,
  themeExports,
} from '../../src/config/exportFormats.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const MARKER = 'ships with the export themes'

test('there are ten themes, under the folder ids the export engine reads', () => {
  assert.deepEqual(EXPORT_THEMES.map((t) => t.id), [
    '01-presentation', '02-poster', '03-broadsheet', '04-standards', '05-specimen',
    '06-studio', '07-spec', '08-monograph', '09-blueprint', '10-inuse',
  ])
  assert.deepEqual(EXPORT_THEMES.map((t) => t.name), [
    'Presentation', 'Ticket', 'Broadsheet', 'Standards', 'Catalogue',
    'Studio', 'Specification', 'Riso', 'Blueprint', 'In use',
  ])
})

test('each theme names its sample brand, and no sample brand is a real company', () => {
  assert.deepEqual(EXPORT_THEMES.map((t) => t.brand), [
    'Kerbside', 'Encore', 'Saltbush', 'Two Shores', 'Margin',
    'Offcut', 'Northern Current', 'Long Room', 'Plumbline', 'Shallow End',
  ])
  for (const file of ['src/config/exportFormats.js', 'src/config/planFacts.js']) {
    assert.ok(!/\b(Tally|Paddle)\b/.test(read(file)), `${file} names a retired sample brand`)
  }
})

test('only Standards and Specification are Free', () => {
  assert.deepEqual(freeThemes().map((t) => t.id), ['04-standards', '07-spec'])
  assert.equal(proThemes().length, EXPORT_THEMES.length - freeThemes().length)
  assert.ok(EXPORT_THEMES.every((t) => t.tier === 'free' || t.tier === 'pro'))
})

test('page shapes: three 16:9, one A4 landscape, six A4', () => {
  const shapes = Object.fromEntries(EXPORT_THEMES.map((t) => [t.id, t.shape]))
  assert.deepEqual(shapes, {
    '01-presentation': '16:9', '02-poster': '16:9', '03-broadsheet': '16:9',
    '04-standards': 'A4 landscape',
    '05-specimen': 'A4', '06-studio': 'A4', '07-spec': 'A4', '08-monograph': 'A4', '09-blueprint': 'A4', '10-inuse': 'A4',
  })
  assert.deepEqual([...EXPORT_THEME_SHAPES], ['16:9', 'A4 landscape', 'A4'])
})

test('every theme makes the same four exports, and only the UI kit is ever free', () => {
  assert.deepEqual(EXPORT_THEME_EXPORTS.map((e) => e.id), ['brand-kit', 'guidelines', 'brand-book', 'ui-kit'])
  assert.deepEqual(EXPORT_THEME_EXPORTS.map((e) => e.name), ['Brand kit', 'Brand guidelines', 'HTML brand book', 'UI kit'])
  for (const t of EXPORT_THEMES) {
    const made = themeExports(t.id)
    assert.equal(made.length, 4, `${t.id} does not make four exports`)
    for (const e of made) {
      const free = e.id === 'ui-kit' && t.tier === 'free'
      assert.equal(e.pro, !free, `${t.id} / ${e.id}: the gate is wrong`)
    }
  }
  // The whole free offer, counted: two themes, one export each.
  const freePairs = EXPORT_THEMES.flatMap((t) => themeExports(t.id).filter((e) => !e.pro).map((e) => `${t.id}/${e.id}`))
  assert.deepEqual(freePairs, ['04-standards/ui-kit', '07-spec/ui-kit'])
})

test('isThemeExportPro and themeById refuse an id they do not know', () => {
  assert.equal(themeById('04-standards').name, 'Standards')
  assert.equal(themeById('nope'), null)
  assert.equal(isThemeExportPro('04-standards', 'ui-kit'), false)
  assert.equal(isThemeExportPro('04-standards', 'guidelines'), true)
  assert.equal(isThemeExportPro('01-presentation', 'ui-kit'), true)
  assert.throws(() => isThemeExportPro('nope', 'ui-kit'), /unknown export theme/)
  assert.throws(() => isThemeExportPro('04-standards', 'nope'), /unknown export theme/)
})

test('the theme data is coherent, and the check refuses each way it can break', () => {
  assert.equal(assertThemesCoherent(), true)
  const t = EXPORT_THEMES
  assert.throws(() => assertThemesCoherent([...t, { ...t[0] }]), /duplicate export theme id/)
  assert.throws(() => assertThemesCoherent([...t, { ...t[0], id: 'x' }]), /duplicate export theme name/)
  assert.throws(() => assertThemesCoherent([{ ...t[0], tier: 'gold' }, ...t.slice(1)]), /have no tier/)
  assert.throws(() => assertThemesCoherent([{ ...t[0], shape: '4:3' }, ...t.slice(1)]), /unknown page shape/)
  assert.throws(() => assertThemesCoherent([{ ...t[0], brand: '' }, ...t.slice(1)]), /lack a name or sample brand/)
  assert.throws(() => assertThemesCoherent(t, EXPORT_THEME_EXPORTS.map((e) => ({ ...e, proOnly: true }))), /every export needs Pro/)
  assert.throws(() => assertThemesCoherent(t.map((x) => ({ ...x, tier: 'free' }))), /no Pro export theme/)
  assert.throws(() => assertThemesCoherent(t, [...EXPORT_THEME_EXPORTS, EXPORT_THEME_EXPORTS[0]]), /duplicate export theme export id/)
})

test('the themes are not export formats: the panel offers none of them', () => {
  const themeIds = new Set(EXPORT_THEME_EXPORTS.filter((e) => e.proOnly).map((e) => e.id))
  const themeNames = new Set(EXPORT_THEME_EXPORTS.filter((e) => e.proOnly).map((e) => e.name))
  for (const f of EXPORT_FORMATS) {
    assert.ok(!themeIds.has(f.id), `${f.id} is a theme export registered as a format`)
    assert.ok(!themeNames.has(f.name), `${f.name} is a theme export registered as a format`)
  }
  assert.equal(assertFormatsCoherent(), true)
})

test('the switch is one boolean', () => {
  assert.equal(typeof EXPORT_THEMES_LIVE, 'boolean')
  const src = read('src/config/exportFormats.js')
  assert.equal(src.match(/export const EXPORT_THEMES_LIVE = /g).length, 1)
})

// Walk up from a declaration through the comment lines right above it.
function commentAbove(src, declaration) {
  const lines = src.split(/\r?\n/)
  const at = lines.findIndex((l) => declaration.test(l))
  assert.ok(at > 0, `${declaration} is not declared`)
  const above = []
  for (let i = at - 1; i >= 0 && /^\s*(\/\/|\/\*|\*)/.test(lines[i]); i--) above.push(lines[i])
  return above.join('\n')
}

test('every theme line carries the one-line code comment', () => {
  const formats = read('src/config/exportFormats.js')
  for (const name of [
    'EXPORT_THEMES_LIVE', 'EXPORT_THEME_SHAPES', 'EXPORT_THEME_EXPORTS', 'EXPORT_THEMES', 'freeThemes',
    'proThemes', 'themeById', 'isThemeExportPro', 'themeExports',
  ]) {
    assert.ok(commentAbove(formats, new RegExp(`^export const ${name} =`)).includes(MARKER), `${name} lacks the comment`)
  }
  assert.ok(commentAbove(formats, /^export function assertThemesCoherent/).includes(MARKER), 'assertThemesCoherent lacks the comment')

  const facts = read('src/config/planFacts.js')
  for (const name of [
    'THEME_COUNT', 'joinNames', 'FREE_THEME_NAMES', 'PRO_THEME_NAMES', 'EXPORTS_PER_THEME', 'PRO_THEME_DOCS',
    'PRO_THEME_DOCS_TITLE', 'THEMES_ROW_SUB', 'THEMES_ROW_SUB_PHONE', 'DOCUMENTS_ROW_SUB', 'THEME_FACTS',
  ]) {
    assert.ok(commentAbove(facts, new RegExp(`^(?:export )?const ${name} =`)).includes(MARKER), `planFacts ${name} lacks the comment`)
  }
  for (const name of ['freeUiKitLine', 'proDocumentsLine']) {
    assert.ok(commentAbove(facts, new RegExp(`^export const ${name} =`)).includes(MARKER), `planFacts ${name} lacks the comment`)
  }
})
