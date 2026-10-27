// SERVER-ONLY. The blurred stand-in for a palette the viewer cannot open.
//
//   GET /api/ai?palettePreview=<library id>   200 image/png, 404 for an id the library does not hold
//
// Hosted inside api/ai.js with the other GETs (the function count is pinned; see serve.js).
//
// WHAT IS SENT. Not the colours: a picture of them. The palette is drawn as hard stops across a
// 320 x 74 strip and blurred sideways with a wrap-around Gaussian wide enough that the stops run
// together, then every column is pulled part of the way to the palette's mean. The hue and the mood of
// the palette read; no pixel lands within about 24 levels of any stop, so no stop can be read back. Neither the response nor
// the page that shows it ever holds a hex code. The image is a plain PNG built here with node:zlib,
// because the function carries no image library. Every row of the picture is the same, so the PNG
// filters all but the first row to zeros and the whole strip is a few hundred bytes.
//
// WHO GETS IT. Anyone: a signed-out visitor and a Free account are the people it is for, and the
// answer depends only on the id, so it is cached publicly for a day. The Pro libraries themselves
// (serve.js) stay behind the Pro check; this route can only ever return the blur.

import { deflateSync } from 'node:zlib'

export const PREVIEW_WIDTH = 320
export const PREVIEW_HEIGHT = 74
// Standard deviation of the sideways blur, in pixels of the 320-wide strip. A stop is 64 to 80
// pixels wide, so at 30 each neighbour bleeds into the middle of a stop and the transitions read as
// one wash of the palette's hues. The blur wraps round the strip (the last stop blends into the first),
// so the two ends are not left holding their own colour.
export const PREVIEW_SIGMA = 30
// How far every column is pulled toward the palette's mean colour after the blur. The blur alone
// leaves the middle of a wide stop within a few levels of the stop; the pull moves every pixel away
// from the stops' exact colours, so no hex can be read back with a colour picker, while the hues
// stay in the order the palette has them.
export const PREVIEW_MEAN_MIX = 0.35
// The least distance, in levels of one channel, any pixel may sit from any stop's exact colour.
export const PREVIEW_CLEARANCE = 25
// Flat offsets tried, smallest first, when a low-contrast palette leaves a pixel closer than that.
const PREVIEW_SHIFTS = [26, 40, 56]

const hexToRgb = (hex) => {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
}

/** One row of the strip: the hard stops, a wrap-around Gaussian, then a pull toward the mean, as PREVIEW_WIDTH RGB triples. */
export function previewRow(colors, width = PREVIEW_WIDTH, sigma = PREVIEW_SIGMA, meanMix = PREVIEW_MEAN_MIX) {
  const rgb = (colors || []).map(hexToRgb)
  if (!rgb.length) rgb.push([128, 128, 128])
  const hard = new Float64Array(width * 3)
  for (let x = 0; x < width; x++) {
    const c = rgb[Math.min(rgb.length - 1, Math.floor((x * rgb.length) / width))]
    hard.set(c, x * 3)
  }
  const radius = Math.ceil(sigma * 3)
  const kernel = new Float64Array(radius * 2 + 1)
  let sum = 0
  for (let k = -radius; k <= radius; k++) { kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma)); sum += kernel[k + radius] }
  // The mean of the hard strip (each stop weighted by the columns it covers).
  const mean = [0, 0, 0]
  for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) mean[c] += hard[x * 3 + c] / width
  const soft = new Float64Array(width * 3)
  for (let x = 0; x < width; x++) {
    let r = 0; let g = 0; let b = 0
    for (let k = -radius; k <= radius; k++) {
      // Wrap round: the strip's two ends blend into each other instead of repeating the end stop.
      const at = ((((x + k) % width) + width) % width) * 3
      const w = kernel[k + radius]
      r += hard[at] * w; g += hard[at + 1] * w; b += hard[at + 2] * w
    }
    const blur = [r / sum, g / sum, b / sum]
    for (let c = 0; c < 3; c++) soft[x * 3 + c] = blur[c] * (1 - meanMix) + mean[c] * meanMix
  }
  // A palette whose stops sit close together (greys, creams) still has pixels near a stop, because
  // the mean is near every stop. Shift the whole strip by one flat offset, the smallest that clears
  // them, so the picture stays smooth and still reads as a lighter or darker take on the palette.
  const to8 = (v) => Math.max(0, Math.min(255, Math.round(v)))
  const closest = (off) => {
    let best = Infinity
    for (let x = 0; x < width; x++) {
      for (const s of rgb) {
        let d = 0
        for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(to8(soft[x * 3 + c] + off[c]) - s[c]))
        if (d < best) best = d
      }
    }
    return best
  }
  const offsets = [[0, 0, 0]]
  for (const m of PREVIEW_SHIFTS) for (const r of [-m, 0, m]) for (const g of [-m, 0, m]) for (const b of [-m, 0, m]) if (r || g || b) offsets.push([r, g, b])
  let chosen = offsets[0]
  let chosenGap = -1
  for (const off of offsets) {
    const gap = closest(off)
    if (gap > chosenGap) { chosen = off; chosenGap = gap }
    if (gap >= PREVIEW_CLEARANCE) { chosen = off; break }
  }
  const row = new Uint8Array(width * 3)
  for (let i = 0; i < row.length; i++) row[i] = to8(soft[i] + chosen[i % 3])
  return row
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), 8 + data.length)
  return out
}

/** The blurred strip for these colours, as a PNG. */
export function previewPng(colors, width = PREVIEW_WIDTH, height = PREVIEW_HEIGHT) {
  const row = previewRow(colors, width)
  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height) // filter byte 0 (None) on row 0; filter 2 (Up) below, over zeros
  raw.set(row, 1)
  for (let y = 1; y < height; y++) raw[y * stride] = 2
  const head = Buffer.alloc(13)
  head.writeUInt32BE(width, 0)
  head.writeUInt32BE(height, 4)
  head[8] = 8 // bit depth
  head[9] = 2 // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * @param req   needs query.palettePreview
 * @param res   a Vercel/Express-style response
 * @param rows  the library rows to look the id up in (injected so a test needs no module graph)
 */
export function servePalettePreview(req, res, rows) {
  const id = req.query?.palettePreview
  const row = typeof id === 'string' && id.length <= 80 ? rows.find((p) => p.id === id) : null
  if (!row || !Array.isArray(row.colors)) {
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(404).json({ error: 'No such palette' })
  }
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // Depends on the id alone, so a shared cache may keep it; a day, then revalidate in the background.
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  return res.status(200).end(previewPng(row.colors))
}
