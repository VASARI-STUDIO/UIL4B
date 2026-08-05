import test from 'node:test'
import assert from 'node:assert/strict'
import { filterGalleryTypefaces, isGalleryTypeface } from '../../src/utils/fontGallery.js'

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
