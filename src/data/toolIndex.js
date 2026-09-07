// THE SEARCH INDEX — derived, never typed.
//
// ── The defect this file exists to make impossible ──────────────────────────
//
// There used to be a hand-written `TOOLS` array in tools.jsx listing what the
// product contained, and a separate `CREATE_GROUPS` in toolTree.js listing what
// the router mounts. Two hand-maintained lists of the same reality. They
// drifted, and by 2026-09-03 the app could not find its own tools: typing
// `palette`, `gradient`, `contrast` or `tint` into the hero command bar all
// returned one stale row called "Colour Studio" and navigated to /create/color,
// which is the colour SALES page; `semantic` and `converter` returned nothing at
// all. Seven of the thirteen live tools could not be reached by name, including
// the Palette Builder — the destination the homepage own "Start with a palette"
// button points at.
//
// So the shape of the fix is the one src/data/legacyRoutes.js already
// established for redirects: ONE table, several consumers, and a test that
// fails the build when they disagree.
//
//   toolTree.js  owns IDENTITY  — which Create tools exist, what they are
//                                 called, where they live, and whether they are
//                                 built (`soon`). It already drove the router,
//                                 the mega-menus, route resolution and the
//                                 prerender matrix; search is simply the fifth
//                                 consumer rather than a rival list.
//   this file     owns SEARCH METADATA — the words a visitor might type, and
//                                 the one-line description a result row shows.
//                                 It can add search words to a tool. It cannot
//                                 invent a tool, rename one, or point one at a
//                                 destination the router does not have, because
//                                 it never writes a route down.
//
// Why toolTree and not CreateTool.jsx LIVE_TOOLS, which is what actually
// mounts: LIVE_TOOLS is a map of React components inside a .jsx module, so Node
// cannot import it and it cannot carry labels, keywords or grouping without
// turning the router file into the data layer. Instead `liveToolRoutes()` in
// toolTree.js states the same set, and tests/unit/search-index.test.js reads
// LIVE_TOOLS out of the .jsx source and fails if the two sets differ — so the
// "keep the two in sync" comment in toolTree.js is now checked by the build
// rather than by a human.
//
// ── Why this is .js and tools.jsx is .jsx ───────────────────────────────────
//
// Everything here is data and pure functions, so `node --test` can import it
// and run REAL queries against the REAL index. The icons are JSX, so they stay
// in tools.jsx, which composes the two and re-exports the whole public API. A
// test that could only read source text would be back to asserting against a
// copy of the truth.
// Explicit .js extensions, unlike the rest of src/: `node --test` resolves ESM
// strictly, and this module has to be importable by the test that guards it.
// src/utils/routeMeta.js does the same for the same reason.
import {
  CREATE_GROUPS,
  CREATE_HOMES_THAT_RENDER,
  createTools,
} from './toolTree.js'
import { LEGACY_REDIRECTS } from './legacyRoutes.js'

// ── Retired destinations ────────────────────────────────────────────────────
//
// legacyRoutes.js already forbids one redirect pointing at another. Nothing
// stopped the search index itself from pointing at a retired URL, and ten of
// its rows did: every /docs* entry, /prompts and /resources. A result row that
// 301s somewhere else is a search box sending you to the wrong page and then
// bouncing you — so every declared path is resolved through the same table
// that generates the redirects, once, here.
const REDIRECTS = new Map(LEGACY_REDIRECTS.map(([from, to]) => [from, to]))

/** A declared path resolved to where the visitor actually ends up. */
export function liveDestination(path) {
  let out = path
  // A chain is already forbidden by redirects.test.js; the loop guard is here
  // so a future table that grows one cannot hang the module.
  for (let hop = 0; hop < 4 && REDIRECTS.has(out); hop += 1) out = REDIRECTS.get(out)
  return out
}

// ── Categories ──────────────────────────────────────────────────────────────
//
// The six Create categories no longer keep their own copy of the route: `group`
// names a CREATE_GROUPS id and the path comes from that group home. `label`
// and `description` stay here because they are search-result copy, and the
// i18n keys are the ones the locale files already ship.
//
// `destination: false` marks a category that is NOT a page you can be sent to.
// CreateTool.jsx redirects a live group home to its first tool and renders the
// workshop state for a Soon one, so /create/typography, /create/imagery,
// /create/icons-emoji, /create/ai-tools and /create/components are all
// non-destinations — search used to offer all five, and "alt text" landed a
// visitor on /create/ai-tools, a URL that only bounces. The single exception is
// /create/color, and it is CREATE_HOMES_THAT_RENDER in toolTree.js that says so.
//
// Withdrawing a category row must not withdraw its WORDS. "imagery" and
// "media" were only findable through the /create/imagery row, so they are now
// keywords on the two tools that row was bouncing visitors to.
const CATEGORY_DEFS = [
  {
    id: 'color',
    group: 'colour',
    labelKey: 'categories.color.label',
    descKey: 'categories.color.description',
    label: 'Colour Studio',
    description: 'Build palettes, scales, gradients and verify accessibility.',
  },
  {
    id: 'typography',
    group: 'type',
    labelKey: 'categories.typography.label',
    descKey: 'categories.typography.description',
    label: 'Typography',
    description: 'Type scales and font pairings tuned for readability.',
  },
  {
    id: 'imagery',
    group: 'imagery',
    labelKey: 'categories.imagery.label',
    descKey: 'categories.imagery.description',
    label: 'Imagery',
    description: 'Convert and compress images, extract frames, and work out aspect ratios.',
  },
  {
    id: 'icons-emoji',
    group: 'icons',
    labelKey: 'categories.iconsEmoji.label',
    descKey: 'categories.iconsEmoji.description',
    label: 'Icons & Emoji',
    description: 'Search thousands of icons and browse emoji to copy instantly.',
  },
  {
    id: 'ui-builder',
    group: 'component',
    labelKey: 'categories.uiBuilder.label',
    descKey: 'categories.uiBuilder.description',
    label: 'UI Builder',
    description: 'Design dashboard components with live previews and CSS export.',
  },
  {
    id: 'ai',
    group: 'ai',
    labelKey: 'categories.ai.label',
    descKey: 'categories.ai.description',
    label: 'AI Tools',
    description: 'AI-powered generators for images, alt text, and more.',
  },
  {
    id: 'documentation',
    path: '/docs',
    labelKey: 'categories.documentation.label',
    descKey: 'categories.documentation.description',
    label: 'Documentation',
    description: 'Design principles and marketing references.',
  },
  {
    id: 'resources',
    path: '/resources',
    labelKey: 'categories.resources.label',
    descKey: 'categories.resources.description',
    label: 'Resources',
    description: 'Curated external tools, fonts, colours, and inspiration.',
  },
]

/** Categories with their route and destination status derived, not declared. */
export const CATEGORY_ENTRIES = CATEGORY_DEFS.map((def) => {
  const group = def.group ? CREATE_GROUPS.find((g) => g.id === def.group) : null
  const path = liveDestination(group ? group.home : def.path)
  return {
    ...def,
    path,
    destination: group ? CREATE_HOMES_THAT_RENDER.includes(group.home) : true,
  }
})

/** CREATE_GROUPS id → the category id a tool in that group belongs to. */
const GROUP_TO_CATEGORY = Object.fromEntries(
  CATEGORY_DEFS.filter((c) => c.group).map((c) => [c.group, c.id]),
)

// ── Search metadata for the Create tools ────────────────────────────────────
//
// Keyed by the tool OWN id in toolTree.js. A key that names no tool is a typo
// this file cannot express as a route, and search-index.test.js fails on it.
//
// Keywords carry the synonyms the label cannot: the nav calls the palette tool
// "Palette" because it sits under a "Colour" eyebrow, but a visitor types
// "palette builder", which is what the homepage calls it — and typing that used
// to return nothing at all.
export const CREATE_TOOL_SEARCH = {
  palette: {
    description: 'Generate a full palette from one colour, with tints, shades and accessible pairings.',
    keywords: ['palette', 'palette builder', 'palettes', 'colour', 'color', 'swatch', 'scheme', 'harmony', 'brand colours', 'brand colors', 'generator'],
  },
  semantic: {
    description: 'Success, warning, error, info and pending colours derived from your brand.',
    keywords: ['semantic', 'semantic colour', 'semantic color', 'state', 'states', 'success', 'warning', 'error', 'danger', 'info', 'tokens', 'system', 'studio'],
  },
  tint: {
    description: 'Turn any colour into a production-ready tint and shade ramp.',
    keywords: ['tint', 'tints', 'shade', 'shades', 'ramp', 'steps', 'lighten', 'darken', 'scale', 'colour', 'color'],
  },
  gradient: {
    description: 'Design linear, radial and conic gradients and copy the CSS.',
    keywords: ['gradient', 'gradients', 'linear', 'radial', 'conic', 'mesh', 'css', 'background', 'fade', 'blend'],
  },
  contrast: {
    description: 'Free WCAG checker — test any two colours for AA and AAA.',
    keywords: ['contrast', 'contrast checker', 'checker', 'wcag', 'aa', 'aaa', 'accessibility', 'a11y', 'ratio', 'legibility', 'readable'],
  },
  icons: {
    description: 'Search 200,000+ icons from the open-source packs, then copy SVG or JSX.',
    keywords: ['icon', 'icons', 'icon library', 'svg', 'jsx', 'symbol', 'glyph', 'iconify', 'pictogram'],
  },
  emoji: {
    description: 'Browse and copy every emoji, organised by category.',
    keywords: ['emoji', 'emojis', 'emoji library', 'emoticon', 'smiley', 'unicode', 'copy', 'symbol'],
  },
  'font-gallery': {
    description: 'Browse, compare and test the Google Fonts catalogue with live specimens.',
    keywords: ['font', 'fonts', 'font gallery', 'gallery', 'browse', 'typeface', 'specimen', 'preview', 'google fonts', 'typography'],
  },
  'font-pair': {
    description: 'Curated font pairings for headlines and body, previewed live.',
    keywords: ['font', 'fonts', 'font pair', 'font pairing', 'pairing', 'pairings', 'pairs', 'combination', 'heading', 'body', 'google fonts', 'typography'],
  },
  'type-scale': {
    description: 'Modular type scale calculator with CSS and token export.',
    keywords: ['type', 'type scale', 'scale', 'modular', 'font size', 'sizes', 'ratio', 'rhythm', 'tokens', 'css', 'typography'],
  },
  'component-designer': {
    description: 'Design buttons, cards, tables and inputs with live previews and CSS export.',
    keywords: ['ui', 'component', 'components', 'component designer', 'button', 'card', 'table', 'input', 'dashboard', 'builder', 'design'],
  },
  'box-shadow': {
    description: 'Design layered CSS box shadows with a live preview.',
    keywords: ['box', 'shadow', 'shadows', 'box shadow', 'css', 'elevation', 'layer', 'drop shadow', 'neumorphic'],
  },
  'auto-builder': {
    // The old row promised 'a UI preview', which the dormant alpha faked and
    // the shipped tool does not produce. Search copy is a claim like any
    // other; this one now names the three artefacts that actually come back.
    description: 'Describe what you are making and generate a palette, a font pairing and a type scale.',
    keywords: ['auto', 'auto builder', 'auto-builder', 'brand starter', 'starter', 'generate', 'generator', 'brand', 'ai', 'palette', 'font', 'fonts', 'type scale', 'business', 'kit', 'beta'],
  },
  'file-converter': {
    description: 'Convert and compress images and video — WebP, MP4, GIF, frames and more.',
    keywords: ['convert', 'converter', 'file converter', 'file', 'image', 'imagery', 'media', 'compress', 'resize', 'webp', 'gif', 'mp4', 'video', 'frames', 'extract', 'png', 'jpeg', 'avif', 'ezgif'],
  },
  ratio: {
    description: 'Solve any aspect ratio, resolution, PPI or diagonal from a single measurement.',
    keywords: ['ratio', 'aspect', 'aspect ratio', 'resolution', 'calculator', 'dimensions', 'resize', 'imagery', 'media', '16:9', '4:3', 'crop', 'ppi', 'diagonal', 'screen size', 'device', 'instagram', 'reel', 'banner'],
  },
  'alt-text': {
    description: 'Generate accessible alt text for images in batch using AI.',
    keywords: ['alt', 'alt text', 'alt text generator', 'accessibility', 'a11y', 'ai', 'description', 'batch', 'image'],
  },
  'ai-prompt': {
    description: 'Generate detailed AI image prompts from a design brief.',
    keywords: ['ai', 'prompt', 'prompts', 'image prompt', 'openrouter', 'image', 'generator', 'midjourney', 'dalle', 'stable diffusion'],
  },
  'landing-prompts': {
    description: 'Build structured JSON prompts for generating websites with AI builders.',
    keywords: ['ai', 'landing', 'landing page', 'page', 'website', 'prompt', 'json', 'v0', 'lovable', 'bolt', 'generator'],
  },
}

/** Every Create tool, identity from toolTree.js and search words from above. */
const CREATE_TOOL_ENTRIES = createTools().map((tool) => {
  const meta = CREATE_TOOL_SEARCH[tool.id] || {}
  return {
    id: tool.id,
    label: tool.label,
    path: tool.route,
    category: GROUP_TO_CATEGORY[tool.group],
    // `soon` replaces the old hand-set `alpha` flag, which is how a LIVE tool
    // (File Converter, Alt Text) got hidden from search while a workshop one
    // (Box Shadow) was offered. One flag, and toolTree.js sets it.
    soon: tool.soon,
    description: meta.description || '',
    keywords: meta.keywords || [],
  }
})

// ── Surfaces outside the Create tree ────────────────────────────────────────
//
// toolTree.js does not own these, so they are declared. Their paths still go
// through liveDestination(), which is why they no longer point at retired URLs:
// the seven /docs* rows and /docs itself resolve to /learn, /prompts to
// /discover/prompts and /resources to /discover.
//
// NOTE FOR THE FOUNDER, recorded rather than acted on: resolving those makes
// visible that seven "documentation" rows now share one destination, /learn,
// which is itself a coming-soon surface. That is exactly where they landed
// before (via a 301), so nothing has changed for a visitor — but whether pages
// that no longer exist belong in the search index at all is a product call, not
// a refactor. See the PR description.
const STATIC_TOOL_DEFS = [
  { id: 'prompts', label: 'Prompt Library', path: '/prompts', category: 'documentation', description: 'AI image generation prompts with output previews.', keywords: ['prompt', 'prompts', 'ai', 'midjourney', 'dalle', 'stable diffusion', 'library'] },
  { id: 'docs-design', label: 'Design Principles', path: '/docs-design', category: 'documentation', subcategory: 'Design & Brand', description: 'Visual hierarchy, balance, and design psychology.', keywords: ['design', 'principles', 'theory', 'documentation'] },
  { id: 'docs-social', label: 'Social & Marketing', path: '/docs-social', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Social media and marketing best practices.', keywords: ['social', 'marketing', 'content', 'documentation'] },
  { id: 'docs-themes', label: 'UI Design Themes', path: '/docs-themes', category: 'documentation', subcategory: 'Design & Brand', description: 'Reference guide to major UI design trends with visual examples.', keywords: ['themes', 'trends', 'brutalism', 'glassmorphism', 'bento', 'luxury', 'design', 'style'] },
  { id: 'docs-brand', label: 'Brand Colour Guide', path: '/docs-brand', category: 'documentation', subcategory: 'Design & Brand', description: 'How to choose, build, and maintain a brand colour palette.', keywords: ['brand', 'colour', 'color', 'palette', '60-30-10', 'psychology', 'accessibility', 'guide'] },
  { id: 'docs-seo', label: 'SEO for Small Business', path: '/docs-seo', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Practical SEO strategies — Google Business Profile, local SEO, technical foundations.', keywords: ['seo', 'google', 'search', 'local', 'business', 'ranking', 'schema', 'web vitals'] },
  { id: 'seo', label: 'SEO Specialist', path: '/seo', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Live SERP + social preview, scored checklist, copy-ready meta tags, and a JSON-LD structured-data generator.', keywords: ['seo', 'meta', 'serp', 'title', 'description', 'snippet', 'preview', 'open graph', 'social', 'score', 'inspector', 'specialist', 'schema', 'json-ld', 'structured data'] },
  { id: 'docs-marketing', label: 'Marketing Fundamentals', path: '/docs-marketing', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Positioning, funnels, email, paid ads, and brand voice for small businesses.', keywords: ['marketing', 'funnel', 'email', 'ads', 'brand', 'positioning', 'conversion', 'analytics'] },
  { id: 'docs-ai', label: 'AI Coding Assistants', path: '/docs-ai', category: 'documentation', subcategory: 'AI & Workflow', description: 'Claude tips, prompting patterns, subagents, and workflow integration for AI-assisted development.', keywords: ['ai', 'claude', 'cursor', 'copilot', 'prompting', 'subagent', 'coding', 'assistant'] },
  { id: 'resources', label: 'External Resources', path: '/resources', category: 'resources', description: 'Curated links to fonts, colours, AI tools, and inspiration.', keywords: ['resources', 'links', 'external', 'google fonts', 'tailwind', 'framer', 'awwwards'] },
]

const STATIC_TOOL_ENTRIES = STATIC_TOOL_DEFS.map((tool) => ({
  ...tool,
  path: liveDestination(tool.path),
  soon: false,
}))

/** The whole index, Create tools first (they are what the product sells). */
export const TOOL_ENTRIES = [...CREATE_TOOL_ENTRIES, ...STATIC_TOOL_ENTRIES]

// ── i18n ────────────────────────────────────────────────────────────────────
//
// Only ids whose shipped translation still names the same tool. A missing entry
// falls back to the registry label, which is correct-and-untranslated; a wrong
// entry would be confidently wrong in nine languages. `tools.colorStudio` is
// deliberately unmapped: the tool it names no longer exists, and pointing it at
// Semantic Colour would rename a live tool after a retired one.
export const TOOL_I18N_MAP = {
  icons: 'tools.iconLibrary',
  emoji: 'tools.emojiLibrary',
  'font-gallery': 'tools.fontGallery',
  'font-pair': 'tools.fontPairs',
  'type-scale': 'tools.typeScale',
  'alt-text': 'tools.altText',
  prompts: 'tools.promptLibrary',
  'docs-design': 'tools.docsDesign',
  'docs-social': 'tools.docsSocial',
  resources: 'tools.externalResources',
}

export function localiseWith(list, t, map) {
  return list.map((item) => {
    const prefix = map[item.id]
    if (!prefix) return item
    const label = t(prefix + '.label')
    const description = t(prefix + '.description')
    return {
      ...item,
      label: (label && label !== prefix + '.label') ? label : item.label,
      description: (description && description !== prefix + '.description') ? description : item.description,
    }
  })
}

export function localiseCategoriesWith(list, t) {
  return list.map((cat) => {
    const label = t(cat.labelKey)
    const description = t(cat.descKey)
    return {
      ...cat,
      label: (label && label !== cat.labelKey) ? label : cat.label,
      description: (description && description !== cat.descKey) ? description : cat.description,
    }
  })
}

// THE BADGE COMES FROM THE SAME FILE AS THE ROW IT LABELS.
//
// A search row shows a tool's label and description beside a pill naming its
// category. The label and description come from the registry unless
// TOOL_I18N_MAP says a shipped translation still names the same tool; the pill
// was read straight off the locale regardless. In en-US that split one row in
// half: "Palette / Generate a full palette from one COLOUR, with tints, shades
// and accessible pairings" carried a pill reading "COLOR STUDIO", and four such
// rows sat ~700px under a hero headed "COLOUR, type and tokens that stay one
// system". Typing "colour" answered in US spelling.
//
// This is NOT a case for rewriting en-US, which legitimately holds US
// spellings for the strings it actually translates. It is a case about which
// file a given row reads from: a row still carrying the registry's authored
// British keeps the registry's category name, and a row whose own words came
// from the locale takes the locale's. Either way the pill and the words beside
// it agree, in every locale rather than only in en.
export function categoryPillFor(item, cat, t) {
  if (!cat) return null
  if (!TOOL_I18N_MAP[item.id]) return cat.label
  const label = t(cat.labelKey)
  return (label && label !== cat.labelKey) ? label : cat.label
}

// Group an ordered list of tools by their `subcategory` field, preserving the
// original order both of the groups (first appearance wins) and of tools within
// each group. Tools without a `subcategory` are collected into a trailing
// group whose `subcategory` is null, so callers can render them ungrouped.
// Returns [] when no tool in the list declares a subcategory — callers can use
// that as the signal to fall back to flat rendering.
export function groupBySubcategory(tools) {
  if (!tools.some(t => t.subcategory)) return []
  const order = []
  const map = new Map()
  for (const tool of tools) {
    const key = tool.subcategory || null
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key).push(tool)
  }
  // Keep labelled subcategories in first-appearance order, but always sort the
  // unlabelled (null) catch-all group last so general docs trail the named ones.
  order.sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0))
  return order.map(key => ({ subcategory: key, tools: map.get(key) }))
}

// ── The one query implementation ────────────────────────────────────────────
// Shared by the ⌘K CommandPalette and the homepage command bar. Both surfaces
// call THIS — a second hand-rolled filter over a hard-coded array is how a
// "search" starts offering tools the product does not have, or hiding ones it
// does. Callers pass an already-localised index so the predicate never has to
// know about i18n.
export function matchesQuery(item, q) {
  if (item.label.toLowerCase().includes(q)) return true
  if (item.description && item.description.toLowerCase().includes(q)) return true
  if (item.keywords && item.keywords.some(k => k.includes(q))) return true
  return false
}

// ── How well a row matches ──────────────────────────────────────────────────
// `matchesQuery` answers WHETHER a row matches. This answers HOW WELL, and it
// exists so that the tool whose NAME you typed is the one Enter opens —
// HomeCommandBar documents Enter as "opens the first hit", and before this the
// order was simply registry order. Typing "tint" put the Palette Builder first,
// because palette's description happens to contain the word "tints", and Enter
// took you to the wrong tool. Coarse and total on purpose; ties keep registry
// order, which is an authored sequence rather than an accident.
export function matchRank(item, q) {
  const label = item.label.toLowerCase()
  if (label.startsWith(q)) return 0
  if (label.includes(q)) return 1
  const keywords = item.keywords || []
  if (keywords.some(k => k === q)) return 2
  if (keywords.some(k => k.includes(q))) return 3
  if (item.description && item.description.toLowerCase().includes(q)) return 4
  return 5
}

// Stable within a rank: the index tie-break is explicit rather than relying on
// the engine sort being stable.
function rankedMatches(list, q) {
  return list
    .map((item, index) => ({ item, index, rank: matchRank(item, q) }))
    .filter(entry => matchesQuery(entry.item, q))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.item)
}

export function queryCommandIndex(query, { tools = [], categories = [], actions = [] }) {
  const q = query.trim().toLowerCase()
  if (!q) return { query: '', tools: [], categories: [], actions: [], total: 0 }
  const hitTools = rankedMatches(tools, q)
  // A category row is only offered when it is somewhere you can be SENT. The
  // filter lives inside the shared query rather than at each caller, because a
  // caller that forgets it starts navigating visitors to URLs that only bounce
  // — which is what "alt text" did, landing on /create/ai-tools.
  const hitCats = rankedMatches(categories.filter(c => c.destination !== false), q)
  const hitActions = rankedMatches(actions, q)
  return {
    query: q,
    tools: hitTools,
    categories: hitCats,
    actions: hitActions,
    total: hitTools.length + hitCats.length + hitActions.length,
  }
}

// ── Example terms for a search placeholder ──────────────────────────────────
// The homepage hero bar types these one character at a time, and the PillNav
// search field types the same list into a <span> (its field is a button, so it
// has no placeholder attribute to drive). They stand in for the "Try …" chips
// the founder removed on 2026-09-03: they are the only thing left telling a
// visitor what is in the box. That makes correctness the whole point, which is
// why they are SELECTED FROM THE REGISTRY rather than written down — PillNav
// kept its own array until 2026-09-03 and it had already gone wrong, advertising
// "palette builder" and "contrast checker", both of which returned "No results",
// and "gradients", which landed on the colour sales page.
//
// `/create/` only, because those are the things a visitor can go and make;
// docs and resources are findable in the bar but are not what the hero sells.
// The length cap keeps a term inside the input at 390px — "Aspect & Resolution
// Calculator" is 30 characters and truncates mid-word, which reads as a bug.
//
// THIS FUNCTION APPLIES THE WORKSHOP FILTER ITSELF, and that is the whole
// point of the 2026-09-05 revision. It used to say “caller passes an
// already-soon-filtered list” and leave `soon` to the two call sites — which
// made it a helper that answered a SIMILAR question to the one its callers were
// asking. Both happened to filter correctly, so nothing was wrong on screen;
// what was wrong is that nothing could go wrong ONLY BY LUCK. Handed the plain
// registry it returned Component Designer, Box Shadow, Auto-Builder, Image
// Prompt and Landing-Page Prompt — five tools with no page behind them — and
// the suite could not see it, because the existing assertion pre-filtered its
// own input and then checked the result was filtered.
//
// A third surface is the realistic way that lands: someone adds hints somewhere
// new, reads the signature, passes `localiseTools(t)`, and ships the persistent
// nav advertising a tool that does not exist. That is the same defect this
// function was written to end, arriving through the function itself.
//
// So the rule lives in ONE place and no caller can decline it. The `!tl.soon`
// filters still at the call sites are not redundant: they narrow the list those
// components ALSO feed to queryCommandIndex, which is a different question.
export const HINT_MAX_LEN = 20
export function searchHints(tools) {
  return tools
    .filter(tool => !tool.soon
      && tool.path.startsWith('/create/')
      && tool.label.length <= HINT_MAX_LEN)
    .map(tool => tool.label)
}
