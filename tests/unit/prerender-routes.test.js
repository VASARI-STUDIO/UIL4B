// Prerendering only works if four things agree: the route matrix (which routes
// get a shell), routeMetaMap.js (what each one says), src/utils/routeMeta.js
// (what each one tells a crawler to do), and vercel.json's rewrites (whether
// the prerendered file is ever actually served).
//
// WHAT THIS GUARDS. A client-rendered SPA served one index.html for every URL,
// so every route shipped the HOMEPAGE's title, description and — worst —
// `canonical = https://www.uil4b.com`, telling crawlers to drop 25 URLs. The
// prerender fixes that, but it is silent: if a rewrite is missing, or a route
// has no title, the build still passes and the served HTML quietly reverts to
// the homepage's metadata. Nothing would notice.
//
// The route list used to be public/sitemap.xml itself. It is now the explicit
// matrix in scripts/route-matrix.mjs, because one list could not express a
// route that must be PRERENDERED but NOT ADVERTISED — see that file, and see
// the sitemap-containment test below for what replaced the equality.
//
// So these assert the agreement rather than the mechanism.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { buildRewrites, prerenderRoutes } from '../../scripts/sync-vercel-rewrites.mjs'
import {
  CREATE_HOMES_THAT_RENDER,
  allKnownRoutes,
  classifyRoute,
  routeMatrix,
  sitemapRoutes,
  unadvertised,
} from '../../scripts/route-matrix.mjs'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { CREATE_GROUPS } from '../../src/data/toolTree.js'
import { canonicalUrl, robotsFor } from '../../src/utils/routeMeta.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const vercel = () => JSON.parse(read('vercel.json'))

// Routes deliberately prerendered with the HOMEPAGE's own metadata, because
// they ARE the homepage under another URL. src/utils/routeMeta.js canonicalises
// /home onto /, and a canonicalised duplicate is supposed to carry its target's
// title and description — that is what makes it a duplicate rather than a
// second page competing for the same query. The two assertions below exist to
// catch a route that ships homepage metadata BY ACCIDENT, which is a different
// thing, so the alias is named here rather than weakening the rule.
const CANONICAL_ALIASES = ['/home']

test('every indexable route has its own title — none inherits the homepage', () => {
  const routes = prerenderRoutes()
  assert.ok(routes.length >= 20, `expected the matrix to list real routes, got ${routes.length}`)
  const homeTitle = PAGE_TITLES['/']
  for (const route of routes) {
    const title = PAGE_TITLES[route]
    assert.ok(title, `${route} is in the route matrix but has no entry in routeMetaMap.js`)
    if (CANONICAL_ALIASES.includes(route)) {
      assert.equal(title, homeTitle,
        `${route} is canonicalised onto / and must carry the homepage title, not a rival one`)
      continue
    }
    assert.notEqual(title, homeTitle, `${route} would ship the homepage title`)
  }
})

test('every indexable route has its own description', () => {
  const routes = prerenderRoutes()
  for (const route of routes) {
    const description = PAGE_DESCRIPTIONS[route]
    assert.ok(description, `${route} has no description of its own`)
    if (CANONICAL_ALIASES.includes(route)) continue
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
  const routes = prerenderRoutes()
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
  const routes = prerenderRoutes()
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
  const expected = buildRewrites(prerenderRoutes())
  assert.deepEqual(vercel().rewrites, expected,
    'run `npm run sync:rewrites` — vercel.json and the sitemap disagree')
})

// ── The matrix ──────────────────────────────────────────────────────────────

test('THE COMPLETENESS ONE: every route the app can render is classified', () => {
  // The failure this exists for is silence. A route that is neither prerendered
  // nor excluded-with-a-reason is a route nobody decided about — it just falls
  // through to vercel.json's catch-all and is served the noindex 404 shell,
  // which is a real answer given by nobody. That is how a public page stays
  // uncrawlable for a year while every gate stays green.
  const { routes, excluded } = routeMatrix()
  const known = allKnownRoutes()
  assert.ok(known.length >= 60,
    `expected to enumerate the whole route surface, found only ${known.length}`)
  assert.equal(routes.length + excluded.length, known.length,
    'a route is neither in the matrix nor in the exclusion list')
  for (const row of excluded) {
    assert.ok(row.reason && row.reason.length > 12,
      `${row.route} is excluded without a usable reason`)
  }
})

test('no excluded category is empty, or the rule behind it has quietly died', () => {
  // Each of these is a rule the founder asked for by name. If one stops
  // matching anything, either the app changed or the rule broke — and a rule
  // that silently matches nothing excludes nothing.
  const { excluded } = routeMatrix()
  const has = (needle) => excluded.some((r) => r.reason.includes(needle))
  for (const needle of ['retired URL', 'private, authenticated or admin', 'Soon', 'category home']) {
    assert.ok(has(needle), `nothing is excluded as "${needle}" any more`)
  }
})

test('nothing behind RequireAuth or RequireAdmin is prerendered', () => {
  // Stated as paths rather than by re-deriving the rule, because this is the
  // assertion the founder actually asked for and it must not be able to pass by
  // agreeing with a broken implementation of itself.
  const routes = prerenderRoutes()
  for (const gated of [
    '/projects', '/checkout', '/checkout/return', '/admin', '/style-guide',
    '/settings', '/login', '/onboarding',
  ]) {
    assert.ok(!routes.includes(gated), `${gated} is gated and must never be prerendered`)
  }
})

test('no Soon route is prerendered', () => {
  const routes = prerenderRoutes()
  const soon = []
  for (const group of CREATE_GROUPS) {
    if (group.soon) soon.push(group.home)
    for (const tool of group.tools) if (tool.soon) soon.push(tool.route)
  }
  assert.ok(soon.length >= 4, `expected the Create tree to still hold Soon routes, found ${soon.length}`)
  for (const route of soon) {
    assert.ok(!routes.includes(route), `${route} is still in the workshop and must not be prerendered`)
  }
  assert.ok(!routes.includes('/learn'), '/learn says it is coming soon and must not be prerendered')
})

test('CANONICAL AND NOINDEX TRUTH: every prerendered route is one the runtime indexes', () => {
  // The founder's constraint, checked against the runtime's own functions
  // rather than a copy of the rule. A route that robotsFor() says is noindex
  // must never get an indexable shell, and a shell's canonical must be the same
  // string App.jsx writes after hydration — otherwise the served page and the
  // rendered page instruct crawlers differently, and the more restrictive one
  // silently wins.
  for (const route of prerenderRoutes()) {
    assert.equal(robotsFor(route), 'index,follow',
      `${route} is prerendered but the runtime marks it ${robotsFor(route)}`)
    assert.match(canonicalUrl(route), /^https:\/\/www\.uil4b\.com(\/|\/\S+)$/,
      `${route} has no usable canonical`)
  }
  // /home is the reason this matters: its canonical is NOT origin + its own
  // path. prerender.mjs used to build `ORIGIN + route`, which would have
  // self-canonicalised the site's most-linked URL against the homepage it
  // duplicates. Pinned by value because it is the whole point.
  assert.equal(canonicalUrl('/home'), 'https://www.uil4b.com/',
    '/home must canonicalise onto the homepage, not onto itself')
})

test('the sitemap is a SUBSET of the matrix, and every extra route is explainable', async () => {
  // Containment, not equality. Everything advertised must be prerendered — an
  // advertised URL served the 404 shell is worse than not advertising it. The
  // reverse is deliberately allowed: /home is prerendered so it stops unfurling
  // as "Page not found", and is kept out of the sitemap because it is
  // canonicalised onto /.
  const routes = prerenderRoutes()
  const sitemap = await sitemapRoutes()
  assert.ok(sitemap.length >= 20, `the sitemap advertises only ${sitemap.length} routes`)
  for (const route of sitemap) {
    assert.ok(routes.includes(route),
      `${route} is advertised in sitemap.xml but gets no prerendered shell`)
  }
  // Every route in the matrix but not the sitemap has to be a canonical alias —
  // a page whose canonical points somewhere else. Anything else in this list is
  // a page we prerender and then forgot to advertise.
  for (const route of unadvertised(routes, sitemap)) {
    assert.notEqual(canonicalUrl(route), `https://www.uil4b.com${route}`,
      `${route} is prerendered, self-canonical and NOT in sitemap.xml — either `
      + 'advertise it or explain why it is prerendered at all')
  }
})

test('the category-home assumption is still true in the code it describes', () => {
  // scripts/route-matrix.mjs excludes four Create category homes because
  // CreateTool.jsx redirects them to their first tool, and keeps /create/color
  // because App.jsx renders it above CreateTool. LIVE_TOOLS lives in a .jsx
  // module Node cannot import, so that is the one fact in the matrix which is
  // asserted rather than derived — and an unchecked assumption is just a
  // parallel list with better manners. This reads both source files.
  const createTool = read('src/pages/CreateTool.jsx')
  const app = read('src/App.jsx')

  // The redirect branch that makes a category home not-a-page.
  assert.match(createTool, /if \(isHome && !group\.soon && !homeIsLive/,
    'CreateTool.jsx no longer redirects live category homes to their first tool — '
    + 'the four homes excluded from the matrix may now be real pages')

  // /create/color is the exception, and it is an exception because App.jsx says so.
  assert.deepEqual([...CREATE_HOMES_THAT_RENDER], ['/create/color'])
  assert.match(app, /bare === '\/create\/color'/,
    'App.jsx no longer intercepts /create/color above CreateTool, so it may now '
    + 'redirect like the other category homes')

  // And no excluded home has quietly become a live screen.
  const liveBlock = createTool.slice(createTool.indexOf('const LIVE_TOOLS'))
  for (const group of CREATE_GROUPS) {
    if (CREATE_HOMES_THAT_RENDER.includes(group.home)) continue
    assert.ok(!liveBlock.includes(`'${group.home}':`),
      `${group.home} is now in LIVE_TOOLS, so it renders a real screen and should `
      + 'be prerendered rather than excluded as a redirect')
  }
})

test('classifyRoute gives the FIRST true reason, not just any true one', () => {
  // A route can be several things at once. `/typography` is a retired URL that
  // points at a category home that redirects; the honest answer is the one the
  // edge acts on first, because that is what actually happens to the request.
  assert.equal(classifyRoute('/typography').prerender, false)
  assert.match(classifyRoute('/typography').reason, /retired URL/)
  assert.match(classifyRoute('/create/typography').reason, /category home/)
  assert.match(classifyRoute('/create/box-shadow').reason, /Soon/)
  assert.match(classifyRoute('/projects').reason, /private/)
  assert.equal(classifyRoute('/create/palette').prerender, true)
  // Trailing slashes and casing must not create a second answer.
  assert.equal(classifyRoute('/Create/Palette/').prerender, true)
})
