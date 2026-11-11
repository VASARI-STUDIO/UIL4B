// Nearest named colour: find the closest entry of a colour system to a hex.
//
// Every system is stored as CIELAB under D50 (the ICC connection space, see
// src/data/nearest/index.js), and a match is the smallest CIEDE2000 difference
// ("dE") from the user's colour. The user's hex goes sRGB -> linear -> XYZ (D65)
// -> Bradford -> XYZ (D50) -> Lab.
//
// Pure functions, no DOM and no I/O, so another surface can call them. The row
// loader lives in nearestLoader.js and the data in src/data/nearest/.

// ---- colour maths ------------------------------------------------------------

const M_SRGB = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
]
const BRADFORD = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296],
]
// The D50 white the ICC uses. The D65 white is the XYZ of sRGB (1, 1, 1) taken
// from the matrix itself, so white maps to exactly (100, 0, 0).
export const WHITE_D50 = [0.9642, 1, 0.8249]

function mul(A, B) {
  return A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)))
}
function inv3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ]
}
function apply(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ]
}
// Bradford chromatic adaptation matrix from one white to another.
function adaptation(whiteFrom, whiteTo) {
  const a = apply(BRADFORD, whiteFrom)
  const b = apply(BRADFORD, whiteTo)
  const scale = [[b[0] / a[0], 0, 0], [0, b[1] / a[1], 0], [0, 0, b[2] / a[2]]]
  return mul(inv3(BRADFORD), mul(scale, BRADFORD))
}

const WHITE_D65 = apply(M_SRGB, [1, 1, 1])
const M_SRGB_INV = inv3(M_SRGB)
const D65_TO_D50 = adaptation(WHITE_D65, WHITE_D50)
const D50_TO_D65 = adaptation(WHITE_D50, WHITE_D65)
// sRGB -> XYZ (D50) and back, folded into one matrix each.
const SRGB_TO_XYZ50 = mul(D65_TO_D50, M_SRGB)
const XYZ50_TO_SRGB = mul(M_SRGB_INV, D50_TO_D65)

const EPS = 216 / 24389
const KAPPA = 24389 / 27
const labF = (t) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116)
const labFInv = (t) => (t * t * t > EPS ? t * t * t : (116 * t - 16) / KAPPA)
const toLinear = (u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))
const fromLinear = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055)

function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// '#RRGGBB' (or '#RGB') -> [L, a, b] under D50. Returns null for a malformed hex.
export function hexToLabD50(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const lin = rgb.map((v) => toLinear(v / 255))
  const [X, Y, Z] = apply(SRGB_TO_XYZ50, lin)
  const fx = labF(X / WHITE_D50[0])
  const fy = labF(Y / WHITE_D50[1])
  const fz = labF(Z / WHITE_D50[2])
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

// [L, a, b] under D50 -> linear sRGB, unclamped (a channel outside 0-1 is outside the gamut).
export function labD50ToLinearRgb(lab) {
  const fy = (lab[0] + 16) / 116
  const xyz = [
    WHITE_D50[0] * labFInv(fy + lab[1] / 500),
    WHITE_D50[1] * labFInv(fy),
    WHITE_D50[2] * labFInv(fy - lab[2] / 200),
  ]
  return apply(XYZ50_TO_SRGB, xyz)
}

// [L, a, b] under D50 -> '#RRGGBB', clamped to sRGB (the swatch the person sees).
export function labD50ToHex(lab) {
  const out = labD50ToLinearRgb(lab).map((u) => {
    const v = Math.round(Math.min(1, Math.max(0, fromLinear(Math.max(0, u)))) * 255)
    return v.toString(16).padStart(2, '0')
  })
  return ('#' + out.join('')).toUpperCase()
}

// CIEDE2000 between two [L, a, b] colours, as published (the 34 reference pairs
// in tests/unit/nearest-match.test.js pin it to 4 decimal places).
const POW25_7 = Math.pow(25, 7)
const RAD = Math.PI / 180
function hueDeg(b, ap) {
  if (b === 0 && ap === 0) return 0
  const h = Math.atan2(b, ap) / RAD
  return h < 0 ? h + 360 : h
}
export function deltaE2000(lab1, lab2) {
  const [L1, a1, b1] = lab1
  const [L2, a2, b2] = lab2
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar7 = Math.pow((C1 + C2) / 2, 7)
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const h1p = hueDeg(b1, a1p)
  const h2p = hueDeg(b2, a2p)

  const dLp = L2 - L1
  const dCp = C2p - C1p
  const chromaProduct = C1p * C2p
  let dhp = 0
  if (chromaProduct !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(chromaProduct) * Math.sin((dhp * RAD) / 2)

  const Lbp = (L1 + L2) / 2
  const Cbp = (C1p + C2p) / 2
  let hbp = h1p + h2p
  if (chromaProduct !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2
    else if (h1p + h2p < 360) hbp = (h1p + h2p + 360) / 2
    else hbp = (h1p + h2p - 360) / 2
  }
  const T = 1
    - 0.17 * Math.cos((hbp - 30) * RAD)
    + 0.24 * Math.cos(2 * hbp * RAD)
    + 0.32 * Math.cos((3 * hbp + 6) * RAD)
    - 0.20 * Math.cos((4 * hbp - 63) * RAD)
  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2))
  const Cbp7 = Math.pow(Cbp, 7)
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + POW25_7))
  const Lm = (Lbp - 50) * (Lbp - 50)
  const Sl = 1 + (0.015 * Lm) / Math.sqrt(20 + Lm)
  const Sc = 1 + 0.045 * Cbp
  const Sh = 1 + 0.015 * Cbp * T
  const Rt = -Math.sin(2 * dTheta * RAD) * Rc
  const lTerm = dLp / Sl
  const cTerm = dCp / Sc
  const hTerm = dHp / Sh
  return Math.sqrt(lTerm * lTerm + cTerm * cTerm + hTerm * hTerm + Rt * cTerm * hTerm)
}

// ---- closeness bands ---------------------------------------------------------

// Lower bound is inclusive. A colour is placed from the unrounded dE.
export const BANDS = [
  { id: 'very-close', min: 0, label: 'Very close' },
  { id: 'close', min: 2, label: 'Close' },
  { id: 'near', min: 5, label: 'Near' },
  { id: 'not-close', min: 10, label: 'Not close' },
]

export function band(dE) {
  for (let i = BANDS.length - 1; i > 0; i--) {
    if (dE >= BANDS[i].min) return BANDS[i].id
  }
  return BANDS[0].id
}

export function bandLabel(id) {
  return (BANDS.find((b) => b.id === id) || BANDS[BANDS.length - 1]).label
}

// One decimal place, for display only.
export function formatDE(dE) {
  return (Math.round(dE * 10) / 10).toFixed(1)
}

// ---- matching ----------------------------------------------------------------

// Rows are [name, code|null, copy|null, L, a, b]; a null copy means "the name".
export const ROW_NAME = 0
export const ROW_CODE = 1
export const ROW_COPY = 2

// Closest row to a colour (hex string, or a [L, a, b] D50 array). Ties go to the
// earlier row. Returns { row, index, dE } or null when there are no rows or the
// hex is malformed.
export function nearest(colour, rows) {
  const lab = typeof colour === 'string' ? hexToLabD50(colour) : colour
  if (!lab || !rows || !rows.length) return null
  let best = Infinity
  let bestIndex = -1
  const probe = [0, 0, 0]
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    probe[0] = r[3]
    probe[1] = r[4]
    probe[2] = r[5]
    const d = deltaE2000(lab, probe)
    if (d < best) {
      best = d
      bestIndex = i
    }
  }
  return { row: rows[bestIndex], index: bestIndex, dE: best }
}

// Everything the panel prints for one system: the match, its swatch hex, the
// text to copy, the closeness band and the difference.
export function matchSystem(colour, system) {
  const hit = nearest(colour, system && system.rows)
  if (!hit) return null
  const [name, code, copy] = hit.row
  return {
    name,
    code: code || null,
    copy: copy || name,
    hex: labD50ToHex([hit.row[3], hit.row[4], hit.row[5]]),
    dE: hit.dE,
    band: band(hit.dE),
  }
}
