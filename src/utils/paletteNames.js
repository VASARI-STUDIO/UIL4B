// Themed colour naming for the Palette Builder.
//
// Two consumers, one vocabulary:
//
//   · `colorName(hex)`   — the DETERMINISTIC title shown on each board column.
//                          Same colour in, same name out, forever.
//   · `randomPaletteName(colors)` — the deliberately RANDOM whole-palette name
//                          behind the dice button in the community submit form.
//
// WHY THIS EXISTS AS A MODULE: the column titles were hard-coded positional
// role labels (`ROLES[i]` → PRIMARY / SECONDARY / ACCENT / SUBTLE / DEEP), so
// they described a slot rather than a colour and could never track the colour
// the slot was showing. Switching the palette to Monochromatic left "SUBTLE"
// sitting over a colour that was nothing of the kind — the founder's report.
// The vocabulary to describe a colour already existed here; nothing was
// deriving a per-colour name from it. Pulling it out of the page component
// makes the determinism contract directly unit-testable.
//
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { hexToHct } from './colors.js'
import { normaliseHex } from './paletteAdjust.js'

// We bucket a colour (or a whole palette) by dominant HCT hue — weighted by
// chroma so near-greys barely vote — plus overall chroma, then stitch an
// adjective + noun from a themed wordlist: greens → nature, warm hues →
// sunset, blues → ocean, greys → mono/tech, and so on.
// Each theme carries three banks: `adj` (editorial modifiers), `noun` (material
// / pigment names that can also stand alone), and `solo` (evocative single
// words that need no adjective). Vocabulary leans on architecture, pigment and
// interiors language so the output reads like a magazine colour story.
export const NAME_THEMES = {
  sunset: {
    adj: ['Burnished', 'Sun-Baked', 'Molten', 'Faded', 'Antique', 'Scorched', 'Aged', 'Raw'],
    noun: ['Terracotta', 'Sienna', 'Ochre', 'Oxblood', 'Corten', 'Ember', 'Saffron', 'Cinnabar', 'Marmalade', 'Rust', 'Amber', 'Vermilion'],
    solo: ['Sfumato', 'Kiln', 'Adobe', 'Harvest', 'Firebrick', 'Persimmon'],
  },
  nature: {
    adj: ['Weathered', 'Dusty', 'Muted', 'Deep', 'Pale', 'Wild', 'Soft', 'Sun-Bleached'],
    noun: ['Sage', 'Moss', 'Olive', 'Verdigris', 'Celadon', 'Fern', 'Eucalyptus', 'Malachite', 'Laurel', 'Thyme', 'Pistachio', 'Patina'],
    solo: ['Conservatory', 'Botanica', 'Foliage', 'Wintergreen', 'Bracken', 'Undergrowth'],
  },
  ocean: {
    adj: ['Deep', 'Glacial', 'Faded', 'Cold', 'Washed', 'Nordic', 'Muted', 'Antique'],
    noun: ['Indigo', 'Cobalt', 'Prussian', 'Cerulean', 'Slate', 'Teal', 'Delft', 'Denim', 'Marine', 'Glacier', 'Azure', 'Petrol'],
    solo: ['Nocturne', 'Fathom', 'Meridian', 'Bathhouse', 'Cyanotype', 'Deepwater'],
  },
  cosmic: {
    adj: ['Velvet', 'Regal', 'Dusky', 'Smoked', 'Deep', 'Faded', 'Antique', 'Muted'],
    noun: ['Aubergine', 'Plum', 'Amethyst', 'Damson', 'Orchid', 'Iris', 'Mulberry', 'Byzantine', 'Tyrian', 'Mauve', 'Wine', 'Heather'],
    solo: ['Twilight', 'Vespers', 'Nightfall', 'Obscura', 'Penumbra', 'Aster'],
  },
  candy: {
    adj: ['Soft', 'Faded', 'Sun-Washed', 'Bright', 'Powdered', 'Dusty', 'Vivid', 'Antique'],
    noun: ['Rose', 'Blush', 'Coral', 'Peony', 'Fuchsia', 'Raspberry', 'Flamingo', 'Sorbet', 'Guava', 'Watermelon', 'Bubblegum', 'Punch'],
    solo: ['Confetti', 'Aperitif', 'Camellia', 'Pomelo', 'Gelato', 'Rosewater'],
  },
  tech: {
    adj: ['Brushed', 'Signal', 'Cold', 'Anodised', 'Electric', 'Muted', 'Matte', 'Charged'],
    noun: ['Titanium', 'Chrome', 'Cobalt', 'Graphite', 'Pewter', 'Gunmetal', 'Steel', 'Neon', 'Circuit', 'Alloy', 'Carbon', 'Signal'],
    solo: ['Monolith', 'Wireframe', 'Datum', 'Hologram', 'Blueprint', 'Interface'],
  },
  mono: {
    adj: ['Raw', 'Aged', 'Bare', 'Soft', 'Weathered', 'Matte', 'Pale', 'Warm'],
    noun: ['Alabaster', 'Travertine', 'Basalt', 'Graphite', 'Pewter', 'Greige', 'Oatmeal', 'Bone', 'Concrete', 'Plaster', 'Limestone', 'Chalk'],
    solo: ['Brutalist', 'Terrazzo', 'Vellum', 'Parchment', 'Gesso', 'Monochrome'],
  },
}

// Art-movement / atelier prefixes that pair with any theme noun for a
// gallery-label feel ("Bauhaus Ochre", "Atelier Sienna").
export const NAME_MOVEMENTS = ['Bauhaus', 'Atelier', 'Modernist', 'Nordic', 'Studio', 'Salon', 'Deco', 'Archive']

/**
 * The one hue→vocabulary rule, shared by the palette name and the column
 * titles so the two can never disagree about what a colour IS.
 */
export function themeForHue(hue, chroma, hasAccent) {
  // A colour we could not read at all is a grey as far as vocabulary goes —
  // never let NaN fall through every comparison and land on a hue bucket.
  if (!Number.isFinite(hue) || !Number.isFinite(chroma)) return 'mono'
  if (chroma < 12) return hasAccent ? 'tech' : 'mono'          // mostly greys
  const h = ((hue % 360) + 360) % 360
  if (h < 15 || h >= 330) return chroma > 55 ? 'candy' : 'sunset' // red / pink
  if (h < 45) return chroma > 45 ? 'sunset' : 'nature'           // orange
  if (h < 90) return 'sunset'                                    // yellow-amber
  if (h < 165) return 'nature'                                   // green
  if (h < 255) return 'ocean'                                    // cyan-blue
  if (h < 300) return 'cosmic'                                   // purple
  return 'candy'                                                 // magenta
}

/** Which vocabulary a whole palette belongs to. */
export function paletteTheme(colors) {
  if (!colors?.length) return 'mono'
  let sumC = 0, hasAccent = false
  const hueBins = {}
  for (const hex of colors) {
    let h, c
    try { [h, c] = hexToHct(hex) } catch { continue }
    sumC += c
    if (c > 25) hasAccent = true
    const key = (Math.round(h / 30) * 30) % 360   // 12 coarse hue bins
    hueBins[key] = (hueBins[key] || 0) + c        // vote weighted by chroma
  }
  const avgC = sumC / colors.length
  const domHue = Number(Object.entries(hueBins).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
  return themeForHue(domHue, avgC, hasAccent)
}

/**
 * Which vocabulary ONE colour belongs to. The palette version bins hues into
 * 30° buckets so several colours can vote as a bloc; a single colour has no
 * one to out-vote, and binning would only round it across a boundary its own
 * hue does not cross — so this reads the exact hue.
 */
export function colorTheme(hex) {
  let h, c
  try { [h, c] = hexToHct(hex) } catch { return 'mono' }
  return themeForHue(h, c, c > 25)
}

/* ── the deterministic column title ──────────────────────────────────────── */

// FNV-1a over the canonical hex. The name has to be a pure function of the
// COLOUR and of nothing else: not of the slot index, not of render order, not
// of a random roll. That is what makes a system change rewrite every title
// that changed colour while leaving an unrelated re-render — or a re-render of
// the same board — byte-for-byte identical.
function hashHex(hex) {
  let h = 0x811c9dc5
  for (let i = 0; i < hex.length; i++) {
    h ^= hex.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * The title shown on a board column: an adjective + noun drawn from the
 * colour's OWN theme. Deterministic — the same hex always produces the same
 * name, in any palette, in any slot, on any run.
 *
 * Both banks are widened past the theme's own lists, and the reason is not
 * decoration: a switch of colour system has to visibly re-title the columns it
 * moved. With 8 × 12 = 96 pairs, five new colours had roughly a one-in-four
 * chance of leaving at least one slot showing the name it had before — which
 * is indistinguishable, on screen, from the stale-title bug this replaced.
 * The movement prefixes and the solo words push it to 16 × 18 = 288 and the
 * odds to about one in sixty, without inventing any new vocabulary: both
 * extras already pair with theme nouns elsewhere in this module.
 */
export function colorName(hex) {
  const key = normaliseHex(hex) || String(hex ?? '').toUpperCase()
  const theme = NAME_THEMES[colorTheme(key)] || NAME_THEMES.mono
  const adjectives = [...theme.adj, ...NAME_MOVEMENTS]
  const nouns = [...theme.noun, ...theme.solo]
  const h = hashHex(key)
  // Two independent digits out of one hash: the low one picks the adjective,
  // the quotient picks the noun, so the pair varies across the whole space
  // rather than the two moving in lockstep.
  const adj = adjectives[h % adjectives.length]
  const noun = nouns[Math.floor(h / adjectives.length) % nouns.length]
  return `${adj} ${noun}`
}

/** Titles for a whole board, in slot order. Pure over the colour list. */
export function paletteColorNames(colors) {
  return (colors || []).map(colorName)
}

/* ── the random whole-palette name (community submit dice) ───────────────── */

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)]

/**
 * Compose a name from one of several editorial patterns so repeated rolls feel
 * curated, not templated: "Burnished Sienna", "Travertine", "Corten & Ash",
 * "Bauhaus Ochre", "Nocturne No. 4", "Sienna Study".
 *
 * Deliberately random — this one is a dice button, not a title.
 */
export function randomPaletteName(colors) {
  const theme = NAME_THEMES[paletteTheme(colors)] || NAME_THEMES.mono
  const adj = () => pickOne(theme.adj)
  const noun = () => pickOne(theme.noun)
  const patterns = [
    () => `${adj()} ${noun()}`,
    () => `${adj()} ${noun()}`,        // weight the classic pair a little heavier
    () => pickOne(theme.solo),
    () => `${pickOne(NAME_MOVEMENTS)} ${noun()}`,
    () => `${noun()} Study`,
    () => `${pickOne(theme.solo)} No. ${2 + Math.floor(Math.random() * 8)}`,
    () => {
      // "A & B" — two distinct nouns from the theme.
      const a = noun()
      let b = noun()
      let guard = 0
      while (b === a && guard++ < 5) b = noun()
      return b === a ? `${adj()} ${a}` : `${a} & ${b}`
    },
  ]
  return pickOne(patterns)()
}
