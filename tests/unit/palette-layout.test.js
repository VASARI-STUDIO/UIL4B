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
