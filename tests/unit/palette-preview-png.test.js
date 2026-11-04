// GET /api/ai?palettePreview=<id> is what a locked Discover card draws in place of the palette: a soft
// three-tone wash (the palette's mean and its two most distinct stops, snapped to a coarse grid).
// This pins what that picture must be and must not be.
//
//   a real PNG        signature, IHDR 320 x 74 8-bit RGB, every chunk's CRC, pixel data that inflates
//   small             under 6 KB, so a page of four cards costs almost nothing
//   no hex anywhere   neither as text in the bytes, nor as a pixel that IS a stop
//   not invertible    the earlier renderer (a block per stop, a public Gaussian blur, a pull to the mean)
//                     is a linear map of the stops, so least squares over its 320 columns gave each stop
//                     back to within a few levels. The fit below is run on that renderer (copied in here)
//                     to show the attack works, then on the current one, which must leave every
//                     recovered stop 25 or more levels from every true stop
//   soft              neighbouring columns differ by far less than a hard stop does
//
// MUTATION (made, the named tests went red, then restored):
//   preview.js  previewRow is the old block-and-blur renderer
//                                   -> "no stop of the fixture can be fitted back out of the picture",
//                                      "no stop of any library palette can be fitted back out of the picture"
//   preview.js  the PNG body writes the palette's hex text (a tEXt chunk of the colours)
//                                   -> "no hex string of the palette is in the bytes"
import test from 'node:test'
import assert from 'node:assert/strict'
import { previewPng, previewRow, servePalettePreview, PREVIEW_WIDTH, PREVIEW_HEIGHT } from '../../api/_lib/library/preview.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { decodePng, pixel, hexRgb, hexNeedles } from '../helpers/png.js'
import { oldBlurRow, fitStops, bestRecovery, nearestTrue } from '../helpers/previewAttack.js'

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

test('neighbouring columns differ by far less than a hard stop', () => {
  let widest = 0
  for (let x = 1; x < PREVIEW_WIDTH; x++) {
    const a = pixel(row, x - 1)
    const b = pixel(row, x)
    widest = Math.max(widest, ...a.map((v, i) => Math.abs(v - b[i])))
  }
  // Smoothstep between tones a third of the strip (107 columns) apart climbs at most 1.5 x 255 / 107 = 3.6
  // a column. The hard stops are 78, 211 and 231, so anything under 10 is soft and anything near 200 is not.
  assert.ok(widest < 10, `adjacent columns differ by ${widest}`)
  // ...and it is a picture of the palette, not a flat one: the colour must travel by 60 or more somewhere
  // along it, and climb from column to column (a blank or black strip would pass "< 10").
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

test("the picture still carries the palette's mood: its two most distinct stops show, and it is about as light as the palette", () => {
  // The picture is the mean and the two stops furthest apart (here #0B2A45 and #C9F24D), each snapped to a
  // coarse grid and possibly lifted or dropped as a whole to clear the stops, so "shows" is within 64 of
  // one channel, not exact (the clearance test above is what keeps it from being exact).
  const columns = [...Array(PREVIEW_WIDTH).keys()].map((x) => pixel(row, x))
  for (const hex of ['#0B2A45', '#C9F24D']) {
    const s = hexRgb(hex)
    const nearest = Math.min(...columns.map((p) => Math.max(...p.map((v, i) => Math.abs(v - s[i])))))
    assert.ok(nearest <= 64, `no column is within 64 of ${hex}; the nearest is ${nearest}`)
  }
  const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  const stopsLuma = STOPS.map(hexRgb).reduce((n, c) => n + luma(c), 0) / STOPS.length
  const pictureLuma = columns.reduce((n, c) => n + luma(c), 0) / columns.length
  assert.ok(Math.abs(pictureLuma - stopsLuma) <= 40, `the picture's lightness is ${pictureLuma.toFixed(0)}, the stops' ${stopsLuma.toFixed(0)}`)
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

// The fit has to be a reading of this picture, not noise. A wrong stop count throws up a dozen colours that
// explain nothing, and one of them lands near a true stop now and then by chance (on this fixture an 8-stop
// fit puts one at 19.5 while leaving a 6.5-level error in the picture). So a fit only counts if it
// reproduces the picture to within RESIDUAL_LIMIT level on every column and every stop it recovers is a
// real colour (see tests/helpers/previewAttack.js). Exact stops would leave half a level of rounding.
test("the fit recovers the fixture's stops from the earlier renderer (the attack is real)", () => {
  const old = oldBlurRow(STOPS)
  const { stops, residual } = fitStops(old, STOPS.length)
  assert.ok(residual <= 1, `the fit leaves ${residual.toFixed(2)} levels unexplained`)
  STOPS.forEach((hex, j) => {
    const gap = Math.max(...hexRgb(hex).map((v, i) => Math.abs(v - stops[j][i])))
    assert.ok(gap <= 6, `stop ${j} (${hex}) is recovered to within ${gap.toFixed(1)}`)
  })
  assert.ok(bestRecovery(old, STOPS).gap <= 6)
})

test('no stop of the fixture can be fitted back out of the picture (stop counts 2 to 12)', () => {
  const { gap, n } = bestRecovery(row, STOPS)
  assert.ok(gap > 24, `a fit with ${n} stops lands within ${gap.toFixed(1)} levels of a true stop`)
  // Nor is there a near miss: not one stop count gives a fit that explains the picture.
  assert.equal(gap, Infinity)
})

test('no stop of any library palette can be fitted back out of the picture (its own stop count)', () => {
  // The attacker's best case: the palette's real stop count, as the number of blocks to solve for.
  let controlRecovered = 0
  for (const p of LIBRARY_PALETTES) {
    const n = Math.max(2, Math.min(12, p.colors.length))
    const truth = p.colors.map(hexRgb)
    const now = fitStops(previewRow(p.colors), n)
    if (now.plausible && now.residual <= 1) {
      assert.ok(nearestTrue(now.stops, truth) > 24, `${p.id}: a fit with ${n} stops explains the picture and lands within 24 of a true stop`)
    }
    // The same fit on the earlier renderer, to show the loop is able to find something.
    const then = fitStops(oldBlurRow(p.colors), n)
    if (then.plausible && then.residual <= 1 && nearestTrue(then.stops, truth) <= 24) controlRecovered++
  }
  assert.ok(controlRecovered >= 20, `only ${controlRecovered} palettes give their stops up to the earlier renderer; the fit is too weak to prove anything`)
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

test('an unknown id, a missing id and an over-long id are refused with no colour in the answer', () => {
  for (const id of ['nope', undefined, 'x'.repeat(81)]) {
    const res = fakeRes()
    servePalettePreview({ query: { palettePreview: id } }, res, ROWS)
    assert.equal(res.statusCode, 404, `id ${JSON.stringify(id)}`)
    assert.equal(res.ended, null)
    assert.deepEqual(res.body, { error: 'No such palette' })
  }
})

test('a repeated palettePreview key (a list) is refused as a bad request, with no colour in the answer', () => {
  // The query-key guard answers before the lookup: a repeated key is a second spelling of one request.
  const res = fakeRes()
  servePalettePreview({ query: { palettePreview: ['teal-dusk'] } }, res, ROWS)
  assert.equal(res.statusCode, 400)
  assert.equal(res.ended, null)
  assert.deepEqual(res.body, { error: 'Unexpected query parameter' })
  assert.ok(!/#?[0-9a-f]{6}/i.test(JSON.stringify(res.body)), 'a colour reached the refusal')
})
