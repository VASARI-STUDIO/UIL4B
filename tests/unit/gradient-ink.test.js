// The ink drawn over a gradient in the preview contexts: chosen by worst-case contrast.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pickInk, inkSamples, gradientSpan, regionSamples, INK_DARK, INK_LIGHT, BODY_TEXT_RATIO } from '../../src/utils/gradientInk.js'
import { contrastRatio } from '../../src/utils/colors.js'

const g = (...colors) => colors.map((color, i) => ({ color, position: (i / (colors.length - 1)) * 100 }))

test('a dark gradient gets the light ink and a light one gets the dark ink', () => {
  assert.equal(pickInk(g('#0B1230', '#1B3FA8')).css, INK_LIGHT.css)
  assert.equal(pickInk(g('#FDF3D6', '#F6C9A8')).css, INK_DARK.css)
})

test('the ratio is the worst case over every stop and every midpoint, never above the real minimum', () => {
  const stops = g('#0B1230', '#E8E8F0', '#1B3FA8')
  const ink = pickInk(stops)
  const real = Math.min(...inkSamples(stops).map((c) => contrastRatio(ink.hex, c)))
  assert.ok(ink.ratio <= real + 1e-9, `${ink.ratio} should not exceed ${real}`)
  assert.ok(real - ink.ratio < 0.1, 'rounded down to one decimal place')
})

test('stops are read in position order, so midpoints join neighbours', () => {
  const samples = inkSamples([{ color: '#FFFFFF', position: 100 }, { color: '#000000', position: 0 }])
  assert.deepEqual(samples, ['#000000', '#808080', '#FFFFFF'])
})

test('a gradient from black to white fits no ink, and says so', () => {
  const ink = pickInk(g('#000000', '#FFFFFF'))
  assert.equal(ink.low, true)
  assert.ok(ink.ratio < BODY_TEXT_RATIO)
})

test('a pair that clears 4.5:1 is not flagged', () => {
  assert.equal(pickInk(g('#0B1230', '#1B3FA8')).low, false)
})

// ── Region: only the part of the gradient the text box covers counts ──────────

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} should be within ${eps} of ${b}`)
const DEFAULT = [
  { color: '#0A0F2C', position: 0 },
  { color: '#27348B', position: 55 },
  { color: '#6E6BFF', position: 100 },
]

test('a dark-left hero on the default gradient reads fine, though the whole gradient does not', () => {
  assert.equal(pickInk(DEFAULT).low, true)
  const hero = { type: 'Linear', angle: 160, aspect: 1046 / 550, box: { x: 0.046, y: 0.36, w: 0.235, h: 0.28 } }
  const ink = pickInk(DEFAULT, hero)
  assert.equal(ink.css, INK_LIGHT.css)
  assert.equal(ink.low, false)
  assert.ok(ink.ratio >= BODY_TEXT_RATIO)
})

test('black to white with text over the middle fits neither ink', () => {
  const middle = { type: 'Linear', angle: 90, aspect: 2, box: { x: 0.4, y: 0.3, w: 0.2, h: 0.4 } }
  assert.equal(pickInk(g('#000000', '#FFFFFF'), middle).low, true)
})

test('black to white with text at the dark end reads, and at the light end reads in the other ink', () => {
  const at = (x) => ({ type: 'Linear', angle: 90, aspect: 2, box: { x, y: 0.3, w: 0.15, h: 0.4 } })
  const left = pickInk(g('#000000', '#FFFFFF'), at(0))
  const right = pickInk(g('#000000', '#FFFFFF'), at(0.85))
  assert.equal(left.low, false)
  assert.equal(left.css, INK_LIGHT.css)
  assert.equal(right.low, false)
  assert.equal(right.css, INK_DARK.css)
})

test('a box over the whole area covers the whole linear gradient', () => {
  const [[from, to]] = gradientSpan('Linear', 135, { x: 0, y: 0, w: 1, h: 1 }, 1.5)
  near(from, 0)
  near(to, 1)
})

test('a linear span follows the angle: 90deg runs left to right, 180deg top to bottom', () => {
  const box = { x: 0.25, y: 0.5, w: 0.25, h: 0.25 }
  const [[a, b]] = gradientSpan('Linear', 90, box, 2)
  near(a, 0.25)
  near(b, 0.5)
  const [[c, d]] = gradientSpan('Linear', 180, box, 2)
  near(c, 0.5)
  near(d, 0.75)
})

test('a radial span is the distance from the centre: a box on the centre starts at 0, a corner box ends at 1', () => {
  const [[from]] = gradientSpan('Radial', 0, { x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, 2)
  assert.equal(from, 0)
  const [[nearEdge, farEdge]] = gradientSpan('Radial', 0, { x: 0.8, y: 0.8, w: 0.2, h: 0.2 }, 2)
  assert.ok(nearEdge > 0.5)
  near(farEdge, 1)
})

test('a dark-centre radial passes light ink in the middle and not out at the light rim', () => {
  const stops = g('#0B1230', '#F2F2F2')
  const centre = { type: 'Radial', angle: 0, aspect: 2, box: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } }
  const rim = { type: 'Radial', angle: 0, aspect: 2, box: { x: 0.88, y: 0.85, w: 0.12, h: 0.15 } }
  assert.equal(pickInk(stops, centre).css, INK_LIGHT.css)
  assert.equal(pickInk(stops, rim).css, INK_DARK.css)
})

test('a conic span is the angle around the centre, and the whole turn when the box holds the centre', () => {
  const [[from, to]] = gradientSpan('Conic', 0, { x: 0.6, y: 0.05, w: 0.3, h: 0.25 }, 2)
  near(from, Math.atan2(0.2, 0.45) / (2 * Math.PI))
  near(to, Math.atan2(0.8, 0.2) / (2 * Math.PI))
  assert.deepEqual(gradientSpan('Conic', 0, { x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, 2), [[0, 1]])
})

test('a conic span reads from its start angle, and splits where the seam crosses the box', () => {
  const above = { x: 0.45, y: 0.05, w: 0.1, h: 0.15 }
  const runs = gradientSpan('Conic', 0, above, 2)
  assert.equal(runs.length, 2)
  assert.ok(runs[0][0] > 0.9 && runs[0][1] === 1)
  assert.ok(runs[1][0] === 0 && runs[1][1] < 0.1)
  // turning the start by 90deg moves that same box clear of the seam
  assert.equal(gradientSpan('Conic', 90, above, 2).length, 1)
})

test('colours past the first and last stop stay at the end colours', () => {
  const stops = [{ color: '#000000', position: 30 }, { color: '#FFFFFF', position: 70 }]
  const samples = regionSamples(stops, [[0, 0.2]])
  assert.ok(samples.every((c) => c === '#000000'))
})
