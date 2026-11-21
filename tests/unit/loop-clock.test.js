// The animated grid's shared restart clock (src/utils/loopClock.js): one interval, only while a cell is
// subscribed and the page is visible.
//
// MUTATIONS (each turns the named test red):
//   - start the interval with no subscriber (`subs.size > 0` -> true)   -> 'runs only while something is subscribed'
//   - drop the clearInterval branch from sync()                         -> 'stops on the last unsubscribe'
//   - drop `!hidden()` from the start condition                         -> 'does not tick while the page is hidden, and resumes'
//   - drop the visibilitychange listener                                -> 'does not tick while the page is hidden, and resumes'
//   - start a second interval per subscriber (no `timer == null` guard) -> 'every subscriber shares one interval'
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'

// The module reads `document` when a cell subscribes, so give it one before it loads.
const listeners = new Map()
globalThis.document = {
  hidden: false,
  addEventListener: (type, cb) => { listeners.set(type, cb) },
}
const setHidden = (value) => { document.hidden = value; listeners.get('visibilitychange')?.() }

const { LOOP_MS, subscribeLoopClock, loopClockRunning } = await import('../../src/utils/loopClock.js')

test('runs only while something is subscribed', () => {
  mock.timers.enable({ apis: ['setInterval'] })
  try {
    assert.equal(loopClockRunning(), false, 'nothing subscribed, nothing running')
    const off = subscribeLoopClock(() => {})
    assert.equal(loopClockRunning(), true)
    off()
    assert.equal(loopClockRunning(), false)
  } finally { mock.timers.reset() }
})

test('ticks every LOOP_MS and stops on the last unsubscribe', () => {
  mock.timers.enable({ apis: ['setInterval'] })
  try {
    let a = 0
    let b = 0
    const offA = subscribeLoopClock(() => { a += 1 })
    const offB = subscribeLoopClock(() => { b += 1 })
    mock.timers.tick(LOOP_MS - 1)
    assert.deepEqual([a, b], [0, 0], 'nothing before the period is up')
    mock.timers.tick(1)
    assert.deepEqual([a, b], [1, 1])
    offA()
    assert.equal(loopClockRunning(), true, 'one subscriber is still left')
    mock.timers.tick(LOOP_MS)
    assert.deepEqual([a, b], [1, 2], 'the one that left stopped ticking')
    offB()
    assert.equal(loopClockRunning(), false, 'the last one leaving stops the clock')
    mock.timers.tick(LOOP_MS * 3)
    assert.deepEqual([a, b], [1, 2], 'and nothing fires afterwards')
  } finally { mock.timers.reset() }
})

test('every subscriber shares one interval', () => {
  mock.timers.enable({ apis: ['setInterval'] })
  try {
    let ticks = 0
    const offs = [1, 2, 3].map(() => subscribeLoopClock(() => { ticks += 1 }))
    mock.timers.tick(LOOP_MS)
    assert.equal(ticks, 3, 'three subscribers, one tick each (not three intervals firing three times each)')
    offs.forEach((off) => off())
  } finally { mock.timers.reset() }
})

test('does not tick while the page is hidden, and resumes when it shows again', () => {
  mock.timers.enable({ apis: ['setInterval'] })
  try {
    let ticks = 0
    const off = subscribeLoopClock(() => { ticks += 1 })
    mock.timers.tick(LOOP_MS)
    assert.equal(ticks, 1, 'POSITIVE CONTROL: it ticks while visible')
    setHidden(true)
    assert.equal(loopClockRunning(), false, 'hiding the page stops the interval')
    mock.timers.tick(LOOP_MS * 4)
    assert.equal(ticks, 1, 'no tick while hidden')
    setHidden(false)
    assert.equal(loopClockRunning(), true, 'showing it again restarts the interval')
    mock.timers.tick(LOOP_MS)
    assert.equal(ticks, 2)
    off()
    // A subscriber that joins while hidden does not start a timer either.
    setHidden(true)
    const late = subscribeLoopClock(() => { ticks += 1 })
    assert.equal(loopClockRunning(), false)
    late()
    setHidden(false)
  } finally { mock.timers.reset() }
})
