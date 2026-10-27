// The Gradient Generator's "Explore the library" panel: a full-width section
// under the presets whose button leads to the gradient library.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LIBRARY_GRADIENT_ROWS } from '../../src/data/gradientLibrary.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n')

test('the panel is a labelled section with a link to the gradient library', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /<section className="grd-explore" aria-labelledby="grd-explore-title">/)
  assert.match(src, /<h2 id="grd-explore-title">Explore the library<\/h2>/)
  assert.match(src, /<ToolButton as=\{Link\} to="\/discover\/gradients"[^>]*>\s*Explore the library/)
})

test('the panel sits after the presets and spans the page width', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.ok(src.indexOf('className="grd-presets"') < src.indexOf('className="grd-explore"'))
  const css = read('src/styles/pages/gradient.css')
  assert.match(css, /\.grd \.grd-explore \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.1fr\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.grd \.grd-explore \{ grid-template-columns: minmax\(0, 1fr\); \}/)
})

test('the taste strip only uses library rows that carry their stops', () => {
  const taste = LIBRARY_GRADIENT_ROWS.filter((g) => Array.isArray(g.stops)).slice(0, 6)
  assert.equal(taste.length, 6)
  for (const g of taste) {
    assert.ok(g.stops.length >= 2, g.id)
    assert.ok(['Linear', 'Radial', 'Conic'].includes(g.type), g.id)
  }
})

test('the panel copy keeps to the surface vocabulary', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  const panel = src.slice(src.indexOf('<section className="grd-explore"'), src.indexOf('</section>', src.indexOf('<section className="grd-explore"')))
  assert.doesNotMatch(panel, /workspace/i)
})
