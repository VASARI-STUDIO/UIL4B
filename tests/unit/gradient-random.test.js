// The gradient randomiser's weighting and its quality rules.
//
// Random is a two-colour, mostly linear tool. The distributions are asserted by
// sampling the whole roll space on a fine grid (the pickers take the roll as an
// argument), and the colour rules by a seeded run of `rollGradient`, so nothing
// here depends on Math.random and nothing is flaky.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  GRAD_TYPE_WEIGHTS, TWO_STOP_SHARE, MIN_MIDPOINT_CHROMA,
  weightedPick, pickGradientType, pickStopCount, pickHarmony, pickTone,
  mulberry32, rollGradient, radialGatePasses, pickFromPool,
} from '../../src/utils/gradientRandom.js'
import { hexToOklchRaw } from '../../src/components/tool/oklch.js'
import { nextSelection, rangeBetween, modeFor } from '../../src/hooks/useShiftSelect.js'

const GRID = 100000
const rolls = Array.from({ length: GRID }, (_, i) => i / GRID)
const shareOf = (fn, value) => rolls.filter((r) => fn(r) === value).length / GRID
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)

test('type weights are Linear 80, Radial 15, Conic 5, and every type can still appear', () => {
  near(shareOf(pickGradientType, 'Linear'), 0.8, 0.001, 'linear')
  near(shareOf(pickGradientType, 'Radial'), 0.15, 0.001, 'radial')
  near(shareOf(pickGradientType, 'Conic'), 0.05, 0.001, 'conic')
  for (const [type] of GRAD_TYPE_WEIGHTS) assert.ok(shareOf(pickGradientType, type) > 0)
})

test('the stop count is only ever 2 or 3, two at 75%', () => {
  near(shareOf(pickStopCount, 2), TWO_STOP_SHARE, 0.001, 'two-stop')
  near(shareOf(pickStopCount, 2) + shareOf(pickStopCount, 3), 1, 1e-9, 'sum')
  near(TWO_STOP_SHARE, 0.75, 1e-9, 'declared share')
})

test('a two-stop linear is 60% of rolls before the quality gate', () => {
  near(shareOf(pickGradientType, 'Linear') * shareOf(pickStopCount, 2), 0.6, 0.001, 'two-stop linear')
})

test('harmony is 60/25/15 and tone is 70/15/15', () => {
  near(shareOf(pickHarmony, 'Analogous'), 0.6, 0.001, 'analogous')
  near(shareOf(pickHarmony, 'Monochrome'), 0.25, 0.001, 'monochrome')
  near(shareOf(pickHarmony, 'Complementary'), 0.15, 0.001, 'complementary')
  near(shareOf(pickTone, 'Clear'), 0.7, 0.001, 'clear')
  near(shareOf(pickTone, 'Muted'), 0.15, 0.001, 'muted')
  near(shareOf(pickTone, 'Deep'), 0.15, 0.001, 'deep')
})

test('weightedPick lands in the right band and never returns undefined', () => {
  const w = [['a', 2], ['b', 1], ['c', 1]]
  assert.equal(weightedPick(w, 0), 'a')
  assert.equal(weightedPick(w, 0.5), 'b')
  assert.equal(weightedPick(w, 0.75), 'c')
  for (const roll of [1, 1.5, -0.2, Number.EPSILON]) assert.ok(weightedPick(w, roll) !== undefined)
})

// ── Seeded runs of the whole roll ────────────────────────────────────────────
const RUNS = 6000
const seeded = Array.from({ length: RUNS }, (_, i) => rollGradient(mulberry32(1000 + i)))
const oklchOf = (hex) => hexToOklchRaw(hex)

test('the default roll is Plain, 2-3 stops, and two-stop linear is the single biggest share', () => {
  assert.ok(seeded.every((g) => g.style === 'Plain'))
  assert.ok(seeded.every((g) => g.stops.length === 2 || g.stops.length === 3))
  const twoLinear = seeded.filter((g) => g.type === 'Linear' && g.stops.length === 2).length / RUNS
  assert.ok(twoLinear >= 0.55, `two-stop linear share ${twoLinear}`)
  const linear = seeded.filter((g) => g.type === 'Linear').length / RUNS
  assert.ok(linear >= 0.8, `linear share ${linear}, the gate can only add to it`)
  const radial = seeded.filter((g) => g.type === 'Radial').length / RUNS
  assert.ok(radial <= 0.15 + 0.02, `radial share ${radial}`)
})

test('no ramp has a grey or muddy midpoint, and every end is in a sensible lightness range', () => {
  for (const g of seeded) {
    if (g.type === 'Conic') continue
    const a = oklchOf(g.stops[0].color)
    const b = oklchOf(g.stops[g.stops.length - 1].color)
    const midChroma = (a[1] + b[1]) / 2
    assert.ok(midChroma >= MIN_MIDPOINT_CHROMA - 0.005, `midpoint chroma ${midChroma} in ${g.stops.map((s) => s.color)}`)
    for (const c of [a, b]) {
      assert.ok(c[0] >= 0.04 && c[0] <= 0.93, `lightness ${c[0]}`)
    }
    // The two ends differ in chroma by at most 0.08 (one does not shout over the other).
    assert.ok(Math.abs(a[1] - b[1]) <= 0.08 + 0.01, `chroma gap ${Math.abs(a[1] - b[1])}`)
  }
})

test('a complementary pair has a real value step', () => {
  for (const g of seeded.filter((x) => x.harmony === 'Complementary' && x.type !== 'Conic')) {
    const a = oklchOf(g.stops[0].color)
    const b = oklchOf(g.stops[g.stops.length - 1].color)
    assert.ok(Math.abs(a[0] - b[0]) >= 0.1, `lightness gap ${Math.abs(a[0] - b[0])}`)
  }
})

test('a conic gradient has three or more stops and closes its seam', () => {
  const conics = seeded.filter((g) => g.type === 'Conic')
  assert.ok(conics.length > 0)
  for (const g of conics) {
    assert.ok(g.stops.length >= 3)
    assert.equal(g.stops[g.stops.length - 1].color, g.stops[0].color)
    assert.equal(g.stops[g.stops.length - 1].position, 100)
  }
})

test('filters: a Radial-only filter is always radial, a Linear+Conic filter never radial, counts follow the filter', () => {
  const only = Array.from({ length: 800 }, (_, i) => rollGradient(mulberry32(i), { types: ['Radial'] }))
  assert.ok(only.every((g) => g.type === 'Radial'))
  const two = Array.from({ length: 800 }, (_, i) => rollGradient(mulberry32(i + 9), { types: ['Linear', 'Conic'] }))
  assert.ok(two.every((g) => g.type === 'Linear' || g.type === 'Conic'))
  assert.ok(two.filter((g) => g.type === 'Conic').length > 200)
  const five = Array.from({ length: 200 }, (_, i) => rollGradient(mulberry32(i + 5), { types: ['Linear'], counts: [5] }))
  assert.ok(five.every((g) => g.stops.length === 5))
})

test('the radial gate accepts a light centre or a dark vignette and rejects a flat pair', () => {
  assert.ok(radialGatePasses({ L: 0.85, C: 0.1 }, { L: 0.6, C: 0.1 }))
  assert.ok(radialGatePasses({ L: 0.3, C: 0.1 }, { L: 0.5, C: 0.1 }))
  assert.ok(!radialGatePasses({ L: 0.6, C: 0.1 }, { L: 0.62, C: 0.1 }))
  assert.ok(!radialGatePasses({ L: 0.85, C: 0.02 }, { L: 0.7, C: 0.02 }), 'a light centre with no colour and a small step')
})

test('the same seed always gives the same gradient', () => {
  assert.deepEqual(rollGradient(mulberry32(42)), rollGradient(mulberry32(42)))
})

test('Shuffle from palette returns the count asked for, from the pool', () => {
  const pool = ['#2F6BFF', '#8B5CF0', '#E0784E', '#3FAFA0']
  for (let i = 0; i < 100; i++) {
    const pick = pickFromPool(pool, 3, mulberry32(i))
    assert.equal(pick.length, 3)
    assert.ok(pick.every((c) => pool.includes(c)))
  }
})

// ── The multi-select rules (useShiftSelect) ──────────────────────────────────
test('a plain press replaces the selection, a toggle adds and removes', () => {
  assert.deepEqual(nextSelection(['Linear'], 'Radial', { mode: 'only', any: 'Any' }), ['Radial'])
  assert.deepEqual(nextSelection(['Linear'], 'Radial', { mode: 'toggle', any: 'Any' }), ['Linear', 'Radial'])
  assert.deepEqual(nextSelection(['Linear', 'Radial'], 'Linear', { mode: 'toggle', any: 'Any' }), ['Radial'])
})

test('Any is exclusive, and an empty set returns to Any (or to Plain for Style)', () => {
  assert.deepEqual(nextSelection(['Linear', 'Radial'], 'Any', { mode: 'toggle', any: 'Any' }), ['Any'])
  assert.deepEqual(nextSelection(['Any'], 'Radial', { mode: 'toggle', any: 'Any' }), ['Radial'])
  assert.deepEqual(nextSelection(['Radial'], 'Radial', { mode: 'toggle', any: 'Any' }), ['Any'])
  assert.deepEqual(nextSelection(['Mesh'], 'Mesh', { mode: 'toggle', any: null, fallback: 'Plain' }), ['Plain'])
})

test('a range runs in position order and a touch press always toggles', () => {
  assert.deepEqual(rangeBetween([3, 0, 2, 1], 0, 1), [0, 2, 1])
  assert.deepEqual(rangeBetween([3, 0, 2, 1], 1, 0), [0, 2, 1])
  assert.equal(modeFor({ shiftKey: false }, true), 'toggle')
  assert.equal(modeFor({ shiftKey: false }, false), 'only')
  assert.equal(modeFor({ metaKey: true }, false), 'toggle')
})

// Wiring: the page rolls through rollGradient, not its own uniform pick.
test('GradientGenerator rolls through the weighted engine', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/GradientGenerator.jsx'), 'utf8')
    .replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.match(src, /rollGradient\(/, 'Random no longer uses the quality engine')
  assert.doesNotMatch(src, /GRAD_TYPES\[Math\.floor\(Math\.random\(\)/)
  assert.doesNotMatch(src, /Math\.random\(\) \* 0xffffff/, 'random hex colours are back')
})
