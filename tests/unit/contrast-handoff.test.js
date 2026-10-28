// THE PALETTE BUILDER TO CONTRAST CHECKER RULES, as plain numbers.
//
// utils/contrastHandoff.js picks the pair the checker opens on (the reading pair, a
// column's pair) and cleans what comes back in the address; utils/contrastStrip.js
// says which job a pair does and how the suggested pairs are grouped. Both are pure,
// so every threshold is asserted from each side.
//
// Every colour below is a grey, so its lightness is easy to work out by hand. The
// helpers here are the WCAG and CIE formulas written out again, not the app's own, and
// the first test checks each fixture really sits on the side the later tests assume.
//
//   grey    L*      white on it   near black on it
//   #464646 29.72                                   just under DARK_TEXT_BELOW (30)
//   #474747 30.16                                   just over it
//   #F0F0F0 94.80                                   just under LIGHT_GROUND_ABOVE (95)
//   #F5F5F5 96.54                                   just over it
//   #767676 49.64   4.54:1                          just under DARK_COLUMN_BELOW (50)
//   #777777 50.03   4.48:1                          just over it
//   #949494 61.32   3.03:1        6.45:1            white still clears 3:1, so white is the label
//   #959595 61.70   2.995:1       6.53:1            white falls under 3:1, so near black is
//   #111111  5.06                                   under pairJob's label line (10)
//   #202020 12.25                                   over it
//
// MUTATIONS (each turns the tests named red):
//   DARK_TEXT_BELOW 30 -> 31 or 29                       -> "the reading pair: a dark colour is the text"
//   LIGHT_GROUND_ABOVE 95 -> 94 or 97                    -> "the reading pair: a very light colour is the page"
//   DARK_COLUMN_BELOW 50 -> 51 or 49                     -> "a column: dark is text, lighter is a fill"
//   the white-label test `white < 3` -> `white < 4`      -> "a fill's label"
//   `white < 3` -> `white < 2`                           -> "a fill's label"
//   a fallback role other than near-black or canvas      -> "the reading pair: the fallbacks"
//   GROUND_TONE_ABOVE or LABEL_TONE_BELOW moved         -> "pairJob"
//   pairJob stops reading the roles                      -> "pairJob: a role settles a neutral"
//   parseHandoff takes any `from`, or any role           -> "parseHandoff"
//   ALT_ROLE widened to alt-0 or alt-100                 -> "parseHandoff: alt roles"
//   groupPairs drops a pair, or stops sorting            -> "groupPairs"
//   the beside note names a ratio again                  -> "groupPairs: a note"
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHandoff, readingPair, columnPair, roleAt, cleanRole } from '../../src/utils/contrastHandoff.js'
import { pairJob, groupPairs, JOB_GROUPS } from '../../src/utils/contrastStrip.js'

// WCAG relative luminance and ratio, and CIE L*, written out from the definitions.
const channel = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
const lum = (hex) => [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)))
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const lstar = (hex) => { const y = lum(hex); return 116 * (y > 216 / 24389 ? Math.cbrt(y) : (24389 / 27 * y + 16) / 116) - 16 }

const NEAR_BLACK = '#0B0C0E'
const WHITE = '#FFFFFF'

test('the fixtures sit on the side of each line the tests below assume', () => {
  assert.ok(lstar('#464646') < 30 && lstar('#474747') > 30, 'DARK_TEXT_BELOW 30')
  assert.ok(lstar('#F0F0F0') < 95 && lstar('#F5F5F5') > 95, 'LIGHT_GROUND_ABOVE 95')
  assert.ok(lstar('#767676') < 50 && lstar('#777777') > 50, 'DARK_COLUMN_BELOW 50')
  assert.ok(ratio(WHITE, '#949494') >= 3 && ratio(WHITE, '#959595') < 3, 'white label line, 3:1')
  assert.ok(ratio(NEAR_BLACK, '#959595') > ratio(WHITE, '#959595'), 'near black does better where white fails')
  assert.ok(lstar('#111111') < 10 && lstar('#202020') > 10, 'pairJob label line 10')
})

// ── The reading pair ─────────────────────────────────────────────────────────

test('the reading pair: a dark colour is the text, a lighter one is not', () => {
  // The darkest colour is under 30, so it carries the text, under its own slot name.
  assert.deepEqual(readingPair(['#464646', '#808080']), { fg: '#464646', bg: WHITE, fgRole: 'primary', bgRole: 'canvas' })
  // One step lighter is over 30: near black stands in, and says so.
  assert.deepEqual(readingPair(['#474747', '#808080']), { fg: NEAR_BLACK, bg: WHITE, fgRole: 'near-black', bgRole: 'canvas' })
  // The darkest colour is the one chosen, not the first.
  assert.deepEqual(readingPair(['#808080', '#464646']), { fg: '#464646', bg: WHITE, fgRole: 'secondary', bgRole: 'canvas' })
})

test('the reading pair: a very light colour is the page, a slightly less light one is not', () => {
  // 96.5 is over 95: the palette's own colour is the ground, named by its slot.
  assert.deepEqual(readingPair(['#464646', '#F5F5F5']), { fg: '#464646', bg: '#F5F5F5', fgRole: 'primary', bgRole: 'secondary' })
  // 94.8 is under it: the ground is plain white, the canvas.
  assert.deepEqual(readingPair(['#464646', '#F0F0F0']), { fg: '#464646', bg: WHITE, fgRole: 'primary', bgRole: 'canvas' })
})

test('the reading pair: the fallbacks are near black on white', () => {
  // Nothing dark enough and nothing light enough.
  assert.deepEqual(readingPair(['#808080', '#949494']), { fg: NEAR_BLACK, bg: WHITE, fgRole: 'near-black', bgRole: 'canvas' })
  // No usable colours at all.
  assert.deepEqual(readingPair([]), { fg: NEAR_BLACK, bg: WHITE, fgRole: 'near-black', bgRole: 'canvas' })
  assert.deepEqual(readingPair(['nope', '']), { fg: NEAR_BLACK, bg: WHITE, fgRole: 'near-black', bgRole: 'canvas' })
})

// ── A column's pair ──────────────────────────────────────────────────────────

test('a column: dark is text on the page, lighter is a fill with a label', () => {
  // 49.6 is under 50: checked as text on the ground (#F0F0F0 is under 95, so white).
  assert.deepEqual(columnPair(['#767676', '#F0F0F0'], 0), { fg: '#767676', bg: WHITE, fgRole: 'primary', bgRole: 'canvas' })
  // The same text on a ground over 95 takes that ground.
  assert.deepEqual(columnPair(['#767676', '#F5F5F5'], 0), { fg: '#767676', bg: '#F5F5F5', fgRole: 'primary', bgRole: 'secondary' })
  // 50.03 is over 50: a fill, and white on it is 4.48:1, so white is the label.
  assert.deepEqual(columnPair(['#777777', '#F0F0F0'], 0), { fg: WHITE, bg: '#777777', fgRole: 'white', bgRole: 'primary' })
  // The second slot is read by its own position.
  assert.deepEqual(columnPair(['#F0F0F0', '#777777'], 1), { fg: WHITE, bg: '#777777', fgRole: 'white', bgRole: 'secondary' })
  // A slot with no colour falls back to the reading pair.
  assert.deepEqual(columnPair(['#464646', '#F5F5F5'], 3), readingPair(['#464646', '#F5F5F5']))
})

test("a fill's label: white at 3:1 or better, near black when white falls under", () => {
  // White on #949494 is 3.03:1: it keeps white.
  assert.deepEqual(columnPair(['#949494', '#F0F0F0'], 0), { fg: WHITE, bg: '#949494', fgRole: 'white', bgRole: 'primary' })
  // White on #959595 is 2.995:1, near black is 6.53:1: near black takes over.
  assert.deepEqual(columnPair(['#959595', '#F0F0F0'], 0), { fg: NEAR_BLACK, bg: '#959595', fgRole: 'near-black', bgRole: 'primary' })
  // Either label really is the better-than-3 choice it claims to be.
  assert.ok(ratio(columnPair(['#949494', '#F0F0F0'], 0).fg, '#949494') >= 3)
  assert.ok(ratio(columnPair(['#959595', '#F0F0F0'], 0).fg, '#959595') >= 3)
})

// ── pairJob ──────────────────────────────────────────────────────────────────

test('pairJob: text on a ground, a label on a fill, two colours beside each other', () => {
  // Text: the background is the page, over 95 (or white, or near black).
  assert.equal(pairJob('#464646', '#F5F5F5'), 'text')
  assert.equal(pairJob('#464646', WHITE), 'text')
  // 94.8 is under the page line, and #464646 is neither a neutral nor a label.
  assert.equal(pairJob('#464646', '#F0F0F0'), 'beside')
  // Fill label: white, near black, a very light or a very dark foreground on a fill.
  assert.equal(pairJob(WHITE, '#949494'), 'fill-label')
  assert.equal(pairJob(NEAR_BLACK, '#949494'), 'fill-label')
  assert.equal(pairJob('#F5F5F5', '#464646'), 'fill-label')
  assert.equal(pairJob('#111111', '#949494'), 'fill-label')
  // 12.25 is over the label line of 10, so a dark grey on a fill is a pair beside it.
  assert.equal(pairJob('#202020', '#949494'), 'beside')
  // Beside: two brand colours, neither a ground nor a label.
  assert.equal(pairJob('#464646', '#949494'), 'beside')
})

test('pairJob: a swapped pair does the other job', () => {
  assert.equal(pairJob('#464646', '#F5F5F5'), 'text')
  assert.equal(pairJob('#F5F5F5', '#464646'), 'fill-label')
  // Two brand colours are beside each other whichever way round.
  assert.equal(pairJob('#464646', '#949494'), 'beside')
  assert.equal(pairJob('#949494', '#464646'), 'beside')
})

test('pairJob: a role settles a neutral that the lightness would not', () => {
  // Mid greys, so the lightness alone says "beside".
  assert.equal(pairJob('#808080', '#949494'), 'beside')
  assert.equal(pairJob('#808080', '#949494', null, 'canvas'), 'text')
  assert.equal(pairJob('#808080', '#949494', 'white', null), 'fill-label')
  assert.equal(pairJob('#808080', '#949494', 'near-black', null), 'fill-label')
  // A brand role changes nothing.
  assert.equal(pairJob('#808080', '#949494', 'primary', 'secondary'), 'beside')
})

// ── parseHandoff ─────────────────────────────────────────────────────────────

const parse = (query) => parseHandoff(new URLSearchParams(query))

test('parseHandoff: only "palette" is a `from`', () => {
  assert.equal(parse('from=palette').from, 'palette')
  for (const bad of ['', 'Palette', 'palette ', 'projects', 'https://example.com', '1']) {
    assert.equal(parse(`from=${encodeURIComponent(bad)}`).from, null, `from=${JSON.stringify(bad)}`)
  }
  assert.equal(parse('').from, null)
})

test('parseHandoff: a role outside the fixed list is dropped, side by side', () => {
  const ok = parse('fgRole=primary&bgRole=near-black')
  assert.deepEqual([ok.fgRole, ok.bgRole], ['primary', 'near-black'])
  for (const bad of ['', 'Primary', 'text', 'alt', 'alt-', 'alt-x', 'constructor', '__proto__', 'primary ']) {
    const h = parse(`fgRole=${encodeURIComponent(bad)}&bgRole=deep`)
    assert.equal(h.fgRole, null, `fgRole=${JSON.stringify(bad)}`)
    assert.equal(h.bgRole, 'deep', 'a bad role on one side leaves the other side alone')
  }
  assert.deepEqual(parse(''), { from: null, fgRole: null, bgRole: null })
})

test('parseHandoff: alt roles run from alt-1 to alt-99', () => {
  for (const good of ['alt-1', 'alt-9', 'alt-10', 'alt-99']) assert.equal(cleanRole(good), good, good)
  for (const bad of ['alt-0', 'alt-00', 'alt-01', 'alt-100', 'alt-1000', 'alt--1']) assert.equal(cleanRole(bad), null, bad)
  assert.equal(parse('fgRole=alt-0&bgRole=alt-100').fgRole, null)
  assert.equal(parse('fgRole=alt-0&bgRole=alt-100').bgRole, null)
  // Slot names the app writes are always read back.
  for (let i = 0; i < 12; i += 1) assert.equal(cleanRole(roleAt(i)), roleAt(i), roleAt(i))
})

// ── groupPairs ───────────────────────────────────────────────────────────────

const pair = (fg, bg, fgRole = null, bgRole = null) => ({ fg, bg, fgRole, bgRole, ratio: ratio(fg, bg) })

test('groupPairs: every pair is kept, in its job, best ratio first', () => {
  const pairs = [
    pair('#464646', '#949494'), // beside, 3.11
    pair('#464646', '#F5F5F5'), // text
    pair(WHITE, '#949494'), // fill-label, 3.03
    pair('#202020', '#949494'), // beside, 5.37, higher
    pair(NEAR_BLACK, '#949494'), // fill-label, 6.45
    pair('#111111', '#F5F5F5'), // text, higher
  ]
  const groups = groupPairs(pairs)
  assert.deepEqual(groups.map((g) => g.job), ['text', 'fill-label', 'beside'], 'the strip order')
  // Nothing dropped and nothing twice.
  const flat = groups.flatMap((g) => g.pairs)
  assert.equal(flat.length, pairs.length)
  for (const p of pairs) assert.equal(flat.filter((q) => q === p).length, 1)
  // Each group holds only its own job, and runs best first.
  for (const g of groups) {
    for (const p of g.pairs) assert.equal(pairJob(p.fg, p.bg, p.fgRole, p.bgRole), g.job)
    const ratios = g.pairs.map((p) => p.ratio)
    assert.deepEqual(ratios, [...ratios].sort((a, b) => b - a), `${g.job} is best first`)
  }
  assert.equal(groups[0].pairs[0].fg, '#111111')
  assert.equal(groups[1].pairs[0].fg, NEAR_BLACK)
  assert.equal(groups[2].pairs[0].fg, '#202020')
  // The input is not reordered.
  assert.equal(pairs[0].fg, '#464646')
})

test('groupPairs: a job with no pairs is left out, and an empty list gives no groups', () => {
  assert.deepEqual(groupPairs([]), [])
  assert.deepEqual(groupPairs([pair('#464646', '#949494')]).map((g) => g.job), ['beside'])
})

test('groupPairs: roles on a pair decide its job', () => {
  const [g] = groupPairs([pair('#808080', '#949494', null, 'canvas')])
  assert.equal(g.job, 'text')
})

test('groupPairs: a note says what the group is shown as, never a ratio', () => {
  // A pair beside another can clear 4.5:1 (this one is about 9:1), so a "3:1" note would
  // contradict its own card.
  const strong = pair('#202020', '#C0C0C0')
  assert.ok(strong.ratio > 7)
  const [g] = groupPairs([strong])
  assert.equal(g.job, 'beside')
  for (const group of Object.values(JOB_GROUPS)) {
    if (group.note) assert.doesNotMatch(group.note, /\d\s*:\s*1/, `note: ${group.note}`)
  }
  assert.doesNotMatch(g.note || '', /3\s*:\s*1/)
})
