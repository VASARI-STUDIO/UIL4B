// WHICH LEARN GUIDE THE MENU SUGGESTS.
//
// The same signal as the Discover pane (discoverRecommendation.js): the tools a
// visitor opened lately, newest first. The guide that explains the newest tool
// that has one is offered, and the tool is named as the reason. The guide the
// visitor is reading is skipped. With no usable activity the first default guide
// is offered.
//
// Guides come from LEARN_ARTICLES, the registry that makes each one routable, so
// a route here is always a real page.
import { createTools } from '../../data/toolTree.js'
import { LEARN_ARTICLES } from '../../data/learnIndex.js'

// Create tool id -> Learn guide slug that explains it. There is no guide about
// imagery yet: the image tools point at the guide on colour spaces and gamut, and
// Alt Text at the contrast guide (accessibility), the nearest the library has.
export const GUIDE_FOR_TOOL = Object.freeze({
  palette: 'brand-colour',
  semantic: 'theme-systems',
  tint: 'colour-spaces',
  gradient: 'colour-spaces',
  contrast: 'colour-contrast',
  'font-gallery': 'typeface-metrics',
  'font-pair': 'font-loading',
  'type-scale': 'type-scales',
  'file-converter': 'colour-spaces',
  ratio: 'colour-spaces',
  '3d-converter': 'colour-spaces',
  'alt-text': 'colour-contrast',
})

// The order offered when nothing recent points anywhere.
export const DEFAULT_GUIDE_ORDER = Object.freeze([
  'colour-contrast', 'brand-colour', 'type-scales', 'typeface-metrics',
])

const onRoute = (path, route) => !!route && (path === route || path.startsWith(route + '/'))

/**
 * @param {{ recent?: string[], path?: string }} input recent tool ids, newest first; the current pathname
 * @returns {{ guide: object, fromTool: object | null } | null} a LEARN_ARTICLES entry with its `route`, and the Create tool that led to it
 */
export function recommendGuide({ recent = [], path = '' } = {}) {
  const open = (slug) => {
    const article = LEARN_ARTICLES.find((a) => a.slug === slug)
    if (!article) return null
    const route = `/learn/${article.slug}`
    return onRoute(path, route) ? null : { ...article, route }
  }
  const tools = createTools()
  for (const toolId of recent) {
    const guide = open(GUIDE_FOR_TOOL[toolId])
    const fromTool = tools.find((t) => t.id === toolId && !t.soon)
    if (guide && fromTool) return { guide, fromTool }
  }
  for (const slug of DEFAULT_GUIDE_ORDER) {
    const guide = open(slug)
    if (guide) return { guide, fromTool: null }
  }
  return null
}
