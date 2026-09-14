// A RATIO YOU MEASURED YOURSELF USED TO GET NO STANDARD SIZES.
//
// RatioCalculator's size picker rendered only when the ratio matched one of
// eleven curated RATIOS, each with a hand-written `sizes` list. So measuring a
// real area — a 1456x816 artboard, a 1280x589 panel — produced a ratio that is
// almost never one of those, and the picker disappeared exactly when the user
// had done the work to earn it.
//
// Founder, 2026-09-15: "lock the ratio based on the numbers supplied then chose
// a standard size to match the ratio such as 1920 x or 800 x or 2480x or 1600x
// or whatever else."
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STANDARD_WIDTHS, standardSizesForRatio, ratioMatches } from '../../src/utils/standardWidths.js'

test('THE ONE HE ASKED FOR: any ratio gets the standard widths', () => {
  // 1280x589 is the measurement he gave. It simplifies to 1280:589 — no curated
  // list will ever hold it — and it must still produce a usable ladder.
  const sizes = standardSizesForRatio(1280, 589)
  const widths = sizes.map((s) => s.w)
  for (const want of [1920, 1600, 1024, 800, 2480]) {
    assert.ok(widths.includes(want), `${want} is not offered; got ${widths.join(', ')}`)
  }
  // And the height is the one the ratio demands, as a whole number.
  const fullHd = sizes.find((s) => s.w === 1920)
  assert.equal(fullHd.h, Math.round(1920 * 589 / 1280))
  assert.ok(Number.isInteger(fullHd.h))
})

test('every height is a whole pixel, for every ratio and every width', () => {
  // The defect ratio-whole-pixels.test.js exists for: 9:16 at width 1920 once
  // produced a height of 3413.33, which then reached the copy buttons.
  const bad = []
  for (const [rw, rh] of [[16, 9], [9, 16], [1280, 589], [1456, 816], [1, 1], [21, 9], [1.91, 1]]) {
    for (const s of standardSizesForRatio(rw, rh)) {
      if (!Number.isInteger(s.h) || !Number.isInteger(s.w)) bad.push(`${rw}:${rh} -> ${s.w}x${s.h}`)
      if (s.h < 1) bad.push(`${rw}:${rh} -> height ${s.h}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('the ladder covers the sizes he named, largest first', () => {
  const widths = STANDARD_WIDTHS.map((s) => s.w)
  for (const want of [3840, 2560, 2480, 1920, 1600, 1280, 1024, 800]) {
    assert.ok(widths.includes(want), `${want} missing from the ladder`)
  }
  assert.deepEqual(widths, [...widths].sort((a, b) => b - a), 'the ladder is not ordered by width')
  // Every entry carries a name, because a bare number is what this replaced.
  for (const s of STANDARD_WIDTHS) assert.ok(s.label && s.label.length > 1, `${s.w} has no label`)
})

test('a very tall ratio does not offer an unusable height', () => {
  // 9:16 at 7680 wide is 13,653 tall. Offered, it is a canvas nothing can make.
  const sizes = standardSizesForRatio(9, 16, { max: 8000 })
  assert.ok(sizes.every((s) => s.h <= 8000), 'a height past the ceiling survived')
  assert.ok(sizes.length > 3, `the ceiling removed almost everything: ${sizes.length} left`)
})

test('nonsense in produces an empty ladder, not a crash', () => {
  for (const [w, h] of [[0, 0], [-1, 5], [NaN, 9], [16, 0], [undefined, undefined]]) {
    assert.deepEqual(standardSizesForRatio(w, h), [], `${w}:${h} produced entries`)
  }
})

test('a typed size is recognised as the standard it already is', () => {
  // The user types 1920x1080, not 16:9. Compared as decimals within a
  // tolerance, those are the same shape and the curated list should win.
  assert.equal(ratioMatches(1920, 1080, 16, 9), true)
  assert.equal(ratioMatches(2560, 1440, 16, 9), true)
  assert.equal(ratioMatches(1280, 589, 16, 9), false)
  assert.equal(ratioMatches(1280, 589, 19.5, 9), false, '0.3% off is still not an exact match')
})

test('this guard is not toothless — the ladder is real and the shapes differ', () => {
  // POSITIVE CONTROL. Several assertions are "every entry is an integer", which
  // an empty array satisfies.
  const wide = standardSizesForRatio(21, 9)
  const tall = standardSizesForRatio(9, 21)
  assert.ok(wide.length >= 8, `only ${wide.length} sizes for 21:9`)
  assert.notDeepEqual(wide.map((s) => s.h), tall.map((s) => s.h), 'landscape and portrait produced the same heights')
  assert.ok(wide.every((s) => s.w > s.h), '21:9 produced a portrait size')
})
