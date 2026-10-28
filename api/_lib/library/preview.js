// SERVER-ONLY. The soft stand-in for a palette the viewer cannot open.
//
//   GET /api/ai?palettePreview=<library id>   200 image/png, 404 for an id the library does not hold
//
// Hosted inside api/ai.js with the other GETs (the function count is pinned; see serve.js).
//
// WHAT IS SENT. Not the colours, and not a picture they could be recovered from. An earlier version drew
// every stop as a block and blurred it; that is a known linear map of the stops (the blur is a public
// Gaussian), so least squares over the 320 columns gave each stop back to within a few levels. This one
// is built from a coarse summary instead, so there is nothing to invert:
//
//   - the palette's mean colour, and the two stops furthest apart from each other (OKLab distance);
//   - each of those three colours snapped to a grid: hue to 30 degree steps, lightness and chroma to
//     3 levels each (PREVIEW_LIGHTNESS, PREVIEW_CHROMA), so at most 12 x 3 x 3 = 108 colours each;
//   - drawn as a soft three-tone wash that wraps round the strip (smoothstep between the three).
//
// How many stops there are, their order, the stops between the two extremes and every stop's exact colour
// never reach the picture. The mood does: warm or cool, light or dark, quiet or loud. A flat offset
// (PREVIEW_SHIFTS) then keeps every pixel at least PREVIEW_CLEARANCE levels of one channel from every
// stop's exact colour, so a colour picker cannot return a stop either. Neither the response nor the page
// that shows it ever holds a hex code. The output depends on the colours alone: no randomness, no secret.
// The image is a plain PNG built here with node:zlib, because the function carries no image library.
// Every row of the picture is the same, so the PNG filters all but the first row to zeros and the whole
// strip is a few hundred bytes.
//
// WHO GETS IT. Anyone: a signed-out visitor and a Free account are the people it is for, and the
// answer depends only on the id, so it is cached publicly for a day. The Pro libraries themselves
// (serve.js) stay behind the Pro check; this route can only ever return the wash.

import { deflateSync } from 'node:zlib'
import { refuseUnexpectedQuery } from '../http.js'

export const PREVIEW_WIDTH = 320
export const PREVIEW_HEIGHT = 74
// OKLCH lightness and chroma levels a tone is snapped to (hue snaps to PREVIEW_HUE_STEP degrees). Chroma
// is capped to what sRGB can show at that lightness and hue, so a bright saturated tone comes out duller.
export const PREVIEW_LIGHTNESS = [0.34, 0.62, 0.86]
export const PREVIEW_CHROMA = [0.03, 0.09, 0.16]
export const PREVIEW_HUE_STEP = 30
// A colour with less chroma than this is a grey and stays one: a tint of the lowest chroma level would
// invent a hue the palette does not have.
const PREVIEW_NEUTRAL = 0.012
// The least distance, in levels of one channel, any pixel may sit from any stop's exact colour.
export const PREVIEW_CLEARANCE = 25
// Flat offsets tried, smallest first, when a tone lands closer than that to a stop.
const PREVIEW_SHIFTS = [26, 40, 56]

const hexToRgb = (hex) => {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
}

// sRGB (0-255) <-> OKLab (Bjorn Ottosson's matrices).
const toLinear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const fromLinear = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
function rgbToLab([r, g, b]) {
  const lr = toLinear(r); const lg = toLinear(g); const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}
// The linear-light RGB of an OKLab colour, unclamped (a channel outside 0..1 means out of gamut).
function labToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}
const inGamut = (lin) => lin.every((c) => c >= -1e-4 && c <= 1 + 1e-4)

const nearest = (levels, v) => levels.reduce((best, l) => (Math.abs(l - v) < Math.abs(best - v) ? l : best), levels[0])

/** An OKLab colour snapped to the grid (hue to PREVIEW_HUE_STEP, lightness and chroma to 3 levels), as sRGB 0-255. */
export function snapTone(lab) {
  const [L, a, b] = lab
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  const snappedHue = ((Math.round(hue / PREVIEW_HUE_STEP) * PREVIEW_HUE_STEP) % 360) * (Math.PI / 180)
  const lightness = nearest(PREVIEW_LIGHTNESS, L)
  // Pull chroma in until sRGB can show it; a bright blue at the top chroma level would not fit.
  let chroma = Math.hypot(a, b) < PREVIEW_NEUTRAL ? 0 : nearest(PREVIEW_CHROMA, Math.hypot(a, b))
  const at = () => labToLinear([lightness, chroma * Math.cos(snappedHue), chroma * Math.sin(snappedHue)])
  let lin = at()
  for (let i = 0; i < 40 && !inGamut(lin); i++) { chroma *= 0.9; lin = at() }
  return lin.map((c) => fromLinear(Math.max(0, Math.min(1, c))))
}

/** The three tones a palette is summarised by: [first of the two furthest-apart stops, the mean, the second], as sRGB 0-255. */
export function previewTones(rgb) {
  const labs = rgb.map(rgbToLab)
  const mean = [0, 1, 2].map((k) => labs.reduce((n, l) => n + l[k], 0) / labs.length)
  let pair = [0, labs.length - 1]
  let widest = -1
  for (let i = 0; i < labs.length; i++) {
    for (let j = i + 1; j < labs.length; j++) {
      const d = Math.hypot(labs[i][0] - labs[j][0], labs[i][1] - labs[j][1], labs[i][2] - labs[j][2])
      if (d > widest) { widest = d; pair = [i, j] }
    }
  }
  return [snapTone(labs[pair[0]]), snapTone(mean), snapTone(labs[pair[1]])]
}

/** One row of the strip: the three tones as a soft wash that wraps round, as PREVIEW_WIDTH RGB triples. */
export function previewRow(colors, width = PREVIEW_WIDTH) {
  const rgb = (colors || []).map(hexToRgb)
  if (!rgb.length) rgb.push([128, 128, 128])
  const tones = previewTones(rgb)
  // Tone centres at 1/6, 1/2 and 5/6 of the strip, smoothstep between neighbours, the last back round to
  // the first: no seam, and no stretch of the strip is a flat tone for long.
  const soft = new Float64Array(width * 3)
  for (let x = 0; x < width; x++) {
    const p = (((((x + 0.5) / width - 1 / 6) % 1) + 1) % 1) * 3
    const seg = Math.min(2, Math.floor(p))
    const t = p - seg
    const e = t * t * (3 - 2 * t)
    const from = tones[seg]
    const to = tones[(seg + 1) % 3]
    for (let c = 0; c < 3; c++) soft[x * 3 + c] = from[c] + (to[c] - from[c]) * e
  }
  // A tone can land near a stop (a palette of near-greys, or a stop that is already on the grid). Shift the
  // whole strip by one flat offset, the smallest that clears every stop, so it stays smooth.
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
  // Lighter or darker as a whole comes first at each size: it keeps the hue. A tint shift is the last resort.
  for (const m of PREVIEW_SHIFTS) {
    offsets.push([-m, -m, -m], [m, m, m])
    for (const r of [-m, 0, m]) for (const g of [-m, 0, m]) for (const b of [-m, 0, m]) if ((r || g || b) && !(r === g && g === b && r !== 0)) offsets.push([r, g, b])
  }
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

/** The soft strip for these colours, as a PNG. */
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
  // The id is the whole cache key: any other key would be a second cache entry
  // for the same image and a fresh PNG build.
  if (refuseUnexpectedQuery(req, res, ['palettePreview'])) return
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
