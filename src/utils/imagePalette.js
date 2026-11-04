// Picking a palette from an image's pixels. Pure: it takes RGBA arrays and
// returns plain objects, so the whole thing runs (and is tested) without a
// browser.
//
// Pipeline
//   1. Collect the opaque pixels of a grid of at most MAX_SAMPLE_PIXELS and
//      convert them to OKLab, where straight-line distance is close to how
//      different two colours look. Pixels with alpha < 128 are not colours of
//      the image (a transparent logo has no black in it), so they are skipped.
//      Every other visible pixel counts, weighted by its alpha.
//   2. Cluster. Flat art (a logo, a diagram, pixel art) has a handful of exact
//      colours plus blends along the edges where they meet; those blends are not
//      colours of the image. When a few colour buckets, plus the blends between
//      them, account for nearly every pixel, those buckets are the clusters and
//      the blends are dropped. Anything else (a photo, grain, a gradient, a
//      screenshot with a photo in it) is clustered with k-means, whose seeds
//      follow k-means++
//      with a farthest-point rule, so a small vivid patch gets a seed of its own
//      instead of being absorbed by the large neutral area around it.
//   3. Merge clusters whose centres sit closer than MIN_DELTA.
//   4. Rank what is left by population plus a chroma bonus, discounted by how
//      close each candidate is to one already chosen. Population alone gives a
//      palette of grey-blues for a sunset; the bonus is what keeps the orange.
//   5. Give each cluster a representative pixel, which is where a marker is
//      placed. For flat art it is the middle of the cluster's biggest flat
//      region, so the marker stands on the colour and not on an edge. For a
//      photo it is a member of the cluster that is close to its centre in colour
//      and, as a tie-break, close to its centre of mass in the picture.
// A seeded RNG makes the same image give the same answer every time.

export const MIN_DELTA = 0.04            // closest two palette colours may be, in OKLab
export const MAX_SAMPLE_PIXELS = 150000
export const OPAQUE_ALPHA = 128
export const SOLID_ALPHA = 250           // at or above this a pixel counts as fully opaque
export const MIN_VISIBLE_SHARE = 0.005   // less visible than this and the image has no colours to offer
export const MOODS = ['colourful', 'bright', 'muted', 'deep', 'dark']

const MIN_SHARE = 0.001                  // a cluster must hold this much of the image to be offered
const SPREAD_SCALE = 0.25                // distance from the chosen set at which a candidate is fully "distinct"
const HUE_WEIGHT = 4                     // a step in hue counts for more than a step in lightness when judging spread
const REP_SPATIAL_WEIGHT = 0.08          // how much picture position counts against colour when placing a marker
const DEFAULT_SEED = 0x9e3779b1
const BUCKET_SHIFT = 3                   // flat-art buckets: 32 levels per channel
const FLAT_MAX_BUCKETS = 24              // more colour buckets than this is not flat art
const FLAT_TOLERANCE = 6                 // largest per-channel step between neighbours that still counts as one flat area
const FLAT_INTERIOR_MIN = 0.6            // share of pixels that must sit inside a flat area before edge blends are set aside
const FLAT_COVER_ALL = 0.97              // flat art: real colours plus the blends between them must account for this share of ALL visible pixels
const FLAT_MAX_POOL = 40                 // real colours plus candidate stragglers; more than this is not flat art
const BLEND_EPS = 10                     // RGB (0-255) distance within which a pixel counts as a colour, or a blend lying on the line between two

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

// How much of `image` can be seen: the share of its grid pixels with alpha of
// OPAQUE_ALPHA or more. Cheap (alpha only), so a caller can refuse an empty
// image before doing any real work.
export function visibleShare(image) {
  const { data, width, height } = image || {}
  if (!data || !(width > 0) || !(height > 0)) return 0
  const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / MAX_SAMPLE_PIXELS)))
  let seen = 0
  let total = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      total++
      if (data[(y * width + x) * 4 + 3] >= OPAQUE_ALPHA) seen++
    }
  }
  return seen / total
}

// The usable pixels of `image` ({ data, width, height }) as parallel arrays:
// OKLab, picture position, a weight, the 8-bit colour and its flat-art bucket.
// A grid larger than MAX_SAMPLE_PIXELS is read on a stride (`step`; the grid is
// `gw` by `gh` cells).
// A pixel is usable when it is visible (alpha of OPAQUE_ALPHA or more) and
// weighs its alpha. The partly transparent rim of a logo is a blend with the
// page behind it, and the flat-art pass sets blends aside, so no rule is needed
// here: a hard share cut-off would drop a mostly translucent image beside a
// small solid area.
function collect(image) {
  const { data, width, height } = image
  if (!data || !(width > 0) || !(height > 0)) return { n: 0, total: 0, visible: 0, width: 0, height: 0 }
  const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / MAX_SAMPLE_PIXELS)))
  const gw = Math.ceil(width / step)
  const gh = Math.ceil(height / step)
  let visible = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] >= OPAQUE_ALPHA) visible++
    }
  }
  const cap = visible
  const L = new Float32Array(cap), A = new Float32Array(cap), B = new Float32Array(cap)
  const X = new Uint16Array(cap), Y = new Uint16Array(cap)
  const W = new Float32Array(cap)
  const cr = new Uint8Array(cap), cg = new Uint8Array(cap), cb = new Uint8Array(cap)
  const K = new Uint16Array(cap)
  let n = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if (data[i + 3] < OPAQUE_ALPHA) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const [l, a, ob] = rgbToOklab(r, g, b)
      L[n] = l; A[n] = a; B[n] = ob; X[n] = x; Y[n] = y
      W[n] = data[i + 3] / 255
      cr[n] = r; cg[n] = g; cb[n] = b
      K[n] = ((r >> BUCKET_SHIFT) << 10) | ((g >> BUCKET_SHIFT) << 5) | (b >> BUCKET_SHIFT)
      n++
    }
  }
  return { n, total: gw * gh, visible, width, height, step, gw, gh, L, A, B, X, Y, W, cr, cg, cb, K }
}

// The pixels of `px` flagged in `keep` (a 0/1 array over px.n), as a new set.
function subset(px, keep) {
  let n = 0
  for (let i = 0; i < px.n; i++) if (keep[i]) n++
  const out = { ...px, n }
  for (const key of ['L', 'A', 'B', 'W']) out[key] = new Float32Array(n)
  for (const key of ['X', 'Y', 'K']) out[key] = new Uint16Array(n)
  for (const key of ['cr', 'cg', 'cb']) out[key] = new Uint8Array(n)
  const keys = ['L', 'A', 'B', 'W', 'X', 'Y', 'K', 'cr', 'cg', 'cb']
  let j = 0
  for (let i = 0; i < px.n; i++) {
    if (!keep[i]) continue
    for (const key of keys) out[key][j] = px[key][i]
    j++
  }
  return out
}

// ── Flat art ─────────────────────────────────────────────────────────────────

// The colour buckets that hold at least `minShare` of the considered pixels
// (those flagged in `keep`, or all), when there are few of them and together
// they hold at least `cover` of the pixels. Null otherwise.
function flatBuckets(px, keep, minShare, cover) {
  const weight = new Float64Array(1 << (3 * (8 - BUCKET_SHIFT)))
  let total = 0
  for (let i = 0; i < px.n; i++) {
    if (keep && !keep[i]) continue
    weight[px.K[i]] += px.W[i]
    total += px.W[i]
  }
  if (!total) return null
  const real = []
  let covered = 0
  for (let key = 0; key < weight.length; key++) {
    if (weight[key] >= minShare * total) { real.push(key); covered += weight[key] }
  }
  if (!real.length || real.length > FLAT_MAX_BUCKETS || covered < cover * total) return null
  return real
}

// Pixels whose 3x3 neighbourhood is one flat colour (every neighbour within
// FLAT_TOLERANCE per channel). A neighbour that is not in the set (transparent)
// says nothing either way. Anti-aliased edges and blends are never inside.
function interiorMask(px) {
  const { n, gw, gh, step, X, Y, cr, cg, cb } = px
  const cell = new Int32Array(gw * gh).fill(-1)
  for (let i = 0; i < n; i++) cell[(Y[i] / step) * gw + X[i] / step] = i
  const keep = new Uint8Array(n)
  let count = 0
  for (let i = 0; i < n; i++) {
    const gx = X[i] / step, gy = Y[i] / step
    let flat = true
    for (let dy = -1; dy <= 1 && flat; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = gx + dx, ny = gy + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const j = cell[ny * gw + nx]
        if (j < 0) continue
        if (Math.abs(cr[j] - cr[i]) > FLAT_TOLERANCE || Math.abs(cg[j] - cg[i]) > FLAT_TOLERANCE || Math.abs(cb[j] - cb[i]) > FLAT_TOLERANCE) {
          flat = false
          break
        }
      }
    }
    if (flat) { keep[i] = 1; count++ }
  }
  return { keep, count }
}

// Blend tests work on the 8-bit colours, because that is the space a browser
// blends in. A "segment" is stored flat as [ax, ay, az, dx, dy, dz, 1/|d|^2]:
// the line from colour a to a + d. A colour on its own is a segment with d = 0.
function blendSegments(cols, skip = -1) {
  const out = []
  for (let i = 0; i < cols.length; i++) {
    if (i === skip) continue
    const [ax, ay, az] = cols[i]
    out.push(ax, ay, az, 0, 0, 0, 0)
    for (let j = i + 1; j < cols.length; j++) {
      if (j === skip) continue
      const dx = cols[j][0] - ax, dy = cols[j][1] - ay, dz = cols[j][2] - az
      const dd = dx * dx + dy * dy + dz * dz
      out.push(ax, ay, az, dx, dy, dz, dd ? 1 / dd : 0)
    }
  }
  return Float64Array.from(out)
}

// The line from each colour to black: a partly transparent pixel whose colour
// was premultiplied by its alpha is a blend of its colour and black.
function blackSegments(cols, skip = -1) {
  const out = []
  cols.forEach(([ax, ay, az], i) => {
    const dd = ax * ax + ay * ay + az * az
    if (i !== skip && dd) out.push(ax, ay, az, -ax, -ay, -az, 1 / dd)
  })
  return Float64Array.from(out)
}

function nearSegment(r, g, b, segs, eps2) {
  for (let s = 0; s < segs.length; s += 7) {
    const dx = segs[s + 3], dy = segs[s + 4], dz = segs[s + 5]
    let t = ((r - segs[s]) * dx + (g - segs[s + 1]) * dy + (b - segs[s + 2]) * dz) * segs[s + 6]
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const ex = r - segs[s] - t * dx, ey = g - segs[s + 1] - t * dy, ez = b - segs[s + 2] - t * dz
    if (ex * ex + ey * ey + ez * ez <= eps2) return true
  }
  return false
}

// Whole-image bucket totals: weight, pixel count and weighted colour sums.
function bucketStats(px) {
  const size = 1 << (3 * (8 - BUCKET_SHIFT))
  const st = { w: new Float64Array(size), n: new Uint32Array(size), r: new Float64Array(size), g: new Float64Array(size), b: new Float64Array(size) }
  for (let i = 0; i < px.n; i++) {
    const k = px.K[i], w = px.W[i]
    st.w[k] += w; st.n[k]++
    st.r[k] += w * px.cr[i]; st.g[k] += w * px.cg[i]; st.b[k] += w * px.cb[i]
  }
  return st
}

// Colours that the flat areas did not show but that the picture plainly has: a
// 1-2px line or text stroke never forms a 3x3 flat area, and a small accent
// loses its edge pixels to the erosion. Counted over ALL pixels, any bucket
// holding at least MIN_SHARE of the image (the share below which a cluster is
// not offered anyway) that is not a blend of colours already known is a real
// colour too. Null when there are too many to be flat art.
function withStragglers(px, st, real) {
  let total = 0
  for (let i = 0; i < px.n; i++) total += px.W[i]
  const known = new Set(real)
  const cand = []
  for (let key = 0; key < st.w.length; key++) {
    if (!known.has(key) && st.w[key] >= MIN_SHARE * total) cand.push(key)
  }
  if (real.length + cand.length > FLAT_MAX_POOL) return null
  cand.sort((a, b) => st.w[b] - st.w[a])
  const colourOf = (key) => [st.r[key] / st.w[key], st.g[key] / st.w[key], st.b[key] / st.w[key]]
  const partial = (key) => st.w[key] < 0.98 * st.n[key]
  const pool = [...real, ...cand]
  const cols = pool.map(colourOf)
  const eps2 = BLEND_EPS * BLEND_EPS
  const out = [...real]
  cand.forEach((key, c) => {
    const at = real.length + c
    const [r, g, b] = cols[at]
    // Close to a bigger colour (a neighbouring bucket of the same flat area), or
    // on a line between any two others: a blend, not a colour.
    for (let o = 0; o < at; o++) {
      if (o >= real.length && !out.includes(pool[o])) continue
      if (Math.hypot(r - cols[o][0], g - cols[o][1], b - cols[o][2]) <= BLEND_EPS) return
    }
    if (nearSegment(r, g, b, blendSegments(cols, at), eps2)) return
    if (partial(key) && nearSegment(r, g, b, blackSegments(cols, at), eps2)) return
    out.push(key)
  })
  if (out.length > FLAT_MAX_BUCKETS) return null
  return { keys: out, cols: out.map(colourOf), partial: out.map(partial) }
}

// True when real colours plus the blends between them account for at least
// FLAT_COVER_ALL of the weight of ALL pixels, not only the interior ones. A
// grainy photo on a plain page fails this: the page is flat but the photo is not.
function coversAll(px, found) {
  let total = 0
  for (let i = 0; i < px.n; i++) total += px.W[i]
  const limit = (1 - FLAT_COVER_ALL) * total
  const inSet = new Set(found.keys)
  const eps2 = BLEND_EPS * BLEND_EPS
  const plain = blendSegments(found.cols)
  const toBlack = blackSegments(found.cols)
  let missed = 0
  for (let i = 0; i < px.n; i++) {
    if (inSet.has(px.K[i])) continue
    const r = px.cr[i], g = px.cg[i], b = px.cb[i]
    if (nearSegment(r, g, b, plain, eps2)) continue
    if (px.W[i] < 0.98 && nearSegment(r, g, b, toBlack, eps2)) continue
    missed += px.W[i]
    if (missed > limit) return false
  }
  return true
}

// Is `px` flat art? Two ways to be:
//   - most pixels sit inside flat areas and those areas use a few buckets, with
//     any further colour that holds a real share of the whole image added; the
//     pixels along the edges between them are blends of two colours and are left
//     out, so a blend never becomes a colour of its own, and only if these
//     colours and their blends account for nearly ALL pixels, or
//   - there is hardly any room for a flat area (an 8x8 icon, small pixel art)
//     and a few buckets hold essentially every pixel.
// Returns the pixels that are real colours with a bucket number for each, or
// null for a photo or a gradient.
function findFlat(px) {
  const inside = interiorMask(px)
  let real
  if (inside.count >= FLAT_INTERIOR_MIN * px.n) {
    // 0.1%: interior pixels hold no edge blends, so a small real accent (a 40px
    // square on an 800x600 page is 0.33%) still counts as a colour.
    const flat = flatBuckets(px, inside.keep, 0.001, 0.98)
    if (!flat) return null
    const found = withStragglers(px, bucketStats(px), flat)
    if (!found || !coversAll(px, found)) return null
    real = found.keys
  } else {
    real = flatBuckets(px, null, 0.002, 0.995)
  }
  if (!real) return null
  // The real colours are decided from the flat areas, but every pixel in one of
  // those buckets counts toward its share, edge pixels included.
  const slot = new Map(real.map((key, id) => [key, id]))
  const kept = new Uint8Array(px.n)
  for (let i = 0; i < px.n; i++) if (slot.has(px.K[i])) kept[i] = 1
  const sub = subset(px, kept)
  const assign = new Uint8Array(sub.n)
  for (let i = 0, j = 0; i < px.n; i++) if (kept[i]) assign[j++] = slot.get(px.K[i])
  return { px: sub, assign, kk: real.length }
}

// For every labelled cell of a gw x gh grid (label -1 is a gap), how far the
// nearest cell of another label, a gap or the edge of the picture is, in whole
// cells with diagonals counting as one. The deepest cell of a region is the
// middle of its biggest flat part.
function flatDepth(gw, gh, lab) {
  const d = new Int32Array(gw * gh).fill(1 << 20)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const c = y * gw + x
      const l = lab[c]
      if (l < 0) continue
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (!dx && !dy) continue
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || lab[ny * gw + nx] !== l) d[c] = 1
        }
      }
    }
  }
  const relax = (c, o) => { if (lab[o] === lab[c] && d[o] + 1 < d[c]) d[c] = d[o] + 1 }
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const c = y * gw + x
      if (lab[c] < 0) continue
      if (x > 0) relax(c, c - 1)
      if (y > 0) {
        relax(c, c - gw)
        if (x > 0) relax(c, c - gw - 1)
        if (x < gw - 1) relax(c, c - gw + 1)
      }
    }
  }
  for (let y = gh - 1; y >= 0; y--) {
    for (let x = gw - 1; x >= 0; x--) {
      const c = y * gw + x
      if (lab[c] < 0) continue
      if (x < gw - 1) relax(c, c + 1)
      if (y < gh - 1) {
        relax(c, c + gw)
        if (x < gw - 1) relax(c, c + gw + 1)
        if (x > 0) relax(c, c + gw - 1)
      }
    }
  }
  return d
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
  const { n, L, A, B, W } = px
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
      sum[best * 3] += W[i] * L[i]; sum[best * 3 + 1] += W[i] * A[i]; sum[best * 3 + 2] += W[i] * B[i]
      cnt[best] += W[i]
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
  const all = collect(image)
  if (!all.total) return { status: 'empty', clusters: [], opaque: 0 }
  const opaque = all.visible / all.total
  if (!all.n || opaque < MIN_VISIBLE_SHARE) return { status: 'transparent', clusters: [], opaque }

  // Flat art keeps only its real colours; everything else goes to k-means.
  const flat = findFlat(all)
  const px = flat ? flat.px : all
  const k = Math.min(28, Math.max(12, count * 3 + 4))
  const { assign, kk } = flat || kMeans(px, k, mulberry32(seed))

  // Per-cluster totals, then merge any pair that sits closer than MIN_DELTA.
  const raw = Array.from({ length: kk }, () => ({ n: 0, w: 0, l: 0, a: 0, b: 0, sx: 0, sy: 0 }))
  let weightAll = 0
  for (let i = 0; i < px.n; i++) {
    const c = raw[assign[i]]
    const w = px.W[i]
    c.n++; c.w += w
    c.l += w * px.L[i]; c.a += w * px.A[i]; c.b += w * px.B[i]
    c.sx += px.X[i]; c.sy += px.Y[i]
    weightAll += w
  }
  let groups = raw
    .map((c, id) => ({ ...c, ids: [id] }))
    .filter((c) => c.n > 0)
  const centre = (g) => [g.l / g.w, g.a / g.w, g.b / g.w]
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
      n: a.n + b.n, w: a.w + b.w, l: a.l + b.l, a: a.a + b.a, b: a.b + b.b, sx: a.sx + b.sx, sy: a.sy + b.sy,
      ids: [...a.ids, ...b.ids],
    }
    groups.splice(bj, 1)
  }

  // Cluster id -> merged group, then one pass to find each group's representative.
  const groupOf = new Int16Array(kk).fill(-1)
  groups.forEach((g, gi) => g.ids.forEach((id) => { groupOf[id] = gi }))
  const centres = groups.map(centre)
  const spatial = groups.map((g) => [g.sx / g.n, g.sy / g.n])
  const bestPx = new Int32Array(groups.length).fill(-1)
  if (flat) {
    // Deepest pixel of the group's flat region wins; among equals, the one
    // nearest the group's centre of mass.
    const cellOf = (i) => (px.Y[i] / px.step) * px.gw + px.X[i] / px.step
    const lab = new Int16Array(px.gw * px.gh).fill(-1)
    for (let i = 0; i < px.n; i++) lab[cellOf(i)] = groupOf[assign[i]]
    const depth = flatDepth(px.gw, px.gh, lab)
    const bestDepth = new Int32Array(groups.length).fill(-1)
    const bestSpace = new Float64Array(groups.length).fill(Infinity)
    for (let i = 0; i < px.n; i++) {
      const gi = groupOf[assign[i]]
      const d = depth[cellOf(i)]
      const space = Math.hypot(px.X[i] - spatial[gi][0], px.Y[i] - spatial[gi][1])
      if (d > bestDepth[gi] || (d === bestDepth[gi] && space < bestSpace[gi])) {
        bestDepth[gi] = d; bestSpace[gi] = space; bestPx[gi] = i
      }
    }
  } else {
    const diag = Math.hypot(px.width, px.height) || 1
    const bestScore = new Float64Array(groups.length).fill(Infinity)
    for (let i = 0; i < px.n; i++) {
      const gi = groupOf[assign[i]]
      const [cl, ca, cb] = centres[gi]
      const colourD = Math.hypot(px.L[i] - cl, px.A[i] - ca, px.B[i] - cb)
      const spaceD = Math.hypot(px.X[i] - spatial[gi][0], px.Y[i] - spatial[gi][1]) / diag
      const score = colourD + REP_SPATIAL_WEIGHT * spaceD
      if (score < bestScore[gi]) { bestScore[gi] = score; bestPx[gi] = i }
    }
  }

  const clusters = groups.map((g, gi) => {
    const [l, a, b] = centres[gi]
    const rep = bestPx[gi]
    return {
      hex: rgbToHex(...oklabToRgb(l, a, b)),
      L: l, a, b,
      chroma: Math.hypot(a, b),
      share: g.w / weightAll,
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
  let total = 0
  for (let i = 0; i < px.n; i++) {
    let best = 0
    let bestD = Infinity
    for (let c = 0; c < labs.length; c++) {
      const d = (px.L[i] - labs[c][0]) ** 2 + (px.A[i] - labs[c][1]) ** 2 + (px.B[i] - labs[c][2]) ** 2
      if (d < bestD) { bestD = d; best = c }
    }
    counts[best] += px.W[i]
    total += px.W[i]
  }
  return counts.map((c) => c / total)
}

// ── Sampling ─────────────────────────────────────────────────────────────────

// How far from the marker's pixel a read reaches, for an image `width` by
// `height` in its own pixels: 2 (a 5x5 window) for an ordinary photo, less as
// the image gets small, 0 (the one pixel under the marker) below 32 pixels on
// the short side. A 5x5 window on an 8x8 icon would read most of the icon.
export function sampleRadius(width, height) {
  return Math.max(0, Math.min(2, Math.floor(Math.min(width, height) / 32)))
}

// Mean colour of the (2r+1) square around (cx, cy) in a block of RGBA data,
// ignoring transparent pixels. Null when nothing there is opaque. A marker reads
// this rather than one pixel, so grain and anti-aliasing do not decide its colour.
// Where the window holds fully opaque pixels only those count, so a marker near
// the soft edge of a logo reads the logo and not the edge.
export function averageHex(data, width, height, cx, cy, radius = 2) {
  let r = 0, g = 0, b = 0, n = 0
  let sr = 0, sg = 0, sb = 0, sn = 0
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a < OPAQUE_ALPHA) continue
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      if (a >= SOLID_ALPHA) { sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sn++ }
    }
  }
  if (sn) return rgbToHex(sr / sn, sg / sn, sb / sn)
  return n ? rgbToHex(r / n, g / n, b / n) : null
}

// ── Damaged files ────────────────────────────────────────────────────────────

// A PNG cut short still decodes, as a blank image, and so looks like a picture
// with nothing in it. Every complete PNG has an IEND chunk, so a file that
// starts like a PNG (`head`, its first bytes) but has no IEND in `rest` (the
// bytes after the signature, or a tail of them reaching back past the last
// image data) was cut off. IEND is not always the very last chunk: a valid file
// can carry metadata or padding after it, so the whole of `rest` is searched.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function isTruncatedPng(head, rest) {
  if (!head || head.length < PNG_SIGNATURE.length || PNG_SIGNATURE.some((byte, i) => head[i] !== byte)) return false
  if (!rest || !rest.length) return true
  for (let i = rest.indexOf(0x49); i >= 0 && i + 4 <= rest.length; i = rest.indexOf(0x49, i + 1)) {
    if (rest[i + 1] === 0x45 && rest[i + 2] === 0x4e && rest[i + 3] === 0x44) return false
  }
  return true
}

// isTruncatedPng for a File or Blob. Only a PNG is read past its first 8 bytes,
// and then the whole file (the picker caps the size before this is called).
// Anything that cannot be read is given the benefit of the doubt.
export async function isCutShort(file) {
  try {
    const head = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer())
    if (!isTruncatedPng(head, [])) return false      // not a PNG, or too short to say
    const rest = new Uint8Array(await file.slice(PNG_SIGNATURE.length).arrayBuffer())
    return isTruncatedPng(head, rest)
  } catch { return false }
}

// ── Moods ────────────────────────────────────────────────────────────────────

// The moods the dialog offers. `balanced` is the engine's default (no `mood`),
// so a caller maps it to undefined with `moodArg`.
export const MOOD_OPTIONS = [
  { id: 'balanced', label: 'Balanced', note: 'The photo’s main colours and its strongest accent.' },
  { id: 'colourful', label: 'Colourful', note: 'The most saturated colours in the photo.' },
  { id: 'bright', label: 'Bright', note: 'Light, clear colours.' },
  { id: 'muted', label: 'Muted', note: 'Soft, greyed colours.' },
  { id: 'deep', label: 'Deep', note: 'Rich, darker colours.' },
  { id: 'dark', label: 'Dark', note: 'The shadows and darkest tones.' },
]
export const moodArg = (id) => (MOODS.includes(id) ? id : undefined)

// ── Putting picks on a board ─────────────────────────────────────────────────

// Replace: the board becomes the picks, with each locked colour held where it
// is. `board` is the current hexes, `lockedIdx` the locked column indexes and
// `cap` the most columns the board may hold. Locks count against the cap, so
// the picks are trimmed to what is left. A lock whose slot no longer exists
// (the board got shorter) moves to the last free slot, keeping its order among
// the locks. Returns the new board, the new locked indexes, how many picks
// were used and how many were left out.
export function placePicks(board, lockedIdx, picks, cap) {
  const locks = [...new Set(lockedIdx)].filter((i) => i >= 0 && i < board.length).sort((a, b) => a - b)
  const used = picks.slice(0, Math.max(0, cap - locks.length))
  const length = used.length + locks.length
  const out = new Array(length).fill(null)
  const locked = new Set()
  const homeless = []
  for (const i of locks) {
    if (i < length) { out[i] = board[i]; locked.add(i) } else homeless.push(i)
  }
  for (let s = length - 1; s >= 0 && homeless.length; s--) {
    if (out[s] === null) { out[s] = board[homeless.pop()]; locked.add(s) }
  }
  let next = 0
  for (let s = 0; s < length; s++) if (out[s] === null) out[s] = used[next++]
  return { colours: out, locked, used: used.length, trimmed: picks.length - used.length }
}

// Add: the picks go after the board's own columns, as many as `cap` has room
// for. The board and its locks are untouched.
export function appendPicks(board, picks, cap) {
  const room = Math.max(0, cap - board.length)
  const used = picks.slice(0, room)
  return { colours: [...board, ...used], used: used.length, room }
}
