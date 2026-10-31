// The contrast pairs file: CSV and JSON from one pair list, ratios from the books' own function.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastPairs, buildContrastPairsCsv, buildContrastPairsJson, wcagFlags } from '../../src/utils/contrastPairs.js'
import { pairTally } from '../../src/utils/exportTemplates/shared.js'
import { contrast } from '../../src/utils/styleGuideExport.js'

const design = (colors) => ({ palette: { colors } })
const csvRows = (csv) => csv.trim().split('\n').slice(1).map((l) => l.split(','))

test('known ratios: black on white is 21.00, #767676 on white 4.54 (AA), #777777 on white 4.48 (fails)', () => {
  const rows = csvRows(buildContrastPairsCsv(design(['#000000', '#767676', '#777777'])))
  const row = (fg, bg) => rows.find((r) => r[1] === fg && r[3] === bg)
  assert.equal(row('#000000', '#ffffff')[4], '21.00')
  assert.deepEqual(row('#000000', '#ffffff').slice(5), ['pass', 'pass', 'pass', 'pass'])
  assert.equal(row('#767676', '#ffffff')[4], '4.54')
  assert.equal(row('#767676', '#ffffff')[5], 'pass')
  assert.equal(row('#767676', '#ffffff')[6], 'fail')
  assert.equal(row('#777777', '#ffffff')[4], '4.48')
  assert.deepEqual(row('#777777', '#ffffff').slice(5), ['fail', 'fail', 'pass', 'fail'])
})

test('WCAG thresholds: 3 large text and UI, 4.5 text, 7 enhanced', () => {
  assert.deepEqual(wcagFlags(2.99), { aa_text: false, aaa_text: false, aa_large_ui: false, aaa_large_text: false })
  assert.deepEqual(wcagFlags(3), { aa_text: false, aaa_text: false, aa_large_ui: true, aaa_large_text: false })
  assert.deepEqual(wcagFlags(4.5), { aa_text: true, aaa_text: false, aa_large_ui: true, aaa_large_text: true })
  assert.deepEqual(wcagFlags(7), { aa_text: true, aaa_text: true, aa_large_ui: true, aaa_large_text: true })
})

test('rows: every colour on every other colour plus white and black; no colour on itself', () => {
  const colors = ['#1f4b8e', '#2e7bb8', '#f4f1ea', '#222222']
  const n = colors.length
  const rows = csvRows(buildContrastPairsCsv(design(colors)))
  assert.equal(rows.length, n * (n - 1) + 2 * n)
  assert.ok(rows.every((r) => r[1] !== r[3]))
  assert.ok(rows.every((r) => /^\d+\.\d\d$/.test(r[4])), 'two decimals on every ratio')
})

test('agrees with the book: the same ratios, and the same count of passing pairs', () => {
  const colors = ['#1F4B8E', '#2E7BB8', '#F4F1EA', '#222222']
  const pairs = contrastPairs(design(colors))
  for (const p of pairs) assert.equal(p.ratio, contrast(p.foreground.hex.toUpperCase(), p.background.hex.toUpperCase()))
  const tally = pairTally(colors, ['#FFFFFF', '#000000'], contrast)
  const onExtras = pairs.filter((p) => ['white', 'black'].includes(p.background.name))
  const inPalette = pairs.filter((p) => !['white', 'black'].includes(p.background.name))
  assert.equal(inPalette.filter((p) => p.aa_text).length / 2 + onExtras.filter((p) => p.aa_text).length, tally.pass)
  assert.equal(inPalette.length / 2 + onExtras.length, tally.total)
})

test('the JSON carries the same pairs and flags as the CSV', () => {
  const d = design(['#1f4b8e', '#f4f1ea'])
  const doc = JSON.parse(buildContrastPairsJson(d, { projectName: 'Lumen' }))
  const rows = csvRows(buildContrastPairsCsv(d))
  assert.equal(doc.pairs.length, rows.length)
  doc.pairs.forEach((p, i) => {
    assert.equal(p.foreground.hex, rows[i][1])
    assert.equal(p.ratio.toFixed(2), rows[i][4])
    assert.equal(p.aa_text ? 'pass' : 'fail', rows[i][5])
  })
})

test('an empty design gives a header only, not an error', () => {
  assert.equal(buildContrastPairsCsv(undefined).trim().split('\n').length, 1)
})
