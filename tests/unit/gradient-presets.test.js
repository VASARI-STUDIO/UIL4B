// The Gradient Generator's start-from presets: a small set of ready-to-use
// gradients, mostly linear, drawn in OKLCH so no ramp goes muddy in the middle,
// and none of them a copy of a gradient in the library.
//
// PRESETS lives in the page module (it imports React and CSS), so the data is
// read out of the source text and evaluated on its own.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LIBRARY_GRADIENT_ROWS } from '../../src/data/gradientLibrary.js'
import { hexToOklchRaw, mixOklch } from '../../src/components/tool/oklch.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n')
const src = read('src/pages/GradientGenerator.jsx')
const block = src.slice(src.indexOf('const PRESETS = ['), src.indexOf('\n]\n', src.indexOf('const PRESETS = [')) + 2)
const PRESETS = new Function(`return ${block.replace('const PRESETS = ', '')}`)()

test('there are 8 to 12 presets, each with a name and a use', () => {
  assert.ok(PRESETS.length >= 8 && PRESETS.length <= 12, `got ${PRESETS.length}`)
  for (const p of PRESETS) {
    assert.ok(p.n && p.n.length <= 20, `name: ${p.n}`)
    assert.ok(p.use && p.use.length > 8 && p.use.length <= 32, `use: ${p.use}`)
  }
  assert.equal(new Set(PRESETS.map((p) => p.n)).size, PRESETS.length, 'names must be unique')
})

test('mostly linear, with at least two radial and no conic', () => {
  const count = (t) => PRESETS.filter((p) => p.type === t).length
  assert.ok(count('Linear') > PRESETS.length / 2, 'linear should be the majority')
  assert.ok(count('Radial') >= 2)
  assert.equal(count('Conic'), 0)
})

test('every stop is a six-digit hex, ascending from 0 to 100', () => {
  for (const p of PRESETS) {
    assert.ok(p.stops.length >= 2 && p.stops.length <= 3, p.n)
    assert.equal(p.stops[0].position, 0, p.n)
    assert.equal(p.stops[p.stops.length - 1].position, 100, p.n)
    p.stops.forEach((s, i) => {
      assert.match(s.color, /^#[0-9A-F]{6}$/, `${p.n} stop ${i}`)
      if (i) assert.ok(s.position > p.stops[i - 1].position, `${p.n} positions must ascend`)
    })
  }
})

test('every preset is drawn in OKLCH', () => {
  for (const p of PRESETS) assert.equal(p.space, 'oklch', p.n)
})

test('no ramp goes muddy: the midpoint between two coloured stops keeps its chroma', () => {
  // OKLCH interpolation moves chroma in a straight line, so the midpoint should
  // sit at the average of its two ends. Falling well short of that means the
  // mixed colour left the sRGB gamut and was clipped towards grey. (A floor of
  // "half the smaller end" cannot fail: the average is never below the smaller
  // end.) Measured on the shipped presets the midpoint is 0.97-1.06 of the
  // average; 0.9 leaves room for rounding to a hex.
  for (const p of PRESETS) {
    for (let i = 0; i < p.stops.length - 1; i++) {
      const [, ca] = hexToOklchRaw(p.stops[i].color)
      const [, cb] = hexToOklchRaw(p.stops[i + 1].color)
      if (Math.min(ca, cb) < 0.04) continue // a neutral end has no hue to lose
      const mean = (ca + cb) / 2
      const [, cm] = hexToOklchRaw(mixOklch(p.stops[i].color, p.stops[i + 1].color, 0.5))
      assert.ok(cm >= mean * 0.9, `${p.n}: midpoint chroma ${cm.toFixed(3)} fell below 90% of the ends' average ${mean.toFixed(3)}`)
    }
  }
})

test('the muddy-midpoint check does fire on a clipped ramp', () => {
  // Pure green to pure magenta: both ends are fully chromatic, but their OKLCH
  // midpoint is out of gamut and clips well short of the average chroma.
  const [, ca] = hexToOklchRaw('#00FF00')
  const [, cb] = hexToOklchRaw('#FF00FF')
  const [, cm] = hexToOklchRaw(mixOklch('#00FF00', '#FF00FF', 0.5))
  assert.ok(cm < ((ca + cb) / 2) * 0.9, `expected a clipped midpoint, got ${cm.toFixed(3)} of ${((ca + cb) / 2).toFixed(3)}`)
})

test('no preset repeats a library gradient\'s colours', () => {
  const library = LIBRARY_GRADIENT_ROWS.filter((g) => Array.isArray(g.stops))
  const key = (stops) => stops.map((s) => s.color.toUpperCase()).join('-')
  const taken = new Set(library.map((g) => key(g.stops)))
  for (const p of PRESETS) assert.ok(!taken.has(key(p.stops)), `${p.n} is already in the library`)
})

test('the page applies a preset\'s interpolation space and paints its tile in it', () => {
  assert.match(src, /if \(p\.space\) setSpace\(p\.space\)/)
  assert.match(src, /gradientCssIn\(p\.type, p\.angle, p\.stops, supportsOklchGradients \? p\.space : 'srgb'\)/)
})

test('the first-visit gradient and Reset come from the first preset, not a fixed type', () => {
  assert.match(src, /design\?\.gradient\?\.type \|\| PRESETS\[0\]\.type/)
  assert.match(src, /const reset = useCallback\(\(\) => applyPreset\(PRESETS\[0\]\)/)
})

test('the presets section is not a card, so there is no panel inside a panel', () => {
  const css = read('src/styles/pages/gradient.css')
  const rule = css.match(/\.grd \.grd-presets \{[^}]*\}/)[0]
  assert.doesNotMatch(rule, /border|background/)
  assert.doesNotMatch(css, /transition:\s*all/)
})
