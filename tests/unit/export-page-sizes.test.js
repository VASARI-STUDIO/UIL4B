// The optional `page` size of a themed export (EXPORT_PAGES in src/data/exportThemes.js, validated by themeRequestProblem).
//
// What is pinned here, and the change that makes each fail:
//  1. A4 PORTRAIT SETS THE DOCUMENT SIZE: Flyleaf's slides PDF and guide at a4-portrait carry @page 794 x 1123 and a 794 viewport, and draw at
//     least as many pages as at 16:9. Break: drop the opts.page branch in makeCtx (engine/pages.js).
//  2. NO PAGE IS TODAY'S OUTPUT: a request without `page` is byte-identical to one that never knew the field, and is the theme's own size.
//     Break: make renderThemeExport default `page` to 'a4-portrait'.
//  3. UNKNOWN PAGES ARE REFUSED: a size the theme does not list, a junk value and a theme with no list give 400 unknown_page.
//     Break: delete the unknown_page line in themeRequestProblem.
//  4. THE TABLE AND THE THEME AGREE: each table entry's `pages` equals the theme's meta.pages, and the engine refuses a size the theme lacks.
//     Break: change meta.pages in themes/33-flyleaf/index.js without the table entry.
//  5. THE FILE NAME NAMES THE PAGE only when one was asked for.
//     Break: build the name without `tag` in renderThemeExport.
// Test seam: renderThemeExport and themeRequestProblem (api/_lib/exportThemeRoute.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadEngine, renderThemeExport, themeRequestProblem } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES, EXPORT_PAGES, themeHasPage } from '../../src/data/exportThemes.js'
import { requestThemeExport } from '../../src/utils/exportThemeRequest.js'
import * as T from '../../api/_lib/exportThemes/themes/33-flyleaf/index.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const design = { palette: { base: '#2E7BB8', harmony: 'auto', colors: ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'] }, fonts: FONTS }
const E = await loadEngine()
const ids = (html) => [...html.matchAll(/data-page="([a-z]+)"/g)].map((m) => m[1])
const make = (row, format, page) => renderThemeExport({ theme: '33-flyleaf', row, format, design, projectName: 'Kerbside', ...(page === undefined ? {} : { page }) }, E)
const ROWS = [['slides', 'pdf'], ['guide', 'pdf']]

for (const [row, format] of ROWS) {
  test(`Flyleaf ${row} at a4-portrait is 794 x 1123 and draws every page the 16:9 one does`, async () => {
    const a4 = (await make(row, format, 'a4-portrait')).html
    const wide = (await make(row, format, '16x9')).html
    assert.match(a4, /@page\{size:794px 1123px;margin:0\}/)
    assert.match(a4, /<meta name="viewport" content="width=794">/)
    assert.match(a4, /\.pg\{[^}]*width:794px;height:1123px/)
    assert.match(wide, /@page\{size:1280px 720px;margin:0\}/)
    assert.ok(ids(a4).length >= ids(wide).length, `${ids(a4).length} pages at A4, ${ids(wide).length} at 16:9`)
    assert.ok(ids(a4).length > 0)
  })

  test(`Flyleaf ${row} with no page is the theme's own size, byte for byte`, async () => {
    const none = (await make(row, format)).html
    const own = (await make(row, format, row === 'slides' ? '16x9' : 'a4-portrait')).html
    assert.equal(none, own)
    assert.match(none, row === 'slides' ? /@page\{size:1280px 720px/ : /@page\{size:794px 1123px/)
  })
}

test('a page the theme does not list, a junk value and a theme with no list are all unknown_page', () => {
  const base = { theme: '33-flyleaf', row: 'slides', format: 'pdf' }
  assert.equal(themeRequestProblem(base), null)
  assert.equal(themeRequestProblem({ ...base, page: 'a4-portrait' }), null)
  assert.equal(themeRequestProblem({ ...base, page: 'a4-landscape' })?.code, 'unknown_page')
  for (const junk of ['letter', '', 'toString', '__proto__', null, 0, 42, {}, ['a4-portrait']]) {
    assert.equal(themeRequestProblem({ ...base, page: junk })?.code, 'unknown_page', `page ${JSON.stringify(junk)}`)
  }
  const bare = EXPORT_THEMES.find((t) => !t.pages)
  assert.ok(bare)
  assert.equal(themeRequestProblem({ theme: bare.id, row: 'slides', format: 'pdf', page: '16x9' })?.code, 'unknown_page')
  assert.equal(themeRequestProblem({ theme: bare.id, row: 'slides', format: 'pdf' }), null)
})

test('the table entry and the theme list the same pages, and the engine refuses one the theme lacks', () => {
  const entry = EXPORT_THEMES.find((t) => t.id === '33-flyleaf')
  assert.deepEqual([...entry.pages], [...T.meta.pages])
  assert.ok(entry.pages.every((p) => Object.hasOwn(EXPORT_PAGES, p)))
  assert.ok(themeHasPage('33-flyleaf', 'a4-portrait') && !themeHasPage('33-flyleaf', 'a4-landscape'))
  assert.throws(() => E.makeCtx(T, 'slot', 'guidelines', E.loaders, E.projectToBrand({ design, projectName: 'Kerbside' }), { page: 'a4-landscape' }), /page size/)
})

test('the file name carries the page key only when a page was asked for', async () => {
  const plain = await make('slides', 'html')
  const a4 = await make('slides', 'html', 'a4-portrait')
  assert.match(plain.name, /kerbside-brand-guidelines-33-flyleaf\.zip$/)
  assert.equal(a4.name, plain.name.replace(/\.zip$/, '-a4-portrait.zip'))
})

test('the client sends page only when the caller passes one', async () => {
  const sent = []
  const sdk = { auth: { currentUser: { getIdToken: async () => 'tok' } } }
  const fetchImpl = async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: false, status: 400, json: async () => ({ code: 'unknown_page' }), headers: { get: () => '' } } }
  const base = { theme: '33-flyleaf', row: 'slides', format: 'pdf', design, projectName: 'Kerbside' }
  await requestThemeExport(base, { loadAuth: async () => sdk, fetchImpl })
  const res = await requestThemeExport({ ...base, page: 'a4-portrait' }, { loadAuth: async () => sdk, fetchImpl })
  assert.ok(!Object.hasOwn(sent[0], 'page'))
  assert.equal(sent[1].page, 'a4-portrait')
  assert.equal(res.code, 'unknown')
})
