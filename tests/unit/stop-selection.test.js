// Selecting several gradient stops at once: the pure rules in utils/stopSelection.
import test from 'node:test'
import assert from 'node:assert/strict'
import { railOrder, rangeOf, toggleIn, shiftGroup, removable } from '../../src/utils/stopSelection.js'

const stops = (...positions) => positions.map((position, i) => ({ color: '#000000', position, i }))

test('rail order is by position, ties keep list order', () => {
  assert.deepEqual(railOrder(stops(80, 0, 40, 40)), [1, 2, 3, 0])
})

test('Shift+click selects the run along the rail, not along the list', () => {
  const s = stops(80, 0, 40, 100)
  // From stop 1 (0%) to stop 0 (80%): 1, 2, 0 in rail order.
  assert.deepEqual(rangeOf(s, 1, 0), [1, 2, 0])
  assert.deepEqual(rangeOf(s, 0, 1), [1, 2, 0])
  assert.deepEqual(rangeOf(s, 3, 3), [3])
})

test('Ctrl+click adds a stop, takes one out, and can come back empty', () => {
  assert.deepEqual(toggleIn([0], 2), [0, 2])
  assert.deepEqual(toggleIn([0, 2], 0), [2])
  assert.deepEqual(toggleIn([2], 2), [])
})

test('a group moves together and stops as a group at the ends', () => {
  const s = stops(10, 50, 90)
  assert.deepEqual(shiftGroup(s, [0, 1], 5).map((x) => x.position), [15, 55, 90])
  // Stop 0 is at 10: the group can go 10 left, not 20, so the spacing holds.
  assert.deepEqual(shiftGroup(s, [0, 1], -20).map((x) => x.position), [0, 40, 90])
  assert.deepEqual(shiftGroup(s, [1, 2], 20).map((x) => x.position), [10, 60, 100])
  // Already at the end: nothing moves and the same array comes back.
  const ends = stops(0, 100)
  assert.equal(shiftGroup(ends, [0, 1], 5), ends)
})

test('a delete never leaves fewer than two stops', () => {
  assert.deepEqual(removable(5, [1, 2, 3]), { remove: [1, 2, 3], blocked: false })
  assert.deepEqual(removable(4, [0, 1, 2, 3]), { remove: [0, 1], blocked: true })
  assert.deepEqual(removable(2, [0]), { remove: [], blocked: true })
  assert.deepEqual(removable(3, [2]), { remove: [2], blocked: false })
})
