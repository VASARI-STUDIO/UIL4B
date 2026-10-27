// The Tint Generator and the Palette Builder's swatch tints (the five-bar strip
// and the Tints popover) draw ONE ramp, from src/utils/tintRamp.js. They used to
// be three: HCT at fixed tones in the builder (a dark swatch got no darker tints
// and the light end clamped to neon), OKLCH in the generator, and HSL in the
// saved project tints.
//
// The expected hexes below are the Tint Generator's own output, taken by running
// its buildRamp as it stood in TintTool.jsx BEFORE it moved into the util. They
// are literals on purpose: deriving them from the function under test would pass
// whatever the function did.
//
// The builder is a .jsx page Node cannot import, so "the strip uses that same
// function" is asserted two ways: by output (swatchStripHexes is the named steps
// of tintRampForHex) and by source (PaletteBuilder.jsx and TintTool.jsx import
// from utils/tintRamp, and neither carries its own ramp or the old tonalRamp).
//
// MUTATION (each watched red, then restored byte-exact):
//   · `0.97` -> `0.96` in buildRamp's lightness           -> 11 of 18 red (pinned hexes, strip, light end).
//   · the chroma taper `* 0.9` -> `* 0.0` (no taper)        -> 13 of 18 red.
//   · STRIP_LABELS '500' -> '600'                           -> 5 red (four strip tests, light-to-dark).
//   · PaletteBuilder.jsx calling a local ramp instead of
//     swatchStripHexes / tintRampForHex                     -> the PaletteBuilder source test is red,
//                                                              for the strip and the popover call alike.
//   · TintTool.jsx given its own `function buildRamp`       -> the TintTool source test is red.
import test from 'node:test'
import assert from 'node:assert/strict'

import { STRIP_LABELS, TINT_LABELS, swatchStripHexes, tintRampForHex } from '../../src/utils/tintRamp.js'
import { read, stripComments } from './helpers/source-text.js'

// The 11-step Even ramp (labels 50..950) for each hex, from the old buildRamp.
const OLD_11 = {
  '#249EAF': ['#C9FFFF', '#A8E8F1', '#86D0DB', '#63B9C4', '#3CA2AE', '#008B99', '#00727F', '#005A65', '#00444D', '#002E36', '#001A20'],
  '#14224A': ['#E8F5FF', '#CDDBFE', '#B2C2E9', '#98A9D4', '#7E90BF', '#6679AA', '#52628E', '#3F4D72', '#2C3858', '#1B253F', '#0B1227'],
  '#F2C14E': ['#FFF3B0', '#F6D98A', '#E0BF62', '#CAA534', '#B48C00', '#9F7300', '#845D00', '#6A4800', '#513400', '#392000', '#230F00'],
  '#2563EB': ['#CCF4FF', '#ACDAFF', '#8DBFFF', '#6EA4FF', '#5188FF', '#346BFB', '#2556D5', '#1840B0', '#0B2C8C', '#02186A', '#000349'],
}
// Other step counts and curves, to pin buildRamp's three curves too.
const OLD_OTHER = [
  ['#249EAF', 9, 0, ['#C9FFFF', '#9FE2EC', '#75C5D0', '#46A7B4', '#008B99', '#006C78', '#004F59', '#00333C', '#001A20']],
  ['#14224A', 13, 1, ['#E8F5FF', '#E2F0FF', '#D4E3FF', '#BECFF9', '#A3B5E2', '#8597C7', '#6679AA', '#4B5C87', '#344268', '#212D4E', '#141E3A', '#0D152D', '#0B1227']],
  ['#2563EB', 11, 2, ['#CCF4FF', '#99C6FF', '#74A4FF', '#5486FC', '#366AEA', '#1A4CDB', '#0E38B6', '#042595', '#011275', '#000057', '#02003B']],
]

for (const [hex, want] of Object.entries(OLD_11)) {
  test(`the shared ramp for ${hex} is the Tint Generator's, step for step`, () => {
    const ramp = tintRampForHex(hex)
    assert.deepEqual(ramp.map((r) => r.label), TINT_LABELS[11])
    assert.deepEqual(ramp.map((r) => r.hex), want)
  })
}

for (const [hex, steps, curve, want] of OLD_OTHER) {
  test(`the shared ramp for ${hex} at ${steps} steps, curve ${curve}, is unchanged`, () => {
    assert.deepEqual(tintRampForHex(hex, steps, curve).map((r) => r.hex), want)
  })
}

for (const hex of Object.keys(OLD_11)) {
  test(`the swatch strip for ${hex} is five named steps of that same ramp`, () => {
    const full = tintRampForHex(hex)
    const strip = swatchStripHexes(hex)
    assert.equal(strip.length, 5)
    assert.deepEqual(STRIP_LABELS, ['100', '300', '500', '700', '900'])
    assert.deepEqual(strip, STRIP_LABELS.map((l) => full.find((r) => r.label === l).hex))
    assert.deepEqual(strip, STRIP_LABELS.map((l) => OLD_11[hex][TINT_LABELS[11].indexOf(l)]))
  })
}

test('a strip runs light to dark, with the middle step in the middle', () => {
  const lightness = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  for (const hex of Object.keys(OLD_11)) {
    const strip = swatchStripHexes(hex).map(lightness)
    for (let i = 1; i < strip.length; i++) assert.ok(strip[i] < strip[i - 1], `${hex}: step ${i} is darker than step ${i - 1}`)
  }
  assert.equal(STRIP_LABELS[2], '500')
})

test('the light end is a tint, not the full-chroma neon the HCT ramp clamped to', () => {
  // #249EAF's old builder strip ended on #9CF0FF and its popover on #D2F7FF.
  assert.notEqual(swatchStripHexes('#249EAF')[0], '#9CF0FF')
  assert.equal(tintRampForHex('#249EAF')[0].hex, '#C9FFFF')
})

test('a dark swatch gets darker tints than its strip alone shows', () => {
  // The popover's 950 is darker than the swatch; the old builder ramp had none.
  const popover = tintRampForHex('#14224A').map((r) => r.hex)
  assert.equal(popover.at(-1), '#0B1227')
})

test('not-a-hex input does not produce NaN colours', () => {
  const strip = swatchStripHexes('nope')
  assert.equal(strip.length, 5)
  for (const h of strip) assert.ok(!/NaN/.test(h), h)
})

test('PaletteBuilder.jsx takes both its ramps from utils/tintRamp, not a ramp of its own', () => {
  const src = stripComments(read('src/pages/PaletteBuilder.jsx'))
  assert.match(src, /import \{[^}]*\bswatchStripHexes\b[^}]*\} from '\.\.\/utils\/tintRamp'/)
  assert.match(src, /import \{[^}]*\btintRampForHex\b[^}]*\} from '\.\.\/utils\/tintRamp'/)
  assert.match(src, /ramp: swatchStripHexes\(c\)/, 'the strip is built by the shared function')
  assert.match(src, /tintRampForHex\(adjusted\[i\]\)/, 'the Tints popover is built by the shared function')
  assert.ok(!/tonalRamp|TINT_TONES/.test(src), 'the HCT ramp and its T-labels are gone from the builder')
})

test('TintTool.jsx imports buildRamp from the util and does not define one', () => {
  const src = stripComments(read('src/pages/TintTool.jsx'))
  assert.match(src, /import \{ buildRamp \} from '\.\.\/utils\/tintRamp'/)
  assert.ok(!/function buildRamp/.test(src), 'no second buildRamp in the page')
})

test('the HCT tonalRamp is gone from colors.js (no caller was left)', () => {
  assert.ok(!/export function tonalRamp/.test(stripComments(read('src/utils/colors.js'))))
})
