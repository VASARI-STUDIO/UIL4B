// Explicit .js, same reason as fontDossier.js: this module is imported directly
// by tests/unit/font-scenes under `node --test`, and node's ESM resolver does
// not guess extensions the way Vite's does.
import { ladderWeights } from './fontGallery.js'

// WHICH SITUATIONS A FAMILY IS SHOWN IN, chosen from what the family actually
// is.
//
// THE DEFECT THIS EXISTS TO FIX, stated as the founder stated it three times
// (2026-08-08, 2026-08-15, 2026-09-04): "for the font examples i want real
// world examples not the same UI examples for each one". He was exactly right.
// The Examples tab held a module-level array of four fixed scenes — an article
// opening, interface chrome, a pricing table and a display line — rendered
// identically for all 1,946 families, and `font.category` was not read once.
// Pacifico got a data table. Libre Barcode 39 got a pricing table. Playfair
// Display got a long-form reading column.
//
// ── WHY `category` ALONE COULD NOT FIX IT ────────────────────────────────────
//
// The obvious fix — branch on `font.category` — does not work, and the reason
// is worth writing down so nobody tries it again. Google's metadata carries
// THREE descriptions of a family and /api/fonts was keeping only the weakest:
//
//   category        1,946/1,946   sans-serif | serif | display | handwriting |
//                                 monospace
//   classifications 1,089/1,946   Display 813 | Handwriting 377 |
//                                 Monospace 53 | Symbols 22
//   stroke          1,361/1,946   Sans Serif 916 | Serif 415 | Slab Serif 30
//
// `category` and `classifications` DISAGREE for 351 families. Playfair Display
// is category "Serif" with classifications ["Display"] — and so are Anton,
// Bebas Neue, Archivo Black and DM Serif Display, all of which category calls
// plain text faces. Branching on category alone would have handed every one of
// them the long-form reading column that is the founder's actual complaint.
//
// `stroke` recovers a distinction category ERASES: Slab Serif, which category
// folds into Serif. And `classifications` is the only field that identifies the
// 22 SYMBOL families — Libre Barcode, Noto Music, Yarndings, Wavefont — where
// setting a paragraph is not a weak example, it is nonsense.
//
// Measured over the whole catalogue: 276 families (14.2%) get a different set
// of scenes here than `category` alone would have given them.
//
// ── THE DEGRADED PATH IS REAL, AND IT IS NOT THE COMMON ONE ──────────────────
//
// Every one of the 1,946 families in the live metadata carries at least one of
// `classifications` or `stroke` — the count of families with NEITHER is zero.
// So the fallback to `category` is not a 44%-of-the-catalogue path; it is the
// WHOLE-CATALOGUE-IS-THIN path, and there are exactly three ways to reach it:
//
//   1. src/data/fallbackFonts.js, the bundled last-resort list, which carries
//      family/category/variants/subsets and nothing else.
//   2. A deployment with VITE_GOOGLE_FONTS_API_KEY set, where the client goes
//      straight to the WebFonts API — which has no classifications or stroke at
//      all — and never reaches /api/fonts.
//   3. A localStorage catalogue cached before this shipped. Self-heals inside
//      the 24-hour TTL.
//
// On all three the role still comes out defensible rather than wrong: category
// alone still separates a script from a mono from a serif, so a family gets a
// sensibly-shaped set of scenes. What it loses is the sharpening — a display
// serif reads as a text serif, and a slab reads as a serif. That is a WORSE
// ANSWER, not a DIFFERENT ONE, which is the bar this was allowed to ship at.
//
// ── AND WHERE THERE IS NO CATEGORY EITHER ────────────────────────────────────
//
// A family still knows its own variants, weight range and italic availability
// even with no descriptive field at all, so the last resort is NOT one fixed
// template: `sceneIdsFor` still appends the weight ladder when the family ships
// three or more cuts, and still withholds it when it ships one. Two
// single-weight families and two nine-weight families do not all render the
// same panel.

/** Google's `classifications` values, as this module spells them. */
const CLS_SYMBOLS = 'Symbols'
const CLS_MONOSPACE = 'Monospace'
const CLS_HANDWRITING = 'Handwriting'
const CLS_DISPLAY = 'Display'

const has = (font, value) =>
  Array.isArray(font?.classifications) && font.classifications.includes(value)

/**
 * The SHAPE of the letters — what the strokes do — independent of the job the
 * family is for. Only `stroke` knows Slab Serif; `category` folds it into
 * Serif, so a degraded catalogue returns 'serif' for a slab and the scenes
 * shift accordingly rather than claiming a distinction we cannot see.
 */
export function familyShape(font) {
  const stroke = String(font?.stroke || '').toLowerCase()
  if (stroke === 'slab serif') return 'slab'
  if (stroke === 'serif') return 'serif'
  if (stroke === 'sans serif') return 'sans'
  const category = String(font?.category || '').toLowerCase()
  if (category === 'serif') return 'serif'
  if (category === 'sans-serif') return 'sans'
  return ''
}

/**
 * The JOB the family is for, which is what actually picks the scenes.
 *
 * ORDER IS LOAD-BEARING and each step earns its position:
 *
 *   Symbols first, because 17 of the 22 symbol families are ALSO classified
 *   Display — checking Display first would send Libre Barcode 39 to a poster.
 *
 *   Monospace before the rest, because Courier Prime carries stroke "Serif" and
 *   would otherwise be handed an editorial reading column.
 *
 *   Handwriting before Display, because 156 families are classified BOTH and a
 *   decorative brush face is a script that happens to be big, not a poster face
 *   that happens to be joined. The script scenes cover the large-setting case
 *   anyway — a signature IS the display use of a script.
 *
 * `basis` records WHICH field decided it, which is what the unit tests assert
 * against so a silent regression to category-only cannot pass.
 */
export function familyRole(font) {
  const category = String(font?.category || '').toLowerCase()

  if (has(font, CLS_SYMBOLS)) return { role: 'symbol', basis: 'classifications' }

  if (has(font, CLS_MONOSPACE)) return { role: 'mono', basis: 'classifications' }
  if (category === 'monospace') return { role: 'mono', basis: 'category' }

  if (has(font, CLS_HANDWRITING)) return { role: 'script', basis: 'classifications' }
  if (category === 'handwriting') return { role: 'script', basis: 'category' }

  if (has(font, CLS_DISPLAY)) return { role: 'display', basis: 'classifications' }
  if (category === 'display') return { role: 'display', basis: 'category' }

  const shape = familyShape(font)
  if (shape === 'slab') return { role: 'slab', basis: 'stroke' }
  if (shape === 'serif') {
    return { role: 'serif', basis: font?.stroke ? 'stroke' : 'category' }
  }
  if (shape === 'sans') {
    return { role: 'sans', basis: font?.stroke ? 'stroke' : 'category' }
  }
  // No descriptive field survived. A grotesque is the least wrong assumption
  // for an unlabelled face, and the ladder below still varies by family.
  return { role: 'sans', basis: 'none' }
}

// Every scene, with the QUESTION it answers. Aave's brand-typography section
// (mobbin.com/sites/sections/194a20c4-7e03-4839-86b3-30981d8db06e) states a
// role under each face — "For headlines." / "Used in body text." / "Used for
// code." — rather than a paragraph of adjectives, and crucially shows a
// DIFFERENT SPECIMEN per role: "Proto" for the headline face, "23%" for the
// body face, "uint" for the mono face. That last one is this whole change in
// miniature — the mono face is shown a Solidity type, not "Handgloves".
export const SCENES = {
  poster: { label: 'Poster', asks: 'Does it hold a wall at the size it was cut for?' },
  masthead: { label: 'Masthead', asks: 'Can it carry a title and still let a deck line sit under it?' },
  titlecard: { label: 'Title card', asks: 'What happens when it is letterspaced and alone?' },
  atsmall: { label: 'The same face, small', asks: 'Where does it stop working, and why does it need a body face?' },

  article: { label: 'Article opening', asks: 'Does the headline hand off cleanly to the first paragraph?' },
  column: { label: 'Reading column', asks: 'Does it stay comfortable over hundreds of words?' },
  pullquote: { label: 'Pull quote', asks: 'Does it hold up when a sentence is set larger than its neighbours?' },

  signage: { label: 'Signage and labels', asks: 'Does the weight read from across a room and still set a paragraph?' },

  ui: { label: 'Interface', asks: 'Do labels and controls stay legible at 13–14px?' },
  datatable: { label: 'Dense data', asks: 'Do the rows stay separable when the table gets tight?' },
  form: { label: 'A form under load', asks: 'Can a label, a hint and an error all be told apart?' },

  code: { label: 'Code', asks: 'Do the brackets, quotes and zeroes stay distinct from each other?' },
  terminal: { label: 'Terminal', asks: 'Do the columns line up without anyone aligning them?' },
  figures: { label: 'Figures in a column', asks: 'Do the digits hold their width as the numbers change?' },

  invitation: { label: 'Invitation', asks: 'Does it read as written by a person rather than set by a machine?' },
  signature: { label: 'Signature', asks: 'What does one line of it look like at the size it is meant for?' },
  atlength: { label: 'The same face, at length', asks: 'This is the limit — and knowing where it is, is the point.' },

  glyphs: { label: 'The glyph set', asks: 'This family draws marks, not letters — so here are the marks.' },

  ladder: { label: 'The weights it actually ships', asks: 'Every cut below is one this family really has.' },
}

// The base set per role. Deliberately NO overlap between the editorial roles
// and the interface roles: that overlap is what made every family look the
// same, and a grotesque genuinely is for interface work in a way a text serif
// is not.
const SETS = {
  symbol: ['glyphs'],
  mono: ['code', 'terminal', 'figures'],
  script: ['invitation', 'signature', 'atlength'],
  slab: ['article', 'signage', 'figures'],
  serif: ['article', 'column', 'pullquote'],
  sans: ['ui', 'datatable', 'form'],
}

/** Distinct numeric weights a family actually ships, ascending. */
export function availableWeights(font) {
  const list = Array.isArray(font?.variants) ? font.variants : []
  return [...new Set(list.filter(Number.isFinite))].sort((a, b) => a - b)
}

/**
 * The weight nearest `target` that the family REALLY SHIPS.
 *
 * This is the whole of "do not fake capability" on the weight axis. Asking for
 * 700 on a family that ships only 400 makes the browser synthesise a faux bold
 * — a smeared approximation of a cut that does not exist — and a specimen that
 * lies about the font is worse than a generic one. A tie goes to the LIGHTER
 * weight, because a synthetic-looking heavy is the failure being avoided.
 */
export function weightFor(font, target) {
  const weights = availableWeights(font)
  if (!weights.length) return 400
  let best = weights[0]
  let bestGap = Math.abs(best - target)
  for (const w of weights) {
    const gap = Math.abs(w - target)
    if (gap < bestGap) { best = w; bestGap = gap }
  }
  return best
}

/**
 * The three weights the scenes set type in, all snapped to real cuts. On a
 * single-weight family all three collapse to that one weight, which is the
 * honest answer — Anton has one cut and every line of its panel is that cut.
 */
export function sceneWeights(font) {
  return {
    body: weightFor(font, 400),
    mid: weightFor(font, 500),
    bold: weightFor(font, 700),
  }
}

// Three or more cuts before a ladder is worth drawing. At two it is a
// before/after, which the scenes already show by setting body and bold
// alongside each other; at one there is nothing to ladder and rendering one
// anyway would be the "weight ladder on a single-weight family" the brief
// rules out. Jasper's Fonts section
// (mobbin.com/sites/sections/30434930-ea74-484a-8eca-88ff9c8014f2) annotates
// every row of its ladder with the real size and weight rather than leaving
// the reader to guess, which is why each rung here is labelled with its own
// number and OpenType name.
const LADDER_MIN_CUTS = 3
export const LADDER_RUNGS = 4

/** How many real cuts the ladder would draw, or 0 when it must not be drawn. */
export function ladderFor(font) {
  const weights = availableWeights(font)
  if (weights.length < LADDER_MIN_CUTS) return []
  return ladderWeights(weights, LADDER_RUNGS)
}

/** The scene ids for a family, in render order. */
export function sceneIdsFor(font) {
  if (!font) return []
  const { role } = familyRole(font)

  let ids
  if (role === 'display') {
    // A display SERIF and a display SANS want different second scenes, and
    // this is the one place `stroke` changes the answer inside a role:
    // Playfair Display gets a masthead, Anton gets a title card.
    const shape = familyShape(font)
    const second = shape === 'serif' || shape === 'slab' ? 'masthead' : 'titlecard'
    ids = ['poster', second, 'atsmall']
  } else {
    ids = [...(SETS[role] || SETS.sans)]
  }

  // Earned, never assumed.
  if (ladderFor(font).length) ids.push('ladder')
  return ids
}

/** The scene ids resolved to `{ id, label, asks }`, in render order. */
export function scenesFor(font) {
  return sceneIdsFor(font).map(id => ({ id, ...SCENES[id] }))
}

/**
 * The fontsinuse.com SEARCH url for a family.
 *
 * A per-typeface deep link is NOT POSSIBLE and this is the record of why, so
 * nobody spends the afternoon again: fontsinuse URLs are
 * /typefaces/<numeric-id>/<slug> and the id is not derivable from the name —
 * /typefaces/playfair-display is a 404. There is no API, no oEmbed and no
 * sitemap (/api, /oembed, /sitemap.xml and /developers all 301 to a 500), so
 * a name-to-id map means scraping ~1,946 rows.
 *
 * TWO FALSE LEADS ALREADY BURNED, both of which look like success:
 *   - `?q=` returns HTTP 200 and a plausible page — but it is the EMPTY-QUERY
 *     page ("No Uses found for \"\""), for every family. The parameter is
 *     `terms`.
 *   - counting /typefaces/ links in a curl response finds ~200 for ANY query,
 *     including nonsense, because results are client-rendered and those links
 *     are static navigation furniture.
 *
 * The family name is the only untrusted-ish input here and it is
 * percent-encoded, so a family whose name contains & or # cannot alter the
 * query. The link is `nofollow` in the markup: fontsinuse's robots.txt sets
 * Crawl-delay: 10 and intends to keep crawlers off /search, and nofollow is
 * how a link respects that.
 */
export function fontsInUseSearchUrl(family) {
  const name = String(family || '').trim()
  if (!name) return ''
  return `https://fontsinuse.com/search?terms=${encodeURIComponent(name)}`
}
