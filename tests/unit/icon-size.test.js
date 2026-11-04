// Icon export size: the five free presets, the custom range, and what counts as a Pro setting.
//
// What a person relies on:
//   - a fresh customiser exports at 24, and the rail offers 16, 20, 24, 32 and 48;
//   - the custom field takes whole numbers from 8 to 1024 and moves anything else to the nearest end,
//     saying so (`clamped`); empty or non-numeric input is refused so the caller can revert;
//   - on a row too narrow for six cells the 20 cell goes and the other four stay in order;
//   - a typed size equal to a preset IS that preset (so "custom" only means a size the rail has no cell for);
//   - a free or signed-out viewer's committed custom size is a Pro setting; a preset never is; Pro has none.
//
// Every expected value below is written out by hand; none is derived from the module under test.
// HOW TO SEE EACH FAIL (src/utils/iconSize.js):
//   isProSetting returns false for a non-Pro custom size -> "a free viewer's custom size is a Pro setting"
//   DEFAULT_EXPORT_SIZE = 48                              -> "a fresh open exports at 24"
//   railPresets keeps 20 when narrow                       -> "a narrow rail drops the 20 cell"
//   parseCustomSize stops clamping at 1024                 -> "2000 is moved to 1024"
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CUSTOM_SIZE_MAX, CUSTOM_SIZE_MIN, DEFAULT_EXPORT_SIZE, ICON_SIZE_PRESETS,
  isPresetSize, isProSetting, parseCustomSize, railPresets,
} from '../../src/utils/iconSize.js'

test('the five free presets are 16, 20, 24, 32 and 48, in that order', () => {
  assert.deepEqual([...ICON_SIZE_PRESETS], [16, 20, 24, 32, 48])
})

test('the preset list cannot be changed by a caller', () => {
  assert.throws(() => { 'use strict'; ICON_SIZE_PRESETS.push(64) }, TypeError)
  assert.deepEqual([...ICON_SIZE_PRESETS], [16, 20, 24, 32, 48])
})

test('a fresh open exports at 24', () => {
  assert.equal(DEFAULT_EXPORT_SIZE, 24)
  assert.equal(isPresetSize(DEFAULT_EXPORT_SIZE), true, 'the default must be a size the rail has a cell for')
})

test('the custom range is 8 to 1024', () => {
  assert.equal(CUSTOM_SIZE_MIN, 8)
  assert.equal(CUSTOM_SIZE_MAX, 1024)
})

test('isPresetSize is true for the five presets, as numbers or digit strings', () => {
  for (const n of [16, 20, 24, 32, 48]) assert.equal(isPresetSize(n), true, `${n}`)
  for (const s of ['16', '20', '24', '32', '48']) assert.equal(isPresetSize(s), true, `"${s}"`)
})

test('isPresetSize is false for anything else', () => {
  for (const n of [0, 8, 12, 15, 17, 40, 64, 128, 1024, -24, 24.5, NaN]) assert.equal(isPresetSize(n), false, `${n}`)
  for (const v of [undefined, null, '', 'abc']) assert.equal(isPresetSize(v), false, `${String(v)}`)
})

test('railPresets(false) offers all five presets', () => {
  assert.deepEqual([...railPresets(false)], [16, 20, 24, 32, 48])
})

test('a narrow rail drops the 20 cell and keeps the other four in order', () => {
  assert.deepEqual([...railPresets(true)], [16, 24, 32, 48])
})

test('railPresets does not change the shared preset list', () => {
  railPresets(true)
  assert.deepEqual([...ICON_SIZE_PRESETS], [16, 20, 24, 32, 48])
})

test('parseCustomSize reads a plain integer inside the range as it stands', () => {
  assert.deepEqual(parseCustomSize('40'), { value: 40, clamped: false, typed: 40 })
  assert.deepEqual(parseCustomSize('8'), { value: 8, clamped: false, typed: 8 })
  assert.deepEqual(parseCustomSize('1024'), { value: 1024, clamped: false, typed: 1024 })
})

test('parseCustomSize ignores spaces around the digits', () => {
  assert.deepEqual(parseCustomSize('  64 '), { value: 64, clamped: false, typed: 64 })
})

test('2000 is moved to 1024 and flagged as moved', () => {
  assert.deepEqual(parseCustomSize('2000'), { value: 1024, clamped: true, typed: 2000 })
})

test('1025 is moved to 1024, one past the top', () => {
  assert.deepEqual(parseCustomSize('1025'), { value: 1024, clamped: true, typed: 1025 })
})

test('anything under 8 is moved up to 8 and flagged as moved', () => {
  assert.deepEqual(parseCustomSize('7'), { value: 8, clamped: true, typed: 7 })
  assert.deepEqual(parseCustomSize('0'), { value: 8, clamped: true, typed: 0 })
  assert.deepEqual(parseCustomSize('3'), { value: 8, clamped: true, typed: 3 })
})

test('leading zeros read as the number they spell', () => {
  assert.deepEqual(parseCustomSize('007'), { value: 8, clamped: true, typed: 7 })
  assert.deepEqual(parseCustomSize('024'), { value: 24, clamped: false, typed: 24 })
})

test('empty and missing input are refused, so the caller reverts', () => {
  for (const v of ['', '   ', null, undefined]) assert.equal(parseCustomSize(v), null, `${String(v)}`)
})

test('input that is not whole digits is refused rather than guessed at', () => {
  for (const v of ['abc', '12.5', '4e2', '-5', '+5', '1 2', '0x10', '१२']) assert.equal(parseCustomSize(v), null, v)
})

test('a number typed as a number is read like its digits', () => {
  assert.deepEqual(parseCustomSize(40), { value: 40, clamped: false, typed: 40 })
})

test('a typed preset size parses as itself, so the caller can match it to a cell', () => {
  const parsed = parseCustomSize('24')
  assert.equal(parsed.value, 24)
  assert.equal(isPresetSize(parsed.value), true)
})

test('a free viewer\'s custom size is a Pro setting', () => {
  for (const size of [8, 40, 64, 1024]) assert.equal(isProSetting({ size, isPro: false }), true, `${size}`)
})

test('a free viewer\'s preset size is not a Pro setting', () => {
  for (const size of [16, 20, 24, 32, 48]) assert.equal(isProSetting({ size, isPro: false }), false, `${size}`)
})

test('a Pro viewer has no Pro setting, whatever the size', () => {
  for (const size of [8, 16, 24, 40, 1024]) assert.equal(isProSetting({ size, isPro: true }), false, `${size}`)
})

test('an unknown plan is treated as not Pro', () => {
  assert.equal(isProSetting({ size: 40, isPro: undefined }), true)
  assert.equal(isProSetting({ size: 40 }), true)
  assert.equal(isProSetting({ size: 24 }), false)
})
