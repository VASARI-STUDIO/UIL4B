// THE PRERENDER ROUTE MATRIX — which URLs get their own crawlable shell, and
// for every URL that does not, the reason.
//
// ── Why this is a matrix and not a list ─────────────────────────────────────
//
// scripts/prerender.mjs used to read public/sitemap.xml and treat it as the
// route list. That was the right call when it was written — "prerendered" and
// "advertised to crawlers" were the same set, and reading one file rather than
// keeping two in step is exactly the discipline this repository runs on.
//
// It stops being the right call the moment those two sets diverge, and they do:
//
//   `/home` is a byte-identical duplicate of `/`. It is what the nav logo links
//   to on every page, which makes it the most-linked URL on the site, and
//   src/utils/routeMeta.js already canonicalises it onto `/`. It MUST NOT go in
//   sitemap.xml — advertising a URL you have canonicalised away is a
//   contradiction. But it MUST be prerendered, because today it matches no
//   explicit rewrite, falls to vercel.json's catch-all, and is served
//   dist/404.html: every share of the site's most-linked URL unfurls as
//   "UI L4B | Page not found", and Googlebot reads `noindex` on it before the
//   bundle executes and says the opposite.
//
// One list could not express that. So the matrix is computed here, the sitemap
// stays what it is — the advertised subset — and a test asserts the sitemap is
// contained in the matrix rather than equal to it.
//
// ── Every exclusion is derived, never typed ─────────────────────────────────
//
// The eligibility rules read the app's OWN authorities:
//
//   • private/auth/admin  → isPrivateRoute() in src/utils/routeMeta.js, the
//                           same function the runtime uses to stamp `noindex`.
//   • Soon                → isSoonRoute(), driven off toolTree.js's own flags.
//   • retired URLs        → LEGACY_REDIRECTS in src/data/legacyRoutes.js, the
//                           one table that already generates both the client
//                           <Navigate> routes and vercel.json's 301s.
//
// A route excluded because a hand-written list said so would go stale the first
// time a tool shipped. A route excluded because `isSoonRoute()` says it is soon
// becomes eligible automatically on the day the founder flips the flag.
//
// ── Canonical and noindex truth survives, by construction ───────────────────
//
// prerender.mjs no longer computes a canonical of its own (it used to build
// `ORIGIN + route`, which is right for every route it happened to emit and
// wrong for `/home`). It calls canonicalUrl() and robotsFor() — the SAME
// functions App.jsx calls on every navigation. The served head and the
// hydrated head cannot disagree, because there is one implementation.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAGE_TITLES } from '../src/data/routeMetaMap.js'
import { CREATE_GROUPS, createRoutes } from '../src/data/toolTree.js'
import { LEGACY_REDIRECTS } from '../src/data/legacyRoutes.js'
import { isPrivateRoute, isSoonRoute, robotsFor } from '../src/utils/routeMeta.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Routes the router mounts that carry no routeMetaMap entry — flow steps and
// gated screens nobody lands on cold. Listed so the completeness check below
// sees the whole surface; every one of them is excluded as private anyway.
const UNTITLED_APP_ROUTES = Object.freeze([
  '/onboarding', '/checkout/return', '/style-guide',
])

// The ONE Create category home that is a real page rather than a redirect.
//
// src/pages/CreateTool.jsx sends a live group's category home to its first tool
// ("A live group's category home has no screen of its own"), so /create/typography,
// /create/imagery, /create/ai-tools and /create/icons-emoji are redirects, not
// destinations — prerendering them would mint an indexable shell for a URL that
// bounces. /create/color is the exception because App.jsx intercepts it ABOVE
// CreateTool and renders the colour landing.
//
// This is the one fact here that is not derived, because LIVE_TOOLS lives
// inside a .jsx module Node cannot import. tests/unit/prerender-routes.test.js
// reads both source files and fails if either stops being true, so it is a
// checked assumption rather than a parallel list.
export const CREATE_HOMES_THAT_RENDER = Object.freeze(['/create/color'])

// Surfaces outside the Create tree that describe themselves as unfinished.
//
// isSoonRoute() only understands the Create tree — by design, per its own
// comment — so it returns false for /learn. But SurfaceLanding.jsx renders
// /learn with the hint "Learn is coming soon — here's what's on the way", every
// entry in LEARN_GROUPS carries soon: true, and routeMetaMap's own description
// ends "The Learn library is on the way." Prerendering it would put a crawlable
// shell behind an empty library.
//
// NOTE FOR THE FOUNDER, deliberately not actioned here: robotsFor('/learn')
// returns `index,follow`, so the moment JavaScript runs the page asks to be
// indexed, while the shell it was served says noindex. Excluding it from the
// matrix preserves today's served behaviour rather than quietly changing what
// gets indexed. Making the two agree is a call about whether /learn should be
// in the index at all.
const SOON_SURFACES = Object.freeze(['/learn'])

const RETIRED = new Set(LEGACY_REDIRECTS.map(([from]) => from))

const norm = (p) => {
  const s = String(p || '/').split('?')[0].split('#')[0].toLowerCase()
  return s.length > 1 ? s.replace(/\/+$/, '') : s
}

/** Every path this app can render, from the app's own tables. */
export function allKnownRoutes() {
  return [...new Set([
    ...Object.keys(PAGE_TITLES),
    ...createRoutes(),
    ...UNTITLED_APP_ROUTES,
    ...RETIRED,
  ].map(norm))].sort()
}

/**
 * Should this route get its own prerendered shell, and if not, why not?
 *
 * Order matters: a route can be several of these at once (a retired URL that
 * points at a Soon tool, say), and the first reason is the honest one — the
 * edge answers a 301 before anything else gets a chance to matter.
 */
export function classifyRoute(pathname) {
  const route = norm(pathname)

  if (route === '/') {
    return { route, prerender: false, reason: 'the root shell itself — dist/index.html is served directly' }
  }
  if (RETIRED.has(route)) {
    return { route, prerender: false, reason: 'retired URL — answered with a 301 at the edge (src/data/legacyRoutes.js)' }
  }
  if (isPrivateRoute(route)) {
    return { route, prerender: false, reason: 'private, authenticated or admin — noindex by routeMeta.js' }
  }
  if (isSoonRoute(route)) {
    return { route, prerender: false, reason: 'Soon — the tool is still in the workshop (toolTree.js)' }
  }
  if (SOON_SURFACES.includes(route)) {
    return { route, prerender: false, reason: 'Soon surface — the page itself says it is coming soon' }
  }

  const home = CREATE_GROUPS.find((g) => norm(g.home) === route)
  if (home && !CREATE_HOMES_THAT_RENDER.includes(route)) {
    const first = home.tools?.[0]?.route
    return {
      route,
      prerender: false,
      reason: `category home — CreateTool.jsx redirects it to ${first}, so it is not a page`,
    }
  }

  if (!PAGE_TITLES[route]) {
    return { route, prerender: false, reason: 'no entry in routeMetaMap.js — it would ship the homepage title' }
  }

  return { route, prerender: true, reason: 'public, live and indexable' }
}

/**
 * The matrix: what gets a shell, and every exclusion with its reason.
 *
 * Both halves are returned on purpose. An exclusion list nobody can read is how
 * a route goes missing for a year without anyone noticing, and the completeness
 * test asserts the two halves together account for every known route.
 */
export function routeMatrix() {
  const rows = allKnownRoutes().map(classifyRoute)
  return {
    routes: rows.filter((r) => r.prerender).map((r) => r.route),
    excluded: rows.filter((r) => !r.prerender),
  }
}

/** Just the routes to emit, sorted — what prerender.mjs and vercel.json consume. */
export function prerenderRoutes() {
  return routeMatrix().routes.sort()
}

/** The routes public/sitemap.xml actually advertises. */
export async function sitemapRoutes() {
  const xml = await readFile(path.join(root, 'public', 'sitemap.xml'), 'utf8')
  const out = []
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const { pathname } = new URL(m[1])
    if (pathname !== '/') out.push(norm(pathname))
  }
  return [...new Set(out)].sort()
}

/**
 * Routes in the matrix that the sitemap does not advertise.
 *
 * Not a defect on its own — `/home` is prerendered precisely so it stops
 * unfurling as a 404, and is deliberately kept out of the sitemap because it is
 * canonicalised onto `/`. Every entry does have to be one we can explain, which
 * is what the test on this asserts.
 */
export function unadvertised(routes, sitemap) {
  const advertised = new Set(sitemap)
  return routes.filter((r) => !advertised.has(r))
}

/** Routes whose shell must carry `noindex` — read from the runtime's own rule. */
export const noindexRoutes = (routes) => routes.filter((r) => robotsFor(r) !== 'index,follow')
