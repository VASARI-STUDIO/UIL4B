// A URL that resolves to nothing must SAY so — to the person and to the crawler.
//
// The 2026-08-11 site audit, P2: `curl -o /dev/null -w "%{http_code}"
// /this-does-not-exist` returned **200**, rendering the homepage with
// `robots: index,follow`. The catch-all was
// `<Route path="*" element={<Navigate to="/" replace />} />`.
//
// Two separate harms, and the redirect caused both:
//
//   • Every typo, dead backlink and hallucinated URL became an indexable page
//     whose content was the homepage — so the homepage appeared at unlimited
//     URLs, all self-canonicalising.
//   • The user was silently teleported to `/`, which reads as the link having
//     worked. Nobody reports a broken link they were never shown.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isUnknownRoute, isPrivateRoute, robotsFor, canonicalUrl } from '../../src/utils/routeMeta.js'
import { PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { buildRewrites, prerenderRoutes } from '../../scripts/sync-vercel-rewrites.mjs'
import { sitemapRoutes } from '../../scripts/route-matrix.mjs'
import { LEARN_ARTICLE_ROUTES } from '../../src/data/learnIndex.js'
// ── "prerendered" and "advertised" are no longer the same set ───────────────
//
// scripts/route-matrix.mjs now decides which routes get a shell, and
// public/sitemap.xml is the ADVERTISED SUBSET of that matrix. They differ by
// /home, which is prerendered so the site's most-linked URL stops unfurling as
// "Page not found", and is deliberately not advertised because routeMeta.js
// canonicalises it onto `/`.
//
// So every assertion below now asks the right list: sitemapRoutes() where it
// means "we told Google about this", prerenderRoutes() where it means "a file
// exists at this path". They used to be one call, which is why several test
// names below say "sitemap" while reading the prerender list.


const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

// ── What counts as missing ──────────────────────────────────────────────────

test('every route with its own metadata is treated as real', () => {
  for (const route of Object.keys(PAGE_TITLES)) {
    assert.equal(isUnknownRoute(route), false, `${route} has a title but reads as missing`)
  }
})

test('every route in the crawler sitemap is treated as real', async () => {
  // A sitemap entry that the app considers unknown would be advertised to
  // Google and then served `noindex` — actively worse than not listing it.
  for (const route of await sitemapRoutes()) {
    assert.equal(isUnknownRoute(route), false, `${route} is in sitemap.xml but reads as missing`)
  }
})

test('a genuinely absent URL is unknown', () => {
  for (const junk of ['/this-does-not-exist', '/wp-admin', '/create/not-a-tool', '/a/b/c/d']) {
    assert.equal(isUnknownRoute(junk), true, `${junk} should read as missing`)
  }
})

test('trailing slashes and query strings do not invent a missing page', () => {
  assert.equal(isUnknownRoute('/create/type-scale/'), false)
  assert.equal(isUnknownRoute('/create/type-scale?x=1'), false)
  assert.equal(isUnknownRoute('/create/type-scale#top'), false)
})

// ── What gets indexed ───────────────────────────────────────────────────────

test('a missing page is noindex, and a real one is not', () => {
  assert.equal(robotsFor('/this-does-not-exist'), 'noindex,follow')
  assert.equal(robotsFor('/create/type-scale'), 'index,follow')
  assert.equal(robotsFor('/'), 'index,follow')
})

test('private and in-flow routes are never indexed', () => {
  // Landing on any of these cold from a search result is a dead end: they are
  // either one account's data or a step inside a flow.
  for (const route of ['/settings', '/projects', '/admin', '/login', '/checkout', '/checkout/return', '/onboarding']) {
    assert.equal(isPrivateRoute(route), true, `${route} should be private`)
    assert.equal(robotsFor(route), 'noindex,follow', `${route} must not be indexed`)
  }
})

test('a private PREFIX does not swallow a real page that merely starts the same way', () => {
  // `/projects` is private; a hypothetical `/projectsomething` is not the same
  // route and must not inherit its noindex.
  assert.equal(isPrivateRoute('/projectsomething'), false)
  assert.equal(isPrivateRoute('/settings-guide'), false)
})

test('follow, not nofollow — the 404 offers real destinations worth crawling', () => {
  assert.ok(robotsFor('/nope').endsWith(',follow'))
})

// ── The served shells ───────────────────────────────────────────────────────
// These read dist/, so they only mean anything after a build. CI runs build
// before the unit suite; skip rather than fail when run standalone.

const dist = (p) => path.join(process.cwd(), 'dist', p)
const built = fs.existsSync(dist('404.html'))

test('the 404 shell carries exactly one robots tag, and it is noindex', { skip: !built && 'run `npm run build` first' }, () => {
  const html = read('dist/404.html')
  const tags = html.match(/<meta\s+name="robots"[^>]*>/g) || []
  // index.html ships a static `index,follow`, so an INSERTED tag produced two
  // contradictory directives in one head. Google resolves that by taking the
  // most restrictive, so it happened to behave — but shipping a contradiction
  // and relying on a tie-break is not the same as being correct.
  assert.equal(tags.length, 1, `the 404 shell has ${tags.length} robots tags: ${tags.join(' ')}`)
  assert.match(tags[0], /noindex/)
})

test('the 404 shell declares no canonical at all', { skip: !built && 'run `npm run build` first' }, () => {
  assert.equal((read('dist/404.html').match(/rel="canonical"/g) || []).length, 0,
    'a noindex page must not also assert it is the authoritative version of itself')
})

test('the 404 shell does not wear the homepage title', { skip: !built && 'run `npm run build` first' }, () => {
  const title = /<title>([\s\S]*?)<\/title>/.exec(read('dist/404.html'))?.[1]
  assert.match(title, /not found/i)
})

test('a real route still gets its own canonical and stays indexable', { skip: !built && 'run `npm run build` first' }, () => {
  const html = read('dist/create/type-scale/index.html')
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.uil4b\.com\/create\/type-scale"/)
  assert.match(html, /<meta\s+name="robots"\s+content="index,follow"/)
})

// ── The routing that serves them ────────────────────────────────────────────

test('the catch-all serves the 404 shell, not the homepage', async () => {
  const rewrites = buildRewrites(await prerenderRoutes())
  const catchAll = rewrites[rewrites.length - 1]
  assert.equal(catchAll.destination, '/404.html',
    'unknown URLs must not be served index.html — that is the soft 404')
  assert.match(catchAll.source, /\(\?!api\/\|assets\//, 'the API and assets must bypass it')
})

test('every prerendered route has its own explicit rewrite ahead of the catch-all', async () => {
  const routes = prerenderRoutes()
  const rewrites = buildRewrites(routes)
  const catchAllIndex = rewrites.length - 1
  for (const route of routes) {
    const i = rewrites.findIndex((r) => r.source === route)
    assert.ok(i > -1, `${route} has no explicit rewrite, so it would fall to the 404 shell`)
    assert.ok(i < catchAllIndex, `${route} is ordered after the catch-all`)
    assert.equal(rewrites[i].destination, `${route}/index.html`)
  }
})

test('vercel.json on disk matches what the generator produces', async () => {
  // The file is generated; a hand edit would be silently overwritten on the
  // next build, or worse, silently kept and drift.
  const onDisk = JSON.parse(read('vercel.json')).rewrites
  assert.deepEqual(onDisk, buildRewrites(prerenderRoutes()),
    'run `npm run sync:rewrites` — vercel.json has drifted from the route matrix')
})

test('the two genuinely-missing pages are now advertised, and the thin one is not', async () => {
  const routes = await sitemapRoutes()

  // /discover is a real surface landing linking three live libraries.
  // /sitemap is the HTML index, and the 404 points at it as "see every page".
  for (const route of ['/discover', '/sitemap']) {
    assert.ok(routes.includes(route), `${route} is a real indexable page and is missing from sitemap.xml`)
  }

  // /learn used to be excluded here, because every entry in LEARN_GROUPS
  // carried `soon: true` and the page read "Learn is coming soon" — advertising
  // it would have been advertising an empty library.
  //
  // It has content now: the Learn articles render at /learn/<slug> and the
  // landing lists them above the roadmap. So the condition this test was
  // written around ("until it has content") is met, and both /learn and every
  // article it lists are advertised.
  //
  // The correction recorded here before still stands and is worth keeping: it
  // was never `robotsFor('/learn')` that kept the route out. isSoonRoute() only
  // understands the Create tree, so robotsFor('/learn') has always returned
  // `index,follow`; what excluded it was SOON_SURFACES in
  // scripts/route-matrix.mjs. That list is now empty, so the served shell and
  // the hydrated page finally agree — which was the open founder question.
  for (const route of ['/learn', ...LEARN_ARTICLE_ROUTES]) {
    assert.ok(routes.includes(route),
      `${route} is published Learn content and should be advertised`)
  }
})

test('the sitemap never advertises a private route', async () => {
  for (const route of await sitemapRoutes()) {
    assert.equal(isPrivateRoute(route), false, `${route} is private and must not be in the sitemap`)
  }
})

// ── The route itself ────────────────────────────────────────────────────────

test('the catch-all renders a 404 rather than redirecting', () => {
  const src = stripComments(read('src/App.jsx'))
  assert.match(src, /<Route path="\*" element=\{<NotFound \/>\} \/>/,
    'the catch-all must render NotFound')
  assert.ok(!/path="\*"[^>]*Navigate to="\/"/.test(src),
    'the redirect-to-homepage catch-all must not come back')
})

test('the 404 page keeps the user on the URL they typed', () => {
  // Redirecting hides the fact that a link is broken, so it never gets fixed.
  const src = stripComments(read('src/pages/NotFound.jsx'))
  assert.ok(!/Navigate/.test(src), 'NotFound must not navigate away')
  assert.ok(/useLocation/.test(src), 'it should show the path that failed')
})

test('the 404 offers a route back, including the way to report the broken link', () => {
  const src = read('src/pages/NotFound.jsx')
  for (const to of ['/', '/sitemap', '/feedback']) {
    assert.ok(src.includes(`to="${to}"`), `the 404 should link to ${to}`)
  }
})

test('the client and the prerendered shell agree on the 404 copy', () => {
  // Two places write this string; if they drift, the tab title changes on
  // hydration, which looks like a bug to anyone watching.
  const shellTitle = /title: '([^']*Page not found[^']*)'/.exec(read('scripts/prerender.mjs'))?.[1]
  assert.ok(shellTitle, 'the prerender script must set a 404 title')
  assert.ok(read('src/App.jsx').includes(shellTitle),
    `App.jsx must use the same 404 title as the shell (${shellTitle})`)
})

test('canonicalUrl is unchanged for real routes', () => {
  assert.equal(canonicalUrl('/create/type-scale'), 'https://www.uil4b.com/create/type-scale')
  assert.equal(canonicalUrl('/'), 'https://www.uil4b.com/')
})

// ── Duplicate URLs ──────────────────────────────────────────────────────────

test('/home canonicals to / rather than competing with it', () => {
  // /home is a byte-identical duplicate of / and it is what the nav logo links
  // to on every page — so it is the most-linked URL on the site. Left
  // self-canonicalising, the internal link graph pointed at the copy rather
  // than at the homepage.
  assert.equal(canonicalUrl('/home'), 'https://www.uil4b.com/')
  assert.equal(canonicalUrl('/home/'), 'https://www.uil4b.com/')
})

test('/home is real, indexable content — the alias is about canonical, not noindex', () => {
  // noindex here would waste the inbound links the logo generates. The
  // canonical is the right instrument: it consolidates them onto /.
  assert.equal(isUnknownRoute('/home'), false)
  assert.equal(robotsFor('/home'), 'index,follow')
})

test('the alias does not leak into other routes', () => {
  assert.equal(canonicalUrl('/homepage'), 'https://www.uil4b.com/homepage')
  assert.equal(canonicalUrl('/create/type-scale'), 'https://www.uil4b.com/create/type-scale')
})

test('/home is not advertised in the sitemap, but IS prerendered', async () => {
  assert.ok(!(await sitemapRoutes()).includes('/home'),
    'a canonicalised duplicate must not also be advertised as its own page')
  // The other half, which used to be impossible to state because "advertised"
  // and "prerendered" were one list. /home is the nav logo's target on every
  // page, so it is the most-linked URL on the site; without a shell it falls to
  // the catch-all and is served dist/404.html, which means every share of it
  // unfurls as "UI L4B | Page not found" and a non-JS crawler reads `noindex`.
  assert.ok(prerenderRoutes().includes('/home'),
    '/home must have its own shell — without one the most-linked URL on the '
    + 'site is served the 404 shell')
})

test('the sitemap never advertises a page that tells crawlers not to index it', async () => {
  // The invariant that would have caught this directly. The 2026-08-11 audit
  // recommended adding /learn to the sitemap as a "real, indexable page"; every
  // group in LEARN_GROUPS carries `soon: true` and the page reads "Learn is
  // coming soon", so robotsFor('/learn') is noindex. Advertising it would have
  // meant sitemap.xml saying "index this" about a page whose own head says the
  // opposite — a contradiction no single-file review would surface.
  for (const route of await sitemapRoutes()) {
    assert.equal(robotsFor(route), 'index,follow',
      `${route} is advertised in sitemap.xml but resolves to ${robotsFor(route)}`)
  }
})

// ── Offline is not a stale deploy ───────────────────────────────────────────

test('a chunk preload failure never reloads the page while offline', () => {
  // main.jsx reloads on `vite:preloadError` to recover from a cached
  // index.html asking for chunk filenames a redeploy removed. Losing
  // connectivity fires the SAME event for an entirely different reason, and
  // there a reload is the worst available response: it throws away a working,
  // already-rendered app and tries to re-fetch everything over the connection
  // that just failed.
  //
  // Found by the acceptance suite — cutting the network mid-session reloaded
  // the page out from under it ("Execution context was destroyed"), which is
  // exactly what it would do to a user on a train.
  const src = stripComments(read('src/main.jsx'))
  const handler = /vite:preloadError[\s\S]*?\n\}\)/.exec(src)?.[0] || ''
  assert.ok(handler, 'the preloadError handler must still exist')
  assert.ok(/navigator\.onLine === false/.test(handler),
    'the handler must bail out when offline, before it decides to reload')
  // The guard has to come BEFORE the reload, or it guards nothing.
  assert.ok(handler.indexOf('navigator.onLine') < handler.indexOf('location.reload'),
    'the offline check must precede the reload')
})
