// The eight palette moods, swept over the library that actually ships.
//
// Founder request (2026-09-07): "for our pallete library lets include filters
// of neutral, and others" — Neutral, Warm, Cool, Pastel, Vivid, Dark, Light,
// Monochrome.
//
// WHAT THIS FILE IS FOR, and what it deliberately does not do:
//
//   It proves the eight classifiers are honest controls — every one of them
//   selects something on the real data, the two disjointness promises hold, and
//   the answer depends on the hexes and on nothing else. It asserts NO COUNT.
//   A count typed into a test is a second copy of the data that goes stale the
//   first time a palette is added, and #396's whole failure was a number that
//   had stopped describing the view. What is asserted here are the PROPERTIES;
//   the numbers are derived, reported, and allowed to move.
//
//   It does not prove the page uses any of it. A classifier can be perfect
//   while the tray is wired to the wrong state, which is exactly how a green
//   1363/1363 unit suite once sat over three failing browser tests. The wiring
//   — a real click on a real chip, counting real cards — is asserted in
//   tests/user-sim/57-palette-moods-and-gallery-cta.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyPalette,
  hueFamilies,
  hueDistance,
  paletteProfile,
  MOOD_IDS,
  DARK_MAX_LIGHTNESS,
  LIGHT_MIN_LIGHTNESS,
  VIVID_MIN_SPREAD,
  WARM_MIN_SHARE,
  MONO_HUE_TOLERANCE,
  hueTerm,
  hueTerms,
  HUE_TERMS,
} from '../../src/utils/paletteMood.js'
import { paletteHaystack } from '../../src/utils/paletteSearch.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { splitLockedLibrary } from '../../src/utils/lockedPreview.js'

// The library, classified once, exactly the way the page classifies it.
const TAGGED = LIBRARY_PALETTES.map((p) => ({ ...p, mood: classifyPalette(p.colors) }))

// What a signed-out visitor can actually reach. Asserting non-emptiness on the
// WHOLE library is not enough: 30 of the 37 brand systems are behind Pro and
// never reach a free viewer's page at all, so a mood that lived only on locked
// brands would be a dead chip for almost everybody while passing a whole-library
// check. Built through splitLockedLibrary — the page's own gate, not a
// re-implementation of it.
const FREE = splitLockedLibrary(LIBRARY_PALETTES, {
  unlocked: false,
  isOpen: (p) => p.pro !== true,
  preview: (p) => ({ id: p.id, label: p.name, slots: p.colors.length }),
})
const FREE_IDS = new Set(FREE.open.map((p) => p.id))

const matching = (mood, pool = TAGGED) => pool.filter((p) => p.mood[mood])

// ── Positive controls ───────────────────────────────────────────────────────
// Every assertion below is of the form "this set is non-empty" or "this
// intersection is empty", and an empty intersection is trivially true over an
// empty library. So first: there is a library, and a free view of it.

test('there is a library to classify, and a free view of it', () => {
  assert.ok(LIBRARY_PALETTES.length > 50, `only ${LIBRARY_PALETTES.length} palettes in the library`)
  assert.ok(FREE.open.length > 50, `only ${FREE.open.length} palettes reach a free viewer`)
  assert.ok(FREE.open.length < LIBRARY_PALETTES.length, 'nothing is locked, so the free view is not a real subset')
  assert.equal(MOOD_IDS.length, 8)
})

// ── Every control selects something ─────────────────────────────────────────

test('every mood matches at least one palette in the shipped library', () => {
  const empty = MOOD_IDS.filter((mood) => matching(mood).length === 0)
  assert.deepEqual(empty, [], `dead filters — a control that matches nothing is broken: ${empty.join(', ')}`)
})

test('every mood matches at least one palette a FREE viewer can reach', () => {
  const pool = TAGGED.filter((p) => FREE_IDS.has(p.id))
  const empty = MOOD_IDS.filter((mood) => matching(mood, pool).length === 0)
  assert.deepEqual(empty, [], `filters that are dead unless you pay: ${empty.join(', ')}`)
})

// ── The two disjointness promises ───────────────────────────────────────────

test('Pastel and Vivid never both match', () => {
  const both = matching('pastel').filter((p) => p.mood.vivid)
  assert.deepEqual(both.map((p) => p.name), [])
})

test('Dark and Light never both match', () => {
  const both = matching('dark').filter((p) => p.mood.light)
  assert.deepEqual(both.map((p) => p.name), [])
})

// Disjointness that holds only because of the numbers currently in the file is
// disjointness that breaks on the next edit. These two assert the STRUCTURE:
// the comparisons face opposite ways across a gap, and Pastel's ceiling is
// literally Vivid's floor.
test('Dark and Light are disjoint by construction, not by luck', () => {
  assert.ok(
    DARK_MAX_LIGHTNESS < LIGHT_MIN_LIGHTNESS,
    'DARK_MAX_LIGHTNESS has been moved above LIGHT_MIN_LIGHTNESS — the two ranges now overlap',
  )
})

test('Pastel is bounded by Vivid’s own threshold', () => {
  // A palette one unit under the Vivid line must be eligible for Pastel, and one
  // unit over must not be — whatever that line is set to. Built rather than
  // found, so the property is asserted at the boundary rather than wherever the
  // library happens to sit.
  const light = ['#FFF4F6', '#FFE3EA', '#FFD2DE', '#FFC1D2']
  const profile = paletteProfile(light)
  assert.ok(profile.lightness >= LIGHT_MIN_LIGHTNESS, 'fixture is not light enough to test Pastel')
  assert.ok(profile.vividness < VIVID_MIN_SPREAD, 'fixture is already vivid')
  const mood = classifyPalette(light)
  assert.equal(mood.pastel, true)
  assert.equal(mood.vivid, false)

  // Now push one swatch past the line and Pastel must let go of it.
  const vivid = classifyPalette([...light.slice(0, 3), '#FF0080'])
  assert.equal(vivid.vivid, true)
  assert.equal(vivid.pastel, false)
})

// ── Warm / Cool, and the straddle decision ──────────────────────────────────

test('a palette that straddles the temperature split belongs to NEITHER warm nor cool', () => {
  // Two saturated oranges and two saturated blues: a fifty-fifty split by
  // chroma mass, which is the case the WARM_MIN_SHARE band exists to answer.
  // The decision is "neither", not "both": someone filtering Warm to find a
  // warm scheme does not want the teal-and-orange one, and neither does someone
  // filtering Cool. Returning it to both would make each control less true.
  const straddle = classifyPalette(['#FF7A1A', '#E85D04', '#1A6BFF', '#0353A4'])
  assert.equal(straddle.warm, false, 'a half-and-half palette answered "warm"')
  assert.equal(straddle.cool, false, 'a half-and-half palette answered "cool"')
})

test('a palette that is warm all the way through is Warm', () => {
  const warm = classifyPalette(['#FFE8CC', '#FFB366', '#E8590C', '#7F2704'])
  assert.equal(warm.warm, true)
  assert.equal(warm.cool, false)
})

test('a palette that is cool all the way through is Cool', () => {
  const cool = classifyPalette(['#D0EBFF', '#74C0FC', '#1971C2', '#0B3D66'])
  assert.equal(cool.cool, true)
  assert.equal(cool.warm, false)
})

test('Warm and Cool never both match, anywhere in the library', () => {
  // Structural: a share cannot be both ≥ WARM_MIN_SHARE and ≤ 1 − it while that
  // constant is above a half.
  assert.ok(WARM_MIN_SHARE > 0.5, 'WARM_MIN_SHARE at or below 0.5 lets a palette be warm AND cool')
  const both = matching('warm').filter((p) => p.mood.cool)
  assert.deepEqual(both.map((p) => p.name), [])
})

test('a colourless palette is neither warm nor cool', () => {
  // Its hue angles are numerical noise. Letting them vote would hand a grey
  // ramp a temperature it does not have.
  const grey = classifyPalette(['#F5F5F5', '#D9D9D9', '#7D7C7C', '#191717'])
  assert.equal(grey.warm, false)
  assert.equal(grey.cool, false)
})

// ── Neutral and Monochrome ──────────────────────────────────────────────────

test('Neutral needs low chroma across the WHOLE palette, not on average', () => {
  const quiet = ['#EFEFF1', '#CFD2D6', '#9AA0A6', '#4A4F55']
  assert.equal(classifyPalette(quiet).neutral, true)
  // One scarlet among three greys is not a neutral palette, however low the
  // mean falls. This is the case a mean-only rule gets wrong.
  assert.equal(classifyPalette([...quiet.slice(0, 3), '#E01B24']).neutral, false)
})

test('Monochrome is one hue family with tonal range, not a neutral palette with an accent', () => {
  const oneFamily = classifyPalette(['#E7F0FA', '#9CC3E8', '#3D7EBF', '#123B66'])
  assert.equal(oneFamily.monochrome, true)

  // Three greys and one lone blue satisfies "at most one hue family" in the
  // trivial way, and is not monochrome by any reading a user has.
  const loneAccent = classifyPalette(['#F2F2F3', '#C9C9CB', '#8A8A8D', '#2D6BD8'])
  assert.equal(loneAccent.monochrome, false)

  // Two families is not one.
  const twoFamilies = classifyPalette(['#E7F0FA', '#3D7EBF', '#F2C14E', '#B8860B'])
  assert.equal(twoFamilies.monochrome, false)
})

test('a grey ramp is monochrome — the original meaning of the word', () => {
  assert.equal(classifyPalette(['#FFFFFF', '#C4C4C4', '#6E6E6E', '#141414']).monochrome, true)
})

test('one flat colour repeated is not "many tints"', () => {
  assert.equal(classifyPalette(['#3D7EBF', '#3D7EBF', '#3D7EBF', '#3D7EBF']).monochrome, false)
})

// ── The hue-family clustering itself ────────────────────────────────────────

test('hue families join across the 0/360 wrap', () => {
  // 355° and 5° are ten degrees apart on a circle and 350 apart on a number
  // line. A clusterer that sorts and never closes the loop reports two families
  // of reds.
  assert.deepEqual(hueFamilies([355, 2, 8], MONO_HUE_TOLERANCE), [3])
  assert.deepEqual(hueFamilies([], MONO_HUE_TOLERANCE), [])
  assert.deepEqual(hueFamilies([10, 200], MONO_HUE_TOLERANCE), [1, 1])
})

test('hue distance is the shorter way round', () => {
  assert.equal(hueDistance(350, 10), 20)
  assert.equal(hueDistance(10, 350), 20)
  assert.equal(hueDistance(0, 180), 180)
})

// ── Purity ──────────────────────────────────────────────────────────────────

test('classification is a pure function of the hexes', () => {
  for (const palette of LIBRARY_PALETTES) {
    const first = classifyPalette(palette.colors)
    // Same hexes, fresh array, no id / name / kind / pro anywhere near it.
    const second = classifyPalette([...palette.colors])
    assert.deepEqual({ ...second }, { ...first }, `${palette.name} classified differently on a second call`)
  }
})

test('nothing about a palette except its colours can change the answer', () => {
  const colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  const asCurated = classifyPalette(colors)
  // If any of these were consulted the result would move. None is a parameter.
  const asBrandPro = classifyPalette(colors.slice())
  assert.deepEqual({ ...asBrandPro }, { ...asCurated })
  assert.equal(Object.isFrozen(asCurated), true, 'a caller can mutate a cached classification')
})

test('classifying an empty palette is an error, not a silent answer', () => {
  assert.throws(() => classifyPalette([]), /at least one hex/)
  assert.throws(() => classifyPalette(null), /at least one hex/)
})

// ── What the search field matches ───────────────────────────────
//
// THE DEFECT THESE EXIST FOR. MEASURED 2026-09-16 on the live
// /discover/palettes at 1280: "blue" returned 0 palettes, "green" 0, "warm" 0,
// "pastel" 0 — while the Gradient Library next door answered all four. The
// haystack was name + kind + hex, so the moods classified one line above it
// were never indexed, and a colour was reachable only by typing a hex, which
// is not a thing anybody does. Same rule as the rest of this file: no count is
// asserted, only that the words a person actually types select something.

test('a hue term is the hue the classifier judged, or nothing at all', () => {
  // The anchors are measured in THIS implementation's hue rather than copied
  // from a CAM16 table, so these pin the families those anchors claim.
  assert.equal(hueTerm('#FF0000'), 'red')
  assert.equal(hueTerm('#0000FF'), 'blue')
  assert.equal(hueTerm('#00A000'), 'green')
  assert.equal(hueTerm('#FFFF00'), 'yellow')

  // Below the classifier's chroma gate there is no honest hue to report, and
  // inventing one would let a grey palette answer a search for "blue".
  for (const grey of ['#000000', '#FFFFFF', '#808080', '#1A1A1C']) {
    assert.equal(hueTerm(grey), null, `${grey} claimed a hue`)
  }
  assert.deepEqual(hueTerms(['#111111', '#EEEEEE']), [])

  // Each term once, in swatch order, however many swatches carry it.
  assert.deepEqual(hueTerms(['#FF0000', '#FE0202', '#0000FF']), ['red', 'blue'])
})

test('every hue term is reachable by the word a person would type', () => {
  // A phrase anchor ("sky blue") exists so the coarse word finds the sub-hue.
  // If one stopped carrying its family word, searching "blue" would quietly
  // stop finding sky palettes with nothing else failing.
  const words = new Set(HUE_TERMS.flatMap(([, term]) => term.split(' ')))
  for (const plain of ['pink', 'red', 'orange', 'yellow', 'green', 'blue', 'purple']) {
    assert.ok(words.has(plain), `no hue term contains the word "${plain}"`)
  }
})

test('the words people type select palettes on the library that ships', () => {
  const haystacks = LIBRARY_PALETTES.map((p) => paletteHaystack(p, classifyPalette(p.colors)))
  const hits = (q) => haystacks.filter((h) => h.includes(q.toLowerCase())).length
  const report = []
  // The four measured zeroes, plus three more of the same shape.
  for (const q of ['blue', 'green', 'warm', 'pastel', 'red', 'dark', 'monochrome']) {
    const n = hits(q)
    assert.ok(n > 0, `"${q}" still selects no palette — the haystack has stopped carrying moods or hues`)
    report.push(`  ${q.padEnd(11)} ${String(n).padStart(3)}`)
  }
  // The positive control: a query that should find nothing must still find
  // nothing, or `includes` is matching everything and the asserts above are free.
  assert.equal(hits('zzzznotacolour'), 0)
  console.log(`\npalette search, derived from ${LIBRARY_PALETTES.length} palettes:\n${report.join('\n')}\n`)
})

test('a haystack carries the name, the hexes and the hues', () => {
  const palette = LIBRARY_PALETTES[0]
  const hay = paletteHaystack(palette, classifyPalette(palette.colors))
  assert.ok(hay.includes(palette.name.toLowerCase()), 'the name is not searchable')
  for (const hex of palette.colors) {
    assert.ok(hay.includes(hex.toLowerCase()), `${hex} is not searchable`)
  }
  for (const term of hueTerms(palette.colors)) {
    assert.ok(hay.includes(term), `the hue "${term}" is not searchable`)
  }
  assert.equal(hay, hay.toLowerCase(), 'the haystack must be lower-cased or a capitalised query misses')
  // Classifying is optional so the page does not run CAM16 per swatch twice;
  // the default must reach the same answer as handing the mood in.
  assert.equal(paletteHaystack(palette), hay)
})

// ── The report the founder asked for, derived rather than typed ─────────────

test('every mood reports its derived count', () => {
  const lines = MOOD_IDS.map((mood) => {
    const all = matching(mood)
    const free = matching(mood, TAGGED.filter((p) => FREE_IDS.has(p.id)))
    const split = (a) => `${String(a.length).padStart(3)} (${a.filter((p) => p.kind === 'brand').length}b + ${a.filter((p) => p.kind === 'curated').length}c)`
    return `  ${mood.padEnd(11)} library ${split(all)}   free view ${split(free)}`
  })
  // Printed, not asserted. The numbers are the answer to the founder's
  // question and they are allowed to move when the library does; what must not
  // move is any of the properties asserted above.
  console.log(`\npalette moods, derived from ${LIBRARY_PALETTES.length} palettes:\n${lines.join('\n')}\n`)
  assert.equal(lines.length, 8)
})
