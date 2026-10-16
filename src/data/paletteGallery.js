// Palette hand-off helper. The curated gallery itself (GALLERY_PALETTES) is not
// in this file or anywhere under src/: it lives in api/_lib/library/ and reaches
// the browser by entitlement — the first ten palettes are in
// src/data/paletteLibrary.js and a Pro account fetches the rest from
// GET /api/ai?library=palettes. See api/_lib/library/serve.js.

// Build the Palette Builder hand-off URL for a set of colours — matches the
// ?c=4338E0,7C6CF0 format colorsFromQuery() already parses (no '#' prefixes).
export function paletteBuilderUrl(colors) {
  return `/create/palette?c=${colors.map(c => c.replace('#', '')).join(',')}`
}
