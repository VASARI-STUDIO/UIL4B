// Per-route <head> metadata — canonical link, og:*/twitter:* social tags, and
// the `soon` robots directive. Extracted out of App.jsx so the per-route
// navigation effect stays a thin caller (AUDIT B3: index.html only ships one
// static canonical/description, so every one of the ~30 public routes was
// telling crawlers and social unfurls it was the homepage).
import { resolveTool } from '../data/toolTree.js'

const SITE_ORIGIN = 'https://www.uil4b.com'

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
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw
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
export function updateRouteMeta({ pathname, title, description }) {
  const url = canonicalUrl(pathname)
  upsertLink('canonical', url)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
  upsertMeta('name', 'robots', isSoonRoute(pathname) ? 'noindex,follow' : 'index,follow')
}
