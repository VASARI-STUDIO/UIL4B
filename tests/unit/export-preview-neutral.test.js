// While the popup draws the person's own page, none of the sample brand's pictures stand in for it. Source-level checks (the components
// import css, so node cannot render them); the rendered side is the user-sims 190 and 441.
//
//  1. THE RAIL IS NEUTRAL WHEN A LIVE PAGE IS ON OFFER: ExportPreview hands the gallery neutral={!showStock}, and a neutral thumbnail
//     is a labelled tile with no <img>.                                  Break: drop the `neutral` prop from the ExportPageGallery call.
//  2. THE STAGE HOLDS A TILE, NOT THE COVER, WHILE THE LIVE PAGE LOADS:  Break: render the stock <img> when expectLive is true.
//  3. THE STAGE LINE HAS ITS OWN CLASS, so the dock's `.xd-status` query finds one line.   Break: put xd-status back on the stage line.
//  4. THE OPEN-FULL-SIZE LINK KEEPS ITS PILL AND ITS GLYPH IS HIDDEN FROM ASSISTIVE TECH.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
const preview = read('src/components/export/ExportPreview.jsx')
const stage = read('src/components/export/ExportStage.jsx')
const gallery = read('src/components/export/ExportPageGallery.jsx')
const css = read('src/styles/pages/export-dialog.css')

test('the page rail draws neutral tiles whenever the live preview applies', () => {
  assert.match(preview, /<ExportPageGallery [^>]*neutral=\{!showStock\}/)
  assert.match(gallery, /neutral \? \{ src: '' \} : pageImage\(page, sample\)/)
  assert.match(gallery, /\{neutral && <span className="xd-tile" aria-hidden="true">\{page\.label\}<\/span>\}/)
})

test('the stage shows a plain tile, not the stock picture, while a live page is expected', () => {
  assert.match(stage, /\{expect && <span className="xd-tile" aria-hidden="true" \/>\}/)
  assert.match(stage, /\{image\.src && !expect && \(/)
})

test('the plan check draws plain tiles too: no sample picture shows before the live page', () => {
  // A signed-in person whose plan is still being read is waiting for their own page, like one whose page is being drawn.
  assert.match(preview, /const waiting = checking && Boolean\(user\) && !stock/)
  assert.match(preview, /const sample = \(proTemplate \|\| refused\) && !waiting/)
  assert.match(preview, /const showStock = stock \|\| \(noLive && !waiting\)/)
  assert.match(preview, /expectLive=\{!showStock && \(drawing \|\| waiting\)\}/)
  assert.match(preview, /loading=\{\(drawing \|\| waiting\) && !showStock\}/)
})

test('the stage status stays rendered, with its row reserved, for assistive tech to announce into', () => {
  assert.doesNotMatch(css, /\.xd-stage-status:empty/)
  assert.match(css, /^\.xd-stage-status\{[^}]*min-height:20px/m)
})

test('Open full size is a ghost pill at rest: a border, no underline', () => {
  const rule = css.match(/^\.xd-full\{[^}]*\}/m)[0]
  assert.match(rule, /border:1px solid var\(--border\)/)
  assert.match(rule, /text-decoration:none/)
})

test('a rail tile has one frame: the thumb\'s border, not an outline of its own', () => {
  const rule = css.match(/^\.xd-thumb \.xd-tile\{[^}]*\}/m)[0]
  assert.doesNotMatch(rule, /outline/)
})

test('the stage status line is not the dock status line', () => {
  assert.match(preview, /className="xd-stage-status"/)
  assert.doesNotMatch(preview, /className="xd-status"/)
  assert.match(css, /^\.xd-stage-status\{/m)
  assert.match(preview, /Live preview unavailable\. Showing the sample\./)
})

test('Open full size has its glyph, hidden from assistive tech, and stays a pill', () => {
  assert.match(preview, /<svg className="xd-full-glyph" viewBox="0 0 12 12" width="12" height="12"[^>]*aria-hidden="true"/)
  assert.match(preview, /Open full size<ExternalGlyph \/>/)
  assert.match(css, /^\.xd-full\{[^}]*border-radius:var\(--btn-radius\)/m)
})
