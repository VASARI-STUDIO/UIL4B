// The Gradient Generator's "Explore the library" panel: a full-width section
// under the presets whose button and mood chips lead to the gradient library. It
// is the only way in: the presets header carries no second link.
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
  assert.match(src, /<ToolButton as=\{Link\} to="\/discover\/gradients"[^>]*>\s*Browse all gradients/)
  assert.doesNotMatch(src, /className="grd-lib"/)
})

test('the panel heading is no bigger than the presets heading (18px)', () => {
  const css = read('src/styles/pages/gradient.css')
  assert.match(css, /\.grd \.grd-presets-head h2 \{[^}]*font-size: 18px/)
  assert.match(css, /\.grd \.grd-explore h2 \{[^}]*font-size: 18px/)
})

test('each taste chip is a link to the library filtered by its own, distinct mood', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /to=\{`\/discover\/gradients\?mood=\$\{g\.mood\}`\}/)
  const pairs = [...src.matchAll(/\['(\w+)', '([a-z-]+)'\],/g)].map((m) => [m[1], m[2]])
  assert.equal(pairs.length, 6)
  assert.equal(new Set(pairs.map(([mood]) => mood)).size, 6, 'six different moods')
  for (const [mood, id] of pairs) {
    const row = LIBRARY_GRADIENT_ROWS.find((g) => g.id === id)
    assert.ok(Array.isArray(row?.stops), `${id} has its stops`)
    assert.ok(row.tags.includes(mood), `${id} is tagged ${mood}`)
  }
})

test('the library reads the mood from ?mood= and ignores an unknown one', () => {
  const gallery = read('src/pages/GradientGallery.jsx')
  assert.match(gallery, /searchParams\.get\('mood'\)/)
  assert.match(gallery, /GRADIENT_TAGS\.includes\(mood\) \? mood : 'all'/)
})

test('the panel sits after the presets and spans the page width', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.ok(src.indexOf('className="grd-presets"') < src.indexOf('className="grd-explore"'))
  const css = read('src/styles/pages/gradient.css')
  assert.match(css, /\.grd \.grd-explore \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.1fr\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.grd \.grd-explore \{ grid-template-columns: minmax\(0, 1fr\); \}/)
})

test('the panel copy keeps to the surface vocabulary', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  const panel = src.slice(src.indexOf('<section className="grd-explore"'), src.indexOf('</section>', src.indexOf('<section className="grd-explore"')))
  assert.doesNotMatch(panel, /workspace/i)
})
