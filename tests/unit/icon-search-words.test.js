import test from 'node:test'
import assert from 'node:assert/strict'
import { typedWords } from '../../src/utils/iconSearchWords.js'

// The built-in fallback needs every typed word to match. A split on the letter "s" instead of on whitespace
// (the lost-backslash `/s+/`) turned "chess set" into "che" and "et", and "bus" into "bu".
test('a search splits on whitespace only, never on the letter s', () => {
  assert.deepEqual(typedWords('arrow up'), ['arrow', 'up'])
  assert.deepEqual(typedWords('chess set'), ['chess', 'set'])
  assert.deepEqual(typedWords('bus'), ['bus'])
  assert.deepEqual(typedWords('stars'), ['stars'])
})

test('case, repeated spaces, tabs and empty input', () => {
  assert.deepEqual(typedWords('  Arrow\t UP  '), ['arrow', 'up'])
  assert.deepEqual(typedWords(''), [])
  assert.deepEqual(typedWords(null), [])
})
