// The Gradient Generator's angle wheel: the pointer geometry, the keyboard
// steps and the typed-value parsing that sit behind it.
//
// The maths is pure, so it is asserted exactly. The wiring tests read the
// sources, because the rendered wheel (drag, focus ring, 44px target) can only
// be proved in a browser: tests/user-sim covers that.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  angleFromPoint,
  normaliseAngle,
  parseAngleInput,
  snapAngle,
  stepAngle,
} from '../../src/utils/angleWheel.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

test('normaliseAngle wraps into 0-359 and rounds to whole degrees', () => {
  assert.equal(normaliseAngle(0), 0)
  assert.equal(normaliseAngle(359), 359)
  assert.equal(normaliseAngle(360), 0)
  assert.equal(normaliseAngle(361), 1)
  assert.equal(normaliseAngle(-1), 359)
  assert.equal(normaliseAngle(-361), 359)
  assert.equal(normaliseAngle(90.4), 90)
  assert.equal(normaliseAngle(90.6), 91)
  assert.equal(normaliseAngle(359.6), 0)
})

test('normaliseAngle reads anything that is not a number as 0', () => {
  assert.equal(normaliseAngle(NaN), 0)
  assert.equal(normaliseAngle(undefined), 0)
  assert.equal(normaliseAngle('abc'), 0)
  assert.equal(normaliseAngle(Infinity), 0)
})

test('angleFromPoint: 0deg is up and the angle grows clockwise, as in CSS', () => {
  // Screen y grows downward, so "up" is a smaller y.
  assert.equal(angleFromPoint(100, 100, 100, 40), 0)    // up
  assert.equal(angleFromPoint(100, 100, 160, 100), 90)  // right
  assert.equal(angleFromPoint(100, 100, 100, 160), 180) // down
  assert.equal(angleFromPoint(100, 100, 40, 100), 270)  // left
})

test('angleFromPoint: diagonals land on 45, 135, 225 and 315', () => {
  assert.equal(angleFromPoint(0, 0, 10, -10), 45)
  assert.equal(angleFromPoint(0, 0, 10, 10), 135)
  assert.equal(angleFromPoint(0, 0, -10, 10), 225)
  assert.equal(angleFromPoint(0, 0, -10, -10), 315)
})

test('angleFromPoint: just left of straight up wraps to 0, not 360', () => {
  assert.equal(angleFromPoint(0, 0, -0.001, -100), 0)
})

test('angleFromPoint: the exact centre has no direction', () => {
  assert.equal(angleFromPoint(50, 50, 50, 50), null)
})

test('angleFromPoint does not depend on how far the pointer is from the centre', () => {
  assert.equal(angleFromPoint(0, 0, 3, -4), angleFromPoint(0, 0, 300, -400))
})

test('snapAngle snaps to the nearest 15 and wraps at the top', () => {
  assert.equal(snapAngle(7), 0)
  assert.equal(snapAngle(8), 15)
  assert.equal(snapAngle(52), 45)
  assert.equal(snapAngle(53), 60)
  assert.equal(snapAngle(353), 0)
  assert.equal(snapAngle(358), 0)
  assert.equal(snapAngle(100, 45), 90)
})

test('arrow keys move 1 degree: Right/Up clockwise, Left/Down anticlockwise', () => {
  assert.equal(stepAngle(90, 'ArrowRight'), 91)
  assert.equal(stepAngle(90, 'ArrowUp'), 91)
  assert.equal(stepAngle(90, 'ArrowLeft'), 89)
  assert.equal(stepAngle(90, 'ArrowDown'), 89)
})

test('Shift + arrow moves 15 degrees', () => {
  assert.equal(stepAngle(90, 'ArrowRight', true), 105)
  assert.equal(stepAngle(90, 'ArrowUp', true), 105)
  assert.equal(stepAngle(90, 'ArrowLeft', true), 75)
  assert.equal(stepAngle(90, 'ArrowDown', true), 75)
})

test('stepping wraps round the dial instead of sticking at the ends', () => {
  assert.equal(stepAngle(359, 'ArrowRight'), 0)
  assert.equal(stepAngle(0, 'ArrowLeft'), 359)
  assert.equal(stepAngle(350, 'ArrowRight', true), 5)
  assert.equal(stepAngle(5, 'ArrowLeft', true), 350)
})

test('Home, End, PageUp and PageDown', () => {
  assert.equal(stepAngle(200, 'Home'), 0)
  assert.equal(stepAngle(200, 'End'), 359)
  assert.equal(stepAngle(200, 'PageUp'), 215)
  assert.equal(stepAngle(200, 'PageDown'), 185)
})

test('keys the wheel does not own return null so the browser keeps them', () => {
  for (const key of ['Tab', 'Enter', 'Escape', ' ', 'a', '1', 'Delete', 'Backspace']) {
    assert.equal(stepAngle(90, key), null, key)
  }
})

test('stepAngle copes with an out-of-range or fractional current value', () => {
  assert.equal(stepAngle(360, 'ArrowRight'), 1)
  assert.equal(stepAngle(-1, 'ArrowRight'), 0)
  assert.equal(stepAngle(89.6, 'ArrowRight'), 91)
})

test('parseAngleInput reads whole numbers, decimals and a trailing degree sign', () => {
  assert.equal(parseAngleInput('135'), 135)
  assert.equal(parseAngleInput(' 135 '), 135)
  assert.equal(parseAngleInput('135°'), 135)
  assert.equal(parseAngleInput('45.4'), 45)
  assert.equal(parseAngleInput('0'), 0)
})

test('parseAngleInput wraps out-of-range numbers', () => {
  assert.equal(parseAngleInput('360'), 0)
  assert.equal(parseAngleInput('370'), 10)
  assert.equal(parseAngleInput('-10'), 350)
  assert.equal(parseAngleInput('720'), 0)
})

test('parseAngleInput rejects text that is not a plain number', () => {
  for (const bad of ['', ' ', '-', 'abc', '12abc', '1e3', '--5', '1,5', '.', null, undefined]) {
    assert.equal(parseAngleInput(bad), null, String(bad))
  }
})

// ── Wiring ──
test('the wheel is a slider with the 0-359 range, spoken in degrees', () => {
  const src = read('src/components/tool/AngleWheel.jsx')
  assert.match(src, /role="slider"/)
  assert.match(src, /aria-valuemin=\{0\}/)
  assert.match(src, /aria-valuemax=\{359\}/)
  assert.match(src, /aria-valuenow=\{angle\}/)
  assert.match(src, /aria-valuetext=\{`\$\{angle\} degrees`\}/)
  assert.match(src, /tabIndex=\{0\}/)
})

test('the wheel keyboard path goes through stepAngle with the Shift flag', () => {
  const src = read('src/components/tool/AngleWheel.jsx')
  assert.match(src, /stepAngle\(angle, e\.key, e\.shiftKey\)/)
})

test('the Gradient Generator sets its angle with the wheel, behind the Pro guard', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /import AngleWheel from/)
  assert.match(src, /<AngleWheel[\s\S]*?onChange=\{\(v\) => \{ if \(guardEdit\(\)\) setAngle\(v\) \}\}/)
  assert.match(src, /<AngleWheel[\s\S]*?locked=\{editLocked\}/)
  assert.doesNotMatch(src, /<ToolSlider[^>]*label="Angle"/)
})

test('the wheel and its number field keep a 44px floor on touch', () => {
  const css = read('src/styles/pages/gradient.css')
  // The sheet has several coarse-pointer blocks; read all of them, not just the first.
  const coarse = css.split('@media (pointer: coarse)').slice(1).join('\n')
  assert.match(coarse, /\.grd \.grd-wheel \{ width: 64px; height: 64px; \}/)
  assert.match(coarse, /\.grd \.grd-angle-input \{[^}]*height: 44px/)
})

test('the wheel does not use transition: all', () => {
  const css = read('src/styles/pages/gradient.css')
  assert.doesNotMatch(css, /transition:\s*all/)
})
