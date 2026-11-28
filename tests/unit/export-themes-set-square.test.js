// Theme 34, Set Square: the brand guidelines (31 pages as a drawing set, 16:9 and A4 portrait) and the Free edition the route decides from the plan.
//
// What is pinned here, and the change that makes each fail:
//  1. THE EDITIONS: Pro is 31 pages at 16:9 and at A4 portrait with no credit line; the Free skeleton is 7 pages with "Made with UIL4B" in the
//     title block of each. Break: return the full list from brandOrder() in kit.js when ctx.skeleton is true.
//  2. EVERY PAGE DRAWS at both sizes for several palettes, through the engine's own makeCtx and pageDoc, none left out.
//     Break: make a page in themes/34-set-square/pages-*.js throw on a single-colour palette.
//  3. THE PROJECT'S NAME PRINTS, NOT A PLACEHOLDER: meta.realCopy keeps the name and colour names as words in the slot edition.
//     Break: drop realCopy from meta in themes/34-set-square/index.js.
//  4. NO SHOWCASE COPY AND NO MOCKUP IN A DOWNLOAD: the Plumbline copy never reaches a slot render, and no request field turns the showcase
//     or the photo mockups on. Break: set meta.mockups to true, or read body.edition in the route.
//  5. THE FONT LICENCE TRAVELS WITH THE FONT: every zip that carries IBM Plex Mono carries its SIL Open Font License.
//     Break: drop the meta.fontLicences loop in engine/doc.js fontFiles.
//  6. NO PANGRAM: the type samples are the user's to write. Break: return a pangram for type.sample.* in themes/34-set-square/real-copy.js.
//  7. THE THEME IS PRO WITH THE GUIDELINES ROW ONLY: a Free account is refused, and the style guide, book and UI kit are unknown rows.
//     Break: add `free: true` or a `guide` row to the table entry in src/data/exportThemes.js.
// Test seam: renderThemeExport (the route's own builder, with the plan's `skeleton` flag) and serveExportDocument (the route entry).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { loadEngine, renderThemeExport, withCsp } from '../../api/_lib/exportThemeRoute.js'
import { isPrintSafe } from '../../src/utils/exportThemeRequest.js'
import { EXPORT_THEMES, themeHasRow, themeHasPage } from '../../src/data/exportThemes.js'
import * as T from '../../api/_lib/exportThemes/themes/34-set-square/index.js'
import { FULL, SKELETON, CREDIT } from '../../api/_lib/exportThemes/themes/34-set-square/kit.js'
import { SHOWCASE } from '../../api/_lib/exportThemes/themes/34-set-square/showcase.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const designOf = (colors) => ({ palette: { base: colors[0], harmony: 'auto', colors }, fonts: FONTS })
const PALETTES = {
  'mid-blue': ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'],
  'very light': ['#FFFFFF', '#F4F1EA', '#E8E0D0', '#FAFAFA', '#EDEDED'],
  'very dark': ['#000000', '#111111', '#1A1A2E', '#0B1D3A', '#222222'],
  'one colour': ['#F96B76'],
}
const SIZES = ['a4-portrait', '16x9']
// the 'art-' pages are the miniatures a page draws of its own sheets, not pages of the document
const ids = (html) => [...html.matchAll(/data-page="([a-z0-9-]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith('art-'))
// the credit sits in the title block as a label cell ("Made with") over a value cell ("UIL4B"); CREDIT is the same words in one string
assert.equal(CREDIT, 'Made with UIL4B')
const credits = (html) => (html.match(/Made with<\/div><div[^>]*>UIL4B/g) || []).length
const markup = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '')
const design = designOf(PALETTES['mid-blue'])

const E = await loadEngine()
const make = (extra) => renderThemeExport({ theme: '34-set-square', row: 'slides', design, projectName: 'Kerbside', ...extra }, E)

test('the full edition is 31 pages and the Free one is the 7 named pages, all from the same list', () => {
  assert.equal(FULL.length, 31)
  assert.deepEqual(SKELETON, ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'])
  assert.ok(SKELETON.every((id) => FULL.includes(id)))
  for (const id of FULL) assert.equal(typeof T.guidelines[id], 'function', `brand page ${id} is missing`)
})

for (const [name, colors] of Object.entries(PALETTES)) {
  for (const page of SIZES) {
    test(`every Set Square page draws for ${name} at ${page}`, () => {
      const brand = E.projectToBrand({ design: designOf(colors), projectName: 'Kerbside' })
      const ctx = E.makeCtx(T, 'slot', 'guidelines', E.loaders, brand, { page })
      assert.equal(ctx.size.h > ctx.size.w, page === 'a4-portrait')
      // a page that throws is called directly here, so a layout that cannot hold the words fails the test and is not left out quietly
      const html = FULL.map((id) => T.guidelines[id](ctx))
      const doc = E.pageDoc(ctx, T, { title: 'Set Square', pages: html, size: ctx.size })
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

test('Set Square is registered as a Pro theme with the slides row and both page sizes, and no other row', () => {
  assert.ok(EXPORT_THEMES.some((t) => t.id === '34-set-square'))
  assert.ok(themeHasRow('34-set-square', 'slides'))
  for (const row of ['guide', 'book', 'ui-kit']) assert.ok(!themeHasRow('34-set-square', row), row)
  assert.ok(themeHasPage('34-set-square', '16x9') && themeHasPage('34-set-square', 'a4-portrait') && !themeHasPage('34-set-square', 'a4-landscape'))
  assert.deepEqual([...T.meta.pages], [...EXPORT_THEMES.find((t) => t.id === '34-set-square').pages])
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

test('a Free account is refused, and the rows Set Square lacks are unknown', async () => {
  const base = { theme: '34-set-square', design, projectName: 'Kerbside' }
  const free = await ask('free-1', { ...base, row: 'slides', format: 'pdf' })
  assert.equal(free.code, 403); assert.equal(free.body.code, 'pro_required')
  for (const [row, format] of [['guide', 'pdf'], ['book', 'pdf'], ['ui-kit', 'zip']]) {
    const res = await ask('pro-1', { ...base, row, format })
    assert.equal(res.code, 400, row); assert.equal(res.body.code, 'unknown_row', row)
  }
})

test('the project name and colour names print in the slot edition, not as placeholders', async () => {
  for (const page of SIZES) {
    const res = await ask('pro-1', { theme: '34-set-square', row: 'slides', format: 'pdf', page, design: designOf(['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8', '#C4472D']), projectName: 'Kerbside' })
    assert.equal(res.code, 200)
    const html = markup(res.body.html)
    assert.match(html, /Kerbside/, `${page}: the project name reaches the pages`)
    assert.ok(!/>\s*Brand name\s*</.test(html), `${page}: no Brand name placeholder is printed`)
    assert.ok(!/Your brand/.test(html), `${page}: the engine's stand-in name is not printed`)
  }
  // no project name: the name is still a placeholder for the user to write
  assert.equal(T.meta.realCopy('name', 'Your brand'), undefined)
})

test('no client module imports the Set Square theme or the server theme folder', () => {
  const hits = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(m?jsx?|tsx?)$/.test(e.name) && /exportThemes\/(themes|engine)|34-set-square\//.test(fs.readFileSync(p, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, ''))) hits.push(p)
    }
  }
  walk(path.resolve('src'))
  assert.deepEqual(hits, [])
})

// The demo copy (Plumbline, a renovation builder) is the showcase edition's; a download is the slot edition and the route never passes another edition.
// The `page.*` lines are also the pages' own fallback words (copy() in showcase.js returns them outside the showcase), so they print in a slot render too;
// every other line is brand copy and must not.
const OWN_WORDS = new Set(Object.entries(SHOWCASE).filter(([k]) => k.startsWith('page.')).map(([, v]) => v))
const DEMO = Object.entries(SHOWCASE).filter(([k, v]) => typeof v === 'string' && !k.startsWith('page.') && !OWN_WORDS.has(v) && v.length > 12).map(([, v]) => v)
const MOCKUP_PHOTOS = ['hoarding', 'phone', 'stationery']
const noDemo = (html, what) => {
  assert.ok(DEMO.length > 10, 'the demo list is built from the showcase table')
  for (const line of DEMO) assert.ok(!html.includes(line), `${what}: the demo line "${line}" is printed`)
  assert.ok(!/plumbline|ballarat/i.test(markup(html)), `${what}: Plumbline words are printed`)
  assert.ok(!/matrix3d|mix-blend-mode/.test(html), `${what}: a mockup scene is drawn`)
  for (const id of MOCKUP_PHOTOS) assert.ok(!html.includes(`ss-im-${id}`), `${what}: the ${id} mockup photograph is embedded`)
}

test('a download carries no showcase copy and no mockup image, at either size, Free or Pro', async () => {
  for (const skeleton of [false, true]) for (const page of SIZES) {
    const { html } = await make({ format: 'pdf', page, skeleton })
    noDemo(html, `${skeleton ? 'free' : 'pro'} ${page}`)
  }
  assert.equal(T.meta.mockups, false)
})

test('no request field turns the showcase or the mockups on', async () => {
  for (const extra of [{ edition: 'showcase' }, { showcase: true }, { mode: 'showcase' }, { mockups: true }, { meta: { mockups: true } }, { noMockups: false }]) {
    const res = await ask('pro-1', { theme: '34-set-square', row: 'slides', format: 'pdf', design, projectName: 'Kerbside', ...extra })
    if (res.code === 200) { noDemo(res.body.html, JSON.stringify(extra)); assert.deepEqual(ids(res.body.html), FULL) }
    else assert.equal(res.code, 400, `body ${JSON.stringify(extra)} is refused or ignored`)
  }
})

test('every Set Square zip that carries IBM Plex Mono carries its licence beside it', async () => {
  const { default: JSZip } = await import('jszip')
  for (const page of SIZES) for (const skeleton of [false, true]) {
    const { zip } = await make({ format: 'html', page, skeleton })
    const names = Object.keys((await JSZip.loadAsync(zip)).files)
    assert.ok(names.some((n) => /assets\/fonts\/IBMPlexMono-400\.woff2$/.test(n)), `${page}: the zip carries IBM Plex Mono`)
    assert.ok(names.some((n) => n.endsWith('assets/fonts/IBMPlexMono-OFL.txt')), `${page}: IBM Plex Mono ships without its licence`)
  }
})

test('a Set Square export never prints a pangram as the brand headline or sample', async () => {
  for (const page of SIZES) for (const skeleton of [false, true]) {
    const { html } = await make({ format: 'pdf', page, skeleton })
    for (const p of ['five dozen liquor jugs', 'quick brown fox', 'vexingly quick daft zebras', 'black quartz, judge my vow']) {
      assert.ok(!html.toLowerCase().includes(p), `${page} ${skeleton ? 'Free' : 'Pro'} prints "${p}"`)
    }
  }
})
