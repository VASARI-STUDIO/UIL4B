// The page roles a template paints with, worked out from the palette: paper, ink,
// muted and rule. Hex in, hex out, with no import from a generator, so the template
// tree stays free of them; the contrast function is passed in by the caller.

// Chroma below this reads as a neutral (grey, off-white, near-black).
export const NEUTRAL_CHROMA = 0.045

const HEX = /^#[0-9a-fA-F]{6}$/

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const fromLinear = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

/** #rrggbb to { l, c, h } in OKLCH (l 0..1, c about 0..0.4, h in degrees). */
export function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  return { l: L, c, h: c < 1e-4 ? 0 : (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 }
}

// Linear sRGB for an OKLCH colour, unclamped (a channel outside 0..1 means out of gamut).
function oklchToLinear(L, C, H) {
  const a = C * Math.cos(H * Math.PI / 180)
  const b = C * Math.sin(H * Math.PI / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const byteHex = (v) => Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')

/** OKLCH to #RRGGBB; chroma is reduced until the colour fits sRGB, so the hue and lightness hold. */
export function oklchToHex(L, C, H) {
  let c = Math.max(0, C)
  for (let i = 0; i < 24; i += 1) {
    const rgb = oklchToLinear(L, c, H)
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return `#${rgb.map(byteHex).join('')}`.toUpperCase()
    c *= 0.85
  }
  return `#${oklchToLinear(L, 0, H).map(byteHex).join('')}`.toUpperCase()
}

/** `amount` (0..1) of `from` laid over `to`, channel by channel: ink at 62% on paper is mix(ink, paper, 0.62). */
export function mixHex(from, to, amount) {
  const out = [1, 3, 5].map((i) => {
    const a = parseInt(from.slice(i, i + 2), 16)
    const b = parseInt(to.slice(i, i + 2), 16)
    return Math.round(a * amount + b * (1 - amount)).toString(16).padStart(2, '0')
  })
  return `#${out.join('')}`.toUpperCase()
}

export const isNeutral = (hex) => hexToOklch(hex).c < NEUTRAL_CHROMA

/**
 * { paper, ink, muted, rule } for a palette.
 *  paper  the lightest neutral at L 0.90 or more, else a neutral at L 0.97 in the primary's hue
 *  ink    the darkest neutral that reads 4.5:1 on paper, else a neutral at L 0.20
 *  muted  ink at 62% over paper, taken up toward ink until it reads 4.5:1 on paper
 *  rule   ink at 14% over paper
 * `contrast(a, b)` is the WCAG ratio; `primary` sets the hue of a derived neutral.
 */
export function deriveRoles(palette, { contrast, primary } = {}) {
  const colours = (Array.isArray(palette) ? palette : []).filter((h) => HEX.test(h))
  const hasHue = HEX.test(primary || '')
  const hue = hasHue ? hexToOklch(primary) : { h: 0 }
  const tint = (L) => oklchToHex(L, hasHue ? 0.008 : 0, hue.h)
  const neutrals = colours.map((hex) => ({ hex, ...hexToOklch(hex) })).filter((n) => n.c < NEUTRAL_CHROMA)

  const light = neutrals.filter((n) => n.l >= 0.9).sort((a, b) => b.l - a.l)[0]
  const paper = light ? light.hex.toUpperCase() : tint(0.97)

  const dark = neutrals.filter((n) => n.hex.toUpperCase() !== paper).sort((a, b) => a.l - b.l)[0]
  const reads = (hex) => contrast(hex, paper) >= 4.5
  const ink = dark && reads(dark.hex) ? dark.hex.toUpperCase() : tint(0.2)

  let share = 0.62
  let muted = mixHex(ink, paper, share)
  while (!reads(muted) && share < 1) {
    share = Math.min(1, share + 0.04)
    muted = mixHex(ink, paper, share)
  }
  return { paper, ink, muted, rule: mixHex(ink, paper, 0.14) }
}
