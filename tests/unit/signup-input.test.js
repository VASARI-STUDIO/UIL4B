// The sign-up form's input rules (src/utils/signupInput.js).
// MUTATION: change the regex in passwordIsWeak to count spaces (drop the
// replace) and the whitespace cases go red.
import test from 'node:test'
import assert from 'node:assert/strict'
import { passwordIsWeak, cleanDisplayName, NAME_MAX, EMAIL_MAX, PASSWORD_MIN } from '../../src/utils/signupInput.js'

test('a password of only whitespace is weak, however long', () => {
  assert.equal(passwordIsWeak('      '), true)
  assert.equal(passwordIsWeak(' '.repeat(40)), true)
  assert.equal(passwordIsWeak('\t\t\t\t\t\t\t'), true)
  assert.equal(passwordIsWeak(' '.repeat(10)), true)
})

test('fewer than six non-space characters is weak, spaces around them or not', () => {
  assert.equal(passwordIsWeak(''), true)
  assert.equal(passwordIsWeak('abcde'), true)
  assert.equal(passwordIsWeak('  abcde  '), true)
  assert.equal(passwordIsWeak('a b c d e'), true)
})

test('six non-space characters is enough, and inner spaces are allowed', () => {
  assert.equal(PASSWORD_MIN, 6)
  assert.equal(passwordIsWeak('abcdef'), false)
  assert.equal(passwordIsWeak('abc def'), false)
  assert.equal(passwordIsWeak(' abcdef '), false)
})

test('a missing password is weak, not a crash', () => {
  assert.equal(passwordIsWeak(undefined), true)
  assert.equal(passwordIsWeak(null), true)
})

test('the display name is trimmed, and whitespace alone is no name', () => {
  assert.equal(cleanDisplayName('  Ada Lovelace \n'), 'Ada Lovelace')
  assert.equal(cleanDisplayName('     '), '')
  assert.equal(cleanDisplayName(undefined), '')
})

test('the display name is cut at the Settings cap', () => {
  assert.equal(NAME_MAX, 200)
  assert.equal(EMAIL_MAX, 254)
  assert.equal(cleanDisplayName('x'.repeat(300)).length, 200)
})
