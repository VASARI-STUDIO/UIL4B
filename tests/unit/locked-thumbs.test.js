// The blurred previews on locked library cards (scripts/library/lockedThumbs.mjs).
//
// Three things are pinned:
//   1. where the key is present, the committed files are exactly what the
//      script renders now, so a library edit without a re-run fails here rather
//      than shipping a preview of a palette that has changed;
//   2. every palette and gradient has one preview, and nothing else is in the
//      folder;
//   3. the row's values cannot be got back from a preview. The blur and the
//      rounding are public and linear, so the test runs the best attack there
//      is on every file, a least-squares fit with the generator's own model, and
//      fails if what comes back is close to the real colours. It only ever finds
//      the shifted colours (shiftColours in the script).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { renderLockedThumbs, lockedThumbKey, THUMB_DIR, THUMB_W, THUMB_H, paintPalette, paintGradient, blurTwice } from '../../scripts/library/lockedThumbs.mjs'
import { LIBRARY_PALETTES } from '../../api/_lib/library/data.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/data.js'

// The shift is keyed (LOCKED_THUMB_KEY, never committed), so only a machine
// with the key can re-render the files. Everything else here reads the
// committed files, which is what ships.
const key = lockedThumbKey()
const committed = (rel) => fs.readFileSync(rel)

// The script writes 8-bit RGB with no filter, so a scanline is one filter byte
// then W * 3 channel bytes.
function pixels(buf) {
  let o = 8
  const idat = []
  while (o < buf.length) {
    const len = buf.readUInt32BE(o)
    const type = buf.toString('ascii', o + 4, o + 8)
    if (type === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len))
    o += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const px = []
  for (let y = 0; y < THUMB_H; y += 1) {
    const row = y * (THUMB_W * 3 + 1)
    assert.equal(raw[row], 0, 'a scanline uses a filter, so this decoder misreads it')
    for (let x = 0; x < THUMB_W; x += 1) {
      const i = row + 1 + x * 3
      px.push([raw[i], raw[i + 1], raw[i + 2]])
    }
  }
  return px
}

const rgb = (h) => {
  const v = String(h).replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

// Solves the small square system M x = b (Gauss-Jordan with partial pivoting).
function solve(M, b) {
  const n = M.length
  const a = M.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c += 1) {
    let p = c
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r
    ;[a[c], a[p]] = [a[p], a[c]]
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue
      const f = a[r][c] / a[c][c]
      for (let k = c; k <= n; k += 1) a[r][k] -= f * a[c][k]
    }
  }
  return a.map((r, i) => r[n] / r[i])
}

// The attack: the image is (blur of the painted row) rounded, and painting and
// blurring are linear in the colours, so each colour's footprint is found by
// painting it alone, and the colours by least squares over all the pixels.
function recover(count, paint, observed) {
  const footprints = []
  for (let j = 0; j < count; j += 1) {
    const basis = Array.from({ length: count }, (_, i) => (i === j ? [1, 1, 1] : [0, 0, 0]))
    footprints.push(blurTwice(paint(basis)).map((c) => c[0]))
  }
  const dot = (u, v) => u.reduce((sum, x, i) => sum + x * v[i], 0)
  const normal = footprints.map((u) => footprints.map((v) => dot(u, v)))
  return [0, 1, 2].map((ch) => solve(normal, footprints.map((u) => dot(u, observed.map((p) => p[ch])))))
}

test('the committed previews are what the script renders now', { skip: key ? false : 'LOCKED_THUMB_KEY is not set here' }, () => {
  for (const [rel, buf] of Object.entries(renderLockedThumbs(key))) {
    assert.ok(fs.existsSync(rel), `${rel} is missing: run node scripts/library/lockedThumbs.mjs`)
    assert.ok(committed(rel).equals(buf), `${rel} is stale: run node scripts/library/lockedThumbs.mjs`)
  }
})

test('every palette and gradient has one preview, and nothing else is in the folder', () => {
  const expected = new Set([
    ...LIBRARY_PALETTES.map((p) => `${THUMB_DIR}/palettes/${p.id}.png`),
    ...GALLERY_GRADIENTS.map((g) => `${THUMB_DIR}/gradients/${g.id}.png`),
  ])
  const onDisk = new Set()
  for (const kind of fs.readdirSync(THUMB_DIR)) {
    for (const f of fs.readdirSync(path.join(THUMB_DIR, kind))) onDisk.add(`${THUMB_DIR}/${kind}/${f}`)
  }
  assert.deepEqual(onDisk, expected, 'the folder holds a preview for a row that is gone, or lacks one')
})

test("a least-squares fit of a preview does not give back its row's colours", () => {
  const rows = [
    ...LIBRARY_PALETTES.map((p) => ({ rel: `${THUMB_DIR}/palettes/${p.id}.png`, colours: p.colors, paint: (cs) => paintPalette(cs) })),
    ...GALLERY_GRADIENTS.map((g) => ({ rel: `${THUMB_DIR}/gradients/${g.id}.png`, colours: g.stops.map((s) => s.color), paint: (cs) => paintGradient(g, cs) })),
  ]
  let total = 0
  let channels = 0
  for (const { rel, colours, paint } of rows) {
    const found = recover(colours.length, paint, pixels(committed(rel)))
    let rowTotal = 0
    colours.forEach((c, j) => {
      const real = rgb(c)
      const off = [0, 1, 2].map((ch) => Math.abs(found[ch][j] - real[ch]))
      assert.ok(Math.max(...off) >= 12, `${rel}: colour ${j + 1} comes back within ${Math.max(...off).toFixed(1)} on every channel`)
      rowTotal += off[0] + off[1] + off[2]
    })
    const rowMean = rowTotal / (colours.length * 3)
    assert.ok(rowMean >= 16, `${rel}: its colours come back ${rowMean.toFixed(1)} off on average`)
    total += rowTotal
    channels += colours.length * 3
  }
  assert.ok(total / channels >= 24, `the previews give the colours back ${(total / channels).toFixed(1)} off on average`)
})
