// A brand palette asserts a fact about someone ELSE's brand. A wrong hex is a
// small lie the product tells confidently, on a page whose whole purpose is
// colour accuracy, in an app that also ships a contrast checker.
//
// The 2026-09-04 audit found two distinct failures, and this file exists so
// neither can come back quietly:
//
//   1. STALE VALUES. Seven rows carried hexes their owners had already retired —
//      Spotify's pre-2015 green, Airbnb's pre-refresh Rausch, LEGO's red AND
//      yellow (both wrong against LEGO's own logo SVG), GitHub's pre-Primer
//      neutral, PayPal's two old blues, and Material 3's superseded surface
//      pair. Every one of them is still the FIRST hit on a colour-aggregator
//      site, so the natural way to "check" a value re-introduces it.
//
//   2. A NAME THAT PROMISED THE WRONG THING. `material` was labelled
//      "Material (Google)" and held Material 3's default purple. The hexes were
//      right; the label was not. Nobody reading "Google" expects purple — they
//      expect the four-colour logo. A row named after a COMPANY must hold that
//      company's identity colours, not one of its products' design systems.
//
// So this test does NOT restate the file — a test that lists all 37 rows and
// asserts they equal themselves can never fail for a reason worth knowing.
// It asserts the POLICY the audit established: retired values stay retired, the
// company/product distinction holds, the palette shape is uniform, and the free
// set (a founder pricing decision, not a data detail) cannot drift.
import test from 'node:test'
import assert from 'node:assert/strict'

import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'

const byId = id => BRAND_PALETTES.find(b => b.id === id)

// ── Shape ───────────────────────────────────────────────────────────────────
// paletteLibrary.js maps every row into the library card shape and the Palette
// Builder paints `colors` straight into five swatch elements. A short row
// renders a gap; a lowercase or 3-digit hex still paints, so neither failure is
// visible in review.
test('every brand row is a uniform 5-swatch entry with uppercase 6-digit hexes', () => {
  assert.ok(BRAND_PALETTES.length > 0, 'no brand palettes')
  for (const b of BRAND_PALETTES) {
    assert.match(b.id, /^[a-z0-9-]+$/, `${b.id}: id must be lowercase kebab (it namespaces the likes key)`)
    assert.ok(b.name && b.name.trim() === b.name, `${b.id}: name missing or padded`)
    assert.equal(typeof b.free, 'boolean', `${b.id}: free must be a boolean`)
    assert.equal(b.colors.length, 5, `${b.id}: expected 5 colours, got ${b.colors.length}`)
    for (const c of b.colors) {
      assert.match(c, /^#[0-9A-F]{6}$/, `${b.id}: ${c} must be an uppercase 6-digit hex`)
    }
  }
})

test('brand ids are unique', () => {
  const ids = BRAND_PALETTES.map(b => b.id)
  assert.deepEqual([...new Set(ids)].sort(), [...ids].sort(), 'duplicate brand id')
})

// ── The founder's pricing decision ──────────────────────────────────────────
// Which rows are free is a pricing call, not a data detail, and `free` is one
// keystroke from flipping in a file that gets edited for colour reasons. Pin the
// SET, so giving a brand away (or taking one back) has to be deliberate.
test('the free brand set is exactly the six the founder chose', () => {
  const free = BRAND_PALETTES.filter(b => b.free).map(b => b.id).sort()
  assert.deepEqual(free, ['apple', 'discord', 'material', 'netflix', 'spotify', 'stripe'])
})

// ── Retired values stay retired ─────────────────────────────────────────────
// Each of these was in the file on 2026-09-03 and is wrong. They are listed with
// the value that replaced them so a reverting diff is self-explaining.
const RETIRED = [
  ['#1DB954', '#1ED760', 'Spotify green, pre-2015'],
  ['#FF5A5F', '#FF385C', 'Airbnb Rausch, pre-refresh'],
  ['#D01012', '#E3000B', 'LEGO red — never a LEGO published value'],
  ['#FFCF00', '#FFED00', 'LEGO yellow — never a LEGO published value'],
  ['#24292F', '#1F2328', 'GitHub neutral, pre-Primer-primitives'],
  ['#2DA44E', '#1F883D', 'GitHub green, superseded Primer generation'],
  ['#009CDE', '#0070E0', 'PayPal light blue, retired'],
  ['#0070BA', '#001C64', 'PayPal blue, retired'],
  ['#FFFBFE', '#FEF7FF', 'M3 surface — Neutral99, but the role maps to Neutral98'],
  ['#1C1B1F', '#1D1B20', 'M3 on-surface — not the current Neutral10'],
  ['#FBBC05', '#FBBC04', 'Google yellow, superseded'],
]

test('no retired brand hex reappears anywhere in the file', () => {
  const live = new Set(BRAND_PALETTES.flatMap(b => b.colors))
  for (const [dead, replacement, why] of RETIRED) {
    assert.ok(
      !live.has(dead),
      `${dead} is back (${why}). The current value is ${replacement}. ` +
      'Colour-aggregator sites still publish the dead one — check the brand\'s own asset.',
    )
  }
})

// LEGO's black is scoped rather than global: #000000 is a legitimate value in
// nine other rows, so it cannot go in the blocklist above.
test('LEGO carries the colours from LEGO\'s own logo SVG', () => {
  const lego = byId('lego')
  assert.ok(lego.colors.includes('#E3000B'), 'LEGO red must be #E3000B (lego.com logo SVG)')
  assert.ok(lego.colors.includes('#FFED00'), 'LEGO yellow must be #FFED00 (lego.com logo SVG)')
  assert.ok(!lego.colors.includes('#000000'), 'LEGO\'s black is #181716 in its own logo, not #000000')
})

// ── Company vs product ──────────────────────────────────────────────────────
// The original defect, stated as an invariant: whatever row claims to be Google
// must look like Google.
test('a row named for Google holds Google\'s logo colours, not Material\'s purple', () => {
  const M3_PURPLE = '#6750A4'
  for (const b of BRAND_PALETTES) {
    if (/google/i.test(b.name)) {
      assert.ok(
        !b.colors.includes(M3_PURPLE),
        `${b.id} is named "${b.name}" but carries Material 3's baseline purple ${M3_PURPLE}. ` +
        'Material 3 is a design system Google publishes; it is not Google\'s brand palette.',
      )
    }
  }

  const google = byId('google')
  assert.ok(google, 'the `google` row is missing — Google\'s four logo colours are the palette users expect')
  for (const c of ['#4285F4', '#EA4335', '#FBBC04', '#34A853']) {
    assert.ok(google.colors.includes(c), `Google palette must include ${c}`)
  }

  // And the design-system row must keep the M3 hexes it is named for.
  const material = byId('material')
  assert.ok(material.colors.includes(M3_PURPLE), 'Material 3 Baseline must keep its primary')
  assert.ok(!/google/i.test(material.name), 'do not re-attach "Google" to the Material row')
})

// A parenthetical in a name is how the original defect looked ("Material
// (Google)"): it attaches an owner to something that is not the owner's
// identity. One is legitimate — X is genuinely the company formerly called
// Twitter, which is a rename, not an owner. Pin the set so a new parenthetical
// has to be argued for rather than pasted in.
test('parenthetical brand names are limited to the one justified case', () => {
  const parenthetical = BRAND_PALETTES.filter(b => b.name.includes('(')).map(b => b.name).sort()
  assert.deepEqual(
    parenthetical,
    ['X (Twitter)'],
    'A new "Product (Company)" name is the exact shape of the Material (Google) defect. ' +
    'If the row is a design system, name it after the design system.',
  )
})
