// The data and pure helpers the onboarding screen builds a first kit from.
//
// DOM-free and React-free so a unit test can call the real functions. The screen
// (src/pages/Onboarding.jsx) only renders what these return.

import { autoTonalFromSeed, contrastRatio, generateTintScale } from './colors'
import { colorName } from './paletteNames'
import { DEFAULT_DESIGN, tintConfigFor } from '../data/designDefaults'
import { HOME_EXPORT_IMAGES, homeExportSrc, homeExportSrcSet } from '../components/home/homeExportsImages'

/** The two inks a swatch's own text can take: the app's dark and light roles. */
export const INK_DARK = '#060607'
export const INK_LIGHT = '#EFEEEA'

/** The type scale every first kit starts on (Major third, base 16). It is changed later in Type Scale. */
export const KIT_TYPE_SCALE = Object.freeze({ base: 16, ratio: 1.25 })

/** The sizes of the eight "Ag" specimens, in px, at that scale. */
export const RAIL_SIZES = Object.freeze([13, 16, 20, 25, 31, 39, 49, 61])

export const DEFAULT_PROJECT_NAME = 'My brand kit'

// ── Sample brands ───────────────────────────────────────────────────────────
// Five invented businesses, each shown as a sample and labelled as one. A brand's
// `colors` are its own, action colour first. `renders` are ids in HOME_EXPORT_IMAGES;
// a brand with none shows no export strip.
const brand = (id, name, colors, hf, hw, bf, bw, line, para, renders = []) => ({
  id,
  name,
  action: colors[0][1],
  colors: colors.map(([n, hex]) => ({ name: n, hex })),
  heading: { family: hf, weight: hw },
  body: { family: bf, weight: bw },
  line,
  para,
  renders,
})

export const BRANDS = Object.freeze([
  brand('kerbside', 'Kerbside',
    [['Signal', '#FF5A1F'], ['Asphalt', '#1A1A1A'], ['Concrete', '#E6E4DE'], ['White', '#FFFFFF'], ['Soft Asphalt', '#3A3936']],
    'Archivo', 800, 'IBM Plex Sans', 400,
    'Booked by ten. There by twelve.',
    'Kerbside is a bike courier in Melbourne. Book a pickup by ten and your parcel is there by twelve. Riders, not vans, across the city.',
    ['guide-cover', 'brandkit-palette']),
  brand('shallow-end', 'Shallow End',
    [['Lane', '#0E5C4A'], ['Chalk', '#FBF7F0'], ['White', '#FFFFFF'], ['Deep end', '#1B2B27'], ['Float', '#FFB38A']],
    'Bricolage Grotesque', 700, 'Nunito Sans', 400,
    'Lessons that fit after school.',
    'Shallow End is a swim school in Hobart. Children learn after school, week by week, with a named teacher and their own lane held for them.',
    ['shallow-end-guide-signage']),
  brand('margin', 'Margin',
    [['Plum', '#6A2C5A'], ['Type', '#1C1A17'], ['Rod', '#686C70'], ['White', '#FFFFFF'], ['Card', '#F1F1EC']],
    'Goudy Bookletter 1911', 400, 'Newsreader', 400,
    'Books with room to think.',
    'Margin is an independent publisher in Perth. We print slowly, on uncoated paper, and publish novels and essays that need room to be read slowly.'),
  brand('northern-current', 'Northern Current',
    [['Sunbelt', '#F2A900'], ['Night', '#12161F'], ['Spinifex', '#B4561F'], ['Quiet', '#545B66'], ['White', '#FFFFFF']],
    'Red Hat Display', 900, 'Red Hat Text', 400,
    'Your roof, working by Thursday.',
    'Northern Current installs solar on Darwin roofs. Get a quote, pick an install day, and see what your system makes. Your roof, working by Thursday.'),
  brand('two-shores', 'Two Shores',
    [['Rope', '#9C4A1F'], ['Deck', '#F4F4F1'], ['Hull', '#0F1A1C'], ['Buoy', '#FFC72C'], ['White', '#FFFFFF']],
    'Barlow Condensed', 700, 'Barlow', 400,
    'Every 20 minutes, both ways.',
    'Two Shores is a river ferry in Newcastle. A ferry leaves Queens Wharf for Stockton every 20 minutes, and one comes back. Across in six.',
    ['two-shores-guide-signage']),
])

export const KERBSIDE = BRANDS[0]

export const brandById = (id) => BRANDS.find((b) => b.id === id) || null

// ── Font pairs ──────────────────────────────────────────────────────────────
// Three pairs from the font pair list. A sample brand adds its own pair first.
export const PAIRS = Object.freeze([
  { id: 'p1', name: 'Archivo and IBM Plex Sans', note: 'Heavy sans, plain sans',
    heading: { family: 'Archivo', weight: 800, category: 'sans-serif' }, body: { family: 'IBM Plex Sans', weight: 400, category: 'sans-serif' } },
  { id: 'p2', name: 'Playfair Display and Inter', note: 'Serif heading, neutral sans',
    heading: { family: 'Playfair Display', weight: 700, category: 'serif' }, body: { family: 'Inter', weight: 400, category: 'sans-serif' } },
  { id: 'p3', name: 'DM Sans and JetBrains Mono', note: 'Sans heading, mono body',
    heading: { family: 'DM Sans', weight: 700, category: 'sans-serif' }, body: { family: 'JetBrains Mono', weight: 400, category: 'monospace' } },
])

const SERIF_FACES = new Set(['Goudy Bookletter 1911', 'Newsreader'])
const categoryOf = (family) => (SERIF_FACES.has(family) ? 'serif' : 'sans-serif')

/** A sample brand's own pair, as a pair in the list. */
export function ownPair(b) {
  return {
    id: 'own',
    name: `${b.name}’s own pair`,
    note: `${b.heading.family} and ${b.body.family}`,
    heading: { ...b.heading, category: categoryOf(b.heading.family) },
    body: { ...b.body, category: categoryOf(b.body.family) },
  }
}

/** The pairs to offer: Kerbside's own pair is the first list entry, so only the other brands add theirs. */
export function pairsFor(b) {
  return b && b.id !== KERBSIDE.id ? [ownPair(b), ...PAIRS] : PAIRS
}

/** The pair that starts selected: the brand's own, else the first. */
export const defaultPairId = (b) => (b && b.id !== KERBSIDE.id ? 'own' : 'p1')

// ── Colour ──────────────────────────────────────────────────────────────────

/** `#RRGGBB` (upper case) from six hex digits with or without the `#`, or null. */
export function normHex(text) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(text ?? '').trim())
  return m ? `#${m[1].toUpperCase()}` : null
}

/** The ink that reads on `hex`: whichever of the two roles has the higher contrast. */
export const fgFor = (hex) => (contrastRatio(hex, INK_DARK) >= contrastRatio(hex, INK_LIGHT) ? INK_DARK : INK_LIGHT)

/** What a colour's own text reaches against its ink, as the badge on its column. */
export function aaFor(hex) {
  const r = contrastRatio(hex, fgFor(hex))
  if (r >= 4.5) return 'AA'
  return r >= 3 ? 'AA large' : 'Below AA'
}

const autoCache = new Map()
/** The builder's Auto result for a seed, named with the builder's own colour names. */
export function autoColumns(hex) {
  let cols = autoCache.get(hex)
  if (!cols) {
    cols = autoTonalFromSeed(hex).map((c) => {
      const h = c.toUpperCase()
      return { name: colorName(h), hex: h }
    })
    autoCache.set(hex, cols)
  }
  return cols
}

const stripCache = new Map()
/** Six of the eleven shade stops (200, 300, 400, 500, 700, 900) the builder makes for a colour. */
export function shadeStrip(hex) {
  let strip = stripCache.get(hex)
  if (!strip) {
    const tints = generateTintScale({ ...tintConfigFor(DEFAULT_DESIGN), hex })
    strip = [2, 3, 4, 5, 7, 9].map((i) => tints[i])
    stripCache.set(hex, strip)
  }
  return strip
}

/**
 * The five columns on screen: the chosen sample brand's colours, else Auto for a
 * committed colour, else Kerbside's.
 */
export function columnsFor({ start, committed }) {
  const b = start && brandById(start)
  if (b) return b.colors
  if (committed) return autoColumns(committed)
  return KERBSIDE.colors
}

/** Ground, ink and action for the specimen: the lightest of the five, the darkest, and the first. */
export function specimenColours(cols) {
  const lum = (hex) => contrastRatio(hex, '#000000')
  const byLight = [...cols].sort((a, b) => lum(b.hex) - lum(a.hex))
  return { ground: byLight[0].hex, ink: byLight[byLight.length - 1].hex, action: cols[0].hex }
}

/** The cover headline's size in px, from how long the project name is. */
export function coverSize(name) {
  const n = [...name.trim()].length
  if (n <= 17) return 61
  if (n <= 21) return 49
  return 39
}

// ── Export renders ──────────────────────────────────────────────────────────

const RENDER_LABELS = {
  'guide-cover': 'guide cover',
  'brandkit-palette': 'brand kit palette',
  'shallow-end-guide-signage': 'signage guide',
  'two-shores-guide-signage': 'signage guide',
}

/** The sample renders for a brand, as image props; empty when the brand has none. */
export function rendersFor(b) {
  return (b?.renders || []).map((id) => {
    const image = HOME_EXPORT_IMAGES[id]
    return {
      id,
      label: RENDER_LABELS[id] || id,
      src: homeExportSrc(id, 'webp'),
      srcSet: homeExportSrcSet(id, 'webp'),
      width: image.width,
      height: image.height,
    }
  })
}

// ── What Save writes ────────────────────────────────────────────────────────

/** The `patch` saveProject folds into the saved design. */
export function kitPatch(cols, pair) {
  const colors = cols.map((c) => c.hex)
  return {
    palette: { base: colors[0], colors },
    fonts: { heading: { ...pair.heading }, body: { ...pair.body } },
    typeScale: { ...KIT_TYPE_SCALE },
    chosen: { palette: true, fonts: true, 'type-scale': true },
  }
}
