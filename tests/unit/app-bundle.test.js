// The app-ready bundle: the file list, the README, the shared swatch bytes and the zip.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { appBundleEntries, buildAppBundle, bundleDate } from '../../src/utils/appBundle.js'
import { swatchGroups } from '../../src/utils/swatchFiles.js'

const DESIGN = {
  palette: { base: '#1F4B8E', harmony: 'analogous', activeIdx: 0, colors: ['#1f4b8e', '#2E7BB8', '#3FA9A0'] },
  states: { success: 1, warning: 0, error: { custom: 10 }, info: 2, infoHue: 'purple' },
  fonts: {
    heading: { family: 'Lora', weight: 700, category: 'serif' },
    body: { family: 'Open Sans', weight: 400, category: 'sans-serif' },
  },
}
const OPTS = { date: '2026-10-31', name: 'Lumen Studio' }
const ROOT = 'UIL4B-lumen-studio-2026-10-31'

const entries = appBundleEntries(DESIGN, OPTS)
const byPath = new Map(entries.map((e) => [e.path, e.data]))
const text = (path) => {
  const d = byPath.get(`${ROOT}/${path}`)
  assert.equal(typeof d, 'string', `${path} should be a string`)
  return d
}

test('the paths are exactly the expected list', () => {
  assert.deepEqual(entries.map((e) => e.path), [
    `${ROOT}/00 Start here/README.md`,
    `${ROOT}/01 Figma/How to import.md`,
    `${ROOT}/01 Figma/1-primitives.tokens.json`,
    `${ROOT}/01 Figma/2-semantic.light.tokens.json`,
    `${ROOT}/01 Figma/2-semantic.dark.tokens.json`,
    `${ROOT}/02 Adobe/How to import.md`,
    `${ROOT}/02 Adobe/lumen-studio-colours.ase`,
    `${ROOT}/02 Adobe/lumen-studio-colours.aco`,
    `${ROOT}/03 Other design apps/Affinity/How to import.md`,
    `${ROOT}/03 Other design apps/Affinity/lumen-studio-colours.ase`,
    `${ROOT}/03 Other design apps/Procreate/How to import.md`,
    `${ROOT}/03 Other design apps/Procreate/lumen-studio-colours.ase`,
    `${ROOT}/04 Code/css/lumen-studio.tokens.css`,
    `${ROOT}/04 Code/tokens/lumen-studio.tokens.json`,
  ])
})

test('paths use forward slashes and file names are lowercase kebab-case', () => {
  const FILE = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/
  const FOLDER = /^(\d\d [A-Z][a-z]+( [a-z]+)*|Affinity|Procreate)$/
  const HUMAN_FILES = new Set(['How to import.md', 'README.md'])
  for (const { path } of entries) {
    assert.ok(!path.includes('\\'), `backslash in ${path}`)
    const parts = path.split('/')
    assert.equal(parts[0], ROOT)
    for (const folder of parts.slice(1, -1)) assert.match(folder, FOLDER, `folder ${folder}`)
    const file = parts.at(-1)
    if (!HUMAN_FILES.has(file)) assert.match(file, FILE, `file ${file}`)
  }
  // The file-name check can fail: a spaced or capitalised name does not pass it.
  assert.doesNotMatch('Lumen Studio.ase', FILE)
})

test('no font binaries and no empty folders', () => {
  assert.ok(!entries.some((e) => /\.(ttf|otf|woff2?)$/i.test(e.path)))
  assert.ok(entries.every((e) => e.data.length > 0))
})

test('the Adobe, Affinity and Procreate .ase files are the same bytes', () => {
  const a = byPath.get(`${ROOT}/02 Adobe/lumen-studio-colours.ase`)
  const b = byPath.get(`${ROOT}/03 Other design apps/Affinity/lumen-studio-colours.ase`)
  const c = byPath.get(`${ROOT}/03 Other design apps/Procreate/lumen-studio-colours.ase`)
  assert.ok(a instanceof Uint8Array)
  assert.deepEqual(Buffer.from(a), Buffer.from(b))
  assert.deepEqual(Buffer.from(a), Buffer.from(c))
  // And the .aco is a different file, not a copy of the .ase.
  assert.notDeepEqual(Buffer.from(a), Buffer.from(byPath.get(`${ROOT}/02 Adobe/lumen-studio-colours.aco`)))
})

test('the README lists every swatch hex, its sections in order, and the fonts', () => {
  const readme = text('00 Start here/README.md')
  const swatches = swatchGroups(DESIGN).flatMap((g) => g.swatches)
  assert.ok(swatches.length > 50)
  for (const s of swatches) assert.ok(readme.includes(s.hex), `missing ${s.hex}`)
  assert.ok(readme.includes('#1F4B8E') && readme.includes('31, 75, 142'))

  const order = ['## Which folder is for which app', '### Figma', '### Adobe', '### Affinity', '### Procreate', '## Fonts', '## Colours', "## What's not included", '## About this export']
  let at = -1
  for (const h of order) {
    const i = readme.indexOf(h)
    assert.ok(i > at, `${h} missing or out of order`)
    at = i
  }
  assert.ok(readme.includes('https://fonts.google.com/specimen/Lora'))
  assert.ok(readme.includes('https://fonts.google.com/specimen/Open+Sans'))
  assert.ok(readme.includes('Font files are not included'))
  assert.ok(readme.includes('exactly "Primitives"'))
  assert.ok(readme.includes('Figma Professional'))
  assert.ok(readme.includes('Made with UIL4B. Exported 2026-10-31.'))
})

test('the how-to files repeat the app steps', () => {
  assert.ok(text('01 Figma/How to import.md').includes('exactly "Primitives"'))
  assert.ok(text('02 Adobe/How to import.md').includes('Swatches panel'))
  assert.ok(text('03 Other design apps/Affinity/How to import.md').includes('lumen-studio-colours.ase'))
  assert.ok(text('03 Other design apps/Procreate/How to import.md').includes('Import a file'))
})

test('the Figma files are valid JSON', () => {
  for (const f of ['1-primitives', '2-semantic.light', '2-semantic.dark']) {
    const doc = JSON.parse(text(`01 Figma/${f}.tokens.json`))
    assert.equal(typeof doc, 'object')
    assert.ok(Object.keys(doc).length > 0)
  }
  assert.throws(() => JSON.parse(text('01 Figma/How to import.md')))
})

test('the code files carry both modes', () => {
  const css = text('04 Code/css/lumen-studio.tokens.css')
  assert.match(css, /\.dark/)
  assert.ok(css.includes('Generated 2026-10-31.'))
  assert.ok(css.includes('Lumen Studio'))
  const json = JSON.parse(text('04 Code/tokens/lumen-studio.tokens.json'))
  assert.ok(JSON.stringify(json).includes('"dark"'))
})

test('an unnamed design is called untitled, and the date can be a Date', () => {
  const e = appBundleEntries(DESIGN, { date: new Date(2026, 0, 5) })
  assert.ok(e[0].path.startsWith('UIL4B-untitled-2026-01-05/'))
  assert.equal(bundleDate(new Date(2026, 11, 31, 23, 59)), '2026-12-31')
})

test('buildAppBundle returns a zip whose entries match appBundleEntries', async () => {
  const blob = await buildAppBundle(DESIGN, OPTS)
  assert.ok(blob instanceof Blob)
  assert.ok(blob.size > 0)
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const files = Object.values(zip.files).filter((f) => !f.dir)
  assert.deepEqual(files.map((f) => f.name).sort(), entries.map((e) => e.path).sort())
  for (const { path, data } of entries) {
    if (typeof data === 'string') assert.equal(await zip.file(path).async('string'), data, path)
    else assert.deepEqual(Buffer.from(await zip.file(path).async('uint8array')), Buffer.from(data), path)
  }
})
