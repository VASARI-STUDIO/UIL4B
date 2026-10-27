// The Tint Generator and the Palette Builder's swatch tints (the five-bar strip
// and the Tints popover) draw ONE ramp, from src/utils/tintRamp.js. They used to
// be three: HCT at fixed tones in the builder (a dark swatch got no darker tints
// and the light end clamped to neon), OKLCH in the generator, and HSL in the
// saved project tints.
//
// The expected hexes below are the ramp's own output, pinned as literals on
// purpose: deriving them from the function under test would pass whatever the
// function did. The light steps differ from the ramp's first version in two
// ways: an out-of-gamut step gets its chroma reduced (hue kept) instead of its
// channels clipped, and a near-grey source gives a pure grey ramp. Steps that
// were already in gamut are unchanged.
//
// The hexes come from the published OKLab matrices (Ottosson), so the
// sRGB-to-LMS third row is 0.0883024619, 0.2817188376, 0.6299787005. Each pinned
// step was also checked against a separate OKLab computation (sRGB to XYZ to
// LMS): lightness lands on the ramp curve within 8-bit rounding and the hue stays
// within about a degree of the source.
//
// The builder is a .jsx page Node cannot import, so "the strip uses that same
// function" is asserted two ways: by output (swatchStripHexes is the named steps
// of tintRampForHex) and by source (PaletteBuilder.jsx and TintTool.jsx import
// from utils/tintRamp, and neither carries its own ramp or the old tonalRamp).
//
import test from 'node:test'
import assert from 'node:assert/strict'

import { STRIP_LABELS, TINT_LABELS, swatchStripHexes, tintRampForHex } from '../../src/utils/tintRamp.js'
import { hexToOklchRaw } from '../../src/components/tool/oklch.js'
import { read, stripComments } from './helpers/source-text.js'

// The 11-step Even ramp (labels 50..950) for each hex.
const OLD_11 = {
  '#249EAF': ['#E1FBFF', '#A8E8F3', '#86D0DD', '#64B8C6', '#3DA1B1', '#008A9A', '#00717F', '#005964', '#00424A', '#002C32', '#00181C'],
  '#14224A': ['#F1F5FF', '#CDDBFD', '#B2C2E7', '#97A9D2', '#7E91BD', '#6579A8', '#52638C', '#3E4D71', '#2C3857', '#1B253E', '#0B1327'],
  '#F2C14E': ['#FFF4DD', '#F7D896', '#E0BD72', '#CAA44C', '#B58A19', '#9A7400', '#7E5E00', '#644A00', '#4A3600', '#322300', '#1C1200'],
  '#2563EB': ['#F0F5FF', '#C9DCFF', '#A2C2FF', '#7BA8FF', '#538CFF', '#2F6EF7', '#2158D1', '#1343AC', '#062E89', '#001A67', '#000647'],
}
// Other step counts and curves, to pin buildRamp's three curves too.
const OLD_OTHER = [
  ['#249EAF', 9, 0, ['#E1FBFF', '#A0E2ED', '#75C4D1', '#47A7B6', '#008A9A', '#006B78', '#004D57', '#003138', '#00181C']],
  ['#14224A', 13, 1, ['#F1F5FF', '#EAF1FF', '#D8E4FF', '#BECFF8', '#A3B5E0', '#8598C5', '#6579A8', '#4B5C86', '#344267', '#212D4D', '#141E39', '#0D152C', '#0B1327']],
  ['#2563EB', 11, 2, ['#F0F5FF', '#ACC9FF', '#7AA7FF', '#5288F8', '#336CE6', '#124FD6', '#053BB3', '#002891', '#001A6C', '#00094E', '#000033']],
]

for (const [hex, want] of Object.entries(OLD_11)) {
  test(`the shared ramp for ${hex} is the Tint Generator's, step for step`, () => {
    const ramp = tintRampForHex(hex)
    assert.deepEqual(ramp.map((r) => r.label), TINT_LABELS[11])
    assert.deepEqual(ramp.map((r) => r.hex), want)
  })
}

for (const [hex, steps, curve, want] of OLD_OTHER) {
  test(`the shared ramp for ${hex} at ${steps} steps, curve ${curve}, is pinned`, () => {
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
  assert.equal(tintRampForHex('#249EAF')[0].hex, '#E1FBFF')
})

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

test('white and mid grey give a neutral ramp, not a yellow-green one', () => {
  // These read zero chroma in OKLCH (the old matrix read 0.005-0.009 at hue ~119,
  // which the ramp used to scale up into a cast); the neutral guard stays as a floor.
  for (const hex of ['#FFFFFF', '#808080', '#F5F5F5', '#2B2B2B']) {
    for (const { label, hex: step } of tintRampForHex(hex)) {
      const [r, g, b] = rgbOf(step)
      assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 1, `${hex} step ${label} is ${step}, not grey`)
    }
  }
  assert.deepEqual(tintRampForHex('#808080').map((r) => r.hex), ['#F5F5F5', '#DBDBDB', '#C2C2C2', '#A9A9A9', '#919191', '#7A7A7A', '#646464', '#4E4E4E', '#393939', '#262626', '#141414'])
})

test('a coloured source is not mistaken for a grey', () => {
  // A muted but real colour (chroma ~0.03) keeps its tint through the ramp.
  const [r, g, b] = rgbOf(tintRampForHex('#7A8A8F')[5].hex)
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) > 4)
})

test('an out-of-gamut step is pulled in by chroma, so no step drifts off the source hue', () => {
  // #249EAF's 50 step used to clip G and B to FF and land on #C9FFFF (hue 187
  // against the source's 207). Compare the hue of each step with the source's.
  // Only steps with real chroma count: one 8-bit unit moves a pale step's hue by
  // several degrees when its chroma is under ~0.04, which is rounding, not drift.
  const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180)
  for (const hex of ['#249EAF', '#2563EB', '#F2C14E', '#14224A']) {
    const srcHue = hexToOklchRaw(hex)[2]
    for (const { label, hex: step } of tintRampForHex(hex)) {
      const [, C, H] = hexToOklchRaw(step)
      if (C <= 0.04) continue
      assert.ok(hueGap(H, srcHue) < 10, `${hex} step ${label} (${step}) is at hue ${H.toFixed(1)}, source ${srcHue.toFixed(1)}`)
    }
  }
})

test('no step of #249EAF sits on the sRGB edge with a channel clipped to FF at the light end', () => {
  for (const { label, hex } of tintRampForHex('#249EAF').slice(0, 4)) {
    const [, g, b] = rgbOf(hex)
    assert.ok(!(g === 255 && b === 255), `step ${label} is ${hex}, clipped`)
  }
})

test('a dark swatch gets darker tints than its strip alone shows', () => {
  // The popover's 950 is darker than the swatch; the old builder ramp had none.
  const popover = tintRampForHex('#14224A').map((r) => r.hex)
  assert.equal(popover.at(-1), '#0B1327')
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
  assert.match(src, /import \{[^}]*\bbuildRamp\b[^}]*\} from '\.\.\/utils\/tintRamp'/)
  assert.ok(!/function buildRamp/.test(src), 'no second buildRamp in the page')
})

test('the HCT tonalRamp is gone from colors.js (no caller was left)', () => {
  assert.ok(!/export function tonalRamp/.test(stripComments(read('src/utils/colors.js'))))
})
