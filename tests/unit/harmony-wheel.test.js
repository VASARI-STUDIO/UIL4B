// The System menu's wheel icons: the hue offsets they draw must be the ones the
// generators produce, and the wheel must place one dot per offset.
//
// Each test names the code to break to see it fail (MUTATION lines).
import test from 'node:test'
import assert from 'node:assert/strict'
import { HARMONY_OFFSETS, autoTonalFromSeed, generateHarmony, hexToHct, hexToHsl, hslToHex } from '../../src/utils/colors.js'

const wrap = deg => ((deg % 360) + 360) % 360
// Shortest signed distance between two hues, in degrees.
const gap = (a, b) => Math.abs(((wrap(a) - wrap(b) + 540) % 360) - 180)
const sorted = list => [...list].sort((a, b) => a - b)

// A saturated, mid-light seed: hue rounding in hslToHex stays well under 2 degrees.
const SEED = hslToHex(225, 60, 50)

// A generated colour is "full strength" when it keeps the seed's saturation and
// lightness; the tinted and shaded variants beside it move one of the two.
const fullStrength = (seed, colours) => {
  const [h, s, l] = hexToHsl(seed)
  return colours.map(hexToHsl).filter(([, cs, cl]) => Math.abs(cs - s) <= 3 && Math.abs(cl - l) <= 3).map(([ch]) => ch - h)
}

// MUTATION: change one offset in HARMONY_OFFSETS (colors.js), or one `h + 150` in generateHarmony.
test('each hue system\'s offsets are the hues generateHarmony gives at full strength', () => {
  for (const type of Object.keys(HARMONY_OFFSETS).filter(id => id !== 'auto')) {
    const found = fullStrength(SEED, generateHarmony(SEED, type))
    const want = HARMONY_OFFSETS[type]
    assert.equal(found.length, want.length, `${type}: ${found.length} full-strength colours, table has ${want.length}`)
    for (const offset of want) {
      assert.ok(found.some(f => gap(f, offset) <= 3), `${type}: no generated hue near ${offset} (got ${found.map(Math.round)})`)
    }
  }
})

// MUTATION: change `h + 30` for the sibling in autoTonalFromSeed (even to `h + 35`), or the auto row of HARMONY_OFFSETS.
// The engine lands within 1 degree of +30 across the wheel, so 2 degrees is room for rounding and no more.
test('auto puts its second hue where the tonal engine puts it', () => {
  assert.deepEqual(HARMONY_OFFSETS.auto, [0, 30])
  for (const seed of [SEED, hslToHex(0, 60, 50), hslToHex(150, 80, 40), hslToHex(330, 30, 60)]) {
    const [seedHue] = hexToHct(seed)
    const second = hexToHct(autoTonalFromSeed(seed)[1])[0]
    assert.ok(gap(second - seedHue, HARMONY_OFFSETS.auto[1]) <= 2, `${seed}: second hue is ${wrap(second - seedHue).toFixed(1)} degrees on`)
  }
})

// MUTATION: drop a system from HARMONY_OFFSETS.
test('every system the menu lists has offsets, led by the base at 0', () => {
  for (const id of ['auto', 'monochromatic', 'analogous', 'complement', 'triadic', 'split', 'tetradic', 'custom']) {
    assert.ok(HARMONY_OFFSETS[id], `${id} has offsets`)
    assert.equal(HARMONY_OFFSETS[id][0], 0, `${id} starts at the base`)
  }
  assert.deepEqual(sorted(HARMONY_OFFSETS.triadic), [0, 120, 240])
  assert.deepEqual(sorted(HARMONY_OFFSETS.tetradic), [0, 90, 180, 270])
})
