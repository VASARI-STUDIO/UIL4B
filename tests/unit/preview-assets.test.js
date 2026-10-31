// NO PREVIEW IMAGE MAY SHIP UNCREDITED, OR OVER ITS WEIGHT.
//
// Every file under public/previews/<folder>/ belongs to an entry in
// src/data/previewAssets.js and is named in public/previews/CREDITS.md, and
// every entry carries a source, an author and a licence. The files that sat in
// public/previews/ before the premium previews (cards.json, the og-*.png share
// images, x-card.png) and the two folders other features own (prompts, vendor)
// are not preview images and are left alone.
//
// Source scan and file sizes, not a render.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PREVIEW_ASSETS, assetFiles, EXTENSIONS } from '../../src/data/previewAssets.js'

const DIR = path.join(process.cwd(), 'public/previews')
// Folders under public/previews/ that other features own.
const OTHER_FEATURES = new Set(['prompts', 'vendor'])
const SOURCES = new Set(['Photo', 'Render', 'Generated', 'Map'])
// A source that has a page to link must say where (Generated and Render do not).
const NEEDS_URL = new Set(['Photo', 'Map'])

const KB = 1024
const BUDGET = { desktop: 300 * KB, phone: 140 * KB, mask: 40 * KB }

const entries = Object.entries(PREVIEW_ASSETS)

/** Every file under public/previews/<folder>/, as "folder/name". */
function filesOnDisk() {
  const out = []
  for (const dirent of fs.readdirSync(DIR, { withFileTypes: true })) {
    if (!dirent.isDirectory() || OTHER_FEATURES.has(dirent.name)) continue
    const walk = (rel) => {
      for (const d of fs.readdirSync(path.join(DIR, rel), { withFileTypes: true })) {
        const next = `${rel}/${d.name}`
        if (d.isDirectory()) walk(next)
        else out.push(next)
      }
    }
    walk(dirent.name)
  }
  return out
}

const credits = fs.readFileSync(path.join(DIR, 'CREDITS.md'), 'utf8')
const size = (rel) => fs.statSync(path.join(DIR, rel)).size

test('every file under public/previews/<folder>/ has an entry in previewAssets.js', () => {
  const owned = new Set(entries.flatMap(([, a]) => assetFiles(a)))
  const uncredited = filesOnDisk().filter((f) => !owned.has(f))
  assert.deepEqual(uncredited, [], `files with no entry in src/data/previewAssets.js: ${uncredited.join(', ')}`)
})

test('every file an entry names exists, and is named in CREDITS.md', () => {
  for (const [id, a] of entries) {
    for (const f of assetFiles(a)) {
      assert.ok(fs.existsSync(path.join(DIR, f)), `${id}: ${f} is missing`)
      assert.ok(credits.includes(`\`${f}\``), `${id}: ${f} is not listed in public/previews/CREDITS.md`)
    }
    assert.ok(credits.includes(`\`${id}\``), `${id} has no heading entry in CREDITS.md`)
  }
})

test('every entry has a source, an author and a licence, and a link where the source has a page', () => {
  assert.ok(entries.length > 0)
  for (const [id, a] of entries) {
    const c = a.credit
    assert.ok(c, `${id} has no credit`)
    assert.ok(SOURCES.has(c.source), `${id}: source "${c.source}" is not one of ${[...SOURCES].join(', ')}`)
    for (const key of ['author', 'licence', 'changes']) assert.ok(String(c[key] || '').trim(), `${id}: credit.${key} is empty`)
    if (NEEDS_URL.has(c.source)) assert.match(c.url, /^https:\/\//, `${id}: a ${c.source} needs the https URL of its licence page`)
    // The credit text in the data and in CREDITS.md agree.
    for (const key of ['author', 'licence']) assert.ok(credits.includes(c[key]), `${id}: CREDITS.md does not carry the ${key} "${c[key]}"`)
  }
})

test('a credit is not a history: no dates, no people on the team, no internal document names', () => {
  const text = `${credits}\n${JSON.stringify(entries.map(([, a]) => a.credit))}`
  assert.doesNotMatch(text, /\b(19|20)\d{2}\b/, 'a year in a credit reads as history')
  assert.doesNotMatch(text, /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/)
  assert.doesNotMatch(text, /\bhandover\b|design-\d{4}|session-log|\bDylan\b/i)
})

test('every image has real alt text, its size, and a placeholder that is a small data URI', () => {
  for (const [id, a] of entries) {
    assert.ok(a.alt && a.alt.trim().length >= 12, `${id}: alt text is missing or too short`)
    assert.ok(a.width > 0 && a.height > 0, `${id}: width and height are needed so the image reserves its space`)
    assert.match(a.placeholder, /^data:image\/(webp|jpeg|png|avif);base64,/, `${id}: the placeholder is not a data URI`)
    assert.ok(a.placeholder.length < 1200, `${id}: the placeholder is ${a.placeholder.length} characters; it should be a 16px blur`)
    assert.deepEqual([...a.widths], [...a.widths].sort((x, y) => x - y), `${id}: widths are not ascending`)
  }
})

test('a recolourable image has a mask, and a fixed one has none', () => {
  for (const [id, a] of entries) {
    assert.equal(Boolean(a.mask), Boolean(a.recolourable), `${id}: recolourable and mask disagree`)
    if (a.mask) assert.match(a.mask, /-mask\.png$/)
  }
})

test('the files fit the weight budgets: 300 KB at 1440, 140 KB at 390, masks 40 KB', () => {
  for (const [id, a] of entries) {
    for (const ext of EXTENSIONS) {
      const widest = size(`${a.folder}/${a.file}-${a.widths[a.widths.length - 1]}.${ext}`)
      const narrowest = size(`${a.folder}/${a.file}-${a.widths[0]}.${ext}`)
      assert.ok(widest <= BUDGET.desktop, `${id} ${ext} at ${a.widths[a.widths.length - 1]}w is ${widest} bytes, over 300 KB`)
      assert.ok(narrowest <= BUDGET.phone, `${id} ${ext} at ${a.widths[0]}w is ${narrowest} bytes, over 140 KB`)
    }
    if (a.mask) assert.ok(size(`${a.folder}/${a.mask}`) <= BUDGET.mask, `${id}: the mask is over 40 KB`)
  }
})

// The pixel size a lossy WebP and a PNG state in their headers.
const webpSize = (buf) => (buf.toString('latin1', 12, 16) === 'VP8 ' ? [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff] : null)
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)]

test('the files are the size the entry says, so the image reserves its space and nothing shifts', () => {
  for (const [id, a] of entries) {
    const widest = a.widths[a.widths.length - 1]
    for (const w of a.widths) {
      const dims = webpSize(fs.readFileSync(path.join(DIR, `${a.folder}/${a.file}-${w}.webp`)))
      if (!dims) continue
      assert.equal(dims[0], w, `${id}: the ${w}w WebP is ${dims[0]} pixels wide`)
      assert.ok(Math.abs(dims[1] - Math.round((a.height * w) / a.width)) <= 1, `${id}: the ${w}w WebP is ${dims[1]} tall, not in the proportions ${a.width} x ${a.height}`)
    }
    if (a.mask) {
      const [mw, mh] = pngSize(fs.readFileSync(path.join(DIR, `${a.folder}/${a.mask}`)))
      assert.equal(mw, widest, `${id}: the mask is ${mw} wide, the widest image is ${widest}`)
      assert.ok(Math.abs(mh - Math.round((a.height * widest) / a.width)) <= 1, `${id}: the mask is ${mh} tall, so it would not line up with the image`)
    }
  }
})
