// A small PNG reader for tests: 8-bit RGB, non-interlaced, which is what api/_lib/library/preview.js
// writes. It checks the signature and every chunk's CRC, inflates the pixel data and undoes the
// row filters, so a test can look at the picture's real pixels and not only at its size.
import { inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** @returns {{ width, height, bitDepth, colourType, chunks: string[], rows: Uint8Array[] }} one Uint8Array of RGB bytes per row */
export function decodePng(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf)
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG: the signature is wrong')
  const chunks = []
  const idat = []
  let ihdr = null
  for (let at = 8; at < buf.length;) {
    const length = buf.readUInt32BE(at)
    const type = buf.toString('ascii', at + 4, at + 8)
    const body = buf.subarray(at + 8, at + 8 + length)
    const crc = buf.readUInt32BE(at + 8 + length)
    if (crc32(buf.subarray(at + 4, at + 8 + length)) !== crc) throw new Error(`${type} chunk has a bad CRC`)
    chunks.push(type)
    if (type === 'IHDR') ihdr = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), bitDepth: body[8], colourType: body[9], interlace: body[12] }
    if (type === 'IDAT') idat.push(body)
    at += 12 + length
  }
  if (!ihdr) throw new Error('no IHDR chunk')
  if (ihdr.bitDepth !== 8 || ihdr.colourType !== 2 || ihdr.interlace !== 0) throw new Error('this reader takes 8-bit RGB, not interlaced')
  const raw = inflateSync(Buffer.concat(idat))
  const stride = ihdr.width * 3
  if (raw.length !== (stride + 1) * ihdr.height) throw new Error(`pixel data is ${raw.length} bytes, expected ${(stride + 1) * ihdr.height}`)
  const rows = []
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    const up = y ? rows[y - 1] : new Uint8Array(stride)
    for (let i = 0; i < stride; i++) {
      const left = i >= 3 ? line[i - 3] : 0
      const upLeft = i >= 3 ? up[i - 3] : 0
      let add = 0
      if (filter === 1) add = left
      else if (filter === 2) add = up[i]
      else if (filter === 3) add = (left + up[i]) >> 1
      else if (filter === 4) {
        const p = left + up[i] - upLeft
        const pa = Math.abs(p - left); const pb = Math.abs(p - up[i]); const pc = Math.abs(p - upLeft)
        add = pa <= pb && pa <= pc ? left : pb <= pc ? up[i] : upLeft
      } else if (filter !== 0) throw new Error(`row ${y} has filter ${filter}`)
      line[i] = (line[i] + add) & 0xff
    }
    rows.push(line)
  }
  return { ...ihdr, chunks, rows }
}

/** The RGB triple at column x of a row. */
export const pixel = (row, x) => [row[x * 3], row[x * 3 + 1], row[x * 3 + 2]]

/** '#1A2B3C' -> [26, 43, 60] */
export const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/**
 * Every way a hex code could sit in a byte stream as text: with and without the #, either case, and
 * the 3-digit short form when it exists.
 */
export function hexNeedles(hex) {
  const h = hex.replace('#', '')
  const out = [h, h.toLowerCase(), `#${h}`, `#${h.toLowerCase()}`]
  if (h[0] === h[1] && h[2] === h[3] && h[4] === h[5]) out.push(`#${h[0]}${h[2]}${h[4]}`.toLowerCase())
  return [...new Set(out)]
}
