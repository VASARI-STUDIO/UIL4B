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
 *
 * THE BOUNDARIES ARE HCT HUE, AND THAT IS THE WHOLE POINT OF THIS COMMENT.
 * The cuts below used to be spaced as if `hue` were an sRGB/HSL angle, but
 * every caller feeds this `hexToHct(hex)[0]`, and the two wheels are rotated
 * against each other by as much as 45° in the blues. Measured, by walking the
 * sRGB wheel at s60 l40 through `hexToHct`:
 *
 *     sRGB   0 red 23 · 30 orange 61 · 60 yellow 111 · 120 green 143
 *          160 teal 168 · 180 cyan 197 · 200 sky 237 · 220 azure 269
 *          240 blue 285 · 260 indigo 300 · 280 violet 318 · 300 magenta 334
 *
 * Against the old cuts that put EVERY ordinary blue in the purple vocabulary
 * and every purple in the pink one — the founder's report was "Bauhaus
 * Mulberry" sitting on #97ADCD, a pale blue. #97ADCD is HCT hue 256; the old
 * `h < 255 → ocean` missed it by one degree and it fell through to `cosmic`.
 * It was not an edge case: azure (269) and blue (285) are both past that cut,
 * so #3558B9 was "Dusky Iris" and #405C9D was "Smoked Mauve". The second break
 * was `h < 45 → chroma > 45 ? sunset : nature`, which sent any muted red or
 * orange-red into the all-green `nature` bank: #904C2A, a burnt orange, was
 * titled "Deep Thyme".
 *
 * The cuts now sit on the measured anchors, and each bank's own vocabulary
 * spans exactly the range it is given — no word was added, moved or invented:
 *
 *     325..15   candy / sunset  magenta → pink → crimson
 *      15..120  sunset          red → terracotta → ochre → amber
 *     120..180  nature          yellow-green → green → verdigris
 *     180..290  ocean           cyan → cerulean → cobalt → indigo
 *     290..325  cosmic          violet → amethyst → mulberry
 *
 * This fixes the FAMILY error — a blue is no longer named as a purple. It does
 * not order the words WITHIN a bank by hue, so a teal can still draw "Delft".
 * That is a known, narrower gap: see the pipeline row for this change.
 */
export function themeForHue(hue, chroma, hasAccent) {
  // A colour we could not read at all is a grey as far as vocabulary goes —
  // never let NaN fall through every comparison and land on a hue bucket.
  if (!Number.isFinite(hue) || !Number.isFinite(chroma)) return 'mono'
  if (chroma < 12) return hasAccent ? 'tech' : 'mono'          // mostly greys
  const h = ((hue % 360) + 360) % 360
  if (h < 15 || h >= 325) return chroma > 55 ? 'candy' : 'sunset' // magenta → crimson
  if (h < 120) return 'sunset'                                   // red → amber
  if (h < 180) return 'nature'                                   // yellow-green → teal
  if (h < 290) return 'ocean'                                    // cyan → blue
  return 'cosmic'                                                // indigo → violet
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
