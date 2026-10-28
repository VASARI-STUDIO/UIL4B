// The letter an avatar shows for a person with no photo.
//
// `str[0]` is a UTF-16 code unit, so a name that starts with an emoji or any
// character outside the Basic Multilingual Plane gave half a surrogate pair
// (it rendered as "�"), and "e" + a combining accent lost its accent. Text is
// cut at grapheme boundaries instead.

const NEUTRAL_INITIAL = '?'

const defaultSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

// A cluster that opens with a letter or a digit, so "e" + U+0301 counts and an
// emoji or a lone mark does not.
const STARTS_WITH_LETTER = /^[\p{L}\p{N}]/u

// Without Intl.Segmenter: whole code points, each with the combining marks that
// follow it. Joined emoji sequences split here, which only matters for the
// emoji, and those are skipped as initials.
const CODE_POINT_AND_MARKS = /[\s\S]\p{M}*/gu

/**
 * The grapheme clusters of `str`. `segmenter` is injectable so the fallback
 * can be exercised where Intl.Segmenter exists; pass `null` to force it.
 */
export function graphemes(str, segmenter = defaultSegmenter) {
  const s = typeof str === 'string' ? str : ''
  if (!s) return []
  if (segmenter) return Array.from(segmenter.segment(s), (part) => part.segment)
  return s.match(CODE_POINT_AND_MARKS) || Array.from(s)
}

/** The first grapheme cluster of `str`, whole (a ZWJ family stays one), or ''. */
export function firstGrapheme(str, segmenter = defaultSegmenter) {
  return graphemes(str, segmenter)[0] || ''
}

// The first grapheme of `str` that starts with a letter or digit, uppercased
// and cut back to one cluster ("ß" uppercases to "SS").
function leadingLetter(str, segmenter) {
  const hit = graphemes(str, segmenter).find((g) => STARTS_WITH_LETTER.test(g))
  return hit ? firstGrapheme(hit.toUpperCase(), segmenter) : ''
}

// One letter per word, in order. Words break at spaces, "@" and ".", so an
// address reads as its parts; a word with no letter in it (an emoji) is skipped.
function wordLetters(src, segmenter) {
  return String(src || '').trim().split(/[\s@.]+/).map((w) => leadingLetter(w, segmenter)).filter(Boolean)
}

/**
 * One or two initials from a display name, else from the email, else a neutral
 * glyph. A name with no letter in it at all (only emoji or punctuation) falls
 * back to the email rather than printing the emoji.
 */
export function initialsOf(name, email, segmenter = defaultSegmenter) {
  let letters = wordLetters(name, segmenter)
  if (!letters.length) letters = wordLetters(email, segmenter)
  if (!letters.length) return NEUTRAL_INITIAL
  return letters[0] + (letters[1] || '')
}

/** A single initial, for the larger avatar. */
export function initialOf(name, email, segmenter = defaultSegmenter) {
  return firstGrapheme(initialsOf(name, email, segmenter), segmenter) || NEUTRAL_INITIAL
}
