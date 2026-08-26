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
