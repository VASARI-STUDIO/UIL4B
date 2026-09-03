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
