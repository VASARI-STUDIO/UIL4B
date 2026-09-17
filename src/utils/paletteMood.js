// What a palette FEELS like, derived from its own hex values.
//
// Founder request (2026-09-07): "for our pallete library lets include filters
// of neutral, and others" — Neutral, Warm, Cool, Pastel, Vivid, Dark, Light,
// Monochrome.
//
// ── EVERY MOOD IS MEASURED, NONE IS TAGGED ──────────────────────────────────
//
// There is no `mood:` field on a palette and there must never be one. A
// hand-tag is a claim nobody re-checks: it is written once against whatever the
// colours were that day, and it keeps its answer after an edit changes them.
// `classifyPalette(hexes)` is a pure function of the hex array — same hexes,
// same answer, no ids, no names, no `kind`, no entitlement — which is what lets
// the unit suite sweep the whole library and prove each control selects
// something, and lets the same maths label a palette the user just built.
//
// ── WHICH COLOUR SPACE, AND WHY IT IS NOT ONE SPACE ─────────────────────────
//
// The five NEW moods are measured in HCT (`hexToHct` in utils/colors.js) —
// hue in degrees, chroma, tone. That is the space the palette engine itself
// works in: tonalRamp, maxChromaFor, autoTonalFromSeed and derivePreviewRoles
// all reason in HCT, so a mood computed there agrees with what the Builder will
// do to the palette rather than disagreeing with it in a second geometry.
//
// DARK, LIGHT and VIVID keep the arithmetic they already shipped with, in the
// sRGB min/max extent the gallery has always used. This is deliberate and it is
// the smaller lie than "consistency":
//
//   · Their sets are load-bearing. #396 measured Dark and Vivid against the
//     free viewer's library and 34-palette-library-sections asserts Dark
//     reaches into both the curated and the brand group. Re-deriving them in
//     HCT moved 12 palettes across the Dark boundary in testing — a silent
//     change to three shipped controls, in exchange for nothing the user can
//     see.
//   · The founder asked to ADD filters. Redefining the three that already work
//     is not that request.
//
// Where a new mood has to be DISJOINT from an old one, it is expressed in the
// OLD one's own measure — see PASTEL below. That is what makes the disjointness
// structural rather than a coincidence that holds until someone edits a number.
import { hexToHct } from './colors.js'

// ── The shipped extent measure (Dark / Light / Vivid) ───────────────────────
// Unchanged from PaletteGallery's `paletteProfile`, which is where it lived.
function channel(hex, offset) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

/** Mean sRGB lightness and peak channel spread. The shipped measure. */
export function paletteProfile(hexes) {
  const values = hexes.map((hex) => {
    const r = channel(hex, 1)
    const g = channel(hex, 3)
    const b = channel(hex, 5)
    return {
      lightness: (Math.max(r, g, b) + Math.min(r, g, b)) / 510,
      spread: Math.max(r, g, b) - Math.min(r, g, b),
    }
  })
  return {
    lightness: values.reduce((sum, value) => sum + value.lightness, 0) / values.length,
    vividness: Math.max(...values.map((value) => value.spread)),
  }
}

// ── Thresholds, all named, none inlined ─────────────────────────────────────

// DARK / LIGHT — mean sRGB lightness. Shipped values. Disjoint BY CONSTRUCTION:
// the two comparisons face opposite ways across a gap, so 0.48 ≤ l < 0.62 is
// neither, and no palette can be both however the numbers are edited — moving
// DARK_MAX above LIGHT_MIN is the only way to break it and the unit suite
// asserts the ordering as well as the empty intersection.
export const DARK_MAX_LIGHTNESS = 0.48
export const LIGHT_MIN_LIGHTNESS = 0.62

// VIVID — peak channel spread. Shipped value.
export const VIVID_MIN_SPREAD = 145

// The chroma at which a colour stops reading as grey. Lifted from
// PV_CHROMA_MIN in colors.js, which derivePreviewRoles uses for exactly this
// judgement ("HCT chroma below this reads as grey"). One definition of grey in
// the product, not two.
export const GREY_CHROMA = 8

// NEUTRAL — low chroma across the WHOLE palette, which needs both halves:
//   · a mean at most twice the grey line: averaged, the palette sits close to
//     grey rather than being a bright palette with grey padding;
//   · a ceiling at four times it: no single member is more than mildly tinted.
// Mean alone admits a black-white-grey-scarlet palette; ceiling alone admits a
// palette of four different mid-chroma hues.
export const NEUTRAL_MAX_MEAN_CHROMA = 16
export const NEUTRAL_MAX_PEAK_CHROMA = 32

// A colour below this contributes no usable hue: its hue angle is numerical
// noise, so it is excluded from every hue judgement (warm/cool, monochrome)
// rather than being allowed to vote with an arbitrary answer.
export const HUE_MIN_CHROMA = 12

// WARM / COOL — the hue anchors are colors.js's own TEMP_WARM_HUE (30) and
// TEMP_COOL_HUE (210), the two poles the Palette Builder's temperature slider
// pulls between. A hue within 90° of 30° is warm; the rest of the circle is
// cool, which is the same half-and-half split those two anchors describe.
export const WARM_HUE = 30
export const WARM_ARC = 90

// A palette that STRADDLES belongs to NEITHER, and this band is where that
// decision lives. Share is chroma-weighted — a saturated red says more about a
// palette's temperature than a barely-tinted blue does — so a palette is Warm
// only when at least three quarters of its colour MASS is warm, Cool at a
// quarter or less, and anything in between is a two-temperature palette that
// answers "show me warm palettes" with a lie either way.
//
// Not "both": a filter is a promise about what comes back. Someone filtering
// Warm to find a warm scheme does not want the teal-and-orange one, and someone
// filtering Cool does not want it either. Returning it to both makes each
// control less true; returning it to neither makes both exactly true and leaves
// the palette reachable through every other control it does match.
export const WARM_MIN_SHARE = 0.75

// MONOCHROME — one hue family, many tints.
//
// TOLERANCE 20°: two colours are the same family when their hue angles are
// within 20° of each other. That is roughly the width of a named hue band on
// the HCT circle (the twelve-name colour wheel steps every 30°), so 20° holds a
// tint ramp — whose hue drifts a few degrees as tone moves — without letting
// blue and green into one bucket.
export const MONO_HUE_TOLERANCE = 20
// "Many tints": at least three distinguishable tone steps. TONE_STEP is the
// resolution at which two tones count as different — below about 6 L* apart two
// swatches side by side read as the same colour printed twice.
export const MONO_TONE_STEP = 6
export const MONO_MIN_TONES = 3
// A palette with exactly ONE chromatic colour trivially satisfies "one hue
// family" while being nothing of the sort — it is a neutral palette with an
// accent. Monochrome needs two or more colours actually sharing the family, or
// a fully achromatic palette (a grey ramp, which is the original monochrome).
export const MONO_MIN_FAMILY_MEMBERS = 2

// PASTEL — high lightness, moderate-to-low chroma.
//
// Both bounds are borrowed rather than invented, which is the whole point:
//   · LIGHT_MIN_LIGHTNESS, so Pastel is a subset of Light rather than a second
//     opinion about what "light" means;
//   · VIVID_MIN_SPREAD, so `pastel ⇒ not vivid` is the SAME comparison Vivid
//     makes, read the other way. PASTEL ∩ VIVID = ∅ holds by construction: any
//     edit that moves one moves the other, and there is no pair of numbers that
//     can drift apart.
// The floor is Pastel's only value of its own: a palette with no colour in it
// is not pastel, it is white, so at least one member must clear the grey line.

/**
 * Every mood a palette belongs to, from its hexes alone.
 *
 * Pure: no id, no name, no kind, no entitlement, no clock, no randomness.
 * Returns a frozen object keyed by mood id; a palette may hold several moods
 * and may hold none.
 */
export function classifyPalette(hexes) {
  if (!Array.isArray(hexes) || hexes.length === 0) {
    throw new Error('classifyPalette: needs at least one hex')
  }

  const { lightness, vividness } = paletteProfile(hexes)
  const hct = hexes.map(hexToHct)
  const chromas = hct.map(([, chroma]) => chroma)
  const meanChroma = chromas.reduce((sum, c) => sum + c, 0) / chromas.length
  const peakChroma = Math.max(...chromas)

  // Colours with a hue worth reading. Everything below HUE_MIN_CHROMA is
  // excluded from both hue judgements rather than voting with noise.
  const chromatic = hct.filter(([, chroma]) => chroma >= HUE_MIN_CHROMA)

  // ── Warm / Cool: chroma-weighted share of the warm half of the circle ──
  let warmMass = 0
  let totalMass = 0
  for (const [hue, chroma] of chromatic) {
    totalMass += chroma
    if (hueDistance(hue, WARM_HUE) < WARM_ARC) warmMass += chroma
  }
  const warmShare = totalMass > 0 ? warmMass / totalMass : null
  const warm = warmShare !== null && warmShare >= WARM_MIN_SHARE
  const cool = warmShare !== null && warmShare <= 1 - WARM_MIN_SHARE

  // ── Monochrome: count hue families, then require tonal range ──
  const families = hueFamilies(chromatic.map(([hue]) => hue), MONO_HUE_TOLERANCE)
  const toneSteps = new Set(hct.map(([, , tone]) => Math.round(tone / MONO_TONE_STEP))).size
  const oneFamily = families.length === 0
    // A fully achromatic palette is the original monochrome: a grey ramp.
    ? true
    : families.length === 1 && families[0] >= MONO_MIN_FAMILY_MEMBERS

  const vivid = vividness >= VIVID_MIN_SPREAD
  const light = lightness >= LIGHT_MIN_LIGHTNESS

  return Object.freeze({
    neutral: meanChroma < NEUTRAL_MAX_MEAN_CHROMA && peakChroma < NEUTRAL_MAX_PEAK_CHROMA,
    warm,
    cool,
    // `!vivid` written as the literal comparison, not as the boolean, so the
    // disjointness is visible at the point it is relied on.
    pastel: light && vividness < VIVID_MIN_SPREAD && peakChroma >= GREY_CHROMA,
    vivid,
    dark: lightness < DARK_MAX_LIGHTNESS,
    light,
    monochrome: oneFamily && toneSteps >= MONO_MIN_TONES,
  })
}

/** Shortest angular distance between two hue angles, in degrees (0–180). */
export function hueDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return Math.min(d, 360 - d)
}

/**
 * Greedy single-link clustering of hue angles. Returns the SIZE of each family,
 * largest first. Single-link is the right join here: a tint ramp's hues drift
 * monotonically, so each swatch is close to its neighbour even when the two
 * ends are further apart than the tolerance — which is exactly the palette
 * "one hue family, many tints" describes.
 */
export function hueFamilies(hues, tolerance) {
  if (hues.length === 0) return []
  const sorted = [...hues].sort((a, b) => a - b)
  const groups = []
  let current = [sorted[0]]
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] <= tolerance) current.push(sorted[i])
    else { groups.push(current); current = [sorted[i]] }
  }
  groups.push(current)
  // The circle wraps: a red at 355° and a red at 5° are one family, and a
  // linear sort puts them at opposite ends of the list.
  if (groups.length > 1 && hueDistance(sorted[0], sorted[sorted.length - 1]) <= tolerance) {
    const first = groups.shift()
    groups[groups.length - 1] = groups[groups.length - 1].concat(first)
  }
  return groups.map((g) => g.length).sort((a, b) => b - a)
}

/**
 * The moods, in tray order. Ordered by the question a browser actually asks —
 * how much colour (Neutral → Pastel → Vivid), then which temperature (Warm,
 * Cool), then how bright (Dark, Light), then structure (Monochrome) — rather
 * than alphabetically, which would put Cool between Neutral and Dark.
 */
export const MOOD_IDS = ['neutral', 'pastel', 'vivid', 'warm', 'cool', 'dark', 'light', 'monochrome']

export const MOOD_LABELS = {
  neutral: 'Neutral',
  pastel: 'Pastel',
  vivid: 'Vivid',
  warm: 'Warm',
  cool: 'Cool',
  dark: 'Dark',
  light: 'Light',
  monochrome: 'Monochrome',
}

// ── Hue names, for search ───────────────────────────────────────────────────
//
// MEASURED 2026-09-16 on the live /discover/palettes at 1280: "blue" 0,
// "green" 0, "warm" 0, "pastel" 0, while /discover/gradients answered all
// four. The Palette Library's haystack was name + kind + hex, and nobody types
// a hex to find a blue palette. These are the same HCT hues the classifier
// above reads, behind the same HUE_MIN_CHROMA gate, so a grey never says
// "blue" and the hue a search matches is the hue a mood was judged on.
//
// THE ANCHORS ARE MEASURED IN THIS IMPLEMENTATION'S HUE, not copied from a
// CAM16 table: here #FF0000 sits at 27°, #FFFF00 at 111°, #00A000 at 142° and
// #0000FF at 283°, and the twelve were placed by running the named web colours
// through hexToHct and reading where each family lands (pink 354–6, red 16–34,
// orange 49–76, gold 85–97, yellow 106–111, lime 126–136, green 142–157, teal
// 172–200, sky 226–248, blue 259–285, violet 292–315, magenta 318–335).
// Nearest anchor wins.
//
// A term is a phrase where the bucket is a sub-hue of a word people actually
// type: "gold yellow" so that "yellow" finds gold, "lime green" so that "green"
// finds lime, "violet purple" and "magenta purple" so that "purple" finds both
// sides of it, "sky blue" so that "blue" finds sky. The finer word still works
// on its own.
export const HUE_TERMS = Object.freeze([
  [2, 'pink'], [25, 'red'], [60, 'orange'], [88, 'gold yellow'], [110, 'yellow'],
  [130, 'lime green'], [150, 'green'], [192, 'teal cyan'], [235, 'sky blue'],
  [275, 'blue'], [305, 'violet purple'], [334, 'magenta purple'],
])

/** The hue term of one hex, or null below the classifier's chroma gate. */
export function hueTerm(hex) {
  const [hue, chroma] = hexToHct(hex)
  if (chroma < HUE_MIN_CHROMA) return null
  let best = null
  let bestDistance = Infinity
  for (const [anchor, term] of HUE_TERMS) {
    const distance = hueDistance(hue, anchor)
    if (distance < bestDistance) { bestDistance = distance; best = term }
  }
  return best
}

/** Every hue term a palette's swatches carry, each once, in swatch order. */
export function hueTerms(hexes) {
  const seen = new Set()
  for (const hex of hexes) {
    const term = hueTerm(hex)
    if (term) seen.add(term)
  }
  return [...seen]
}
