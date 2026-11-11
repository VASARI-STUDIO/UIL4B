// The read-back attack on the palette preview picture (api/_lib/library/preview.js), for tests.
// The first renderer drew n equal blocks (n unknown to the viewer, so 2 to 12 are all tried), blurred them
// with a wrap-around Gaussian of sigma 30 and pulled every column 35% toward the mean. All of that is
// public and linear, so each column is a known weighted sum of the n stop colours, and least squares over
// the 320 columns solves for the stops, one channel at a time. oldBlurRow keeps that renderer as it was, so
// the attack has something it can break; the current renderer must resist the same fit.
import { PREVIEW_WIDTH } from '../../api/_lib/library/preview.js'
import { hexRgb } from './png.js'

const OLD_SIGMA = 30
const OLD_MIX = 0.35

/** The first renderer, kept here as it was so the fit has something it can break. */
export function oldBlurRow(colors, width = PREVIEW_WIDTH) {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const rgb = colors.map(hex)
  const hard = new Float64Array(width * 3)
  for (let x = 0; x < width; x++) hard.set(rgb[Math.min(rgb.length - 1, Math.floor((x * rgb.length) / width))], x * 3)
  const radius = OLD_SIGMA * 3
  const kernel = []
  let sum = 0
  for (let k = -radius; k <= radius; k++) { kernel.push(Math.exp(-(k * k) / (2 * OLD_SIGMA * OLD_SIGMA))); sum += kernel.at(-1) }
  const mean = [0, 1, 2].map((c) => { let m = 0; for (let x = 0; x < width; x++) m += hard[x * 3 + c] / width; return m })
  const soft = new Float64Array(width * 3)
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 3; c++) {
      let v = 0
      for (let k = -radius; k <= radius; k++) v += hard[((((x + k) % width) + width) % width) * 3 + c] * kernel[k + radius]
      soft[x * 3 + c] = (v / sum) * (1 - OLD_MIX) + mean[c] * OLD_MIX
    }
  }
  const to8 = (v) => Math.max(0, Math.min(255, Math.round(v)))
  const gap = (off) => {
    let best = Infinity
    for (let x = 0; x < width; x++) for (const s of rgb) best = Math.min(best, Math.max(...[0, 1, 2].map((c) => Math.abs(to8(soft[x * 3 + c] + off[c]) - s[c]))))
    return best
  }
  const offsets = [[0, 0, 0]]
  for (const m of [26, 40, 56]) for (const r of [-m, 0, m]) for (const g of [-m, 0, m]) for (const b of [-m, 0, m]) if (r || g || b) offsets.push([r, g, b])
  let chosen = offsets[0]
  let chosenGap = -1
  for (const off of offsets) {
    const g = gap(off)
    if (g > chosenGap) { chosen = off; chosenGap = g }
    if (g >= 25) { chosen = off; break }
  }
  return Uint8Array.from(soft, (v, i) => to8(v + chosen[i % 3]))
}

/** Row `x` of the model: how much of each of the n stops' colours column x holds. */
export function designMatrix(n, width = PREVIEW_WIDTH) {
  const radius = OLD_SIGMA * 3
  const kernel = []
  let sum = 0
  for (let k = -radius; k <= radius; k++) { kernel.push(Math.exp(-(k * k) / (2 * OLD_SIGMA * OLD_SIGMA))); sum += kernel.at(-1) }
  const block = (x) => Math.min(n - 1, Math.floor((x * n) / width))
  const share = Array.from({ length: n }, (_, j) => Array.from({ length: width }, (_, x) => (block(x) === j ? 1 : 0)).reduce((a, b) => a + b, 0) / width)
  return Array.from({ length: width }, (_, x) => {
    const w = new Array(n).fill(0)
    for (let k = -radius; k <= radius; k++) w[block((((x + k) % width) + width) % width)] += kernel[k + radius] / sum
    return w.map((v, j) => v * (1 - OLD_MIX) + share[j] * OLD_MIX)
  })
}

/** Solve (AtA + ridge) c = At y by Gaussian elimination with partial pivoting. */
export function leastSquares(A, y) {
  const n = A[0].length
  const M = Array.from({ length: n }, (_, i) => {
    const r = Array.from({ length: n }, (_, j) => A.reduce((s, a) => s + a[i] * a[j], 0))
    r[i] += 1e-9
    r.push(A.reduce((s, a, x) => s + a[i] * y[x], 0))
    return r
  })
  for (let i = 0; i < n; i++) {
    let p = i
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r
    ;[M[i], M[p]] = [M[p], M[i]]
    for (let r = i + 1; r < n; r++) {
      const f = M[r][i] / M[i][i]
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]
    }
  }
  const c = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) c[i] = (M[i][n] - M[i].slice(i + 1, n).reduce((s, v, k) => s + v * c[i + 1 + k], 0)) / M[i][i]
  return c
}

/**
 * Fit n stops to the row. `stops` are the raw solution; `residual` is the largest column error, in levels, of
 * the picture the fit would draw against the picture given; `plausible` is whether every recovered channel is
 * a colour at all (within 2 levels of 0..255).
 */
export function fitStops(rowBytes, n) {
  const A = designMatrix(n)
  const channels = [0, 1, 2].map((k) => leastSquares(A, Array.from({ length: PREVIEW_WIDTH }, (_, x) => rowBytes[x * 3 + k])))
  const stops = Array.from({ length: n }, (_, j) => channels.map((ch) => ch[j]))
  let residual = 0
  for (let x = 0; x < PREVIEW_WIDTH; x++) {
    for (let k = 0; k < 3; k++) residual = Math.max(residual, Math.abs(A[x].reduce((s, w, j) => s + w * stops[j][k], 0) - rowBytes[x * 3 + k]))
  }
  const plausible = stops.every((c) => c.every((v) => v >= -2 && v <= 257))
  return { stops, residual, plausible }
}

const gapBetween = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])))

/** How near a fit's stops come to any true stop, in levels of one channel. */
export function nearestTrue(stops, truth) {
  return Math.min(...stops.flatMap((g) => truth.map((t) => gapBetween(t, g))))
}

/**
 * The attack, over every stop count from 2 to 12. A fit counts as a reading of the picture only if it
 * explains it (RESIDUAL_LIMIT level or less on every column: exact stops would leave only 8-bit rounding, half a level) and every
 * stop it recovers is a real colour. A fit that fails either is noise, and noise lands near a true stop
 * now and then by chance. Returns the smallest { gap, n } over the readings; gap is Infinity if none.
 */
export const RESIDUAL_LIMIT = 1
export function bestRecovery(rowBytes, stopsHex) {
  const truth = stopsHex.map(hexRgb)
  let best = { gap: Infinity, n: 0 }
  for (let n = 2; n <= 12; n++) {
    const fit = fitStops(rowBytes, n)
    if (!fit.plausible || fit.residual > RESIDUAL_LIMIT) continue
    const gap = nearestTrue(fit.stops, truth)
    if (gap < best.gap) best = { gap, n }
  }
  return best
}
