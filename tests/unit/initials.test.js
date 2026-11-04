// The avatar initial. `str[0]` split an emoji in half and dropped accents; the
// helper cuts at grapheme boundaries and reads the first letter instead.
// MUTATION: initialsOf/initialOf back to `src[0]` -> the emoji and combining-mark tests go red.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'
import { graphemes, firstGrapheme, initialsOf, initialOf } from '../../src/utils/initials.js'

const GRIN = '\u{1F600}'
const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}' // man, woman, girl joined by ZWJ
const E_ACUTE = 'é' // "e" plus a combining acute, two code points

test('an emoji is one grapheme, never half a surrogate pair', () => {
  assert.equal(firstGrapheme(`${GRIN} hi`), GRIN)
  assert.equal(firstGrapheme(GRIN), GRIN)
  assert.ok(firstGrapheme(GRIN).isWellFormed(), 'a lone surrogate would print as a replacement mark')
})

test('a ZWJ sequence stays whole', () => {
  assert.equal(firstGrapheme(`${FAMILY} Sam`), FAMILY)
  assert.equal(graphemes(`${FAMILY}a`).length, 2)
})

test('a letter with a combining mark keeps its mark', () => {
  assert.equal(firstGrapheme(`${E_ACUTE}mile`), E_ACUTE)
  assert.equal(initialOf(`${E_ACUTE}mile`), 'É')
})

test('empty and non-string input give no graphemes', () => {
  assert.deepEqual(graphemes(''), [])
  assert.deepEqual(graphemes(undefined), [])
  assert.deepEqual(graphemes(42), [])
  assert.equal(firstGrapheme(''), '')
})

test('leading emoji and punctuation are skipped for the first letter', () => {
  assert.equal(initialOf(`${GRIN} Freya Free`), 'F')
  assert.equal(initialsOf(`${GRIN} Freya Free`), 'FF')
  assert.equal(initialOf(`${FAMILY} sam`), 'S')
  assert.equal(initialOf('<script>x</script>'), 'S')
  assert.equal(initialOf('émile'), 'É')
})

test('a name with no letter in it falls back to the email', () => {
  assert.equal(initialOf(`${GRIN}${GRIN}`, 'free.user@uil4b.example'), 'F')
  assert.equal(initialsOf(GRIN, 'free.user@uil4b.example'), 'FU')
  assert.equal(initialOf('   ', 'bo@y.example'), 'B', 'a blank name is no name')
  assert.equal(initialOf('', 'ann@x.example'), 'A')
})

test('with neither a name nor an email there is a neutral glyph, not "undefined"', () => {
  assert.equal(initialOf('', ''), '?')
  assert.equal(initialOf(undefined, undefined), '?')
  assert.equal(initialsOf(GRIN, `${GRIN}@${GRIN}.example`), 'E', 'only the "example" word has a letter')
  assert.equal(initialsOf(GRIN, GRIN), '?')
})

test('two initials come from the first two words, as before', () => {
  assert.equal(initialsOf('Ann Lee'), 'AL')
  assert.equal(initialsOf('', 'bo@y.test'), 'BY')
  assert.equal(initialsOf('cher'), 'C')
})

test('the first letter is cut back to one grapheme (sharp s uppercases to "SS")', () => {
  assert.equal(initialOf('ßeta'), 'S')
})

test('without Intl.Segmenter it still keeps an accent with its letter and an emoji whole', () => {
  assert.equal(firstGrapheme(`${E_ACUTE}mile`, null), E_ACUTE)
  assert.equal(firstGrapheme(`${GRIN}x`, null), GRIN)
  assert.equal(initialOf(`${GRIN} Freya`, null, null), 'F')
  assert.equal(initialOf('', 'ann@x.example', null), 'A')
})

test('every place that printed an initial uses the helper', () => {
  const read = (p) => stripJs(fs.readFileSync(path.join(process.cwd(), p), 'utf8'))
  assert.match(read('src/pages/Settings.jsx'), /initialOf\(userProfile\?\.displayName, user\.email\)/)
  assert.match(read('src/components/PillNav.jsx'), /initialsOf\(/)
  assert.match(read('src/utils/accountSwitcher.js'), /initialsOf\(/)
  assert.doesNotMatch(read('src/pages/Settings.jsx'), /\|\| 'U'\)\[0\]/, 'Settings went back to indexing the string')
  assert.doesNotMatch(read('src/components/PillNav.jsx'), /parts\[0\]\?\.\[0\]/, 'PillNav went back to indexing the string')
})
