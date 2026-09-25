// SnapSlider pointer snapping — the discontinuity this suite exists for.
//
// REGRESSION GUARD: snapValue() was a hard step. Inside `snapRadius` it
// returned the snap, outside it returned the raw value, so the output jumped by
// a whole radius the instant the pointer crossed the boundary. On the ±100
// Temperature track (radius 6) the founder saw the readout go 7 → 0 → −7:
// a dead band across the middle of the track, then a seven-unit leap, with
// every value in between unreachable by pointer. #209's doubled TEMP_MAX_PULL
// is what made that leap recolour the whole board in one frame.
//
// The fix weights the snap's influence by (1 - d/r)³ so it fades to nothing AT
// the radius instead of switching off there. These tests assert the properties
// that make it a fix rather than a smaller version of the same bug —
// continuity, monotonicity and magnetism — plus the callers that must not
// change. The rendered proof (a real drag across zero) is in
// tests/user-sim/17-nav-auth-fontpair-temperature.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { snapToTarget } from '../../src/utils/sliderKeys.js'

// Verbatim from ADJUST_FIELDS in PaletteBuilder.jsx. Zero carries a wider
// radius than its neighbours — the centre detent — so these also cover the
// per-point radius form.
const TEMP = {
  min: -100, max: 100, step: 1,
  snaps: [{ value: -50, radius: 6 }, { value: 0, radius: 12 }, { value: 50, radius: 6 }],
}
const HUE = {
  min: -50, max: 50, step: 1,
  snaps: [{ value: -25, radius: 6 }, { value: 0, radius: 8 }, { value: 25, radius: 6 }],
}
// Verbatim from TypeScale.jsx — the tightest radius any caller passes, and the
// bare-number + shared-`snapRadius` form every other call site still uses.
const BODY_TRACK = { min: -0.03, max: 0.08, step: 0.002, snaps: [-0.01, 0, 0.02], snapRadius: 0.004 }
// The pre-detent Palette Builder shape, kept so the shared-radius path stays
// covered after the adjust sliders moved to per-point radii.
const SHARED_RADIUS = { min: -100, max: 100, step: 1, snaps: [-50, 0, 50], snapRadius: 6 }

/** Every value the track can hold, stepped the way the native input steps it. */
function walk({ min, max, step }) {
  const out = []
  for (let i = 0; min + i * step <= max + 1e-9; i++) out.push(Number((min + i * step).toFixed(6)))
  return out
}

function biggestJump(field) {
  let worst = 0
  const values = walk(field)
  for (let i = 1; i < values.length; i++) {
    const jump = Math.abs(snapToTarget(values[i], field) - snapToTarget(values[i - 1], field))
    if (jump > worst) worst = jump
  }
  return worst
}

test('THE BUG: one step of pointer input never moves the value by more than two', () => {
  // The old hard step produced a jump of 7 here (raw 6 → 0, raw 7 → 7) and 8 on
  // the hue track. Nothing about a magnetic snap requires that, and it is what
  // the founder saw. Two is the ceiling the cubic fade allows: one step of
  // input times the peak gain of ~1.25, rounded onto the step grid.
  assert.equal(biggestJump(TEMP), 2)
  assert.equal(biggestJump(HUE), 2)
  assert.equal(biggestJump(SHARED_RADIUS), 2)
  // One step, within the float noise of subtracting two grid values.
  assert.ok(Math.abs(biggestJump(BODY_TRACK) - 0.002) < 1e-9)
})

test('the pull is exactly zero at the radius, so there is no boundary to cross', () => {
  // This is the continuity property, stated directly: at |raw - snap| == radius
  // the function is the identity, and it stays the identity just outside. Each
  // point is checked at ITS OWN radius, which is the whole reason the per-point
  // form exists — 0 reaches twice as far as its neighbours on TEMP.
  for (const { value, radius } of TEMP.snaps) {
    assert.equal(snapToTarget(value + radius, TEMP), value + radius)
    assert.equal(snapToTarget(value - radius, TEMP), value - radius)
    assert.equal(snapToTarget(value + radius + 1, TEMP), value + radius + 1)
    assert.equal(snapToTarget(value - radius - 1, TEMP), value - radius - 1)
  }
  assert.equal(snapToTarget(24, HUE), 25)   // inside the ±25 radius — still pulled
  assert.equal(snapToTarget(19, HUE), 19)   // exactly one radius below 25
  assert.equal(snapToTarget(18, HUE), 18)   // outside — untouched
})

test('EVERY snap can actually capture a pointer one step away', () => {
  // A radius that never locks on is decoration, not magnetism — the ±25 hue
  // marks shipped at radius 4 in the first cut of this batch and did exactly
  // nothing: at one step out the cubic weight is 0.42, which rounds back to
  // where the pointer already was. This asserts the affordance exists at every
  // mark on every adjust track, which is the property that was missing.
  for (const field of [TEMP, HUE]) {
    for (const { value } of field.snaps) {
      assert.equal(snapToTarget(value + 1, field), value, `${value} captures from above`)
      assert.equal(snapToTarget(value - 1, field), value, `${value} captures from below`)
    }
  }
})

test('THE DETENT: zero pulls harder than its neighbours, and only it does', () => {
  // Item 1 of the founder batch: finding "unlensed" again after an experiment
  // needed pixel precision, because 0 was no stickier than any other mark. A
  // pointer two steps out now lands on zero, while the same offset from ±50
  // does not — that asymmetry IS the feature.
  assert.equal(snapToTarget(2, TEMP), 1)
  assert.equal(snapToTarget(1, TEMP), 0)
  assert.equal(snapToTarget(-1, TEMP), 0)
  assert.equal(snapToTarget(8, TEMP), 8)          // still inside 0's radius…
  assert.equal(snapToTarget(11, TEMP), 11)        // …and fading out by 11
  // The neighbours keep the old light touch: 6 out of ±50 is already free.
  assert.equal(snapToTarget(56, TEMP), 56)
  assert.equal(snapToTarget(44, TEMP), 44)
  // Hue's detent is narrower because its track is half the span in units but
  // the same width in pixels.
  assert.equal(snapToTarget(1, HUE), 0)
  assert.equal(snapToTarget(8, HUE), 8)
})

test('a strong snap is not shadowed by a weak one that happens to sit closer', () => {
  // Resolution is by pull, not proximity. 40 is nearer, but 50's radius is wide
  // enough that its pull at this point is the stronger of the two.
  const field = { min: 0, max: 100, step: 1, snaps: [{ value: 40, radius: 4 }, { value: 50, radius: 30 }] }
  assert.equal(snapToTarget(44, field), 47)
})

test('the values the founder could not reach are reachable', () => {
  // Every one of ±1…±6 used to collapse onto 0. Now the band around a snap
  // spreads across the range instead of erasing it. Widening zero's radius to
  // 12 costs exactly one value per side (±7) — the price of the detent, and one
  // step wide rather than six.
  const reached = new Set()
  for (let raw = -14; raw <= 14; raw++) reached.add(snapToTarget(raw, TEMP))
  for (const wanted of [1, 2, 3, 4, 5, 6, 8, 9, 10, -1, -2, -3, -4, -5, -6, -8, -9, -10]) {
    assert.ok(reached.has(wanted), `${wanted} is reachable by pointer`)
  }
})

test('the snap is still magnetic — a pointer just off it lands on it', () => {
  assert.equal(snapToTarget(1, TEMP), 0)
  assert.equal(snapToTarget(-1, TEMP), 0)
  assert.equal(snapToTarget(49, TEMP), 50)
  assert.equal(snapToTarget(51, TEMP), 50)
  assert.equal(snapToTarget(-51, TEMP), -50)
  assert.equal(snapToTarget(0, TEMP), 0)
  // Landing exactly on the snap must return the snap EXACTLY, not a value that
  // merely displays as it — `edited` compares against defaultValue by number,
  // so 0.31 would light the edited dot under a readout that says 0.
  assert.equal(Object.is(snapToTarget(1, TEMP), 0), true)
})

test('the mapping only ever moves forward, so a drag never reverses', () => {
  for (const field of [TEMP, HUE, BODY_TRACK]) {
    const values = walk(field)
    let previous = -Infinity
    for (const raw of values) {
      const snapped = snapToTarget(raw, field)
      assert.ok(snapped >= previous - 1e-9, `monotonic at ${raw} (${snapped} after ${previous})`)
      previous = snapped
    }
  }
})

test('the result lands on the step grid, never between two steps', () => {
  for (const field of [TEMP, HUE, BODY_TRACK]) {
    for (const raw of walk(field)) {
      const snapped = snapToTarget(raw, field)
      const offGrid = Math.abs(Math.round((snapped - field.min) / field.step) - (snapped - field.min) / field.step)
      assert.ok(offGrid < 1e-6, `${snapped} is on the ${field.step} grid`)
    }
  }
})

test('a caller with no snaps is untouched', () => {
  // Most SnapSlider call sites pass no `snaps` at all; magnetism must stay
  // strictly opt-in.
  assert.equal(snapToTarget(37, { min: 0, max: 100, step: 1 }), 37)
  assert.equal(snapToTarget(37, { min: 0, max: 100, step: 1, snaps: [] }), 37)
  // …and a zero or negative radius disables it rather than dividing by zero.
  assert.equal(snapToTarget(37, { min: 0, max: 100, step: 1, snaps: [40], snapRadius: 0 }), 37)
})

test('the default radius is still 6% of the range when no radius is passed', () => {
  // ColorStudio, FileConverter, IconLibrary and TintTool all rely on it.
  const field = { min: 0, max: 100, step: 1, snaps: [50] }
  assert.equal(snapToTarget(50, field), 50)
  assert.equal(snapToTarget(56, field), 56)   // exactly one radius out — identity
  assert.equal(snapToTarget(57, field), 57)   // outside — untouched
  assert.equal(snapToTarget(51, field), 50)   // just inside — magnetic
})

test('the nearest snap wins when two are in range', () => {
  const field = { min: 0, max: 100, step: 1, snaps: [40, 50], snapRadius: 6 }
  assert.equal(snapToTarget(42, field), 41)   // nearer 40 — pulled down
  assert.equal(snapToTarget(48, field), 49)   // nearer 50 — pulled up
  assert.equal(snapToTarget(45, field), 45)   // dead centre — neither wins
})
