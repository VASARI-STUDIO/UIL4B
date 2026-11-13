// Writes the blurred previews the locked library cards show.
//
//   node scripts/library/lockedThumbs.mjs
//
// A locked card on the Palette and Gradient Libraries shows what is behind it
// as a soft image: the colours and their order read through, the values do not.
// The page never receives a locked row's values (utils/lockedPreview.js), so the
// look is baked here, from the server data, into one small PNG per row:
//
//   1. every colour is SHIFTED first: made lighter or darker, by SHIFT_MIN to
//      SHIFT_MAX on each channel. The amounts are an HMAC of the row's id and
//      the colour's place under LOCKED_THUMB_KEY, a key that is never committed;
//   2. the row is drawn at THUMB_W x THUMB_H: a palette as its bands, a
//      gradient as its ramp;
//   3. it is blurred lightly and every channel is rounded to a STEP grid.
//
// Why the shift, and why it is keyed: the blur and the rounding are known,
// linear steps, and this file is public, so the image can be solved back to the
// colours that went in (a least-squares fit gets them to within a unit or two).
// What a fit returns is only ever the shifted colours. An unkeyed shift could be
// undone by recomputing it; with the key unknown, each channel of the real
// colour is somewhere 20 to 32 above or below what the fit returns, and never
// closer. tests/unit/locked-thumbs.test.js runs the fit on every committed file
// and fails if any colour comes back close.
//
// What it does not do: it cannot stop a guess being CHECKED. Someone who already
// has a candidate row (a brand's published colours, a gradient from a public
// set) can see that it fits. The preview hides values that are not public; it
// does not hide which public values a row uses.
//
// THE KEY. Set LOCKED_THUMB_KEY (64 hex characters) in .env.local, which git
// ignores, or in the environment, and run this script. The PNGs are the shipped
// artefact and are committed; nothing at build or run time needs the key. Keep
// it: the shifts depend only on the key and the rows' ids, so re-running with the
// same key changes only the previews of rows that changed. A new key gives every
// row fresh shifts, and the old files stay in git history, so each key change
// publishes another sample of every colour.
//
// There is no copy, export or search path to the image either: it is
// decoration on a card that stays a link to /plans.
//
// The test also renders these bytes and fails if the committed files differ,
// when the key is present, so run this after editing any server library.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { LIBRARY_PALETTES } from '../../api/_lib/library/data.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/data.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const THUMB_DIR = 'public/locked-previews'
// One size for both kinds; the card stretches it to its own box.
export const THUMB_W = 24
export const THUMB_H = 24
const BLUR_RADIUS = 1
const STEP = 8

const hex = (h) => {
  const v = String(h).replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

export const SHIFT_MIN = 20
export const SHIFT_MAX = 32

/** The key from the environment or .env.local, or null. Never printed. */
export function lockedThumbKey() {
  let key = process.env.LOCKED_THUMB_KEY || ''
  if (!key) {
    try {
      const line = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(String.fromCharCode(10)).map((l) => l.trim()).find((l) => l.startsWith('LOCKED_THUMB_KEY='))
      key = line ? line.slice('LOCKED_THUMB_KEY='.length).trim() : ''
    } catch { /* no .env.local */ }
  }
  return /^[0-9a-f]{64}$/i.test(key) ? key : null
}

/**
 * The row's colours, each made lighter or darker as a whole: every channel moves
 * SHIFT_MIN..SHIFT_MAX the same way, so a colour keeps roughly its own hue.
 * The amounts depend only on the key, the row's id and the colour's place, never
 * on the colours, so an edit to one colour leaves the others' shifts unchanged
 * and a re-run publishes nothing new about them.
 */
export function shiftColours(colours, key, id) {
  if (!key) throw new Error('LOCKED_THUMB_KEY is not set (64 hex characters, in .env.local)')
  const draw = (label) => crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(`${id}#${label}`).digest().readUInt32BE(0)
  return colours.map((c, i) => {
    const up = draw(`${i}#sign`) & 1
    return hex(c).map((v, ch) => {
      const size = SHIFT_MIN + (draw(`${i}#${ch}`) % (SHIFT_MAX - SHIFT_MIN + 1))
      const shift = up ? size : -size
      // Kept in range by going the other way, so the distance is never smaller.
      return v + shift >= 0 && v + shift <= 255 ? v + shift : v - shift
    })
  })
}

// A palette is its bands stacked top to bottom, the first one 2.4 times the
// height of the rest, as the library card draws it (.pgal-stripe:first-child).
// Takes [r, g, b] colours.
export function paintPalette(cs) {
  const weights = cs.map((_, i) => (i === 0 ? 2.4 : 1))
  const total = weights.reduce((a, b) => a + b, 0)
  const bandAt = (t) => {
    let edge = 0
    for (let i = 0; i < cs.length; i += 1) {
      edge += weights[i] / total
      if (t < edge) return cs[i]
    }
    return cs[cs.length - 1]
  }
  const px = []
  for (let y = 0; y < THUMB_H; y += 1) {
    const c = bandAt((y + 0.5) / THUMB_H)
    for (let x = 0; x < THUMB_W; x += 1) px.push(c)
  }
  return px
}

// A gradient is its stops along its angle (CSS convention: 0deg points up),
// out from the centre when it is radial, or round the centre from `angle` when
// it is conic. Takes the row's shape and [r, g, b] stop colours.
export function paintGradient({ type, angle = 90, stops }, cs) {
  const sorted = stops.map((s, i) => ({ c: cs[i], p: s.position / 100 })).sort((a, b) => a.p - b.p)
  const at = (t) => {
    if (t <= sorted[0].p) return sorted[0].c
    for (let i = 1; i < sorted.length; i += 1) {
      if (t <= sorted[i].p) return mix(sorted[i - 1].c, sorted[i].c, (t - sorted[i - 1].p) / ((sorted[i].p - sorted[i - 1].p) || 1))
    }
    return sorted[sorted.length - 1].c
  }
  const rad = ((Number(angle) || 0) * Math.PI) / 180
  const dx = Math.sin(rad), dy = -Math.cos(rad)
  const half = (Math.abs(dx) * THUMB_W + Math.abs(dy) * THUMB_H) / 2
  const px = []
  for (let y = 0; y < THUMB_H; y += 1) {
    for (let x = 0; x < THUMB_W; x += 1) {
      const cx = x + 0.5 - THUMB_W / 2, cy = y + 0.5 - THUMB_H / 2
      let t
      if (/radial/i.test(type || '')) t = Math.min(1, Math.hypot(cx / (THUMB_W / 2), cy / (THUMB_H / 2)))
      else if (/conic/i.test(type || '')) t = (((Math.atan2(cx, -cy) - rad) / (2 * Math.PI)) % 1 + 1) % 1
      else t = (cx * dx + cy * dy) / (2 * half) + 0.5
      px.push(at(Math.max(0, Math.min(1, t))))
    }
  }
  return px
}

// One horizontal then one vertical box pass, edges clamped.
export function boxBlur(px) {
  const get = (arr, x, y) => arr[Math.max(0, Math.min(THUMB_H - 1, y)) * THUMB_W + Math.max(0, Math.min(THUMB_W - 1, x))]
  const pass = (src, horizontal) => {
    const out = []
    for (let y = 0; y < THUMB_H; y += 1) {
      for (let x = 0; x < THUMB_W; x += 1) {
        const sum = [0, 0, 0]
        for (let k = -BLUR_RADIUS; k <= BLUR_RADIUS; k += 1) {
          const c = horizontal ? get(src, x + k, y) : get(src, x, y + k)
          sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2]
        }
        out.push(sum.map((v) => v / (BLUR_RADIUS * 2 + 1)))
      }
    }
    return out
  }
  return pass(pass(px, true), false)
}

// Rounded to the middle of a STEP-wide cell: 4, 12, 20 … 252.
export const quantise = (v) => Math.min(255 - STEP / 2, Math.floor(v / STEP) * STEP + STEP / 2)

// ── A minimal, deterministic PNG (8-bit RGB, no filter) ─────────────────────
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(THUMB_W, 0); ihdr.writeUInt32BE(THUMB_H, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const raw = Buffer.alloc(THUMB_H * (THUMB_W * 3 + 1))
  let o = 0
  for (let y = 0; y < THUMB_H; y += 1) {
    raw[o++] = 0
    for (let x = 0; x < THUMB_W; x += 1) {
      const c = px[y * THUMB_W + x]
      raw[o++] = c[0]; raw[o++] = c[1]; raw[o++] = c[2]
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** The blur the files get, before rounding: two passes of boxBlur. */
export const blurTwice = (px) => boxBlur(boxBlur(px))

const finish = (px) => encodePng(blurTwice(px).map((c) => c.map(quantise)))

/** Every preview file, as { 'public/locked-previews/<kind>/<id>.png': Buffer }. */
export function renderLockedThumbs(key = lockedThumbKey()) {
  const files = {}
  for (const p of LIBRARY_PALETTES) files[`${THUMB_DIR}/palettes/${p.id}.png`] = finish(paintPalette(shiftColours(p.colors, key, p.id)))
  for (const g of GALLERY_GRADIENTS) files[`${THUMB_DIR}/gradients/${g.id}.png`] = finish(paintGradient(g, shiftColours(g.stops.map((s) => s.color), key, g.id)))
  return files
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = renderLockedThumbs()
  fs.rmSync(path.join(ROOT, THUMB_DIR), { recursive: true, force: true })
  for (const [rel, buf] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true })
    fs.writeFileSync(path.join(ROOT, rel), buf)
  }
  console.log(`wrote ${Object.keys(files).length} previews to ${THUMB_DIR}/`)
}
