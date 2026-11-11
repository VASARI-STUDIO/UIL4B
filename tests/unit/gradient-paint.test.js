// The palette row's "paint in order" rules, as pure logic (spec
// gradient-generation-v2 §2, tests T-A1 to T-A3). The page uses the same
// functions, so a change here is a change on screen.
//
// MUTATIONS (each turns the tests named red):
//   nextPaintTarget returns `from`               -> "two presses paint stop 1 then stop 2"
//   nextPaintTarget ignores `lockColour`         -> "the target skips a stop whose colour is locked"
//   orderByPosition sorts by index, not position -> "the target follows position, not list order"
import test from 'node:test'
import assert from 'node:assert/strict'
import { allColoursLocked, nextPaintTarget, orderByPosition } from '../../src/utils/gradientPaint.js'

const two = () => [{ color: '#000000', position: 0 }, { color: '#FFFFFF', position: 100 }]
const three = () => [{ color: '#111111', position: 0 }, { color: '#777777', position: 55 }, { color: '#EEEEEE', position: 100 }]

// What a press does: paint the target, then move it on.
function press(stops, target, hex) {
  const next = stops.map((s, i) => (i === target ? { ...s, color: hex } : s))
  return { stops: next, target: nextPaintTarget(next, target) }
}

test('two presses paint stop 1 then stop 2, and the target is back on stop 1', () => {
  let state = { stops: two(), target: 0 }
  state = press(state.stops, state.target, '#AA0000')
  assert.equal(state.target, 1)
  state = press(state.stops, state.target, '#00AA00')
  assert.deepEqual(state.stops.map((s) => s.color), ['#AA0000', '#00AA00'])
  assert.equal(state.target, 0)
})

test('the target skips a stop whose colour is locked', () => {
  const stops = three()
  stops[1].lockColour = true
  assert.equal(nextPaintTarget(stops, 0), 2)
  assert.equal(nextPaintTarget(stops, 2), 0)
})

test('with no other free stop the target stays put, and a fully locked gradient says so', () => {
  const stops = two()
  stops[1].lockColour = true
  assert.equal(nextPaintTarget(stops, 0), 0)
  assert.equal(allColoursLocked(stops), false)
  stops[0].lockColour = true
  assert.equal(allColoursLocked(stops), true)
  assert.equal(allColoursLocked([]), false)
})

test('the target follows position, not list order', () => {
  // The list holds the stops 100%, 0%, 50%: left to right is rows 1, 2, 0.
  const stops = [{ color: '#333333', position: 100 }, { color: '#111111', position: 0 }, { color: '#222222', position: 50 }]
  assert.deepEqual(orderByPosition(stops), [1, 2, 0])
  assert.equal(nextPaintTarget(stops, 1), 2)
  assert.equal(nextPaintTarget(stops, 2), 0)
  assert.equal(nextPaintTarget(stops, 0), 1)
})
