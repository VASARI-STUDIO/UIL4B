// The curve icons on the Tint Generator are drawn from the same lightness
// function as the ramp, so an icon cannot disagree with the curve it labels.
// The bends are scaled up from each curve's straight line so they read at 16px.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { curveIconPath, stepLightness } from '../../src/utils/tintRamp.js'

const EXPECTED = [
  'M2 2L3.6 3.13L5.2 4.26L6.8 5.38L8.4 6.51L10 7.64L11.6 8.77L13.2 9.89L14.8 11.02L16.4 12.15L18 13.28',
  'M2 2L3.6 2L5.2 2L6.8 2.74L8.4 4.97L10 7.64L11.6 10.3L13.2 12.54L14.8 13.28L16.4 13.28L18 13.28',
  'M2 2L3.6 5.18L5.2 6.95L6.8 8.33L8.4 9.48L10 10.47L11.6 11.34L13.2 12.11L14.8 12.81L16.4 13.43L18 14',
]

test('each curve icon path is the one the ramp function draws', () => {
  for (const curve of [0, 1, 2]) assert.equal(curveIconPath(curve), EXPECTED[curve])
})

test('the three icons are different, and High contrast ends lowest', () => {
  assert.equal(new Set(EXPECTED.map((_, i) => curveIconPath(i))).size, 3)
  const endY = (c) => Number(curveIconPath(c).split('L').pop().split(' ')[1])
  assert.ok(endY(2) > endY(0))
  assert.equal(endY(0), endY(1))
})

test('every icon stays inside the 20 by 16 box and runs light to dark', () => {
  for (const curve of [0, 1, 2]) {
    const pts = curveIconPath(curve).split(/[ML]/).filter(Boolean).map((p) => p.split(' ').map(Number))
    assert.equal(pts.length, 11)
    for (const [x, y] of pts) {
      assert.ok(x >= 0 && x <= 20 && y >= 0 && y <= 16)
    }
    for (let i = 1; i < pts.length; i++) assert.ok(pts[i][1] >= pts[i - 1][1])
  }
  assert.ok(stepLightness(0, 0) > stepLightness(1, 0))
})
