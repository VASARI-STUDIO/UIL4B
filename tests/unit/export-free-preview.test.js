// The free-export preview's pure parts: which lines of a file it shows, and what
// makes it draw again. The component itself is checked in the browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTokensCss, buildTokensJson } from '../../src/utils/designTokens.js'
import { PREVIEW_LINES, bundleTreeLines, freePreviewKey, previewLines } from '../../src/utils/exportFreePreview.js'
import { appBundleEntries } from '../../src/utils/appBundle.js'

const design = {
  name: 'Harbour',
  palette: { colors: ['#1F6FEB', '#F5A524', '#101828'], base: 0 },
  fonts: { heading: 'Switzer', body: 'Switzer' },
}

test('the stylesheet preview starts at :root, past the naming comment', () => {
  const css = buildTokensCss(design, { projectName: 'Harbour', watermark: false })
  const lines = previewLines(css, { skipLeadingComment: true })
  assert.equal(lines.length, PREVIEW_LINES)
  assert.equal(lines[0], ':root {')
  assert.ok(lines.every((l) => !l.includes('Naming')))
})

test('without skipping, the first lines are the file as built', () => {
  const css = buildTokensCss(design, { projectName: 'Harbour', watermark: false })
  assert.equal(previewLines(css)[0], '/*')
})

test('the JSON preview is its first 18 lines', () => {
  const json = buildTokensJson(design, { projectName: 'Harbour', watermark: false })
  const lines = previewLines(json)
  assert.equal(lines.length, PREVIEW_LINES)
  assert.equal(lines[0], '{')
})

test('a short file is not padded, and a trailing newline is not a line', () => {
  assert.deepEqual(previewLines('a\nb\n'), ['a', 'b'])
  assert.deepEqual(previewLines(''), [])
  assert.deepEqual(previewLines(null), [])
})

test('the key follows the palette, the name and the plan, not the logo', () => {
  const base = { kind: 'code', file: 'css', watermark: true, projectName: 'Harbour', design, template: 'studio' }
  const key = freePreviewKey(base)
  assert.equal(freePreviewKey({ ...base }), key)
  assert.notEqual(freePreviewKey({ ...base, watermark: false }), key)
  assert.notEqual(freePreviewKey({ ...base, file: 'json' }), key)
  assert.notEqual(freePreviewKey({ ...base, design: { ...design, palette: { colors: ['#000000'], base: 0 } } }), key)
  assert.equal(freePreviewKey({ ...base, design: { ...design, logo: { src: 'data:image/png;base64,AAAA' } } }), key)
})

test('the kit template is part of the key only for the kit', () => {
  const base = { kind: 'kit', file: 'css', watermark: true, projectName: 'Harbour', design, template: 'studio' }
  assert.notEqual(freePreviewKey({ ...base, template: 'manual' }), freePreviewKey(base))
  const code = { ...base, kind: 'code' }
  assert.equal(freePreviewKey({ ...code, template: 'manual' }), freePreviewKey(code))
})

// ── The app-ready bundle's folder tree ──────────────────────────────────────

test('the bundle preview lists each app folder with its files, from the real entries', () => {
  const entries = appBundleEntries(design, { date: '2026-10-31', name: 'Harbour' })
  const lines = bundleTreeLines(entries.map((e) => e.path))
  assert.deepEqual(lines, [
    '00 Start here/',
    '  README.md',
    '01 Figma/',
    '  1-primitives.tokens.json',
    '  2-semantic.light.tokens.json',
    '  2-semantic.dark.tokens.json',
    '02 Adobe/',
    '  harbour-colours.ase',
    '  harbour-colours.aco',
    '03 Other design apps/',
    '  Affinity/harbour-colours.ase',
    '  Procreate/harbour-colours.ase',
    '04 Code/',
    '  css/harbour.tokens.css',
    '  tokens/harbour.tokens.json',
    '',
    'How to import.md in each app folder',
  ])
  assert.ok(lines.length <= PREVIEW_LINES, 'the tree fits the lines the preview box is sized for')
})

test('the bundle preview handles an empty or odd list without throwing', () => {
  assert.deepEqual(bundleTreeLines([]), [])
  assert.deepEqual(bundleTreeLines(undefined), [])
  assert.deepEqual(bundleTreeLines(['root', 'root/', 'root/folder']), [])
  assert.deepEqual(bundleTreeLines(['root/a/How to import.md']), ['', 'How to import.md in each app folder'])
})

test('the bundle preview is drawn from the project name, so a rename draws it again', () => {
  const base = { kind: 'bundle', watermark: true, projectName: 'Harbour', design, project: 'Harbour' }
  assert.notEqual(freePreviewKey({ ...base, project: 'Quay' }), freePreviewKey(base))
  assert.equal(freePreviewKey({ ...base, project: 'Quay', kind: 'code', file: 'css' }), freePreviewKey({ ...base, kind: 'code', file: 'css' }))
})
