// The style guide never goes missing for a theme: either the theme is opted in to the themed `guide` row and has a lane that draws it, or it is
// not and the plain style guide (the `html` and `md` formats of src/config/exportFormats.js) still builds for it.
//
//  1. OPTED IN MEANS A LANE: a theme with the `guide` row has themes/<id>/lane-guide.js exporting `guide`, and the theme's own `guide` holds
//     page functions, so the route has something to draw.
//     Break: add extraRows: ['guide'] to a theme in src/data/exportThemes.js that has no lane-guide.js.
//  2. NOT OPTED IN MEANS THE PLAIN GUIDE: the html and md formats are live, free, and in the guide group, and buildStyleGuideHtml /
//     buildStyleGuideMarkdown return a non-empty document for a design. A theme without the row has no lane-guide.js either (no orphan lane).
//     Break: remove the `html` or `md` entry from EXPORT_FORMATS, or make buildStyleGuideHtml return ''.
// Test seam: themeHasRow (src/data/exportThemes.js) and the two plain builders (src/utils/styleGuideExport.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { EXPORT_THEMES, themeHasRow } from '../../src/data/exportThemes.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import { buildStyleGuideHtml, buildStyleGuideMarkdown } from '../../src/utils/styleGuideExport.js'
import { SAMPLES, FIXED_DATE } from '../helpers/export-samples.js'

const THEMES_DIR = new URL('../../api/_lib/exportThemes/themes/', import.meta.url)
const lane = (id) => new URL(`${id}/lane-guide.js`, THEMES_DIR)

test('the plain style guide is a live, free format in html and md', () => {
  for (const id of ['html', 'md']) {
    const f = EXPORT_FORMATS.find((x) => x.id === id)
    assert.ok(f, `format ${id} exists`)
    assert.equal(f.group, 'guide', id)
    assert.equal(f.live, true, id)
    assert.ok(!f.pro, `${id} is free`)
  }
})

for (const { id } of EXPORT_THEMES) {
  if (themeHasRow(id, 'guide')) {
    test(`theme ${id} is opted in to the guide row, so it has a lane that draws it`, async () => {
      assert.ok(fs.existsSync(lane(id)), `${id}: themes/${id}/lane-guide.js is missing`)
      const lanes = await import(lane(id).href)
      assert.equal(typeof lanes.guide, 'object', `${id}: lane-guide.js exports no guide`)
      const theme = await import(new URL(`${id}/index.js`, THEMES_DIR).href)
      assert.ok(Object.values(theme.guide || {}).some((p) => typeof p === 'function'), `${id}: the theme's guide holds no page`)
    })
  } else {
    test(`theme ${id} is not opted in, and the plain style guide still builds`, () => {
      assert.ok(!fs.existsSync(lane(id)), `${id}: has a lane-guide.js but is not opted in to the guide row`)
      const design = SAMPLES.halcyon.design
      const html = buildStyleGuideHtml(design, { projectName: 'Harbourline', date: FIXED_DATE })
      const md = buildStyleGuideMarkdown(design, { projectName: 'Harbourline', date: FIXED_DATE })
      assert.ok(typeof html === 'string' && html.length > 1000 && html.includes('Harbourline'), `${id}: plain html guide is empty`)
      assert.ok(typeof md === 'string' && md.length > 500 && md.includes('Harbourline'), `${id}: plain md guide is empty`)
    })
  }
}
