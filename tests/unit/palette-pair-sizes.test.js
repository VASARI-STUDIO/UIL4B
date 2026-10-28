// The three WCAG tests a Contrast Checker example is read against, and how a
// piece of an example is sorted into one of them. Every expected value is a
// number worked out by hand from WCAG 1.4.3 and 1.4.11, not by calling the
// function under test.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BOLD_WEIGHT, LARGE_BOLD_PX, LARGE_PX, OUTLINE_CANDIDATES, PAIR_VIEWS, SIZE_CLASSES, UI_PARTS,
  failingSizes, pickOutlineColour, textSizeClass,
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

// Part 1 of the views rework builds Interface and Specimen; part 2 adds Article and
// Landing page between them (and 'landing' becomes the one view with a part to drop).
test('the views are listed in control order, Interface first and Specimen last', () => {
  const ids = PAIR_VIEWS.map((v) => v.id)
  assert.equal(ids[0], 'interface')
  assert.equal(ids.at(-1), 'specimen')
  for (const v of PAIR_VIEWS) assert.equal(v.label + (v.more || ''), v.name, `${v.id}: label plus the dropped part is the name`)
})

test('every view has a UI-part selector, because the legend runs on every view', () => {
  assert.deepEqual(Object.keys(UI_PARTS).sort(), PAIR_VIEWS.map((v) => v.id).sort())
  for (const [id, selector] of Object.entries(UI_PARTS)) assert.match(selector, /\S/, `${id} has an empty selector`)
})

// pickOutlineColour: the outline an example draws is never one of the pair's own
// colours, so it is chosen per pair from OUTLINE_CANDIDATES. The expected colours
// below are worked by hand: each candidate is scored by its weaker contrast against
// the two colours, and the best score wins, a tie going to the earlier candidate.
test('the usual blue is kept where it reads against both colours', () => {
  // On white and black #1d63d1 scores 3.5:1 (its weaker side, against black); #c8260e scores 1.4 and #111111 about 1.
  assert.equal(pickOutlineColour('#ffffff', '#000000'), '#1d63d1')
})

test('a mid-grey pair gets near-black, because blue and white both vanish on one of the greys', () => {
  // #111111 scores 4.2:1 on #777777 and 5.3:1 on #888888; #1d63d1 is only 1.3:1 on #777777.
  assert.equal(pickOutlineColour('#888888', '#777777'), '#111111')
  assert.equal(pickOutlineColour('#777777', '#888888'), '#111111', 'the pair given the other way round')
})

test('the pick is always one of the candidates, and the first wins a tie', () => {
  for (const [bg, fg] of [['#000000', '#ffffff'], ['#1d63d1', '#c8260e'], ['#808080', '#808080']]) {
    assert.ok(OUTLINE_CANDIDATES.includes(pickOutlineColour(bg, fg)), `${bg} ${fg}`)
  }
  assert.equal(pickOutlineColour('#ffffff', '#000000', ['#1D63D1', '#1d63d1']), '#1D63D1', 'equal scores keep the earlier one')
  assert.equal(pickOutlineColour('#ffffff', '#000000', ['#abcdef']), '#abcdef')
})
