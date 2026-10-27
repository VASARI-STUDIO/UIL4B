// SEEDED GRADIENT DESIGNS: the colour rules of spec section 4.2.
//
// Colours are picked in OKLCH, not as raw hex: stop 1 by tone, stop 2 by
// harmony against it. The weights are exported constants and each picker takes
// its roll as an argument, so a test can sweep the whole roll space and assert
// the shares exactly, the way tests/unit/gradient-random.test.js does for the
// type and stop-count weights.
//
// `rollDesign(style, seed)` turns one seed into a whole design (stops and
// parameters) for the proof-of-concept board's self-check and the unit tests.
// The shipping Random will draw from the same pickers.
//
// DOM-free.

import { weightedPick } from './gradientRandom.js'
import { PARAM_ROWS, STYLES, clampParams, hexToOk, mulberry32, okToHex } from './gradientStyles.js'

export const HARMONY_WEIGHTS = [['analogous', 0.6], ['monochrome', 0.25], ['complementary', 0.15]]
export const TONE_WEIGHTS = [['clear', 0.7], ['muted', 0.15], ['deep', 0.15]]
export const THREE_STOP_SHARE = 0.25

export const pickHarmony = (roll) => weightedPick(HARMONY_WEIGHTS, roll)
export const pickTone = (roll) => weightedPick(TONE_WEIGHTS, roll)

// Stop 1's lightness and chroma ranges per tone.
export const TONE_RANGE = {
  clear: { L: [0.45, 0.85], C: [0.08, 0.2] },
  muted: { L: [0.55, 0.85], C: [0.03, 0.08] },
  deep: { L: [0.15, 0.35], C: [0.06, 0.16] },
}
export const MAX_CHROMA_GAP = 0.08
export const L_LIMITS = [0.12, 0.92]
export const DEEP_L_FLOOR = 0.06

const between = (rng, lo, hi) => lo + (hi - lo) * rng()
const sign = (rng) => (rng() < 0.5 ? -1 : 1)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const wrap = (h) => ((h % 360) + 360) % 360

// A lightness step of the given size away from `L`, flipped if it would leave the limits.
function stepL(rng, L, lo, hi, [min, max], lowest) {
  const size = between(rng, min, max)
  let dir = sign(rng)
  if (L + dir * size > hi || L + dir * size < lowest) dir = -dir
  return clamp(L + dir * size, lowest, hi)
}

// Two colours (hex) for one harmony and tone.
export function rollPair(rng, harmony, tone) {
  const range = TONE_RANGE[tone]
  const lowest = tone === 'deep' ? DEEP_L_FLOOR : L_LIMITS[0]
  const L1 = between(rng, ...range.L)
  const C1 = between(rng, ...range.C)
  const H1 = between(rng, 0, 360)
  let H2
  let L2
  if (harmony === 'analogous') {
    H2 = H1 + sign(rng) * between(rng, 20, 60)
    L2 = stepL(rng, L1, L_LIMITS[0], L_LIMITS[1], [0.08, 0.3], lowest)
  } else if (harmony === 'monochrome') {
    H2 = H1 + sign(rng) * between(rng, 0, 12)
    L2 = stepL(rng, L1, L_LIMITS[0], L_LIMITS[1], [0.2, 0.4], lowest)
  } else {
    H2 = H1 + between(rng, 150, 210)
    L2 = stepL(rng, L1, L_LIMITS[0], L_LIMITS[1], [0.12, 0.3], lowest)
  }
  // Stop 2's chroma follows stop 1's, inside the gap limit.
  let c1 = C1
  let c2 = clamp(C1 + between(rng, -0.06, 0.06), 0.02, 0.22)
  if (harmony === 'complementary') {
    // The less chromatic stop is capped so the pair reads bold, not vibrating.
    if (c1 <= c2) c1 = Math.min(c1, 0.12)
    else c2 = Math.min(c2, 0.12)
  }
  // Gamut mapping can pull a chroma down on its own, so measure the hexes
  // and trim the larger chroma by 0.01 until the gap is inside the limit.
  let a = okToHex(L1, c1, H1)
  let b = okToHex(L2, c2, wrap(H2))
  for (let i = 0; i < 40; i++) {
    const ca = hexToOk(a).C
    const cb = hexToOk(b).C
    if (Math.abs(ca - cb) <= MAX_CHROMA_GAP - 0.004) break
    if (ca > cb) { c1 = Math.max(0, Math.min(c1, ca) - 0.01); a = okToHex(L1, c1, H1) } else { c2 = Math.max(0, Math.min(c2, cb) - 0.01); b = okToHex(L2, c2, wrap(H2)) }
  }
  return [a, b]
}

// Two or three stops. A middle stop steps along the hue path between the ends
// with a little jitter and keeps at least 0.8 of the lower end's chroma.
export function rollStops(rng, { count = 2, harmony = pickHarmony(rng()), tone = pickTone(rng()) } = {}) {
  const [a, b] = rollPair(rng, harmony, tone)
  if (count < 3) return { stops: [a, b], harmony, tone }
  const oa = hexToOk(a)
  const ob = hexToOk(b)
  let dh = ob.H - oa.H
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  const C = Math.max(0.8 * Math.min(oa.C, ob.C), (oa.C + ob.C) / 2)
  const mid = okToHex((oa.L + ob.L) / 2, C, wrap(oa.H + dh / 2 + between(rng, -10, 10)))
  return { stops: [a, mid, b], harmony, tone }
}

const PLAIN_TYPES = [['Linear', 0.8], ['Radial', 0.15], ['Conic', 0.05]]

// A whole seeded design for one family: stops by the rules above, parameters
// anywhere inside their ranges. The same style and seed always give the same design.
export function rollDesign(style, seed) {
  if (!STYLES.includes(style)) throw new Error(`Unknown style ${style}`)
  const rng = mulberry32(seed * 2654435761)
  const count = rng() < THREE_STOP_SHARE ? 3 : 2
  const { stops, harmony, tone } = rollStops(rng, { count })
  const raw = {}
  for (const r of PARAM_ROWS[style] || []) {
    if (r.kind === 'slider') raw[r.key] = Math.round(between(rng, r.min, r.max))
    else raw[r.key] = r.key === 'type' ? weightedPick(PLAIN_TYPES, rng()) : r.options[Math.floor(rng() * r.options.length)]
  }
  if (style === 'steps') raw.offset = Math.round(between(rng, 0, 100))
  return { style, stops, params: clampParams(style, raw), seed, harmony, tone }
}
