// paletteLayout gives every colour one cell and the primary the largest. To see
// it fail, make the first row in src/utils/exportTemplates/shared.js
// `{ i: 0, span: 1 }`: the primary stops being the largest cell.
import test from 'node:test'
import assert from 'node:assert/strict'
import { paletteLayout, MAX_SLOTS } from '../../src/utils/exportTemplates/shared.js'
import { slotLands, SLOT_LANDS } from '../../src/utils/paletteRoles.js'

const cells = (rows) => rows.flat()

test('0 colours is no rows', () => {
  assert.deepEqual(paletteLayout(0), [])
  assert.deepEqual(paletteLayout(-3), [])
  assert.deepEqual(paletteLayout(NaN), [])
})

test('3 to 13 colours give one cell each, in slot order, primary largest', () => {
  for (const template of ['specification', 'monograph', 'atlas']) {
    for (let n = 3; n <= 13; n += 1) {
      const all = cells(paletteLayout(n, template))
      assert.deepEqual(all.map((c) => c.i), Array.from({ length: n }, (_, i) => i), `${template} ${n}`)
      const primary = all[0]
      assert.ok(all.slice(1).every((c) => c.span < primary.span), `${template} ${n}: primary is not strictly largest`)
    }
  }
})

test('more than 13 colours clamp to 13', () => {
  assert.equal(MAX_SLOTS, 13)
  assert.equal(cells(paletteLayout(14)).length, 13)
  assert.equal(cells(paletteLayout(500, 'atlas')).length, 13)
})

test('an inherited property name is not a template', () => {
  assert.deepEqual(paletteLayout(5, '__proto__'), paletteLayout(5, 'specification'))
  assert.deepEqual(paletteLayout(5, 'constructor'), paletteLayout(5, 'specification'))
})

test('slotLands names a place for the five slots and says so for the rest', () => {
  assert.equal(SLOT_LANDS.length, 5)
  SLOT_LANDS.forEach((line, i) => assert.equal(slotLands(i), line))
  for (const bad of [5, -1, 1.5, '0', null, undefined]) assert.equal(slotLands(bad), 'Not given a place in the preview')
})

// Presentation's swatch rows (presentationLayout, reached through paletteLayout).
// To see the span checks fail, change `span: i === 0 ? 2 : 1` in that function
// to `span: 1`: the primary stops being a double-width cell.
const units = (row) => row.reduce((sum, c) => sum + c.span, 0)
const slotsOf = (rows) => rows.flat().map((c) => c.i)
const kindsOf = (accents, neutrals) => ['primary', ...Array(accents).fill('accent'), ...Array(neutrals).fill('neutral')]

test('presentation: 1 to 6 colours sit in one row, the primary double width', () => {
  for (let n = 1; n <= 6; n += 1) {
    const rows = paletteLayout(n, 'presentation')
    assert.equal(rows.length, 1, `${n} colours`)
    assert.deepEqual(rows[0].map((c) => c.i), Array.from({ length: n }, (_, i) => i), `${n} colours, in slot order`)
    assert.equal(rows[0][0].span, 2, `${n} colours: the primary takes two cells`)
    assert.ok(rows[0].slice(1).every((c) => c.span === 1), `${n} colours: every other colour takes one`)
  }
})

test('presentation: 7 colours go to two rows, 4 cell widths each, and 13 to two rows of 7', () => {
  const seven = paletteLayout(7, 'presentation')
  assert.deepEqual(seven.map((row) => row.map((c) => c.i)), [[0, 1, 2], [3, 4, 5, 6]])
  assert.deepEqual(seven.map(units), [4, 4])
  const thirteen = paletteLayout(13, 'presentation')
  assert.deepEqual(thirteen.map((row) => row.map((c) => c.i)), [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11, 12]])
  assert.deepEqual(thirteen.map(units), [7, 7])
})

test('presentation: 7 to 13 colours are always two rows, each colour once, primary span 2 and the rest 1', () => {
  for (let n = 7; n <= 13; n += 1) {
    for (const kinds of [null, kindsOf(2, n - 3), kindsOf(n - 1, 0), kindsOf(0, n - 1)]) {
      const rows = paletteLayout(n, 'presentation', kinds)
      const label = `${n} colours, kinds ${kinds ? `${kinds.filter((k) => k !== 'neutral').length} brand` : 'none'}`
      assert.equal(rows.length, 2, label)
      assert.deepEqual(slotsOf(rows).sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), `${label}: each slot once`)
      assert.ok(rows.every((row) => row.length > 0), `${label}: no empty row`)
      assert.ok(rows.every((row) => units(row) <= 8), `${label}: a row is wider than 8 cell widths`)
      const all = rows.flat()
      assert.equal(all.find((c) => c.i === 0).span, 2, `${label}: primary span`)
      assert.ok(all.filter((c) => c.i !== 0).every((c) => c.span === 1), `${label}: the others take one`)
    }
  }
})

test('presentation: the brand colours take the top row and the neutrals the bottom when both fit', () => {
  const rows = paletteLayout(9, 'presentation', kindsOf(2, 6))
  assert.deepEqual(rows.map((row) => row.map((c) => c.i)), [[0, 1, 2], [3, 4, 5, 6, 7, 8]])
  // The primary leads the brand row even when the tool marked it neutral by mistake.
  assert.deepEqual(paletteLayout(8, 'presentation', ['neutral', 'accent', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral']).map((row) => row.map((c) => c.i)), [[0, 1], [2, 3, 4, 5, 6, 7]])
})

test('presentation: neutrals too many for a row of 8 widths fall back to an even split in slot order', () => {
  const rows = paletteLayout(13, 'presentation', kindsOf(2, 10))
  assert.deepEqual(rows.map((row) => row.map((c) => c.i)), [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11, 12]])
  const brandHeavy = paletteLayout(12, 'presentation', kindsOf(11, 0))
  assert.equal(brandHeavy.length, 2)
  assert.ok(brandHeavy.every((row) => row.length), 'a brand-only palette still fills both rows')
})

test('presentation: kinds that are not an array are ignored, and 0 colours or more than 13 behave', () => {
  const plain = paletteLayout(10, 'presentation')
  for (const kinds of [null, undefined, 'primary', { 0: 'primary' }, 7]) assert.deepEqual(paletteLayout(10, 'presentation', kinds), plain)
  assert.deepEqual(paletteLayout(0, 'presentation'), [])
  assert.equal(slotsOf(paletteLayout(99, 'presentation')).length, 13)
})

test('the other layouts do not read kinds, and the primary spans a full row there', () => {
  for (const template of ['specification', 'monograph', 'atlas']) {
    assert.deepEqual(paletteLayout(9, template, kindsOf(2, 6)), paletteLayout(9, template), template)
  }
  assert.equal(paletteLayout(9, 'specification')[0][0].span, 3)
  assert.equal(paletteLayout(9, 'atlas')[0][0].span, 4)
})
