// The one tint ramp. The Tint Generator draws it on screen and the Palette
// Builder shows it under each swatch (the five-bar strip and the Tints
// popover), so a hex reads the same in both tools and the two cannot drift.
//
// The ramp is an OKLCH lightness curve from 0.97 down, one hue, and a chroma
// that peaks mid-scale and tapers to about 55% at the ends, so the light end is
// a soft tint instead of an sRGB-clamped neon. It is NOT anchored to the source
// colour: step 500 is the middle of the scale, not the source itself.
//
// projectTints.js keeps its own HSL ramp for the tints a project saves. That is
// a separate output (it feeds exports) and is left alone here.
import { hexToOklchRaw, oklchToHex } from '../components/tool/oklch.js'

export const TINT_LABELS = {
  9: ['50', '100', '200', '300', '400', '500', '600', '700', '800'],
  11: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  13: ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '975'],
}

// The design's ramp, exactly (App.dc.html D:1436-1442). `curve` is 0 Even,
// 1 Soft ends, 2 High contrast.
export function buildRamp(hue, chroma, steps, curve) {
  const labels = TINT_LABELS[steps]
  return labels.map((label, i) => {
    const t = i / (steps - 1)
    let L = 0.97 - t * 0.78
    if (curve === 1) L = 0.97 - (0.5 - Math.cos(Math.PI * t) / 2) * 0.78
    if (curve === 2) L = 0.97 - Math.pow(t, 0.78) * 0.83
    const c = chroma * (1 - Math.abs(t - 0.5) * 0.9)
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
