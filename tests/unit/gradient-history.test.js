// The generator's Back history: the last ten looks, newest last.
import test from 'node:test'
import assert from 'node:assert/strict'
import { HISTORY_DEPTH, snapshotLook, sameLook, pushLook, popLook, canGoBack } from '../../src/utils/gradientHistory.js'

const look = (n) => ({
  stops: [{ color: `#00000${n % 10}`, position: 0 }, { color: '#FFFFFF', position: 100, lockColour: true }],
  type: 'Linear', angle: 90 + n, space: 'oklch',
})

test('the depth is ten', () => assert.equal(HISTORY_DEPTH, 10))

test('push adds the newest last and pop returns it first', () => {
  let h = []
  h = pushLook(h, look(1))
  h = pushLook(h, look(2))
  assert.equal(h.length, 2)
  const { look: back, history } = popLook(h)
  assert.equal(back.angle, 92)
  assert.equal(history.length, 1)
  assert.equal(popLook(history).look.angle, 91)
})

test('only the last ten are kept, oldest dropped first', () => {
  let h = []
  for (let n = 1; n <= 15; n++) h = pushLook(h, look(n))
  assert.equal(h.length, 10)
  assert.equal(h[0].angle, 96)
  assert.equal(h[9].angle, 105)
})

test('an empty history has nowhere to go and pop leaves it alone', () => {
  assert.equal(canGoBack([]), false)
  const { look: none, history } = popLook([])
  assert.equal(none, null)
  assert.deepEqual(history, [])
  assert.equal(canGoBack(pushLook([], look(1))), true)
})

test('the same look twice in a row is one step, lock flags included', () => {
  let h = pushLook([], look(1))
  h = pushLook(h, look(1))
  assert.equal(h.length, 1)
  const locked = look(1)
  locked.stops[0].lockPosition = true
  assert.equal(sameLook(look(1), locked), false)
  assert.equal(pushLook(h, locked).length, 2)
})

test('push and pop do not change the array they are given', () => {
  const h = pushLook([], look(1))
  const before = JSON.stringify(h)
  pushLook(h, look(2))
  popLook(h)
  assert.equal(JSON.stringify(h), before)
})

test('a snapshot is a copy: editing the page stops later cannot reach back into it', () => {
  const live = look(3)
  const snap = snapshotLook(live)
  live.stops[0].color = '#ABCDEF'
  live.angle = 1
  assert.equal(snap.stops[0].color, '#000003')
  assert.equal(snap.angle, 93)
})
