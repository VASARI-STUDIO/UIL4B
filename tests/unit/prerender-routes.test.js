// Prerendering only works if three things agree: the sitemap (which routes are
// indexable), routeMetaMap.js (what each one says), and vercel.json's rewrites
// (whether the prerendered file is ever actually served).
//
// WHAT THIS GUARDS. A client-rendered SPA served one index.html for every URL,
// so every route shipped the HOMEPAGE's title, description and — worst —
// `canonical = https://www.uil4b.com`, telling crawlers to drop 25 URLs. The
// prerender fixes that, but it is silent: if a rewrite is missing, or a route
// has no title, the build still passes and the served HTML quietly reverts to
// the homepage's metadata. Nothing would notice.
//
// So these assert the agreement rather than the mechanism.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { buildRewrites, prerenderRoutes } from '../../scripts/sync-vercel-rewrites.mjs'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const vercel = () => JSON.parse(read('vercel.json'))

test('every indexable route has its own title — none inherits the homepage', async () => {
  const routes = await prerenderRoutes()
  assert.ok(routes.length >= 20, `expected the sitemap to list real routes, got ${routes.length}`)
  const homeTitle = PAGE_TITLES['/']
  for (const route of routes) {
    const title = PAGE_TITLES[route]
    assert.ok(title, `${route} is in the sitemap but has no entry in routeMetaMap.js`)
    assert.notEqual(title, homeTitle, `${route} would ship the homepage title`)
  }
})

test('every indexable route has its own description', async () => {
  const routes = await prerenderRoutes()
  for (const route of routes) {
    const description = PAGE_DESCRIPTIONS[route]
    assert.ok(description, `${route} has no description of its own`)
    assert.notEqual(description, DEFAULT_DESCRIPTION,
      `${route} would ship the generic default description`)
  }
})

test('THE ONE THAT MATTERS: vercel.json serves the prerendered file for every route', async () => {
  // The catch-all `/((?!api/|assets/).*)` → `/index.html` sends everything to
  // the root shell. Vercel is documented to check the filesystem first, which
  // would make that harmless — but Vite's own preview server does the opposite
  // (its SPA fallback wins), which is exactly how a prerender ships and does
  // nothing while every gate stays green. So each route is matched explicitly,
  // ahead of the catch-all, and this asserts none is missing.
  const routes = await prerenderRoutes()
  const rewrites = vercel().rewrites
  for (const route of routes) {
    const hit = rewrites.find(r => r.source === route)
    assert.ok(hit, `vercel.json has no rewrite for ${route} — the catch-all would swallow it`)
    assert.equal(hit.destination, `${route}/index.html`)
  }
})

test('the explicit rewrites come BEFORE the catch-all, or they never fire', async () => {
  const rewrites = vercel().rewrites
  // The catch-all now serves /404.html, not /index.html: serving the homepage
  // shell for unknown URLs was the soft 404 (200 + index,follow + the
  // homepage's content at unlimited URLs). Matched on the negative-lookahead
  // source, which is what actually makes it the catch-all.
  const catchAll = rewrites.findIndex(r => r.source.includes('?!'))
  assert.ok(catchAll > -1, 'the SPA catch-all must still exist for client-side routes')
  const routes = await prerenderRoutes()
  for (const route of routes) {
    const at = rewrites.findIndex(r => r.source === route)
    assert.ok(at < catchAll, `${route} is listed after the catch-all and would never match`)
  }
})

test('the API share route survives, and the SPA fallback still covers everything else', async () => {
  const rewrites = vercel().rewrites
  assert.equal(rewrites[0].source, '/p/:code', 'the share shortlink must stay first')
  assert.equal(rewrites[0].destination, '/api/share?c=:code')
  // Client-only routes that are deliberately NOT prerendered (they are
  // noindexed, gated or redirect-only) still need the fallback to reach React.
  //
  // That fallback is now /404.html rather than /index.html. Both are the same
  // SPA shell so React still boots and renders the real page — the difference
  // is the head it arrives with. Serving index.html meant every unknown URL
  // returned 200 with `index,follow` and the homepage's canonical, which is a
  // soft 404. These gated routes get `noindex` out of the same change, which is
  // what they should have carried anyway.
  const catchAll = rewrites[rewrites.length - 1]
  assert.equal(catchAll.destination, '/404.html')
  for (const clientOnly of ['/settings', '/projects', '/checkout', '/login', '/learn']) {
    assert.ok(!rewrites.some(r => r.source === clientOnly),
      `${clientOnly} must fall through to the SPA, not be prerendered`)
  }
  // /discover moved the other way: it is a real page with real content and is
  // now prerendered and advertised.
  assert.ok(rewrites.some(r => r.source === '/discover'),
    '/discover is indexable content and should have its own prerendered shell')
})

test('vercel.json is exactly what the generator produces — no hand-edit drift', async () => {
  const expected = buildRewrites(await prerenderRoutes())
  assert.deepEqual(vercel().rewrites, expected,
    'run `npm run sync:rewrites` — vercel.json and the sitemap disagree')
})
