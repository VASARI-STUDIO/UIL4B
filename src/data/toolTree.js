// Single source of truth for the tool tree.
//
// This one file drives THREE surfaces so they can never drift apart:
//   1. the pill-nav mega-menus (Create / Discover / Learn),
//   2. the in-tool left rail (sibling tools in the same Create group),
//   3. the router's Create route table (see `createRoutes()` + App.jsx).
//
// Most groups are still structure-only: their destinations render the friendly
// 🤫 "still building" state, so they carry `soon: true` and show a "Soon" badge
// in the nav. The first LIVE category is Icons & Emoji (`soon: false`) — its
// tools mount for real inside the Create shell. Each tool ALSO carries its own
// `soon` flag: when the founder builds a category they flip the group to
// `soon: false`, and any still-unbuilt sub-tool then surfaces its own badge.
// Category `hue` maps to a `--hue-*` token in global.css via `data-hue` (never
// an inline colour).

export const CREATE_GROUPS = [
  {
    id: 'colour',
    label: 'Colour System Generator',
    hue: 'colour',
    home: '/color',
    desc: 'Palettes, tints, gradients and contrast — one system.',
    soon: true,
    // Colour is one merged client tool: every sub-generator lives on /color.
    tools: [
      { id: 'palette', label: 'Palette', route: '/color', soon: false },
      { id: 'semantic', label: 'Semantic Colour', route: '/color', soon: true },
      { id: 'tint', label: 'Tint', route: '/color', soon: false },
      { id: 'ui-colour', label: 'UI Colour', route: '/color', soon: false },
      { id: 'gradient', label: 'Gradient', route: '/color', soon: false },
      { id: 'contrast', label: 'Contrast Checker', route: '/color', soon: false },
    ],
  },
  {
    id: 'icons',
    label: 'Icons & Emoji',
    hue: 'icons',
    home: '/icons-emoji',
    desc: '200k icons and every emoji, copy-ready.',
    soon: false,
    tools: [
      { id: 'icons', label: 'Icon Library', route: '/icons', soon: false },
      { id: 'emoji', label: 'Emoji Library', route: '/emoji', soon: false },
    ],
  },
  {
    id: 'type',
    label: 'Typography System Builder',
    hue: 'type',
    home: '/typography',
    desc: 'Pair fonts and build scales that hold up.',
    soon: true,
    tools: [
      { id: 'font-gallery', label: 'Font Gallery', route: '/fontgallery', soon: false },
      { id: 'font-pair', label: 'Font Pair', route: '/fontpairs', soon: false },
      { id: 'type-scale', label: 'Type Scale', route: '/typescale', soon: false },
    ],
  },
  {
    id: 'component',
    label: 'UI Component Builder',
    hue: 'component',
    home: '/ui-builder-cat',
    desc: 'Design components with live preview and CSS out.',
    soon: true,
    tools: [
      { id: 'component-designer', label: 'Component Designer', route: '/ui-builder', soon: false },
      { id: 'box-shadow', label: 'Box Shadow', route: '/box-shadow', soon: false },
      { id: 'auto-builder', label: 'Auto-Builder', route: '/auto-builder', soon: false },
    ],
  },
  {
    id: 'imagery',
    label: 'Imagery & Media',
    hue: 'imagery',
    home: '/imagery',
    desc: 'Convert, compress and frame every asset.',
    soon: true,
    tools: [
      { id: 'file-converter', label: 'File Converter', route: '/file-converter', soon: false },
      { id: 'ratio', label: 'Aspect Ratio', route: '/ratio', soon: false },
    ],
  },
  {
    id: 'ai',
    label: 'AI Studio',
    hue: 'ai',
    home: '/ai-tools',
    desc: 'Generators for prompts, pages and alt text.',
    soon: true,
    tools: [
      { id: 'ai-prompt', label: 'Image Prompt', route: '/ai-prompt', soon: false },
      { id: 'landing-prompts', label: 'Landing-Page Prompt', route: '/landing-prompts', soon: false },
      { id: 'alt-text', label: 'Alt Text', route: '/alt-text', soon: false },
      { id: 'prompts', label: 'Prompt Library', route: '/prompts', soon: false },
    ],
  },
]

// Discover + Learn are blank landing shells in Phase 1: every menu entry routes
// to the surface landing (which owns the honest "coming soon" messaging), so
// there are no dead links and nothing claims to be live before it is.
export const DISCOVER_GROUPS = [
  { id: 'inspiration', label: 'Inspiration', desc: 'Community UI systems, Mobbin-style browsing.', route: '/discover', soon: true },
  { id: 'community-fonts', label: 'Community Fonts', desc: 'Pairings the community actually ships.', route: '/discover', soon: true },
  { id: 'community-prompts', label: 'Community Prompts', desc: 'Proven prompts, submitted and curated.', route: '/discover', soon: true },
  { id: 'curated', label: 'Curated Resources', desc: 'Hand-picked external tools that earn a tab.', route: '/discover', soon: true },
  { id: 'collections', label: 'Collections', desc: 'Save and organise everything you find.', route: '/discover', soon: true },
]

export const LEARN_GROUPS = [
  { id: 'principles', label: 'Design Principles', desc: 'The rules behind interfaces that work.', route: '/learn', soon: true },
  { id: 'themes', label: 'UI Themes', desc: 'Dark, light and custom theme systems.', route: '/learn', soon: true },
  { id: 'brand', label: 'Brand Colour Guide', desc: 'Choose brand colours with confidence.', route: '/learn', soon: true },
  { id: 'typography', label: 'Typography Guide', desc: 'Type that reads and scales cleanly.', route: '/learn', soon: true },
  { id: 'seo', label: 'SEO', desc: 'Small-business and specialist playbooks.', route: '/learn', soon: true },
  { id: 'marketing', label: 'Marketing', desc: 'Positioning, messaging and social.', route: '/learn', soon: true },
  { id: 'ai-assistants', label: 'AI Coding Assistants', desc: 'Ship faster with AI in the loop.', route: '/learn', soon: true },
  // The conversion-adjacent item — gets the accent-blue dot in the menu.
  { id: 'help', label: 'Help & Getting Started', desc: 'Everything to get productive fast.', route: '/learn', soon: true, accent: true },
]

// Desktop mega-menu column groupings. The flat `groups` list still drives the
// router and the mobile sheet; on desktop those same group objects are dealt into
// 2–3 labelled columns so related tools sit under a short, scannable eyebrow. Each
// spec entry names the column and the group ids (in order) that fall under it —
// resolved to shared group references so the menu can never drift from the tree.
function toColumns(groups, spec) {
  const seen = new Set()
  const cols = spec.map(({ label, ids }) => {
    const items = ids
      .map((id) => groups.find((g) => g.id === id))
      .filter((g) => g && !seen.has(g.id) && seen.add(g.id))
    return { label, groups: items }
  })
  // Safety net: any group the spec forgot lands in a trailing "More" column, so a
  // newly-added tool is never silently dropped from the menu.
  const rest = groups.filter((g) => !seen.has(g.id))
  if (rest.length) cols.push({ label: 'More', groups: rest })
  return cols.filter((c) => c.groups.length)
}

const CREATE_COLUMNS = toColumns(CREATE_GROUPS, [
  { label: 'Foundations', ids: ['colour', 'type'] },
  { label: 'Components & Icons', ids: ['component', 'icons'] },
  { label: 'Media & AI', ids: ['imagery', 'ai'] },
])

const DISCOVER_COLUMNS = toColumns(DISCOVER_GROUPS, [
  { label: 'Community', ids: ['inspiration', 'community-fonts', 'community-prompts'] },
  { label: 'Your library', ids: ['curated', 'collections'] },
])

const LEARN_COLUMNS = toColumns(LEARN_GROUPS, [
  { label: 'Foundations', ids: ['principles', 'themes', 'brand', 'typography'] },
  { label: 'Growth & help', ids: ['seo', 'marketing', 'ai-assistants', 'help'] },
])

// Top-level nav model consumed by PillNav. Each section carries its flat `groups`
// (router + mobile sheet), `columns` (the labelled desktop mega-menu layout), and
// the copy for its promo card (the right-hand feature panel): an eyebrow, a
// heading, a short blurb and a CTA that links to the relevant surface landing.
// `width` is a legacy hint — the panel's real width is set per `data-menu` in
// global.css.
//
// NOTE (for PM / design): the `promo` copy below is first-pass placeholder text —
// it's honest and on-brand, but it hasn't been through a copy pass. Flag for review.
export const NAV_SECTIONS = [
  {
    id: 'create', label: 'Create', groups: CREATE_GROUPS, columns: CREATE_COLUMNS, width: 960,
    promo: {
      eyebrow: 'Create',
      title: 'Your whole UI system, one workspace',
      blurb: 'Build colour, type, components and icons that stay in sync — then export production-ready code.',
      cta: 'See how it works',
      href: '/home',
    },
  },
  {
    id: 'discover', label: 'Discover', groups: DISCOVER_GROUPS, columns: DISCOVER_COLUMNS, width: 640,
    promo: {
      eyebrow: 'Discover',
      title: 'Inspiration worth the tab',
      blurb: 'Community UI systems, font pairings and prompts — curated, never scraped.',
      cta: 'Browse Discover',
      href: '/discover',
    },
  },
  {
    id: 'learn', label: 'Learn', groups: LEARN_GROUPS, columns: LEARN_COLUMNS, width: 800,
    promo: {
      eyebrow: 'Learn',
      title: 'Understand the why',
      blurb: 'Principles, theme systems and guides that make your interfaces hold up.',
      cta: 'Start learning',
      href: '/learn',
    },
  },
]

// Normalise a pathname: lowercase, strip query/hash, drop a trailing slash.
function normalise(p) {
  if (typeof p !== 'string' || !p) return '/'
  let path = p.toLowerCase()
  const cut = path.search(/[?#]/)
  if (cut !== -1) path = path.slice(0, cut)
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '')
  return path
}

// Every unique Create route (category homes + tool routes), in menu order.
// Drives the router so a new tool never needs a hand-edited <Route>.
export function createRoutes() {
  const seen = new Set()
  const out = []
  for (const g of CREATE_GROUPS) {
    for (const r of [g.home, ...g.tools.map((t) => t.route)]) {
      const path = normalise(r)
      if (!seen.has(path)) {
        seen.add(path)
        out.push(path)
      }
    }
  }
  return out
}

// Which Create group owns a pathname (its category home or any tool route).
export function findCreateGroup(pathname) {
  const path = normalise(pathname)
  return (
    CREATE_GROUPS.find(
      (g) => normalise(g.home) === path || g.tools.some((t) => normalise(t.route) === path),
    ) || null
  )
}

// Resolve a Create pathname to the group, the specific tool (if not the category
// home), a human name, and whether we're on the category home. Used by the shell
// and the coming-soon page. Returns null group for non-Create routes.
export function resolveTool(pathname) {
  const path = normalise(pathname)
  const group = findCreateGroup(path)
  if (!group) return { group: null, tool: null, name: 'This tool', isHome: false }
  const isHome = normalise(group.home) === path
  const tool = isHome ? null : group.tools.find((t) => normalise(t.route) === path) || null
  const name = tool ? tool.label : group.label
  return { group, tool, name, isHome }
}

// Human label for a route, for document.title. Null when unknown.
export function routeLabel(pathname) {
  const path = normalise(pathname)
  for (const g of CREATE_GROUPS) {
    if (normalise(g.home) === path) return g.label
    const t = g.tools.find((tool) => normalise(tool.route) === path)
    if (t) return t.label
  }
  return null
}
