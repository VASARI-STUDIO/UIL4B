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
//
// Every picker takes its roll as an argument, and `rollGradient` takes a
// `rand` function, so the distributions can be asserted with a seeded sequence
// and no stub of a global.

import { oklchToHex, oklchInGamut, hexToOklchRaw } from '../components/tool/oklch.js'

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

const TONE_RANGES = {
  Clear: { L: [0.45, 0.85], C: [0.08, 0.2] },
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

/**
 * Roll a whole gradient.
 *
 * filters: { types: [] (empty = Any), counts: [] (empty = Any), styles: ['Plain'] }
 * Returns { type, angle, stops: [{ color, position }], style, harmony, tone } with
 * colours as upper-case hex. `style` is always Plain until a family is built.
 */
export function rollGradient(rand = Math.random, filters = {}) {
  const types = filters.types || []
  const counts = filters.counts || []
  let type = drawType(types, rand)
  let n = drawCount(counts, rand)
  const harmony = pickHarmony(rand())
  const tone = pickTone(rand())
  let first = firstColour(tone, rand)
  let second = secondColour(first, harmony, tone, rand)

  if (type === 'Radial') {
    // Up to three tries to find a pair that reads as a light or a vignette. A
    // filter that asks for Radial alone keeps the best of the three rather
    // than falling back to Linear.
    let best = { first, second }
    for (let tries = 0; tries < 3 && !radialGatePasses(first, second); tries++) {
      const gap = (p) => Math.abs(p.first.L - p.second.L)
      if (gap({ first, second }) > gap(best)) best = { first, second }
      first = firstColour(tone, rand)
      second = secondColour(first, harmony, tone, rand)
      if (radialGatePasses(first, second)) { best = { first, second }; break }
      if (gap({ first, second }) > gap(best)) best = { first, second }
    }
    if (!radialGatePasses(best.first, best.second)) {
      if (types.length === 1 && types[0] === 'Radial') ({ first, second } = best)
      else type = 'Linear'
    } else ({ first, second } = best)
  }

  if (type === 'Conic' && n < 3) n = 3
  const ramp = [first, ...between(first, second, n - 2, rand), second]
  const colours = ramp.map(hexOf)
  // A conic gradient closes its seam: the last stop is the first colour again.
  if (type === 'Conic') colours[colours.length - 1] = colours[0]
  const angle = pickAngle(rand(), rand())
  return {
    type,
    angle,
    style: PLAIN,
    harmony,
    tone,
    stops: colours.map((color, i) => ({ color, position: Math.round((i / (n - 1)) * 100) })),
  }
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
