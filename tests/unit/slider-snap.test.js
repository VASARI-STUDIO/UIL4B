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
// tests/user-sim/17-founder-batch-3.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { snapToTarget } from '../../src/utils/sliderKeys.js'

// Verbatim from ADJUST_FIELDS in PaletteBuilder.jsx.
const TEMP = { min: -100, max: 100, step: 1, snaps: [-50, 0, 50], snapRadius: 6 }
const HUE = { min: -180, max: 180, step: 1, snaps: [-90, 0, 90], snapRadius: 8 }
// Verbatim from TypeScale.jsx — the tightest radius any caller passes.
const BODY_TRACK = { min: -0.03, max: 0.08, step: 0.002, snaps: [-0.01, 0, 0.02], snapRadius: 0.004 }

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
  // One step, within the float noise of subtracting two grid values.
  assert.ok(Math.abs(biggestJump(BODY_TRACK) - 0.002) < 1e-9)
})

test('the pull is exactly zero at the radius, so there is no boundary to cross', () => {
  // This is the continuity property, stated directly: at |raw - snap| == radius
  // the function is the identity, and it stays the identity just outside.
  for (const snap of TEMP.snaps) {
    assert.equal(snapToTarget(snap + 6, TEMP), snap + 6)
    assert.equal(snapToTarget(snap - 6, TEMP), snap - 6)
    assert.equal(snapToTarget(snap + 7, TEMP), snap + 7)
    assert.equal(snapToTarget(snap - 7, TEMP), snap - 7)
  }
  assert.equal(snapToTarget(88, HUE), 89)   // inside the radius — still pulled
  assert.equal(snapToTarget(82, HUE), 82)   // exactly one radius below 90
  assert.equal(snapToTarget(81, HUE), 81)   // outside — untouched
})

test('the values the founder could not reach are reachable', () => {
  // Every one of ±1…±6 used to collapse onto 0. Now the band around a snap
  // spreads across the range instead of erasing it. ±2 is the single value the
  // magnetism still costs at this radius — the price of the snap existing at
  // all, and one step wide rather than six.
  const reached = new Set()
  for (let raw = -8; raw <= 8; raw++) reached.add(snapToTarget(raw, TEMP))
  for (const wanted of [1, 3, 4, 5, 6, -1, -3, -4, -5, -6]) {
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
