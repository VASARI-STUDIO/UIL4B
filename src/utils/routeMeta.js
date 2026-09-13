// Per-route <head> metadata — canonical link, og:*/twitter:* social tags, and
// the `soon` robots directive. Extracted out of App.jsx so the per-route
// navigation effect stays a thin caller (AUDIT B3: index.html only ships one
// static canonical/description, so every one of the ~30 public routes was
// telling crawlers and social unfurls it was the homepage).
import { resolveTool } from '../data/toolTree.js'
import { PAGE_TITLES } from '../data/routeMetaMap.js'

// The one origin this site claims as its own. Every canonical link, og:url,
// og:image, twitter:image, JSON-LD `url`, sitemap `<loc>`, llms.txt row and
// export watermark is built from this constant, in src/ and in scripts/
// alike, because two spellings of one origin is the defect it exists to end.
//
// APEX, NOT www. Measured 2026-09-13: `https://uil4b.com/` answers 200 in
// 0.9 s; `https://www.uil4b.com/` times out on 443, twice, 21 s each. The
// Vercel project `ui_l4b` has never carried `www` among its domains
// (`uil4b.com`, `uil4b-dylan-coleman.vercel.app`,
// `uil4b-git-main-dylan-coleman.vercel.app`), and `www.uil4b.com` is a CNAME
// to `ns1.vercel-dns.com` — a NAMESERVER, not the serving endpoint
// `cname.vercel-dns.com`. So every shell shipped before this told crawlers
// its authoritative URL was a host that does not answer, and every shared
// link unfurled with a broken preview image on Slack, LinkedIn, X, Discord
// and iMessage. Founder decision, 2026-09-13: point the site at the apex,
// which already serves and is the only configured domain, rather than do the
// DNS work to make the second spelling real.
//
// tests/unit/canonical-host.test.js fails the build if the www host appears
// in any SHIPPED artefact: the built shells, their JSON-LD, dist/llms.txt,
// dist/sitemap.xml, dist/robots.txt, or the export watermark in the bundle.
export const SITE_ORIGIN = 'https://uil4b.com'

// Routes that exist and work, but must never be indexed: they are either
// private to one account or a step inside a flow that means nothing on its own.
// Landing on any of these from a search result is a dead end.
const PRIVATE_PREFIXES = Object.freeze([
  '/settings', '/projects', '/admin', '/login', '/checkout', '/onboarding', '/style-guide',
])

// Routes that render the same page as another URL and must point their canonical
// at it rather than at themselves.
//
// `/home` is a byte-identical duplicate of `/` — it is what the nav logo links
// to on every page, so it is the most-linked URL on the site — and it was
// self-canonicalising. That is two competing candidates for the same content,
// with the internal link graph pointing at the one that is NOT the homepage.
const CANONICAL_ALIASES = Object.freeze({ '/home': '/' })

// Create/update a <meta [attr]="key"> tag in place, so repeated navigations
// reuse the same node instead of piling up duplicates (mirrors the existing
// meta[name="description"] pattern App.jsx already used).
function upsertMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Absolute canonical URL for a route: origin + pathname only — no query
// string, no hash, no trailing slash except the root itself. Never points at
// the homepage for a non-home route (that was the B3 bug).
export function canonicalUrl(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0]
  const trimmed = raw.length > 1 ? raw.replace(/\/+$/, '') : raw
  const path = CANONICAL_ALIASES[trimmed] || trimmed
  return `${SITE_ORIGIN}${path || '/'}`
}

// A route is "soon" when it resolves to a Create tool or category home that's
// still in the workshop (CreateTool's SoonState — see toolTree.js). Driven
// entirely off toolTree's own `soon` flags — the single source of truth per
// its header comment — never a hand-maintained route list here. Routes
// outside the Create tree (Discover, Learn, account/legal pages, etc.) are
// never "soon" for indexing purposes.
export function isSoonRoute(pathname) {
  const { group, tool, isHome } = resolveTool(pathname)
  if (!group) return false
  if (tool) return !!tool.soon
  return isHome && !!group.soon
}

// Called on every route change (App.jsx's title/description effect). Keeps
// canonical, og:*, twitter:* and the robots directive in sync with whatever
// is actually rendering at `pathname` — including resetting robots back to
// `index,follow` on every non-soon route, so a stale `noindex` can never
// survive a navigation away from a soon page.
// True for a URL that resolves to nothing — the 404 route. Driven off the same
// PAGE_TITLES/toolTree data the router uses, so a route added to one is not
// silently treated as missing by the other.
//
// This exists because the catch-all used to redirect to `/`, which meant every
// typo returned 200 with `index,follow` and the homepage's content. A soft 404
// is an instruction to index unlimited duplicates of the homepage.
export function isUnknownRoute(pathname) {
  const path = String(pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  // Known either because it has its own metadata, or because it resolves to a
  // tool in the Create tree. Both are data the router already relies on, so a
  // page cannot be routable-but-considered-missing without one of them being
  // wrong first.
  if (PAGE_TITLES[path]) return false
  if (resolveTool(path).group) return false
  // Flow steps and legacy redirects that legitimately have no metadata entry.
  // They resolve to a real component, they are just never landed on cold.
  if (PRIVATE_PREFIXES.some((p) => path.startsWith(p))) return false
  return true
}

export function isPrivateRoute(pathname) {
  const path = String(pathname || '/').split('?')[0]
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

// `noindex,follow` rather than `noindex,nofollow` throughout: we still want the
// crawler to walk the links out of these pages (the 404 offers real
// destinations), we just don't want the page itself in the index.
export function robotsFor(pathname) {
  if (isPrivateRoute(pathname)) return 'noindex,follow'
  if (isSoonRoute(pathname)) return 'noindex,follow'
  if (isUnknownRoute(pathname)) return 'noindex,follow'
  return 'index,follow'
}

export function updateRouteMeta({ pathname, title, description }) {
  const url = canonicalUrl(pathname)

  // A URL that resolves to nothing gets NO canonical at all.
  //
  // Self-canonicalising asserts "this is the authoritative version of a real
  // page" in the same head that says "do not index this" — two contradictory
  // instructions, which is exactly the ambiguity Google warns against. Pointing
  // it at `/` instead would be worse: it would funnel every typo's signals into
  // the homepage. Saying nothing is the only honest option.
  if (isUnknownRoute(pathname)) {
    document.querySelector('link[rel="canonical"]')?.remove()
  } else {
    upsertLink('canonical', url)
  }
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
  upsertMeta('name', 'robots', robotsFor(pathname))
}
