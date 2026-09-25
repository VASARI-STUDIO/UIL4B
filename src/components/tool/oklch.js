// OKLCH helpers shared by the colour tools that the App design builds
// in OKLCH: the gradient's OKLCH interpolation (and its SVG export, which has
// to sample OKLCH into sRGB stops because SVG gradients only interpolate in
// sRGB), and the tint scale, whose ramp is an OKLCH lightness curve.
//
// `oklchToHex` is the design file's own conversion (App.dc.html, D:1280-1295),
// kept numerically identical so a scale built here matches the one drawn there.
// Channels are clamped, so an out-of-gamut request lands on the sRGB edge
// rather than throwing.
import { hexToRgb } from '../../utils/colors'

const toHexByte = (u) => {
  const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(Math.max(u, 0), 1 / 2.4) - 0.055
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16)
  return c.length === 1 ? '0' + c : c
}

// L 0-1, C 0-~0.4, H degrees.
export function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = Math.cos(h) * C
  const b = Math.sin(h) * C
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return ('#' + toHexByte(r) + toHexByte(g) + toHexByte(bl)).toUpperCase()
}

// Unrounded [L 0-1, C, H degrees] — utils/colors.hexToOklch rounds for display,
// which is too coarse to interpolate between.
export function hexToOklchRaw(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const lr = lin(r), lg = lin(g), lb = lin(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2164557872 * lg + 0.6652917509 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(A * A + B * B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) H += 360
  return [L, C, H]
}

// Interpolate two hex colours at t in OKLCH, the way CSS `in oklch` does:
// shorter hue arc, and an achromatic end takes the other end's hue (its hue is
// "powerless", CSS Color 4 §12.4) so grey-to-blue does not swing through red.
export function mixOklch(fromHex, toHex, t) {
  const [L1, C1, H1raw] = hexToOklchRaw(fromHex)
  const [L2, C2, H2raw] = hexToOklchRaw(toHex)
  const EPS = 0.002
  let H1 = C1 < EPS ? H2raw : H1raw
  let H2 = C2 < EPS ? H1raw : H2raw
  let d = H2 - H1
  if (d > 180) H1 += 360
  else if (d < -180) H2 += 360
  d = H2 - H1
  const H = (((H1 + d * t) % 360) + 360) % 360
  return oklchToHex(L1 + (L2 - L1) * t, C1 + (C2 - C1) * t, H)
}

// Resample sorted stops [{ color, position }] into sRGB stops every `step`
// percent, interpolated in OKLCH — for formats that cannot say `in oklch`.
export function sampleStopsOklch(stops, step = 5) {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  if (sorted.length < 2) return sorted.map((s) => ({ color: s.color.toUpperCase(), position: s.position }))
  const out = []
  const push = (color, position) => {
    const last = out[out.length - 1]
    if (last && last.position === position && last.color === color) return
    out.push({ color: color.toUpperCase(), position })
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1]
    push(a.color, Math.round(a.position))
    const span = b.position - a.position
    if (span <= 0) continue
    for (let p = Math.ceil((a.position + 0.0001) / step) * step; p < b.position; p += step) {
      push(mixOklch(a.color, b.color, (p - a.position) / span), Math.round(p))
    }
  }
  const lastStop = sorted[sorted.length - 1]
  push(lastStop.color, Math.round(lastStop.position))
  return out
}
