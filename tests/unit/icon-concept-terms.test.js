import test from 'node:test'
import assert from 'node:assert/strict'
import { ICON_CONCEPT_GROUPS, iconConceptTermsFor, iconSynonymFor } from '../../src/data/iconSynonyms.js'

// U1: every member of a group reaches every other member, and never itself.
test('every concept group member reaches the rest of its group', () => {
  for (const group of ICON_CONCEPT_GROUPS) {
    for (const word of group) {
      const terms = iconConceptTermsFor(word, 99)
      assert.ok(!terms.includes(word), `${word} lists itself`)
      for (const other of group) {
        if (other !== word) assert.ok(terms.includes(other), `${word} does not reach ${other}`)
      }
    }
  }
})

// U2: the lookup's own rules.
test('lookup is whole-query, case-insensitive, hyphenated, capped, synonym first', () => {
  assert.deepEqual(iconConceptTermsFor('cold').slice(0, 3), ['snowflake', 'thermometer', 'ice'])
  assert.equal(iconConceptTermsFor('cold').length, 4)
  assert.deepEqual(iconConceptTermsFor('COLD'), iconConceptTermsFor('cold'))
  assert.deepEqual(iconConceptTermsFor('  cold  '), iconConceptTermsFor('cold'))
  assert.equal(iconConceptTermsFor('cold', 2).length, 2)
  assert.deepEqual(iconConceptTermsFor('cold drink'), [])
  assert.deepEqual(iconConceptTermsFor(''), [])
  assert.deepEqual(iconConceptTermsFor('zzqx'), [])
  // A synonym pair comes before the group members: "bin" pairs with "trash".
  assert.equal(iconSynonymFor('home'), 'house')
  assert.equal(iconConceptTermsFor('home')[0], 'house')
  // Both spellings reach each other.
  assert.ok(iconConceptTermsFor('favourite').includes('favorite'))
  assert.ok(iconConceptTermsFor('favorite').includes('favourite'))
  // A hyphenated word is a key like any other.
  assert.ok(iconConceptTermsFor('triangle-alert', 99).includes('warning'))
  assert.ok(iconConceptTermsFor('Triangle Alert', 99).includes('warning'))
})
