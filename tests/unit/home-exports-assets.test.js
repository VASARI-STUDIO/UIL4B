// The homepage export renders: every file the manifest names exists, is the size
// it says, stays inside its byte budget, and is no wider than its master.
// The manifest and the files are written by scripts/home-exports/generate.mjs.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { HOME_EXPORTS } from '../../src/data/homeExports.generated.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = path.join(root, 'public', 'home-exports')
const KB = 1000

// Kept apart from the script on purpose: a loosened budget there must not pass here.
const BUDGET = {
  landscape: { 800: 70 * KB, 1600: 180 * KB, 2400: 320 * KB },
  portrait: { 400: 40 * KB, 800: 110 * KB, 1200: 200 * KB },
  cover: { 360: 25 * KB, 720: 70 * KB, 1080: 130 * KB },
  total: 2400 * KB,
}
const FILES_EXPECTED = 36

/** Width and height read from a WebP file's own header (VP8, VP8L or VP8X). */
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
  if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) } }
  return null
}

function variantsOf(manifest) {
  const out = []
  for (const item of [...manifest.plates, ...manifest.covers]) {
    for (const orient of ['landscape', 'portrait']) {
      if (item[orient]) out.push({ item, orient, v: item[orient], shape: item.kind === 'cover' && orient === 'portrait' ? 'cover' : orient })
    }
  }
  return out
}

/** Every way the manifest and the folder can disagree with the spec; empty when sound. */
export function problems(manifest, dir = DIR, budget = BUDGET) {
  const errs = []
  let total = 0
  let count = 0
  const named = new Set()
  for (const { item, orient, v, shape } of variantsOf(manifest)) {
    for (const f of v.files) {
      count += 1
      named.add(f.file)
      const at = `${item.id} ${orient} ${f.file}`
      const full = path.join(dir, f.file)
      if (!fs.existsSync(full)) { errs.push(`${at}: file is missing`); continue }
      const buf = fs.readFileSync(full)
      total += buf.length
      if (buf.length !== f.bytes) errs.push(`${at}: ${buf.length} bytes on disk, manifest says ${f.bytes}`)
      if (createHash('sha256').update(buf).digest('hex') !== f.sha256) errs.push(`${at}: sha256 differs from the manifest`)
      const size = webpSize(buf)
      if (!size) errs.push(`${at}: not a WebP`)
      else if (size.w !== f.w || size.h !== f.h) errs.push(`${at}: header says ${size.w}x${size.h}, manifest says ${f.w}x${f.h}`)
      if (f.w > v.master.w) errs.push(`${at}: ${f.w}w is wider than its ${v.master.w}w master`)
      if (Math.abs(f.w / f.h - v.aspect) / v.aspect > 0.005) errs.push(`${at}: aspect ${(f.w / f.h).toFixed(4)} is off the plate's ${v.aspect}`)
      const cap = budget[shape][f.w]
      if (cap === undefined) errs.push(`${at}: ${f.w}w is not one of the allowed widths`)
      else if (f.bytes > cap || buf.length > cap) errs.push(`${at}: ${buf.length} bytes is over its ${cap} budget`)
    }
  }
  if (count !== FILES_EXPECTED) errs.push(`${count} files named, expected ${FILES_EXPECTED}`)
  if (total > budget.total) errs.push(`folder is ${total} bytes, over its ${budget.total} budget`)
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.webp') && !named.has(f)) errs.push(`${f}: in the folder but not in the manifest`)
  }
  return errs
}

test('every file the manifest names exists, in budget, no wider than its master', () => {
  assert.deepEqual(problems(HOME_EXPORTS), [])
})

test('three plates and three covers, in tab order', () => {
  assert.deepEqual(HOME_EXPORTS.plates.map((p) => p.id), ['book-colour', 'guide-palette', 'kit-colour'])
  assert.deepEqual(HOME_EXPORTS.covers.map((p) => p.id), ['cover-northbeam', 'cover-halcyon', 'cover-ferrule'])
  for (const p of HOME_EXPORTS.plates) assert.ok(p.landscape && p.portrait, `${p.id} needs both shapes`)
  // A cover has the A4 cover (portrait, every width up to 760) and a cover-and-contents
  // spread (landscape, from 761), each with its own aspect.
  for (const c of HOME_EXPORTS.covers) {
    assert.ok(c.landscape && c.portrait, `${c.id} needs the spread and the A4 cover`)
    assert.equal(c.landscape.aspect, 1.4142, `${c.id}'s spread is two A4 pages side by side`)
    assert.equal(c.portrait.aspect, 0.7071, `${c.id}'s cover is one A4 page`)
    assert.ok(c.landscape.files.every((f) => f.file.includes('-spread-')), `${c.id}'s spread files are named -spread-`)
  }
  for (const i of [...HOME_EXPORTS.plates, ...HOME_EXPORTS.covers]) assert.ok(i.alt && i.tab && i.tabName && i.sourceSha256, `${i.id} needs alt, tab, tabName and a source hash`)
})

test('the checks can fail: a bad manifest is caught', () => {
  const copy = () => JSON.parse(JSON.stringify(HOME_EXPORTS))
  const missing = copy()
  missing.plates[0].landscape.files[0].file = 'does-not-exist.webp'
  assert.match(problems(missing).join('\n'), /file is missing/)
  const wide = copy()
  wide.plates[0].landscape.master.w = 1000
  assert.match(problems(wide).join('\n'), /wider than its 1000w master/)
  // The byte budget, on the real files: a budget one byte under a real file's
  // size must flag that file, so a dropped budget check fails here.
  const one = HOME_EXPORTS.covers[0].portrait.files[0]
  const tight = JSON.parse(JSON.stringify(BUDGET))
  tight.cover[one.w] = one.bytes - 1
  assert.ok(problems(copy(), DIR, tight).some((e) => e.endsWith(`${one.file}: ${one.bytes} bytes is over its ${one.bytes - 1} budget`)), 'a cover over its budget is caught')
  const sp = HOME_EXPORTS.covers[0].landscape.files[0]
  const tightSpread = JSON.parse(JSON.stringify(BUDGET))
  tightSpread.landscape[sp.w] = sp.bytes - 1
  assert.ok(problems(copy(), DIR, tightSpread).some((e) => e.endsWith(`${sp.file}: ${sp.bytes} bytes is over its ${sp.bytes - 1} budget`)), 'a spread is held to the landscape budget')
  const folder = JSON.parse(JSON.stringify(BUDGET))
  folder.total = 1
  assert.match(problems(copy(), DIR, folder).join('\n'), /folder is \d+ bytes, over its 1 budget/)
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'home-exports-empty-'))
  try {
    const errs = problems(copy(), empty).join('\n')
    assert.match(errs, /file is missing/)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }
})
