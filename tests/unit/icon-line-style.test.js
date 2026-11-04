// Icon line style: the three tiles, the two rows, and what counts as a Pro line style.
//
// What a person relies on:
//   - Round (round ends, round corners) is the default and the only free style;
//   - Sharp is square ends with mitred corners, Crisp is flat ends with bevelled corners;
//   - a pair that matches a tile selects it, and a mix no tile draws selects none;
//   - any pair other than round and round is a Pro line style for a viewer who is not Pro, a mix included;
//   - a Pro line style joins the Pro settings that block a free viewer's export, beside a custom size.
//
// Every expected value below is written out by hand; none is derived from the module under test.
// HOW TO SEE EACH FAIL (src/utils/iconLineStyle.js, src/utils/iconSize.js):
//   isProLineStyle only checks the ends          -> "a mix of round ends and sharp corners is Pro"
//   LINE_STYLES sharp gets join 'bevel'          -> "the three tiles pair ends and corners as named"
//   lineStyleOf returns the nearest tile         -> "a mix no tile draws selects no tile"
//   isProSetting stops reading cap and join      -> "a free viewer's Pro line style is a Pro setting"
//   isProSetting returns true for isPro: true    -> "a Pro viewer has no Pro setting, whatever the line style"
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_LINE_CAP, DEFAULT_LINE_JOIN, LINE_CORNERS, LINE_ENDS, LINE_STYLES, isProLineStyle, lineStyleOf,
} from '../../src/utils/iconLineStyle.js'
import { isProSetting } from '../../src/utils/iconSize.js'

test('the three tiles pair ends and corners as named', () => {
  assert.deepEqual(
    LINE_STYLES.map((s) => [s.id, s.name, s.cap, s.join, s.pro]),
    [
      ['round', 'Round', 'round', 'round', false],
      ['sharp', 'Sharp', 'square', 'miter', true],
      ['crisp', 'Crisp', 'butt', 'bevel', true],
    ],
  )
})

test('the rows offer the ends and corners in the order the spec names them', () => {
  assert.deepEqual(LINE_ENDS.map((o) => [o.v, o.name]), [['round', 'Round'], ['square', 'Square'], ['butt', 'Flat']])
  assert.deepEqual(LINE_CORNERS.map((o) => [o.v, o.name]), [['round', 'Round'], ['miter', 'Mitre'], ['bevel', 'Bevel']])
})

test('the default is round ends with round corners', () => {
  assert.equal(DEFAULT_LINE_CAP, 'round')
  assert.equal(DEFAULT_LINE_JOIN, 'round')
})

test('a pair that matches a tile selects it', () => {
  assert.equal(lineStyleOf('round', 'round').id, 'round')
  assert.equal(lineStyleOf('square', 'miter').id, 'sharp')
  assert.equal(lineStyleOf('butt', 'bevel').id, 'crisp')
})

test('a mix no tile draws selects no tile', () => {
  for (const [cap, join] of [['square', 'round'], ['round', 'miter'], ['butt', 'miter'], ['square', 'bevel']]) {
    assert.equal(lineStyleOf(cap, join), null, `${cap} + ${join}`)
  }
})

test('round ends with round corners is the only free line style', () => {
  assert.equal(isProLineStyle('round', 'round'), false)
  assert.equal(isProLineStyle('square', 'miter'), true)
  assert.equal(isProLineStyle('butt', 'bevel'), true)
})

test('a mix of round ends and sharp corners is Pro, and so is the reverse', () => {
  assert.equal(isProLineStyle('round', 'miter'), true)
  assert.equal(isProLineStyle('round', 'bevel'), true)
  assert.equal(isProLineStyle('square', 'round'), true)
  assert.equal(isProLineStyle('butt', 'round'), true)
})

test('missing ends or corners read as the free default', () => {
  assert.equal(isProLineStyle(), false)
  assert.equal(isProLineStyle(undefined, undefined), false)
  assert.equal(isProLineStyle(undefined, 'miter'), true)
})

test('a free viewer\'s Pro line style is a Pro setting, at a preset size', () => {
  assert.equal(isProSetting({ size: 24, isPro: false, cap: 'square', join: 'miter' }), true)
  assert.equal(isProSetting({ size: 24, isPro: false, cap: 'butt', join: 'bevel' }), true)
  assert.equal(isProSetting({ size: 24, isPro: false, cap: 'round', join: 'bevel' }), true)
})

test('a free viewer\'s Round style at a preset size is not a Pro setting', () => {
  assert.equal(isProSetting({ size: 24, isPro: false, cap: 'round', join: 'round' }), false)
  assert.equal(isProSetting({ size: 24, isPro: false }), false)
})

test('a custom size is still a Pro setting under Round', () => {
  assert.equal(isProSetting({ size: 40, isPro: false, cap: 'round', join: 'round' }), true)
})

test('a Pro viewer has no Pro setting, whatever the line style', () => {
  assert.equal(isProSetting({ size: 40, isPro: true, cap: 'butt', join: 'bevel' }), false)
  assert.equal(isProSetting({ size: 24, isPro: true, cap: 'square', join: 'miter' }), false)
})
