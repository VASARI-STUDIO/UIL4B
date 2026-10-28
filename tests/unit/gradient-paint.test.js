// Available colours' "paint in order" rules and the six starter pairs, as pure
// logic (spec gradient-generation-v2 §2, tests T-A1 to T-A3). The page uses the
// same functions, so a change here is a change on screen.
//
// MUTATIONS (each turns the tests named red):
//   nextPaintTarget returns `from`               -> "two presses paint stop 1 then stop 2"
//   nextPaintTarget ignores `locked`             -> "the target skips a stop whose colour is locked"
//   orderByPosition sorts by index, not position -> "the target follows position, not list order"
//   applyStarterPair mixes in sRGB, not OKLCH    -> "a pair re-mixes the middle stops in OKLCH"
//   a pair drops its `locked` flag               -> "a pair keeps each stop's lock"
//   a hex in STARTER_PAIRS loses its #           -> "the six pairs are named, distinct and valid hex"
import test from 'node:test'
import assert from 'node:assert/strict'
import { allColoursLocked, applyStarterPair, nextPaintTarget, orderByPosition } from '../../src/utils/gradientPaint.js'
import { STARTER_PAIRS } from '../../src/data/gradientStarterPairs.js'
import { mixOklch } from '../../src/components/tool/oklch.js'

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
  stops[1].locked = true
  assert.equal(nextPaintTarget(stops, 0), 2)
  assert.equal(nextPaintTarget(stops, 2), 0)
})

test('with no other free stop the target stays put, and a fully locked gradient says so', () => {
  const stops = two()
  stops[1].locked = true
  assert.equal(nextPaintTarget(stops, 0), 0)
  assert.equal(allColoursLocked(stops), false)
  stops[0].locked = true
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

test('the six pairs are named, distinct and valid hex', () => {
  assert.equal(STARTER_PAIRS.length, 6)
  assert.equal(new Set(STARTER_PAIRS.map((p) => p.id)).size, 6)
  assert.equal(new Set(STARTER_PAIRS.map((p) => p.name)).size, 6)
  for (const p of STARTER_PAIRS) {
    assert.match(p.left, /^#[0-9A-F]{6}$/)
    assert.match(p.right, /^#[0-9A-F]{6}$/)
    assert.notEqual(p.left, p.right)
    assert.ok(p.name && !/[—–]/.test(p.name))
  }
})

test('a pair sets the first and last stop by position', () => {
  const pair = STARTER_PAIRS[0]
  const out = applyStarterPair(two(), pair)
  assert.deepEqual(out.map((s) => s.color), [pair.left, pair.right])
  // The list order does not decide which end is which.
  const swapped = applyStarterPair([{ color: '#EEEEEE', position: 100 }, { color: '#111111', position: 0 }], pair)
  assert.deepEqual(swapped.map((s) => s.color), [pair.right, pair.left])
})

test('a pair re-mixes the middle stops in OKLCH, by their own position', () => {
  const pair = STARTER_PAIRS[3]
  const out = applyStarterPair(three(), pair)
  assert.equal(out[1].color, mixOklch(pair.left, pair.right, 0.55))
  assert.deepEqual(out.map((s) => s.position), [0, 55, 100])
})

test('a pair keeps each stop\'s lock', () => {
  const stops = three()
  stops[1].locked = true
  const out = applyStarterPair(stops, STARTER_PAIRS[1])
  assert.deepEqual(out.map((s) => !!s.locked), [false, true, false])
})
