// Theme 33, Flyleaf: the brand pages and the UI style guide pages, and the Free skeleton the route decides from the plan.
//
// What is pinned here, and the change that makes each fail:
//  1. EVERY PAGE DRAWS at A4 and at 16:9, for several palettes (mid-blue #2E7BB8, a very light one, a very dark one, one colour), in both
//     the slot and the showcase edition, through the engine's own pageDoc: ten brand pages and ten UI pages, each once, print safe.
//     Break: make a page in themes/33-flyleaf/brand-pages.js or ui-pages.js throw on a single-colour palette.
//  2. THE FREE EDITION IS SHORTER AND CREDITED, PRO IS NOT: serveExportDocument for a Free account gives the skeleton page lists with a credit
//     line on every page; a Pro account gets every page and no credit line.
//     Break: return the full list from brandOrder() in helpers.js when ctx.skeleton is true.
//  3. A REQUEST CANNOT FORCE PRO: a body that says it is Pro (plan, skeleton, isPro, tier) still gets the Free edition.
//     Break: read body.skeleton in serveThemeExport.
//  4. NO CLIENT MODULE IMPORTS THE THEME: nothing under src/ names the server theme folder.
//     Break: add an import of themes/33-flyleaf to a file under src/.
// Test seam: serveExportDocument (the route entry) for 2 and 3; makeCtx and pageDoc from the engine for 1.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { loadEngine } from '../../api/_lib/exportThemeRoute.js'
import { isPrintSafe } from '../../src/utils/exportThemeRequest.js'
import { EXPORT_THEMES, themeHasRow } from '../../src/data/exportThemes.js'
import * as T from '../../api/_lib/exportThemes/themes/33-flyleaf/index.js'
import { BRAND_PAGES, UI_PAGES, BRAND_SKELETON, UI_SKELETON, CREDIT } from '../../api/_lib/exportThemes/themes/33-flyleaf/helpers.js'

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
    test(`every Flyleaf page draws for ${name} at ${sizeName}`, () => {
      const brand = E.projectToBrand({ design: designOf(colors), projectName: 'Kerbside' })
      for (const [kind, list, pages] of [['guidelines', BRAND_PAGES, T.guidelines], ['guide', UI_PAGES, T.guide]]) {
        const ctx = E.makeCtx(T, 'slot', kind, E.loaders, brand)
        ctx.size = size
        const html = list.map((id) => { assert.equal(typeof pages[id], 'function', `${kind} page ${id} is missing`); return pages[id](ctx) })
        const doc = E.pageDoc(ctx, T, { title: 'Flyleaf', pages: html, size })
        assert.deepEqual(ids(doc), list, `${kind} pages in order`)
        assert.ok(isPrintSafe(doc), `${kind} document is print safe`)
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
    assert.deepEqual(ids(E.pageDoc(ctx, T, { title: 'Flyleaf', pages: html, size: ctx.size })), list)
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

test('Flyleaf is registered with a slides row and a guide row, and no other', () => {
  assert.ok(EXPORT_THEMES.some((t) => t.id === '33-flyleaf'))
  assert.ok(themeHasRow('33-flyleaf', 'slides') && themeHasRow('33-flyleaf', 'guide'))
  assert.ok(!themeHasRow('33-flyleaf', 'book') && !themeHasRow('33-flyleaf', 'ui-kit'))
})

test('the Free skeleton is a shorter list than the full edition, drawn from the same pages', () => {
  assert.ok(BRAND_SKELETON.length < BRAND_PAGES.length && BRAND_SKELETON.every((id) => BRAND_PAGES.includes(id)))
  assert.ok(UI_SKELETON.length < UI_PAGES.length && UI_SKELETON.every((id) => UI_PAGES.includes(id)))
})

for (const s of SHAPES) {
  test(`${s.row}: Free gets the shorter list with a credit line on every page, Pro gets every page and none`, async () => {
    const free = await ask('free-1', { theme: '33-flyleaf', row: s.row, format: s.format, design, projectName: 'Kerbside' })
    const pro = await ask('pro-1', { theme: '33-flyleaf', row: s.row, format: s.format, design, projectName: 'Kerbside' })
    assert.equal(free.code, 200); assert.equal(pro.code, 200)
    assert.deepEqual(ids(free.body.html), s.skeleton)
    assert.equal(free.body.html.split(CREDIT).length - 1, s.skeleton.length, 'one credit line per Free page')
    assert.deepEqual(ids(pro.body.html), s.full)
    assert.ok(!pro.body.html.includes(CREDIT), 'Pro has no credit line')
  })

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
      else if (/\.(m?jsx?|tsx?)$/.test(e.name) && /exportThemes\/(themes|engine)|33-flyleaf\/(index|helpers|brand-pages|ui-pages)/.test(fs.readFileSync(p, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, ''))) hits.push(p)
    }
  }
  walk(path.resolve('src'))
  assert.deepEqual(hits, [])
})
