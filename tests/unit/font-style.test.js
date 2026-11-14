import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FONT_STYLES,
  duplicateStyleFamilies,
  listedStyleFamilies,
  fontStyleOf,
  matchesFontStyle,
  fontStyleCounts,
  fontStyleLabel,
} from '../../src/utils/fontStyles.js'

const catalogue = JSON.parse(readFileSync(new URL('../../public/data/font-catalogue.json', import.meta.url), 'utf8')).fonts
const byFamily = new Map(catalogue.map((f) => [f.family.toLowerCase(), f]))
const font = (family) => byFamily.get(family.toLowerCase())

test('no family is listed under two styles', () => {
  assert.deepEqual(duplicateStyleFamilies(), [])
})

test('every listed family is in the catalogue under its style\'s category', () => {
  const wrong = listedStyleFamilies().filter(({ family, category }) => font(family)?.category !== category)
  assert.deepEqual(wrong.map((w) => w.family), [])
})

test('every listed family resolves to the style it is listed under', () => {
  for (const { family, style } of listedStyleFamilies()) assert.equal(fontStyleOf(font(family)), style, family)
})

test('known families take the expected style', () => {
  assert.equal(fontStyleOf(font('Inter')), 'grotesque')
  assert.equal(fontStyleOf(font('Playfair Display')), 'modern')
  assert.equal(fontStyleOf(font('Montserrat')), 'geometric')
  assert.equal(fontStyleOf(font('EB Garamond')), 'old-style')
})

test('a family outside the style\'s category is not claimed', () => {
  // Roboto Slab and Comfortaa are not in a style list; a name word does not pull them in.
  assert.equal(fontStyleOf(font('Roboto Slab')), '')
  assert.equal(fontStyleOf(font('Comfortaa')), '')
  assert.equal(fontStyleOf({ family: 'Something Rounded', category: 'display' }), '')
  assert.equal(fontStyleOf({ family: 'Something Rounded', category: 'sans-serif' }), 'rounded')
})

test('bad input has no style', () => {
  assert.equal(fontStyleOf(null), '')
  assert.equal(fontStyleOf({}), '')
})

test('"any" and an empty style pass every font', () => {
  for (const f of catalogue.slice(0, 50)) {
    assert.ok(matchesFontStyle(f, 'any'))
    assert.ok(matchesFontStyle(f, ''))
  }
  assert.ok(matchesFontStyle(font('Inter'), 'grotesque'))
  assert.ok(!matchesFontStyle(font('Inter'), 'geometric'))
})

test('counts cover every style and match the filter', () => {
  const counts = fontStyleCounts(catalogue)
  assert.deepEqual(Object.keys(counts).sort(), FONT_STYLES.map((s) => s.id).sort())
  for (const s of FONT_STYLES) {
    assert.ok(counts[s.id] > 0, s.id)
    assert.equal(counts[s.id], catalogue.filter((f) => matchesFontStyle(f, s.id)).length, s.id)
  }
  assert.deepEqual(fontStyleCounts(undefined), Object.fromEntries(FONT_STYLES.map((s) => [s.id, 0])))
})

test('labels', () => {
  assert.equal(fontStyleLabel('old-style'), 'Old style')
  assert.equal(fontStyleLabel('any'), 'Any')
  assert.equal(fontStyleLabel('nope'), 'Any')
})
