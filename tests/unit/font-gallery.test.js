import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterGalleryTypefaces, filterPickableTypefaces, isGalleryTypeface, isPickableTypeface,
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
