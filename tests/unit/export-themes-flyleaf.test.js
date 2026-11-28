// Theme 33, Flyleaf: the brand guidelines (31 pages, built on a grid) and the UI style guide, and the Free edition the route decides from the plan.
//
// What is pinned here, and the change that makes each fail:
//  1. EVERY PAGE DRAWS at A4 portrait and at 16:9, for several palettes (mid-blue, a very light one, a very dark one, one colour), in the slot
//     edition, through the engine's own makeCtx and pageDoc: 31 brand pages and ten UI pages, each once, print safe, none left out.
//     Break: make a page in themes/33-flyleaf/brand-*.js throw on a single-colour palette.
//  2. THE FREE EDITION IS SHORTER AND CREDITED, PRO IS NOT: serveExportDocument for a Free account gives the 7 named pages (4 for the guide)
//     with a credit line on every page; a Pro account gets every page and no credit line, at both sizes.
//     Break: return the full list from brandOrder() in kit.js when ctx.skeleton is true.
//  3. A REQUEST CANNOT FORCE PRO: a body that says it is Pro (plan, skeleton, isPro, tier) still gets the Free edition.
//     Break: read body.skeleton in serveThemeExport.
//  4. NO CLIENT MODULE IMPORTS THE THEME: nothing under src/ names the server theme folder.
//     Break: add an import of themes/33-flyleaf to a file under src/.
//  5. THE PROJECT'S NAME PRINTS, NOT A PLACEHOLDER: meta.realCopy keeps the name and colour names as words in the slot edition.
//     Break: drop realCopy from meta in themes/33-flyleaf/index.js.
//  6. NO DEMO COPY AND NO MOCKUP IN A DOWNLOAD: the showcase copy table never reaches a slot render, and no request field turns the
//     showcase or the photo mockups on. Break: set meta.mockups to true, or read body.edition in the route.
// Test seam: serveExportDocument (the route entry) for 2, 3, 5 and 6; makeCtx and pageDoc from the engine for 1.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { loadEngine, withCsp } from '../../api/_lib/exportThemeRoute.js'
import { isPrintSafe } from '../../src/utils/exportThemeRequest.js'
import { EXPORT_THEMES, themeHasRow } from '../../src/data/exportThemes.js'
import * as T from '../../api/_lib/exportThemes/themes/33-flyleaf/index.js'
import { UI_PAGES, UI_SKELETON } from '../../api/_lib/exportThemes/themes/33-flyleaf/helpers.js'
import { FULL, SKELETON, CREDIT } from '../../api/_lib/exportThemes/themes/33-flyleaf/kit.js'
import { SHOWCASE } from '../../api/_lib/exportThemes/themes/33-flyleaf/showcase.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const designOf = (colors) => ({ palette: { base: colors[0], harmony: 'auto', colors }, fonts: FONTS })
const PALETTES = {
  'mid-blue': ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'],
  'very light': ['#FFFFFF', '#F4F1EA', '#E8E0D0', '#FAFAFA', '#EDEDED'],
  'very dark': ['#000000', '#111111', '#1A1A2E', '#0B1D3A', '#222222'],
  'one colour': ['#F96B76'],
}
const SIZES = ['a4-portrait', '16x9']
const ids = (html) => [...html.matchAll(/data-page="([a-z0-9-]+)"/g)].map((m) => m[1])
const markup = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '')

const E = await loadEngine()

test('the full brand edition is 31 pages and the Free one is the 7 named pages, all from the same list', () => {
  assert.equal(FULL.length, 31)
  assert.deepEqual(SKELETON, ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'])
  assert.ok(SKELETON.every((id) => FULL.includes(id)))
  for (const id of FULL) assert.equal(typeof T.guidelines[id], 'function', `brand page ${id} is missing`)
})

for (const [name, colors] of Object.entries(PALETTES)) {
  for (const page of SIZES) {
    test(`every Flyleaf page draws for ${name} at ${page}`, () => {
      const brand = E.projectToBrand({ design: designOf(colors), projectName: 'Kerbside' })
      for (const [kind, list, pages] of [['guidelines', FULL, T.guidelines], ['guide', UI_PAGES, T.guide]]) {
        const ctx = E.makeCtx(T, 'slot', kind, E.loaders, brand, { page })
        if (kind === 'guidelines') assert.equal(ctx.size.h > ctx.size.w, page === 'a4-portrait')
        // a page that throws is called directly here, so a layout that cannot hold the words fails the test and is not left out quietly
        const html = list.map((id) => { assert.equal(typeof pages[id], 'function', `${kind} page ${id} is missing`); return pages[id](ctx) })
        const doc = E.pageDoc(ctx, T, { title: 'Flyleaf', pages: html, size: ctx.size })
        assert.deepEqual(ids(doc), list, `${kind} pages in order`)
        assert.ok(isPrintSafe(withCsp(doc)), `${kind} document is print safe once the route has added its CSP`)
        assert.ok(!doc.includes(CREDIT), 'the full edition has no credit line')
        assert.ok(!/undefined|NaN|\[object/.test(markup(doc)), `${kind}: no undefined, NaN or object text on a page`)
      }
    })
  }
}

test('the showcase edition (the harness only) draws every brand page with the mockups off', () => {
  const ctx = E.makeCtx(T, 'showcase', 'guidelines', E.loaders)
  const html = FULL.map((id) => T.guidelines[id](ctx))
  assert.deepEqual(ids(E.pageDoc(ctx, T, { title: 'Flyleaf', pages: html, size: ctx.size })), FULL)
  assert.notEqual(T.meta.mockups, true)
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
const design = designOf(PALETTES['mid-blue'])
const SHAPES = [
  { row: 'slides', format: 'pdf', full: FULL, skeleton: SKELETON },
  { row: 'guide', format: 'pdf', full: UI_PAGES, skeleton: UI_SKELETON },
]

test('Flyleaf is registered with a slides row and a guide row, and no other', () => {
  assert.ok(EXPORT_THEMES.some((t) => t.id === '33-flyleaf'))
  assert.ok(themeHasRow('33-flyleaf', 'slides') && themeHasRow('33-flyleaf', 'guide'))
  assert.ok(!themeHasRow('33-flyleaf', 'book') && !themeHasRow('33-flyleaf', 'ui-kit'))
})

test('the Free skeleton is a shorter list than the full edition, drawn from the same pages', () => {
  assert.ok(UI_SKELETON.length < UI_PAGES.length && UI_SKELETON.every((id) => UI_PAGES.includes(id)))
})

for (const s of SHAPES) {
  for (const page of SIZES) {
    test(`${s.row} at ${page}: Free gets the shorter list with a credit line on every page, Pro gets every page and none`, async () => {
      const req = { theme: '33-flyleaf', row: s.row, format: s.format, design, projectName: 'Kerbside', page }
      const free = await ask('free-1', req)
      const pro = await ask('pro-1', req)
      assert.equal(free.code, 200); assert.equal(pro.code, 200)
      assert.deepEqual(ids(free.body.html), s.skeleton)
      assert.equal(free.body.html.split(CREDIT).length - 1, s.skeleton.length, 'one credit line per Free page')
      assert.deepEqual(ids(pro.body.html), s.full)
      assert.ok(!pro.body.html.includes(CREDIT), 'Pro has no credit line')
    })
  }

  test(`${s.row}: a request body cannot force the full edition`, async () => {
    for (const extra of [{ plan: 'pro' }, { plan: { id: 'pro' } }, { skeleton: false }, { isPro: true }, { tier: 'Pro' }]) {
      const res = await ask('free-1', { theme: '33-flyleaf', row: s.row, format: s.format, design, projectName: 'Kerbside', ...extra })
      if (res.code === 200) {
        assert.deepEqual(ids(res.body.html), s.skeleton, `body ${JSON.stringify(extra)} still gets the skeleton`)
        assert.ok(res.body.html.includes(CREDIT))
      } else assert.equal(res.code, 400, `body ${JSON.stringify(extra)} is refused, never served as Pro`)
    }
  })
}

test('no client module imports the Flyleaf theme or the server theme folder', () => {
  const hits = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(m?jsx?|tsx?)$/.test(e.name) && /exportThemes\/(themes|engine)|33-flyleaf\/(index|helpers|kit|photos|ui-pages)/.test(fs.readFileSync(p, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, ''))) hits.push(p)
    }
  }
  walk(path.resolve('src'))
  assert.deepEqual(hits, [])
})

test('the project name and colour names print in the slot edition, not as placeholders', async () => {
  for (const s of SHAPES) for (const page of SIZES) {
    const res = await ask('pro-1', { theme: '33-flyleaf', row: s.row, format: s.format, page, design: designOf(['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8', '#C4472D']), projectName: 'Kerbside' })
    assert.equal(res.code, 200)
    const html = markup(res.body.html)
    assert.match(html, /Kerbside/, `${s.row} ${page}: the project name reaches the pages`)
    assert.ok(!/>\s*Brand name\s*</.test(html), `${s.row} ${page}: no Brand name placeholder is printed`)
    assert.ok(!/Your brand/.test(html), `${s.row} ${page}: the engine's stand-in name is not printed`)
  }
  // no project name: the name is still a placeholder for the user to write
  assert.equal(T.meta.realCopy('name', 'Your brand'), undefined)
})

// The demo copy is the showcase edition's; a download is the slot edition and the route never passes another edition.
// Two of its page lines are also the theme's own fallback words (the clear-space line comes from the logo's rules, the contact headline is generic), so they print in a slot render too.
const OWN_WORDS = new Set(['page.space.smallest', 'page.contact.headline'])
const DEMO = Object.entries(SHOWCASE).filter(([k, v]) => !OWN_WORDS.has(k) && v.length > 12).map(([, v]) => v)
const MOCKUP_PHOTOS = ['flatlay', 'laptop', 'stationery', 'phone']
const noDemo = (html, what) => {
  for (const line of DEMO) assert.ok(!html.includes(line), `${what}: the demo line "${line}" is printed`)
  assert.ok(!/Ellen Ward|margin\.press/.test(html), `${what}: demo names are printed`)
  assert.ok(!/matrix3d|mix-blend-mode/.test(html), `${what}: a mockup scene is drawn`)
  for (const id of MOCKUP_PHOTOS) assert.ok(!html.includes(`fl-im-${id}`), `${what}: the ${id} mockup photograph is embedded`)
}

test('a download carries no demo copy and no mockup image, at either size, Free or Pro', async () => {
  for (const uid of ['pro-1', 'free-1']) for (const page of SIZES) {
    const res = await ask(uid, { theme: '33-flyleaf', row: 'slides', format: 'pdf', page, design, projectName: 'Kerbside' })
    assert.equal(res.code, 200)
    noDemo(res.body.html, `${uid} ${page}`)
  }
  assert.equal(T.meta.mockups, false)
})

test('no request field turns the showcase or the mockups on', async () => {
  for (const extra of [{ edition: 'showcase' }, { showcase: true }, { mode: 'showcase' }, { mockups: true }, { meta: { mockups: true } }, { noMockups: false }]) {
    const res = await ask('pro-1', { theme: '33-flyleaf', row: 'slides', format: 'pdf', design, projectName: 'Kerbside', ...extra })
    if (res.code === 200) { noDemo(res.body.html, JSON.stringify(extra)); assert.deepEqual(ids(res.body.html), FULL) }
    else assert.equal(res.code, 400, `body ${JSON.stringify(extra)} is refused or ignored`)
  }
})

// THE FONT LICENCE TRAVELS WITH THE FONT: every Flyleaf zip that carries DM Mono also carries its SIL Open Font License.
// Break: drop the meta.fontLicences loop in engine/doc.js fontFiles.
test('every Flyleaf zip that carries DM Mono carries its licence beside it', async () => {
  const { default: JSZip } = await import('jszip')
  const { renderThemeExport } = await import('../../api/_lib/exportThemeRoute.js')
  const E = await loadEngine()
  for (const row of ['slides', 'guide']) {
    const { zip } = await renderThemeExport({ theme: '33-flyleaf', row, format: 'html', design: {}, projectName: 'Kerbside' }, E)
    const names = Object.keys((await JSZip.loadAsync(zip)).files)
    const mono = names.filter((n) => /assets\/fonts\/DMMono-[^/]+\.woff2$/.test(n))
    if (!mono.length) continue
    assert.ok(names.some((n) => n.endsWith('assets/fonts/DMMono-OFL.txt')), `${row}: DM Mono ships without its licence`)
  }
})
