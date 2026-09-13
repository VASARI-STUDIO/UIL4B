// Palette Builder column titles.
//
// REGRESSION GUARD: each board column was titled with a hard-coded positional
// role (`ROLES[i]` → PRIMARY / SECONDARY / ACCENT / SUBTLE / DEEP). That names
// a SLOT, not a colour, so switching the colour system left "SUBTLE" sitting
// over a colour that was nothing of the kind — the founder's report. The title
// is now derived from the colour itself.
//
// Two properties have to hold together, and they pull in opposite directions:
//   1. a title must TRACK the colour — change the colour, change the title;
//   2. a title must be DETERMINISTIC — the same colour always yields the same
//      title, so nothing churns on a re-render that changed nothing.
// A random generator satisfies (1) and fails (2); a fixed label satisfies (2)
// and fails (1). These tests assert both.
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateHarmony } from '../../src/utils/colors.js'
import {
  NAME_MOVEMENTS, NAME_THEMES, colorName, colorTheme, paletteColorNames, paletteTheme, themeForHue,
  randomPaletteName,
} from '../../src/utils/paletteNames.js'

/** Assert a title is built from the named theme's own two banks. */
function assertFromTheme(name, themeId, why) {
  const theme = NAME_THEMES[themeId]
  const [adj, noun] = name.split(' ')
  assert.ok(
    [...theme.adj, ...NAME_MOVEMENTS].includes(adj),
    `${why}: "${adj}" is not a ${themeId} adjective`,
  )
  assert.ok(
    [...theme.noun, ...theme.solo].includes(noun),
    `${why}: "${noun}" is not a ${themeId} noun`,
  )
}

// A monochromatic grey ramp — the founder's own example ("when I set it to
// mono, the subtle swatch isn't what it's showing").
const GREYS = ['#F2F1EF', '#C9C6C1', '#8E8B86', '#59565222', '#2B2A28'].map(c => c.slice(0, 7))
const GREENS = ['#03945A', '#0B6E45', '#23FBA4', '#095D3B', '#013E26']
const BLUES = ['#1E788F', '#267CC9', '#5881DA', '#1B4F8A', '#0E3358']

test('the same colour always yields the same title', () => {
  for (const hex of [...GREYS, ...GREENS, ...BLUES]) {
    const first = colorName(hex)
    for (let i = 0; i < 25; i++) assert.equal(colorName(hex), first)
  }
})

test('a title is a function of the colour, not of its slot', () => {
  const forward = paletteColorNames(GREENS)
  const reversed = paletteColorNames([...GREENS].reverse())
  assert.deepEqual(reversed, [...forward].reverse())
})

test('hex casing and the # prefix do not change the title', () => {
  assert.equal(colorName('#03945a'), colorName('#03945A'))
  assert.equal(colorName('03945A'), colorName('#03945A'))
})

test('changing the colour changes the title', () => {
  // Every colour in a system switch that actually moved must be re-titled.
  const before = paletteColorNames(GREENS)
  const after = paletteColorNames(BLUES)
  assert.equal(before.length, after.length)
  for (let i = 0; i < before.length; i++) {
    assert.notEqual(after[i], before[i], `slot ${i} kept a stale title`)
  }
})

test('a colour that did NOT move keeps its title through a system change', () => {
  // Slot 0 is the seed: a system change regenerates around it, so its title
  // must be stable while the rest are rewritten. That is the difference
  // between "tracks the colour" and "reshuffles".
  const before = paletteColorNames([GREENS[0], ...GREENS.slice(1)])
  const after = paletteColorNames([GREENS[0], ...BLUES.slice(1)])
  assert.equal(after[0], before[0])
  for (let i = 1; i < after.length; i++) assert.notEqual(after[i], before[i])
})

test('a grey is titled from the mono vocabulary', () => {
  for (const hex of ['#F2F1EF', '#C9C6C1', '#8E8B86', '#5A5854', '#2B2A28']) {
    assert.equal(colorTheme(hex), 'mono', `${hex} should be mono`)
    assertFromTheme(colorName(hex), 'mono', hex)
  }
})

test('a colour is titled from its OWN theme, not the palette average', () => {
  // This is the whole bug: a green swatch in a mostly-blue palette must be
  // titled from the green vocabulary.
  assert.equal(colorTheme('#03945A'), 'nature')
  assert.equal(colorTheme('#267CC9'), 'ocean')
  assert.equal(colorTheme('#B4451F'), 'sunset')
  assertFromTheme(colorName('#03945A'), 'nature', '#03945A')
  assertFromTheme(colorName('#267CC9'), 'ocean', '#267CC9')
  assertFromTheme(colorName('#B4451F'), 'sunset', '#B4451F')
})

test('a single colour reads its exact hue, a palette votes in bins', () => {
  // paletteTheme aggregates several colours (30° bins, chroma-weighted votes);
  // colorTheme has nobody to out-vote, so it must not round the hue at all.
  assert.equal(paletteTheme(GREENS), 'nature')
  // THE POINT: a colour keeps its own vocabulary even when the palette it sits
  // in votes for a different one. The whole-palette bucket is a summary; a
  // column title is not.
  const mixed = ['#267CC9', '#5881DA', '#868CEE', '#03945A', '#0E3358']
  assert.notEqual(colorTheme('#03945A'), paletteTheme(mixed))
  assert.equal(colorTheme('#03945A'), 'nature')
  // …and a hue right on a bucket boundary is read where it actually falls,
  // not where a 30° bin would round it to.
  assert.equal(colorTheme('#23FBA4'), 'nature')   // HCT hue 160.9
})

test('an unreadable colour degrades to a mono title instead of throwing', () => {
  for (const junk of [null, undefined, '', 'not-a-colour', '#zzzzzz']) {
    const name = colorName(junk)
    assert.equal(typeof name, 'string')
    assert.ok(name.length > 0)
    assertFromTheme(name, 'mono', String(junk))
  }
})

test('a real system switch re-titles every column whose colour moved', () => {
  // The founder's exact gesture, on the real engine: an analogous board
  // switched to Monochromatic. Slot 0 is the seed and does not move, so it
  // must keep its title; every other slot must be re-titled.
  const seed = '#4338E0'
  const before = generateHarmony(seed, 'analogous')
  const after = generateHarmony(seed, 'monochromatic')
  const namesBefore = paletteColorNames(before)
  const namesAfter = paletteColorNames(after)

  let moved = 0
  for (let i = 0; i < before.length; i++) {
    if (before[i].toUpperCase() === after[i].toUpperCase()) {
      assert.equal(namesAfter[i], namesBefore[i], `slot ${i} was re-titled without changing colour`)
    } else {
      assert.notEqual(namesAfter[i], namesBefore[i], `slot ${i} kept a title describing the old colour`)
      moved++
    }
  }
  assert.ok(moved >= 3, 'the system switch should move most of the board')
})

test('the name space is wide enough that a re-title is not left to luck', () => {
  // 16 adjectives × 18 nouns per theme. If either bank ever shrinks back, a
  // system switch starts leaving stale-looking titles behind — which is
  // exactly the bug this module replaced.
  for (const [id, theme] of Object.entries(NAME_THEMES)) {
    const space = (theme.adj.length + NAME_MOVEMENTS.length) * (theme.noun.length + theme.solo.length)
    assert.ok(space >= 250, `${id} has only ${space} possible titles`)
  }
  // …and the hash actually spreads across it rather than clustering.
  const names = new Set()
  for (let r = 0; r < 256; r++) {
    for (let g = 0; g < 256; g += 51) names.add(colorName(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}80`))
  }
  assert.ok(names.size > 300, `only ${names.size} distinct titles across 1280 colours`)
})

test('the community-submit dice name stays deliberately random', () => {
  // Same vocabulary, opposite contract: this one is a re-roll button. If it
  // ever became deterministic the dice would stop working.
  const rolls = new Set()
  for (let i = 0; i < 200; i++) rolls.add(randomPaletteName(GREENS))
  assert.ok(rolls.size > 1, 'the dice must produce more than one name')
})

// ── The hue families are cut on HCT, not on sRGB ───────────────────────────
//
// REGRESSION GUARD, founder report 2026-09-13: "Bauhaus Mulberry" was sitting
// on #97ADCD, a pale blue. Mulberry is in the `cosmic` (purple) bank. The cause
// was that `themeForHue`'s boundaries were spaced for an sRGB hue wheel while
// every caller feeds it an HCT hue, and the two are rotated by up to 45° in the
// blues — so ordinary blues landed past the ocean/cosmic cut and were titled as
// purples, purples landed past the cosmic/candy cut and were titled as pinks,
// and muted reds fell into the all-green `nature` bank.
//
// These are the exact hexes from the report and from the rendered board, with
// the family each one visibly belongs to. They are asserted as FAMILIES, not as
// finished titles: which word a colour draws inside its own bank is the hash's
// business and must stay free to change.
test('a colour is titled from the vocabulary of its own HUE FAMILY', () => {
  const cases = [
    ['#97ADCD', 'ocean', 'a pale blue — the founder\u2019s "Bauhaus Mulberry"'],
    ['#3558B9', 'ocean', 'a royal blue'],
    ['#405C9D', 'ocean', 'a slate blue'],
    ['#25619B', 'ocean', 'a mid blue'],
    ['#006B5E', 'ocean', 'a deep teal'],
    ['#72518A', 'cosmic', 'a muted purple'],
    ['#904C2A', 'sunset', 'a burnt orange'],
    ['#A03C4C', 'sunset', 'a brick red'],
    ['#436828', 'nature', 'a leaf green'],
    ['#54651F', 'nature', 'an olive'],
    ['#918F9C', 'mono', 'a near-grey'],
  ]
  // POSITIVE CONTROL. If `colorTheme` ever returned one constant for
  // everything, every row below would still pass against that constant — so
  // prove first that the cases actually discriminate.
  const families = new Set(cases.map(([, family]) => family))
  assert.ok(families.size >= 4, `the cases only cover ${families.size} families`)

  for (const [hex, family, why] of cases) {
    assert.equal(colorTheme(hex), family, `${hex} (${why}) belongs to ${family}`)
    assertFromTheme(colorName(hex), family, `${hex} (${why})`)
  }
})

test('the HCT hue wheel is walked without a family being skipped', () => {
  // The cuts are only right if each one is actually reachable. A boundary typo
  // that swallowed a neighbour (`h < 290` written as `h < 390`, say) would
  // leave a family with no colour that can reach it, and every test above would
  // still pass. Walk the wheel and require all five chromatic families.
  const seen = new Set()
  for (let h = 0; h < 360; h += 2) seen.add(themeForHue(h, 45, true))
  for (const family of ['sunset', 'nature', 'ocean', 'cosmic']) {
    assert.ok(seen.has(family), `no hue on the wheel reaches "${family}"`)
  }
  // And the grey gate still wins over any hue.
  assert.equal(themeForHue(200, 4, false), 'mono')
})
