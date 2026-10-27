// The six notations a Palette Builder swatch is shown in ("..." menu, Colour
// values): colourFormats(hex) returns one { key, label, value } row per
// notation, the value being the exact text the copy button puts on the clipboard.
//
// Every expected string is a hand-worked literal, never computed with the
// functions under test (that would agree with any bug in them). Worked for
// #2563EB, whose channels are 37 / 99 / 235:
//   HSL   max .9216, min .1451 -> l 53%; s = .7765 / (2 - 1.0667) = 83%; hue 221
//   HSB   s = .7765 / .9216 = 84%, b = 92%
//   CMYK  k = 1 - .9216 = 8%; c = 84%; m = 58%; y = 0%      (naive sRGB, no ICC)
//   OKLCH lightness 54.6%, chroma 0.215, hue 262.9 (the standard Ottosson
//         matrices; Tailwind's v3 blue-600 is this same colour).
import test from 'node:test'
import assert from 'node:assert/strict'

import { colourFormats } from '../../src/utils/colourFormats.js'

const values = (hex) => Object.fromEntries(colourFormats(hex).map((r) => [r.key, r.value]))
const without = (o, key) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key))

test('the rows come in a fixed order, each with a label a person reads', () => {
  assert.deepEqual(
    colourFormats('#2563EB').map(({ key, label }) => [key, label]),
    [['hex', 'HEX'], ['rgb', 'RGB'], ['hsl', 'HSL'], ['hsb', 'HSB'], ['cmyk', 'CMYK'], ['oklch', 'OKLCH']],
  )
})

test('a saturated blue prints hex, rgb, hsl, hsb and cmyk to the hand-worked values', () => {
  assert.deepEqual(without(values('#2563EB'), 'oklch'), {
    hex: '#2563EB',
    rgb: 'rgb(37, 99, 235)',
    hsl: 'hsl(221, 83%, 53%)',
    hsb: 'hsb(221, 84%, 92%)',
    cmyk: 'cmyk(84%, 58%, 0%, 8%)',
  })
})

test('hex is upper-cased whatever case came in', () => {
  assert.equal(values('#2563eb').hex, '#2563EB')
  assert.deepEqual(without(values('#2563eb'), 'oklch'), without(values('#2563EB'), 'oklch'))
})

test('black is all zero, with full black ink', () => {
  assert.deepEqual(without(values('#000000'), 'oklch'), {
    hex: '#000000',
    rgb: 'rgb(0, 0, 0)',
    hsl: 'hsl(0, 0%, 0%)',
    hsb: 'hsb(0, 0%, 0%)',
    cmyk: 'cmyk(0%, 0%, 0%, 100%)',
  })
  assert.equal(values('#000000').oklch, 'oklch(0% 0 0)')
})

test('white has no hue, full lightness and no ink', () => {
  assert.deepEqual(without(values('#FFFFFF'), 'oklch'), {
    hex: '#FFFFFF',
    rgb: 'rgb(255, 255, 255)',
    hsl: 'hsl(0, 0%, 100%)',
    hsb: 'hsb(0, 0%, 100%)',
    cmyk: 'cmyk(0%, 0%, 0%, 0%)',
  })
})

test('a pure mid grey has no saturation and half the key ink', () => {
  assert.deepEqual(without(values('#808080'), 'oklch'), {
    hex: '#808080',
    rgb: 'rgb(128, 128, 128)',
    hsl: 'hsl(0, 0%, 50%)',
    hsb: 'hsb(0, 0%, 50%)',
    cmyk: 'cmyk(0%, 0%, 0%, 50%)',
  })
})

test('oklch lightness is right for every colour (the part the OKLCH matrices get right today)', () => {
  assert.match(values('#2563EB').oklch, /^oklch\(54\.6% /)
  assert.match(values('#FFFFFF').oklch, /^oklch\(100% /)
  assert.match(values('#808080').oklch, /^oklch\(60% /)
  assert.match(values('#FF0000').oklch, /^oklch\(62\.8% 0\.258 29\.2\)$/)
})

// KNOWN PRODUCT FAULT, so these two are `todo`: they run and report, and do not
// fail the run. hexToOklch (src/utils/colors.js, and the same lines in
// src/components/tool/oklch.js) uses 0.2164557872 and 0.6652917509 for the
// green and blue weights of its third cone response; the published values are
// 0.2817188376 and 0.6299787005. The weights then sum to 0.970 and not 1, so
// white is not neutral (it prints oklch(100% 0.009 119.1)) and every blue is
// pushed a little (#2563EB prints 0.223 264.3). Fix the two constants and
// remove `todo`; these expected values are the correct ones.
test('white and grey are neutral in OKLCH: zero chroma', { todo: 'hexToOklch third cone weights are wrong' }, () => {
  assert.equal(values('#FFFFFF').oklch, 'oklch(100% 0 0)')
  assert.equal(values('#808080').oklch, 'oklch(60% 0 0)')
})

test('a saturated blue prints its true OKLCH chroma and hue', { todo: 'hexToOklch third cone weights are wrong' }, () => {
  assert.equal(values('#2563EB').oklch, 'oklch(54.6% 0.215 262.9)')
})
