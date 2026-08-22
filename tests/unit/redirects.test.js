// Retired URLs must be answered with an HTTP 301, once, straight to a live page.
//
// WHAT THIS GUARDS, and why it is not theoretical. Before the 2026-08-20 Create
// route migration, `vercel.json` had **no `redirects` key at all** — 29 rewrites
// and 2 headers, nothing else. A retired URL matched no explicit rewrite, fell
// to the catch-all, and was served `dist/404.html`. That shell contains
// `id="root"` and the app bundle, so it boots the SPA and React Router performs
// the redirect: the USER always arrived. What the crawler got was a document
// carrying `noindex`, with no 301 anywhere, so 24 retired URLs passed no link
// equity to their replacements and nothing in the build noticed.
//
// The migration moved 24 more URLs — the Create tools, the pages most likely to
// hold real search value — so shipping it the old way would have applied that
// leak to all of them at once.
//
// Every test below is written against the OBSERVABLE contract (the emitted
// vercel.json, the route table the router is built from, the built shells) and
// not against the shape of any one file, because "the source text still says
// X" is exactly the assertion this migration broke four times over.
//
// NOT VERIFIED ANYWHERE HERE: what status code Vercel returns in production for
// the catch-all rewrite. This suite cannot reach www.uil4b.com and
// `npm run preview` does not apply vercel.json. Treat it as unknown.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  LEGACY_REDIRECTS,
  CREATE_ROUTE_MIGRATION,
  CLIENT_REDIRECT_ROUTES,
  EARLY_RETURN_REDIRECTS,
} from '../../src/data/legacyRoutes.js'
import { CREATE_GROUPS, createRoutes, resolveTool } from '../../src/data/toolTree.js'
import { PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { buildRedirects, buildRewrites, prerenderRoutes } from '../../scripts/sync-vercel-rewrites.mjs'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const vercel = () => JSON.parse(read('vercel.json'))
const built = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))

// Fragment-stripped destination — `/help#about` routes to the page `/help`.
const destPath = (d) => d.split('#')[0]

// The Create routes as they stood the day before the migration. Frozen on
// purpose: this is history, not configuration, and the whole point of the test
// is that these exact strings keep 301-ing after nobody remembers them.
const PRE_MIGRATION_CREATE_ROUTES = [
  '/color', '/color/palette', '/color/semantic', '/color/tint', '/color/gradient',
  '/color/contrast', '/icons-emoji', '/icons', '/emoji', '/typography',
  '/fontgallery', '/fontpairs', '/typescale', '/ui-builder-cat', '/ui-builder',
  '/box-shadow', '/auto-builder', '/imagery', '/file-converter', '/ratio',
  '/ai-tools', '/alt-text', '/ai-prompt', '/landing-prompts',
]

/* ── The redirects themselves ─────────────────────────────────────────────── */

test('every retired URL redirects exactly once', () => {
  const sources = vercel().redirects.map((r) => r.source)
  const seen = new Map()
  for (const s of sources) seen.set(s, (seen.get(s) || 0) + 1)
  const duplicated = [...seen].filter(([, n]) => n > 1).map(([s]) => s)
  assert.deepEqual(duplicated, [],
    `these paths have more than one redirect rule, so which one fires depends on order: ${duplicated.join(', ')}`)
  assert.equal(sources.length, LEGACY_REDIRECTS.length)
})

test('every redirect is a 301, never a 302', () => {
  // Vercel spells 301 as `permanent: true`. It is NOT the default: omit it, or
  // set it false, and Vercel emits a 307/302, which tells Google the old URL is
  // still the canonical one and to keep it indexed — the exact opposite of what
  // a permanent rename needs, and a failure that looks identical in a browser.
  for (const r of vercel().redirects) {
    assert.equal(r.permanent, true,
      `${r.source} is not permanent — it would ship as a 302 and Google would keep the old URL`)
  }
})

test('no redirect chains: no destination is itself a redirect source', () => {
  // A chain (/palette → /color/palette → /create/palette) bleeds signal at each
  // hop and Google stops following after a few. This is the assertion that
  // catches the specific mistake the migration invited: leaving the eight old
  // colour/media aliases pointed at paths that were themselves moving.
  const sources = new Set(LEGACY_REDIRECTS.map(([from]) => from))
  const chained = LEGACY_REDIRECTS
    .filter(([, to]) => sources.has(destPath(to)))
    .map(([from, to]) => `${from} → ${to} → (redirects again)`)
  assert.deepEqual(chained, [],
    `retarget these at their FINAL destination instead of adding a hop:\n  ${chained.join('\n  ')}`)
})

test('no redirect loops, including the long way round', () => {
  // Walking it rather than trusting the no-chains test to imply it: if a future
  // edit ever allows one hop, this is what stops that hop closing a cycle and
  // hanging the browser.
  const next = new Map(LEGACY_REDIRECTS.map(([from, to]) => [from, destPath(to)]))
  for (const [start] of LEGACY_REDIRECTS) {
    const walked = new Set([start])
    let at = next.get(start)
    let hops = 0
    while (at !== undefined && next.has(at)) {
      assert.ok(!walked.has(at), `${start} loops back to ${at}`)
      walked.add(at)
      at = next.get(at)
      assert.ok((hops += 1) < 10, `${start} redirects more than 10 times — that is a cycle`)
    }
  }
})

test('every redirect lands on a page that actually exists', () => {
  for (const [from, to] of LEGACY_REDIRECTS) {
    const dest = destPath(to)
    const real = Boolean(PAGE_TITLES[dest]) || Boolean(resolveTool(dest).group)
    assert.ok(real, `${from} redirects to ${to}, which is not a route this app serves`)
    assert.notEqual(dest, from, `${from} redirects to itself`)
  }
})

test('vercel.json is exactly what the generator produces — no hand-edit drift', () => {
  assert.deepEqual(vercel().redirects, buildRedirects(),
    'run `npm run sync:rewrites` — vercel.json and src/data/legacyRoutes.js disagree')
})

test('the edge and the client answer the same question the same way', () => {
  // App.jsx renders CLIENT_REDIRECT_ROUTES as <Navigate>; vercel.json emits the
  // 301s. Two implementations of one decision is how they drift, so both come
  // off the same table — and the split has to stay complete.
  const covered = [...CLIENT_REDIRECT_ROUTES.map(([from]) => from), ...EARLY_RETURN_REDIRECTS].sort()
  assert.deepEqual(covered, LEGACY_REDIRECTS.map(([from]) => from).sort(),
    'a retired path is redirected at the edge but has no client-side fallback (or vice versa)')

  // …and App.jsx has to actually render them. Checked against the source
  // because there is nothing else to check: with the 301s in place the client
  // fallback is invisible in production, so it can be deleted and every other
  // test here stays green while `vite preview` — the thing the browser
  // acceptance suite runs against — starts 404-ing 24 retired URLs.
  const app = read('src/App.jsx')
  assert.match(app, /CLIENT_REDIRECT_ROUTES\.map\(/,
    'App.jsx no longer renders the client-side redirect fallback')
  assert.match(app, /<Route[^>]*path=\{from\}[^>]*element=\{<Navigate to=\{to\}/,
    'the mapped redirect routes no longer render a <Navigate>')
  for (const early of EARLY_RETURN_REDIRECTS) {
    assert.ok(app.includes(`'${early}'`),
      `${early} is listed as an early-return redirect but App.jsx does not mention it`)
  }
})

/* ── The Create migration specifically ────────────────────────────────────── */

test('every pre-migration Create URL has exactly one 301 to a /create/ route', () => {
  const bySource = new Map(vercel().redirects.map((r) => [r.source, r]))
  for (const old of PRE_MIGRATION_CREATE_ROUTES) {
    const hit = bySource.get(old)
    assert.ok(hit, `${old} was a live Create URL and now 404s — it must 301`)
    assert.equal(hit.permanent, true, `${old} must be a 301`)
    assert.match(hit.destination, /^\/create\//,
      `${old} must land under /create/ (founder decision 4, 2026-08-20)`)
  }
  assert.equal(CREATE_ROUTE_MIGRATION.length, PRE_MIGRATION_CREATE_ROUTES.length)
})

test('no pre-migration Create URL is still served as a live route', () => {
  const live = new Set(createRoutes())
  for (const old of PRE_MIGRATION_CREATE_ROUTES) {
    assert.ok(!live.has(old),
      `${old} is both a live route and a redirect source — the redirect would never fire`)
  }
})

test('every route in CREATE_GROUPS resolves', () => {
  // CREATE_GROUPS is the owner: createRoutes() builds the router's Create table
  // from exactly these values, so a route here that resolves to nothing is a
  // page that renders the 404 while the nav still links to it.
  const routes = createRoutes()
  for (const group of CREATE_GROUPS) {
    for (const route of [group.home, ...group.tools.map((t) => t.route)]) {
      assert.match(route, /^\/create\/[a-z0-9-]+$/,
        `${route} is not a lowercase, hyphenated /create/<pagetitle> path`)
      assert.ok(routes.includes(route), `${route} is not in the router's Create table`)
      assert.ok(resolveTool(route).group, `${route} resolves to no Create group`)
      assert.ok(PAGE_TITLES[route], `${route} has no title — it would ship the homepage's`)
    }
  }
})

test('the slugs are unique, so no two tools claim one URL', () => {
  const routes = CREATE_GROUPS.flatMap((g) => [g.home, ...g.tools.map((t) => t.route)])
  assert.equal(new Set(routes).size, routes.length,
    `two Create entries share a route: ${routes.filter((r, i) => routes.indexOf(r) !== i).join(', ')}`)
})

/* ── The redirect layer against the rewrite layer ─────────────────────────── */

test('no path is both redirected and rewritten', async () => {
  // Vercel evaluates redirects before rewrites, so a path in both would 301 and
  // its rewrite would be dead — harmless today, but it means one of the two is
  // wrong and nothing would say which.
  const rewrites = buildRewrites(await prerenderRoutes())
  const explicit = new Set(rewrites.filter((r) => !r.source.includes('?!')).map((r) => r.source))
  for (const [from] of LEGACY_REDIRECTS) {
    assert.ok(!explicit.has(from),
      `${from} has both a 301 and an explicit rewrite — it is being prerendered AND redirected`)
  }
})

test('every live Create tool is advertised in the sitemap', async () => {
  // The counterpart to the redirects: a 301 into a page the sitemap never names
  // hands Google a destination it has no reason to crawl.
  const advertised = new Set(await prerenderRoutes())
  for (const group of CREATE_GROUPS) {
    if (group.soon) continue
    for (const tool of group.tools) {
      if (tool.soon) continue
      assert.ok(advertised.has(tool.route),
        `${tool.route} is live but missing from public/sitemap.xml`)
    }
  }
})

test('no still-building Create route is advertised', async () => {
  const advertised = new Set(await prerenderRoutes())
  for (const group of CREATE_GROUPS) {
    for (const tool of group.tools) {
      if (!tool.soon && !group.soon) continue
      assert.ok(!advertised.has(tool.route),
        `${tool.route} renders the workshop state but is advertised as indexable`)
    }
  }
})

/* ── No canonical destination serves noindex ──────────────────────────────── */

test('every prerendered route is indexable and canonicalises to itself', {
  skip: !built && 'run `npm run build` first',
}, async () => {
  // THE ONE THAT MATTERS for the migration. A 301 whose destination carries
  // `noindex` moves the problem rather than fixing it: the old URL stops being
  // indexed and the new one never starts. Read out of the SERVED html, because
  // that is what a crawler that runs no JavaScript actually receives.
  for (const route of await prerenderRoutes()) {
    const html = read(`dist${route}/index.html`)
    const robots = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/)?.[1]
    assert.ok(robots, `dist${route}/index.html has no robots tag at all`)
    assert.ok(!robots.includes('noindex'),
      `${route} is a canonical destination but serves ${robots}`)
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1]
    assert.equal(canonical, `https://www.uil4b.com${route}`,
      `${route} does not canonicalise to itself`)
  }
})

test('every 301 destination that is prerendered is one of those indexable shells', {
  skip: !built && 'run `npm run build` first',
}, async () => {
  const advertised = new Set(await prerenderRoutes())
  for (const [from, to] of LEGACY_REDIRECTS) {
    const dest = destPath(to)
    if (!advertised.has(dest)) continue
    const html = read(`dist${dest}/index.html`)
    assert.doesNotMatch(html, /content="[^"]*noindex/,
      `${from} 301s to ${dest}, which is served noindex — the link equity goes nowhere`)
  }
})
