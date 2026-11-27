// Theme 34, Set Square: the brand pages and the UI style guide pages, and the Free skeleton the route decides from the plan.
//
// What is pinned here, and the change that makes each fail:
//  1. EVERY PAGE DRAWS at A4 and at 16:9, for several palettes (mid-blue #2E7BB8, a very light one, a very dark one, one colour), in both
//     the slot and the showcase edition, through the engine's own pageDoc: ten brand pages and ten UI pages, each once, print safe.
//     Break: make a page in themes/34-set-square/brand-pages.js or ui-pages.js throw on a single-colour palette.
//  2. PRO GETS EVERY PAGE, FREE GETS NOTHING: Set Square is a Pro theme, so serveExportDocument gives a Pro account every page and no credit line
//     and refuses a Free account. The route's skeleton edition (renderThemeExport with skeleton true) is the shorter, credited list.
//     Break: return the full list from brandOrder() in helpers.js when ctx.skeleton is true.
//  3. A REQUEST CANNOT FORCE PRO: a body that says it is Pro (plan, skeleton, isPro, tier) from a Free account is still refused.
//     Break: let the Pro check in the route read body.plan.
//  4. NO CLIENT MODULE IMPORTS THE THEME: nothing under src/ names the server theme folder.
//     Break: add an import of themes/34-set-square to a file under src/.
// Test seam: serveExportDocument (the route entry) and renderThemeExport for 2 and 3; makeCtx and pageDoc from the engine for 1.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { loadEngine, withCsp, renderThemeExport } from '../../api/_lib/exportThemeRoute.js'
import { isPrintSafe } from '../../src/utils/exportThemeRequest.js'
import { EXPORT_THEMES, themeHasRow } from '../../src/data/exportThemes.js'
import * as T from '../../api/_lib/exportThemes/themes/34-set-square/index.js'
import { BRAND_PAGES, UI_PAGES, BRAND_SKELETON, UI_SKELETON, CREDIT } from '../../api/_lib/exportThemes/themes/34-set-square/helpers.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const designOf = (colors) => ({ palette: { base: colors[0], harmony: 'auto', colors }, fonts: FONTS })
const PALETTES = {
  'mid-blue': ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'],
  'very light': ['#FFFFFF', '#F4F1EA', '#E8E0D0', '#FAFAFA', '#EDEDED'],
  'very dark': ['#000000', '#111111', '#1A1A2E', '#0B1D3A', '#222222'],
  'one colour': ['#F96B76'],
}
const SIZES = { A4: { w: 794, h: 1123 }, '16:9': { w: 1280, h: 720 } }
const ids = (html) => [...html.matchAll(/data-page="([a-z]+)"/g)].map((m) => m[1])

const E = await loadEngine()

for (const [name, colors] of Object.entries(PALETTES)) {
  for (const [sizeName, size] of Object.entries(SIZES)) {
    test(`every Set Square page draws for ${name} at ${sizeName}`, () => {
      const brand = E.projectToBrand({ design: designOf(colors), projectName: 'Kerbside' })
      for (const [kind, list, pages] of [['guidelines', BRAND_PAGES, T.guidelines], ['guide', UI_PAGES, T.guide]]) {
        const ctx = E.makeCtx(T, 'slot', kind, E.loaders, brand)
        ctx.size = size
        const html = list.map((id) => { assert.equal(typeof pages[id], 'function', `${kind} page ${id} is missing`); return pages[id](ctx) })
        const doc = E.pageDoc(ctx, T, { title: 'Set Square', pages: html, size })
        assert.deepEqual(ids(doc), list, `${kind} pages in order`)
        assert.ok(isPrintSafe(withCsp(doc)), `${kind} document is print safe once the route has added its CSP`)
        assert.ok(!doc.includes(CREDIT), 'the full edition has no credit line')
        assert.ok(!/undefined|NaN|\[object/.test(doc.replace(/<style>[\s\S]*?<\/style>/, '')), `${kind}: no undefined, NaN or object text on a page`)
      }
    })
  }
}

test('the showcase edition draws every page too', () => {
  for (const [kind, list, pages] of [['guidelines', BRAND_PAGES, T.guidelines], ['guide', UI_PAGES, T.guide]]) {
    const ctx = E.makeCtx(T, 'showcase', kind, E.loaders)
    const html = list.map((id) => pages[id](ctx))
    assert.deepEqual(ids(E.pageDoc(ctx, T, { title: 'Set Square', pages: html, size: ctx.size })), list)
  }
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
  { row: 'slides', format: 'pdf', full: BRAND_PAGES, skeleton: BRAND_SKELETON },
  { row: 'guide', format: 'pdf', full: UI_PAGES, skeleton: UI_SKELETON },
]

test('Set Square is registered with a slides row and a guide row, and no other', () => {
  assert.ok(EXPORT_THEMES.some((t) => t.id === '34-set-square'))
  assert.ok(themeHasRow('34-set-square', 'slides') && themeHasRow('34-set-square', 'guide'))
  assert.ok(!themeHasRow('34-set-square', 'book') && !themeHasRow('34-set-square', 'ui-kit'))
})

test('the Free skeleton is a shorter list than the full edition, drawn from the same pages', () => {
  assert.ok(BRAND_SKELETON.length < BRAND_PAGES.length && BRAND_SKELETON.every((id) => BRAND_PAGES.includes(id)))
  assert.ok(UI_SKELETON.length < UI_PAGES.length && UI_SKELETON.every((id) => UI_PAGES.includes(id)))
})

for (const s of SHAPES) {
  test(`${s.row}: Pro gets every page and no credit line`, async () => {
    const pro = await ask('pro-1', { theme: '34-set-square', row: s.row, format: s.format, design, projectName: 'Kerbside' })
    assert.equal(pro.code, 200)
    assert.deepEqual(ids(pro.body.html), s.full)
    assert.ok(!pro.body.html.includes(CREDIT), 'Pro has no credit line')
  })

  test(`${s.row}: a Free account is refused (Set Square is Pro), whatever the body claims`, async () => {
    for (const extra of [{}, { plan: 'pro' }, { plan: { id: 'pro' } }, { skeleton: false }, { isPro: true }, { tier: 'Pro' }]) {
      const res = await ask('free-1', { theme: '34-set-square', row: s.row, format: s.format, design, projectName: 'Kerbside', ...extra })
      assert.notEqual(res.code, 200, `body ${JSON.stringify(extra)} is never served as Pro`)
      assert.ok(!(res.body && res.body.html), 'no document leaves with the refusal')
    }
  })

  test(`${s.row}: the skeleton edition the server can ask for is shorter and credited on every page`, async () => {
    const out = await renderThemeExport({ theme: '34-set-square', row: s.row, format: s.format, design, projectName: 'Kerbside', skeleton: true }, E)
    assert.deepEqual(ids(out.html), s.skeleton)
    assert.equal(out.html.split(CREDIT).length - 1, s.skeleton.length, 'one credit line per page')
  })
}

test('no client module imports the Set Square theme or the server theme folder', () => {
  const hits = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(m?jsx?|tsx?)$/.test(e.name) && /exportThemes\/(themes|engine)|34-set-square\/(index|helpers|brand-pages|ui-pages)/.test(fs.readFileSync(p, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, ''))) hits.push(p)
    }
  }
  walk(path.resolve('src'))
  assert.deepEqual(hits, [])
})
