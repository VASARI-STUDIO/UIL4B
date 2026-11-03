// Skin-tone composition for emoji, shared by the grid, the detail dialog and the
// generator that decides which catalogue emoji take a tone. Pure: no React, no DOM.
//
// A Fitzpatrick modifier is a code point (U+1F3FB..U+1F3FF) that follows a
// "modifier base" person or body part. Two details make "just stick it on the
// end" wrong, and both are handled here:
//
//   * The emoji-presentation selector (U+FE0F) must not sit between the base and
//     the modifier, so a selector straight after a base is dropped:
//     U+26F9 U+FE0F + tone  ->  U+26F9 U+1F3FD.
//   * A ZWJ sequence is several emoji glued by U+200D. The tone goes after the
//     person at the start of each component, never after the tool, the hair or
//     the gender sign: woman + ZWJ + teacher becomes woman + tone + ZWJ + teacher.
//
// Which emoji actually accept a tone is NOT decided here. A family (three bases
// joined by ZWJ) has no toned form, and nor does a car. That list is data
// (src/data/emojiTones.js), generated from the Unicode emoji-test file by
// scripts/build-emoji-meta.mjs, which also proves this function's output is a
// sequence Unicode defines for every emoji on the list.

export const SKIN_TONES = Object.freeze([
  { id: 'light', label: 'Light', mark: '\u{1F3FB}' },
  { id: 'medium-light', label: 'Medium-light', mark: '\u{1F3FC}' },
  { id: 'medium', label: 'Medium', mark: '\u{1F3FD}' },
  { id: 'medium-dark', label: 'Medium-dark', mark: '\u{1F3FE}' },
  { id: 'dark', label: 'Dark', mark: '\u{1F3FF}' },
])

const ZWJ = 0x200D
const VS16 = 0xFE0F
const TONE_FIRST = 0x1F3FB
const TONE_LAST = 0x1F3FF

// Emoji_Modifier_Base, Unicode 15. Handshake (U+1F91D) is left out on purpose:
// it is a base, but inside "people holding hands" it is the joiner and takes no
// tone of its own.
const MODIFIER_RANGES = [
  [0x261D, 0x261D], [0x26F9, 0x26F9], [0x270A, 0x270D],
  [0x1F385, 0x1F385], [0x1F3C2, 0x1F3C4], [0x1F3C7, 0x1F3C7], [0x1F3CA, 0x1F3CC],
  [0x1F442, 0x1F443], [0x1F446, 0x1F450], [0x1F466, 0x1F478], [0x1F47C, 0x1F47C],
  [0x1F481, 0x1F483], [0x1F485, 0x1F487], [0x1F48F, 0x1F48F], [0x1F491, 0x1F491],
  [0x1F4AA, 0x1F4AA], [0x1F574, 0x1F575], [0x1F57A, 0x1F57A], [0x1F590, 0x1F590],
  [0x1F595, 0x1F596], [0x1F645, 0x1F647], [0x1F64B, 0x1F64F], [0x1F6A3, 0x1F6A3],
  [0x1F6B4, 0x1F6B6], [0x1F6C0, 0x1F6C0], [0x1F6CC, 0x1F6CC], [0x1F90C, 0x1F90C],
  [0x1F90F, 0x1F90F], [0x1F918, 0x1F91C], [0x1F91E, 0x1F91F], [0x1F926, 0x1F926],
  [0x1F930, 0x1F939], [0x1F93D, 0x1F93E], [0x1F977, 0x1F977], [0x1F9B5, 0x1F9B6],
  [0x1F9B8, 0x1F9B9], [0x1F9BB, 0x1F9BB], [0x1F9CD, 0x1F9CF], [0x1F9D1, 0x1F9DD],
  [0x1FAC3, 0x1FAC5], [0x1FAF0, 0x1FAF8],
]

export function isModifierBase(codePoint) {
  for (const [lo, hi] of MODIFIER_RANGES) {
    if (codePoint >= lo && codePoint <= hi) return true
  }
  return false
}

export function isToneMark(codePoint) {
  return codePoint >= TONE_FIRST && codePoint <= TONE_LAST
}

/**
 * `emoji` with `tone` (one of SKIN_TONES[n].mark, or '' for none) applied.
 *
 * Returns the input unchanged for an empty tone. An emoji that already carries a
 * tone has it replaced, so picking a second tone never stacks two.
 *
 * This composes; it does not check that Unicode defines the result. Callers gate
 * on `supportsSkinTone` first.
 */
export function composeSkinTone(emoji, tone) {
  if (!emoji) return ''
  const cps = [...emoji].map(c => c.codePointAt(0)).filter(c => !isToneMark(c))
  if (!tone) return String.fromCodePoint(...cps)
  const out = []
  let componentStart = true
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]
    out.push(cp)
    if (cp === ZWJ) { componentStart = true; continue }
    if (componentStart && isModifierBase(cp)) {
      out.push(tone.codePointAt(0))
      if (cps[i + 1] === VS16) i++
    }
    componentStart = false
  }
  return String.fromCodePoint(...out)
}
