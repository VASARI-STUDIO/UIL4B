// Picking a palette from an image's pixels. Pure: it takes RGBA arrays and
// returns plain objects, so the whole thing runs (and is tested) without a
// browser.
//
// Pipeline
//   1. Collect the opaque pixels of a grid of at most MAX_SAMPLE_PIXELS and
//      convert them to OKLab, where straight-line distance is close to how
//      different two colours look. Pixels with alpha < 128 are not colours of
//      the image (a transparent logo has no black in it), so they are skipped.
//   2. Cluster with k-means. The seeds follow k-means++ with a farthest-point
//      rule, so a small vivid patch gets a seed of its own instead of being
//      absorbed by the large neutral area around it.
//   3. Merge clusters whose centres sit closer than MIN_DELTA.
//   4. Rank what is left by population plus a chroma bonus, discounted by how
//      close each candidate is to one already chosen. Population alone gives a
//      palette of grey-blues for a sunset; the bonus is what keeps the orange.
//   5. Give each cluster a representative pixel: a member of the cluster that
//      is close to its centre in colour and, as a tie-break, close to its
//      centre of mass in the picture. That is where a marker is placed.
// A seeded RNG makes the same image give the same answer every time.

export const MIN_DELTA = 0.04            // closest two palette colours may be, in OKLab
export const MAX_SAMPLE_PIXELS = 150000
export const OPAQUE_ALPHA = 128
export const MOODS = ['colourful', 'bright', 'muted', 'deep', 'dark']

const MIN_SHARE = 0.001                  // a cluster must hold this much of the image to be offered
const SPREAD_SCALE = 0.25                // distance from the chosen set at which a candidate is fully "distinct"
const HUE_WEIGHT = 4                     // a step in hue counts for more than a step in lightness when judging spread
const REP_SPATIAL_WEIGHT = 0.08          // how much picture position counts against colour when placing a marker
const DEFAULT_SEED = 0x9e3779b1

// ── Colour maths ─────────────────────────────────────────────────────────────

const LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function rgbToOklab(r, g, b) {
  const lr = LINEAR[r & 255], lg = LINEAR[g & 255], lb = LINEAR[b & 255]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

const toSrgb8 = (v) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, Math.round(c * 255)))
}

export function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    toSrgb8(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb8(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb8(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ]
}

export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

export const hexToOklab = (hex) => rgbToOklab(...hexToRgb(hex))

// Distance between two hex colours in OKLab. 0.04 is a clear but small step.
export function colourDistance(hexA, hexB) {
  const [l1, a1, b1] = hexToOklab(hexA)
  const [l2, a2, b2] = hexToOklab(hexB)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

// ── Seeded random numbers ────────────────────────────────────────────────────

export function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// ── Pixel collection ─────────────────────────────────────────────────────────

// The opaque pixels of `image` ({ data, width, height }) as parallel OKLab and
// position arrays. A grid larger than MAX_SAMPLE_PIXELS is read on a stride.
function collect(image) {
  const { data, width, height } = image
  if (!data || !(width > 0) || !(height > 0)) return { n: 0, total: 0, width: 0, height: 0 }
  const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / MAX_SAMPLE_PIXELS)))
  const cap = Math.ceil(width / step) * Math.ceil(height / step)
  const L = new Float32Array(cap), A = new Float32Array(cap), B = new Float32Array(cap)
  const X = new Uint16Array(cap), Y = new Uint16Array(cap)
  let n = 0
  let total = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      total++
      const i = (y * width + x) * 4
      if (data[i + 3] < OPAQUE_ALPHA) continue
      const [l, a, b] = rgbToOklab(data[i], data[i + 1], data[i + 2])
      L[n] = l; A[n] = a; B[n] = b; X[n] = x; Y[n] = y
      n++
    }
  }
  return { n, total, width, height, L, A, B, X, Y }
}

// ── k-means ──────────────────────────────────────────────────────────────────

// k-means++ where each new seed is the farthest of a few distance-weighted
// draws. Drawing by distance spreads the seeds; taking the farthest of three
// stops a lucky near draw from wasting one.
function seedCentres(px, k, rng) {
  const { n, L, A, B } = px
  const minD = new Float32Array(n).fill(Infinity)
  const picked = []
  const take = (idx) => {
    picked.push(idx)
    const l = L[idx], a = A[idx], b = B[idx]
    for (let i = 0; i < n; i++) {
      const d = (L[i] - l) ** 2 + (A[i] - a) ** 2 + (B[i] - b) ** 2
      if (d < minD[i]) minD[i] = d
    }
  }
  take(Math.floor(rng() * n))
  while (picked.length < k) {
    let total = 0
    for (let i = 0; i < n; i++) total += minD[i]
    if (total < 1e-9) break                  // every pixel is already on a seed
    let best = -1
    let bestD = -1
    for (let t = 0; t < 3; t++) {
      let r = rng() * total
      let idx = n - 1
      for (let i = 0; i < n; i++) {
        r -= minD[i]
        if (r <= 0) { idx = i; break }
      }
      if (minD[idx] > bestD) { bestD = minD[idx]; best = idx }
    }
    take(best)
  }
  return picked
}

function kMeans(px, k, rng) {
  const { n, L, A, B } = px
  const seeds = seedCentres(px, Math.min(k, n), rng)
  const kk = seeds.length
  const cen = new Float64Array(kk * 3)
  seeds.forEach((idx, c) => { cen[c * 3] = L[idx]; cen[c * 3 + 1] = A[idx]; cen[c * 3 + 2] = B[idx] })
  const assign = new Uint8Array(n)
  for (let iter = 0; iter < 14; iter++) {
    const sum = new Float64Array(kk * 3)
    const cnt = new Float64Array(kk)
    let changed = 0
    for (let i = 0; i < n; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < kk; c++) {
        const d = (L[i] - cen[c * 3]) ** 2 + (A[i] - cen[c * 3 + 1]) ** 2 + (B[i] - cen[c * 3 + 2]) ** 2
        if (d < bestD) { bestD = d; best = c }
      }
      if (assign[i] !== best || iter === 0) changed++
      assign[i] = best
      sum[best * 3] += L[i]; sum[best * 3 + 1] += A[i]; sum[best * 3 + 2] += B[i]
      cnt[best]++
    }
    for (let c = 0; c < kk; c++) {
      if (!cnt[c]) continue
      cen[c * 3] = sum[c * 3] / cnt[c]; cen[c * 3 + 1] = sum[c * 3 + 1] / cnt[c]; cen[c * 3 + 2] = sum[c * 3 + 2] / cnt[c]
    }
    if (iter > 0 && changed <= n * 0.0005) break
  }
  return { assign, kk }
}

// ── Clusters ─────────────────────────────────────────────────────────────────

// Cluster the image once. The result feeds `rankClusters`, which can be run
// again with a different mood without clustering again.
//   status  'ok' | 'flat' (one colour) | 'transparent' (nothing opaque) | 'empty'
//   clusters  [{ hex, L, a, b, chroma, share, x, y, px, py }]  (x, y are 0-1)
export function clusterImage(image, { count = 8, seed = DEFAULT_SEED } = {}) {
  const px = collect(image)
  if (!px.total) return { status: 'empty', clusters: [], opaque: 0 }
  const opaque = px.n / px.total
  if (!px.n || opaque < 0.005) return { status: 'transparent', clusters: [], opaque }

  const k = Math.min(28, Math.max(12, count * 3 + 4))
  const { assign, kk } = kMeans(px, k, mulberry32(seed))

  // Per-cluster totals, then merge any pair that sits closer than MIN_DELTA.
  const raw = Array.from({ length: kk }, () => ({ n: 0, l: 0, a: 0, b: 0, sx: 0, sy: 0 }))
  for (let i = 0; i < px.n; i++) {
    const c = raw[assign[i]]
    c.n++; c.l += px.L[i]; c.a += px.A[i]; c.b += px.B[i]; c.sx += px.X[i]; c.sy += px.Y[i]
  }
  let groups = raw
    .map((c, id) => ({ ...c, ids: [id] }))
    .filter((c) => c.n > 0)
  const centre = (g) => [g.l / g.n, g.a / g.n, g.b / g.n]
  for (;;) {
    let bi = -1, bj = -1, bd = MIN_DELTA
    for (let i = 0; i < groups.length; i++) {
      const ci = centre(groups[i])
      for (let j = i + 1; j < groups.length; j++) {
        const cj = centre(groups[j])
        const d = Math.hypot(ci[0] - cj[0], ci[1] - cj[1], ci[2] - cj[2])
        if (d < bd) { bd = d; bi = i; bj = j }
      }
    }
    if (bi < 0) break
    const a = groups[bi], b = groups[bj]
    groups[bi] = {
      n: a.n + b.n, l: a.l + b.l, a: a.a + b.a, b: a.b + b.b, sx: a.sx + b.sx, sy: a.sy + b.sy,
      ids: [...a.ids, ...b.ids],
    }
    groups.splice(bj, 1)
  }

  // Cluster id -> merged group, then one pass to find each group's representative.
  const groupOf = new Int16Array(kk).fill(-1)
  groups.forEach((g, gi) => g.ids.forEach((id) => { groupOf[id] = gi }))
  const centres = groups.map(centre)
  const spatial = groups.map((g) => [g.sx / g.n, g.sy / g.n])
  const diag = Math.hypot(px.width, px.height) || 1
  const bestScore = new Float64Array(groups.length).fill(Infinity)
  const bestPx = new Int32Array(groups.length).fill(-1)
  for (let i = 0; i < px.n; i++) {
    const gi = groupOf[assign[i]]
    const [cl, ca, cb] = centres[gi]
    const colourD = Math.hypot(px.L[i] - cl, px.A[i] - ca, px.B[i] - cb)
    const spaceD = Math.hypot(px.X[i] - spatial[gi][0], px.Y[i] - spatial[gi][1]) / diag
    const score = colourD + REP_SPATIAL_WEIGHT * spaceD
    if (score < bestScore[gi]) { bestScore[gi] = score; bestPx[gi] = i }
  }

  const clusters = groups.map((g, gi) => {
    const [l, a, b] = centres[gi]
    const rep = bestPx[gi]
    return {
      hex: rgbToHex(...oklabToRgb(l, a, b)),
      L: l, a, b,
      chroma: Math.hypot(a, b),
      share: g.n / px.n,
      pixels: g.n,
      px: px.X[rep], py: px.Y[rep],
      x: (px.X[rep] + 0.5) / px.width,
      y: (px.Y[rep] + 0.5) / px.height,
    }
  })
  const minPixels = Math.max(1, Math.ceil(MIN_SHARE * px.n))
  const offered = clusters.filter((c) => c.pixels >= minPixels)
  const kept = offered.length ? offered : [clusters.reduce((m, c) => (c.pixels > m.pixels ? c : m))]
  return { status: kept.length < 2 ? 'flat' : 'ok', clusters: kept, opaque }
}

// ── Ranking ──────────────────────────────────────────────────────────────────

// What a mood prefers, as a multiplier on a cluster's score. `auto` (no mood)
// is a plain chroma bonus so small vivid accents survive.
function moodFactor(mood, L, C) {
  switch (mood) {
    case 'colourful': return 0.2 + 14 * C
    case 'bright': return 0.15 + 1.7 * L * L + 2 * C
    case 'muted': return 1 / (1 + 14 * C) + 0.05
    case 'deep': return Math.max(0.05, 1.25 - L) * (0.4 + 8 * C)
    case 'dark': return 0.1 + 1.8 * (1 - L) ** 2
    default: return 1 + 7 * C
  }
}

const sqDist = (a, b) => (a.L - b.L) ** 2 + HUE_WEIGHT * ((a.a - b.a) ** 2 + (a.b - b.b) ** 2)

// Choose up to `limit` clusters best-first. Each pick is discounted by how near
// it is to the colours already chosen, so the list reads as a spread, not as
// five shades of the same grey. Because the discount only looks backwards, the
// first N of a longer list are exactly what a request for N would return, which
// is what lets "+" offer the next one without disturbing the rest.
export function rankClusters(clusters, { mood, limit = 12 } = {}) {
  const pool = clusters.map((c) => ({ ...c, base: c.share ** 0.55 * moodFactor(mood, c.L, c.chroma) }))
  const chosen = []
  while (chosen.length < limit && pool.length) {
    let bi = 0
    let bs = -1
    pool.forEach((c, i) => {
      let near = Infinity
      for (const p of chosen) near = Math.min(near, Math.sqrt(sqDist(c, p)))
      const spread = chosen.length ? Math.min(1, near / SPREAD_SCALE) ** 2 : 1
      const s = c.base * spread
      if (s > bs) { bs = s; bi = i }
    })
    const [pick] = pool.splice(bi, 1)
    chosen.push({ ...pick, rank: chosen.length })
  }
  return chosen
}

// The first `n` ranked candidates, most dominant (largest share) first.
export function pickPalette(ranked, n) {
  return ranked.slice(0, n).sort((a, b) => b.share - a.share || a.rank - b.rank)
}

// The best-ranked candidate that is not already represented in `hexes`.
export function nextCandidate(ranked, hexes) {
  return ranked.find((c) => hexes.every((h) => colourDistance(c.hex, h) >= MIN_DELTA)) || null
}

// One call for the common case.
export function extractPalette(image, count, { mood, seed } = {}) {
  const { status, clusters, opaque } = clusterImage(image, { count, seed })
  const ranked = rankClusters(clusters, { mood })
  return { status, opaque, ranked, colours: pickPalette(ranked, count) }
}

// How much of the image each of `hexes` is the nearest colour to (fractions
// that add to 1). This is a marker's dominance once the person has moved it
// off the spot the extractor chose.
export function colourShares(image, hexes) {
  const px = collect(image)
  const labs = hexes.map(hexToOklab)
  const counts = new Array(hexes.length).fill(0)
  if (!px.n || !labs.length) return counts
  for (let i = 0; i < px.n; i++) {
    let best = 0
    let bestD = Infinity
    for (let c = 0; c < labs.length; c++) {
      const d = (px.L[i] - labs[c][0]) ** 2 + (px.A[i] - labs[c][1]) ** 2 + (px.B[i] - labs[c][2]) ** 2
      if (d < bestD) { bestD = d; best = c }
    }
    counts[best]++
  }
  return counts.map((c) => c / px.n)
}

// ── Sampling ─────────────────────────────────────────────────────────────────

// Mean colour of the (2r+1) square around (cx, cy) in a block of RGBA data,
// ignoring transparent pixels. Null when nothing there is opaque. A marker reads
// this rather than one pixel, so grain and anti-aliasing do not decide its colour.
export function averageHex(data, width, height, cx, cy, radius = 2) {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] < OPAQUE_ALPHA) continue
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
  }
  return n ? rgbToHex(r / n, g / n, b / n) : null
}
