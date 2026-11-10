// The stand-in pictures a locked image preview loads in place of the real one
// (scripts/library/lockedStandins.mjs, src/utils/lockedStandin.js).
//
// Pinned here:
//   1. every source picture has a stand-in on disk, and nothing else is in the folder;
//   2. a stand-in is small enough that it cannot carry detail, in pixels and in bytes;
//   3. the address helpers point at the stand-in and never hand the real address back.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { standinJobs, STANDIN_DIR, STANDIN_MAX_W } from '../../scripts/library/lockedStandins.mjs'
import { promptStandinSrc, themeStandinSrc, themeStandinShots } from '../../src/utils/lockedStandin.js'
import { themeShots, pickerTheme } from '../../src/config/exportThemePicker.js'

// Width and height of a WebP, from its header (lossy, lossless or extended).
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF')
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP')
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (kind === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }
  }
  return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 }
}

const files = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.webp')).sort() : [])

test('every source picture has a stand-in, and the folder holds nothing else', () => {
  const jobs = standinJobs()
  assert.ok(jobs.length >= 50, 'the 20 prompt posters and the 30 theme book and guidelines pictures')
  for (const job of jobs) assert.ok(fs.existsSync(job.to), `${job.to} is missing: run node scripts/library/lockedStandins.mjs`)
  const expected = new Set(jobs.map((j) => path.posix.normalize(j.to)))
  for (const sub of ['prompts', 'export-themes']) {
    for (const name of files(`${STANDIN_DIR}/${sub}`)) assert.ok(expected.has(`${STANDIN_DIR}/${sub}/${name}`), `${sub}/${name} has no source`)
  }
})

test('a stand-in is too small to carry detail', () => {
  for (const job of standinJobs()) {
    const buf = fs.readFileSync(job.to)
    const { w, h } = webpSize(buf)
    // The width is capped; a portrait page (A4) is taller than it is wide, so the height is held by the area a square
    // STANDIN_MAX_W picture would have, not by the width.
    assert.ok(w <= STANDIN_MAX_W && w * h <= STANDIN_MAX_W ** 2, `${job.to} is ${w}x${h}`)
    assert.ok(buf.length < 2048, `${job.to} is ${buf.length} bytes`)
  }
})

test('the address helpers point at stand-ins, never at the real picture', () => {
  assert.equal(promptStandinSrc('c-7'), '/locked-images/prompts/c-7.webp')
  assert.equal(themeStandinSrc('/export-themes/06-studio-book.webp'), '/locked-images/export-themes/06-studio-book.webp')
  // Anything that is not a theme picture comes back empty, not as itself.
  for (const other of ['/previews/prompts/poster/c-1.webp', '/export-themes/../secret.webp', '', undefined]) {
    assert.equal(themeStandinSrc(other), '')
  }
  for (const kind of ['book', 'guidelines']) {
    const real = themeShots(kind, pickerTheme('06-studio'))
    const stand = themeStandinShots(kind, pickerTheme('06-studio'))
    assert.equal(stand.length, real.length)
    stand.forEach((s, i) => {
      assert.ok(s.src.startsWith('/locked-images/export-themes/'), s.src)
      assert.notEqual(s.src, real[i].src)
      assert.ok(fs.existsSync(`public${s.src}`), `${s.src} is not on disk`)
    })
  }
})
