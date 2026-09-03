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
  sitemapUrls,
  unadvertised,
} from '../../scripts/route-matrix.mjs'
import { ORIGIN, advertisedRoutes, buildSitemap } from '../../scripts/sync-sitemap.mjs'
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

// ── The sitemap is generated, and both directions are asserted ──────────────

test('public/sitemap.xml is exactly what the generator produces — no hand-edit drift', async () => {
  // The same guard vercel.json has had since #325, and for the same reason: a
  // generated file that anyone can hand-edit is a hand-written file with a
  // misleading comment on top. Text comparison, not set comparison — the set is
  // checked below; this catches the origin, the ordering and the shape.
  //
  // Line endings are normalised on BOTH sides, and that is not a softening: the
  // repo has no .gitattributes and this machine checks out with
  // core.autocrlf=true, so the file arrives CRLF on Windows and LF on CI while
  // the generator always writes LF. Comparing raw bytes would fail for every
  // Windows contributor on a clean checkout — a red build that says nothing
  // about the sitemap. Caught by mutation: `git checkout -- public/sitemap.xml`
  // made this test fail while the file was correct.
  const eol = (s) => s.replace(/\r\n/g, '\n')
  assert.equal(eol(read('public/sitemap.xml')), eol(buildSitemap()),
    'run `npm run sync:sitemap` — public/sitemap.xml has drifted from the route matrix')
})

test('THE DIRECTION THAT WAS NOT ASSERTED: every self-canonical prerendered route is advertised', async () => {
  // Containment (below) says everything advertised is prerendered. This is the
  // other way round and it is the one that lets a real page go missing: a route
  // that has its own shell, its own title and its own canonical, and which the
  // sitemap simply never mentions, is a page we built and did not tell anyone
  // about. Nothing failed for that before — `unadvertised()` was only asked
  // whether the extras were explainable, one route at a time.
  const sitemap = new Set(await sitemapRoutes())
  const missing = prerenderRoutes().filter(
    (route) => canonicalUrl(route) === `${ORIGIN}${route}` && !sitemap.has(route),
  )
  assert.deepEqual(missing, [],
    'these routes are prerendered and self-canonical but are not in sitemap.xml')
  // And the generator agrees about which routes those are, so the rule above
  // and the rule the file was written from cannot be two different rules.
  assert.deepEqual(advertisedRoutes(), ['/', ...[...sitemap].sort()])
})

test('nothing advertised is a URL we have canonicalised away', async () => {
  // The third leg, and the only one the generator cannot fake its way past:
  // this asks routeMeta.js directly rather than asking sync-sitemap.mjs whether
  // it agrees with itself. Break the generator rule and regenerate, and the two
  // tests above both still pass because both sides moved together — this one
  // does not, because canonicalUrl() has not moved.
  //
  // /home is the case. It is prerendered on purpose and canonicalised onto `/`,
  // so advertising it would be asking Google to crawl a URL whose own head
  // tells it to index a different one.
  for (const route of await sitemapRoutes()) {
    assert.equal(canonicalUrl(route), `${ORIGIN}${route}`,
      `${route} is advertised in sitemap.xml but canonicalises onto `
      + `${canonicalUrl(route)} — advertise the canonical, not the duplicate`)
  }
})

test('every advertised URL is absolute, on the canonical origin, and listed once', async () => {
  // sitemapRoutes() keeps only the pathname, so until now none of these three
  // could fail. An entry on http://uil4b.com is a different site to a crawler;
  // a duplicate `<loc>` was silently de-duplicated by the parser.
  const urls = await sitemapUrls()
  assert.ok(urls.length >= 20, `the sitemap advertises only ${urls.length} URLs`)
  assert.equal(new Set(urls).size, urls.length, 'a URL is advertised more than once')
  for (const loc of urls) {
    assert.ok(loc.startsWith(`${ORIGIN}/`),
      `${loc} is not on ${ORIGIN} — a crawler treats another host as another site`)
  }
  // The homepage is the entry the pathname parser drops on the floor, so it is
  // the one that could have gone missing without a single test noticing.
  assert.ok(urls.includes(`${ORIGIN}/`), 'the homepage is not advertised at all')
  // The origin is not written down here or in the generator: both ask
  // routeMeta.js, which is what stamps every canonical the site serves.
  assert.equal(ORIGIN, canonicalUrl('/').replace(/\/$/, ''))
})

test('the sitemap carries no hand-kept per-URL data left to go stale', async () => {
  // priority and changefreq are ignored by Google; lastmod was hand-typed and
  // had not been touched since 2026-08-22 while the pages behind it moved
  // through #325 and #332 — a lastmod a crawler learns to distrust is worse
  // than none. See scripts/sync-sitemap.mjs. Asserted rather than merely done,
  // because re-adding one by hand is exactly how this file rotted the first time.
  const xml = read('public/sitemap.xml')
  for (const field of ['priority', 'changefreq', 'lastmod']) {
    assert.ok(!xml.includes(`<${field}>`),
      `sitemap.xml carries a hand-kept <${field}> again — it is not derived from anything`)
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
