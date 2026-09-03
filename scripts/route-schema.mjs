// PER-ROUTE STRUCTURED DATA — and, at greater length, the three kinds we are
// deliberately not emitting.
//
// The audit named four candidates: BreadcrumbList, Product/Offer on /plans,
// FAQPage on /help, and per-tool SoftwareApplication. Only the first survives,
// and the reasoning matters more than the code, because invented structured
// data is both a slop tell and a manual-action risk — Google's spam policies
// treat markup that does not match the page as grounds for a structured-data
// penalty, and the penalty applies to the whole site, not the page.
//
// ── SHIPPED: BreadcrumbList, on the 8 routes that have a real parent ────────
//
// Breadcrumbs are one of the few schema types that still earn a visible search
// result feature: Google replaces the URL line in a result with the trail. It
// is also the rare one that needs no claim about quality, price or popularity —
// it states where a page sits, which is a fact the router already knows.
//
// EMITTED ONLY WHERE THERE ARE THREE LEVELS. "Home > Palette Generator" is not
// a hierarchy; it is the URL restated, and Google renders the domain for it
// either way. So a breadcrumb goes on a page only when it has a REAL parent
// page — one that exists, renders, and is not a redirect:
//
//   • the five colour tools, under /create/color (the colour landing, which
//     App.jsx renders directly);
//   • the three Discover libraries, under /discover.
//
// The other Create categories have no eligible parent, and this is a fact about
// the app rather than a shortcut: /create/typography, /create/imagery,
// /create/ai-tools and /create/icons-emoji all REDIRECT to their first tool
// (see scripts/route-matrix.mjs). schema.org allows only the LAST item in a
// trail to omit its `item` URL, so an intermediate crumb pointing at a redirect
// would be a link in the hierarchy that is not a page. Those tools get no
// breadcrumb rather than a fabricated one, and they will get one automatically
// on the day a category home becomes a real screen.
//
// ── NOT SHIPPED: FAQPage on /help ──────────────────────────────────────────
//
// /help does have genuine Q&A — HelpCentre.jsx holds a real `faqs` array. It is
// still wrong here, for two independent reasons, either of which is enough:
//
//   1. GOOGLE STOPPED USING IT. Since August 2023 FAQ rich results are shown
//      only for well-known authoritative government and health sites. On
//      uil4b.com the markup earns no feature at all, so it is pure payload with
//      a policy risk attached.
//   2. THE ANSWERS ARE NOT ON THE PAGE. The FAQ is one of three tabs and is
//      conditionally rendered — `{tab === 'faq' && <FAQTab />}` — so on load the
//      questions are not in the DOM. Marking up content the page does not show
//      is precisely what Google's structured-data guidelines prohibit, and the
//      prerendered shell would be claiming it outright: these shells contain no
//      React output at all, so the FAQ would exist only as a claim.
//
// ── NOT SHIPPED: Product/Offer on /plans ───────────────────────────────────
//
// The offers are already published, correctly, as the `offers` array on the
// site-level WebApplication (scripts/site-pricing.mjs) — which every shell
// carries, /plans included. Adding a Product with the same prices would put two
// entities on one page claiming to be the same thing, and Product is the wrong
// type for a subscription to a web app: Google's merchant experiences expect
// product feeds, availability and often reviews, none of which we have or would
// be entitled to invent.
//
// And the thing that would actually earn a rich result there is
// `aggregateRating` — which we do not have, will not fabricate, and which is
// the single most common piece of invented structured data on the web.
//
// ── NOT SHIPPED: SoftwareApplication per tool ──────────────────────────────
//
// True (each tool is a web application) and useless: the software-app rich
// result requires a rating, so without one it renders nothing. Same trade as
// above, same answer.
import { CREATE_GROUPS } from '../src/data/toolTree.js'
import { PAGE_TITLES } from '../src/data/routeMetaMap.js'
import { CREATE_HOMES_THAT_RENDER } from './route-matrix.mjs'

const norm = (p) => {
  const s = String(p || '/').split('?')[0].split('#')[0].toLowerCase()
  return s.length > 1 ? s.replace(/\/+$/, '') : s
}

/**
 * The human name for a route, from the title the page already uses.
 *
 * PAGE_TITLES entries read "UI L4B | Palette Generator"; a breadcrumb crumb
 * reading the site name on every level is noise. Derived rather than a second
 * table of names, so a retitled page renames its own crumb.
 */
export function crumbName(route) {
  const title = PAGE_TITLES[norm(route)]
  if (!title) return null
  const cut = title.indexOf('|')
  return (cut === -1 ? title : title.slice(cut + 1)).trim() || null
}

/**
 * The route's parent page, or null when it has none that is a real page.
 *
 * Derived: /discover/* sits under /discover, and a Create tool sits under its
 * group home ONLY when that home renders rather than redirecting.
 */
export function parentOf(pathname) {
  const route = norm(pathname)
  if (route.startsWith('/discover/')) return '/discover'
  const group = CREATE_GROUPS.find((g) => g.tools.some((t) => norm(t.route) === route))
  if (!group) return null
  const home = norm(group.home)
  if (home === route) return null
  return CREATE_HOMES_THAT_RENDER.includes(home) ? home : null
}

/**
 * The BreadcrumbList for a route, or null when the trail would be two levels.
 *
 * `item` is present on every position except the last, which is what
 * schema.org's breadcrumb guidance asks for — the final crumb IS the page being
 * described, so naming its own URL adds nothing.
 */
export function breadcrumbFor(pathname, origin) {
  const route = norm(pathname)
  const parent = parentOf(route)
  if (!parent) return null
  const leaf = crumbName(route)
  const parentName = crumbName(parent)
  if (!leaf || !parentName) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: parentName, item: `${origin}${parent}` },
      { '@type': 'ListItem', position: 3, name: leaf },
    ],
  }
}

/** That breadcrumb as a script tag, or '' when the route has no real parent. */
export function breadcrumbJsonLd(pathname, origin) {
  const crumb = breadcrumbFor(pathname, origin)
  if (!crumb) return ''
  return `<script type="application/ld+json">\n${JSON.stringify(crumb, null, 2)}\n</script>\n`
}

/** Every route that gets a breadcrumb — for the tests, and for the build log. */
export function breadcrumbRoutes(routes, origin = 'https://www.uil4b.com') {
  return routes.filter((r) => breadcrumbFor(r, origin))
}
