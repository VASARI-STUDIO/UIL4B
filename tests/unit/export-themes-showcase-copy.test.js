// A project's showcase export prints the project's own name, never a stand-in the theme hard-coded.
//
// What is pinned here, and the change that makes each fail:
//  1. NO GUIDELINES OR UI-KIT PAGE OF ANY THEME PRINTS "Example project" OR "river ferry" WHEN IT IS DRAWN FROM A PROJECT BRAND IN THE SHOWCASE EDITION.
//     Those words were hard-coded in themes 02, 04, 07 and 09; they read as the project's own name and trade.
//     Break: put `['Kept by', 'Example project']` back in themes/02-poster/gate.js, or "river ferry" back in themes/04-standards/uikit.js.
//  2. THE STANDARDS UI KIT COVER FITS A LONG NAME: the construction sheet's x shrinks until the clear zone fits the sheet (so a long wordmark does not run
//     into the spec column), and the date band's type size drops as its words get longer.
//     Break: set `xs` back to a constant 8 in themes/04-standards/uikit.js, or drop the --kcs custom property from the band.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { projectToBrand } from '../../api/_lib/exportThemes/brandFromProject.js'
import { makeCtx, GUIDE_PAGES, UIKIT_PAGES } from '../../api/_lib/exportThemes/engine/pages.js'
import { pageDoc } from '../../api/_lib/exportThemes/engine/doc.js'
import loaders from '../../api/_lib/exportThemes/node-loaders.js'
import { themeHasRow } from '../../src/data/exportThemes.js'

const THEMES_DIR = new URL('../../api/_lib/exportThemes/themes/', import.meta.url)
const DIRS = fs.readdirSync(THEMES_DIR).filter((d) => /^\d\d-/.test(d)).sort()
const COLORS = ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']
const design = { palette: { colors: COLORS, base: COLORS[0], harmony: 'auto' }, fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } } }
const brandOf = (name) => projectToBrand({ design, projectName: name, date: '2026-11-06' })
const STAND_INS = /Example project|river ferry/

for (const dir of DIRS) {
  test(`theme ${dir}: a project's showcase pages print no hard-coded stand-in for its name`, async () => {
    const T = await import(new URL(`${dir}/index.js`, THEMES_DIR).href)
    const kinds = [['guidelines', GUIDE_PAGES], ...(themeHasRow(dir, 'ui-kit') ? [['uikit', UIKIT_PAGES]] : [])]
    const brand = brandOf('Tide & Co.')
    const hits = []
    for (const [kind, list] of kinds) {
      const ctx = makeCtx(T, 'showcase', kind, loaders, brand)
      for (const p of list.filter((q) => typeof T[kind]?.[q.id] === 'function')) {
        const doc = pageDoc(ctx, T, { title: p.id, pages: [T[kind][p.id](ctx)], size: ctx.size })
        const flat = doc.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
        const m = STAND_INS.exec(flat)
        if (m) hits.push(`${kind}/${p.id}: ${JSON.stringify(m[0])}`)
      }
    }
    assert.deepEqual(hits, [])
  })
}

test('standards UI kit cover: a long project name shrinks the construction sheet and the date band instead of overflowing', async () => {
  const T = await import(new URL('04-standards/index.js', THEMES_DIR).href)
  const cover = (name) => {
    const ctx = makeCtx(T, 'showcase', 'uikit', loaders, brandOf(name))
    return T.uikit.cover(ctx)
  }
  const sheetHeight = (html) => +/<svg[^>]*viewBox="0 0 700 (\d+)"/.exec(html)?.[1]
  const band = (html) => +/--kcs:(\d+)px/.exec(html)?.[1]
  const short = cover('Tide'), long = cover('Fernhill Native Plant Nursery and Garden Supplies')
  assert.ok(band(short) >= band(long), 'the band type is no larger for the longer words')
  assert.ok(band(short) <= 80 && band(long) >= 36, 'the band type stays between 36 and 80 px')
  assert.ok(sheetHeight(short) >= 252 && sheetHeight(long) >= sheetHeight(short), 'a longer lockup never gives a shorter sheet')
})
