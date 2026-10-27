// The Gradient Generator's start-from presets: twelve ready-to-use
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

test('there are exactly 12 presets, each with a name and a use', () => {
  // 12 divides into whole rows at 6, 4 and 2 columns, so the grid never ends short.
  assert.equal(PRESETS.length, 12)
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

test('the set has range: two-stop ramps, a long hue travel, both value directions, and a radial', () => {
  const lightness = (c) => hexToOklchRaw(c)[0]
  const sorted = (p) => [...p.stops].sort((a, b) => a.position - b.position)
  assert.ok(PRESETS.filter((p) => p.stops.length === 2).length >= 2, 'at least two two-stop ramps')
  assert.ok(PRESETS.some((p) => p.type === 'Radial'), 'a radial')
  assert.ok(PRESETS.some((p) => { const s = sorted(p); return lightness(s[0].color) - lightness(s[s.length - 1].color) > 0.3 }), 'a light-to-dark ramp')
  assert.ok(PRESETS.some((p) => { const s = sorted(p); return lightness(s[s.length - 1].color) - lightness(s[0].color) > 0.3 }), 'a dark-to-light ramp')
  const travel = (p) => {
    const hues = sorted(p).map((s) => hexToOklchRaw(s.color)).filter(([, c]) => c >= 0.04).map(([, , h]) => h)
    let total = 0
    for (let i = 1; i < hues.length; i++) { const d = Math.abs(hues[i] - hues[i - 1]); total += Math.min(d, 360 - d) }
    return total
  }
  assert.ok(PRESETS.some((p) => travel(p) >= 120), 'a ramp that travels 120 degrees or more round the hue wheel')
})

test('no preset vanishes on a light or a dark page: its far end has a visible edge', () => {
  // Sage Paper was near-white on a light page and Carbon near-black on a dark
  // one. A preset that starts near-white must end at a clear mid-light edge, and
  // one that starts near-black must end at a clear mid-tone, so it shows on either.
  for (const p of PRESETS) {
    const s = [...p.stops].sort((a, b) => a.position - b.position)
    const first = hexToOklchRaw(s[0].color)[0]
    const last = hexToOklchRaw(s[s.length - 1].color)[0]
    if (first > 0.9) assert.ok(last <= 0.8, `${p.n}: ends at L ${last.toFixed(2)}, too close to a white page`)
    if (first < 0.3) assert.ok(last >= 0.5, `${p.n}: ends at L ${last.toFixed(2)}, too close to a black page`)
  }
})

test('the soft radials keep a coloured centre, not a near-white lamp', () => {
  for (const n of ['Rose Ember', 'Tidepool']) {
    const p = PRESETS.find((x) => x.n === n)
    assert.equal(p.type, 'Radial')
    assert.ok(hexToOklchRaw(p.stops[0].color)[0] < 0.82, `${n}'s centre is too bright`)
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

test('the starter grid steps 2, 4, 6 columns, which all divide twelve, and holds only the starters', () => {
  const css = read('src/styles/pages/gradient.css')
  assert.doesNotMatch(css, /grd-preset-grid\s*\{[^}]*auto-fill/)
  assert.match(css, /\.grd \.grd-preset-grid,\s*\.grd \.grd-mine-grid \{[^}]*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /min-width: 720px\)[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(css, /min-width: 1200px\)[\s\S]*?repeat\(6, minmax\(0, 1fr\)\)/)
  // The user's own palettes render into a different grid than PRESETS.
  assert.match(src, /<div className="grd-mine-grid">\{palettePresets\.map/)
  assert.match(src, /<div className="grd-preset-grid">\{PRESETS\.map/)
})

test('preset text is 12px or more, and the presets do not transition background-color', () => {
  const css = read('src/styles/pages/gradient.css')
  assert.match(css, /\.grd-preset-meta \{ font-size: 12px;/)
  assert.match(css, /\.grd-tintmenu-hex \{[^}]*font-size: 12px; color: var\(--t1\)/)
  assert.doesNotMatch(css.match(/\.grd \.grd-preset \{[^}]*\}/)[0], /background-color/)
})

test('the presets section is not a card, so there is no panel inside a panel', () => {
  const css = read('src/styles/pages/gradient.css')
  const rule = css.match(/\.grd \.grd-presets \{[^}]*\}/)[0]
  assert.doesNotMatch(rule, /border|background/)
  assert.doesNotMatch(css, /transition:\s*all/)
})
