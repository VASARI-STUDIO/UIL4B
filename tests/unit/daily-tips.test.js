// The daily tip is CONTENT, and content is the half of this feature most likely
// to rot quietly. These tests exist for two failures a build would otherwise
// never notice.
//
// 1. A TIP THAT STATES A WRONG NUMBER. Every `craft`-shaped claim in
//    src/data/dailyTips.js is checkable, and the whole reason the tip earns a
//    place on the page is that it teaches something real. A copy edit that
//    rounds 21.6% to \u201c30%\u201d, or retypes the 1.618 ladder from memory, turns the
//    one authoritative-sounding element on the surface into a confident lie.
//    So the arithmetic is recomputed here from the sRGB and WCAG formulae and
//    matched against the sentences that quote it.
//
// 2. A TIP NOBODY EVER SEES. The picker steps by TIP_STEP through the list. If
//    the step and the list length stop being coprime, the walk closes into a
//    short orbit and silently strands most of the list \u2014 the feature keeps
//    working, the tests keep passing, and two thirds of the writing is dead.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DAILY_TIPS, TIP_STEP, dayNumber, tipForDay, tipIds } from '../../src/data/dailyTips.js'

/* \u2500\u2500 the sRGB / WCAG arithmetic, computed rather than quoted \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

const toLinear = (channel) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (r, g, b) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
const encode = (L) => Math.round((L <= 0.0031308 ? L * 12.92 : 1.055 * L ** (1 / 2.4) - 0.055) * 255)

const byId = (id) => {
  const tip = DAILY_TIPS.find((t) => t.id === id)
  assert.ok(tip, `dailyTips.js no longer carries a tip with id "${id}"`)
  return tip
}

test('the mid-grey tip quotes the real sRGB numbers', () => {
  // "#808080 ... only reflects 22% of white's light ... nearer #BCBCBC"
  const tip = byId('mid-grey')
  assert.equal(Math.round(luminance(128, 128, 128) * 100), 22,
    '#808080 relative luminance is no longer 22% \u2014 the tip says it is')
  const half = encode(0.5)
  assert.equal(`#${half.toString(16).toUpperCase().repeat(3)}`, '#BCBCBC',
    'the true half-luminance grey moved \u2014 the tip names #BCBCBC')
  assert.match(tip.text, /22%/)
  assert.match(tip.text, /#BCBCBC/)
})

test('the hue-is-not-brightness tip quotes the real WCAG coefficients', () => {
  const tip = byId('hue-is-not-brightness')
  // 0.2126 R / 0.7152 G / 0.0722 B, stated in the tip as 21 / 72 / 7 per cent.
  assert.equal(Math.round(0.7152 * 100), 72)
  assert.equal(Math.round(0.2126 * 100), 21)
  assert.equal(Math.round(0.0722 * 100), 7)
  assert.match(tip.text, /72%/)
  assert.match(tip.text, /21%/)
  assert.match(tip.text, /7%/)
  // And the claim underneath it: fully-saturated yellow really is near-white by
  // luminance and fully-saturated blue really is near-black.
  assert.ok(luminance(255, 255, 0) > 0.9, 'yellow should still be near the top of the luminance range')
  assert.ok(luminance(0, 0, 255) < 0.1, 'blue should still be near the bottom of the luminance range')
})

test('the contrast ceiling really is 21:1', () => {
  const tip = byId('contrast-ceiling')
  const ratio = (1 + 0.05) / (0 + 0.05)
  assert.equal(ratio, 21)
  assert.match(tip.text, /21:1/)
})

test('the golden-ratio ladder is the ladder a 1.618 scale actually produces', () => {
  const tip = byId('golden-ratio-scale')
  const ladder = [0, 1, 2, 3].map((step) => Math.round(16 * 1.618 ** step))
  assert.deepEqual(ladder, [16, 26, 42, 68])
  for (const size of ladder) assert.match(tip.text, new RegExp(`\\b${size}\\b`))
})

test('darkgray really is lighter than gray', () => {
  const tip = byId('darkgray')
  assert.ok(luminance(0xa9, 0xa9, 0xa9) > luminance(0x80, 0x80, 0x80))
  assert.match(tip.text, /#A9A9A9/)
  assert.match(tip.text, /#808080/)
})

test('the hex-shorthand tip expands correctly', () => {
  const tip = byId('hex-shorthand')
  assert.equal([...'F0C'].map((c) => c + c).join(''), 'FF00CC')
  assert.match(tip.text, /#FF00CC/)
})

test('rebeccapurple is quoted with its real hex', () => {
  assert.match(byId('rebeccapurple').text, /#663399/)
})

/* \u2500\u2500 the list itself \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

test('ids are unique, so a tip cannot be silently shadowed', () => {
  const ids = tipIds()
  assert.equal(new Set(ids).size, ids.length)
})

test('every tip is a real, readable, single-idea sentence', () => {
  for (const tip of DAILY_TIPS) {
    assert.ok(['colour', 'type', 'craft', 'joke'].includes(tip.kind), `${tip.id}: unknown kind "${tip.kind}"`)
    assert.ok(tip.text.length >= 40, `${tip.id}: too short to say anything`)
    // The ceiling is the design constraint, not a style preference: this renders
    // on one line of a two-column band and a longer string reflows the band.
    assert.ok(tip.text.length <= 300, `${tip.id}: ${tip.text.length} chars \u2014 too long for the tip line`)
    assert.ok(!/\s{2,}/.test(tip.text), `${tip.id}: doubled whitespace`)
    assert.ok(tip.text.trim() === tip.text, `${tip.id}: padded`)
  }
})

test('the mix is still weighted towards teaching, with real jokes in it', () => {
  const jokes = DAILY_TIPS.filter((t) => t.kind === 'joke').length
  const teaching = DAILY_TIPS.length - jokes
  assert.ok(teaching >= jokes * 1.5,
    'the founder asked for tips that are actually useful with a few funny ones \u2014 not the other way round')
  assert.ok(jokes >= 4, 'the light ones are part of the brief; do not quietly drop them all')
})

test('no tip flatters the reader', () => {
  // The register this must never drift into \u2014 see the note in dailyTips.js.
  const flattery = /you\u2019re awesome|great job|proud of you|you\u2019ve got this|amazing work|keep crushing/i
  for (const tip of DAILY_TIPS) {
    assert.ok(!flattery.test(tip.text), `${tip.id} reads as encouragement rather than a tip`)
  }
})

/* \u2500\u2500 the picker \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))

test('the step visits every tip exactly once per cycle', () => {
  assert.equal(gcd(TIP_STEP, DAILY_TIPS.length), 1,
    `TIP_STEP ${TIP_STEP} shares a factor with the list length ${DAILY_TIPS.length}: the walk `
    + 'closes into a short orbit and most of the list would never be shown')

  const start = new Date(2026, 0, 1)
  const seen = new Set()
  for (let i = 0; i < DAILY_TIPS.length; i += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    seen.add(tipForDay(day).id)
  }
  assert.equal(seen.size, DAILY_TIPS.length, 'a full cycle of days did not reach every tip')
})

test('the same day always gives the same tip, and the next day gives another', () => {
  const day = new Date(2026, 8, 5)
  assert.equal(tipForDay(day).id, tipForDay(new Date(2026, 8, 5)).id)
  // Same calendar day, different clock time \u2014 the tip must not change at noon.
  assert.equal(tipForDay(new Date(2026, 8, 5, 23, 59)).id, tipForDay(new Date(2026, 8, 5, 0, 1)).id)
  assert.notEqual(tipForDay(day).id, tipForDay(new Date(2026, 8, 6)).id)
})

test('a missing or nonsense date still yields a tip rather than throwing', () => {
  assert.ok(tipForDay(undefined))
  assert.ok(tipForDay(new Date('not a date')))
  assert.ok(tipForDay(null))
})

test('dayNumber advances by exactly one per calendar day', () => {
  assert.equal(dayNumber(new Date(2026, 8, 6)) - dayNumber(new Date(2026, 8, 5)), 1)
  // Across a month boundary, and across the DST changeover most timezones have
  // in the northern spring \u2014 a UTC-timestamp implementation gets this wrong.
  assert.equal(dayNumber(new Date(2026, 8, 30)) - dayNumber(new Date(2026, 8, 29)), 1)
  assert.equal(dayNumber(new Date(2026, 2, 30)) - dayNumber(new Date(2026, 2, 29)), 1)
})
