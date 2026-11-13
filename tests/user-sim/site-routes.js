// The site's routes as the user-sim specs walk them: the static pages, the live Create
// tools and their views, the live Discover surfaces and the Learn articles, read from
// the same data the router and the nav use. Not a spec.
import { CREATE_GROUPS, DISCOVER_GROUPS, isListedTool } from '../../src/data/toolTree.js'
import { LEARN_ARTICLE_ROUTES } from '../../src/data/learnIndex.js'

export const STATIC_ROUTES = [
  '/', '/home', '/mobile', '/tools', '/plans', '/sitemap',
  '/login', '/reset-password', '/onboarding',
  '/projects', '/checkout', '/checkout/return', '/settings',
  '/community', '/feedback', '/privacy', '/terms', '/credits', '/info', '/seo',
  '/discover', '/discover/palettes', '/discover/gradients', '/discover/buttons',
  '/learn', '/learn/help', '/learn/principles',
]

const CREATE_ROUTES = CREATE_GROUPS.flatMap((group) => (
  group.soon ? [] : group.tools.filter((tool) => !tool.soon && isListedTool(tool)).flatMap((tool) => [tool.route, ...(tool.views || [])])
))
const DISCOVER_ROUTES = DISCOVER_GROUPS.filter((group) => !group.soon).map((group) => group.route)

export const ROUTES = [...new Set([...STATIC_ROUTES, ...CREATE_ROUTES, ...DISCOVER_ROUTES, ...LEARN_ARTICLE_ROUTES])]

/** Open only to a signed-in account that has one saved project (signIn({ projects: 1 })). */
export const PROJECT_ROUTES = ['/projects/seed-1', '/projects/seed-1/export']
