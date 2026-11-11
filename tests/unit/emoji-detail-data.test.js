// The pure pieces behind the Emoji Library's detail dialog: skin-tone
// composition (ZWJ sequences included), code-point formatting, and the
// generated shortcode and tone tables.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKIN_TONES, composeSkinTone, isToneMark } from '../../src/utils/emojiSkinTone.js'
import { formatCodePoints, htmlEntity, formatShortcode, displayName, lookupEmoji } from '../../src/utils/emojiCodes.js'
import { parseEmojiShortcodes } from '../../src/data/emojiShortcodes.js'
import { TONE_EMOJI } from '../../src/data/emojiTones.js'
import { EMOJI_DATA } from '../../src/data/emojiData.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const MEDIUM = SKIN_TONES[2].mark
const cps = (s) => [...s].map(c => c.codePointAt(0))

test('a plain hand takes the tone straight after the hand', () => {
  assert.equal(composeSkinTone('\u{1F44B}', MEDIUM), '\u{1F44B}\u{1F3FD}')
})

test('the emoji-presentation selector is dropped between base and tone', () => {
  assert.deepEqual(cps(composeSkinTone('⛹️', MEDIUM)), [0x26F9, 0x1F3FD])
})

test('a ZWJ sequence keeps its joiners and tones the person, not the tool', () => {
  // woman + ZWJ + teacher
  const out = composeSkinTone('\u{1F469}‍\u{1F3EB}', MEDIUM)
  assert.deepEqual(cps(out), [0x1F469, 0x1F3FD, 0x200D, 0x1F3EB])
})

test('a gendered ZWJ sequence keeps the gender sign and its selector', () => {
  // runner + ZWJ + male sign + VS16
  const out = composeSkinTone('\u{1F3C3}‍♂️', MEDIUM)
  assert.deepEqual(cps(out), [0x1F3C3, 0x1F3FD, 0x200D, 0x2642, 0xFE0F])
})

test('people holding hands tones both people and not the handshake', () => {
  const out = composeSkinTone('\u{1F9D1}‍\u{1F91D}‍\u{1F9D1}', MEDIUM)
  assert.deepEqual(cps(out), [0x1F9D1, 0x1F3FD, 0x200D, 0x1F91D, 0x200D, 0x1F9D1, 0x1F3FD])
})

test('an empty tone returns the emoji, and a second tone replaces the first', () => {
  assert.equal(composeSkinTone('\u{1F44B}', ''), '\u{1F44B}')
  const once = composeSkinTone('\u{1F44B}', MEDIUM)
  assert.equal(composeSkinTone(once, SKIN_TONES[4].mark), '\u{1F44B}\u{1F3FF}')
})

test('something that takes no tone is left exactly as it was', () => {
  for (const e of ['\u{1F697}', '\u{1F3F3}️‍\u{1F308}']) {
    assert.equal(composeSkinTone(e, MEDIUM), e)
  }
})

test('every emoji on the tone list composes to a tone at each ZWJ-separated person, never two in a row', () => {
  assert.ok(TONE_EMOJI.size > 200, 'the tone list is suspiciously short')
  for (const e of TONE_EMOJI) {
    for (const t of SKIN_TONES) {
      const out = cps(composeSkinTone(e, t.mark))
      assert.ok(out.some(isToneMark), `${e} gained no tone`)
      out.forEach((c, i) => {
        if (isToneMark(c)) {
          assert.ok(!isToneMark(out[i - 1]), `${e}: two tones in a row`)
          assert.notEqual(out[i - 1], 0x200D, `${e}: a tone straight after a joiner`)
          assert.notEqual(out[i - 1], 0xFE0F, `${e}: a selector before a tone`)
        }
      })
      // Only tones are added and selectors dropped; the ZWJ count never changes.
      const joiners = (a) => a.filter(c => c === 0x200D).length
      assert.equal(joiners(out), joiners(cps(e)), `${e}: joiners changed`)
    }
  }
})

test('families, flags and cars are not on the tone list', () => {
  for (const e of ['\u{1F468}‍\u{1F469}‍\u{1F466}', '\u{1F3F3}️‍\u{1F308}', '\u{1F697}', '\u{1F1E6}\u{1F1FA}']) {
    assert.equal(TONE_EMOJI.has(e), false, e)
  }
  for (const e of ['\u{1F44B}', '\u{1F469}‍\u{1F3EB}', '\u{1F9D1}‍\u{1F91D}‍\u{1F9D1}']) {
    assert.equal(TONE_EMOJI.has(e), true, e)
  }
})

test('code points print as U+ notation, one per code point', () => {
  assert.equal(formatCodePoints('\u{1F44B}'), 'U+1F44B')
  assert.equal(formatCodePoints('\u{1F44B}\u{1F3FD}'), 'U+1F44B U+1F3FD')
  assert.equal(formatCodePoints('©'), 'U+00A9')
  assert.equal(formatCodePoints('\u{1F1E6}\u{1F1FA}'), 'U+1F1E6 U+1F1FA')
  assert.equal(formatCodePoints(''), '')
})

test('the HTML entity names every code point, ZWJ included', () => {
  assert.equal(htmlEntity('\u{1F469}‍\u{1F3EB}'), '&#x1F469;&#x200D;&#x1F3EB;')
  assert.equal(htmlEntity('©'), '&#x00A9;')
})

test('shortcodes are wrapped once and names start with a capital', () => {
  assert.equal(formatShortcode('wave'), ':wave:')
  assert.equal(formatShortcode(':wave:'), ':wave:')
  assert.equal(formatShortcode(''), '')
  assert.equal(displayName('waving hand'), 'Waving hand')
})

test('the shortcode table parses and covers every catalogue emoji', () => {
  const table = parseEmojiShortcodes(fs.readFileSync(path.join(ROOT, 'src', 'data', 'emojiShortcodes.txt'), 'utf8'))
  assert.equal(table.get('\u{1F44B}').aliases[0], 'wave')
  const missing = []
  for (const g of EMOJI_DATA) for (const c of g.emojis.split(/\s+/).filter(Boolean)) if (!table.has(c)) missing.push(c)
  assert.deepEqual(missing, [], 'catalogue emoji with no shortcode row: re-run scripts/build-emoji-meta.mjs')
})

test('the shortcode parser ignores junk lines and non-strings', () => {
  assert.equal(parseEmojiShortcodes(null).size, 0)
  assert.equal(parseEmojiShortcodes('no tab here\n\t\n\u{1F600}\t\n').size, 0)
})

test('a toned or selector-less glyph finds the row of its untoned catalogue emoji', () => {
  const table = parseEmojiShortcodes(fs.readFileSync(path.join(ROOT, 'src', 'data', 'emojiShortcodes.txt'), 'utf8'))
  assert.equal(lookupEmoji(table, composeSkinTone('\u{1F44B}', MEDIUM)).aliases[0], 'wave')
  // A toned person with a tool: the tone sits mid-sequence and must not stop the match.
  assert.equal(lookupEmoji(table, composeSkinTone('\u{1F469}‍\u{1F3EB}', MEDIUM)), table.get('\u{1F469}‍\u{1F3EB}'))
  // The key carries U+FE0F and the lookup does not, and the other way round.
  assert.equal(lookupEmoji(table, '\u{1F590}'), table.get('\u{1F590}️'))
  assert.equal(lookupEmoji(table, 'x'), undefined)
  assert.equal(lookupEmoji(null, '\u{1F44B}'), undefined)
})
