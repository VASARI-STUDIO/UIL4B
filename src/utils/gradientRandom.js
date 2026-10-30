// How the gradient randomiser rolls a gradient.
//
// Random is a two-colour, mostly linear tool: the weights below favour a plain
// two-stop linear gradient, and the colours are chosen in OKLCH under a quality
// rule so the middle of the ramp is never grey and the two ends are related.
//
//   type    Linear 80% · Radial 15% (only if it reads as a light or a vignette) · Conic 5%
//   stops   2 at 75% · 3 at 25%  (4 and 5 only when the Stops filter asks)
//   harmony Analogous 60% · Monochrome 25% · Complementary 15%
//   tone    Clear 70% · Muted 15% · Deep 15%
//   space   Perceived (OKLCH) 70% · Standard (sRGB) 30%, Standard only where it stays clean
//
// The filters narrow that (spec gradient-overhaul §8). `hue` and `tone` use the
// gradient library's own mood words (warm, cool, mono · light, pastel, vivid, dark);
// `use` shapes the gradient for where it goes; `base` builds round one colour; `deck`
// makes every type turn up within twenty presses. A roll without those filters draws
// exactly what it always did, to the same seeded sequence.
//
// Random is best of eight (spec gradient-generation-v2 §3): `rollGradient` rolls
// eight candidates with the narrowed ranges below, scores each (utils/gradientScore)
// and ships one of the best three at random. A locked part is applied to every
// candidate before it is scored, so the scorer can rank colours that go with a
// locked stop but can never change the lock.
//
// Every picker takes its roll as an argument, and `rollGradient` takes a
// `rand` function, so the distributions can be asserted with a seeded sequence
// and no stub of a global.

import { oklchToHex, oklchInGamut, hexToOklchRaw } from '../components/tool/oklch.js'
import { rebuildStops } from './gradientLocks.js'
import {
  CANDIDATES, ANCHOR_DARK, ANCHOR_LIGHT, scoreContext, scoreGradient, chooseAmongTop,
  endsOf, hueGap, standardStaysClean,
} from './gradientScore.js'

export const GRAD_TYPE_WEIGHTS = [
  ['Linear', 0.8],
  ['Radial', 0.15],
  ['Conic', 0.05],
]

export const STOP_COUNT_WEIGHTS = [
  [2, 0.75],
  [3, 0.25],
]

/** Share of rolls that produce a two-stop gradient rather than a three-stop one. */
export const TWO_STOP_SHARE = 0.75

export const HARMONY_WEIGHTS = [
  ['Analogous', 0.6],
  ['Monochrome', 0.25],
  ['Complementary', 0.15],
]

export const TONE_WEIGHTS = [
  ['Clear', 0.7],
  ['Muted', 0.15],
  ['Deep', 0.15],
]

/** Angles for a linear gradient or a conic start; 'any' is uniform 0-359. */
export const ANGLE_WEIGHTS = [
  [135, 0.3], [90, 0.15], [180, 0.15], [45, 0.1], [160, 0.1], [120, 0.1], ['any', 0.1],
]

/** The least chroma the middle of a generated ramp may have, so it never goes grey. */
export const MIN_MIDPOINT_CHROMA = 0.025

/** The most the chroma of a ramp's two ends may differ by. */
export const MAX_CHROMA_GAP = 0.08

export const MAX_STOPS = 5
export const GRAD_TYPES = GRAD_TYPE_WEIGHTS.map(([type]) => type)

// Style families (Horizon, Mesh and the rest) are not drawn yet. The filter
// carries the list so a family can be added here and offered in Shuffle
// settings without changing the shape of the filter; until then every roll is
// Plain, whatever the filter holds.
export const STYLE_FAMILIES = []
export const PLAIN = 'Plain'

// ── Mood filters: Hue, Tone, Use and the type deck ──────────────────────────

export const HUE_WORDS = ['warm', 'cool', 'mono']
export const TONE_WORDS = ['light', 'pastel', 'vivid', 'dark']
export const USE_WORDS = ['background', 'hero', 'button', 'card']

/**
 * Hue moods. `arc` is a span of OKLCH hue in degrees, counted upward from its first
 * number (warm runs from 345 up through 0 to 95). Warm and cool never take a
 * complementary harmony, which would reach across the wheel; mono is a harmony, so
 * its hue is free.
 */
export const HUE_RULES = Object.freeze({
  warm: Object.freeze({ arc: [345, 455], noComplementary: true }),
  cool: Object.freeze({ arc: [175, 300], noComplementary: true }),
  mono: Object.freeze({ arc: null, harmony: 'Monochrome' }),
})
/** Whether OKLCH hue `H` is inside `arc` (a null arc is any hue). */
export function hueInArc(arc, H) {
  if (!arc) return true
  let h = ((H % 360) + 360) % 360
  if (h < arc[0]) h += 360
  return h <= arc[1]
}

/**
 * Tone moods. Light, pastel and vivid fix the lightness and chroma of both ends and
 * take no dark anchor; dark makes one end a dark anchor and keeps the other at
 * L 0.5 or less, on the Deep ranges. `kind` is the tone family a roll reports.
 * Vivid stays under the 0.17 neon cap.
 */
export const TONE_RULES = Object.freeze({
  light: Object.freeze({ L: [0.82, 0.93], C: [0.04, 0.12], kind: 'Muted' }),
  pastel: Object.freeze({ L: [0.84, 0.92], C: [0.04, 0.09], kind: 'Muted' }),
  vivid: Object.freeze({ L: [0.55, 0.75], C: [0.13, 0.17], kind: 'Clear' }),
  dark: Object.freeze({ L: null, C: null, anchor: 'dark', kind: 'Deep' }),
})

/**
 * Use rules: the shape a gradient takes for where it is going. `types` and `counts`
 * (null counts mean two or three) narrow the draw, `angles` are the linear angles,
 * `dL` is the lightness step between the ends, `maxC` caps chroma and `C` fixes it.
 * A type, a stop count or an angle the person has locked or filtered wins over these.
 */
export const USE_RULES = Object.freeze({
  background: Object.freeze({ types: ['Linear', 'Radial'], counts: [2], angles: [160, 180, 200], dL: [0.03, 0.18], maxC: 0.1 }),
  hero: Object.freeze({ types: ['Linear', 'Radial'], counts: null, angles: null, dL: [0.25, 0.42], anchor: true }),
  button: Object.freeze({ types: ['Linear'], counts: [2], angles: [90, 135], dL: [0.06, 0.14], C: [0.1, 0.17], ink: true }),
  card: Object.freeze({ types: ['Linear'], counts: [2], angles: [135, 160], dL: [0.05, 0.2], soft: true }),
})

/**
 * The type deck. With Type on Any, each press draws one card, and the deck is
 * shuffled again when it runs out. Sixteen Linear, three Radial and one Conic keep the
 * 80/15/5 weights over the long run and show every type within twenty presses.
 */
export const TYPE_DECK = Object.freeze([
  ...Array(16).fill('Linear'), ...Array(3).fill('Radial'), 'Conic',
])

// Shuffle a fresh deck with the roll's `rand` and put it under what is left.
function addToDeck(deck, rand) {
  const fresh = [...TYPE_DECK]
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]]
  }
  deck.unshift(...fresh)
}

/**
 * Draw the next type from `deck`, an array the caller keeps for the session and this
 * changes in place. `allowed` is the types a Use rule or filter permits (null is any).
 * A card that is not allowed stays in the deck; if none left is allowed, a fresh deck
 * goes under it.
 */
export function drawFromDeck(deck, rand, allowed = null) {
  const ok = (t) => !allowed || allowed.includes(t)
  if (!deck.length) addToDeck(deck, rand)
  let at = deck.findLastIndex(ok)
  if (at < 0) {
    addToDeck(deck, rand)
    at = deck.findLastIndex(ok)
  }
  return at < 0 ? undefined : deck.splice(at, 1)[0]
}

/**
 * Pick from `[value, weight]` pairs using a roll in [0, 1).
 *
 * The roll is clamped rather than trusted: `Math.random()` never returns 1, but
 * a caller that passes one — or a rounding error on the final band — would walk
 * off the end of the list and return undefined, which reaches the UI as a
 * gradient with no type at all.
 */
export function weightedPick(weights, roll) {
  const total = weights.reduce((sum, [, w]) => sum + w, 0)
  if (!total) return undefined
  let target = Math.min(Math.max(roll, 0), 0.999999) * total
  for (const [value, weight] of weights) {
    target -= weight
    if (target < 0) return value
  }
  return weights[weights.length - 1][0]
}

/** One of `values`, each equally likely, for a roll in [0, 1). */
export function uniformPick(values, roll) {
  if (!values.length) return undefined
  return values[Math.min(values.length - 1, Math.floor(Math.min(Math.max(roll, 0), 0.999999) * values.length))]
}

/** Gradient type for one roll in [0, 1). */
export function pickGradientType(roll) {
  return weightedPick(GRAD_TYPE_WEIGHTS, roll)
}

/** Stop count for one roll in [0, 1): 2 or 3, never anything else. */
export function pickStopCount(roll) {
  return roll < TWO_STOP_SHARE ? 2 : 3
}

export const pickHarmony = (roll) => weightedPick(HARMONY_WEIGHTS, roll)
export const pickTone = (roll) => weightedPick(TONE_WEIGHTS, roll)

/** An angle in degrees; `spare` is the second roll, used only for the 'any' band. */
export function pickAngle(roll, spare = 0) {
  const a = weightedPick(ANGLE_WEIGHTS, roll)
  return a === 'any' ? Math.floor(Math.min(Math.max(spare, 0), 0.999999) * 360) : a
}

/** A small deterministic generator for tests and reproducible runs. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (lo, hi, t) => lo + (hi - lo) * t
const wrapHue = (h) => ((h % 360) + 360) % 360
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Reduce chroma in 0.01 steps until the colour fits in sRGB.
function toGamut(c) {
  let C = c.C
  while (C > 0 && !oklchInGamut(c.L, C, c.H)) C = Math.max(0, +(C - 0.01).toFixed(2))
  return { L: c.L, C, H: wrapHue(c.H) }
}

// Clear chroma tops out at 0.17: above that sRGB greens and magentas read as neon.
const TONE_RANGES = {
  Clear: { L: [0.45, 0.85], C: [0.08, 0.17] },
  Muted: { L: [0.55, 0.85], C: [0.03, 0.08] },
  Deep: { L: [0.15, 0.35], C: [0.06, 0.16] },
}

/** The first stop of a ramp, in OKLCH, for a tone. */
export function firstColour(tone, rand) {
  const r = TONE_RANGES[tone]
  return toGamut({ L: lerp(...r.L, rand()), C: lerp(...r.C, rand()), H: rand() * 360 })
}

/**
 * The second stop, related to the first by `harmony`. L offsets are signed
 * toward the side with room; chroma stays within 0.08 of the first stop's, and
 * no stop leaves L 0.12-0.92 unless the tone is Deep.
 */
export function secondColour(first, harmony, tone, rand) {
  let dH
  let dLmin
  let dLmax
  if (harmony === 'Monochrome') { dH = (rand() * 2 - 1) * 12; dLmin = 0.2; dLmax = 0.4 }
  else if (harmony === 'Complementary') { dH = 150 + rand() * 60; dLmin = 0.12; dLmax = 0.3 }
  else { dH = (rand() < 0.5 ? -1 : 1) * lerp(20, 60, rand()); dLmin = 0.08; dLmax = 0.3 }
  const lo = tone === 'Deep' ? 0.05 : 0.12
  const hi = tone === 'Deep' ? 0.5 : 0.92
  const mag = lerp(dLmin, dLmax, rand())
  const sign = rand() < 0.5 ? -1 : 1
  let L = first.L + sign * mag
  if (L < lo || L > hi) L = first.L - sign * mag
  L = clamp(L, lo, hi)
  if (Math.abs(L - first.L) < dLmin) L = first.L + (first.L - lo >= hi - first.L ? -1 : 1) * dLmin
  L = clamp(L, lo, hi)
  let C = clamp(first.C * lerp(0.8, 1.15, rand()), Math.max(0, first.C - 0.08), first.C + 0.08)
  C = Math.min(C, TONE_RANGES[tone].C[1])
  const second = toGamut({ L, C, H: first.H + dH })
  if (harmony === 'Complementary') {
    const quieter = first.C <= second.C ? first : second
    if (quieter.C > 0.12) { quieter.C = 0.12 }
  }
  settleChroma(first, second)
  return second
}

// Dark and very light colours fit less chroma in sRGB, and a near-black hex has
// so few steps that it lands well off the chroma it was drawn at. Either can
// leave one end far more vivid than the other. Measure the ends as hexes (what
// the person sees) and pull the more chromatic one down, 0.01 at a time, until
// the gap is within MAX_CHROMA_GAP. Lower chroma stays inside the gamut.
function settleChroma(a, b) {
  const chromaOf = (c) => hexToOklchRaw(hexOf(c))[1]
  for (let i = 0; i < 30; i++) {
    const ca = chromaOf(a)
    const cb = chromaOf(b)
    if (Math.abs(ca - cb) <= MAX_CHROMA_GAP) return
    const loud = ca > cb ? a : b
    if (loud.C <= 0) return
    loud.C = Math.max(0, +(loud.C - 0.01).toFixed(3))
  }
}

/** Stops between two OKLCH ends, stepping along the hue path with a little hue jitter. */
function between(a, b, n, rand) {
  const out = []
  let dH = b.H - a.H
  if (dH > 180) dH -= 360
  if (dH < -180) dH += 360
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const C = Math.max(lerp(a.C, b.C, t), 0.8 * Math.min(a.C, b.C))
    out.push(toGamut({ L: lerp(a.L, b.L, t), C, H: a.H + dH * t + (rand() * 2 - 1) * 10 }))
  }
  return out
}

const hexOf = (c) => oklchToHex(c.L, c.C, c.H)

/** Light centre or dark vignette, with colour in the centre or a real value step. */
export function radialGatePasses(centre, edge) {
  const reads = centre.L >= edge.L + 0.1 || edge.L >= centre.L + 0.18
  return reads && (centre.C >= 0.05 || Math.abs(centre.L - edge.L) >= 0.25)
}

/**
 * Pick a type for the filter. Any uses the weights; a set of types is uniform.
 * Returns the type before the radial gate.
 */
function drawType(types, rand) {
  if (!types || !types.length) return pickGradientType(rand())
  return uniformPick(types, rand())
}

function drawCount(counts, rand) {
  if (!counts || !counts.length) return pickStopCount(rand())
  return uniformPick(counts, rand())
}

// ── Narrowed ranges: mud, anchor, positions ────────────────────────────────

/** Dark olive and khaki: hue 85-135, lightness under 0.55, chroma over 0.04. Never drawn, in any stop. */
export const MUD = Object.freeze({ H: [85, 135], L: 0.55, C: 0.04 })

/**
 * Whether an OKLCH colour sits in the mud zone. `slack` widens the zone a little
 * (3 degrees, 0.01 of L, 0.005 of C) so a colour just outside it still reads as
 * outside once the hex rounds.
 */
export function inMudZone({ L, C, H }, slack = false) {
  const s = slack ? 1 : 0
  const h = wrapHue(H)
  return h >= MUD.H[0] - 3 * s && h <= MUD.H[1] + 3 * s && L < MUD.L + 0.01 * s && C > MUD.C - 0.005 * s
}

const isMudHex = (hex, slack) => {
  const [L, C, H] = hexToOklchRaw(hex)
  return inMudZone({ L, C, H }, slack)
}

// A candidate whose draw keeps landing in the mud zone is rolled again this many
// times, then its muddy stops are drained of colour (chroma 0.03 is under the zone).
const MUD_TRIES = 6
const clearMud = (hex) => {
  if (!isMudHex(hex, true)) return hex
  const [L, , H] = hexToOklchRaw(hex)
  return oklchToHex(L, 0.03, H)
}

/** Share of candidates that force one end to be a dark or a light anchor. */
export const ANCHOR_SHARE = 0.5

// Make one end dark (L 0.14-0.27) or light (0.89-0.92) and put the other end 0.2-0.42
// of L away from it, so the pair has an anchor and a value step. The hue and the
// chroma of each end stay as drawn, brought back into the gamut.
function anchorPair(first, second, tone, rand) {
  const anchorFirst = rand() < 0.5
  const darkRoll = rand()
  const step = lerp(0.2, 0.42, rand())
  const anchorRoll = rand()
  const dark = tone === 'Deep' || darkRoll < 0.55
  const lo = tone === 'Deep' ? 0.05 : 0.12
  const hi = tone === 'Deep' ? 0.5 : 0.92
  const aL = dark ? lerp(0.14, ANCHOR_DARK - 0.01, anchorRoll) : lerp(ANCHOR_LIGHT + 0.01, 0.92, anchorRoll)
  const oL = clamp(dark ? aL + step : aL - step, lo, hi)
  const [a, o] = anchorFirst ? [first, second] : [second, first]
  const anchored = toGamut({ L: aL, C: a.C, H: a.H })
  const other = toGamut({ L: oL, C: o.C, H: o.H })
  const pair = anchorFirst ? [anchored, other] : [other, anchored]
  settleChroma(pair[0], pair[1])
  return pair
}

/** The two ends of a ramp: related by `harmony`, and anchored in half of the draws. */
function drawPair(tone, harmony, rand) {
  const first = firstColour(tone, rand)
  const second = secondColour(first, harmony, tone, rand)
  return rand() < ANCHOR_SHARE ? anchorPair(first, second, tone, rand) : [first, second]
}

/** Share of two-stop gradients whose ends are pulled in to 8 and 92. */
export const SOFT_ENDS_SHARE = 0.3
/** Where the middle stop of a three-stop gradient sits (not always 50). */
export const MIDDLE_POSITIONS = [45, 55, 62]

/** Stop positions for `n` stops: 0/100 or 8/92 for two, a drawn middle for three, even beyond that. */
export function rollPositions(n, rand) {
  const ends = rand()
  const middle = rand()
  if (n === 2) return ends < SOFT_ENDS_SHARE ? [8, 92] : [0, 100]
  if (n === 3) return [0, uniformPick(MIDDLE_POSITIONS, middle), 100]
  return Array.from({ length: n }, (_, i) => Math.round((i / (n - 1)) * 100))
}

// ── The interpolation draw ─────────────────────────────────────────────────

/** Share of rolls that try Standard (sRGB); the rest are Perceived (OKLCH). */
export const STANDARD_SHARE = 0.3
// Ends this far apart in hue are complementary-ish: Standard is never used there.
const COMPLEMENTARY_FROM = 140

/**
 * The interpolation space for a rolled gradient `g`, from a roll in [0, 1).
 * Standard needs the roll, and then it must keep the middle of the ramp clean
 * (standardStaysClean) and must not be a complementary pair; otherwise Perceived.
 * `complementary` is set when the roll knows its harmony; the ends' hues are
 * checked either way, which is what a palette pick relies on.
 */
export function drawSpace(g, roll, complementary = false) {
  if (roll >= STANDARD_SHARE || complementary) return 'oklch'
  const [a, b] = endsOf(g).map(hexToOklchRaw)
  if (hueGap(a, b) >= COMPLEMENTARY_FROM) return 'oklch'
  return standardStaysClean(g.stops) ? 'srgb' : 'oklch'
}

// The ramp for one candidate: the two ends, the stops between, the radial gate, the
// colours as hexes. Returns the type and count too, which the gate and a conic
// gradient's three-stop minimum can change.
function drawColours({ type, n, harmony, tone, types, radialGate }, rand) {
  let [first, second] = drawPair(tone, harmony, rand)

  if (type === 'Radial' && radialGate !== false) {
    // Up to three tries to find a pair that reads as a light or a vignette. A
    // filter that leaves Linear out keeps the best of the three rather than
    // falling back to a type the person excluded.
    let best = { first, second }
    for (let tries = 0; tries < 3 && !radialGatePasses(first, second); tries++) {
      const gap = (p) => Math.abs(p.first.L - p.second.L)
      if (gap({ first, second }) > gap(best)) best = { first, second }
      ;[first, second] = drawPair(tone, harmony, rand)
      if (radialGatePasses(first, second)) { best = { first, second }; break }
      if (gap({ first, second }) > gap(best)) best = { first, second }
    }
    if (!radialGatePasses(best.first, best.second)) {
      // Linear is the fallback only when the filter lets it through; a filter
      // without it keeps Radial with the best of the tries.
      if (types.length && !types.includes('Linear')) ({ first, second } = best)
      else type = 'Linear'
    } else ({ first, second } = best)
  }

  if (type === 'Conic' && n < 3) n = 3
  const ramp = [first, ...between(first, second, n - 2, rand), second]
  return { type, n, colours: ramp.map(hexOf) }
}

/**
 * The type and stop count of a press, from the weights and the filters. Random
 * draws them once for all eight candidates: the scorer ranks colours, not types,
 * and a type drawn per candidate would let the scorer tilt the 80/15/5 weights
 * (a Radial that passes its gate scores a little higher than the average Linear).
 */
export function rollShape(filters, rand) {
  const locks = filters.locks || {}
  const types = locks.type ? [locks.type] : (filters.types || [])
  // With Type on Any and a deck, the type is the next card. A Radial or Conic card is
  // kept like a locked one (`kept`): the colours are re-rolled, never turned into Linear.
  if (!types.length && Array.isArray(filters.deck)) {
    const type = drawFromDeck(filters.deck, rand)
    return { type, n: drawCount(filters.counts || [], rand), kept: type !== 'Linear' }
  }
  return { type: drawType(types, rand), n: drawCount(filters.counts || [], rand), kept: false }
}

/**
 * Roll ONE candidate gradient.
 *
 * `shape` is { type, n } from rollShape; without it the candidate draws its own.
 * filters: { types: [] (empty = Any), counts: [] (empty = Any), styles: ['Plain'],
 *   radialGate: false to skip the radial gate when the colours are replaced afterwards,
 *   palette: hexes to draw the colours from instead of rolling them (Shuffle from palette),
 *   locks: { type, angle, space } }
 * `locks` holds the geometry the person keeps, each a value or null. A locked type
 * replaces the Type filter, and a locked Radial never falls back to Linear: the
 * colours are re-rolled instead. A locked angle and space come back unchanged.
 * The angle and the space are drawn even when locked, so a seeded run stays in step.
 * Returns { type, angle, space, stops: [{ color, position }], style, harmony, tone }
 * with colours as upper-case hex. `style` is always Plain until a family is built.
 */
export function rollCandidate(rand = Math.random, filters = {}, shape = null) {
  const locks = filters.locks || {}
  const { type: drawnType, n: drawnCount, kept } = shape || rollShape(filters, rand)
  // A kept card (Radial or Conic from the deck) counts as a type filter of its own.
  const types = kept ? [drawnType] : locks.type ? [locks.type] : (filters.types || [])
  const harmony = pickHarmony(rand())
  const tone = pickTone(rand())

  let type
  let n
  let colours
  if (filters.palette) {
    // The colours are the person's own, so the mud and anchor rules do not touch them.
    n = drawnType === 'Conic' && drawnCount < 3 ? 3 : drawnCount
    const look = pickPaletteLook(filters.palette, n, drawnType, types, rand)
    type = look.type
    colours = look.colours
  } else {
    let drawn
    for (let tries = 0; tries < MUD_TRIES; tries++) {
      drawn = drawColours({ type: drawnType, n: drawnCount, harmony, tone, types, radialGate: filters.radialGate }, rand)
      if (!drawn.colours.some((c) => isMudHex(c, true))) break
    }
    ;({ type, n } = drawn)
    colours = drawn.colours.map(clearMud)
    // A conic gradient closes its seam: the last stop is the first colour again.
    if (type === 'Conic') colours[colours.length - 1] = colours[0]
  }

  const positions = rollPositions(n, rand)
  const drawnAngle = pickAngle(rand(), rand())
  const spaceRoll = rand()
  const rolled = {
    type,
    angle: locks.angle ?? drawnAngle,
    style: PLAIN,
    harmony,
    tone,
    stops: colours.map((color, i) => ({ color, position: positions[i] })),
  }
  // The person's stop locks go on before the space is drawn: the clean-middle check
  // and the hue-gap guard must judge the ramp that ships, locked colours and all.
  const g = withStopLocks(rolled, filters.stops)
  g.space = locks.space ?? drawSpace(g, spaceRoll, !filters.palette && harmony === 'Complementary')
  return g
}

/**
 * Lay the person's stop locks over a candidate. `prev` is the page's current stops
 * (with `lockColour` and `lockPosition`); a locked colour or position comes back
 * as it was, and the count follows the locked stops (rebuildStops). Without `prev`
 * the candidate is returned as rolled.
 */
function withStopLocks(g, prev) {
  if (!prev) return g
  const ramp = g.stops
  return {
    ...g,
    stops: rebuildStops(prev, (r) => ramp[r % ramp.length].color, ramp.length, g.type === 'Conic', ramp.map((s) => s.position)),
  }
}

/**
 * Roll the eight candidates and score them. rollCandidate lays the stop locks on
 * before it draws the space, so the score is of what the person would see.
 * filters adds { stops: the current stops with their locks, recent: the session's
 * last results as [firstHex, lastHex] pairs } to rollCandidate's.
 * Returns [{ g, score }] in roll order.
 */
export function rollCandidates(rand = Math.random, filters = {}) {
  const ctx = scoreContext(filters.recent)
  const shape = rollShape(filters, rand)
  return Array.from({ length: CANDIDATES }, () => {
    const g = rollCandidate(rand, filters, shape)
    return { g, score: scoreGradient(g, ctx).total }
  })
}

/**
 * Roll a whole gradient: eight candidates, one of the best three at random.
 * Takes rollCandidate's filters and rollCandidates' extras. With `filters.stops`
 * the stops come back as the page keeps them (lock flags, the current array
 * order); without, as { color, position } in ramp order.
 */
export function rollGradient(rand = Math.random, filters = {}) {
  return chooseAmongTop(rollCandidates(rand, filters), rand)
}

/**
 * Colours for Shuffle from palette. A two-colour pick has to differ by lightness
 * (0.08) or hue (30 degrees); up to ten tries, then the first pair stands.
 * Returns `count` hexes drawn without repeating while the pool lasts.
 */
export function pickFromPool(pool, count, rand = Math.random) {
  const draw = () => {
    const a = [...pool]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return Array.from({ length: count }, (_, i) => a[i % a.length].toUpperCase())
  }
  const first = draw()
  if (count !== 2 || pool.length < 2) return first
  const apart = ([x, y]) => {
    const p = hexToOklchRaw(x)
    const q = hexToOklchRaw(y)
    const dh = Math.abs(((p[2] - q[2] + 540) % 360) - 180)
    return Math.abs(p[0] - q[0]) >= 0.08 || dh >= 30
  }
  if (apart(first)) return first
  for (let i = 0; i < 9; i++) {
    const next = draw()
    if (apart(next)) return next
  }
  return first
}

/**
 * Type and colours for Shuffle from palette. The type and count come from a roll;
 * the radial gate and the conic seam are judged on the colours actually drawn,
 * not on the random ones they replace.
 *
 * Radial: up to three more draws for a pair that reads as a light or a vignette,
 * then the widest lightness gap stands; Linear takes over only when the filter
 * (`types`, empty = Any) allows it. Conic with three or more pool colours ends on
 * its first colour so the seam closes.
 * Returns { type, colours }.
 */
export function pickPaletteLook(pool, count, type, types = [], rand = Math.random) {
  let colours = pickFromPool(pool, count, rand)
  if (type === 'Radial') {
    const ends = (c) => [hexToOklchRaw(c[0]), hexToOklchRaw(c[c.length - 1])]
    const passes = (c) => {
      const [a, b] = ends(c)
      return radialGatePasses({ L: a[0], C: a[1] }, { L: b[0], C: b[1] })
    }
    const gap = (c) => {
      const [a, b] = ends(c)
      return Math.abs(a[0] - b[0])
    }
    let best = colours
    for (let tries = 0; tries < 3 && !passes(colours); tries++) {
      colours = pickFromPool(pool, count, rand)
      if (gap(colours) > gap(best)) best = colours
    }
    if (passes(colours)) best = colours
    colours = best
    if (!passes(colours) && (!types.length || types.includes('Linear'))) type = 'Linear'
  }
  if (type === 'Conic' && pool.length >= 3 && colours.length >= 3) {
    colours = [...colours.slice(0, -1), colours[0]]
  }
  return { type, colours }
}
