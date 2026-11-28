// Theme 35, Dispatch: the brand guidelines (31 pages as a consignment, 16:9 and A4 portrait) and the Free edition the route decides from the plan.
//
// What is pinned here, and the change that makes each fail:
//  1. THE EDITIONS: Pro is 31 pages at 16:9 and at A4 portrait with no credit line; the Free skeleton is 7 pages with "Made with UIL4B" on
//     each. Break: return the full list from brandOrder() in kit.js when ctx.skeleton is true.
//  2. EVERY PAGE DRAWS at both sizes for several palettes, through the engine's own makeCtx and pageDoc, none left out.
//     Break: make a page in themes/35-dispatch/pages-*.js throw on a single-colour palette.
//  3. THE PROJECT'S NAME PRINTS, NOT A PLACEHOLDER: meta.realCopy keeps the name and colour names as words in the slot edition.
//     Break: drop realCopy from meta in themes/35-dispatch/index.js.
//  4. NO SHOWCASE COPY, NO MOCKUP AND NO DEMO TRADE WORD IN A DOWNLOAD: the Kerbside copy never reaches a slot render, the pages' own fallback
//     lines name no courier trade, and no request field turns the showcase or the photo mockups on.
//     Break: set meta.mockups to true, read body.edition in the route, or write "parcel" into a page fallback.
//  5. THE FONT LICENCE TRAVELS WITH THE FONT: every zip that carries IBM Plex Mono carries its SIL Open Font License.
//     Break: drop the meta.fontLicences loop in engine/doc.js fontFiles.
//  6. NO PANGRAM: the type samples are the user's to write. Break: return a pangram for type.sample.* in themes/35-dispatch/real-copy.js.
//  7. THE THEME IS PRO WITH THE GUIDELINES ROW ONLY: a Free account is refused, and the style guide, book and UI kit are unknown rows.
//     Break: add `free: true` or a `guide` row to the table entry in src/data/exportThemes.js.
// The customer project in these tests is called Lumen on purpose: the trade test below fails on the demo brand's own name.
// Test seam: renderThemeExport (the route's own builder, with the plan's `skeleton` flag) and serveExportDocument (the route entry).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { loadEngine, renderThemeExport, withCsp } from '../../api/_lib/exportThemeRoute.js'
import { isPrintSafe } from '../../src/utils/exportThemeRequest.js'
import { EXPORT_THEMES, themeHasRow, themeHasPage } from '../../src/data/exportThemes.js'
import * as T from '../../api/_lib/exportThemes/themes/35-dispatch/index.js'
import { FULL, SKELETON, CREDIT } from '../../api/_lib/exportThemes/themes/35-dispatch/kit.js'
import { SHOWCASE } from '../../api/_lib/exportThemes/themes/35-dispatch/showcase.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const designOf = (colors) => ({ palette: { base: colors[0], harmony: 'auto', colors }, fonts: FONTS })
const PALETTES = {
  'mid-blue': ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'],
  'very light': ['#FFFFFF', '#F4F1EA', '#E8E0D0', '#FAFAFA', '#EDEDED'],
  'very dark': ['#000000', '#111111', '#1A1A2E', '#0B1D3A', '#222222'],
  'one colour': ['#F96B76'],
}
const SIZES = ['a4-portrait', '16x9']
const NAME = 'Lumen'
// the 'art-' pages are the miniatures a page draws of its own sheets, not pages of the document
const ids = (html) => [...html.matchAll(/data-page="([a-z0-9-]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith('art-'))
// the credit is two label lines in the stub (16:9) or one line (A4); CREDIT is the same words in one string
assert.equal(CREDIT, 'Made with UIL4B')
const credits = (html) => (html.match(/Made with(?:<\/span><br><span class="lb">| )UIL4B/g) || []).length
const markup = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '')
const design = designOf(PALETTES['mid-blue'])

const E = await loadEngine()
const make = (extra) => renderThemeExport({ theme: '35-dispatch', row: 'slides', design, projectName: NAME, ...extra }, E)

test('the full edition is 31 pages and the Free one is the 7 named pages, all from the same list', () => {
  assert.equal(FULL.length, 31)
  assert.deepEqual(SKELETON, ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'])
  assert.ok(SKELETON.every((id) => FULL.includes(id)))
  for (const id of FULL) assert.equal(typeof T.guidelines[id], 'function', `brand page ${id} is missing`)
})

for (const [name, colors] of Object.entries(PALETTES)) {
  for (const page of SIZES) {
    test(`every Dispatch page draws for ${name} at ${page}`, () => {
      const brand = E.projectToBrand({ design: designOf(colors), projectName: NAME })
      const ctx = E.makeCtx(T, 'slot', 'guidelines', E.loaders, brand, { page })
      assert.equal(ctx.size.h > ctx.size.w, page === 'a4-portrait')
      // a page that throws is called directly here, so a layout that cannot hold the words fails the test and is not left out quietly
      const html = FULL.map((id) => T.guidelines[id](ctx))
      const doc = E.pageDoc(ctx, T, { title: 'Dispatch', pages: html, size: ctx.size })
      assert.deepEqual(ids(doc), FULL, 'pages in order')
      assert.ok(isPrintSafe(withCsp(doc)), 'document is print safe once the route has added its CSP')
      assert.equal(credits(doc), 0, 'the full edition has no credit line')
      assert.ok(!/undefined|NaN|\[object/.test(markup(doc)), 'no undefined, NaN or object text on a page')
    })
  }
}

for (const page of SIZES) {
  for (const format of ['pdf', 'html']) {
    test(`slides ${format} at ${page}: Free is the 7 named pages with the credit on each, Pro is all 31 with none`, async () => {
      const pages = async (skeleton) => {
        const r = await make({ format, page, skeleton })
        if (r.html) return r.html
        const { default: JSZip } = await import('jszip')
        const z = await JSZip.loadAsync(r.zip)
        return z.file(Object.keys(z.files).find((n) => n.endsWith('brand-guidelines.html'))).async('string')
      }
      const free = await pages(true)
      const pro = await pages(false)
      assert.deepEqual(ids(free), SKELETON)
      assert.equal(credits(free), SKELETON.length, 'one credit line per Free page')
      assert.deepEqual(ids(pro), FULL)
      assert.equal(credits(pro), 0, 'Pro has no credit line')
    })
  }
}

test('Dispatch is registered as a Pro theme with the slides and guide rows and both page sizes', () => {
  assert.ok(EXPORT_THEMES.some((t) => t.id === '35-dispatch'))
  assert.ok(themeHasRow('35-dispatch', 'slides'))
  assert.ok(themeHasRow('35-dispatch', 'guide'))
  for (const row of ['book', 'ui-kit']) assert.ok(!themeHasRow('35-dispatch', row), row)
  assert.ok(themeHasPage('35-dispatch', '16x9') && themeHasPage('35-dispatch', 'a4-portrait') && !themeHasPage('35-dispatch', 'a4-landscape'))
  assert.deepEqual([...T.meta.pages], [...EXPORT_THEMES.find((t) => t.id === '35-dispatch').pages])
  assert.ok(!EXPORT_THEMES.find((t) => t.id === '35-dispatch').free, 'a Free account does not get the theme')
})

const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } }, 'free-1': {} }
function fakeRes() {
  const res = { headers: {}, setHeader(k, v) { res.headers[k] = v }, status(c) { res.code = c; return res }, json(b) { res.body = b; return res }, send(b) { res.buffer = b; return res } }
  return res
}
const ask = async (uid, body) => {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body }, res, {
    verifyIdToken: async () => ({ uid }), readUser: async (u) => USERS[u], consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
  })
  return res
}

test('a Free account is refused, and the rows Dispatch lacks are unknown', async () => {
  const base = { theme: '35-dispatch', design, projectName: NAME }
  const free = await ask('free-1', { ...base, row: 'slides', format: 'pdf' })
  assert.equal(free.code, 403); assert.equal(free.body.code, 'pro_required')
  for (const [row, format] of [['book', 'pdf'], ['ui-kit', 'zip']]) {
    const res = await ask('pro-1', { ...base, row, format })
    assert.equal(res.code, 400, row); assert.equal(res.body.code, 'unknown_row', row)
  }
})

test('the project name and colour names print in the slot edition, not as placeholders', async () => {
  for (const page of SIZES) {
    const res = await ask('pro-1', { theme: '35-dispatch', row: 'slides', format: 'pdf', page, design: designOf(['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8', '#C4472D']), projectName: NAME })
    assert.equal(res.code, 200)
    const html = markup(res.body.html)
    assert.match(html, new RegExp(NAME), `${page}: the project name reaches the pages`)
    assert.ok(!/>\s*Brand name\s*</.test(html), `${page}: no Brand name placeholder is printed`)
    assert.ok(!/Your brand/.test(html), `${page}: the engine's stand-in name is not printed`)
  }
  // no project name: the name is still a placeholder for the user to write
  assert.equal(T.meta.realCopy('name', 'Your brand'), undefined)
})

test('no client module imports the Dispatch theme or the server theme folder', () => {
  const hits = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(m?jsx?|tsx?)$/.test(e.name) && /exportThemes\/(themes|engine)|35-dispatch\//.test(fs.readFileSync(p, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, ''))) hits.push(p)
    }
  }
  walk(path.resolve('src'))
  assert.deepEqual(hits, [])
})

// The demo copy (Kerbside, a bike courier) is the showcase edition's; a download is the slot edition and the route never passes another edition.
// The `page.*` lines are also the pages' own fallback words (copy() in showcase.js returns them outside the showcase), so they print in a slot render too;
// every other line is brand copy and must not.
const OWN_WORDS = new Set(Object.entries(SHOWCASE).filter(([k]) => k.startsWith('page.')).map(([, v]) => v))
const DEMO = Object.entries(SHOWCASE).filter(([k, v]) => typeof v === 'string' && !k.startsWith('page.') && !OWN_WORDS.has(v) && v.length > 12).map(([, v]) => v)
const MOCKUP_PHOTOS = ['IMG-03', 'IMG-05', 'IMG-06', 'IMG-07']
const TRADE = /\b(?:kerbside|couriers?|riders?|parcels?|melbourne|brunswick|richmond|fitzroy|swan street)\b/i
const noDemo = (html, what) => {
  assert.ok(DEMO.length > 10, 'the demo list is built from the showcase table')
  for (const line of DEMO) assert.ok(!html.includes(line), `${what}: the demo line "${line}" is printed`)
  // the demo brand's trade words: a customer's kit names none of them, the pages' own fallback lines and the photographs' descriptions included
  const trade = TRADE.exec(markup(html))
  assert.ok(!trade, `${what}: the demo brand's word "${trade && trade[0]}" is printed`)
  assert.ok(!/matrix3d|mix-blend-mode/.test(html), `${what}: a mockup scene is drawn`)
  for (const id of MOCKUP_PHOTOS) assert.ok(!html.includes(`ds-im-${id}`), `${what}: the ${id} mockup photograph is embedded`)
}

test('CONTROL: the trade-word check fails on each demo word', () => {
  for (const w of ['Kerbside', 'courier', 'rider', 'parcel', 'Melbourne', 'Brunswick', 'Richmond', 'Fitzroy', 'Swan Street']) {
    assert.throws(() => assert.ok(!TRADE.exec(markup(`<p>${w}</p>`)), w), assert.AssertionError, w)
  }
})

test('a download carries no showcase copy, no demo trade word and no mockup image, at either size, Free or Pro', async () => {
  for (const skeleton of [false, true]) for (const page of SIZES) {
    const { html } = await make({ format: 'pdf', page, skeleton })
    noDemo(html, `${skeleton ? 'free' : 'pro'} ${page}`)
  }
  assert.equal(T.meta.mockups, false)
})

test('no request field turns the showcase or the mockups on', async () => {
  for (const extra of [{ edition: 'showcase' }, { showcase: true }, { mode: 'showcase' }, { mockups: true }, { meta: { mockups: true } }, { noMockups: false }]) {
    const res = await ask('pro-1', { theme: '35-dispatch', row: 'slides', format: 'pdf', design, projectName: NAME, ...extra })
    if (res.code === 200) { noDemo(res.body.html, JSON.stringify(extra)); assert.deepEqual(ids(res.body.html), FULL) }
    else assert.equal(res.code, 400, `body ${JSON.stringify(extra)} is refused or ignored`)
  }
})

test('every Dispatch zip that carries IBM Plex Mono carries its licence beside it', async () => {
  const { default: JSZip } = await import('jszip')
  for (const page of SIZES) for (const skeleton of [false, true]) {
    const { zip } = await make({ format: 'html', page, skeleton })
    const names = Object.keys((await JSZip.loadAsync(zip)).files)
    assert.ok(names.some((n) => /assets\/fonts\/IBMPlexMono-400\.woff2$/.test(n)), `${page}: the zip carries IBM Plex Mono`)
    assert.ok(names.some((n) => n.endsWith('assets/fonts/IBMPlexMono-OFL.txt')), `${page}: IBM Plex Mono ships without its licence`)
  }
})

test('a Dispatch export never prints a pangram as the brand headline or sample', async () => {
  for (const page of SIZES) for (const skeleton of [false, true]) {
    const { html } = await make({ format: 'pdf', page, skeleton })
    for (const p of ['five dozen liquor jugs', 'quick brown fox', 'vexingly quick daft zebras', 'black quartz, judge my vow']) {
      assert.ok(!html.toLowerCase().includes(p), `${page} ${skeleton ? 'Free' : 'Pro'} prints "${p}"`)
    }
  }
})

test('every email address in the theme is a reserved .example or example.com one', () => {
  const dir = path.resolve('api/_lib/exportThemes/themes/35-dispatch')
  for (const f of fs.readdirSync(dir)) {
    for (const [addr] of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/[A-Za-z0-9._-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)) {
      assert.match(addr, /@(?:[a-z0-9-]+\.)*(?:example\.com|[a-z0-9-]+\.example)$/i, `${f}: ${addr}`)
    }
  }
})

// THE UI STYLE GUIDE: 13 A4 pages on Pro and 7 on Free, in the theme's order, with no demo copy; the dialog's older guide ids preview a page.
// Break: drop guidePreviewId from themes/35-dispatch/index.js, or 'guide' from its rows in src/data/exportThemes.js.
test('the Dispatch style guide draws 13 pages on Pro, 7 on Free, no demo copy, and every older guide id previews a page', async () => {
  const draw = async (skeleton) => (await renderThemeExport({ theme: '35-dispatch', row: 'guide', format: 'pdf', design, projectName: NAME, skeleton }, E)).html
  const ids = (html) => [...html.matchAll(/<section[^>]*data-page="([^"]+)"/g)].map((m) => m[1])
  const pro = await draw(false), free = await draw(true)
  assert.deepEqual(ids(pro), ['cover', 'contents', 'screen', 'dark', 'roles', 'tints', 'type', 'buttons', 'fields', 'feedback', 'overlays', 'space', 'handoff'])
  assert.deepEqual(ids(free), ['cover', 'screen', 'roles', 'type', 'buttons', 'fields', 'handoff'])
  noDemo(pro, 'guide Pro'); noDemo(free, 'guide Free')
  const { renderThemePage } = await import('../../api/_lib/exportThemeRoute.js')
  for (const page of ['cover', 'interface', 'colour', 'contrast', 'type', 'components', 'icons']) {
    const { html } = await renderThemePage({ theme: '35-dispatch', kind: 'guide', page, design, projectName: NAME }, E)
    assert.match(html, /<section[^>]*data-page="/, `the guide preview for ${page} draws a page`)
  }
})
