// SnapSlider keyboard stepping — the accessibility bug this suite exists for.
//
// REGRESSION GUARD: SnapSlider ran EVERY change event through snapValue(),
// including the ones the browser fires for arrow keys. From a snap point,
// ArrowRight produced `snap + step`, which was inside snapRadius, so it was
// pulled straight back to the snap. A keyboard user could not move the four
// Palette Builder adjust sliders at all — and every other caller that passes
// `snaps` had the same trap.
//
// The fix distinguishes the input MODALITY: pointer drags still snap
// (deliberate, see ADJUST_FIELDS in PaletteBuilder.jsx), keyboard steps are
// computed here, exactly, and never reach the snap function. These tests assert
// the stepping contract itself — the browser-level proof that a keyboard user
// can now move the slider lives in tests/user-sim/16-founder-batch-2.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { SLIDER_KEYS, pageStepFor, stepFromKey } from '../../src/utils/sliderKeys.js'

// The four Palette Builder adjust tracks, verbatim from ADJUST_FIELDS.
const HUE = { min: -180, max: 180, step: 1 }
const PCT = { min: -100, max: 100, step: 1 }

test('a key that is not a slider key is left to the browser', () => {
  for (const key of ['a', 'Enter', 'Tab', 'Escape', ' ', 'Shift']) {
    assert.equal(stepFromKey(key, { ...HUE, value: 0 }), null)
  }
  assert.equal(SLIDER_KEYS.has('ArrowRight'), true)
  assert.equal(SLIDER_KEYS.has('Enter'), false)
})

test('THE BUG: from a snap point an arrow key lands one step off it', () => {
  // 0 is a snap on every adjust track, with a radius of 6–8 track units. The
  // stepper must return exactly 1 — the snap radius is not consulted at all.
  assert.equal(stepFromKey('ArrowRight', { ...HUE, value: 0 }), 1)
  assert.equal(stepFromKey('ArrowLeft', { ...HUE, value: 0 }), -1)
  assert.equal(stepFromKey('ArrowRight', { ...PCT, value: -50 }), -49)
  assert.equal(stepFromKey('ArrowLeft', { ...PCT, value: 50 }), 49)
})

test('repeated arrows walk through the whole snap radius rather than sticking', () => {
  let v = 0
  const walked = []
  for (let i = 0; i < 10; i++) {
    v = stepFromKey('ArrowRight', { ...HUE, value: v })
    walked.push(v)
  }
  assert.deepEqual(walked, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

test('ArrowUp/ArrowDown mirror ArrowRight/ArrowLeft', () => {
  assert.equal(stepFromKey('ArrowUp', { ...HUE, value: 12 }), 13)
  assert.equal(stepFromKey('ArrowDown', { ...HUE, value: 12 }), 11)
})

test('Home and End reach the ends exactly', () => {
  assert.equal(stepFromKey('Home', { ...HUE, value: 42 }), -180)
  assert.equal(stepFromKey('End', { ...HUE, value: 42 }), 180)
  assert.equal(stepFromKey('Home', { ...PCT, value: 0 }), -100)
  assert.equal(stepFromKey('End', { ...PCT, value: 0 }), 100)
})

test('PageUp/PageDown move a tenth of the range, in whole steps', () => {
  assert.equal(pageStepFor(-180, 180, 1), 36)
  assert.equal(pageStepFor(-100, 100, 1), 20)
  assert.equal(stepFromKey('PageUp', { ...HUE, value: 0 }), 36)
  assert.equal(stepFromKey('PageDown', { ...HUE, value: 0 }), -36)
  assert.equal(stepFromKey('PageUp', { ...PCT, value: 0 }), 20)
})

test('a page step is never smaller than one step', () => {
  // A 5-wide range on a step of 1: a tenth rounds to 0, which would be a
  // no-op key. It must fall back to a single step.
  assert.equal(pageStepFor(0, 5, 1), 1)
  assert.equal(stepFromKey('PageUp', { min: 0, max: 5, step: 1, value: 0 }), 1)
})

test('every key clamps to the track, so no key can leave the range', () => {
  assert.equal(stepFromKey('ArrowRight', { ...HUE, value: 180 }), 180)
  assert.equal(stepFromKey('ArrowLeft', { ...HUE, value: -180 }), -180)
  assert.equal(stepFromKey('PageUp', { ...PCT, value: 95 }), 100)
  assert.equal(stepFromKey('PageDown', { ...PCT, value: -95 }), -100)
  // A value parked beyond the track by the type-a-value input still steps
  // back into range rather than further out.
  assert.equal(stepFromKey('ArrowRight', { min: 12, max: 128, step: 1, value: 1024 }), 128)
  assert.equal(stepFromKey('ArrowLeft', { min: 12, max: 128, step: 1, value: 1024 }), 127)
})

test('fractional steps land on the grid without float drift', () => {
  const track = { min: 0, max: 3, step: 0.05 }
  assert.equal(stepFromKey('ArrowRight', { ...track, value: 1.2 }), 1.25)
  assert.equal(stepFromKey('ArrowLeft', { ...track, value: 1.2 }), 1.15)
  // 0.1 + 0.2 is the classic 0.30000000000000004; the readout must not show it.
  assert.equal(stepFromKey('ArrowRight', { min: 0, max: 1, step: 0.2, value: 0.2 }), 0.4)
  assert.equal(stepFromKey('ArrowRight', { min: 0, max: 1, step: 0.1, value: 0.2 }), 0.3)
})

test('an off-grid value lands on the grid the native input would use', () => {
  // A range input sanitises an off-grid value to the nearest multiple of step
  // measured from min — 7 on a step-5 grid is already 5 by the time the user
  // presses a key. Stepping must agree with that, not step from 7.
  assert.equal(stepFromKey('ArrowRight', { min: 0, max: 100, step: 5, value: 7 }), 10)
  assert.equal(stepFromKey('ArrowLeft', { min: 0, max: 100, step: 5, value: 7 }), 0)
  // min is the grid origin, not zero.
  assert.equal(stepFromKey('ArrowRight', { min: 3, max: 100, step: 5, value: 8 }), 13)
  assert.equal(stepFromKey('ArrowLeft', { min: 3, max: 100, step: 5, value: 8 }), 3)
})

test('a missing or unusable value is treated as the track minimum', () => {
  assert.equal(stepFromKey('ArrowRight', { ...HUE, value: undefined }), -179)
  assert.equal(stepFromKey('ArrowRight', { ...HUE, value: 'not a number' }), -179)
})
