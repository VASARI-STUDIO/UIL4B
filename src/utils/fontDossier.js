// Explicit .js: this module is imported directly by tests/unit/font-dossier
// under `node --test`, and node's ESM resolver does not guess extensions the
// way Vite's does. Vite is happy with the extension either way.
import { formatSubsets, weightName } from './fontGallery.js'

// The facts a font popup can honestly state about a family, and the vocabulary
// for saying them. Split out of FontDossier.jsx because these are not
// components (the react-refresh rule is right — a file that exports both loses
// fast refresh), and because the derivation is the part worth unit-testing:
// what this returns is what the About tab claims about a real typeface, so a
// wrong row here is a false statement about somebody's work.
//
// THE RULE THIS MODULE EXISTS TO ENFORCE: a field the catalogue does not supply
// is OMITTED, never guessed. Every row below is carried straight through from
// Google's own family metadata (see api/fonts.js). Nothing is inferred from the
// family name, nothing is hand-authored per family, and nothing is defaulted to
// a plausible-looking value.

// TWO EXAMPLE TABS, and the split between them is the founder's own sentence
// (2026-09-05): "1 tab showing Usage examples using some made mockup use cases,
// but ... a tab showing real world use applications for each font and an image
// to show it".
//
//   examples  MOCKUPS. Situations this page draws itself, chosen from what kind
//             of face the family is. Invented by construction and labelled as
//             such at the top of the panel. Nothing in it is a claim about
//             anybody's brand.
//   inuse     PHOTOGRAPHS of real work. Ships EMPTY — see data/fontRealWorldUses
//             for why, and for what an entry has to carry before it may be
//             drawn. [fonts-in-use-surface] stays blocked; this is the slot it
//             will fill, not a claim that it has been filled.
//
// "In use" rather than "Real world": it is the vocabulary fontsinuse.com itself
// uses, and the panel links there. The two labels have to be legible as
// DIFFERENT KINDS OF THING from the tab strip alone, which is why the invented
// one is not also called something that sounds real.
export const DOSSIER_TABS = [
  { id: 'specimen', label: 'Specimen' },
  { id: 'about', label: 'About' },
  { id: 'examples', label: 'Examples' },
  { id: 'inuse', label: 'In use' },
]

// What a CLASSIFICATION is for. Deliberately about the category and never about
// the individual family: "serifs read well at length" is a property of serifs
// and is safe to state; "this face was cut for newspaper setting" is a claim
// about one typeface's history that the catalogue cannot support. The heading
// rendered above this says which of the two the reader is getting.
export const CATEGORY_NOTE = {
  'sans-serif': 'Strokes end without terminals, so the shapes stay clean when they get small or when the screen is not sharp. This is the default class for interface text, labels and anything read on a screen at length.',
  serif: 'Terminal strokes give each letter more distinguishing detail, which is what makes serifs hold up over hundreds of words. Conventional for long-form reading and for anything that wants to read as considered rather than current.',
  display: 'Cut for size. Display faces carry personality at a headline and usually lose legibility below it, so they pair with a plain body face rather than doing both jobs.',
  handwriting: 'Drawn to read as written by hand. Effective for a signature moment and difficult to read in a paragraph, so treat it as an accent and keep the surrounding page neutral.',
  monospace: 'Every character occupies the same width, so columns line up without being aligned. That is the point for code, tabular figures, and any UI where a number must not shift as it changes.',
}

// Google's variable-axis tags, named. A tag alone ("opsz") is a lookup task.
const AXIS_NAMES = {
  wght: 'Weight',
  wdth: 'Width',
  opsz: 'Optical size',
  slnt: 'Slant',
  ital: 'Italic',
  GRAD: 'Grade',
  YTLC: 'Lowercase height',
  YTUC: 'Uppercase height',
  XTRA: 'Counter width',
  XOPQ: 'Stroke thickness',
  YOPQ: 'Thin stroke',
  CASL: 'Casual',
  MONO: 'Monospace',
  SOFT: 'Softness',
  CRSV: 'Cursive',
  FILL: 'Fill',
}

export const CATEGORY_LABEL = {
  'sans-serif': 'Sans-serif',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Handwriting',
  monospace: 'Monospace',
}

export function titleCase(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/(^|\s)([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase())
}

// A list of names as English rather than as an array: "Ana and Bo", not
// "Ana, Bo". Six designers is the most any family in the catalogue credits.
export function nameList(names) {
  const list = (names || []).filter(Boolean)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

// "2011-11-16" → "2011". The day a family landed on Google Fonts is real but
// spurious precision for this panel; the year is the fact a reader uses.
export function yearOf(iso) {
  const match = /^(\d{4})/.exec(String(iso || ''))
  return match ? match[1] : ''
}

/**
 * The facts the loaded catalogue actually holds for a family, in reading order.
 * `licences` is the family-to-SPDX table from src/data/fontLicences.json; it is
 * passed in because that file loads on demand.
 */
export function fontFacts(font, licences) {
  if (!font) return []
  const rows = []

  const category = CATEGORY_LABEL[font.category] || titleCase(font.category)
  if (category) rows.push({ k: 'Classification', v: category })

  const designers = nameList(font.designers)
  if (designers) {
    rows.push({ k: font.designers.length === 1 ? 'Designer' : 'Designers', v: designers })
  }

  // LABELLED FOR WHAT IT IS. This is the date the family was published to
  // Google Fonts, which for a revival of an older typeface is nowhere near when
  // it was drawn. "Released" or "Designed" here would be a fabrication, and the
  // test suite pins the wording for that reason.
  const year = yearOf(font.dateAdded)
  if (year) rows.push({ k: 'Added to Google Fonts', v: year })

  const weights = [...(font.variants || [])].filter(Number.isFinite).sort((a, b) => a - b)
  if (weights.length) {
    const low = weights[0]
    const high = weights[weights.length - 1]
    const range = weights.length === 1
      ? `${weightName(low) || low} ${low}`
      : `${weightName(low) || low} ${low} to ${weightName(high) || high} ${high}`
    rows.push({ k: 'Weights', v: `${weights.length} — ${range}` })
  }

  // Only stated when the catalogue actually knows. `italics` is absent from an
  // older cached catalogue, and "Roman only" would be a claim, not a silence.
  if (typeof font.italics === 'boolean') {
    rows.push({ k: 'Styles', v: font.italics ? 'Roman and italic' : 'Roman only' })
  }

  const axes = (font.axes || []).filter(Boolean)
  if (axes.length) {
    rows.push({ k: 'Variable axes', v: axes.map(tag => AXIS_NAMES[tag] || tag).join(', ') })
  }

  // `formatSubsets` drops the `menu` subsetting artefact for every caller —
  // this used to filter it locally, which left the gallery's own header tags
  // still printing "Menu" beside this row's list that did not.
  const scripts = formatSubsets(font.subsets)
  if (scripts.length) rows.push({ k: 'Scripts', v: scripts.join(', ') })

  // Named from the licence table, never from the catalogue's open-source flag:
  // that flag says nothing about which licence applies. Until the table has
  // loaded there is nothing to name, so the row is left out.
  const licence = fontLicence(font, licences)
  if (licence) rows.push({ k: 'Licence', v: licence.heading })

  if (Number.isFinite(font.popularity)) {
    rows.push({ k: 'Popularity', v: `#${(font.popularity + 1).toLocaleString()} by use on Google Fonts` })
  }

  return rows
}

// The licences a family can be published under, keyed by SPDX id. `summary` is
// one plain sentence on what the licence allows, shown under the heading.
export const LICENCES = {
  'OFL-1.1': {
    heading: 'SIL Open Font License 1.1',
    summary: 'Free to use in personal and commercial work, including apps and logos. You can\u2019t sell the font files on their own.',
    href: 'https://openfontlicense.org',
  },
  'Apache-2.0': {
    heading: 'Apache License 2.0',
    summary: 'Free to use in personal and commercial work. Keep the licence notice if you share the font files.',
    href: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  'UFL-1.0': {
    heading: 'Ubuntu Font Licence 1.0',
    summary: 'Free to use in personal and commercial work. A changed version can\u2019t use the Ubuntu name.',
    href: 'https://ubuntu.com/legal/font-licence',
  },
}

export const LICENCE_LINK_LABEL = 'Read the licence \u2197'

// Shown when a family is not in the table: it points at the one place that does
// know, and never asserts a licence.
const LICENCE_UNKNOWN = {
  heading: 'Licence on Google Fonts',
  summary: 'Check the licence on Google Fonts before you ship.',
}

/**
 * The table key for a family name: lowercase letters and digits only, which is
 * how the google/fonts repository names a family's folder ("Open Sans" is
 * "opensans"). scripts/build-font-licences.mjs writes the table under these.
 */
export function licenceKey(family) {
  return String(family || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function googleFontsPage(family) {
  return `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, '+')}`
}

/**
 * What the pop-up shows for a family's licence:
 * { id, heading, summary, href, linkLabel }, where `id` is the SPDX id or null.
 * Returns null when there is no family or the table has not loaded, so a slow
 * table reads as silence and not as "unknown". A family missing from a loaded
 * table, or mapped to an id this module has no text for, gets the Google Fonts
 * fallback.
 */
export function fontLicence(font, table) {
  if (!font?.family || !table || typeof table !== 'object') return null
  const key = licenceKey(font.family)
  const id = Object.hasOwn(table, key) ? table[key] : null
  if (typeof id === 'string' && Object.hasOwn(LICENCES, id)) {
    return { id, ...LICENCES[id], linkLabel: LICENCE_LINK_LABEL }
  }
  return {
    id: null,
    ...LICENCE_UNKNOWN,
    href: googleFontsPage(font.family),
    linkLabel: LICENCE_LINK_LABEL,
  }
}

/** True when the loaded catalogue carries none of the enriched About fields. */
export function facesThinCatalogue(font) {
  return !font?.designers?.length && !font?.dateAdded
}
