// The first-palette coach's rules: who gets it, and that dismissal is remembered.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COACH_BEATS, COACH_KEY, FIRST_PALETTE_NAME, FIRST_PALETTE_STATE,
  coachDismissed, coachRequested, dismissCoach,
} from '../../src/utils/paletteCoach.js'
import { ACCOUNT_KEY_NAMES, STORAGE_INVENTORY } from '../../src/utils/accountSync.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}

test('only the two doors that pass the first-palette state ask for the coach', () => {
  assert.equal(coachRequested(FIRST_PALETTE_STATE), true)
  for (const state of [null, undefined, {}, { newProject: true }, { firstPalette: 'yes' }]) {
    assert.equal(coachRequested(state), false, JSON.stringify(state))
  }
})

test('a dismissal is remembered, and nothing else writes the flag', () => {
  const s = memory()
  assert.equal(coachDismissed(s), false)
  dismissCoach(s)
  assert.equal(s.getItem(COACH_KEY), '1')
  assert.equal(coachDismissed(s), true)
})

test('a blocked store reads as not dismissed and never throws', () => {
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.equal(coachDismissed(blocked), false)
  assert.doesNotThrow(() => dismissCoach(blocked))
})

test('the dismissal follows the account, not the browser', () => {
  assert.ok(ACCOUNT_KEY_NAMES.includes(COACH_KEY))
  assert.equal(STORAGE_INVENTORY[COACH_KEY]?.scope, 'account')
})

test('two beats, in the spec\'s words', () => {
  assert.deepEqual(COACH_BEATS.map((b) => [b.count, b.title]), [['1 of 2', 'Make it yours'], ['2 of 2', 'Keep it']])
  assert.equal(COACH_BEATS[0].body, 'Change the first colour to your brand colour. Every other colour updates with it.')
  assert.equal(COACH_BEATS[1].body, 'Save puts this palette in your projects, on any device.')
  assert.equal(FIRST_PALETTE_NAME, 'My first palette')
  for (const b of COACH_BEATS) assert.ok(!/[–—]/.test(`${b.title}${b.body}`), 'no dashes in the copy')
})
