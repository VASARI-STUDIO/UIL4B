// The icon search's synonym hint (src/data/iconSynonyms.js). Data only, so the
// real module runs under node:test.

import test from 'node:test'
import assert from 'node:assert/strict'
import { ICON_SYNONYM_PAIRS, iconSynonymFor } from '../../src/data/iconSynonyms.js'

test('the headline pairs work in both directions', () => {
  assert.equal(iconSynonymFor('home'), 'house')
  assert.equal(iconSynonymFor('house'), 'home')
  assert.equal(iconSynonymFor('settings'), 'gear')
  assert.equal(iconSynonymFor('user'), 'person')
  assert.equal(iconSynonymFor('person'), 'user')
  assert.equal(iconSynonymFor('search'), 'magnifying-glass')
  assert.equal(iconSynonymFor('close'), 'x')
  assert.equal(iconSynonymFor('mail'), 'envelope')
  assert.equal(iconSynonymFor('trash'), 'delete')
})

test('case and surrounding space do not matter', () => {
  assert.equal(iconSynonymFor('  Home '), 'house')
})

test('a word with no synonym offers nothing', () => {
  assert.equal(iconSynonymFor('zzzqqqxyz'), '')
  assert.equal(iconSynonymFor(''), '')
  assert.equal(iconSynonymFor(undefined), '')
})

test('the map stays small and never offers a word as its own synonym', () => {
  assert.ok(ICON_SYNONYM_PAIRS.length >= 10 && ICON_SYNONYM_PAIRS.length <= 20)
  for (const [a, b] of ICON_SYNONYM_PAIRS) {
    assert.notEqual(a, b)
    assert.notEqual(iconSynonymFor(a), a)
  }
})
