// The gradient style engine (src/utils/gradientStyles.js): T19 structure,
// T20 two-colour-led, T24 grain amount.
//
// T19's browser half, asking CSS.supports about every family's CSS, runs on the
// dev board (/dev/gradient-poc, "CSS.supports self-check"). Node has no
// CSS.supports, so this half pins what can be pinned without a browser: no
// url(), balanced brackets, no NaN, the same design always the same string, and
// exactly which designs have an SVG.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STYLES, STEP_SHAPES, applyGrain, hexToOk, hueDistance, recipe, toCss, toSvg,
} from '../../src/utils/gradientStyles.js'
import { rollDesign } from '../../src/utils/gradientHarmony.js'

const SEEDS = 200
const design = (style, seed) => rollDesign(style, seed)
const build = (d) => recipe(d.style, d.stops, d.params, d.seed)

test('T19: every family, 200 seeded designs: CSS is structurally sound and repeatable', () => {
  for (const style of STYLES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const d = design(style, seed)
      const css = toCss(build(d))
      assert.ok(css.length > 0, `${style} ${seed}: empty CSS`)
      assert.ok(!css.includes('url('), `${style} ${seed}: url() in CSS`)
      assert.ok(!/NaN|undefined|Infinity/.test(css), `${style} ${seed}: bad number in CSS`)
      let depth = 0
      for (const ch of css) {
        depth += ch === '(' ? 1 : ch === ')' ? -1 : 0
        assert.ok(depth >= 0, `${style} ${seed}: brackets close before they open`)
      }
      assert.equal(depth, 0, `${style} ${seed}: unbalanced brackets`)
      assert.ok(/^(repeating-)?(linear|radial|conic)-gradient\(/.test(css), `${style} ${seed}: does not start with a gradient`)
      assert.equal(toCss(build(d)), css, `${style} ${seed}: not repeatable`)
    }
  }
})

test('T19: toSvg is null for exactly Plain Conic, Beams and Curtains', () => {
  for (const style of STYLES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const d = design(style, seed)
      const none = (style === 'plain' && d.params.type === 'Conic') || style === 'beams' || style === 'curtains'
      const svg = toSvg(build(d))
      if (none) assert.equal(svg, null, `${style} ${seed} should have no SVG`)
      else assert.ok(typeof svg === 'string' && svg.startsWith('<svg'), `${style} ${seed} should have an SVG`)
    }
  }
  for (const shape of STEP_SHAPES) {
    const svg = toSvg(recipe('steps', ['#e98724', '#201810'], { shape, steps: 10 }, 1))
    assert.ok(svg && svg.includes('<path'), `Steps ${shape} should have an SVG`)
  }
})

// Every colour a layer paints, as hex.
function layerColours(rec) {
  const out = []
  for (const l of [...rec.layers, ...(rec.soft ? [rec.soft.under, ...rec.soft.layers] : [])]) for (const s of l.stops) out.push(s[0])
  if (rec.steps) out.push(...rec.steps.shapes.map((s) => s.fill), rec.steps.ground)
  return [...new Set(out)]
}

test('T20: two-colour-led: no colour a family paints sits off its stops\' hues', () => {
  let checked = 0
  for (const style of STYLES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const d = design(style, seed)
      if (d.stops.length !== 2) continue
      const [a, b] = d.stops.map(hexToOk)
      if (a.C < 0.04 || b.C < 0.04) continue
      for (const hex of layerColours(build(d))) {
        const c = hexToOk(hex)
        if (c.C < 0.04) continue
        const near = Math.min(hueDistance(c.H, a.H), hueDistance(c.H, b.H))
        // Steps reads between the stops, so its colours may sit anywhere on
        // the short hue path from one stop to the other (the OKLCH ramp).
        const onPath = hueDistance(c.H, a.H) + hueDistance(c.H, b.H) <= hueDistance(a.H, b.H) + 2
        assert.ok(near <= 15 + 1.5 || (style === 'steps' && onPath), `${style} ${seed}: ${hex} is ${near.toFixed(1)} degrees from both stops`)
        checked++
      }
    }
  }
  assert.ok(checked > 1000, `only ${checked} colours checked`)
})

test('T24: Film grain 4.5% on flat #808080 gives a luminance spread of 11.5 +-1.5 of 255', () => {
  const w = 512
  const h = 512
  const px = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < px.length; i += 4) { px[i] = px[i + 1] = px[i + 2] = 0x80; px[i + 3] = 255 }
  applyGrain(px, w, h, 0.045, { scale: 0.5 })
  const lum = []
  for (let i = 0; i < px.length; i += 4) lum.push(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2])
  const mean = lum.reduce((x, y) => x + y, 0) / lum.length
  const sd = Math.sqrt(lum.reduce((x, y) => x + (y - mean) ** 2, 0) / lum.length)
  assert.ok(Math.abs(sd - 11.5) <= 1.5, `spread ${sd.toFixed(2)}`)
})
