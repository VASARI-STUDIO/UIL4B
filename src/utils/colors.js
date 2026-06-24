// Color conversion utilities migrated from app.js

export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  let h, s
  const l = (mx + mn) / 2
  if (mx === mn) {
    h = s = 0
  } else {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return '#' + f(0) + f(8) + f(4)
}

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ]
}

// HSB/HSV (hue, saturation, brightness/value) — computed from RGB.
export function hexToHsv(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  let h = 0
  if (d !== 0) {
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  const s = mx === 0 ? 0 : d / mx
  return [Math.round(h * 360), Math.round(s * 100), Math.round(mx * 100)]
}

// Blend a hex colour toward a target hex by amount t (0..1) in RGB space.
export function mixHex(hex, target, t) {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0')
  return '#' + ch(0) + ch(1) + ch(2)
}

export function hexToCmyk(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const k = 1 - Math.max(r, g, b)
  if (k === 1) return [0, 0, 0, 100]
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  return [c, m, y, k].map(v => Math.round(v * 100))
}

export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const lr = lin(r), lg = lin(g), lb = lin(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2164557872 * lg + 0.6652917509 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(a * a + bb * bb)
  let H = Math.atan2(bb, a) * 180 / Math.PI
  if (H < 0) H += 360
  return [+(L * 100).toFixed(1), +C.toFixed(3), +H.toFixed(1)]
}

// Approximate human-readable colour name from HSL — hue family plus
// lightness/saturation modifiers. Honest and dataset-free (no giant lookup).
export function describeColor(hex) {
  const [h, s, l] = hexToHsl(hex)
  if (l <= 4) return 'Black'
  if (l >= 97) return 'White'
  if (s <= 8) {
    if (l < 22) return 'Charcoal'
    if (l < 42) return 'Dark Grey'
    if (l < 62) return 'Grey'
    if (l < 82) return 'Light Grey'
    return 'Off White'
  }
  const HUES = [
    [15, 'Red'], [45, 'Orange'], [65, 'Yellow'], [90, 'Lime'], [150, 'Green'],
    [175, 'Teal'], [195, 'Cyan'], [240, 'Blue'], [275, 'Indigo'], [300, 'Violet'],
    [330, 'Magenta'], [345, 'Pink'], [360, 'Red'],
  ]
  const family = HUES.find(([max]) => h <= max)?.[1] || 'Red'
  let prefix = ''
  if (l < 25) prefix = 'Dark '
  else if (l > 78) prefix = 'Light '
  else if (s < 35) prefix = 'Muted '
  else if (s > 80 && l > 45 && l < 65) prefix = 'Vivid '
  return prefix + family
}

export function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

export function contrastRatio(hex1, hex2) {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  const l1 = luminance(c1[0], c1[1], c1[2])
  const l2 = luminance(c2[0], c2[1], c2[2])
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export function textColorForBg(hex) {
  const rgb = hexToRgb(hex)
  const lum = luminance(rgb[0], rgb[1], rgb[2])
  return lum > 0.179 ? 'rgba(0,0,0,.85)' : 'rgba(255,255,255,.9)'
}

function soften(s, factor) { return Math.max(10, Math.round(s * factor)) }
function lShift(l, delta) { return Math.max(5, Math.min(95, l + delta)) }

export function generateHarmony(hex, type) {
  const [h, s, l] = hexToHsl(hex)
  const colors = [hex]
  const headroom = 95 - l
  const depth = l - 5
  switch (type) {
    case 'complement':
      colors.push(
        hslToHex(h + 180, s, l),
        hslToHex(h, soften(s, .7), lShift(l, headroom * .5)),
        hslToHex(h + 180, soften(s, .7), lShift(l, headroom * .5)),
        hslToHex(h, s, lShift(l, -depth * .5))
      )
      break
    case 'analogous':
      colors.push(
        hslToHex(h - 30, s, l),
        hslToHex(h + 30, s, l),
        hslToHex(h - 15, soften(s, .75), lShift(l, headroom * .35)),
        hslToHex(h + 15, soften(s, .75), lShift(l, headroom * .35))
      )
      break
    case 'triadic':
      colors.push(
        hslToHex(h + 120, s, l),
        hslToHex(h + 240, s, l),
        hslToHex(h, soften(s, .65), lShift(l, headroom * .45)),
        hslToHex(h + 120, soften(s, .65), lShift(l, headroom * .45))
      )
      break
    case 'split':
      colors.push(
        hslToHex(h + 150, s, l),
        hslToHex(h + 210, s, l),
        hslToHex(h, s, lShift(l, headroom * .5)),
        hslToHex(h + 180, s, lShift(l, -depth * .4))
      )
      break
    case 'tetradic':
      colors.push(
        hslToHex(h + 90, s, l),
        hslToHex(h + 180, s, l),
        hslToHex(h + 270, s, l),
        hslToHex(h, soften(s, .8), lShift(l, -depth * .45))
      )
      break
    case 'monochromatic':
      colors.push(
        hslToHex(h, s, lShift(l, headroom * .4)),
        hslToHex(h, soften(s, .7), lShift(l, headroom * .7)),
        hslToHex(h, soften(s, .85), lShift(l, -depth * .4)),
        hslToHex(h, s, lShift(l, -depth * .7))
      )
      break
    case 'custom':
      colors.push(
        hslToHex(h + 60, s, l),
        hslToHex(h + 180, s, l),
        hslToHex(h, soften(s, .6), lShift(l, headroom * .5)),
        hslToHex(h, s, lShift(l, -depth * .5))
      )
      break
  }
  return colors
}

const T_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const T_LINEAR = [97, 93, 85, 75, 62, 50, 38, 28, 18, 10, 5]
const T_PERCEIVED = [98, 95, 88, 78, 66, 53, 40, 30, 20, 12, 6]

export { T_LABELS }

export function generateTintScale(cfg) {
  const [h, s, baseL] = hexToHsl(cfg.hex)
  const stops = cfg.mode === 'perceived' ? T_PERCEIVED : T_LINEAR
  const n = stops.length
  const ai = cfg.anchor
  return stops.map((defaultL, i) => {
    let newL
    if (i === ai) { newL = baseL }
    else if (i < ai) { const t = 1 - (i / ai); newL = baseL + t * (cfg.lMax - baseL) }
    else { const t2 = (i - ai) / (n - 1 - ai); newL = baseL - t2 * (baseL - cfg.lMin) }
    newL = Math.max(0, Math.min(100, newL))
    const tNorm = (n - 1 - i) / (n - 1)
    const newH = h + cfg.hueShift * tNorm
    let satShift = cfg.satMax * tNorm + cfg.satMin * (1 - tNorm)
    let newS = Math.max(0, Math.min(100, s + satShift))
    if (i === 0 || i === n - 1) newS = Math.max(0, newS * 0.5)
    return hslToHex(newH, Math.round(newS), Math.round(newL))
  })
}

// ─────────────────────────────────────────────────────────────────────────
// HCT (Hue · Chroma · Tone) — minimal self-contained Material-3 port.
// Ported from material-color-utilities (Apache-2.0) down to the CAM16 + HCT
// solver we actually use, to avoid pulling the full package (bundle weight).
// hctToHex(hue 0-360, chroma 0+, tone 0-100) -> '#rrggbb'.
// ─────────────────────────────────────────────────────────────────────────

// Linearised-sRGB → CIE XYZ matrix (D65 white point). Multiply a [R,G,B] of
// `linearized()` components (0–100) by this to get [X,Y,Z]. Row 1 is the standard
// Rec.709 luminance weights, so `row · SRGB_TO_XYZ[1]` gives Y directly.
// NOTE: the CAM16 chromatic-adaptation step in hexToHct() does NOT use this matrix
// for its cone response — it applies the separate hardcoded CAT16/M16 (Bradford-
// family) coefficients inline (0.401288 / 0.650173 / -0.051461 …). The two are
// distinct; this matrix is sRGB→XYZ only.
const SRGB_TO_XYZ = [
  [0.41233895, 0.35762064, 0.18051042],
  [0.2126, 0.7152, 0.0722],
  [0.01932141, 0.11916382, 0.95034478],
]
const Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722]
const LINRGB_FROM_SCALED_DISCOUNT = [
  [1373.2198709594231, -1100.4251190754821, -7.278681089101213],
  [-271.815969077903, 559.6580465940733, -32.46047482791194],
  [1.9622899599665666, -57.173814538844006, 308.7233197812385],
]

function clampInt(min, max, v) { return v < min ? min : v > max ? max : v }
function clampDouble(min, max, v) { return v < min ? min : v > max ? max : v }
function signum(n) { return n < 0 ? -1 : n === 0 ? 0 : 1 }

function linearized(rgbComponent) {
  const n = rgbComponent / 255
  return (n <= 0.040449936 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)) * 100
}
function delinearized(rgbComponent) {
  const n = rgbComponent / 100
  const v = n <= 0.0031308 ? n * 12.92 : 1.055 * Math.pow(n, 1 / 2.4) - 0.055
  return clampInt(0, 255, Math.round(v * 255))
}
function hexFromRgb(r, g, b) {
  const h = (v) => clampInt(0, 255, v).toString(16).padStart(2, '0')
  return '#' + h(r) + h(g) + h(b)
}
function yFromLstar(lstar) {
  const fy = (lstar + 16) / 116
  const fy3 = fy * fy * fy
  return (fy3 > 216 / 24389 ? fy3 : (116 * fy - 16) / (24389 / 27)) * 100
}
// module-private: inverse of yFromLstar (CIE Y → L*), used by hexToHct for tone.
function lstarFromY(y) {
  const yNorm = y / 100
  const yi = yNorm > 216 / 24389 ? Math.cbrt(yNorm) : ((24389 / 27) * yNorm + 16) / 116
  return 116 * yi - 16
}
function matrixMultiply(row, matrix) {
  return [
    row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2],
    row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2],
    row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2],
  ]
}
function inverseChromaticAdaptation(adapted) {
  const abs = Math.abs(adapted)
  const base = Math.max(0, (27.13 * abs) / (400 - abs))
  return signum(adapted) * Math.pow(base, 1 / 0.42)
}

// CAM16 viewing conditions (default sRGB / D65 / mid-grey background).
const VC = (() => {
  const wp = [95.047, 100, 108.883]
  const rW = wp[0] * 0.401288 + wp[1] * 0.650173 + wp[2] * -0.051461
  const gW = wp[0] * -0.250268 + wp[1] * 1.204414 + wp[2] * 0.045854
  const bW = wp[0] * -0.002079 + wp[1] * 0.048952 + wp[2] * 0.953127
  const f = 1, c = 0.69, nc = 1
  const yb = yFromLstar(50), yw = 100
  const adaptingLuminance = ((200 / Math.PI) * yFromLstar(50)) / 100
  const n = yb / yw
  const z = 1.48 + Math.sqrt(n)
  const nbb = 0.725 / Math.pow(n, 0.2)
  const ncb = nbb
  const d = clampDouble(0, 1, f * (1 - (1 / 3.6) * Math.exp((-adaptingLuminance - 42) / 92)))
  const rgbD = [d * (100 / rW) + 1 - d, d * (100 / gW) + 1 - d, d * (100 / bW) + 1 - d]
  const k = 1 / (5 * adaptingLuminance + 1)
  const k4 = k * k * k * k
  const k4F = 1 - k4
  const fl = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5 * adaptingLuminance)
  const rAF = Math.pow((fl * rgbD[0] * rW) / 100, 0.42)
  const gAF = Math.pow((fl * rgbD[1] * gW) / 100, 0.42)
  const bAF = Math.pow((fl * rgbD[2] * bW) / 100, 0.42)
  const rA = (400 * rAF) / (rAF + 27.13)
  const gA = (400 * gAF) / (gAF + 27.13)
  const bA = (400 * bAF) / (bAF + 27.13)
  const aw = (2 * rA + gA + 0.05 * bA) * nbb
  return { n, aw, nbb, ncb, c, nc, rgbD, fl, z }
})()

function sanitizeRadians(angle) { return (angle + Math.PI * 8) % (Math.PI * 2) }
function trueDelinearized(c) {
  const n = c / 100
  const v = n <= 0.0031308 ? n * 12.92 : 1.055 * Math.pow(n, 1 / 2.4) - 0.055
  return v * 255
}

// Newton solver: sRGB colour at (hue rad, chroma, tone-as-Y), or 0 if not found.
function findResultByJ(hueRadians, chroma, y) {
  let j = Math.sqrt(y) * 11
  const tInnerCoeff = 1 / Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73)
  const eHue = 0.25 * (Math.cos(hueRadians + 2) + 3.8)
  const p1 = eHue * (50000 / 13) * VC.nc * VC.ncb
  const hSin = Math.sin(hueRadians)
  const hCos = Math.cos(hueRadians)
  for (let round = 0; round < 5; round++) {
    const jNorm = j / 100
    const alpha = chroma === 0 || j === 0 ? 0 : chroma / Math.sqrt(jNorm)
    const t = Math.pow(alpha * tInnerCoeff, 1 / 0.9)
    const ac = VC.aw * Math.pow(jNorm, 1 / VC.c / VC.z)
    const p2 = ac / VC.nbb
    const gamma = (23 * (p2 + 0.305) * t) / (23 * p1 + 11 * t * hCos + 108 * t * hSin)
    const a = gamma * hCos
    const b = gamma * hSin
    const rA = (460 * p2 + 451 * a + 288 * b) / 1403
    const gA = (460 * p2 - 891 * a - 261 * b) / 1403
    const bA = (460 * p2 - 220 * a - 6300 * b) / 1403
    const linrgb = matrixMultiply(
      [inverseChromaticAdaptation(rA), inverseChromaticAdaptation(gA), inverseChromaticAdaptation(bA)],
      LINRGB_FROM_SCALED_DISCOUNT,
    )
    if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) return 0
    const fnj = Y_FROM_LINRGB[0] * linrgb[0] + Y_FROM_LINRGB[1] * linrgb[1] + Y_FROM_LINRGB[2] * linrgb[2]
    if (fnj <= 0) return 0
    if (round === 4 || Math.abs(fnj - y) < 0.002) {
      if (linrgb[0] > 100.01 || linrgb[1] > 100.01 || linrgb[2] > 100.01) return 0
      return hexFromRgb(
        Math.round(trueDelinearized(linrgb[0])),
        Math.round(trueDelinearized(linrgb[1])),
        Math.round(trueDelinearized(linrgb[2])),
      )
    }
    j = j - ((fnj - y) * j) / (2 * fnj)
  }
  return 0
}
function grayHex(tone) {
  const c = delinearized(yFromLstar(clampDouble(0, 100, tone)))
  return hexFromRgb(c, c, c)
}

// Solve for the sRGB colour at (hue°, chroma, tone); reduce chroma until the
// colour is in-gamut, guaranteeing a valid hex (M3 behaviour).
function solveToHex(hueDegrees, chroma, tone) {
  if (chroma < 0.0001 || tone < 0.0001 || tone > 99.9999) return grayHex(tone)
  const hueRad = sanitizeRadians((hueDegrees % 360) * (Math.PI / 180))
  const y = yFromLstar(tone)
  let answer = findResultByJ(hueRad, chroma, y)
  if (answer) return answer
  let low = 0, high = chroma
  for (let i = 0; i < 8 && high - low > 0.4; i++) {
    const mid = (low + high) / 2
    const candidate = findResultByJ(hueRad, mid, y)
    if (candidate) { answer = candidate; low = mid } else { high = mid }
  }
  return answer || grayHex(tone)
}

// Public: hue 0-360, chroma 0+, tone 0-100 -> '#rrggbb'. Throws on non-finite
// input; callers wrap in try/catch per Murphy's-law (HSL fallback).
export function hctToHex(hue, chroma, tone) {
  if (![hue, chroma, tone].every(Number.isFinite)) throw new Error('hctToHex: non-finite input')
  return solveToHex(hue, Math.max(0, chroma), clampDouble(0, 100, tone))
}

// HCT of a hex: tone from L*, hue + chroma from CAM16. Used by tonalRamp so the
// ramp tracks the swatch's own hue/chroma.
export function hexToHct(hex) {
  const [r, g, b] = hexToRgb(hex)
  const lr = linearized(r), lg = linearized(g), lb = linearized(b)
  const yy = SRGB_TO_XYZ[1][0] * lr + SRGB_TO_XYZ[1][1] * lg + SRGB_TO_XYZ[1][2] * lb
  // Cone responses (rC/gC/bC) via the CAT16/M16 chromatic-adaptation transform —
  // these literal coefficients are the separate Bradford-family matrix, NOT
  // SRGB_TO_XYZ; they map XYZ → the CAM16 RGB cone space.
  const rC = 0.401288 * (SRGB_TO_XYZ[0][0] * lr + SRGB_TO_XYZ[0][1] * lg + SRGB_TO_XYZ[0][2] * lb)
    + 0.650173 * yy
    - 0.051461 * (SRGB_TO_XYZ[2][0] * lr + SRGB_TO_XYZ[2][1] * lg + SRGB_TO_XYZ[2][2] * lb)
  const x = SRGB_TO_XYZ[0][0] * lr + SRGB_TO_XYZ[0][1] * lg + SRGB_TO_XYZ[0][2] * lb
  const z = SRGB_TO_XYZ[2][0] * lr + SRGB_TO_XYZ[2][1] * lg + SRGB_TO_XYZ[2][2] * lb
  const gC = -0.250268 * x + 1.204414 * yy + 0.045854 * z
  const bC = -0.002079 * x + 0.048952 * yy + 0.953127 * z
  const rD = VC.rgbD[0] * rC, gD = VC.rgbD[1] * gC, bD = VC.rgbD[2] * bC
  const rAF = Math.pow((VC.fl * Math.abs(rD)) / 100, 0.42)
  const gAF = Math.pow((VC.fl * Math.abs(gD)) / 100, 0.42)
  const bAF = Math.pow((VC.fl * Math.abs(bD)) / 100, 0.42)
  const rA = (signum(rD) * 400 * rAF) / (rAF + 27.13)
  const gA = (signum(gD) * 400 * gAF) / (gAF + 27.13)
  const bA = (signum(bD) * 400 * bAF) / (bAF + 27.13)
  const a = (11 * rA - 12 * gA + bA) / 11
  const bb = (rA + gA - 2 * bA) / 9
  const u = (20 * rA + 20 * gA + 21 * bA) / 20
  const p2 = (40 * rA + 20 * gA + bA) / 20
  let hue = (Math.atan2(bb, a) * 180) / Math.PI
  if (hue < 0) hue += 360; else if (hue >= 360) hue -= 360
  const ac = p2 * VC.nbb
  const jScale = 100 * Math.pow(ac / VC.aw, VC.c * VC.z)
  const huePrime = hue < 20.14 ? hue + 360 : hue
  const eHue = 0.25 * (Math.cos((huePrime * Math.PI) / 180 + 2) + 3.8)
  const p1 = (50000 / 13) * eHue * VC.nc * VC.ncb
  const t = (p1 * Math.sqrt(a * a + bb * bb)) / (u + 0.305)
  const alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73)
  const chroma = alpha * Math.sqrt(jScale / 100)
  return [hue, chroma, lstarFromY(yy)]
}

// 5-step tonal ramp of a hex at the given tones, preserving its hue/chroma.
export function tonalRamp(hex, tones = [30, 45, 60, 75, 90]) {
  let h, c
  try { const hct = hexToHct(hex); h = hct[0]; c = hct[1] }
  catch { const [hh, ss] = hexToHsl(hex); h = hh; c = ss * 0.6 }
  return tones.map(t => {
    try { return hctToHex(h, c, t) }
    catch { return hslToHex(h, Math.min(100, c), t) }
  })
}

// Default "Auto" tonal palette: 5 swatches mapped to the five ROLES off a
// seeded hue, using M3 tone roles. Accessible-by-construction (large tone
// distances). Returns 5 hexes [PRIMARY, SECONDARY, ACCENT, SUBTLE, DEEP].
export function autoTonalPalette(seedHue = Math.random() * 360) {
  const hue = ((seedHue % 360) + 360) % 360
  const sibling = (hue + (20 + Math.random() * 25)) % 360
  const baseChroma = 36 + Math.random() * 24
  return [
    hctToHex(hue, baseChroma, 40),               // PRIMARY  -> tone 40
    hctToHex(sibling, baseChroma * 0.92, 60),    // SECONDARY-> tone 60 (sibling hue)
    hctToHex(hue, baseChroma + 14, 70),          // ACCENT   -> tone 70, higher chroma
    hctToHex(hue, 8, 90),                        // SUBTLE   -> tone 90, low chroma
    hctToHex(hue, baseChroma * 0.7, 20),         // DEEP     -> tone 20
  ]
}

// Non-destructive global adjust lens. Hue rotate / chroma scale / tone shift /
// temperature bias over a base palette -> new array. Identity (returns input)
// when every field is 0, so exports stay untouched until a slider moves.
export function applyAdjust(baseColors, adj) {
  if (!adj || (adj.h === 0 && adj.s === 0 && adj.b === 0 && adj.temp === 0)) return baseColors
  return baseColors.map(hex => {
    try {
      let [h, c, t] = hexToHct(hex)
      h = (((h + adj.h) % 360) + 360) % 360
      if (adj.temp !== 0) {
        const target = adj.temp > 0 ? 30 : 210
        const diff = ((target - h + 540) % 360) - 180
        h = (((h + diff * (Math.abs(adj.temp) / 100) * 0.5) % 360) + 360) % 360
      }
      c = Math.max(0, c * (1 + adj.s / 100))
      // adj.b is the "Tone" slider (±100). Halved → ±50 tone steps so full travel
      // shifts half the 0–100 tone range, not the whole thing (prevents total
      // black/white washes at the extremes).
      t = Math.max(0, Math.min(100, t + adj.b / 2))
      return hctToHex(h, c, t)
    } catch {
      let [h, s, l] = hexToHsl(hex)
      h = (((h + adj.h) % 360) + 360) % 360
      s = Math.max(0, Math.min(100, s * (1 + adj.s / 100)))
      l = Math.max(0, Math.min(100, l + adj.b / 2))
      return hslToHex(h, s, l)
    }
  })
}
export function fixForeground(fg, bg, targetRatio) {
  const fgHsl = hexToHsl(fg)
  const [h, s] = fgHsl
  const bgRgb = hexToRgb(bg)
  const bgLum = luminance(bgRgb[0], bgRgb[1], bgRgb[2])
  const isDk = bgLum < 0.5
  let lo, hi
  if (isDk) { lo = fgHsl[2]; hi = 100 } else { lo = 0; hi = fgHsl[2] }
  let best = fg
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const t = hslToHex(h, s, Math.round(mid))
    const r = contrastRatio(t, bg)
    if (r >= targetRatio) { best = t; if (isDk) hi = mid; else lo = mid }
    else { if (isDk) lo = mid; else hi = mid }
  }
  return best
}

export function fixBackground(fg, bg, targetRatio) {
  const bgHsl = hexToHsl(bg)
  const [h, s] = bgHsl
  const fgRgb = hexToRgb(fg)
  const fgLum = luminance(fgRgb[0], fgRgb[1], fgRgb[2])
  const isFgLight = fgLum > 0.5
  let lo, hi
  if (isFgLight) { lo = 0; hi = bgHsl[2] } else { lo = bgHsl[2]; hi = 100 }
  let best = bg
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const t = hslToHex(h, s, Math.round(mid))
    const r = contrastRatio(fg, t)
    if (r >= targetRatio) { best = t; if (isFgLight) lo = mid; else hi = mid }
    else { if (isFgLight) hi = mid; else lo = mid }
  }
  return best
}
