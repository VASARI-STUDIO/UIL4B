// Palette quantising for the Image tab's PNG output: median cut over RGBA, and a
// writer for indexed PNGs. DOM-free (the writer needs CompressionStream, which
// browsers and Node both have), and deterministic: the same pixels and the same
// colour count always give the same palette and the same bytes.

export const COLOURS_MIN = 2
export const COLOURS_MAX = 256

// Colours are binned to 5 bits a channel (alpha too) before the cut, so a photo
// is a few tens of thousands of bins rather than millions of pixels.
const BINS = 1 << 20
const OPAQUE_BELOW = 8 // an alpha under this is treated as fully transparent

const binOf = (r, g, b, a) => (a < OPAQUE_BELOW ? 0 : ((r >> 3) << 15) | ((g >> 3) << 10) | ((b >> 3) << 5) | (a >> 3))

/** The distinct colours of `rgba`, in order of first appearance, or null past `limit`. */
function exactColours(rgba, limit) {
  const seen = new Map()
  for (let i = 0; i < rgba.length; i += 4) {
    const clear = rgba[i + 3] === 0
    const r = clear ? 0 : rgba[i]
    const g = clear ? 0 : rgba[i + 1]
    const b = clear ? 0 : rgba[i + 2]
    const key = ((r << 24) | (g << 16) | (b << 8) | rgba[i + 3]) >>> 0
    if (!seen.has(key)) {
      if (seen.size >= limit) return null
      seen.set(key, seen.size)
    }
  }
  return seen
}

function indexExact(rgba, seen) {
  const palette = new Uint8Array(seen.size * 4)
  for (const [key, i] of seen) {
    palette[i * 4] = key >>> 24
    palette[i * 4 + 1] = (key >>> 16) & 255
    palette[i * 4 + 2] = (key >>> 8) & 255
    palette[i * 4 + 3] = key & 255
  }
  const indices = new Uint8Array(rgba.length / 4)
  for (let p = 0, i = 0; i < rgba.length; p++, i += 4) {
    const clear = rgba[i + 3] === 0
    const r = clear ? 0 : rgba[i]
    const g = clear ? 0 : rgba[i + 1]
    const b = clear ? 0 : rgba[i + 2]
    indices[p] = seen.get(((r << 24) | (g << 16) | (b << 8) | rgba[i + 3]) >>> 0)
  }
  return { palette, indices, size: seen.size }
}

/**
 * Reduces an RGBA picture to at most `count` colours (2 to 256).
 *
 * A picture that already has no more colours than that comes back unchanged.
 * Otherwise median cut: the bins are cut into `count` boxes by repeatedly
 * splitting the box with the most pixels times the widest channel, at the
 * median pixel, and each box becomes its average colour. Fully transparent
 * pixels keep their own palette entry (index 0), so a cut-out stays cut out.
 *
 * @param {Uint8ClampedArray|Uint8Array} rgba 4 bytes a pixel
 * @returns {{palette: Uint8Array, indices: Uint8Array, size: number}} palette is RGBA, 4 bytes an entry
 */
export function quantise(rgba, count) {
  const limit = Math.max(COLOURS_MIN, Math.min(COLOURS_MAX, Math.round(Number(count) || COLOURS_MAX)))
  const exact = exactColours(rgba, limit)
  if (exact) return indexExact(rgba, exact)

  const n = new Uint32Array(BINS)
  const sum = [new Float64Array(BINS), new Float64Array(BINS), new Float64Array(BINS), new Float64Array(BINS)]
  for (let i = 0; i < rgba.length; i += 4) {
    const bin = binOf(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])
    n[bin]++
    if (bin) {
      sum[0][bin] += rgba[i]
      sum[1][bin] += rgba[i + 1]
      sum[2][bin] += rgba[i + 2]
      sum[3][bin] += rgba[i + 3]
    }
  }

  const clear = n[0] > 0
  const used = []
  for (let b = 1; b < BINS; b++) if (n[b]) used.push(b)
  // Each bin's average colour: the value the cut sorts and measures by.
  const mean = (b, c) => sum[c][b] / n[b]

  const makeBox = (bins) => {
    const lo = [255, 255, 255, 255]
    const hi = [0, 0, 0, 0]
    let pop = 0
    for (const b of bins) {
      pop += n[b]
      for (let c = 0; c < 4; c++) {
        const v = mean(b, c)
        if (v < lo[c]) lo[c] = v
        if (v > hi[c]) hi[c] = v
      }
    }
    let axis = 0
    let span = hi[0] - lo[0]
    for (let c = 1; c < 4; c++) if (hi[c] - lo[c] > span) { span = hi[c] - lo[c]; axis = c }
    return { bins, pop, axis, span }
  }

  const boxes = [makeBox(used)]
  const target = limit - (clear ? 1 : 0)
  while (boxes.length < target) {
    let pick = -1
    let best = -1
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].bins.length < 2) continue
      const score = boxes[i].pop * (boxes[i].span + 1)
      if (score > best) { best = score; pick = i }
    }
    if (pick < 0) break
    const { bins, pop, axis } = boxes[pick]
    const sorted = bins.slice().sort((x, y) => (mean(x, axis) - mean(y, axis)) || (x - y))
    let run = 0
    let cut = 1
    for (let i = 0; i < sorted.length - 1; i++) {
      run += n[sorted[i]]
      cut = i + 1
      if (run * 2 >= pop) break
    }
    boxes.splice(pick, 1, makeBox(sorted.slice(0, cut)), makeBox(sorted.slice(cut)))
  }

  const first = clear ? 1 : 0
  const palette = new Uint8Array((boxes.length + first) * 4)
  const toIndex = new Uint8Array(BINS)
  boxes.forEach((box, i) => {
    const at = (i + first) * 4
    for (let c = 0; c < 4; c++) {
      let total = 0
      for (const b of box.bins) total += sum[c][b]
      palette[at + c] = Math.round(total / box.pop)
    }
    for (const b of box.bins) toIndex[b] = i + first
  })

  const indices = new Uint8Array(rgba.length / 4)
  for (let p = 0, i = 0; i < rgba.length; p++, i += 4) {
    indices[p] = toIndex[binOf(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])]
  }
  return { palette, indices, size: boxes.length + first }
}

// ── Indexed PNG ──────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Bits a pixel needs for a palette of `size` entries: 1, 2, 4 or 8. */
export const bitDepthFor = (size) => (size <= 2 ? 1 : size <= 4 ? 2 : size <= 16 ? 4 : 8)

/**
 * An indexed (colour type 3) PNG: a PLTE chunk, a tRNS chunk when any entry is
 * not opaque, and the indices packed at the smallest bit depth that fits.
 *
 * @returns {Promise<Uint8Array>} the file's bytes
 */
export async function encodeIndexedPng(width, height, indices, palette) {
  const size = palette.length / 4
  const depth = bitDepthFor(size)
  const stride = Math.ceil((width * depth) / 8)
  const raw = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1) + 1 // the byte before it is the filter type, 0 = none
    const from = y * width
    if (depth === 8) {
      raw.set(indices.subarray(from, from + width), row)
    } else {
      for (let x = 0; x < width; x++) {
        const shift = 8 - depth - ((x * depth) % 8)
        raw[row + ((x * depth) >> 3)] |= indices[from + x] << shift
      }
    }
  }

  const head = new Uint8Array(13)
  const hv = new DataView(head.buffer)
  hv.setUint32(0, width)
  hv.setUint32(4, height)
  head[8] = depth
  head[9] = 3

  const plte = new Uint8Array(size * 3)
  const alpha = new Uint8Array(size)
  let lastAlpha = -1
  for (let i = 0; i < size; i++) {
    plte[i * 3] = palette[i * 4]
    plte[i * 3 + 1] = palette[i * 4 + 1]
    plte[i * 3 + 2] = palette[i * 4 + 2]
    alpha[i] = palette[i * 4 + 3]
    if (alpha[i] !== 255) lastAlpha = i
  }

  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('PLTE', plte),
    ...(lastAlpha >= 0 ? [chunk('tRNS', alpha.subarray(0, lastAlpha + 1))] : []),
    chunk('IDAT', await deflate(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}
