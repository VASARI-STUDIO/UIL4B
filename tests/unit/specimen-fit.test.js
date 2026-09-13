// Specimen sizing for the family picker — the arithmetic that lets every tile
// set its OWN NAME without a long one overflowing or a short one looking lost.
//
// WHAT THIS GUARDS. The browse tile used to render the fixed word "Handgloves"
// on every family, so 1,851 cards differed only by shape and the reader had to
// look away to the caption to learn what they were looking at
// (#font-picker-shows-handgloves). Setting each tile in its own name fixes that
// and creates a problem the fixed word never had: the specimen is no longer one
// width. Across the live Google Fonts family list the names run from 2
// characters to 32 ("Noto Sans Inscriptional Parthian"), median 11.
//
// THESE TESTS USED TO SHARE THE IMPLEMENTATION'S OWN MISTAKE, and that is worth
// recording because it is the reason a real defect survived them. `fillFraction`
// below computed characters-per-line as `Math.ceil(chars / lines)` — the same
// balanced split the implementation assumed — so it could only ever confirm the
// formula against itself. Browsers do not balance a wrap; they fill greedily and
// break at spaces, and 249 of the 1,946 live families (12.8%) therefore needed a
// third line inside a two-line clamp and were silently trimmed. A test written
// in the implementation's model cannot see the model being wrong, so the wrap
// here is now simulated the way a browser performs it.
//
// AND THE SAMPLE IS THE WHOLE CATALOGUE. Five hand-picked names cannot answer a
// question about how words happen to divide; the fixture is the live family
// list, names only, captured from Google's own metadata endpoint.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { specimenSizeCqw } from '../../src/utils/fontGallery.js'
// Reads the WHOLE app stylesheet, not global.css alone. The rules this file
// asserts on were split out of global.css into src/styles/deferred/*.css on
// 2026-09-13; a test that keeps reading one file after a lift like that does
// not go red, it goes VACUOUS. See tests/unit/appStylesheets.js.
import { ALL_CSS } from './appStylesheets.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
const CATALOGUE = JSON.parse(read('tests/unit/fixtures/google-font-families.json')).families

// The worst-case advance width measured in global.css: "Handgloves" renders
// between 4.8x and 6.0x its font-size across the five categories, so 0.60em per
// character is the pessimistic per-character cost. Everything below is checked
// against that measurement, not against a guess.
const WORST_EM_PER_CHAR = 0.60

// .fbd-tile is 104px tall with 10px of vertical padding, and .fbd-grid's
// --lbry-col-min is 190px with 14px of side padding on the tile.
const CONTENT_BOX_PX = 190 - 28
const CONTENT_HEIGHT_PX = 104 - 20
const CLAMP_FLOOR_PX = 13
const CLAMP_CEILING_PX = 30
const LINE_HEIGHT = 1.15

// GREEDY WRAP, as a browser performs it: fill the line, break at a space, and
// break INSIDE a word only when the word cannot fit a line by itself — which is
// what overflow-wrap:anywhere does for "UnifrakturMaguntia".
function wrap(name, budget) {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  const out = []
  let cur = ''
  for (let word of words) {
    while (word.length > budget) {
      if (cur) { out.push(cur); cur = '' }
      out.push(word.slice(0, budget))
      word = word.slice(budget)
    }
    if (!cur) cur = word
    else if (cur.length + 1 + word.length <= budget) cur += ` ${word}`
    else { out.push(cur); cur = word }
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

// How many lines a name really takes at the size the helper picked, in a box of
// `boxPx`, with the CSS clamp applied.
function renderedLines(family, boxPx, maxLines = 2) {
  const cqw = specimenSizeCqw(family, maxLines)
  const px = Math.min(CLAMP_CEILING_PX, Math.max(CLAMP_FLOOR_PX, (cqw / 100) * boxPx))
  const budget = Math.floor(boxPx / (px * WORST_EM_PER_CHAR))
  return { lines: wrap(family, Math.max(1, budget)).length, px }
}

// The line budget the helper's own answer implies, before the CSS clamp.
const budgetOf = (family, maxLines = 2) => Math.round(150 / specimenSizeCqw(family, maxLines))

// The distribution, sampled at the points that matter.
const SHORT = 'Abel'                               // 4  — the floor case
const MEDIAN = 'Handgloves'                        // 10 — what shipped
const P75 = 'Roboto Condensed'                     // 16
const P95 = 'IBM Plex Sans Condensed'              // 23
const LONGEST = 'Noto Sans Inscriptional Parthian' // 32 — the ceiling case
const ALL = [SHORT, MEDIAN, P75, P95, LONGEST]

test('THE FIXTURE IS THE WHOLE CATALOGUE, and it still looks like one', () => {
  // First, because every sweep below is vacuous if this list has collapsed.
  assert.ok(CATALOGUE.length > 1800, `only ${CATALOGUE.length} families in the fixture`)
  assert.ok(CATALOGUE.includes(LONGEST), 'the longest known family name has gone from the fixture')
  assert.ok(CATALOGUE.includes('UnifrakturMaguntia'), 'the longest unbreakable word has gone from the fixture')
  assert.ok(CATALOGUE.some((f) => f.split(/\s+/).length >= 4), 'no four-word family names - the wrap cases are gone')
})

test('THE CONTRACT: it reproduces the constant the repo measured for "Handgloves"', () => {
  // 15cqw is the value global.css calibrated for the fixed word before this
  // change. If the formula did not return it, the new sizing would be a
  // regression for the median family rather than an extension of it. Asserted
  // at BOTH line budgets: a ten-character single word fits one line either way.
  assert.equal(specimenSizeCqw(MEDIAN), 15)
  assert.equal(specimenSizeCqw(MEDIAN, 1), 15)
})

test('the ONE-LINE path is byte-identical to the character count, for every family', () => {
  // FontPicker's .typ-picker-face is a fixed 34px row and asks for one line. A
  // single line can only fit if the budget covers the whole string, so solving
  // the wrap and dividing by the length are the same answer there — which is
  // what makes this change an extension of the shipped formula rather than a
  // replacement of it. If this ever diverges, the trigger has been re-sized as a
  // side effect of a grid fix.
  for (const family of CATALOGUE) {
    assert.equal(specimenSizeCqw(family, 1), 150 / family.trim().length,
      `${family}: the one-line path moved`)
  }
})

test('NO family in the live catalogue exceeds the lines it was budgeted', () => {
  // The defect, stated as a property. At the size the helper returns, the wrap
  // a browser performs must fit the budget the helper solved for.
  const over = []
  for (const family of CATALOGUE) {
    const chars = family.trim().length
    const budgeted = chars > 14 ? 2 : 1
    const actual = wrap(family, budgetOf(family)).length
    if (actual > budgeted) over.push(`  ${family} (${chars} chars) wraps to ${actual} lines, budgeted ${budgeted}`)
  }
  assert.deepEqual(over.slice(0, 12), [],
    `${over.length} of ${CATALOGUE.length} families wrap past their budget:\n${over.slice(0, 12).join('\n')}`)
})

test('THE FIXTURE DISCRIMINATES: the balanced-split formula fails 249 of them', () => {
  // Without this the test above passes on any formula, including the one it
  // replaced. `Math.ceil(chars / lines)` assumes a perfectly balanced wrap;
  // "Noto Sans Inscriptional Parthian" at a 16-character budget goes "Noto
  // Sans" / "Inscriptional" / "Parthian", which is three lines inside a clamp
  // that was two. If this count ever collapses, the catalogue has changed shape
  // and the sweep above needs re-measuring rather than trusting.
  const balanced = (family) => {
    const chars = family.trim().length
    const lines = chars > 14 ? 2 : 1
    return { lines, budget: Math.ceil(chars / lines) }
  }
  const broken = CATALOGUE.filter((f) => {
    const b = balanced(f)
    return wrap(f, b.budget).length > b.lines
  })
  assert.ok(broken.length > 150,
    `the balanced formula now over-runs only ${broken.length} families (measured 249). `
    + 'The fixture no longer discriminates and the sweep above proves nothing.')
  assert.ok(broken.includes(LONGEST), 'the worst known case no longer breaks the old formula')
})

test('every name keeps 10% headroom, so it never fills the box exactly', () => {
  for (const family of ALL) {
    const fill = budgetOf(family) * WORST_EM_PER_CHAR * (specimenSizeCqw(family) / 100)
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

test('the CSS clamp floor is what puts a name on a THIRD line, and only two names', () => {
  // The honest version of the assertion this file used to make, which was that
  // the longest family resolves at or above the 13px floor. It does not, and
  // pretending otherwise is what let a trimmed specimen ship: solved from the
  // real wrap, "Noto Sans Inscriptional Parthian" needs a 22-character line,
  // which is 11.0px in the narrowest shipped column. The floor raises it to
  // 13px, where 22 characters no longer fit and a third line appears.
  //
  // So the number that matters is not "does it clear the floor" but "how many
  // names does the floor push past two lines, and does the tile have room".
  const pushed = CATALOGUE.filter((f) => renderedLines(f, CONTENT_BOX_PX).lines > 2)
  assert.ok(pushed.length <= 4,
    `${pushed.length} families are pushed past two lines by the clamp floor (measured 2): `
    + pushed.slice(0, 8).join(', '))
  assert.ok(pushed.length > 0,
    'no family is pushed past two lines any more - if the geometry changed, the three-line '
    + 'clamp in .fbd-sample may no longer be needed, but check before narrowing it')
  const worst = Math.max(...CATALOGUE.map((f) => renderedLines(f, CONTENT_BOX_PX).lines))
  assert.ok(worst <= 3, `a family needs ${worst} lines at the clamp floor, and the clamp allows 3`)
})

test('the tile has room for what the clamp allows, at both ends of the size range', () => {
  // Three lines only ever happens at the floor, and two lines only ever reaches
  // the ceiling. Both are checked against the real content box rather than
  // assumed, because a clamp that permits a line the box cannot hold is the
  // same defect wearing a different number.
  assert.ok(3 * CLAMP_FLOOR_PX * LINE_HEIGHT <= CONTENT_HEIGHT_PX,
    `three lines at the floor is ${(3 * CLAMP_FLOOR_PX * LINE_HEIGHT).toFixed(1)}px in a ${CONTENT_HEIGHT_PX}px box`)
  assert.ok(2 * CLAMP_CEILING_PX * LINE_HEIGHT <= CONTENT_HEIGHT_PX,
    `two lines at the ceiling is ${(2 * CLAMP_CEILING_PX * LINE_HEIGHT).toFixed(1)}px in a ${CONTENT_HEIGHT_PX}px box`)
  // And nothing reaches three lines at a size above the floor.
  const tall = CATALOGUE.filter((f) => {
    const r = renderedLines(f, CONTENT_BOX_PX)
    return r.lines >= 3 && r.px > CLAMP_FLOOR_PX
  })
  assert.deepEqual(tall, [], `these need three lines at a size above the floor: ${tall.join(', ')}`)
})

test('the stylesheet clamps at the number this file just justified', () => {
  // Wiring. The arithmetic above is a statement about .fbd-sample's clamp, and
  // an arithmetic-only version of this test passed for the whole time the clamp
  // was trimming 249 families.
  const css = ALL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = css.match(/\.fbd-sample\{([^}]*)\}/)
  assert.ok(rule, '.fbd-sample has gone from the stylesheet')
  assert.match(rule[1], /-webkit-line-clamp:3/, '.fbd-sample no longer clamps at three lines')
  assert.match(rule[1], /clamp\(13px,calc\(var\(--fbd-cap,15\) \* 1cqw\),30px\)/,
    'the floor, the per-family multiplier or the ceiling moved - re-measure the line counts above')
  assert.ok(!/text-overflow:\s*ellipsis/.test(rule[1]),
    'the specimen has an ellipsis again. It IS the comparison surface; a trimmed one is the fault, not a fix for it.')
})

test('the browse tile and the picker trigger both ask for their own line budget', () => {
  // Wiring, the other half. FontBrowseDialog takes the default (two lines) and
  // FontPicker asks for one, and swapping either is a silent regression: the
  // trigger would wrap inside a fixed 34px row, and the grid would set every
  // long name at the one-line size.
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const dialog = strip(read('src/components/FontBrowseDialog.jsx'))
  const picker = strip(read('src/components/FontPicker.jsx'))
  assert.match(dialog, /specimenSizeCqw\(font\.family\)/,
    'the browse tile no longer sizes its specimen per family')
  assert.match(picker, /specimenSizeCqw\(current\.family, 1\)/,
    'the picker trigger no longer asks for a one-line budget')
})

test('WIDENING THE CLAMP ALONE would not have done, and this is why', () => {
  // The cheaper option, priced rather than described. If the clamp were three
  // and the balanced budget kept, nothing would be TRIMMED — but the balanced
  // budget can put three lines on the page at the 30px CEILING, and three lines
  // at 30px is 103.5px in an 84px tile. That overflows the card, which is worse
  // than a trim, not better. "Akaya Telivigala" is the case: 16 characters, a
  // balanced budget of 8, which resolves above the ceiling in every column, and
  // whose ten-letter second word has to break mid-word at that size.
  //
  // Solving the wrap keeps the tallest case at two lines and 69px everywhere,
  // and the only three-line results left are at the 13px floor, where three
  // lines is 45px. So the clamp widens AND the budget changes; either alone is
  // a different defect.
  const balanced = (family) => {
    const chars = family.trim().length
    const lines = chars > 14 ? 2 : 1
    return 150 / Math.ceil(chars / lines)
  }
  const tallest = (sizeOf) => {
    let worst = { px: 0, lines: 0, height: 0, family: null }
    for (const family of CATALOGUE) {
      const px = Math.min(CLAMP_CEILING_PX, Math.max(CLAMP_FLOOR_PX, (sizeOf(family) / 100) * CONTENT_BOX_PX))
      const lines = wrap(family, Math.max(1, Math.floor(CONTENT_BOX_PX / (px * WORST_EM_PER_CHAR)))).length
      const height = lines * px * LINE_HEIGHT
      if (height > worst.height) worst = { px, lines, height, family }
    }
    return worst
  }
  const kept = tallest(balanced)
  assert.ok(kept.height > CONTENT_HEIGHT_PX,
    `the balanced budget's tallest case is now ${kept.height.toFixed(1)}px, inside the ${CONTENT_HEIGHT_PX}px `
    + 'tile. It was 103.5px when this was measured, and if that is no longer true the clamp on its own '
    + 'may be enough and this change should be re-priced rather than assumed.')
  const solved = tallest((f) => specimenSizeCqw(f, 2))
  assert.ok(solved.height <= CONTENT_HEIGHT_PX,
    `the shipped budget's tallest case is ${solved.height.toFixed(1)}px (${solved.lines} lines at `
    + `${solved.px.toFixed(1)}px, "${solved.family}"), which overflows the ${CONTENT_HEIGHT_PX}px tile`)
})

test('an empty or missing family falls back to the shipped constant', () => {
  // A tile that somehow renders without a family must look as it did before
  // rather than collapsing onto the clamp floor.
  for (const bad of ['', '   ', undefined, null]) {
    assert.equal(specimenSizeCqw(bad), 15, `fallback wrong for ${JSON.stringify(bad)}`)
  }
})
