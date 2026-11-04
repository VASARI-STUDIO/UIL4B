// Warmer and Cooler in the Palette Builder's Suggest panel.
//
// Founder-reported bug (2026-10-31): on a teal palette, Warmer turned teal into
// green and periwinkle. The old recipe pulled each hue 22% of the way to the pole
// along the short arc, so a hue 165° away moved 36° and left its family.
//
// What is asserted here are PROPERTIES of the shift, measured in HCT hue (the
// space the engine works in), not hexes typed from a run: a hex in a test is a
// second copy of the output that goes stale the first time the maths is tuned.
//   • the step is bounded (NUDGE_MAX_DEG), so no colour changes family;
//   • teal stays teal-ish: warmer, never into green;
//   • a hue already near the pole barely moves;
//   • Cooler is the mirror of Warmer;
//   • the step fades out toward the opposite pole, so neighbours there do not
//     get sent opposite ways.
// Wiring (the rows in the panel) is a browser test's job, not this file's.

import test from 'node:test'
import assert from 'node:assert/strict'
import { hexToHct } from '../../src/utils/colors.js'
import { NUDGE_MAX_DEG, nudgeHue, paletteVariations } from '../../src/utils/paletteVariations.js'

const WARM = 30
const COOL = 210

const TEAL = ['#0F766E', '#14B8A6', '#5EEAD4', '#134E4A', '#F0FDFA']
const BLUE = ['#1D4ED8', '#3B82F6', '#93C5FD', '#1E3A8A', '#EFF6FF']
const RED = ['#B91C1C', '#EF4444', '#FCA5A5', '#7F1D1D', '#FEF2F2']
const ORANGE = ['#C2410C', '#F97316', '#FDBA74', '#7C2D12', '#FFF7ED']
const GREEN = ['#15803D', '#22C55E', '#86EFAC', '#14532D', '#F0FDF4']

// Signed shortest hue difference b - a, in -180..180.
const delta = (a, b) => ((b - a + 540) % 360) - 180
const hue = hex => hexToHct(hex)[0]
const variation = (hexes, id) => paletteVariations(hexes).find(v => v.id === id)

// Per-colour hue movement, skipping near-greys where HCT hue is meaningless.
function moves(base, id) {
  const v = variation(base, id)
  assert.ok(v, `${id} should be offered for this palette`)
  return base.map((hex, i) => ({
    from: hue(hex),
    to: hue(v.colors[i]),
    chroma: hexToHct(hex)[1],
  })).filter(m => m.chroma > 10)
}

test('nudgeHue never moves a hue by more than NUDGE_MAX_DEG', () => {
  for (const pole of [WARM, COOL]) {
    for (let h = 0; h < 360; h += 1) {
      const moved = Math.abs(delta(h, nudgeHue(h, pole)))
      assert.ok(moved <= NUDGE_MAX_DEG + 1e-9, `h=${h} pole=${pole} moved ${moved}`)
    }
  }
})

test('nudgeHue always moves toward the pole, never past it', () => {
  for (const pole of [WARM, COOL]) {
    for (let h = 0; h < 360; h += 1) {
      const before = Math.abs(delta(h, pole))
      const after = Math.abs(delta(nudgeHue(h, pole), pole))
      assert.ok(after <= before + 1e-9, `h=${h} pole=${pole}: ${before} -> ${after}`)
    }
  }
})

test('nudgeHue: a hue near the pole barely moves, a hue on the pole does not move', () => {
  assert.equal(nudgeHue(WARM, WARM), WARM)
  assert.ok(Math.abs(delta(25, nudgeHue(25, WARM))) <= 2, 'a red 5° from amber stays put')
  assert.ok(Math.abs(delta(40, nudgeHue(40, WARM))) <= 4, 'an orange 10° from amber stays put')
  assert.equal(nudgeHue(COOL, COOL), COOL)
})

test('nudgeHue fades out toward the opposite pole instead of flipping hard', () => {
  // Either side of the antipode of the warm pole the step shrinks to zero, so the
  // two sides meet instead of being sent opposite ways by 12° each.
  const justBefore = nudgeHue(COOL - 1, WARM)
  const justAfter = nudgeHue(COOL + 1, WARM)
  assert.ok(Math.abs(delta(justBefore, justAfter)) <= 4, `${justBefore} vs ${justAfter}`)
  assert.equal(nudgeHue(COOL, WARM), COOL)
})

test('Warmer on a teal palette keeps every colour teal-ish and never reaches green', () => {
  const list = moves(TEAL, 'warmer')
  assert.ok(list.length >= 4, 'the teal palette has chromatic colours to measure')
  for (const m of list) {
    // Warmer: the hue moves toward amber (down from teal at ~188°) ...
    assert.ok(delta(m.from, m.to) < 0, `teal ${m.from} -> ${m.to} should get warmer`)
    // ... but by a bounded step, and not into HCT green (~140-165°).
    assert.ok(Math.abs(delta(m.from, m.to)) <= NUDGE_MAX_DEG + 1, `moved too far: ${m.from} -> ${m.to}`)
    assert.ok(m.to > 168, `teal ${m.from} must stay out of green, got ${m.to}`)
  }
})

test('Cooler on a teal palette moves toward azure and stays in family', () => {
  for (const m of moves(TEAL, 'cooler')) {
    assert.ok(delta(m.from, m.to) > 0, `teal ${m.from} -> ${m.to} should get cooler`)
    assert.ok(Math.abs(delta(m.from, m.to)) <= NUDGE_MAX_DEG + 1)
  }
})

test('Warmer on a blue palette does not carry it into violet', () => {
  for (const m of moves(BLUE, 'warmer')) {
    assert.ok(Math.abs(delta(m.from, m.to)) <= NUDGE_MAX_DEG + 1, `blue ${m.from} -> ${m.to}`)
  }
})

test('Warmer barely moves reds and oranges', () => {
  for (const base of [RED, ORANGE]) {
    // Judged on the swatches within 20° of amber (the ones a person would call
    // red or orange); the step there is 30% of the distance, so 6° at the very
    // most. An amber-yellow swatch further out may move more, and should.
    const near = moves(base, 'warmer').filter(x => Math.abs(delta(x.from, WARM)) <= 20)
    assert.ok(near.length >= 2, 'the palette has reds or oranges to measure')
    for (const m of near) {
      assert.ok(Math.abs(delta(m.from, m.to)) <= 6, `${m.from} -> ${m.to} should barely move`)
    }
  }
})

test('Warmer on a green palette stays green and Cooler stays green', () => {
  for (const id of ['warmer', 'cooler']) {
    for (const m of moves(GREEN, id)) {
      assert.ok(m.to > 120 && m.to < 190, `${id}: green ${m.from} -> ${m.to}`)
    }
  }
})

test('Warmer and Cooler are offered, in their fixed Temperature slots, and change the palette', () => {
  const list = paletteVariations(TEAL)
  const warmer = list.find(v => v.id === 'warmer')
  const cooler = list.find(v => v.id === 'cooler')
  assert.ok(warmer && cooler)
  assert.equal(warmer.group, 'Temperature')
  assert.equal(cooler.group, 'Temperature')
  assert.notDeepEqual(warmer.colors, TEAL.map(h => h.toUpperCase()))
  assert.notDeepEqual(cooler.colors, warmer.colors)
})
