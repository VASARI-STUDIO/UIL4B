// The preset groups the colour picker builds from the working design: the
// palette first, then the semantic colours, each listed once and only when it
// holds a colour.
//
// MUTATIONS (each one turns a test below red):
//   the palette is not normalised before it is compared  -> "one colour in two spellings"
//   the semantic group is built from step 400, not 500   -> "semantic colours are the 500 shades"
//   the semantic group is built when states is absent    -> "no saved states, no semantic group"
//   the semantic group is built from untouched defaults  -> "the default states give no semantic group"
//   an empty group is returned                           -> "a group with no colours is left out"
//   palette and semantic swap order                      -> "the palette comes before semantic"
//   exclude is ignored                                   -> "colours the picker shows already are dropped"
//   the accessible names change wording                  -> "accessible names spell the hex in capitals"
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPickerPresets } from '../../src/utils/pickerPresets.js'

const DEFAULT_STATES = { success: 1, warning: 0, error: 0, info: 0 }
// States a person has chosen (a different Success): only these give the group.
const CHOSEN = { success: 0, warning: 0, error: 0, info: 0 }
const byId = (groups, id) => groups.find((g) => g.id === id)

test('an empty palette and no states give no groups', () => {
  assert.deepEqual(buildPickerPresets({ palette: [] }), [])
  assert.deepEqual(buildPickerPresets({}), [])
  assert.deepEqual(buildPickerPresets(), [])
})

test('the palette group lists the palette colours in order', () => {
  const groups = buildPickerPresets({ palette: ['#E4572E', '#17BEBB', '#FFC914'] })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].id, 'palette')
  assert.equal(groups[0].label, 'Your palette')
  assert.deepEqual(groups[0].items.map((i) => i.hex), ['#e4572e', '#17bebb', '#ffc914'])
})

test('accessible names spell the hex in capitals', () => {
  const groups = buildPickerPresets({ palette: ['#e4572e'], states: CHOSEN })
  assert.equal(byId(groups, 'palette').items[0].label, 'Use #E4572E from your palette')
  assert.equal(byId(groups, 'semantic').items[0].label, 'Use Success, #10B981')
})

test('one colour in two spellings is listed once', () => {
  const groups = buildPickerPresets({ palette: ['#E4572E', '#e4572e', 'e4572e', '#E52'] })
  assert.deepEqual(groups[0].items.map((i) => i.hex), ['#e4572e', '#ee5522'])
})

test('values that are not colours are skipped', () => {
  const groups = buildPickerPresets({ palette: [null, undefined, '', 'red', 42, '#00ff00'] })
  assert.deepEqual(groups[0].items.map((i) => i.hex), ['#00ff00'])
})

test('a palette that is not a list is no palette', () => {
  assert.deepEqual(buildPickerPresets({ palette: '#ff0000' }), [])
  assert.deepEqual(buildPickerPresets({ palette: { 0: '#ff0000' } }), [])
})

test('semantic colours are the 500 shades, in role order', () => {
  const groups = buildPickerPresets({ states: CHOSEN })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].id, 'semantic')
  assert.equal(groups[0].label, 'Semantic')
  assert.deepEqual(groups[0].items.map((i) => i.hex), ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'])
  assert.deepEqual(
    groups[0].items.map((i) => i.label),
    ['Use Success, #10B981', 'Use Warning, #F59E0B', 'Use Error, #EF4444', 'Use Information, #3B82F6'],
  )
})

test('semantic colours follow the saved selections', () => {
  // Emerald for success, and the purple family for information.
  const groups = buildPickerPresets({ states: { success: 0, warning: 0, error: 0, info: 0, infoHue: 'purple' } })
  const hexes = groups[0].items.map((i) => i.hex)
  assert.equal(hexes[0], '#10b981')
  assert.equal(hexes[3], '#8b5cf6')
})

test('no saved states, no semantic group', () => {
  assert.equal(byId(buildPickerPresets({ palette: ['#ff0000'] }), 'semantic'), undefined)
  assert.equal(byId(buildPickerPresets({ palette: ['#ff0000'], states: null }), 'semantic'), undefined)
  assert.equal(byId(buildPickerPresets({ palette: ['#ff0000'], states: 'success' }), 'semantic'), undefined)
  assert.equal(byId(buildPickerPresets({ palette: ['#ff0000'], states: [1, 0, 0, 0] }), 'semantic'), undefined)
})

test('the palette comes before semantic', () => {
  const groups = buildPickerPresets({ palette: ['#ff0000'], states: CHOSEN })
  assert.deepEqual(groups.map((g) => g.id), ['palette', 'semantic'])
})

test('a colour in the palette is not repeated under semantic', () => {
  // #10b981 is the Success colour these states choose.
  const groups = buildPickerPresets({ palette: ['#10B981', '#ff0000'], states: CHOSEN })
  assert.deepEqual(byId(groups, 'palette').items.map((i) => i.hex), ['#10b981', '#ff0000'])
  assert.deepEqual(byId(groups, 'semantic').items.map((i) => i.hex), ['#f59e0b', '#ef4444', '#3b82f6'])
})

test('a group with no colours is left out', () => {
  // Every semantic colour is already in the palette.
  const groups = buildPickerPresets({
    palette: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
    states: CHOSEN,
  })
  assert.deepEqual(groups.map((g) => g.id), ['palette'])
})

test('colours the picker shows already are dropped', () => {
  const groups = buildPickerPresets({
    palette: ['#C2410C', '#0f766e'],
    states: CHOSEN,
    exclude: ['#c2410c', '#0F766E', '#ef4444'],
  })
  assert.equal(byId(groups, 'palette'), undefined)
  assert.deepEqual(byId(groups, 'semantic').items.map((i) => i.hex), ['#10b981', '#f59e0b', '#3b82f6'])
})

test('the default states give no semantic group', () => {
  assert.equal(byId(buildPickerPresets({ palette: ['#ff0000'], states: DEFAULT_STATES }), 'semantic'), undefined)
  assert.ok(byId(buildPickerPresets({ palette: ['#ff0000'], states: CHOSEN }), 'semantic'))
})
