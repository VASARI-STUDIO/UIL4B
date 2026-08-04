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
// Semantic-colour hue arcs (ColorStudio "Custom" states).
// Given the reference "500" hex per semantic role, derive each role's canonical
// hue and the arc of the wheel it may roam within. "Capped halfway": each arc
// runs from the midpoint between the role's hue and its counter-clockwise
// neighbour to the midpoint with its clockwise neighbour. Midpoints are shared,
// so the arcs tile 360° exactly — no gaps, no overlap. That keeps a custom
// "success" legibly green (it can lean lime or teal, never orange or blue).
// Returns { [role]: { lo, hi, canonical } } in a monotonic frame (lo may be
// negative for the role that straddles 0°); normalise with mod 360 before
// feeding a hue to hslToHex.
export function roleHueArcs(refHexByRole) {
  const roles = Object.keys(refHexByRole)
  const canon = {}
  roles.forEach(r => { canon[r] = ((Math.round(hexToHsl(refHexByRole[r])[0]) % 360) + 360) % 360 })
  const sorted = [...roles].sort((a, b) => canon[a] - canon[b])
  const n = sorted.length
  const arcs = {}
  for (let i = 0; i < n; i++) {
    const role = sorted[i]
    const C = canon[role]
    let P = canon[sorted[(i - 1 + n) % n]]   // counter-clockwise neighbour
    let N = canon[sorted[(i + 1) % n]]        // clockwise neighbour
    if (P > C) P -= 360
    if (N < C) N += 360
    arcs[role] = { lo: (P + C) / 2, hi: (C + N) / 2, canonical: C }
  }
  return arcs
}

export function roleHueArc(role, refHexByRole) {
  return roleHueArcs(refHexByRole)[role]
}

// Build a 10-stop semantic ramp (labels 50…900) for a custom hue. Saturation &
// lightness are held at the reference "500" shade so the mid-tone reads as a
// proper 500; only hue changes. The light↔dark fan is produced by the existing
// tint engine (generateTintScale) — this is the "import tint generator" reuse.
// hueShift is 0 so the whole ramp stays inside the role's allowed arc.
export function semanticRamp(hue, refHex) {
  const [, refS, refL] = hexToHsl(refHex)
  const base = hslToHex(((hue % 360) + 360) % 360, refS, refL)
  const full = generateTintScale({
    hex: base, mode: 'perceived', anchor: 5,
    lMax: 96, lMin: 14, hueShift: 0, satMax: 0, satMin: 0,
  })
  return full.slice(0, 10)  // drop the 11th ('950') stop; state packs are 10 wide
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

export function linearized(rgbComponent) {
  const n = rgbComponent / 255
  return (n <= 0.040449936 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)) * 100
}
export function delinearized(rgbComponent) {
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

// Deterministic Auto system for an explicitly chosen seed colour: the pick IS
// PRIMARY (kept verbatim), the other four roles are M3 tone roles derived from
// its hue/chroma. autoTonalPalette stays the exploratory engine for Randomise —
// this one must return the same palette for the same seed every time, so
// choosing a custom colour behaves predictably instead of re-rolling.
export function autoTonalFromSeed(hex) {
  let h, c
  try { const hct = hexToHct(hex); h = hct[0]; c = hct[1] }
  catch { const [hh, ss] = hexToHsl(hex); h = hh; c = ss * 0.6 }
  const chroma = Math.max(10, Math.min(64, c))
  const sibling = (h + 30) % 360
  const safe = (hue, ch, tone, fallback) => {
    try { return hctToHex(hue, ch, tone) } catch { return fallback }
  }
  return [
    hex,                                                       // PRIMARY — the exact pick
    safe(sibling, chroma * 0.92, 60, hslToHex(sibling, 40, 60)), // SECONDARY (sibling hue)
    safe(h, Math.min(100, chroma + 14), 70, hslToHex(h, 55, 70)), // ACCENT
    safe(h, 8, 90, hslToHex(h, 12, 90)),                       // SUBTLE
    safe(h, chroma * 0.7, 20, hslToHex(h, 35, 20)),            // DEEP
  ]
}

// randomSystemPalette(system) — Randomise, run through the SELECTED colour
// system. This is the single place the "which engine does a shuffle use?"
// decision is made, and it is deliberately not clever: only the tonal 'auto'
// system uses the tonal engine; EVERY named harmony (monochromatic included)
// goes through generateHarmony, which is what keeps a mono shuffle on one hue.
//
// The seed lands in confident brand territory rather than muddy mid-tones:
// high chroma (48–92 — the HCT solver gamut-clamps per hue, so pale hues like
// yellow settle lower on their own) at tone 46–60, the band where a primary
// reads well on both light and dark surfaces. Throws if the HCT solver fails,
// so the caller can fall back.
export function randomSystemPalette(system) {
  if (system === 'auto') return autoTonalPalette()
  const seedHex = hctToHex(Math.random() * 360, 48 + Math.random() * 44, 46 + Math.random() * 14)
  return generateHarmony(seedHex, system)
}

// Warm / cool anchors for the temperature lens, and the fraction of the way a
// colour travels toward one at full slider travel.
export const TEMP_WARM_HUE = 30
export const TEMP_COOL_HUE = 210
const TEMP_MAX_PULL = 0.5
const DEG = Math.PI / 180

// ─────────────────────────────────────────────────────────────────────────
// maxChromaFor(hue, tone) — the highest HCT chroma sRGB can actually display
// at a given hue/tone: the live gamut boundary, not a value we merely assume.
//
// Read straight off the renderer instead of searched for. solveToHex (inside
// hctToHex) ALREADY walks an out-of-gamut request down to the most chromatic
// colour it can actually produce at that hue/tone, so asking it for an
// impossible chroma and reading the answer back through hexToHct returns the
// boundary by construction — and returns it as a colour that genuinely
// renders, which a search over the same solver cannot guarantee.
//
// This replaces a 14-step binary search that called hexToHct(hctToHex(...))
// — two CAM16 conversions — on EVERY step: ~28 conversions per call against
// the 2 here. That mattered because the Hue and Temperature sliders both move
// `h` on every frame of a drag, so with Saturation raised every colour missed
// the (hue, tone) memo on every frame: measured 0.438 ms per frame for a
// 10-colour board, now 0.037 ms (≈12x). The old search also accepted a
// candidate whose round trip came back up to 0.75 lower than asked, so it
// could sit slightly OUTSIDE the gamut (mean +1.0, worst +5.0 chroma against
// the renderable boundary); the value here is renderable by definition.
//
// Still memoised: a Saturation drag holds hue/tone still and only moves adj.s,
// so the same key repeats on every frame and the cache makes those frames free.
const CHROMA_CACHE = new Map()
const MAX_CHROMA_CEILING = 200 // far outside sRGB at every hue/tone — solveToHex walks it down to the boundary
const MAX_CHROMA_CACHE_LIMIT = 2000 // defensive: forget the oldest entries rather than grow unbounded
export function maxChromaFor(hue, tone) {
  const key = Math.round(hue * 100) + '|' + Math.round(tone * 100)
  const cached = CHROMA_CACHE.get(key)
  if (cached !== undefined) return cached
  let boundary
  try { boundary = hexToHct(hctToHex(hue, MAX_CHROMA_CEILING, tone))[1] } catch { boundary = 0 }
  if (!Number.isFinite(boundary) || boundary < 0) boundary = 0
  if (CHROMA_CACHE.size >= MAX_CHROMA_CACHE_LIMIT) CHROMA_CACHE.delete(CHROMA_CACHE.keys().next().value)
  CHROMA_CACHE.set(key, boundary)
  return boundary
}

// Non-destructive global adjust lens. Hue rotate / chroma scale / tone shift /
// temperature bias over a base palette -> new array. Identity (returns input)
// when every field is 0, so exports stay untouched until a slider moves.
//
// NOTE FOR CALLERS: this is a pure derivation, base -> displayed. Persist the
// BASE colours and the slider values; persisting the RESULT plus the sliders
// means the next load re-applies the lens to an already-adjusted palette and
// the adjustment compounds on every save/reload cycle.
export function applyAdjust(baseColors, adj) {
  if (!adj || (adj.h === 0 && adj.s === 0 && adj.b === 0 && adj.temp === 0)) return baseColors
  return baseColors.map(hex => {
    try {
      // NEUTRAL-HUE POLICY: hue is degenerate for a true achromatic colour
      // (chroma 0 has no meaningful direction), yet the Saturation slider must
      // still tint a pure grey somewhere, and that somewhere must be the SAME
      // hue every time the same grey is fed in — otherwise re-opening a
      // project or reordering colours in a palette would make a grey drift to
      // a different tint on a whim. We deliberately do NOT special-case it:
      // hexToHct's CAM16 solve is a pure function of the input hex, so even
      // for a chroma-~0 grey it returns a hue that is already fully
      // deterministic and stable (verified empirically — every grey from
      // #101010 to #f0f0f0 lands within 0.01° of 209.49° under this specific
      // CAM16 implementation). That value is what we use; no override needed.
      let [h, c, t] = hexToHct(hex)
      h = (((h + adj.h) % 360) + 360) % 360
      // Temperature pulls each colour toward a warm (30°) or cool (210°) anchor.
      // Done as a vector blend in the hue plane, NOT as a shortest-arc hue
      // rotation: with a raw arc, two hues either side of the anchor's opposite
      // resolve to OPPOSITE directions, so a palette of near-identical blues
      // would split — one heading green, its neighbour purple — on a single
      // nudge of the "warmer" slider, and at exactly ±180° the direction is
      // arbitrary. Blending the (a,b) vectors is continuous everywhere: a colour
      // near the anchor's opposite loses chroma and passes through neutral on
      // its way round, exactly like a photographic warming filter. Away from
      // that opposite the resulting hue matches the arc form, so the slider's
      // everyday behaviour is unchanged.
      if (adj.temp !== 0) {
        const anchor = (adj.temp > 0 ? TEMP_WARM_HUE : TEMP_COOL_HUE) * DEG
        const pull = (Math.abs(adj.temp) / 100) * TEMP_MAX_PULL
        const rad = h * DEG
        const a = c * (Math.cos(rad) * (1 - pull) + Math.cos(anchor) * pull)
        const b = c * (Math.sin(rad) * (1 - pull) + Math.sin(anchor) * pull)
        h = (((Math.atan2(b, a) / DEG) % 360) + 360) % 360
        c = Math.hypot(a, b)
      }
      // adj.b is the "Tone" slider (±100). Halved → ±50 tone steps so full travel
      // shifts half the 0–100 tone range, not the whole thing (prevents total
      // black/white washes at the extremes).
      //
      // RESOLVED BEFORE THE CHROMA STEP, deliberately: the sRGB gamut boundary
      // is a function of BOTH hue and tone, and the colour is going to be
      // rendered at the SHIFTED tone. Gamut-mapping against the boundary at the
      // pre-shift tone (which is what this used to do) aimed the Saturation
      // slider at a target that does not exist where the colour actually lands
      // — so lifting Saturation and Tone together landed outside the gamut and
      // hctToHex silently clamped it back down, i.e. the top of the Saturation
      // slider went dead exactly when Tone was also raised.
      t = Math.max(0, Math.min(100, t + adj.b / 2))
      // Saturation lens: interpolate, don't scale. `c * (1 + adj.s / 100)` is
      // purely multiplicative, which breaks two ways — a neutral (chroma 0,
      // e.g. any pure grey) can never gain colour (0 × anything is still 0),
      // and an already-vivid colour silently hits hctToHex's internal gamut
      // clamp partway up the slider, so the whole top half does nothing
      // visible. Interpolating toward an explicit target fixes both: rising
      // (adj.s > 0) walks from the current chroma toward maxChromaFor(h, t) —
      // the actual sRGB gamut boundary at this hue/tone, gamut-mapped
      // ourselves rather than left for hctToHex to clamp — so +100 lands AT
      // that boundary for every colour, neutral or already-vivid alike.
      // Falling (adj.s < 0) walks toward 0, so -100 is always fully neutral.
      // At adj.s === 0 the interpolation factor is exactly 0 either way, so c
      // is untouched — the slider-at-rest identity holds exactly, including
      // when h/temp/tone are moving under it.
      if (adj.s > 0) {
        const target = maxChromaFor(h, t)
        c = c + (target - c) * (adj.s / 100)
      } else if (adj.s < 0) {
        c = c * (1 + adj.s / 100) // already a straight-line interpolation toward 0
      }
      c = Math.max(0, c)
      return hctToHex(h, c, t)
    } catch {
      let [h, s, l] = hexToHsl(hex)
      h = (((h + adj.h) % 360) + 360) % 360
      // Same interpolation fix as the HCT path above, mapped onto HSL's own
      // 0–100 saturation range (its natural, always-representable "gamut
      // boundary" is simply 100): rising walks toward 100, falling walks
      // toward 0, and adj.s === 0 leaves s untouched either way.
      if (adj.s > 0) {
        s = s + (100 - s) * (adj.s / 100)
      } else if (adj.s < 0) {
        s = s * (1 + adj.s / 100)
      }
      s = Math.max(0, Math.min(100, s))
      l = Math.max(0, Math.min(100, l + adj.b / 2))
      return hslToHex(h, s, l)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────
// adjustTrackGradients(baseColors) — the coloured backgrounds for the four
// global-adjust sliders, so each track PREVIEWS what its own slider does to
// this palette instead of being a decorative rainbow.
//
// Every stop is produced by running the palette's most vivid colour through
// applyAdjust itself, at the slider value that stop sits at. The track
// therefore cannot drift from the slider's real behaviour: change applyAdjust
// and the gradients change with it, by construction.
//
// The most vivid colour (highest HCT chroma) is the honest reference — it is
// the one with the most headroom to show, and a near-neutral palette member
// would render four near-identical grey tracks. Recompute only when the BASE
// palette changes: the gradients are deliberately independent of the live
// slider values so a drag never rebuilds them.
export const ADJUST_TRACK_STOPS = 9   // enough to read the curve, cheap enough to build in one go

function mostVividHex(baseColors) {
  const list = (Array.isArray(baseColors) ? baseColors : [])
    .filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
  if (!list.length) return null
  let best = list[0], bestChroma = -1
  for (const hex of list) {
    let c
    try { c = hexToHct(hex)[1] } catch { c = hexToHsl(hex)[1] * 0.6 }
    if (Number.isFinite(c) && c > bestChroma) { bestChroma = c; best = hex }
  }
  return best
}

// The slider range each track spans. These MUST match PaletteBuilder's
// ADJUST_FIELDS min/max — the track is a picture of the slider, so a mismatch
// would put the gradient and the handle on different scales.
export const ADJUST_TRACK_RANGES = {
  h: [-180, 180],       // the hue sweep, as this palette travels it
  s: [-100, 100],       // fully neutral → the gamut boundary at this hue/tone
  b: [-100, 100],       // dark → light
  temp: [-100, 100],    // the 210° cool anchor → neutral → the 30° warm anchor
}

// adjustTrackStops(baseColors) — the raw material both the painted track AND
// the slider handle's centre are built from. Keeping ONE stop list means the
// dot can never disagree with the bar it sits on: they are literally the same
// nine colours, read two different ways.
export function adjustTrackStops(baseColors) {
  const rep = mostVividHex(baseColors)
  if (!rep) return null
  const out = {}
  for (const key of Object.keys(ADJUST_TRACK_RANGES)) {
    const [min, max] = ADJUST_TRACK_RANGES[key]
    const stops = []
    for (let i = 0; i < ADJUST_TRACK_STOPS; i++) {
      const pos = i / (ADJUST_TRACK_STOPS - 1)
      const adj = { h: 0, s: 0, b: 0, temp: 0, [key]: min + (max - min) * pos }
      let hex = rep
      try { hex = applyAdjust([rep], adj)[0] || rep } catch { hex = rep }
      stops.push({ hex, pos })
    }
    out[key] = { min, max, stops }
  }
  return out
}

// The painted CSS for a stop set. Split out so a caller that already holds the
// stops (to sample handle colours from them) never rebuilds them just to get
// the gradient — the two views stay guaranteed-identical because they are one
// list read twice.
export function adjustTrackGradientsFromStops(tracks) {
  if (!tracks) return null
  const out = {}
  for (const key of Object.keys(tracks)) {
    const stops = tracks[key].stops.map(s => `${s.hex} ${(s.pos * 100).toFixed(2)}%`)
    out[key] = `linear-gradient(90deg,${stops.join(',')})`
  }
  return out
}

export function adjustTrackGradients(baseColors) {
  return adjustTrackGradientsFromStops(adjustTrackStops(baseColors))
}

// sampleAdjustTrack(track, value) — the exact colour the painted track shows at
// `value`. A CSS linear-gradient interpolates in sRGB between the two stops
// that bracket a point, so this does precisely that (mixHex is an sRGB lerp).
// That is what lets the slider handle be a LENS onto the bar rather than a
// second, independently-computed opinion about it.
export function sampleAdjustTrack(track, value) {
  const stops = track?.stops
  if (!Array.isArray(stops) || !stops.length) return null
  const span = track.max - track.min
  const n = Number(value)
  const t = span > 0
    ? Math.min(1, Math.max(0, ((Number.isFinite(n) ? n : 0) - track.min) / span))
    : 0
  for (let i = 1; i < stops.length; i++) {
    const lo = stops[i - 1], hi = stops[i]
    if (t <= hi.pos) {
      const gap = hi.pos - lo.pos
      const local = gap > 0 ? (t - lo.pos) / gap : 0
      return mixHex(lo.hex, hi.hex, local).toUpperCase()
    }
  }
  return stops[stops.length - 1].hex.toUpperCase()
}

// The four handle colours for a live lens — one sample per track, so every
// slider dot reads the colour its own position represents.
export function adjustHandleColors(tracks, adj) {
  if (!tracks) return null
  const out = {}
  for (const key of Object.keys(tracks)) {
    out[key] = sampleAdjustTrack(tracks[key], adj?.[key] ?? 0)
  }
  return out
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

// Machado, Oliveira & Fernandes (2009) — severity 1.0 dichromat matrices,
// applied in linear sRGB. Source: the canonical published severity table
// (DaltonLens / colorspace R `simulate_cvd`). Achromatopsia is handled
// separately via Rec.709 luma. Rows are row-major [r;g;b].
const MACHADO_2009 = {
  protanopia: [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281, 0.099216,
    -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968,
    0.280085, 0.672501, 0.047413,
    -0.011820, 0.042940, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779,
    -0.078411, 0.930809, 0.147602,
    0.004733, 0.691367, 0.303900,
  ],
}

// simCvd(hex, type) — simulate colour-vision deficiency in linear sRGB.
// type: 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'.
// Never throws; returns the input hex unchanged on bad/unknown input.
export function simCvd(hex, type) {
  try {
    if (!type || type === 'normal') return hex
    const [r, g, b] = hexToRgb(hex)
    // hexToRgb yields NaN (not a throw) on malformed input, so the try/catch won't
    // fire — guard explicitly to honour the "returns input hex unchanged" contract.
    if (![r, g, b].every(Number.isFinite)) return hex
    const lr = linearized(r) / 100, lg = linearized(g) / 100, lb = linearized(b) / 100
    let nr, ng, nb
    if (type === 'achromatopsia') {
      const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
      nr = ng = nb = y
    } else {
      const m = MACHADO_2009[type]
      if (!m) return hex
      nr = m[0] * lr + m[1] * lg + m[2] * lb
      ng = m[3] * lr + m[4] * lg + m[5] * lb
      nb = m[6] * lr + m[7] * lg + m[8] * lb
    }
    const enc = (v) => delinearized(Math.max(0, Math.min(1, v)) * 100).toString(16).padStart(2, '0')
    return '#' + enc(nr) + enc(ng) + enc(nb)
  } catch { return hex }
}

// ─────────────────────────────────────────────────────────────────────────
// derivePreviewRoles — the Colour Studio "See it shipped" Previews engine.
// (Slice 4 §5.) Maps the live palette to ONE deterministic, total semantic-role
// object via luminance-sort + chroma-rank, with a WCAG-AA safety net so every
// scene stays legible for ANY palette (length 0/1/many, all-light/dark/grey).
// Pure: uses only existing exports above (luminance, contrastRatio, mixHex,
// textColorForBg, fixForeground, hexToHsl, hexToHct). Never throws.
//
// Returns the eight roles for the scene's declared mode:
//   { bg, surface, primary, onPrimary, accent, text, muted, border, lowChroma }
// `mode`: 'dark' (hero) | 'light' (app/mobile/article).
// `lowChroma` flags the all-grey fallback so the legend can hint the user.
// ─────────────────────────────────────────────────────────────────────────

const PV_BRAND = '#3B82F6'        // --brand fallback focal colour (empty/all-grey)
const PV_BRAND_SOFT = '#60A5FA'   // accent fallback partner
const PV_NEAR_BLACK = '#0A0B0D'
const PV_NEAR_WHITE = '#F2F3F5'
const PV_CHROMA_MIN = 8           // HCT chroma below this reads as "grey"

function pvLum(hex) {
  const [r, g, b] = hexToRgb(hex)
  return luminance(r, g, b)
}

// Perceptual chroma rank — HCT chroma when available, HSL saturation as a
// resilient fallback. Higher = more vivid. Never throws.
function pvChroma(hex) {
  try {
    const c = hexToHct(hex)[1]
    if (Number.isFinite(c)) return c
  } catch { /* fall through to HSL */ }
  const [, s] = hexToHsl(hex)
  return Number.isFinite(s) ? s * 0.6 : 0   // ~scale HSL sat into HCT-ish range
}

export function derivePreviewRoles(allColors, opts = {}) {
  const mode = opts.mode === 'dark' ? 'dark' : 'light'
  // Sanitise input: keep only well-formed #rrggbb strings (Murphy: ignore junk).
  const palette = (Array.isArray(allColors) ? allColors : [])
    .filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))

  // ── Empty palette → brand fallback set on app-neutral material (§10). ──
  if (palette.length === 0) {
    const bg = mode === 'dark' ? PV_NEAR_BLACK : PV_NEAR_WHITE
    const surface = mixHex(bg, mode === 'dark' ? '#FFFFFF' : '#000000', 0.06)
    const text = mode === 'dark' ? PV_NEAR_WHITE : PV_NEAR_BLACK
    // Brand blue on the light surface is CR 2.89 (<3:1), so the CTA/KPI numbers
    // need the same border safety net the full path uses (§5.2) — else the
    // large-text floor silently fails on the empty-palette light scenes.
    const primaryLowOnSurface = contrastRatio(PV_BRAND, surface) < 3
    const primaryBorder = primaryLowOnSurface ? mixHex(PV_BRAND, text, 0.35) : 'transparent'
    return {
      bg,
      surface,
      primary: PV_BRAND,
      onPrimary: textColorOnSolid(PV_BRAND),
      accent: PV_BRAND_SOFT,
      text,
      muted: mixHex(text, bg, 0.42),
      border: mixHex(text, bg, 0.86),
      primaryBorder,
      lowChroma: true,
    }
  }

  // ── 1. Luminance sort (ascending: darkest → lightest). ──
  const byLum = [...palette].sort((a, b) => pvLum(a) - pvLum(b))

  // ── 2. bg: darkest for dark mode, lightest for light mode. ──
  const bg = mode === 'dark' ? byLum[0] : byLum[byLum.length - 1]
  const opposite = mode === 'dark' ? '#FFFFFF' : '#000000'

  // ── 3. surface: one tonal step off bg toward the opposite end (Material:
  // surfaces are tonal, never a random palette colour). Dark mode lifts toward
  // white; light mode dips a hair toward black so the panel reads as *raised*. ──
  const surface = mixHex(bg, opposite, mode === 'dark' ? 0.10 : 0.05)

  // ── 4. primary: highest chroma that clears ≥3:1 on surface (visible CTA). ──
  const byChroma = [...palette].sort((a, b) => pvChroma(b) - pvChroma(a))
  const maxChroma = byChroma.length ? pvChroma(byChroma[0]) : 0
  const lowChroma = maxChroma < PV_CHROMA_MIN

  let primary = null
  if (!lowChroma) {
    primary = byChroma.find(c => contrastRatio(c, surface) >= 3) || byChroma[0]
  }
  // bg-clash guard: a single same-hue chromatic colour can make primary === bg
  // (e.g. ['#00FF41'] → button fill == canvas, invisible even with a border).
  // Reject it so the brand-blue fallback below gives a visible focal colour.
  if (primary && contrastRatio(primary, bg) < 1.5) primary = null
  if (!primary) primary = PV_BRAND   // all-grey / clash / no usable chroma → brand focal

  // ── 5. accent: next-highest chroma, hue-distinct from primary. ──
  let accent = null
  if (!lowChroma) {
    const pHue = safeHue(primary)
    accent = byChroma.find(c => c !== primary && hueDist(safeHue(c), pHue) > 12 && pvChroma(c) >= PV_CHROMA_MIN)
      || byChroma.find(c => c !== primary && pvChroma(c) >= PV_CHROMA_MIN)
  }
  if (!accent) accent = lowChroma ? PV_BRAND_SOFT : mixHex(primary, PV_BRAND_SOFT, 0.5)

  // ── 6. text: contrast-derived (NEVER a swatch), gently warmed toward primary. ──
  let text = textColorOnSolid(bg)
  const warmed = mixHex(text, primary, 0.08)
  if (contrastRatio(warmed, bg) >= 7) text = warmed

  // ── 7. onPrimary: legible label on the CTA. ──
  let onPrimary = textColorOnSolid(primary)

  // ── 8. muted + border: derived from text↔bg, contrast-clamped. ──
  let muted = mixHex(text, bg, 0.45)
  const border = mixHex(text, bg, 0.86)

  // ── §5.2 AA safety net — validate + self-heal before any scene renders. ──
  if (contrastRatio(text, bg) < 7) {
    // body copy must clear AA-large; pick the winning pole.
    text = contrastRatio(PV_NEAR_WHITE, bg) >= contrastRatio(PV_NEAR_BLACK, bg) ? PV_NEAR_WHITE : PV_NEAR_BLACK
    muted = mixHex(text, bg, 0.45)
  }
  if (contrastRatio(muted, bg) < 4.5) muted = fixForeground(muted, bg, 4.5)
  if (contrastRatio(onPrimary, primary) < 4.5) onPrimary = fixForeground(onPrimary, primary, 4.5)
  // CTA invisible on its card → caller draws a 1px border; we expose primaryBorder.
  const primaryLowOnSurface = contrastRatio(primary, surface) < 3
  const primaryBorder = primaryLowOnSurface ? mixHex(primary, text, 0.35) : 'transparent'

  return { bg, surface, primary, onPrimary, accent, text, muted, border, primaryBorder, lowChroma }
}

// textColorForBg returns rgba() strings; for solid hex roles we want a hex pole
// so downstream mixHex/contrast maths stay in hex space. Pure, never throws.
function textColorOnSolid(hex) {
  let lum = 0
  try { lum = pvLum(hex) } catch { lum = 0 }
  return lum > 0.179 ? PV_NEAR_BLACK : PV_NEAR_WHITE
}
function safeHue(hex) {
  try { const h = hexToHsl(hex)[0]; return Number.isFinite(h) ? h : 0 } catch { return 0 }
}
function hueDist(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
