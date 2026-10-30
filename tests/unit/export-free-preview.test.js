// The free-export preview's pure parts: which lines of a file it shows, and what
// makes it draw again. The component itself is checked in the browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTokensCss, buildTokensJson } from '../../src/utils/designTokens.js'
import { PREVIEW_LINES, freePreviewKey, previewLines } from '../../src/utils/exportFreePreview.js'

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
