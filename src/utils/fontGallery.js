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
