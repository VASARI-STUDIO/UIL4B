// The three WCAG tests a Contrast Checker example is read against, and how a
// piece of an example is sorted into one of them. Every expected value is a
// number worked out by hand from WCAG 1.4.3 and 1.4.11, not by calling the
// function under test.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BOLD_WEIGHT, LARGE_BOLD_PX, LARGE_PX, PAIR_VIEWS, SIZE_CLASSES, UI_PARTS, failingSizes, textSizeClass,
} from '../../src/utils/palettePairSizes.js'

test('the thresholds are the ones WCAG states: 24px, or 18.66px in bold', () => {
  assert.equal(LARGE_PX, 24)
  assert.equal(LARGE_BOLD_PX, 18.66)
  assert.equal(BOLD_WEIGHT, 700)
})

test('bold text just under 24px is large only from 18.66px', () => {
  assert.equal(textSizeClass(23.9, 700), 'large', '23.9px bold is above 18.66px')
  assert.equal(textSizeClass(18.66, 700), 'large', '18.66px bold is the floor, and it counts')
  assert.equal(textSizeClass(18.65, 700), 'body', '18.65px bold is under it')
})

test('regular text is large only from 24px, and a weight under bold does not help', () => {
  assert.equal(textSizeClass(24, 400), 'large')
  assert.equal(textSizeClass(23.9, 400), 'body')
  assert.equal(textSizeClass(20, 600), 'body', '600 is not bold for this test')
  assert.equal(textSizeClass(16, 700), 'body')
  assert.equal(textSizeClass(0, 400), 'body')
})

test('a ratio just under 4.5 fails body text only', () => {
  assert.deepEqual(failingSizes(4.47), ['body'])
  assert.deepEqual(failingSizes(4.5), [], '4.5 meets the body test exactly')
  assert.deepEqual(failingSizes(3), ['body'], '3 meets large and UI exactly, and misses body')
})

test('a ratio under 3 fails body, large and UI parts', () => {
  assert.deepEqual(failingSizes(2.9), ['body', 'large', 'ui'])
  assert.deepEqual(failingSizes(1), ['body', 'large', 'ui'])
})

test('failingSizes compares the unrounded ratio, so 4.4999 is not rounded up to a pass', () => {
  assert.deepEqual(failingSizes(4.4999), ['body'])
  assert.deepEqual(failingSizes(2.9999), ['body', 'large', 'ui'])
})

test('the three classes are body 4.5, large 3 and UI parts 3, in that order', () => {
  assert.deepEqual(SIZE_CLASSES.map((c) => [c.id, c.min]), [['body', 4.5], ['large', 3], ['ui', 3]])
})

test('the four views are listed in control order and only Product page has a part to drop on a phone', () => {
  assert.deepEqual(PAIR_VIEWS.map((v) => v.id), ['specimen', 'editorial', 'product', 'card'])
  for (const v of PAIR_VIEWS) assert.equal(v.label + (v.more || ''), v.name, `${v.id}: label plus the dropped part is the name`)
  assert.deepEqual(PAIR_VIEWS.filter((v) => v.more).map((v) => v.id), ['product'])
  assert.equal(PAIR_VIEWS.find((v) => v.id === 'product').label, 'Product')
})

test('every view that paints an example has a UI-part selector, and the specimen has none', () => {
  assert.deepEqual(Object.keys(UI_PARTS).sort(), ['card', 'editorial', 'product'])
  for (const [id, selector] of Object.entries(UI_PARTS)) assert.match(selector, /\S/, `${id} has an empty selector`)
})
