// GET /api/ai?palettePreview=<id> is what a locked Discover card draws in place of the palette: the
// stops blurred sideways until they run together. This pins what that picture must be and must not be.
//
//   a real PNG        signature, IHDR 320 x 74 8-bit RGB, every chunk's CRC, pixel data that inflates
//   small             under 6 KB, so a page of four cards costs almost nothing
//   no hex anywhere   neither as text in the bytes, nor as a pixel that IS a stop (a stop drawn sharp
//                     would hand the colour over as surely as the code does)
//   blurred           neighbouring columns differ by far less than a hard stop does
//
// MUTATION (made, the named tests went red, then restored):
//   preview.js  PREVIEW_SIGMA = 0   -> "neighbouring columns differ by less than a hard stop",
//                                      "no stop keeps its own colour at its centre"
//   preview.js  PREVIEW_MEAN_MIX = 0 and clamped edges (the old renderer)
//                                   -> "no pixel of the picture is within 24 per channel of any of the palette's stops"
//   preview.js  the PNG body writes the palette's hex text (a tEXt chunk of the colours)
//                                   -> "no hex string of the palette is in the bytes"
import test from 'node:test'
import assert from 'node:assert/strict'
import { previewPng, previewRow, servePalettePreview, PREVIEW_WIDTH, PREVIEW_HEIGHT, PREVIEW_SIGMA } from '../../api/_lib/library/preview.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { decodePng, pixel, hexRgb, hexNeedles } from '../helpers/png.js'

// Four stops with big steps between them, so "blurred" and "hard" are far apart. Hand-checked, the
// largest channel step at each boundary: 0B -> F2 is 231 (red), F2 -> C9 is 78 (green), C9 -> 4B is 211 (green).
const STOPS = ['#0B2A45', '#F2A488', '#C9F24D', '#4B1F9E']
const HARD_STEP = (a, b) => Math.max(...hexRgb(a).map((v, i) => Math.abs(v - hexRgb(b)[i])))

const png = previewPng(STOPS)
const picture = decodePng(png)
const row = picture.rows[0]

test('the fixture palette has hard stops far bigger than the blur allows', () => {
  const steps = [0, 1, 2].map((i) => HARD_STEP(STOPS[i], STOPS[i + 1]))
  assert.deepEqual(steps, [231, 78, 211])
  assert.ok(Math.max(...steps) >= 200, 'a hard-edged picture of this palette would step by 200 or more between two columns')
})

test('previewPng returns a PNG: signature, IHDR 320 x 74, 8-bit RGB, IDAT, IEND', () => {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  // IHDR is the first chunk: length 13, then the type, then width and height.
  assert.equal(png.readUInt32BE(8), 13)
  assert.equal(png.toString('ascii', 12, 16), 'IHDR')
  assert.equal(png.readUInt32BE(16), 320)
  assert.equal(png.readUInt32BE(20), 74)
  assert.equal(PREVIEW_WIDTH, 320)
  assert.equal(PREVIEW_HEIGHT, 74)
  assert.equal(png[24], 8, 'bit depth')
  assert.equal(png[25], 2, 'colour type: RGB')
  // decodePng checks every chunk's CRC and that the inflated data is exactly height rows of width pixels.
  assert.deepEqual(picture.chunks, ['IHDR', 'IDAT', 'IEND'])
  assert.equal(picture.rows.length, 74)
  assert.equal(picture.rows[0].length, 320 * 3)
})

test('the picture is under 6 KB', () => {
  assert.ok(png.length < 6 * 1024, `the picture is ${png.length} bytes`)
})

test('every row of the picture is the same', () => {
  for (const r of picture.rows) assert.deepEqual([...r], [...row])
})

test('no hex string of the palette is in the bytes', () => {
  for (const hex of STOPS) {
    for (const needle of hexNeedles(hex)) {
      assert.ok(!png.includes(Buffer.from(needle, 'ascii')), `${needle} is in the picture's bytes`)
    }
  }
  // A text chunk by another name: the file is three chunks and nothing else.
  assert.deepEqual(picture.chunks, ['IHDR', 'IDAT', 'IEND'])
})

const exactStopColumns = (from, to) => {
  const stops = STOPS.map(hexRgb)
  const found = []
  for (let x = from; x < to; x++) {
    const p = pixel(row, x)
    if (stops.some((s) => s.every((v, i) => v === p[i]))) found.push(x)
  }
  return found
}

test('between the two outer stops no pixel is exactly one of the palette\'s stops', () => {
  // Columns 20 to 298. The outer stops are tested on their own, below.
  assert.deepEqual(exactStopColumns(20, 299), [])
})

// The blur used to clamp at the strip's edges, which left the first 20 and last 21 columns exactly the
// first and last stop's colour, and the middle stops within 9 to 10 of theirs. The blur now wraps round
// and every column is pulled toward the mean, so a colour picker finds none of the stops anywhere.
const closestToAStop = () => {
  const stops = STOPS.map(hexRgb)
  let best = Infinity
  for (let x = 0; x < PREVIEW_WIDTH; x++) {
    const p = pixel(row, x)
    for (const s of stops) best = Math.min(best, Math.max(...s.map((v, i) => Math.abs(v - p[i]))))
  }
  return best
}

test('no pixel of the picture is within 24 per channel of any of the palette\'s stops, outer stops included', () => {
  assert.deepEqual(exactStopColumns(0, PREVIEW_WIDTH), [])
  const closest = closestToAStop()
  assert.ok(closest > 24, `a pixel is within ${closest} per channel of a stop`)
})

test('every palette in the library comes out at least 25 per channel from each of its own stops', () => {
  assert.ok(LIBRARY_PALETTES.length > 50, 'the library is loaded')
  for (const p of LIBRARY_PALETTES) {
    const r = previewRow(p.colors)
    const stops = p.colors.map(hexRgb)
    for (let x = 0; x < PREVIEW_WIDTH; x++) {
      const px = pixel(r, x)
      for (const s of stops) {
        const d = Math.max(...s.map((v, i) => Math.abs(v - px[i])))
        assert.ok(d >= 25, `${p.id}: column ${x} is within ${d} of a stop`)
      }
    }
  }
})

test('neighbouring columns differ by less than a hard stop', () => {
  let widest = 0
  for (let x = 1; x < PREVIEW_WIDTH; x++) {
    const a = pixel(row, x - 1)
    const b = pixel(row, x)
    widest = Math.max(widest, ...a.map((v, i) => Math.abs(v - b[i])))
  }
  // A Gaussian of sigma 30 across a step of 231 climbs at most 231 / (30 * sqrt(2 * pi)) = 3.1 a column.
  // The hard stops are 78, 211 and 231, so anything under 10 is a blur and anything near 200 is not.
  assert.ok(widest < 10, `adjacent columns differ by ${widest}; sigma is ${PREVIEW_SIGMA}`)
  // ...and it is a picture of the palette, not a flat one: the strip wraps, so its two ends now meet
  // (they used to be the first and last stop, 60 or more apart); instead the colour must travel by 60 or
  // more somewhere along it, and climb from column to column (a blank or black strip would pass "< 10").
  let spread = 0
  for (let k = 0; k < 3; k++) {
    const ch = [...Array(PREVIEW_WIDTH).keys()].map((x) => pixel(row, x)[k])
    spread = Math.max(spread, Math.max(...ch) - Math.min(...ch))
  }
  assert.ok(spread >= 60, `the strip only travels ${spread} in any channel`)
  assert.ok(widest >= 1, `the strip never changes by more than ${widest} between columns`)
  // The seam where the strip wraps is no step either.
  const a = pixel(row, PREVIEW_WIDTH - 1)
  const b = pixel(row, 0)
  assert.ok(Math.max(...a.map((v, i) => Math.abs(v - b[i]))) < 10, 'the strip has a hard seam at its ends')
})

test('the picture still carries the palette\'s mood: its average colour is the stops\' average', () => {
  const mean = [0, 1, 2].map((k) => Math.round(STOPS.reduce((n, hex) => n + hexRgb(hex)[k], 0) / STOPS.length))
  const got = [0, 1, 2].map((k) => Math.round([...Array(PREVIEW_WIDTH).keys()].reduce((n, x) => n + pixel(row, x)[k], 0) / PREVIEW_WIDTH))
  assert.deepEqual(mean, [132, 120, 110], 'hand-checked average of the four stops')
  got.forEach((v, k) => assert.ok(Math.abs(v - mean[k]) <= 12, `channel ${k}: the picture averages ${v}, the stops ${mean[k]}`))
})

test('the same colours give the same bytes, and different colours give different ones', () => {
  assert.ok(previewPng(STOPS).equals(png))
  assert.ok(!previewPng(['#222831', '#393E46', '#00ADB5', '#EEEEEE']).equals(png))
})

test('a palette with no colours still returns a picture, in grey', () => {
  // A neutral mid grey, flat across the strip. Its exact level is the
  // renderer's (the read-back guard may shift it), not part of the promise.
  const grey = decodePng(previewPng([]))
  const [a, b] = [pixel(grey.rows[0], 0), pixel(grey.rows[0], 319)]
  assert.deepEqual(a, b, 'flat')
  assert.ok(a[0] === a[1] && a[1] === a[2], `neutral: ${a}`)
  assert.ok(a[0] >= 64 && a[0] <= 192, `mid grey: ${a}`)
})

// ── The route's answer ─────────────────────────────────────────────────────────────────────────────
function fakeRes() {
  const res = {
    statusCode: null, body: null, ended: null, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
    end(body) { res.ended = body; return res },
  }
  return res
}
const ROWS = [{ id: 'teal-dusk', name: 'Teal Dusk', colors: STOPS }]

test('a known id is answered with image/png, cached, and the same bytes previewPng makes', () => {
  const res = fakeRes()
  servePalettePreview({ query: { palettePreview: 'teal-dusk' } }, res, ROWS)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['Content-Type'], 'image/png')
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff')
  assert.match(res.headers['Cache-Control'], /public, max-age=\d+/)
  assert.ok(Buffer.isBuffer(res.ended) && res.ended.equals(png))
})

test('an unknown id, a missing id, a list and an over-long id are refused with no colour in the answer', () => {
  for (const id of ['nope', undefined, ['teal-dusk'], 'x'.repeat(81)]) {
    const res = fakeRes()
    servePalettePreview({ query: { palettePreview: id } }, res, ROWS)
    assert.equal(res.statusCode, 404, `id ${JSON.stringify(id)}`)
    assert.equal(res.ended, null)
    assert.deepEqual(res.body, { error: 'No such palette' })
  }
})
