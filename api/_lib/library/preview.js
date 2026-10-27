// SERVER-ONLY. The blurred stand-in for a palette the viewer cannot open.
//
//   GET /api/ai?palettePreview=<library id>   200 image/png, 404 for an id the library does not hold
//
// Hosted inside api/ai.js with the other GETs (the function count is pinned; see serve.js).
//
// WHAT IS SENT. Not the colours: a picture of them. The palette is drawn as hard stops across a
// 320 x 74 strip and blurred sideways with a Gaussian wide enough that the stops run together, so
// the hue and the mood of the palette read and the individual stops do not. Neither the response nor
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
// pixels wide, so at 22 each neighbour bleeds well into the middle of a stop: the transitions read as
// one wash of the palette's hues and no single stop keeps its own colour.
export const PREVIEW_SIGMA = 22

const hexToRgb = (hex) => {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
}

/** One row of the strip: the hard stops, then the Gaussian, as PREVIEW_WIDTH RGB triples. */
export function previewRow(colors, width = PREVIEW_WIDTH, sigma = PREVIEW_SIGMA) {
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
  const row = new Uint8Array(width * 3)
  for (let x = 0; x < width; x++) {
    let r = 0; let g = 0; let b = 0
    for (let k = -radius; k <= radius; k++) {
      // The edges repeat the end stop, so the strip does not fade towards black at its sides.
      const at = Math.min(width - 1, Math.max(0, x + k)) * 3
      const w = kernel[k + radius]
      r += hard[at] * w; g += hard[at + 1] * w; b += hard[at + 2] * w
    }
    row[x * 3] = Math.round(r / sum); row[x * 3 + 1] = Math.round(g / sum); row[x * 3 + 2] = Math.round(b / sum)
  }
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
