// The plain HTML style guides (exportBuilder.js and styleGuideExport.js) are files a client keeps and opens
// offline, so neither may reach out to a font service. The family names stay in the font stacks (an installed
// font still applies); the rest fall back to the system stack.
//
// To see each fail: put a <link href="https://fonts.googleapis.com/..."> back into either builder's <head>.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStyleGuideHTML } from '../../src/utils/exportBuilder.js'
import { buildStyleGuideHtml } from '../../src/utils/styleGuideExport.js'

const design = {
  palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0'] },
  fonts: { heading: { family: 'Playfair Display', weight: 700 }, body: { family: 'Source Sans 3', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5 },
}

const built = {
  'exportBuilder.buildStyleGuideHTML (light)': () => buildStyleGuideHTML({ design, projectName: 'Acme' }),
  'exportBuilder.buildStyleGuideHTML (dark)': () => buildStyleGuideHTML({ design, projectName: 'Acme', theme: 'dark' }),
  'styleGuideExport.buildStyleGuideHtml': () => buildStyleGuideHtml(design, { projectName: 'Acme', date: new Date('2026-01-01T00:00:00Z') }),
}

for (const [name, make] of Object.entries(built)) {
  test(`${name}: no font service is linked or preconnected`, () => {
    const html = make()
    assert.ok(html.length > 1000, 'the document was built')
    assert.doesNotMatch(html, /fonts\.googleapis\.com/)
    assert.doesNotMatch(html, /fonts\.gstatic\.com/)
    assert.doesNotMatch(html, /<link\b[^>]*\brel="(?:stylesheet|preconnect)"/, 'no external stylesheet or preconnect')
  })

  test(`${name}: the brand font names stay in the stack with a system fallback`, () => {
    const html = make()
    assert.match(html, /Playfair Display/)
    assert.match(html, /Source Sans 3/)
    assert.match(html, /system-ui/)
  })
}
