// The gradient randomiser's weighting.
//
// Founder request (2026-08-08): a two-stop LINEAR gradient should come up
// slightly more often than the rest — a WEIGHTING, NOT AN EXCLUSION. Both
// halves of that sentence are asserted below, because the easy way to satisfy
// the first half is to break the second.
//
// The rendered proof that the tool actually calls these — that pressing Random
// still produces every type, and produces linear most often — is in
// tests/user-sim/30-gradient-random-nav-search.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  GRAD_TYPE_WEIGHTS,
  TWO_STOP_SHARE,
  weightedPick,
  pickGradientType,
  pickStopCount,
} from '../../src/utils/gradientRandom.js'

// Sample the whole roll space at a fine, deterministic grid rather than calling
// Math.random N times: a statistical test of a random source is a flaky test,
// and the functions take the roll precisely so this can be exact.
const GRID = 100000
const rolls = Array.from({ length: GRID }, (_, i) => i / GRID)

function shareOf(fn, value) {
  return rolls.filter(r => fn(r) === value).length / GRID
}

test('every gradient type still appears — the weighting excludes nothing', () => {
  for (const [type] of GRAD_TYPE_WEIGHTS) {
    assert.ok(shareOf(pickGradientType, type) > 0, `${type} can never be rolled`)
  }
})

test('linear is favoured, at the declared 50%', () => {
  const linear = shareOf(pickGradientType, 'Linear')
  assert.ok(Math.abs(linear - 0.5) < 0.001, `linear share ${linear}`)
  // …and the two it is favoured over split the rest evenly.
  assert.ok(Math.abs(shareOf(pickGradientType, 'Radial') - 0.25) < 0.001)
  assert.ok(Math.abs(shareOf(pickGradientType, 'Conic') - 0.25) < 0.001)
})

test('the stop count is only ever 2 or 3, and 2 is favoured', () => {
  const two = shareOf(pickStopCount, 2)
  const three = shareOf(pickStopCount, 3)
  assert.ok(Math.abs(two - TWO_STOP_SHARE) < 0.001, `two-stop share ${two}`)
  assert.ok(Math.abs(two + three - 1) < 1e-9, 'a roll produced neither 2 nor 3 stops')
  assert.ok(two > three)
})

// The point of the request, stated as the joint distribution it asks for.
test('a two-stop linear is the single most likely outcome, without dominating', () => {
  const typeShare = Object.fromEntries(
    GRAD_TYPE_WEIGHTS.map(([t]) => [t, shareOf(pickGradientType, t)]),
  )
  const combos = []
  for (const [type, share] of Object.entries(typeShare)) {
    combos.push({ name: `2-stop ${type}`, p: share * shareOf(pickStopCount, 2) })
    combos.push({ name: `3-stop ${type}`, p: share * shareOf(pickStopCount, 3) })
  }
  combos.sort((a, b) => b.p - a.p)

  assert.equal(combos[0].name, '2-stop Linear')
  // "Slightly more often", not "most of the time": it wins, it stays a minority
  // of all rolls, and nothing else is squeezed out.
  assert.ok(combos[0].p > combos[1].p, 'the favoured combination is not actually favoured')
  assert.ok(combos[0].p < 0.5, `a two-stop linear now happens ${combos[0].p} of the time — that is an exclusion, not a weighting`)
  assert.ok(combos[combos.length - 1].p > 0.05, 'the rarest combination has been squeezed out')
})

// Regression guards on the picker itself. The second one is the reason the
// clamp exists: a roll of exactly 1 walks off the end of the weight list and
// returns undefined, which reaches the UI as a gradient with no type.
test('weightedPick lands in the right band at each boundary', () => {
  const w = [['a', 2], ['b', 1], ['c', 1]]
  assert.equal(weightedPick(w, 0), 'a')
  assert.equal(weightedPick(w, 0.499), 'a')
  assert.equal(weightedPick(w, 0.5), 'b')
  assert.equal(weightedPick(w, 0.749), 'b')
  assert.equal(weightedPick(w, 0.75), 'c')
})

test('weightedPick never returns undefined, whatever it is handed', () => {
  const w = [['a', 2], ['b', 1], ['c', 1]]
  for (const roll of [1, 1.5, -0.2, Number.EPSILON]) {
    assert.ok(weightedPick(w, roll) !== undefined, `roll ${roll} produced no type`)
  }
})

// ── The tool is actually wired to the weighting ──────────────────────────────
//
// The browser spec used to assert "linear comes up most often" over 60 presses
// of Random. CI caught that for what it was: at 50/25/25 the expected counts
// are 30/15/15, it drew 24/24, and the run went red on a tie. Sampling a random
// source is probably-right by construction, and a build gate may not depend on
// "probably".
//
// So the wiring is pinned here instead, deterministically. Between this and the
// distribution tests above, the pair says everything the sampled version was
// trying to: the arithmetic is correct, and the page uses it.
test('GradientGenerator rolls through the weighted pickers, not its own uniform pick', () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/pages/GradientGenerator.jsx'), 'utf8',
  ).replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  assert.match(src, /pickGradientType\(Math\.random\(\)\)/, 'the type is no longer drawn from the weighted picker')
  assert.match(src, /pickStopCount\(Math\.random\(\)\)/, 'the stop count is no longer drawn from the weighted picker')

  // The two shapes it used to have. Either coming back is the weighting being
  // silently reverted while every test above still passes.
  assert.doesNotMatch(src, /GRAD_TYPES\[Math\.floor\(Math\.random\(\)/,
    'the type is being drawn uniformly from GRAD_TYPES again')
  assert.doesNotMatch(src, /2 \+ Math\.floor\(Math\.random\(\) \* 2\)/,
    'the stop count is being drawn uniformly again')
})

// The type toggle in the UI is built from the weights table, so the two cannot
// drift into offering a type the randomiser can never produce (or the reverse).
test('the UI type list and the weights table are the same list', () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/pages/GradientGenerator.jsx'), 'utf8',
  ).replace(/\r\n/g, '\n')
  assert.match(src, /const GRAD_TYPES = GRAD_TYPE_WEIGHTS\.map/,
    'GRAD_TYPES is declared independently again — it can now list a type the randomiser never rolls')
})
