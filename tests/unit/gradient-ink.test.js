// The ink drawn over a gradient in the preview contexts: chosen by worst-case contrast.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pickInk, inkSamples, INK_DARK, INK_LIGHT, BODY_TEXT_RATIO } from '../../src/utils/gradientInk.js'
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
