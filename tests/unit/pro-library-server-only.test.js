// The Pro rows of the Palette, Gradient and Prompt libraries live in
// api/_lib/library/ only. The browser's copy (src/data/) holds the free rows in
// full and every other row as a stub, and a Pro account fetches the rest from
// GET /api/ai?library=<kind>.
//
// Three things must stay true, and each has a test below:
//   1. src/data/*.js are exactly what emitClient.js renders from the server data
//      (so nobody hand-edits them, and a library edit is followed by a re-emit).
//   2. No Pro value (colours, gradient stops, prompt text) appears in any file
//      under src/ or public/.
//   3. Nothing under src/ imports the server library, which would pull every
//      Pro row into the bundle.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { freeSplit, LIBRARIES } from '../../scripts/library/clientRows.js'
import { BRAND_PALETTES } from '../../api/_lib/library/brandPalettes.js'
import { renderClientFiles } from '../../scripts/library/emitClient.js'
import { isStub } from '../../src/utils/libraryRules.js'

const ROOT = process.cwd()
const normal = (text) => text.replace(/\r\n/g, '\n')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(?:jsx?|mjs|json|css|html|txt|md)$/.test(entry.name) ? [full] : []
  })
}

test('src/data library files are exactly what emitClient.js renders', () => {
  const files = renderClientFiles()
  assert.equal(Object.keys(files).length, 4)
  for (const [file, text] of Object.entries(files)) {
    const committed = normal(fs.readFileSync(path.join(ROOT, file), 'utf8'))
    assert.equal(
      committed, normal(text),
      `${file} differs from a fresh render: run \`node scripts/library/emitClient.js\` and commit the result`,
    )
  }
})

// A brand marked free is free in the Palette Builder's Brands panel (pickBrand
// only asks for Pro when `!b.free`), so its colours ship in the free bundle as
// BRAND_ROWS whatever its Palette Library row's place in the library. Its library
// row is beyond the library's free cap, which is why it is listed as withheld.
const FREE_BRAND_ROWS = new Set(BRAND_PALETTES.filter((brand) => brand.free === true).map((brand) => `brand-${brand.id}`))

/** The values a Pro row withholds, as the exact text a bundle would hold them in. */
function proValues() {
  const found = []
  for (const kind of Object.keys(LIBRARIES)) {
    const free = new Set(freeSplit(kind).open.map((item) => item.id))
    for (const item of LIBRARIES[kind]) {
      if (free.has(item.id)) continue
      if (kind === 'palettes' && FREE_BRAND_ROWS.has(item.id)) continue
      if (Array.isArray(item.colors)) found.push({ kind, id: item.id, needle: JSON.stringify(item.colors) })
      if (Array.isArray(item.stops)) found.push({ kind, id: item.id, needle: JSON.stringify(item.stops) })
      if (typeof item.text === 'string') {
        // A prompt's text is the product. Its first long line is enough to find it.
        found.push({ kind, id: item.id, needle: item.text.slice(0, 120) })
        found.push({ kind, id: item.id, needle: JSON.stringify(item.text).slice(1, 120) })
      }
    }
  }
  return found
}

test('every library has Pro rows to look for', () => {
  const values = proValues()
  for (const kind of Object.keys(LIBRARIES)) {
    assert.ok(values.some((v) => v.kind === kind), `no Pro ${kind} row found: the check below would pass on nothing`)
  }
})

test('no file under src/ or public/ holds a Pro row\'s values', () => {
  const values = proValues()
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'public'))]
  assert.ok(files.length > 100, `expected to walk the whole of src/ and public/, found ${files.length} files`)
  for (const file of files) {
    const text = normal(fs.readFileSync(file, 'utf8'))
    for (const { kind, id, needle } of values) {
      assert.ok(!text.includes(needle), `${path.relative(ROOT, file)} holds the values of Pro ${kind} row ${id}`)
    }
  }
})

test('the browser rows are the whole library in order: full where free, a stub elsewhere', async () => {
  const { LIBRARY_PALETTE_ROWS } = await import('../../src/data/paletteLibrary.js')
  const { LIBRARY_GRADIENT_ROWS } = await import('../../src/data/gradientLibrary.js')
  const { COMMUNITY_PROMPT_ROWS } = await import('../../src/data/communityPrompts.js')
  const shipped = { palettes: LIBRARY_PALETTE_ROWS, gradients: LIBRARY_GRADIENT_ROWS, prompts: COMMUNITY_PROMPT_ROWS }
  for (const kind of Object.keys(LIBRARIES)) {
    const free = new Set(freeSplit(kind).open.map((item) => item.id))
    assert.ok(free.size > 0 && free.size < LIBRARIES[kind].length, `${kind}: the free set should be a real subset`)
    assert.deepEqual(shipped[kind].map((row) => row.id), LIBRARIES[kind].map((item) => item.id), `${kind}: ids and order`)
    for (const row of shipped[kind]) {
      assert.equal(isStub(row), !free.has(row.id), `${kind} row ${row.id}: full exactly when free`)
    }
  }
})

test('nothing under src/ imports the server-only library', () => {
  for (const file of walk(path.join(ROOT, 'src')).filter((f) => /\.(?:jsx?|mjs)$/.test(f))) {
    const code = normal(fs.readFileSync(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
    assert.ok(!/api\/_lib\/library|_lib\/library\//.test(code), `${path.relative(ROOT, file)} imports api/_lib/library`)
  }
})
