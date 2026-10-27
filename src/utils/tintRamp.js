// The one tint ramp. The Tint Generator draws it on screen and the Palette
// Builder shows it under each swatch (the five-bar strip and the Tints
// popover), so a hex reads the same in both tools and the two cannot drift.
//
// The ramp is an OKLCH lightness curve from 0.97 down, one hue, and a chroma
// that peaks mid-scale and tapers to about 55% at the ends, so the light end is
// a soft tint instead of an sRGB-clamped neon. A step that still falls outside
// sRGB has its chroma reduced (lightness and hue kept) until it fits, rather
// than having channels clipped, which would drift its hue. A near-grey source
// (chroma under NEUTRAL_CHROMA) gives a pure grey ramp: the hue of a grey is
// numerical noise, and scaling its chroma up would tint the ramp yellow-green.
// It is NOT anchored to the source colour: step 500 is the middle of the
// scale, not the source itself.
//
// buildRamp's optional settings are the Tint Generator's Lightness and
// Saturation sliders and its Perceived / Linear switch. All three default to
// the ramp described above, so a caller that passes none (the Palette Builder)
// gets the same hexes as before.
//
// projectTints.js keeps its own HSL ramp for the tints a project saves. That is
// a separate output (it feeds exports) and is left alone here.
import { hexToOklchRaw, oklchInGamut, oklchToHex } from '../components/tool/oklch.js'

import { TINT_LABELS as ALL_TINT_LABELS } from './tintLabels.js'

// The step names of the Tint Generator's 9, 11 and 13 step ramps.
export const TINT_LABELS = { 9: ALL_TINT_LABELS[9], 11: ALL_TINT_LABELS[11], 13: ALL_TINT_LABELS[13] }

// Below this input chroma a colour is treated as neutral. White and the greys
// read about 0 here, at a meaningless hue; a near-grey tint may read a little more.
const NEUTRAL_CHROMA = 0.01

// The largest chroma <= `chroma` that fits sRGB at this lightness and hue.
function fitChroma(L, chroma, hue) {
  if (oklchInGamut(L, chroma, hue)) return chroma
  let lo = 0
  let hi = chroma
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (oklchInGamut(L, mid, hue)) lo = mid
    else hi = mid
  }
  return lo
}

// How far down the lightness scale a step sits, 0 (first step) to 1 (last), for
// the three curves: 0 Even, 1 Soft ends, 2 High contrast. `drop` is how far the
// curve falls from the 0.97 top, so the last step lands on 0.97 - drop.
const L_TOP = 0.97
function curveProgress(t, curve) {
  if (curve === 1) return { u: 0.5 - Math.cos(Math.PI * t) / 2, drop: 0.78 }
  if (curve === 2) return { u: Math.pow(t, 0.78), drop: 0.83 }
  return { u: t, drop: 0.78 }
}

// The Lightness slider moves the middle of the scale without moving its ends.
// It is a shift from -50 (darker) to +50 (lighter); 0 is the ramp as it was
// before the slider existed. Progress is raised to a power, so 0 and 1 stay put
// and the steps between slide toward the light end (a power above 1) or the
// dark end (below 1). The shift is clamped, so a stored or typed value cannot
// run the ramp off the scale.
export const LIGHTNESS_RANGE = 50
export function lightnessGamma(shift) {
  const n = Number(shift)
  const s = Number.isFinite(n) ? Math.max(-LIGHTNESS_RANGE, Math.min(LIGHTNESS_RANGE, n)) : 0
  return Math.pow(2, s / LIGHTNESS_RANGE)
}

// The Saturation slider is a percentage of the source's own chroma: 100 is the
// colour as given (the ramp as it was), 0 a pure grey, and above 100 pushes the
// chroma up until a step meets the sRGB edge, where fitChroma holds it.
export const SATURATION_MAX = 150
export function saturationScale(percent) {
  const n = Number(percent)
  return (Number.isFinite(n) ? Math.max(0, Math.min(SATURATION_MAX, n)) : 100) / 100
}

/**
 * How the lightness between the two ends is spaced:
 *   perceived  even in OKLCH lightness, so each step looks the same distance from
 *              the last (the default, and the ramp as it always was)
 *   linear     even in linear-light sRGB, the way light itself adds up. The ends
 *              are the same; the steps between sit lighter, because equal steps
 *              of light are small steps to the eye in the dark half
 */
export const SPACINGS = ['perceived', 'linear']

/** The OKLCH lightness of step `t` (0 to 1 along the scale) for these settings. */
export function stepLightness(t, curve, spacing = 'perceived', lightnessShift = 0) {
  const { u: u0, drop } = curveProgress(t, curve)
  const g = lightnessGamma(lightnessShift)
  const u = g === 1 ? u0 : Math.pow(u0, g)
  if (spacing === 'linear') {
    // For a grey, OKLab lightness cubed is its linear-light value (Y).
    const yTop = L_TOP ** 3
    const yEnd = (L_TOP - drop) ** 3
    return Math.cbrt(yTop - u * (yTop - yEnd))
  }
  return L_TOP - u * drop
}

// The design's lightness and chroma curves (App.dc.html D:1436-1442), with the
// gamut fit above. `curve` is 0 Even, 1 Soft ends, 2 High contrast. `opts` is
// { spacing, lightness, saturation }; left out, the ramp is the original one.
export function buildRamp(hue, chroma, steps, curve, opts = {}) {
  const { spacing = 'perceived', lightness = 0, saturation = 100 } = opts
  const labels = TINT_LABELS[steps]
  if (chroma < NEUTRAL_CHROMA) chroma = 0
  chroma *= saturationScale(saturation)
  return labels.map((label, i) => {
    const t = i / (steps - 1)
    const L = stepLightness(t, curve, spacing, lightness)
    const c = fitChroma(L, chroma * (1 - Math.abs(t - 0.5) * 0.9), hue)
    return { label, L, hex: oklchToHex(L, c, hue) }
  })
}

/** The ramp of a hex at the Tint Generator's defaults (11 steps, Even). */
export function tintRampForHex(hex, steps = 11, curve = 0) {
  const [, C, H] = hexToOklchRaw(hex)
  if (![C, H].every(Number.isFinite)) {
    // Not a six-digit hex: show the input in every slot rather than "#NaN".
    return TINT_LABELS[steps].map((label) => ({ label, L: NaN, hex }))
  }
  return buildRamp(H, C, steps, curve)
}

// The swatch strip shows five of the eleven steps: 100, 300, 500, 700, 900.
// They sit evenly either side of the middle step (500), so the strip reads
// light to dark with the same distance on both sides. 50 and 950 are left to
// the popover: 50 is a near-white wash and 950 near-black, and neither says
// much at strip size. Every strip bar is also a row of the popover.
export const STRIP_LABELS = ['100', '300', '500', '700', '900']

/** The five hexes under a swatch, light to dark, in the Tint Generator's ramp. */
export function swatchStripHexes(hex) {
  const byLabel = new Map(tintRampForHex(hex).map((r) => [r.label, r.hex]))
  return STRIP_LABELS.map((l) => byLabel.get(l))
}
