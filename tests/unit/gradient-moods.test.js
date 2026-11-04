// Which gradient rows and moods a viewer's tier can open, and the gallery's
// shared mood + type facet. These run the module, not its source text.
import test from 'node:test'
import assert from 'node:assert/strict'
import { openGradientRows, openMoods, matchesGradientFacets } from '../../src/utils/gradientMoods.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const full = (id, tags, type = 'Linear') => ({
  id, name: id, type, angle: 90, stops: [{ color: '#000000', position: 0 }, { color: '#FFFFFF', position: 100 }], tags,
})
// A row past the free bundle: name and slot count only, no tags and no stops.
const stub = (id) => ({ id, name: id, slots: 2 })

// 14 rows: the first ten are full, the last four are stubs. Moods are placed so
// each tier's reach differs: row 0-2 (anonymous) warm/light, row 3-9 (free) add
// dark/cool, and only a stub would carry "neon".
const ROWS = [
  full('a', ['warm', 'vivid']),
  full('b', ['warm']),
  full('c', ['light']),
  full('d', ['dark']),
  full('e', ['cool']),
  full('f', ['cool', 'pastel']),
  full('g', ['pastel']),
  full('h', ['vivid']),
  full('i', ['dark']),
  full('j', ['light']),
  stub('k'), stub('l'), stub('m'), stub('n'),
]
const MOODS = ['warm', 'cool', 'dark', 'light', 'pastel', 'vivid', 'neon']

test('the tier caps are the ones these fixtures assume', () => {
  assert.equal(GALLERY_TIER_LIMITS.anonymous, 3)
  assert.equal(GALLERY_TIER_LIMITS.free, 10)
})

test('anonymous opens the first rows in order, free opens ten, pro opens all of them', () => {
  assert.deepEqual(openGradientRows(ROWS, 'anonymous').map((g) => g.id), ['a', 'b', 'c'])
  assert.deepEqual(openGradientRows(ROWS, 'free').map((g) => g.id), 'abcdefghij'.split(''))
  assert.equal(openGradientRows(ROWS, 'pro'), ROWS)
})

test('an unknown tier gets the tightest cap, and a non-array library is empty', () => {
  assert.equal(openGradientRows(ROWS, 'mystery').length, 3)
  assert.deepEqual(openGradientRows(null, 'free'), [])
  assert.deepEqual(openGradientRows(undefined, 'pro'), [])
})

test('open rows are the library rows themselves, not copies that gain fields', () => {
  for (const g of openGradientRows(ROWS, 'free')) assert.ok(ROWS.includes(g))
})

test('openMoods: anonymous sees only the moods its three rows carry, in the order asked', () => {
  assert.deepEqual(openMoods(ROWS, 'anonymous', MOODS), ['warm', 'light', 'vivid'])
})

test('openMoods: free sees the moods of ten rows, and a mood only a stub could carry is out', () => {
  assert.deepEqual(openMoods(ROWS, 'free', MOODS), ['warm', 'cool', 'dark', 'light', 'pastel', 'vivid'])
})

test('openMoods: pro keeps every mood it is asked about, and returns a copy', () => {
  const asked = ['warm', 'neon']
  const got = openMoods(ROWS, 'pro', asked)
  assert.deepEqual(got, asked)
  assert.notEqual(got, asked)
})

test('openMoods: stub rows with no tags never throw and never match', () => {
  const stubs = [stub('x'), stub('y'), stub('z')]
  assert.deepEqual(openMoods(stubs, 'free', MOODS), [])
  assert.deepEqual(openMoods([], 'anonymous', MOODS), [])
  assert.deepEqual(openMoods([{ id: 'odd', tags: 'warm' }], 'free', ['warm']), [], 'tags must be an array')
})

test('matchesGradientFacets: "all" tag and "all" type let anything through, stubs included', () => {
  assert.equal(matchesGradientFacets(full('a', ['warm']), 'all', ['all']), true)
  assert.equal(matchesGradientFacets(stub('k'), 'all', ['all']), true)
})

test('matchesGradientFacets: a mood needs the tag, and a stub with no tags fails it', () => {
  assert.equal(matchesGradientFacets(full('a', ['warm', 'vivid']), 'vivid', ['all']), true)
  assert.equal(matchesGradientFacets(full('a', ['warm']), 'cool', ['all']), false)
  assert.equal(matchesGradientFacets(stub('k'), 'warm', ['all']), false)
})

test('matchesGradientFacets: types are any-of, and mood and type must both hold', () => {
  const radial = full('r', ['cool'], 'Radial')
  assert.equal(matchesGradientFacets(radial, 'all', ['Linear', 'Radial']), true)
  assert.equal(matchesGradientFacets(radial, 'all', ['Linear']), false)
  assert.equal(matchesGradientFacets(radial, 'cool', ['Radial']), true)
  assert.equal(matchesGradientFacets(radial, 'warm', ['Radial']), false)
  assert.equal(matchesGradientFacets(radial, 'cool', ['Linear']), false)
})
