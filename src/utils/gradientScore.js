// How Random judges a gradient (spec gradient-generation-v2 §3.2).
//
// Random rolls eight candidates, scores each from 0 to 1 with the seven terms
// below, and ships one of the best three (chosen at random, so the variety stays
// and the worst never ships). Every threshold is a judgement, tuned against
// captures of rolled gradients.
//
// The scorer only ranks. It never edits a candidate, so a locked colour,
// position, type, angle or interpolation reaches it already applied and comes
// out unchanged. Pure functions of colours in, numbers out.

import { hexToOklchRaw, mixOklch, oklchToHex } from '../components/tool/oklch.js'
import { hexToRgb, luminance, mixHex } from './colors.js'
import { deltaE2000, hexToLabD50 } from './nearestMatch.js'

/** The seven terms and what each is worth; they sum to 1. */
export const SCORE_WEIGHTS = Object.freeze({
  valueStep: 0.25,
  cleanMiddle: 0.2,
  chromaBalance: 0.15,
  hueRelation: 0.15,
  anchor: 0.1,
  textArea: 0.1,
  notSeen: 0.05,
})

/** Candidates rolled per press, and how many of the best the shipped one is drawn from. */
export const CANDIDATES = 8
export const TOP_PICKS = 3

/** The session's memory for the "not seen" term: this many results, this far apart in ΔE2000. */
export const RECENT_RESULTS = 10
export const SEEN_DELTA_E = 12

/** An end this dark or this light anchors the gradient. */
export const ANCHOR_DARK = 0.28
export const ANCHOR_LIGHT = 0.88

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// ── The seven terms, each a number in, a score in [0, 1] out ───────────────

/** ΔL between the ends: full marks from 0.18 to 0.45; less is flat, more is harsh (0 at 0.75). */
export function valueStepScore(dL) {
  const d = Math.abs(dL)
  if (d < 0.18) return clamp01(d / 0.18)
  if (d <= 0.45) return 1
  return clamp01((0.75 - d) / 0.3)
}

/** The midpoint's chroma against 0.9 x the lower end's: full marks at the ratio, none at half of it. */
export function cleanMiddleScore(midChroma, lowEndChroma) {
  if (lowEndChroma < 0.01) return 1
  return clamp01((midChroma / (0.9 * lowEndChroma) - 0.5) / 0.5)
}

/** The ends' chroma gap: full marks to 0.04, none at the 0.08 cap. */
export function chromaBalanceScore(dC) {
  return clamp01((0.08 - Math.abs(dC)) / 0.04)
}

// Hue gaps (degrees, 0-180) that read as a deliberate relation.
const HUE_BANDS = [[0, 10], [25, 50], [165, 180]]

/** The hue gap between the ends: full marks inside a band, scaled down 1 per 20 degrees outside. */
export function hueRelationScore(dH, chromaA = 1, chromaB = 1) {
  if (Math.min(chromaA, chromaB) < 0.015) return 1 // a grey end has no hue to relate
  const gap = Math.abs(dH) % 360
  const d = gap > 180 ? 360 - gap : gap
  let off = Infinity
  for (const [lo, hi] of HUE_BANDS) off = Math.min(off, d < lo ? lo - d : d > hi ? d - hi : 0)
  return clamp01(1 - off / 20)
}

/** One end dark (L <= 0.28) or light (L >= 0.88) is full marks; the nearer end scales down over 0.2 of L. */
export function anchorScore(lA, lB) {
  const off = (l) => (l <= ANCHOR_DARK ? 0 : l >= ANCHOR_LIGHT ? 0 : Math.min(l - ANCHOR_DARK, ANCHOR_LIGHT - l))
  return clamp01(1 - Math.min(off(lA), off(lB)) / 0.2)
}

// Near-black and near-white, the inks the flattest third is tried with.
const INK_DARK = '#111111'
const INK_LIGHT = '#F5F5F5'
const lumOf = (hex) => luminance(...hexToRgb(hex))
const LUM_DARK = lumOf(INK_DARK)
const LUM_LIGHT = lumOf(INK_LIGHT)
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/** The ramp is read at 13 points (every 1/12); the thirds share their edge samples. */
export const RAMP_SAMPLES = 13

const stdev = (xs) => {
  const m = xs.reduce((s, v) => s + v, 0) / xs.length
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) * (v - m), 0) / xs.length)
}

/**
 * Text area: of the ramp's three thirds, the flattest (lowest spread of lightness
 * plus chroma, the §10.4 measure on a one-dimensional ramp) must carry near-black
 * or near-white text. Full marks at 4.5:1 across the whole third, none at 3:1.
 * `samples` is the ramp as RAMP_SAMPLES hexes.
 */
export function textAreaScore(samples) {
  const lch = samples.map(hexToOklchRaw)
  let best = null
  for (let k = 0; k < 3; k++) {
    const idx = [0, 1, 2, 3, 4].map((i) => k * 4 + i)
    const spread = stdev(idx.map((i) => lch[i][0])) + stdev(idx.map((i) => lch[i][1]))
    if (!best || spread < best.spread) best = { spread, idx }
  }
  const lums = best.idx.map((i) => lumOf(samples[i]))
  const onDark = Math.min(...lums.map((l) => ratio(l, LUM_DARK)))
  const onLight = Math.min(...lums.map((l) => ratio(l, LUM_LIGHT)))
  return clamp01((Math.max(onDark, onLight) - 4) / 0.5)
}

/**
 * A gradient's distance from an earlier one: the mean ΔE2000 of its two ends
 * against theirs, the nearer of the two orientations (a flipped copy is the same
 * gradient). `a` and `b` are [firstLab, lastLab].
 */
function gradientDistance(a, b) {
  const straight = (deltaE2000(a[0], b[0]) + deltaE2000(a[1], b[1])) / 2
  const flipped = (deltaE2000(a[0], b[1]) + deltaE2000(a[1], b[0])) / 2
  return Math.min(straight, flipped)
}

/** Lab pairs for a list of [hexA, hexB] ends, ready for notSeenScore. */
export const labEnds = (ends) => (ends || []).map(([a, b]) => [hexToLabD50(a), hexToLabD50(b)])

/** The share of the recent results this one is at least 12 ΔE2000 away from; no history is full marks. */
export function notSeenScore(endsLab, recentLabs) {
  if (!recentLabs || !recentLabs.length) return 1
  let far = 0
  for (const r of recentLabs) if (gradientDistance(endsLab, r) >= SEEN_DELTA_E) far++
  return far / recentLabs.length
}

// ── Reading a gradient ─────────────────────────────────────────────────────

/** Stops as { color, position } in ramp order (by position; ties keep their order). */
export function rampOf(stops) {
  return stops
    .map((s, i) => ({ color: s.color, position: Number(s.position) || 0, i }))
    .sort((a, b) => a.position - b.position || a.i - b.i)
}

/**
 * The two ends the score reads. A conic gradient closes its seam, so its last
 * stop repeats its first; the ends are then the first stop and the one before the
 * seam, which are the two colours the person actually chose between.
 */
export function endsOfRamp(ramp, type) {
  const open = type === 'Conic' && ramp.length >= 3 ? ramp.slice(0, -1) : ramp
  return [open[0].color, open[open.length - 1].color]
}

/** The colour of the ramp at `pos` (0-100), blended in `space` ('oklch' or 'srgb'). */
export function colourAt(ramp, pos, space) {
  if (pos <= ramp[0].position) return ramp[0].color.toUpperCase()
  const last = ramp[ramp.length - 1]
  if (pos >= last.position) return last.color.toUpperCase()
  let i = 0
  while (ramp[i + 1].position < pos) i++
  const a = ramp[i]
  const b = ramp[i + 1]
  const span = b.position - a.position
  const t = span > 0 ? (pos - a.position) / span : 0
  return (space === 'srgb' ? mixHex(a.color, b.color, t) : mixOklch(a.color, b.color, t)).toUpperCase()
}

/** The gap in degrees between two OKLCH hues (0-180); 0 when either end is grey. */
export function hueGap(lchA, lchB) {
  if (Math.min(lchA[1], lchB[1]) < 0.015) return 0
  const d = Math.abs(lchA[2] - lchB[2]) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Whether Standard (sRGB) keeps the ramp clean (§3.1): at the ramp's midpoint the
 * sRGB blend must keep at least 0.85 of the OKLCH blend's chroma and sit within
 * 0.04 of its lightness. Otherwise Standard would go grey or dark in the middle.
 */
export function standardStaysClean(stops) {
  const ramp = rampOf(stops)
  const o = hexToOklchRaw(colourAt(ramp, 50, 'oklch'))
  const s = hexToOklchRaw(colourAt(ramp, 50, 'srgb'))
  return s[1] >= 0.85 * o[1] && Math.abs(s[0] - o[0]) <= 0.04
}

/**
 * A context for scoreGradient: the session's recent results, as Lab, converted once per
 * roll, and the Use rule the roll is for ('button' turns on the ink rule).
 */
export const scoreContext = (recent, use = null) => ({ recentLabs: labEnds(recent), use })

/**
 * Score one gradient ({ type, space, stops: [{ color, position }] }).
 * Returns { total, terms } with each term in [0, 1]. A button whose ramp fails
 * BUTTON_INK_MIN for both inks scores zero, whatever its other terms.
 */
export function scoreGradient(g, ctx = {}) {
  const space = g.space === 'srgb' ? 'srgb' : 'oklch'
  const ramp = rampOf(g.stops)
  const ends = endsOfRamp(ramp, g.type)
  const a = hexToOklchRaw(ends[0])
  const b = hexToOklchRaw(ends[1])
  const samples = Array.from({ length: RAMP_SAMPLES }, (_, i) => colourAt(ramp, (i * 100) / (RAMP_SAMPLES - 1), space))
  const mid = hexToOklchRaw(samples[(RAMP_SAMPLES - 1) / 2])
  const recentLabs = ctx.recentLabs ?? labEnds(ctx.recent)
  const terms = {
    valueStep: valueStepScore(a[0] - b[0]),
    cleanMiddle: cleanMiddleScore(mid[1], Math.min(a[1], b[1])),
    chromaBalance: chromaBalanceScore(a[1] - b[1]),
    hueRelation: hueRelationScore(hueGap(a, b), a[1], b[1]),
    anchor: anchorScore(a[0], b[0]),
    textArea: textAreaScore(samples),
    notSeen: notSeenScore([hexToLabD50(ends[0]), hexToLabD50(ends[1])], recentLabs),
  }
  let total = 0
  for (const k of Object.keys(SCORE_WEIGHTS)) total += SCORE_WEIGHTS[k] * terms[k]
  if (ctx.use === 'button' && !inkPasses(g)) total = 0
  return { total, terms }
}

/**
 * One of the best `TOP_PICKS` of the scored candidates ([{ g, score }]), chosen
 * with a roll in [0, 1). Ties keep roll order, so a seeded run is repeatable.
 */
export function chooseAmongTop(scored, rand = Math.random) {
  const ranked = scored.map((c, i) => ({ c, i }))
  // A zero is a failed hard rule (a button's ink): it ships only when nothing else can.
  const live = ranked.filter((x) => x.c.score > 0)
  const top = (live.length ? live : ranked)
    .sort((x, y) => y.c.score - x.c.score || x.i - y.i)
    .slice(0, TOP_PICKS)
  return top[Math.min(top.length - 1, Math.floor(Math.min(Math.max(rand(), 0), 0.999999) * top.length))].c.g
}

/** A button's text must reach this contrast against every point of its gradient. */
export const BUTTON_INK_MIN = 4.5

/**
 * The contrast of white ink and of near-black ink (oklch 0.2) against the whole ramp,
 * each as its worst case over the RAMP_SAMPLES points. A button passes when the
 * better of the two reaches BUTTON_INK_MIN. `g` is { type, space, stops }.
 */
export function inkContrasts(g) {
  const space = g.space === 'srgb' ? 'srgb' : 'oklch'
  const ramp = rampOf(g.stops)
  const lums = Array.from({ length: RAMP_SAMPLES }, (_, i) => lumOf(colourAt(ramp, (i * 100) / (RAMP_SAMPLES - 1), space)))
  const worst = (ink) => Math.min(...lums.map((l) => ratio(l, ink)))
  return { white: worst(lumOf('#FFFFFF')), dark: worst(INK_BUTTON_DARK_LUM) }
}
const INK_BUTTON_DARK_LUM = lumOf(oklchToHex(0.2, 0, 0))

/** Whether one of the two inks reaches BUTTON_INK_MIN across the whole ramp. */
export function inkPasses(g) {
  const { white, dark } = inkContrasts(g)
  return Math.max(white, dark) >= BUTTON_INK_MIN
}

/** A gradient's two ends as hexes, for the session's memory. */
export const endsOf = (g) => endsOfRamp(rampOf(g.stops), g.type)

/** The recent list with this result added, newest last, at most RECENT_RESULTS long. */
export const pushRecent = (recent, g) => [...(recent || []), endsOf(g)].slice(-RECENT_RESULTS)
