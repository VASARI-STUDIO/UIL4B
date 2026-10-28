// What a colour is CALLED in the project's palette: "Primary 500", "Colour 7 500",
// "Primary 300", or "Custom". The gradient tool's Available colours chips and its
// stop rows both read these names, and the style guide export reads the same role
// list, so the three can never disagree.
//
// The expected names are hand-checked from the spec (handover/specs/
// gradient-tool-overhaul-spec-2026-10-28.md §3.3), not worked out by the code.
//
// MUTATION: make labelFor accept a hex that is merely close to a palette colour
// (round to the nearest) -> the near-miss test goes red. Return a shade label for
// a ramp whose `from` is not the active colour -> the stale-ramp tests go red.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  labelFor, paletteChips, activeShades, roleName, PALETTE_LABELS, SHADE_LABELS, BASE_SHADE,
} from '../../src/utils/paletteRoles.js'
import { tintsCurrent } from '../../src/utils/projectTints.js'

// Thirteen distinct colours, the most the tool shows. Index 6 is the seventh.
const COLOURS = [
  '#2F6BFF', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4', '#D9B93C', '#8B5CF0',
  '#52A069', '#E894AC', '#1B3FA8', '#7A7A7A', '#B0C4DE', '#CD5C5C',
]
// A hand-written ramp for COLOURS[0]: eleven steps, 50 to 950, with the colour
// itself at step 6 (500), which is where the tint engine anchors it.
const RAMP = [
  '#EEF3FF', '#D9E5FF', '#B8CEFF', '#8FB0FF', '#5F8BFF', '#2F6BFF',
  '#2556D1', '#1B41A3', '#142F78', '#0D1E4F', '#071230',
]
const design = (extra = {}) => ({
  palette: { base: COLOURS[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: COLOURS },
  tints: { from: COLOURS[0], scale: RAMP },
  ...extra,
})

// ── The fixture is what the tests say it is ────────────────────────────────

test('the fixture: thirteen distinct colours, an eleven-step ramp anchored on the first', () => {
  assert.equal(new Set(COLOURS).size, 13)
  assert.equal(RAMP.length, 11)
  assert.equal(RAMP[5], COLOURS[0])
  assert.equal(tintsCurrent(design()), true, 'the ramp must count as current or the shade tests prove nothing')
})

// ── Palette colours ────────────────────────────────────────────────────────

test('the first palette colour is "Primary 500"', () => {
  const l = labelFor(COLOURS[0], design())
  assert.equal(l.label, 'Primary 500')
  assert.equal(l.role, 'Primary')
  assert.equal(l.shade, '500')
  assert.equal(l.custom, false)
})

test('the second to sixth palette colours take their role names, each at 500', () => {
  const want = ['Primary 500', 'Secondary 500', 'Accent 500', 'Neutral 500', 'Surface 500', 'Highlight 500']
  assert.deepEqual(COLOURS.slice(0, 6).map((c) => labelFor(c, design()).label), want)
})

test('the seventh palette colour is "Colour 7 500", and the thirteenth "Colour 13 500"', () => {
  assert.equal(labelFor(COLOURS[6], design()).label, 'Colour 7 500')
  assert.equal(labelFor(COLOURS[12], design()).label, 'Colour 13 500')
})

test('a palette colour is named without a ramp at all', () => {
  const d = { palette: design().palette }
  assert.equal(labelFor(COLOURS[1], d).label, 'Secondary 500')
})

test('hex case does not matter', () => {
  assert.equal(labelFor(COLOURS[2].toLowerCase(), design()).label, 'Accent 500')
})

test('a colour repeated in the palette is named for its first place', () => {
  const d = design({ palette: { base: COLOURS[0], activeIdx: 0, colors: ['#2F6BFF', '#E0784E', '#E0784E'] } })
  assert.equal(labelFor('#E0784E', d).label, 'Secondary 500')
})

// ── Shades of the active colour ────────────────────────────────────────────

test('with a current ramp, step 4 (300) reads "Primary 300"', () => {
  assert.equal(labelFor(RAMP[3], design()).label, 'Primary 300')
})

test('with a current ramp, the last step (950) reads "Primary 950", the first "Primary 50"', () => {
  assert.equal(labelFor(RAMP[10], design()).label, 'Primary 950')
  assert.equal(labelFor(RAMP[0], design()).label, 'Primary 50')
})

test('the ramp step that is the palette colour reads 500', () => {
  assert.equal(labelFor(RAMP[5], design()).label, 'Primary 500')
})

test('a ramp made from the third colour names its shades "Accent"', () => {
  const ramp = ['#EAF7F5', '#D2EFEB', '#A9E0D9', '#7FCFC5', '#5BBFB2', '#3FAFA0', '#33897E', '#276A61', '#1B4A44', '#102C29', '#081715']
  const d = {
    palette: { base: COLOURS[2], activeIdx: 2, colors: COLOURS },
    tints: { from: COLOURS[2], scale: ramp },
  }
  assert.equal(labelFor(ramp[3], d).label, 'Accent 300')
})

test('a ramp made from some other colour than the active one gives no shade labels', () => {
  const stale = design({ tints: { from: COLOURS[1], scale: RAMP } })
  assert.equal(tintsCurrent(stale), false)
  assert.equal(labelFor(RAMP[3], stale).label, 'Custom')
  assert.equal(labelFor(RAMP[10], stale).label, 'Custom')
  // The palette colour is still a palette colour.
  assert.equal(labelFor(COLOURS[1], stale).label, 'Secondary 500')
})

test('a ramp that does not record which colour made it gives no shade labels', () => {
  const legacy = design({ tints: { scale: RAMP } })
  assert.equal(labelFor(RAMP[3], legacy).label, 'Custom')
})

test('an empty ramp or no tints at all gives no shade labels', () => {
  assert.equal(labelFor(RAMP[3], design({ tints: { from: COLOURS[0], scale: [] } })).label, 'Custom')
  assert.equal(labelFor(RAMP[3], { palette: design().palette }).label, 'Custom')
})

// ── Custom ─────────────────────────────────────────────────────────────────

test('a hex one step away from a palette colour is "Custom", not rounded to it', () => {
  const l = labelFor('#2F6BFE', design())
  assert.equal(l.label, 'Custom')
  assert.equal(l.custom, true)
  assert.equal(l.role, null)
  assert.equal(l.shade, null)
})

test('a hex close to a ramp step is "Custom"', () => {
  assert.equal(labelFor('#8FB0FE', design()).label, 'Custom')
})

test('a colour in neither the palette nor the ramp is "Custom"', () => {
  assert.equal(labelFor('#123456', design()).label, 'Custom')
})

test('nothing usable is "Custom", and never throws', () => {
  for (const hex of ['', null, undefined, 'red', '#FFF', '#12345', '#1234567', '2F6BFF']) {
    assert.equal(labelFor(hex, design()).label, 'Custom', `hex ${String(hex)}`)
  }
  for (const d of [undefined, null, {}, { palette: null }, { palette: { colors: 'nope' } }]) {
    assert.equal(labelFor('#2F6BFF', d).label, 'Custom', `design ${JSON.stringify(d)}`)
  }
})

// ── The shared lists ───────────────────────────────────────────────────────

test('SHADE_LABELS holds the eleven steps, 50 to 950, and the base is 500', () => {
  assert.equal(SHADE_LABELS.length, 11)
  assert.deepEqual([...SHADE_LABELS], ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'])
  assert.equal(BASE_SHADE, '500')
})

test('PALETTE_LABELS holds six role names, and roleName numbers the rest', () => {
  assert.deepEqual([...PALETTE_LABELS], ['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface', 'Highlight'])
  assert.equal(roleName(5), 'Highlight')
  assert.equal(roleName(6), 'Colour 7')
})

// ── The chips and the shades line ──────────────────────────────────────────

test('paletteChips: none for no palette, one per colour in order, with its role', () => {
  assert.deepEqual(paletteChips({}), [])
  assert.deepEqual(paletteChips({ palette: { colors: [] } }), [])
  const chips = paletteChips(design())
  assert.equal(chips.length, 13)
  assert.deepEqual(chips.map((c) => c.hex), COLOURS)
  assert.equal(chips[0].label, 'Primary 500')
  assert.equal(chips[6].label, 'Colour 7 500')
})

test('paletteChips drops invalid hexes and repeats, and keeps each colour\'s place in the palette', () => {
  const chips = paletteChips({ palette: { colors: ['#2F6BFF', 'nope', '#2f6bff', '#E0784E', '#FFF'] } })
  assert.deepEqual(chips.map((c) => c.hex), ['#2F6BFF', '#E0784E'])
  // The second chip is the fourth palette entry, so it is "Neutral", not "Secondary":
  // the role is the place in the palette, not the place in the chip row.
  assert.deepEqual(chips.map((c) => c.index), [0, 3])
  assert.equal(chips[1].label, 'Neutral 500')
})

test('activeShades: eleven named shades of the active colour while the ramp is current', () => {
  const s = activeShades(design())
  assert.equal(s.role, 'Primary')
  assert.equal(s.items.length, 11)
  assert.equal(s.items[3].label, 'Primary 300')
  assert.equal(s.items[3].hex, RAMP[3])
  assert.equal(s.items[10].label, 'Primary 950')
})

test('activeShades: nothing for a stale ramp, a ramp with no record, or no ramp', () => {
  assert.equal(activeShades(design({ tints: { from: COLOURS[1], scale: RAMP } })), null)
  assert.equal(activeShades(design({ tints: { scale: RAMP } })), null)
  assert.equal(activeShades({ palette: design().palette }), null)
})
