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
// each tier's reach differs: the first rows (anonymous) carry warm, light and
// dark, the rest of the free rung's ten add cool and pastel, and only a stub would
// carry "neon".
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

// The caps come from the module, so a change to a cap moves what is expected
// here instead of breaking the fixture. The fixture does need room: the free rung
// inside the full rows, and a free rung that reaches a mood the anonymous one
// does not.
const ANON = GALLERY_TIER_LIMITS.anonymous
const FREE = GALLERY_TIER_LIMITS.free
const moodsOf = (rows) => MOODS.filter((m) => rows.some((r) => (r.tags || []).includes(m)))

test('the tier caps leave this fixture something to tell the rungs apart by', () => {
  assert.ok(ANON < FREE, 'the ladder climbs')
  assert.ok(FREE <= ROWS.filter((g) => g.tags).length, 'the free rung stays inside the full rows')
  assert.ok(moodsOf(ROWS.slice(0, FREE)).length > moodsOf(ROWS.slice(0, ANON)).length,
    'the free rung opens a mood the anonymous one does not')
})

test('anonymous opens the first rows in order, free opens its own cap, pro opens all of them', () => {
  assert.deepEqual(openGradientRows(ROWS, 'anonymous').map((g) => g.id), ROWS.slice(0, ANON).map((g) => g.id))
  assert.deepEqual(openGradientRows(ROWS, 'free').map((g) => g.id), ROWS.slice(0, FREE).map((g) => g.id))
  assert.equal(openGradientRows(ROWS, 'pro'), ROWS)
})

test('an unknown tier gets the tightest cap, and a non-array library is empty', () => {
  assert.equal(openGradientRows(ROWS, 'mystery').length, ANON)
  assert.deepEqual(openGradientRows(null, 'free'), [])
  assert.deepEqual(openGradientRows(undefined, 'pro'), [])
})

test('open rows are the library rows themselves, not copies that gain fields', () => {
  for (const g of openGradientRows(ROWS, 'free')) assert.ok(ROWS.includes(g))
})

test('openMoods: anonymous sees only the moods its rows carry, in the order asked', () => {
  const got = openMoods(ROWS, 'anonymous', MOODS)
  assert.deepEqual(got, moodsOf(ROWS.slice(0, ANON)))
  assert.ok(got.length > 0 && got.length < MOODS.length)
})

test('openMoods: free sees the moods of its rows, and a mood only a stub could carry is out', () => {
  const got = openMoods(ROWS, 'free', MOODS)
  assert.deepEqual(got, moodsOf(ROWS.slice(0, FREE)))
  assert.ok(!got.includes('neon'))
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
