// THE INTERNAL LINKS A CRAWLER CAN FOLLOW BEFORE ANY JAVASCRIPT RUNS.
//
// The mega menu only builds its links once React has mounted, and the served
// shells carried none, so a crawler that does not run script saw a homepage
// with no way into any tool. This is the one list the shells and the rendered
// pages both read, so the HTML a crawler gets and the page a person sees name
// the same destinations:
//
//   scripts/home-shell.mjs   the Tools block under the homepage hero
//   scripts/page-shell.mjs   the Related block under every tool shell
//   src/components/CrawlLinks.jsx   the same blocks, visible, in the app
//
// Plain JS, no JSX: the prerender scripts import it under Node.
//
// Nothing is typed here. A tool is a live, listed Create tool out of
// toolTree.js; its link text is the page name its own <title> carries
// (PAGE_TITLES through pageName), which describes the tool better than the
// short menu label ("Color Palette Generator with Live UI Preview", not
// "Palette"). A guide is a LEARN_ARTICLES row.
import { CREATE_GROUPS, createTools } from './toolTree.js'
import { LEARN_ARTICLES } from './learnIndex.js'
import { pageName } from './routeMetaMap.js'
import { PAGE_TITLES } from './routeMetaGated.js'

const norm = (p) => {
  const s = String(p || '/').split('?')[0].split('#')[0].toLowerCase()
  return s.length > 1 ? s.replace(/\/+$/, '') : s
}

const nameOf = (route, fallback) => pageName(PAGE_TITLES[route]) || fallback

/** Every live, listed Create tool, in tree order: `{ href, text, group }`. */
export function toolLinks() {
  return createTools()
    .filter((t) => !t.soon)
    .map((t) => ({ href: t.route, text: nameOf(t.route, t.label), group: t.group }))
}

/** Every Learn guide: `{ href, text, toolTo }`. */
export function guideLinks() {
  return LEARN_ARTICLES.map((a) => ({ href: `/learn/${a.slug}`, text: a.title, toolTo: a.toolTo }))
}

/** The pages that sit beside the tools and the guides. */
export function hubLinks() {
  return [
    { href: '/tools', text: 'All tools' },
    { href: '/learn', text: 'Learn: guides and principles' },
    { href: '/seo', text: nameOf('/seo', 'SEO inspector') },
  ]
}

/** What the homepage's Tools block lists. */
export function homeLinks() {
  return { tools: toolLinks(), guides: guideLinks(), hubs: hubLinks() }
}

const MAX_TOOLS = 5
const MAX_GUIDES = 2

/**
 * The Related block for a route: 3 to 5 other tools and 1 or 2 guides, or null
 * for a route that is not a tool page. A tool's own `views` come first (the
 * Icon Library's /create/icons/groups tab), then the tools in its own group,
 * then the rest in tree order from where it sits, so every tool has company.
 * Guides that teach this tool come first, then guides for the same group.
 */
export function relatedFor(route) {
  const r = norm(route)
  if (r === '/tools') return { tools: toolLinks(), guides: [], hubs: hubLinks().filter((h) => h.href !== '/tools') }

  const tools = toolLinks()
  const here = CREATE_GROUPS.flatMap((g) => g.tools.map((t) => ({ ...t, group: g.id })))
    .find((t) => norm(t.route) === r || (t.views || []).some((v) => norm(v) === r))
  if (!here) return null

  const self = norm(here.route)
  const views = (here.views || [])
    .filter((v) => norm(v) !== r)
    .map((v) => ({ href: v, text: nameOf(v, v) }))
  // A view of this tool links back to the tool itself.
  if (r !== self) views.unshift({ href: here.route, text: nameOf(here.route, here.label) })

  const others = tools.filter((t) => norm(t.href) !== self)
  const at = tools.findIndex((t) => norm(t.href) === self)
  const ordered = [
    ...others.filter((t) => t.group === here.group),
    ...tools.slice(at + 1).filter((t) => t.group !== here.group),
    ...tools.slice(0, Math.max(at, 0)).filter((t) => t.group !== here.group),
  ]
  const picked = [...views, ...ordered.filter((t) => !views.some((v) => norm(v.href) === norm(t.href)))]
    .slice(0, MAX_TOOLS)
    .map(({ href, text }) => ({ href, text }))

  const guides = guideLinks()
  const sameTool = guides.filter((g) => norm(g.toolTo) === self)
  const sameGroup = guides.filter((g) => !sameTool.includes(g)
    && tools.find((t) => norm(t.href) === norm(g.toolTo))?.group === here.group)
  const rest = guides.filter((g) => !sameTool.includes(g) && !sameGroup.includes(g))
  const picks = [...sameTool, ...sameGroup, ...rest].slice(0, MAX_GUIDES)
    .map(({ href, text }) => ({ href, text }))

  return { tools: picked, guides: picks, hubs: hubLinks().filter((h) => h.href !== '/seo') }
}

/**
 * The block a shell or a page draws: `{ label, className, sections }`, each
 * section `{ heading, links }`. The shell's string renderer
 * (scripts/crawl-html.mjs) and the React component (CrawlLinks.jsx) both draw
 * from this, so the two cannot list different links.
 */
export function crawlBlock(route) {
  const r = norm(route)
  if (r === '/') {
    const { tools, guides, hubs } = homeLinks()
    return {
      label: 'Tools',
      className: 'crawl crawl--home',
      sections: [
        { heading: 'Tools', links: tools },
        { heading: 'Guides', links: guides },
        { heading: 'More', links: hubs },
      ],
    }
  }
  const related = relatedFor(r)
  if (!related) return null
  return {
    label: 'Related',
    className: 'crawl crawl--related',
    sections: [
      { heading: r === '/tools' ? 'Tools' : 'Related tools', links: related.tools },
      { heading: 'Guides', links: related.guides },
      { heading: 'More', links: related.hubs },
    ].filter((s) => s.links.length),
  }
}
