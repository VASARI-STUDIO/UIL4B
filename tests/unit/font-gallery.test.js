import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  filterGalleryTypefaces, filterPickableTypefaces, formatSubsets, isGalleryTypeface,
  isPickableTypeface, ladderWeights, weightName,
} from '../../src/utils/fontGallery.js'

const font = (family, category = 'sans-serif', subsets = ['latin']) => ({
  family,
  category,
  subsets,
  variants: [400, 700],
})

test('the gallery keeps readable serif, sans, display and script families', () => {
  for (const candidate of [
    font('Lora', 'serif'),
    font('Inter'),
    font('Fraunces', 'display'),
    font('Caveat', 'handwriting'),
  ]) {
    assert.equal(isGalleryTypeface(candidate), true, candidate.family)
  }
})

test('the gallery excludes code, emoji, icon and symbol families', () => {
  const excluded = [
    font('JetBrains Mono', 'monospace'),
    font('Source Code Pro', 'monospace'),
    font('Noto Color Emoji'),
    font('Material Symbols Rounded'),
    font('Libre Barcode 39', 'display'),
    font('Noto Sans Math', 'sans-serif', ['math']),
    font('Noto Music', 'sans-serif', ['music']),
  ]

  assert.deepEqual(filterGalleryTypefaces(excluded), [])
})

test('gallery filtering tolerates malformed catalogue entries', () => {
  assert.deepEqual(filterGalleryTypefaces([null, {}, font('Lora', 'serif')]), [font('Lora', 'serif')])
  assert.deepEqual(filterGalleryTypefaces(null), [])
})

// ── The PICKER filter is deliberately looser than the gallery filter ─────────
// The gallery curates what is worth browsing. A picker has to offer anything a
// designer might legitimately choose, and only exclude what cannot render a
// specimen at all.

test('the picker keeps monospace, which the curated gallery drops', () => {
  // The distinction that matters: a mono body face is a real design choice, so
  // excluding it from a PICKER removes a legitimate option rather than noise.
  const mono = font('JetBrains Mono', 'monospace')
  assert.equal(isGalleryTypeface(mono), false, 'the gallery still curates mono out')
  assert.equal(isPickableTypeface(mono), true, 'but the picker must still offer it')
  assert.equal(isPickableTypeface(font('Roboto Mono', 'monospace')), true)
})

test('the picker still excludes families that cannot render a specimen', () => {
  // These would draw the preview word as a row of boxes, which reads as a
  // rendering fault rather than as a typeface the user would not want.
  const excluded = [
    font('Noto Color Emoji'),
    font('Material Symbols Rounded'),
    font('Material Icons'),
    font('Libre Barcode 39', 'display'),
    font('Noto Sans Math', 'sans-serif', ['math']),
    font('Noto Music', 'sans-serif', ['music']),
  ]
  assert.deepEqual(filterPickableTypefaces(excluded), [])
})

test('the picker keeps the ordinary text families and tolerates bad entries', () => {
  const keep = [font('Lora', 'serif'), font('Inter'), font('Caveat', 'handwriting')]
  assert.deepEqual(filterPickableTypefaces([null, {}, ...keep]), keep)
  assert.deepEqual(filterPickableTypefaces(null), [])
})

/* ── The full-width specimen row's own data (font-gallery-one-per-row) ────── */

test('the weight ladder keeps both ends and samples the middle evenly', () => {
  // Nine weights is the widest a Google family goes, and it is the case the
  // cap exists for: five drawn cuts, with thin and black both kept.
  assert.deepEqual(ladderWeights([100, 200, 300, 400, 500, 600, 700, 800, 900]), [100, 300, 500, 700, 900])
  // A gappy real family (Roboto). Still five, still both ends.
  assert.deepEqual(ladderWeights([100, 300, 400, 500, 700, 900]), [100, 300, 500, 700, 900])
  // At or under the cap nothing is dropped — a two-weight family shows two.
  assert.deepEqual(ladderWeights([400, 700]), [400, 700])
  assert.deepEqual(ladderWeights([300, 400, 500, 600, 700]), [300, 400, 500, 600, 700])
  assert.deepEqual(ladderWeights([400]), [400])
})

test('the ladder never names a weight the family does not ship', () => {
  // The reason the cap exists at all: every numeral is loaded and painted in
  // its OWN cut, so a value absent from `variants` must never reach the row —
  // it would be drawn in the nearest weight that did load and lie about it.
  const variants = [200, 400, 900]
  assert.deepEqual(ladderWeights(variants), variants)
  for (const w of ladderWeights([100, 250, 400, 725, 900], 3)) {
    assert.ok([100, 250, 400, 725, 900].includes(w), `${w} is not a shipped cut`)
  }
  // Unsorted, duplicated and junk input still yields a sorted, unique subset.
  assert.deepEqual(ladderWeights([700, 400, 400, null, 'x', 100]), [100, 400, 700])
  assert.deepEqual(ladderWeights(null), [])
  assert.deepEqual(ladderWeights([]), [])
})

test('the ladder honours a smaller cap without losing the extremes', () => {
  assert.deepEqual(ladderWeights([100, 200, 300, 400, 500, 600, 700, 800, 900], 2), [100, 900])
  assert.deepEqual(ladderWeights([100, 200, 300, 400, 500, 600, 700, 800, 900], 3), [100, 500, 900])
  assert.deepEqual(ladderWeights([100, 200, 300], 1), [100])
})

test('subsets become script names a reader can act on, not a count', () => {
  assert.deepEqual(
    formatSubsets(['latin', 'latin-ext', 'cyrillic', 'vietnamese']),
    ['Latin', 'Latin Extended', 'Cyrillic', 'Vietnamese'],
  )
  // The hyphenated ids that have a real name, and the generic title-casing that
  // catches the ones that do not.
  assert.deepEqual(formatSubsets(['chinese-simplified']), ['Chinese (Simplified)'])
  assert.deepEqual(formatSubsets(['greek-ext']), ['Greek Extended'])
  assert.deepEqual(formatSubsets(['tamil']), ['Tamil'])
  // Duplicates, casing and junk: a specimen must not list "Latin, Latin".
  assert.deepEqual(formatSubsets(['latin', 'LATIN', ' latin ']), ['Latin'])
  assert.deepEqual(formatSubsets([null, 5, '', 'latin']), ['Latin'])
  assert.deepEqual(formatSubsets(undefined), [])
})

test('weights are named the way a font menu names them', () => {
  assert.equal(weightName(400), 'Regular')
  assert.equal(weightName(600), 'SemiBold')
  assert.equal(weightName(900), 'Black')
  // An off-scale value gets no invented name rather than a wrong one.
  assert.equal(weightName(450), '')
  assert.equal(weightName(undefined), '')
})

// ── The picker's category tray must reach the picker's corpus ───────────────
//
// `filterPickableTypefaces` deliberately KEEPS monospace (there is a test above
// saying exactly that), but FontBrowseDialog's tray offered All/Sans/Serif/
// Display/Script and no Mono chip. 51 families were served by the corpus,
// hidden by every non-"All" chip, and reachable only by typing a name you
// already knew — in the one dialog built specifically to end remember-and-type
// selection.
//
// The corpus contract and the tray were tested separately and were each
// individually correct, which is how the gap survived. This asserts the
// RELATIONSHIP between them.
//
// COMMENTS ARE STRIPPED FIRST. The rationale comment now above CATS contains
// the word 'monospace', so a grep over the raw file passes even with the chip
// deleted; the assertion has to see code, not prose.
const pickerChipIds = () => {
  const raw = readFileSync(
    new URL('../../src/components/FontBrowseDialog.jsx', import.meta.url),
    'utf8',
  )
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
  const block = code.match(/const CATS\s*=\s*\[([\s\S]*?)\n\]/)
  assert.ok(block, 'CATS array not found in FontBrowseDialog source')
  return [...block[1].matchAll(/id:\s*'([^']+)'/g)].map(m => m[1])
}

test('every category the picker can serve has a chip that reaches it', () => {
  const chipIds = pickerChipIds()
  assert.ok(chipIds.includes('all'), 'the tray needs an unfiltered option')

  // Every Google Fonts category that survives the pickable filter.
  const servable = ['sans-serif', 'serif', 'display', 'handwriting', 'monospace']
  const sampleFor = {
    'sans-serif': font('Inter', 'sans-serif'),
    serif: font('Lora', 'serif'),
    display: font('Fraunces', 'display'),
    handwriting: font('Caveat', 'handwriting'),
    monospace: font('JetBrains Mono', 'monospace'),
  }

  for (const category of servable) {
    assert.equal(
      isPickableTypeface(sampleFor[category]), true,
      `${category} should be in the picker corpus`,
    )
    assert.ok(
      chipIds.includes(category),
      `the picker serves ${category} families but no chip filters to them`,
    )
  }

  // And nothing the tray filters by is missing from the corpus — a chip that
  // can only ever return an empty grid is its own defect.
  for (const id of chipIds.filter(c => c !== 'all')) {
    assert.ok(
      servable.includes(id),
      `the tray offers a "${id}" chip for a category the corpus never contains`,
    )
  }
})
