import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  INTERVAL_MS, carouselCanPlay, carouselReducer as reduce, carouselRunning, createCarousel, windowIndexes, windowStart,
} from '../../src/components/export/pageCarousel.js'

test('the timer interval is five seconds', () => {
  assert.equal(INTERVAL_MS, 5000)
})

test('a tick advances and wraps from the last page to the first', () => {
  let s = createCarousel({ count: 3 })
  s = reduce(s, { type: 'tick' })
  assert.equal(s.index, 1)
  s = reduce(reduce(s, { type: 'tick' }), { type: 'tick' })
  assert.equal(s.index, 0)
})

test('a click on a page sets it and stops the auto-advance for good', () => {
  let s = reduce(createCarousel({ count: 3 }), { type: 'select', index: 2 })
  assert.equal(s.index, 2)
  assert.equal(carouselRunning(s), false)
  s = reduce(s, { type: 'tick' })
  assert.equal(s.index, 2)
  s = reduce(reduce(s, { type: 'hover', on: true }), { type: 'hover', on: false })
  assert.equal(carouselRunning(s), false)
})

test('an arrow steps one page, stops at the ends, and stops the auto-advance', () => {
  let s = reduce(createCarousel({ count: 3 }), { type: 'step', delta: -1 })
  assert.equal(s.index, 0)
  assert.equal(s.auto, false)
  s = reduce(reduce(reduce(s, { type: 'step', delta: 1 }), { type: 'step', delta: 1 }), { type: 'step', delta: 1 })
  assert.equal(s.index, 2)
})

test('hover holds the timer only while the pointer is there', () => {
  let s = createCarousel({ count: 3 })
  s = reduce(s, { type: 'hover', on: true })
  assert.equal(carouselRunning(s), false)
  assert.equal(reduce(s, { type: 'tick' }).index, 0)
  s = reduce(s, { type: 'hover', on: false })
  assert.equal(carouselRunning(s), true)
})

test('Pause and Play toggle the auto-advance', () => {
  let s = createCarousel({ count: 3 })
  s = reduce(s, { type: 'toggle' })
  assert.equal(carouselRunning(s), false)
  s = reduce(s, { type: 'toggle' })
  assert.equal(carouselRunning(s), true)
})

test('reduced motion never runs the timer, and Play cannot turn it on', () => {
  let s = createCarousel({ count: 3, reduced: true })
  assert.equal(carouselRunning(s), false)
  assert.equal(carouselCanPlay(s), false)
  s = reduce(reduce(s, { type: 'toggle' }), { type: 'tick' })
  assert.equal(carouselRunning(s), false)
  assert.equal(s.index, 0)
  // The setting can change while the gallery is open.
  const live = reduce(createCarousel({ count: 3 }), { type: 'reduced', on: true })
  assert.equal(carouselRunning(live), false)
})

test('a reset starts the first page again, advancing, and keeps the motion setting', () => {
  const stopped = reduce(createCarousel({ count: 3, reduced: true }), { type: 'select', index: 2 })
  const s = reduce(stopped, { type: 'reset', count: 2 })
  assert.deepEqual(s, createCarousel({ count: 2, reduced: true }))
  const live = reduce(reduce(createCarousel({ count: 3 }), { type: 'select', index: 2 }), { type: 'reset' })
  assert.equal(live.index, 0)
  assert.equal(carouselRunning(live), true)
})

test('one page, or none, never advances', () => {
  assert.equal(carouselRunning(createCarousel({ count: 1 })), false)
  assert.equal(carouselCanPlay(createCarousel({ count: 1 })), false)
  assert.equal(carouselRunning(createCarousel({ count: 0 })), false)
})

test('a change of page count keeps the chosen page in range', () => {
  const s = reduce(reduce(createCarousel({ count: 5 }), { type: 'select', index: 4 }), { type: 'count', count: 2 })
  assert.equal(s.index, 1)
  assert.equal(reduce(s, { type: 'count', count: 0 }).index, 0)
})

test('the thumbnail window always holds the chosen page', () => {
  assert.deepEqual(windowIndexes(0, 2), [0, 1])
  assert.deepEqual(windowIndexes(0, 6), [0, 1, 2])
  assert.deepEqual(windowIndexes(3, 6), [2, 3, 4])
  assert.deepEqual(windowIndexes(5, 6), [3, 4, 5])
  assert.equal(windowStart(0, 0), 0)
  for (let count = 1; count < 9; count += 1) {
    for (let i = 0; i < count; i += 1) assert.ok(windowIndexes(i, count).includes(i), `${i} of ${count}`)
  }
})

test('unknown events and a bad index leave a safe state', () => {
  const s = createCarousel({ count: 3 })
  assert.equal(reduce(s, { type: 'nope' }), s)
  assert.equal(reduce(s, { type: 'select', index: 'x' }).index, 0)
  assert.equal(reduce(s, { type: 'select', index: 99 }).index, 2)
})
