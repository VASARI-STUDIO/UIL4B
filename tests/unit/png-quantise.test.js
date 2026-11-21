// PNG palette quantising and the indexed PNG writer.
import test from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { COLOURS_MAX, COLOURS_MIN, bitDepthFor, crc32, encodeIndexedPng, quantise } from '../../src/utils/pngQuantise.js'

// A repeatable gradient with some noise: thousands of distinct colours.
function photo(w, h) {
  const px = new Uint8ClampedArray(w * h * 4)
  let seed = 12345
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  for (let i = 0; i < w * h; i++) {
    const x = i % w
    const y = Math.floor(i / w)
    px[i * 4] = Math.min(255, Math.round((x / w) * 255 + rnd() * 12))
    px[i * 4 + 1] = Math.min(255, Math.round((y / h) * 255 + rnd() * 12))
    px[i * 4 + 2] = Math.round(rnd() * 255)
    px[i * 4 + 3] = 255
  }
  return px
}

const distinct = (indices) => new Set(indices).size

test('a photo is cut to no more colours than asked for', () => {
  const px = photo(64, 64)
  for (const n of [2, 3, 16, 64, 256]) {
    const q = quantise(px, n)
    assert.ok(q.size <= n, `size ${q.size} for ${n}`)
    assert.equal(q.palette.length, q.size * 4)
    assert.ok(distinct(q.indices) <= n)
    assert.ok(Math.max(...q.indices) < q.size)
  }
})

test('more colours get closer to the picture', () => {
  const px = photo(64, 64)
  const error = (n) => {
    const q = quantise(px, n)
    let e = 0
    for (let i = 0; i < q.indices.length; i++) {
      for (let c = 0; c < 3; c++) e += (px[i * 4 + c] - q.palette[q.indices[i] * 4 + c]) ** 2
    }
    return e
  }
  assert.ok(error(256) < error(16))
  assert.ok(error(16) < error(2))
})

test('the same pixels and count always give the same palette and indices', () => {
  const px = photo(48, 48)
  const a = quantise(px, 32)
  const b = quantise(px.slice(), 32)
  assert.deepEqual(a.palette, b.palette)
  assert.deepEqual(a.indices, b.indices)
})

test('a picture with few colours passes through exactly', () => {
  const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255])
  const q = quantise(px, 8)
  assert.equal(q.size, 3)
  for (let i = 0; i < 4; i++) {
    for (let c = 0; c < 4; c++) assert.equal(q.palette[q.indices[i] * 4 + c], px[i * 4 + c])
  }
})

test('transparent pixels keep their own entry and stay transparent', () => {
  const px = photo(32, 32)
  for (let i = 0; i < 40; i++) px[i * 4 + 3] = 0
  const q = quantise(px, 16)
  assert.ok(q.size <= 16)
  for (let i = 0; i < 40; i++) assert.equal(q.palette[q.indices[i] * 4 + 3], 0)
  for (let i = 40; i < 1024; i++) assert.equal(q.palette[q.indices[i] * 4 + 3], 255)
})

test('the count is held to 2 to 256', () => {
  const px = photo(32, 32)
  assert.ok(quantise(px, 1).size <= COLOURS_MIN)
  assert.ok(quantise(px, 9999).size <= COLOURS_MAX)
})

test('bit depth follows the palette size', () => {
  assert.deepEqual([2, 3, 4, 5, 16, 17, 256].map(bitDepthFor), [1, 2, 2, 4, 4, 8, 8])
})

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926)
})

function readChunks(png) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const chunks = []
  for (let at = 8; at < png.length;) {
    const len = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const data = png.subarray(at + 8, at + 8 + len)
    assert.equal(view.getUint32(at + 8 + len), crc32(png.subarray(at + 4, at + 8 + len)), `crc of ${type}`)
    chunks.push({ type, data })
    at += 12 + len
  }
  return chunks
}

test('an indexed PNG reads back to the same indices at every bit depth', async () => {
  for (const size of [2, 4, 16, 200]) {
    const w = 13
    const h = 7
    const indices = new Uint8Array(w * h).map((_, i) => (i * 7) % size)
    const palette = new Uint8Array(size * 4)
    for (let i = 0; i < size; i++) palette.set([i, 255 - i, (i * 3) & 255, 255], i * 4)
    const png = await encodeIndexedPng(w, h, indices, palette)
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    const chunks = readChunks(png)
    assert.deepEqual(chunks.map(c => c.type), ['IHDR', 'PLTE', 'IDAT', 'IEND'])
    const head = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset)
    const depth = bitDepthFor(size)
    assert.deepEqual([head.getUint32(0), head.getUint32(4), chunks[0].data[8], chunks[0].data[9]], [w, h, depth, 3])
    assert.equal(chunks[1].data.length, size * 3)
    const raw = zlib.inflateSync(chunks[2].data)
    const stride = Math.ceil((w * depth) / 8)
    assert.equal(raw.length, (stride + 1) * h)
    for (let y = 0; y < h; y++) {
      assert.equal(raw[y * (stride + 1)], 0)
      for (let x = 0; x < w; x++) {
        const bit = x * depth
        const byte = raw[y * (stride + 1) + 1 + (bit >> 3)]
        const got = depth === 8 ? byte : (byte >> (8 - depth - (bit % 8))) & ((1 << depth) - 1)
        assert.equal(got, indices[y * w + x], `${size} colours at ${x},${y}`)
      }
    }
  }
})

test('transparent palette entries get a tRNS chunk, trimmed after the last one that needs it', async () => {
  const palette = new Uint8Array([0, 0, 0, 0, 10, 20, 30, 128, 1, 2, 3, 255, 4, 5, 6, 255])
  const png = await encodeIndexedPng(2, 2, new Uint8Array([0, 1, 2, 3]), palette)
  const trns = readChunks(png).find(c => c.type === 'tRNS')
  assert.deepEqual([...trns.data], [0, 128])
  const opaque = await encodeIndexedPng(1, 1, new Uint8Array([0]), new Uint8Array([1, 2, 3, 255]))
  assert.equal(readChunks(opaque).some(c => c.type === 'tRNS'), false)
})

test('quantising then writing makes a file well under the raw pixel bytes', async () => {
  const w = 64
  const h = 64
  const px = photo(w, h)
  const q = quantise(px, 16)
  const png = await encodeIndexedPng(w, h, q.indices, q.palette)
  assert.ok(png.length < (w * h * 3) / 2, `${png.length} bytes`)
})
