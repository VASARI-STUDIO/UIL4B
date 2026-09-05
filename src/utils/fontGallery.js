const NON_TEXT_FAMILY_PATTERN = /(?:^|\s)(?:barcode|code|coding|console|emoji|icon|icons|math|mono|monospace|music|signwriting|symbol|symbols|terminal)(?:\s|$)/i
const NON_TEXT_SUBSETS = new Set(['math', 'music', 'signwriting', 'symbols'])

// Keep the gallery focused on typefaces intended for reading and display.
// Google categorises programming families as monospace, while emoji, icon and
// symbol families are identified by their family names and specialist subsets.
export function isGalleryTypeface(font) {
  if (!font || typeof font.family !== 'string') return false
  if (String(font.category).toLowerCase() === 'monospace') return false
  if (NON_TEXT_FAMILY_PATTERN.test(font.family)) return false
  return !(font.subsets || []).some(subset => NON_TEXT_SUBSETS.has(String(subset).toLowerCase()))
}

export function filterGalleryTypefaces(fonts) {
  return Array.isArray(fonts) ? fonts.filter(isGalleryTypeface) : []
}

// A looser filter for the font PICKERS, which are a different question from the
// gallery. The gallery curates what is worth browsing; a picker has to offer
// anything a designer might legitimately choose — and a monospace body face is
// a legitimate choice for a technical product, so `isGalleryTypeface` (which
// drops every monospace family) is too strict there.
//
// What is excluded here is only what CANNOT render a specimen: emoji, icon,
// symbol, math, music and barcode families would show the preview word as a
// row of boxes, which tells the user nothing except that something is broken.
const UNRENDERABLE_FAMILY_PATTERN = /(?:^|\s)(?:barcode|emoji|icon|icons|math|music|signwriting|symbol|symbols)(?:\s|$)/i

export function isPickableTypeface(font) {
  if (!font || typeof font.family !== 'string') return false
  if (UNRENDERABLE_FAMILY_PATTERN.test(font.family)) return false
  return !(font.subsets || []).some(subset => NON_TEXT_SUBSETS.has(String(subset).toLowerCase()))
}

export function filterPickableTypefaces(fonts) {
  return Array.isArray(fonts) ? fonts.filter(isPickableTypeface) : []
}

// ── What a full-width specimen row shows about a family ─────────────────────

// The weights a row's ladder draws — numerals that are themselves set in the
// family at the weight they name, so "900" is painted with the black cut and
// "100" with the thin one. That only works if the family is actually LOADED at
// every weight the ladder names: a numeral labelled 200 and painted with the
// 400 file is the same lie as fallback text pretending to be the family, and
// refusing that lie is the oldest contract on this page.
//
// So the ladder is capped, and the cap is a network budget rather than a visual
// one. Every weight in it is a woff2 the browser has to fetch to paint it, and
// a row asked for two per family before this (heading + body). Five is where a
// nine-weight family still reads as a range — both ends and three steps between
// them — without quintupling the font payload of a scroll.
//
// The ends are never dropped: min and max are what "how much range has this
// family got" is actually asking. The middle is sampled evenly across the rest.
export function ladderWeights(variants, limit = 5) {
  const list = Array.isArray(variants)
    ? [...new Set(variants.filter(w => Number.isFinite(w)))].sort((a, b) => a - b)
    : []
  if (list.length <= limit) return list
  if (limit <= 1) return list.slice(0, 1)
  if (limit === 2) return [list[0], list[list.length - 1]]

  // Evenly spaced positions across the sorted list, both ends included.
  // Rounding can land two positions on the same index, so the Set collapses
  // them rather than drawing one weight twice and claiming it is two.
  const picks = new Set()
  for (let i = 0; i < limit; i += 1) {
    picks.add(Math.round((i * (list.length - 1)) / (limit - 1)))
  }
  return [...picks].sort((a, b) => a - b).map(i => list[i])
}

// The OpenType usWeightClass names, which are what a foundry, a type designer
// and every desktop font menu call these numbers. A specimen listing its cuts
// as "400" and "600" is asking the reader to translate; listing them as
// "400 Regular" and "600 SemiBold" is naming the thing they will go looking for
// in the application they end up setting the type in.
const WEIGHT_NAMES = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
}

export function weightName(weight) {
  return WEIGHT_NAMES[weight] || ''
}

// Google's subset ids as script names a person can read. `latin-ext` is not a
// language and "3 subsets" is not a fact about a typeface — the specimen dialog
// reduced this whole field to its own length, which threw away the only answer
// it had to "can I set my copy in this", the question a Cyrillic, Greek or
// Vietnamese reader opens a type catalogue with.
const SUBSET_NAMES = {
  'latin-ext': 'Latin Extended',
  'cyrillic-ext': 'Cyrillic Extended',
  'greek-ext': 'Greek Extended',
  'chinese-simplified': 'Chinese (Simplified)',
  'chinese-traditional': 'Chinese (Traditional)',
  'chinese-hongkong': 'Chinese (Hong Kong)',
  menclosedalphanum: 'Enclosed Alphanumerics',
}

// `menu` is not a script. It is Google's tiny per-family subset containing just
// the glyphs needed to draw the family's own NAME in a font menu, and it ships
// on nearly every family in the catalogue. Listing it alongside Cyrillic and
// Vietnamese answers "can I set my copy in this" with a word that means nothing
// to the person asking.
//
// Dropped HERE rather than at each call site, because it was already being
// rendered in three places from this one function — the specimen dialog's
// header tags, the gallery rows, and now the About tab — and a filter applied
// at two of the three is how the specimen dialog came to state its script
// coverage twice, in the same dialog, with two different answers.
const NON_SCRIPT_SUBSETS = new Set(['menu'])

// How large the browse tile may set a family's own NAME as its specimen.
//
// #font-picker-shows-handgloves replaced the fixed word "Handgloves" with the
// family name, so the specimen stopped being one width and became 1,941 of
// them. Measured over the live Google Fonts family list: median 11 characters,
// p95 22, longest 32 ("Noto Sans Inscriptional Parthian"). A constant font-size
// calibrated for a 10-character word cannot survive a 32-character one - it
// overflows, and the tile's ellipsis backstop then trims a specimen, which is
// the exact fault the tile geometry was built to prevent.
//
// THE RATIO IS THE REPO'S OWN MEASUREMENT, NOT A GUESS. global.css records that
// "Handgloves" renders between 4.8x and 6.0x its font-size across the five
// categories, so the worst-case advance is ~0.60em per character. To fill a
// 100cqw tile: size <= 100 / (chars * 0.60) cqw = 167/chars, less ~10% headroom
// => 150/chars. At 10 characters that yields 15cqw - which is exactly the
// constant that shipped for "Handgloves", so this formula reproduces the
// measured value rather than replacing it.
//
// WHY TWO LINES PAST 14 CHARACTERS: on one line a 32-character name would need
// 4.7cqw, about 8px in a 190px column - present but not legible, which is worse
// than absent. Wrapping halves the characters per line and roughly doubles the
// size the same box can carry. Family names contain spaces, so they wrap
// naturally; the longest unbreakable word in the catalogue is 18 characters
// ("UnifrakturMaguntia"), which is why .fbd-sample also carries
// overflow-wrap:anywhere as a backstop rather than relying on a space.
//
// THE LINE BUDGET IS THE WRAP THE BROWSER ACTUALLY PERFORMS, and this is the
// correction. `Math.ceil(chars / lines)` models a PERFECTLY BALANCED split -
// 32 characters over two lines is 16 each. Browsers do not balance; they fill
// greedily and break at spaces. "Noto Sans Inscriptional Parthian" at a
// 16-character budget goes "Noto Sans" / "Inscriptional" / "Parthian", which is
// THREE lines, and -webkit-line-clamp then trims the specimen - the exact fault
// the tile geometry exists to prevent, arrived at from the other side.
//
// MEASURED over the live Google Fonts family list, all 1,946 names rather than
// a sample: 249 of them (12.8%) need more lines than the balanced model
// budgets for, every one of them a three-line wrap inside a two-line clamp.
// Worst offenders are the Noto script families, which are three or four words
// with one long one in the middle. So the size is solved from the wrap instead:
// the SMALLEST per-line budget whose greedy wrap fits, which is the LARGEST
// size that genuinely does. After the change, 0 of 1,946 exceed their budget.
//
// WHY IT SHIPPED, AND IT IS NOT THAT NOBODY LOOKED: the defect is invisible on
// most faces. Measured in a real browser at 1440, "Noto Sans Inscriptional
// Parthian" wraps to TWO lines under both formulas in a platform sans - about
// 0.50em per character - and to THREE under the balanced one in a platform
// monospace, which is 0.60em exactly. 0.60 is the pessimistic constant this
// derivation is built on, so the balanced budget was correct for the average
// face and wrong for the one the arithmetic promises to survive. The rendered
// half of the guard therefore seeds its long names as monospace on purpose;
// against a mid-range face it would pass either way and prove nothing.
//
// WIDENING THE CLAMP ALONE WAS PRICED AND REJECTED, because it is the obvious
// cheaper fix and it is worse. Keeping the balanced budget and clamping at
// three stops the trimming, but the balanced budget can reach three lines at
// the 30px CEILING - "Akaya Telivigala" does - and three lines at 30px is
// 103.5px in an 84px tile, which overflows the card instead of trimming it.
// Solved from the wrap, the tallest case is two lines and 69px at every column
// width, and the only three-line results left sit at the 13px floor, where
// three lines is 45px. Pinned in tests/unit/specimen-fit.test.js so the option
// stays priced rather than re-argued.
//
// THIS DOES NOT OVERTURN THE MEASURED CONSTANT, IT EXTENDS IT. A single word on
// one line needs a budget equal to its own length, so "Handgloves" still solves
// to 150/10 = 15cqw exactly, and the one-line path (maxLines = 1, which is what
// FontPicker's fixed-height trigger asks for) is byte-identical to what it was:
// a single line can only fit if the budget covers the whole string. Only the
// two-line grid path moves, and only downward, and only for names whose words
// do not divide evenly.
//
// Returns the cqw multiplier only. The floor and ceiling live in CSS with the
// rest of the tile geometry, and the 13px floor is what puts TWO of the 1,946
// onto a third line at the narrowest shipped column - see .fbd-sample, which
// clamps at three for that reason rather than trimming them.
function greedyLines(name, budget) {
  const words = name.split(/\s+/).filter(Boolean)
  let lines = 0
  let cur = ''
  for (let word of words) {
    // A word longer than the whole budget is broken mid-word, which is what
    // overflow-wrap:anywhere does; "UnifrakturMaguntia" is the case.
    while (word.length > budget) {
      if (cur) { lines += 1; cur = '' }
      lines += 1
      word = word.slice(budget)
    }
    if (!cur) cur = word
    else if (cur.length + 1 + word.length <= budget) cur += ` ${word}`
    else { lines += 1; cur = word }
  }
  if (cur) lines += 1
  return lines || 1
}

export function specimenSizeCqw(family, maxLines = 2) {
  const name = String(family || '').trim()
  const chars = name.length
  if (!chars) return 15
  const lines = (maxLines > 1 && chars > 14) ? 2 : 1
  // The smallest budget that fits, walked upward from 1. Terminates at `chars`,
  // where the whole name is on one line by definition.
  let budget = chars
  for (let b = 1; b <= chars; b += 1) {
    if (greedyLines(name, b) <= lines) { budget = b; break }
  }
  return 150 / budget
}

export function formatSubsets(subsets) {
  if (!Array.isArray(subsets)) return []
  const seen = subsets
    .filter(s => typeof s === 'string' && s.trim())
    .map(s => s.trim().toLowerCase())
    .filter(s => !NON_SCRIPT_SUBSETS.has(s))
  return [...new Set(seen)].map(id => (
    SUBSET_NAMES[id]
    || id.replace(/(^|[-_])([a-z])/g, (_, sep, ch) => (sep ? ' ' : '') + ch.toUpperCase())
  ))
}
