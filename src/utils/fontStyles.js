// The Font Gallery's Style filter: which design style a family is drawn in.
//
// The catalogue (Google Fonts metadata) carries a category and a stroke, but no
// finer class, so the styles come from this hand-checked list. A family the list
// does not name has no style: it shows under "Any" and under its category, and
// no style claims it. That keeps every count honest rather than guessed.
//
// A style belongs to one category, and a family only takes a style from its own
// category. So a word like "Rounded" in a display family's name does not tag it.

export const FONT_STYLES = [
  { id: 'geometric', label: 'Geometric', category: 'sans-serif' },
  { id: 'humanist', label: 'Humanist', category: 'sans-serif' },
  { id: 'grotesque', label: 'Grotesque', category: 'sans-serif' },
  { id: 'rounded', label: 'Rounded', category: 'sans-serif' },
  { id: 'old-style', label: 'Old style', category: 'serif' },
  { id: 'transitional', label: 'Transitional', category: 'serif' },
  { id: 'modern', label: 'Modern', category: 'serif' },
]

const STYLE_BY_ID = new Map(FONT_STYLES.map((s) => [s.id, s]))

// Exact family names, per style. Every name is in the catalogue under the
// style's category; the unit test checks both.
const FAMILIES = {
  geometric: [
    'Montserrat', 'Montserrat Alternates', 'Poppins', 'Plus Jakarta Sans', 'Outfit', 'Jost', 'Raleway',
    'Urbanist', 'League Spartan', 'Josefin Sans', 'Lexend', 'Lexend Deca', 'Lexend Exa', 'Lexend Giga',
    'Lexend Mega', 'Lexend Peta', 'Lexend Tera', 'Lexend Zetta', 'Figtree', 'DM Sans', 'Manrope', 'Sora',
    'Kumbh Sans', 'Questrial', 'Didact Gothic', 'Mulish', 'Nunito Sans', 'Red Hat Display', 'Red Hat Text',
    'Google Sans', 'Google Sans Flex', 'Albert Sans', 'Afacad', 'Gantari', 'Prompt', 'Readex Pro', 'Alata',
    'Varela', 'Sen', 'Tenor Sans', 'Syne', 'Mada', 'Hind Madurai', 'Wix Madefor Display', 'Onest',
    'Geologica', 'Reddit Sans', 'Spline Sans', 'Kodchasan', 'Krona One', 'Michroma', 'Unbounded',
    'Titillium Web', 'Exo 2', 'Maven Pro',
  ],
  humanist: [
    'Open Sans', 'Source Sans 3', 'Noto Sans', 'Noto Sans Display', 'Fira Sans', 'Fira Sans Condensed',
    'Fira Sans Extra Condensed', 'Ubuntu', 'Ubuntu Condensed', 'PT Sans', 'PT Sans Narrow', 'PT Sans Caption',
    'Lato', 'Cabin', 'Cabin Condensed', 'Mukta', 'Asap', 'Asap Condensed', 'Signika', 'Signika Negative',
    'Merriweather Sans', 'Alegreya Sans', 'Alegreya Sans SC', 'Oxygen', 'Istok Web', 'Atkinson Hyperlegible',
    'Atkinson Hyperlegible Next', 'Commissioner', 'Andika', 'Gudea', 'Rosario', 'Puritan', 'Molengo', 'Ysabeau',
    'Ysabeau Office', 'Ysabeau Infant', 'Belleza', 'Proza Libre', 'Quattrocento Sans', 'Assistant', 'Catamaran',
    'Sarabun', 'Nobile', 'Magra', 'Amaranth', 'Marvel', 'Shanti', 'Tauri', 'Mako', 'Ruluko', 'Rambla',
    'Average Sans', 'Telex', 'Voces', 'Philosopher', 'Encode Sans Expanded', 'Hind', 'Hind Siliguri',
    'Yantramanav', 'Sintony', 'Actor', 'Cantarell',
  ],
  grotesque: [
    'Inter', 'Inter Tight', 'Roboto', 'Roboto Condensed', 'Roboto Flex', 'Arimo', 'Archivo', 'Archivo Narrow',
    'Archivo Black', 'Work Sans', 'Public Sans', 'Schibsted Grotesk', 'Bricolage Grotesque', 'Hanken Grotesk',
    'Space Grotesk', 'Familjen Grotesk', 'Host Grotesk', 'Darker Grotesque', 'Geist', 'Karla', 'Libre Franklin',
    'Epilogue', 'Overpass', 'Oswald', 'Anton', 'Bebas Neue', 'Fjalla One', 'Pathway Gothic One', 'Heebo',
    'IBM Plex Sans', 'IBM Plex Sans Condensed', 'Instrument Sans', 'Be Vietnam Pro', 'Chivo', 'Sofia Sans',
    'Sofia Sans Condensed', 'Sofia Sans Semi Condensed', 'Sofia Sans Extra Condensed', 'Golos Text',
    'Wix Madefor Text', 'Rethink Sans', 'Barlow', 'Barlow Condensed', 'Barlow Semi Condensed', 'Encode Sans',
    'Encode Sans Condensed', 'Encode Sans Semi Condensed', 'Alumni Sans', 'Mona Sans', 'Hubot Sans',
    'Funnel Sans', 'Gothic A1', 'Nanum Gothic', 'Noto Sans KR', 'Anek Latin', 'Antonio', 'League Gothic',
    'Smooch Sans', 'Saira', 'Saira Condensed', 'Saira Semi Condensed', 'Saira Extra Condensed', 'Radio Canada',
    'Radio Canada Big', 'Monda', 'Tomorrow', 'Pragati Narrow',
  ],
  rounded: [
    'Nunito', 'Varela Round', 'Quicksand', 'M PLUS Rounded 1c', 'Zen Maru Gothic', 'Kosugi Maru', 'Rubik',
    'Fredoka', 'Dosis', 'Mitr', 'Mochiy Pop One', 'Mochiy Pop P One', 'Livvic', 'Comme', 'Manjari', 'SUSE',
    'Sour Gummy',
  ],
  'old-style': [
    'EB Garamond', 'Cormorant', 'Cormorant Garamond', 'Cormorant Infant', 'Cormorant SC', 'Cormorant Unicase',
    'Cormorant Upright', 'Crimson Text', 'Crimson Pro', 'Lora', 'Sorts Mill Goudy', 'Goudy Bookletter 1911',
    'Cardo', 'Vollkorn', 'Alegreya', 'Alegreya SC', 'Gentium Book Plus', 'Gentium Plus', 'Linden Hill',
    'IM Fell English', 'IM Fell DW Pica', 'IM Fell Double Pica', 'IM Fell French Canon', 'IM Fell Great Primer',
    'Libre Caslon Text', 'Libre Caslon Display', 'Fraunces', 'Cinzel', 'Rosarivo', 'Sedan', 'Spectral SC',
    'Newsreader', 'Young Serif', 'Brygada 1918', 'Marcellus', 'Marcellus SC', 'Trirong', 'Petrona',
    'Della Respira', 'Fanwood Text', 'Quattrocento', 'Neuton', 'Ovo', 'Lusitana', 'Amethysta', 'Habibi',
    'Castoro', 'Bona Nova', 'Bona Nova SC', 'Gowun Batang', 'Nanum Myeongjo', 'Noto Serif JP',
    'Hedvig Letters Serif',
  ],
  transitional: [
    'Libre Baskerville', 'Baskervville', 'Baskervville SC', 'Merriweather', 'Source Serif 4', 'PT Serif',
    'PT Serif Caption', 'Noto Serif', 'Noto Serif Display', 'Domine', 'Gelasio', 'Tinos', 'Roboto Serif',
    'Spectral', 'Literata', 'Charis SIL', 'Unna', 'Martel', 'Average', 'Instrument Serif', 'Frank Ruhl Libre',
    'Noticia Text', 'Besley', 'Bitter', 'Zilla Slab', 'Andada Pro', 'Amiri', 'Taviraj', 'Halant', 'Rasa',
    'Yrsa', 'Eczar', 'Pridi', 'Gupter', 'Mate', 'Mate SC', 'Lustria', 'Inknut Antiqua', 'Crete Round',
    'Arapey', 'Hahmlet', 'Noto Serif SC', 'Noto Serif KR', 'Noto Serif TC', 'Shippori Mincho',
    'Zen Old Mincho', 'Sawarabi Mincho',
  ],
  modern: [
    'Playfair Display', 'Playfair Display SC', 'Playfair', 'DM Serif Display', 'DM Serif Text', 'Bodoni Moda',
    'Bodoni Moda SC', 'Libre Bodoni', 'Prata', 'Rozha One', 'Gilda Display', 'Bentham', 'Old Standard TT',
    'Rufina', 'Gloock', 'Imbue', 'Bellefair', 'GFS Didot', 'Ultra', 'Abhaya Libre', 'Vidaloka', 'Radley',
    'Kaisei Decol', 'Kaisei Opti',
  ],
}

// Name words that settle the style for any family carrying them, within the
// style's own category: "Funnel Grotesk", "Libre Caslon Condensed".
const NAME_RULES = [
  [/\b(?:grotesk|grotesque)\b/i, 'grotesque'],
  [/\b(?:rounded|maru)\b/i, 'rounded'],
  [/\b(?:garamond|caslon|goudy|jenson)\b/i, 'old-style'],
  [/\bbaskerville\b/i, 'transitional'],
  [/\b(?:bodoni|didot|didone)\b/i, 'modern'],
]

// A family can appear in only one list. Where a name was entered twice by
// mistake, the first list wins and the unit test flags it.
const STYLE_OF_FAMILY = (() => {
  const map = new Map()
  for (const style of FONT_STYLES) {
    for (const family of FAMILIES[style.id]) {
      const key = family.toLowerCase()
      if (!map.has(key)) map.set(key, style.id)
    }
  }
  return map
})()

/** Every family entered more than once across the style lists (for the unit test). */
export function duplicateStyleFamilies() {
  const seen = new Set()
  const dupes = []
  for (const style of FONT_STYLES) {
    for (const family of FAMILIES[style.id]) {
      const key = family.toLowerCase()
      if (seen.has(key)) dupes.push(family)
      seen.add(key)
    }
  }
  return dupes
}

/** Every listed family with its style and the category that style needs (for the unit test). */
export function listedStyleFamilies() {
  return FONT_STYLES.flatMap((style) => FAMILIES[style.id].map((family) => ({ family, style: style.id, category: style.category })))
}

/** The style id of a catalogue family, or '' when the list does not name it. */
export function fontStyleOf(font) {
  if (!font || typeof font.family !== 'string') return ''
  const category = String(font.category || '').toLowerCase()
  const fits = (id) => (id && STYLE_BY_ID.get(id)?.category === category ? id : '')
  const listed = fits(STYLE_OF_FAMILY.get(font.family.toLowerCase()))
  if (listed) return listed
  for (const [pattern, id] of NAME_RULES) {
    if (pattern.test(font.family)) return fits(id)
  }
  return ''
}

/** Does a font pass the Style filter? 'any' passes everything. */
export function matchesFontStyle(font, style) {
  return !style || style === 'any' || fontStyleOf(font) === style
}

/** How many of `fonts` sit in each style: { geometric: 84, ... }. */
export function fontStyleCounts(fonts) {
  const counts = Object.fromEntries(FONT_STYLES.map((s) => [s.id, 0]))
  for (const font of fonts || []) {
    const id = fontStyleOf(font)
    if (id) counts[id] += 1
  }
  return counts
}

/** The label for a style id: "Old style". 'any' reads "Any". */
export function fontStyleLabel(id) {
  return STYLE_BY_ID.get(id)?.label || 'Any'
}
