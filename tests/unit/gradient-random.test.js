// The gradient randomiser's weighting.
//
// Founder request (2026-08-08): a two-stop LINEAR gradient should come up
// slightly more often than the rest — a WEIGHTING, NOT AN EXCLUSION. Both
// halves of that sentence are asserted below, because the easy way to satisfy
// the first half is to break the second.
//
// The rendered proof that the tool actually calls these — that pressing Random
// still produces every type, and produces linear most often — is in
// tests/user-sim/30-founder-requests-0808.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
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
