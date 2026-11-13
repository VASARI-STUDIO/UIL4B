// EVERY INTERNAL LINK ON EVERY ROUTE GOES WHERE IT SAYS.
//
// One page per route (deduped), three personas (signed out, Free, Pro) at 1440 and
// 390. Each page's `a[href]` is collected, every distinct internal target not already
// visited is opened once, and for each visited address:
//   · the 404 page is not what rendered;
//   · the final path is the path that was asked for, unless the route is a named gate
//     (a signed-out visitor to /checkout/return is sent to /login).
// A link at a retired path fails the second rule (the client redirect moves it), which
// is how an in-app link left on an old URL shows up.
//
// The route list is site-routes.js. A guard test reads the <Route> paths in App.jsx
// and fails when a route is neither walked nor named in SKIPPED.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Point a footer or nav link at a path with no route (/credits -> /creditz): the 404
// rule names it. Point one at a retired path (/plans -> /pricing): the moved rule
// names it. Remove a route from site-routes.js: the guard names it.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { ROUTES, PROJECT_ROUTES } from './site-routes.js'

// Routes the router has that this crawl does not walk, and why.
const SKIPPED = {
  '/admin': 'admin only; the non-admin landing is owned by the pathways work',
  '/style-guide': 'admin only; the non-admin landing is owned by the pathways work',
  '/discover/prompts': 'admin only; everyone else gets the 404 on purpose',
  '/dev/components': 'test builds only',
  '/roadmap': 'flag off; a 404 on purpose',
  '/welcome': 'retired alias of /home, covered by the redirect table',
  '/color/ui': 'retired alias, covered by the redirect table',
  '/learn/:slug': 'walked through the Learn article routes',
  '/projects/:id': 'walked as /projects/seed-1 for the signed-in personas',
  '/projects/:id/export': 'walked as /projects/seed-1/export for the signed-in personas',
  '/community/:id': 'a piece page needs a real id; the crawl reaches the ones /community links to',
  '/u/:handle': 'a profile needs a real handle; the crawl reaches it through the maker links on /community',
  '*': 'the 404 itself',
}

// Pro on /checkout is bounced to /settings today; the pathways work owns that behaviour.
const OWNED_ELSEWHERE_FOR_PRO = '/checkout'

const PERSONAS = [
  { id: 'signed out', out: true, session: null },
  { id: 'Free', out: false, session: { plan: 'free', projects: 1 } },
  { id: 'Pro', out: false, pro: true, session: { plan: 'pro', projects: 1 } },
]
const WIDTHS = [{ width: 1440, height: 900 }, { width: 390, height: 844, touch: true }]

// Gates land somewhere else on purpose. Everything else must land on itself.
function allowedLandings(route, persona) {
  if (route === '/') return persona.out ? ['/', '/home'] : ['/projects']
  if (route === '/login') return persona.out ? ['/login'] : ['/home', '/projects']
  if (route === '/onboarding') return persona.out ? ['/login'] : ['/projects']
  if (route === '/checkout/return') return persona.out ? ['/login'] : ['/checkout/return']
  return [route]
}

const normalise = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/'

function internalTarget(href, origin) {
  if (!href || /^(mailto|tel|javascript):/i.test(href)) return null
  let url
  try { url = new URL(href, origin) } catch { return null }
  if (url.origin !== origin) return null
  const route = normalise(url.pathname)
  if (/\.[a-z0-9]{2,5}$/i.test(route) || route.startsWith('/api/')) return null
  return { route, search: url.search, key: route + url.search }
}

function crawl(page, persona, origin) {
  const visited = new Set()
  const found = new Map()
  const problems = []

  const visit = async (target, from) => {
    if (visited.has(target.key)) return
    visited.add(target.key)
    await go(page, target.key)
    const allowed = allowedLandings(target.route, persona)
    const pathNow = () => normalise(new URL(page.url()).pathname)
    // A gate answers after auth resolves, so give it time to move before judging where it landed.
    await expect.poll(() => allowed.includes(pathNow()), { timeout: 6000 }).toBe(true).catch(() => {})
    const landed = pathNow()
    const seen = await page.evaluate(() => ({
      notFound: !!document.querySelector('.sec.nf'),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    }))
    for (const href of seen.links) {
      const t = internalTarget(href, origin)
      if (t && !found.has(t.key)) found.set(t.key, { ...t, from: target.key })
    }
    const via = from ? ` (linked from ${from})` : ''
    if (seen.notFound) problems.push(`404: ${target.key}${via}`)
    else if (!allowed.includes(landed)) problems.push(`moved: ${target.key} -> ${landed}${via}`)
  }

  return { visited, found, problems, visit }
}

for (const persona of PERSONAS) {
  for (const size of WIDTHS) {
    test(`${persona.id} at ${size.width}: no internal link is a 404 or moves somewhere else`, async ({ browser, baseURL }) => {
      test.setTimeout(420_000)
      const ctx = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        hasTouch: !!size.touch,
        isMobile: !!size.touch,
        baseURL,
      })
      const page = await ctx.newPage()
      watch(page, `a ${persona.id} visitor following every link at ${size.width}`)
      if (persona.session) await signIn(page, persona.session)

      const routes = [...ROUTES, ...(persona.out ? [] : PROJECT_ROUTES)]
        .filter((r) => !(persona.pro && r === OWNED_ELSEWHERE_FOR_PRO))
      const run = crawl(page, persona, new URL(baseURL).origin)
      for (const route of routes) await run.visit({ route, search: '', key: route }, null)
      const walked = run.visited.size
      for (const t of [...run.found.values()].filter((x) => !run.visited.has(x.key))) await run.visit(t, t.from)

      expect(walked, 'every route in the list was opened').toBe(routes.length)
      expect(run.found.size, 'links were collected from the pages').toBeGreaterThan(60)
      expect(run.problems, 'links that are a 404 or land somewhere else').toEqual([])
      await ctx.close()
    })
  }
}

test('every route in App.jsx is crawled or named as skipped', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'App.jsx'), 'utf8')
  const declared = new Set([...source.matchAll(/<Route[^>]*\spath="([^"]+)"/g)].map((m) => m[1]))
  for (const m of source.matchAll(/pathname(?:\.toLowerCase\(\)\.replace\([^)]*\))?\s*===\s*'(\/[^']*)'/g)) declared.add(m[1])
  expect(declared.size, 'the route table was read').toBeGreaterThan(25)
  const walked = new Set([...ROUTES, ...PROJECT_ROUTES])
  expect([...declared].filter((p) => !walked.has(p) && !(p in SKIPPED)), 'routes in App.jsx the crawl neither walks nor skips by name').toEqual([])
  expect(Object.keys(SKIPPED).filter((p) => !declared.has(p)), 'SKIPPED names a route App.jsx no longer has').toEqual([])
})
