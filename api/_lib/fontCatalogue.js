// Pure reshaping of Google's font catalogues into the shape the font tools read.
//
// Shared by api/fonts.js (the live proxy) and scripts/sync-font-catalogue.mjs
// (which writes public/data/font-catalogue.json), so the two can never disagree
// about what a catalogue entry holds. Nothing here fetches, logs or reads the
// environment.

export const METADATA_URL = 'https://fonts.google.com/metadata/fonts'

// '100', 'regular', '700italic' → numeric weights, italics dropped.
export function weightsFromVariants(variants) {
  return variants
    .map(v => {
      if (v === 'regular') return 400
      if (v.includes('italic')) return null
      const n = parseInt(v, 10)
      return Number.isFinite(n) ? n : null
    })
    .filter(w => w !== null)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .sort((a, b) => a - b)
}

// The WebFonts API answer: the thinner catalogue (no designers, dates or axes).
export function fontsFromWebfontsItems(items) {
  return (items || []).map((item, i) => ({
    family: item.family,
    category: item.category,
    variants: weightsFromVariants(item.variants || []),
    subsets: item.subsets || ['latin'],
    popularity: i,
  })).filter(f => f.variants.length)
}

// The metadata endpoint's body is JSON behind the anti-XSSI guard )]}'.
export function hasXssiGuard(text) {
  return text.startsWith(')]}')
}

export function parseMetadataText(text) {
  return JSON.parse(text.replace(/^\)\]\}'/, ''))
}

// `familyMetadataList` → the catalogue. Sorts the list in place by popularity.
export function fontsFromMetadataList(list) {
  list.sort((a, b) => (a.popularity || 1e9) - (b.popularity || 1e9))
  return list.map((f, i) => {
    const cuts = Object.keys(f.fonts || {})
    return {
      family: f.family,
      // Metadata uses 'Sans Serif'; the WebFonts API uses 'sans-serif'.
      category: (f.category || 'Sans Serif').toLowerCase().replace(/\s+/g, '-'),
      variants: cuts
        .filter(v => !v.endsWith('i'))
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b),
      subsets: f.subsets || ['latin'],
      popularity: i,
      // ── The About-tab fields ──────────────────────────────────────────────
      // Everything below is carried STRAIGHT THROUGH from Google's own family
      // metadata. None of it is inferred, and none of it is written by us: the
      // About tab states facts about a typeface, so every one of them has to be
      // traceable to a source, or it does not get shown at all.
      //
      // `dateAdded` is the day the family landed ON GOOGLE FONTS. It is NOT the
      // year the typeface was designed or released, and the two differ by
      // decades for any revival. The UI labels it as what it is for that reason.
      designers: Array.isArray(f.designers) ? f.designers.filter(Boolean) : [],
      dateAdded: typeof f.dateAdded === 'string' ? f.dateAdded : '',
      // Italic availability is otherwise lost: the weight list drops the 'i'
      // cuts, so a family that ships twelve italics looked identical to one
      // that ships none.
      italics: cuts.some(v => v.endsWith('i')),
      // Axis TAGS only. The ranges are real too, but "wght 100–900" is a
      // control the tools do not offer, and printing a range you cannot use is
      // a spec sheet rather than an answer.
      axes: (f.axes || []).map(a => a && a.tag).filter(Boolean),
      openSource: f.isOpenSource === true,
      // ── The two fields the Examples tab picks its scenes from ─────────────
      //
      // Both were being dropped, and dropping them is why every family got the
      // same four examples. `category` — the only descriptor that survived —
      // CANNOT do this job on its own:
      //
      //   `classifications` disagrees with `category` for 351 families. Playfair
      //   Display is category "Serif" with classifications ["Display"], and so
      //   are Anton, Bebas Neue, Archivo Black and DM Serif Display. It is also
      //   the ONLY field that identifies the 22 SYMBOL families (Libre Barcode,
      //   Noto Music, Yarndings), where setting a paragraph is not a weak
      //   example, it is nonsense.
      //
      //   `stroke` recovers Slab Serif, a distinction `category` erases by
      //   folding it into Serif.
      //
      // Carried straight through and NEVER defaulted: an absent field must stay
      // absent so src/utils/fontScenes.js can tell "this family is not a
      // display face" apart from "this catalogue does not say", and degrade to
      // `category` on the second. Guessing a value here would make the degraded
      // path invisible at exactly the point it matters.
      classifications: Array.isArray(f.classifications) ? f.classifications.filter(Boolean) : [],
      stroke: typeof f.stroke === 'string' ? f.stroke : '',
    }
  }).filter(f => f.variants.length)
}
