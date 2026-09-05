// Specimen sizing for the family picker — the arithmetic that lets every tile
// set its OWN NAME without a long one overflowing or a short one looking lost.
//
// WHAT THIS GUARDS. The browse tile used to render the fixed word "Handgloves"
// on every family, so 1,851 cards differed only by shape and the reader had to
// look away to the caption to learn what they were looking at
// (#font-picker-shows-handgloves). Setting each tile in its own name fixes that
// and creates a problem the fixed word never had: the specimen is no longer one
// width. Across the live Google Fonts family list the names run from 4
// characters ("Abel") to 32 ("Noto Sans Inscriptional Parthian"), median 11.
//
// A constant font-size calibrated for a ten-character word cannot serve a
// thirty-two-character one. These tests pin the properties that make
// specimenSizeCqw correct rather than merely different: that it reproduces the
// constant the repo already measured, that it never lets a name exceed the box,
// and that it never shrinks one below the clamp floor that would let it overflow.

import test from 'node:test'
import assert from 'node:assert/strict'
import { specimenSizeCqw } from '../../src/utils/fontGallery.js'

// The worst-case advance width measured in global.css: "Handgloves" renders
// between 4.8x and 6.0x its font-size across the five categories, so 0.60em per
// character is the pessimistic per-character cost. Everything below is checked
// against that measurement, not against a guess.
const WORST_EM_PER_CHAR = 0.60

// Width the specimen occupies as a fraction of the tile's content box, if set
// at the returned size on the number of lines the helper budgeted for.
const fillFraction = (family, maxLines) => {
  const cqw = specimenSizeCqw(family, maxLines)
  const chars = family.trim().length
  const lines = (maxLines > 1 && chars > 14) ? 2 : 1
  const perLine = Math.ceil(chars / lines)
  // cqw is percent-of-content-box, so size-in-box-widths is cqw / 100.
  return perLine * WORST_EM_PER_CHAR * (cqw / 100)
}

// The real distribution, sampled at the points that matter.
const SHORT = 'Abel'                               // 4  — the floor case
const MEDIAN = 'Handgloves'                        // 10 — what shipped
const P75 = 'Roboto Condensed'                     // 16
const P95 = 'IBM Plex Sans Condensed'              // 22
const LONGEST = 'Noto Sans Inscriptional Parthian' // 32 — the ceiling case
const ALL = [SHORT, MEDIAN, P75, P95, LONGEST]

test('THE CONTRACT: it reproduces the constant the repo measured for "Handgloves"', () => {
  // 15cqw is the value global.css calibrated for the fixed word before this
  // change. If the formula did not return it, the new sizing would be a
  // regression for the median family rather than an extension of it.
  assert.equal(specimenSizeCqw(MEDIAN), 15)
})

test('no name exceeds the tile at the worst-case advance width', () => {
  for (const family of ALL) {
    assert.ok(fillFraction(family, 2) <= 1, `${family} overflows its tile`)
  }
})

test('every name keeps 10% headroom, so the truncation backstop never fires', () => {
  for (const family of [MEDIAN, P75, P95, LONGEST]) {
    const fill = fillFraction(family, 2)
    assert.ok(fill <= 0.91, `${family} fills ${fill.toFixed(3)} of the box`)
  }
})

test('the size shrinks monotonically as the name gets longer', () => {
  const sizes = ALL.map((f) => specimenSizeCqw(f, 1))
  for (let i = 1; i < sizes.length; i += 1) {
    assert.ok(sizes[i] < sizes[i - 1], `${ALL[i]} is not smaller than ${ALL[i - 1]}`)
  }
})

test('the second line is spent only where one line would be illegible', () => {
  // At 14 characters or fewer a single line still fits, so wrapping would waste
  // the tile's height and make short names look arbitrarily small.
  assert.equal(specimenSizeCqw('Bricolage', 2), specimenSizeCqw('Bricolage', 1))
  // Past that the two-line budget has to actually buy something.
  assert.ok(specimenSizeCqw(LONGEST, 2) > specimenSizeCqw(LONGEST, 1))
})

test('the longest family stays legible in the narrowest shipped column', () => {
  // --lbry-col-min is 190px and .fbd-tile carries 14px of side padding, so the
  // narrowest content box the grid ever hands a tile is 162px.
  const NARROWEST_CONTENT_BOX = 190 - 28
  const px = (specimenSizeCqw(LONGEST, 2) / 100) * NARROWEST_CONTENT_BOX
  // 13px is the floor declared in .fbd-sample's clamp. If the derived size fell
  // below it the clamp would win and the name would overflow instead of fitting.
  assert.ok(px >= 13, `longest family resolves to ${px.toFixed(1)}px, below the 13px floor`)
})

test('the one-line trigger is sized for one line, not the grid\'s two', () => {
  // FontPicker's .typ-picker-face is a fixed 34px row, so it asks for one line.
  // A long name there may ellipsis, because .typ-picker-name repeats it in the
  // UI font directly beneath — the browse grid has no such second chance.
  assert.ok(specimenSizeCqw(LONGEST, 1) < specimenSizeCqw(LONGEST, 2))
  assert.ok(fillFraction(LONGEST, 1) <= 1)
})

test('an empty or missing family falls back to the shipped constant', () => {
  // A tile that somehow renders without a family must look as it did before
  // rather than collapsing onto the clamp floor.
  for (const bad of ['', '   ', undefined, null]) {
    assert.equal(specimenSizeCqw(bad), 15, `fallback wrong for ${JSON.stringify(bad)}`)
  }
})
