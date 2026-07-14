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
    soon: false,
    // Every colour feature is its own tool on its own page. /color stays the
    // merged full studio; palette/semantic/ui/gradient render the studio
    // focused on their section, while tint + contrast are standalone pages.
    tools: [
      { id: 'palette', label: 'Palette', route: '/color/palette', soon: false },
      { id: 'semantic', label: 'Semantic Colour', route: '/color/semantic', soon: false },
      { id: 'tint', label: 'Tint', route: '/color/tint', soon: false },
      { id: 'ui-colour', label: 'UI Colour', route: '/color/ui', soon: false },
      { id: 'gradient', label: 'Gradient', route: '/color/gradient', soon: false },
      { id: 'contrast', label: 'Contrast Checker', route: '/color/contrast', soon: false },
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
    // ⚠️ A tool is only `soon: false` when its route is in CreateTool's
    // LIVE_TOOLS map — otherwise the route renders the 🤫 workshop state and
    // the nav must dim it. Keep the two in sync.
    tools: [
      { id: 'font-gallery', label: 'Font Gallery', route: '/fontgallery', soon: true },
      { id: 'font-pair', label: 'Font Pair', route: '/fontpairs', soon: true },
      { id: 'type-scale', label: 'Type Scale', route: '/typescale', soon: true },
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
      { id: 'component-designer', label: 'Component Designer', route: '/ui-builder', soon: true },
      { id: 'box-shadow', label: 'Box Shadow', route: '/box-shadow', soon: true },
      { id: 'auto-builder', label: 'Auto-Builder', route: '/auto-builder', soon: true },
    ],
  },
  {
    id: 'imagery',
    label: 'Imagery & Media',
    hue: 'imagery',
    home: '/imagery',
    desc: 'Convert, compress and frame every asset.',
    soon: false,
    tools: [
      { id: 'file-converter', label: 'File Converter', route: '/file-converter', soon: false },
      { id: 'ratio', label: 'Aspect & Resolution', route: '/ratio', soon: false },
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
      { id: 'ai-prompt', label: 'Image Prompt', route: '/ai-prompt', soon: true },
      { id: 'landing-prompts', label: 'Landing-Page Prompt', route: '/landing-prompts', soon: true },
      { id: 'alt-text', label: 'Alt Text', route: '/alt-text', soon: true },
      { id: 'prompts', label: 'Prompt Library', route: '/prompts', soon: true },
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

// ── Menu-only column model ──────────────────────────────────────────────────
// The mega-menu renders one flat icon+label row per tool, grouped under a short
// eyebrow. This model drives ONLY the menu presentation — it deliberately does
// NOT share references with CREATE_GROUPS above, which still owns the router,
// route resolution and the in-tool rail. A menu tweak can therefore never break
// routing.
//
// Shape: `columns` is an array of STACKS; a stack is an array of captioned
// groups `{ label, tools }` that render top-to-bottom inside one grid column.
// Most stacks hold a single group; Create's third column stacks three small
// groups — "Icons", "Media" (converter + aspect calculator) and "AI" — so each
// gets its own eyebrow without forcing a fourth (cramped) grid column.
//
// NOTE: the six Colour rows are real pages under /color/<tool> (see
// CREATE_GROUPS above) — createRoutes() picks them up automatically.
const CREATE_MENU = [
  [{
    label: 'Colour',
    tools: [
      { id: 'palette', label: 'Palette', route: '/color/palette', icon: 'palette', hue: 'colour', soon: false },
      { id: 'gradient', label: 'Gradient', route: '/color/gradient', icon: 'gradient', hue: 'colour', soon: false },
      { id: 'contrast', label: 'Contrast Checker', route: '/color/contrast', icon: 'contrast', hue: 'colour', soon: false },
      { id: 'tint', label: 'Tint', route: '/color/tint', icon: 'tint', hue: 'colour', soon: false },
      { id: 'semantic', label: 'Semantic Colour', route: '/color/semantic', icon: 'semantic', hue: 'colour', soon: false },
      { id: 'ui-colour', label: 'UI Colour', route: '/color/ui', icon: 'ui-colour', hue: 'colour', soon: false },
    ],
  }],
  [{
    label: 'Type & UI',
    tools: [
      { id: 'font-gallery', label: 'Font Gallery', route: '/fontgallery', icon: 'type', hue: 'type', soon: true },
      { id: 'font-pair', label: 'Font Pair', route: '/fontpairs', icon: 'font-pair', hue: 'type', soon: true },
      { id: 'type-scale', label: 'Type Scale', route: '/typescale', icon: 'typography', hue: 'type', soon: true },
      { id: 'component-designer', label: 'Component Designer', route: '/ui-builder', icon: 'component', hue: 'component', soon: true },
      { id: 'box-shadow', label: 'Box Shadow', route: '/box-shadow', icon: 'box-shadow', hue: 'component', soon: true },
      { id: 'auto-builder', label: 'Auto-Builder', route: '/auto-builder', icon: 'auto', hue: 'component', soon: true },
    ],
  }],
  [
    {
      label: 'Icons',
      tools: [
        { id: 'icons', label: 'Icon Library', route: '/icons', icon: 'icons', hue: 'icons', soon: false },
        { id: 'emoji', label: 'Emoji Library', route: '/emoji', icon: 'emoji', hue: 'icons', soon: false },
      ],
    },
    {
      label: 'Media',
      tools: [
        { id: 'file-converter', label: 'File Converter', route: '/file-converter', icon: 'imagery', hue: 'imagery', soon: false },
        { id: 'ratio', label: 'Aspect & Resolution', route: '/ratio', icon: 'ratio', hue: 'imagery', soon: false },
      ],
    },
    {
      label: 'AI',
      tools: [
        { id: 'ai-prompt', label: 'AI Image Prompt', route: '/ai-prompt', icon: 'ai', hue: 'ai', soon: true },
        { id: 'landing-prompts', label: 'Landing-Page Prompt', route: '/landing-prompts', icon: 'marketing', hue: 'ai', soon: true },
        { id: 'alt-text', label: 'Alt Text', route: '/alt-text', icon: 'alt-text', hue: 'ai', soon: true },
        { id: 'prompts', label: 'Prompt Library', route: '/prompts', icon: 'community-prompts', hue: 'ai', soon: true },
      ],
    },
  ],
]

// Discover / Learn have flat groups with no sub-tools; deal them into the same
// { label, tools } column shape so the menu renderer is uniform. Each group maps
// to one row: icon = the group id (NavIcon carries a glyph per id) and hue falls
// back to accent (these surfaces carry no category hue), with the conversion-
// adjacent Help row flagged `accent`.
function groupsToMenu(groups, spec) {
  const seen = new Set()
  const toRow = (g) => ({
    id: g.id,
    label: g.label,
    route: g.route,
    icon: g.id,
    hue: g.accent ? 'accent' : undefined,
    soon: !!g.soon,
  })
  const cols = spec.map(({ label, ids }) => ({
    label,
    tools: ids
      .map((id) => groups.find((g) => g.id === id))
      .filter((g) => g && !seen.has(g.id) && seen.add(g.id))
      .map(toRow),
  }))
  // Safety net: any group the spec forgot lands in a trailing "More" column, so a
  // newly-added entry is never silently dropped from the menu.
  const rest = groups.filter((g) => !seen.has(g.id))
  if (rest.length) cols.push({ label: 'More', tools: rest.map(toRow) })
  // One group per stack — Discover/Learn never stack, but the menu renderer
  // consumes the same stacks-of-groups shape everywhere.
  return cols.filter((c) => c.tools.length).map((c) => [c])
}

const DISCOVER_MENU = groupsToMenu(DISCOVER_GROUPS, [
  { label: 'Community', ids: ['inspiration', 'community-fonts', 'community-prompts'] },
  { label: 'Your library', ids: ['curated', 'collections'] },
])

const LEARN_MENU = groupsToMenu(LEARN_GROUPS, [
  { label: 'Foundations', ids: ['principles', 'themes', 'brand', 'typography'] },
  { label: 'Growth & help', ids: ['seo', 'marketing', 'ai-assistants', 'help'] },
])

// Top-level nav model consumed by PillNav. Each section carries its flat `groups`
// (still used by the router hand-off), the menu `columns` (the flat icon+label
// mega-menu layout), a `viewAllHref` (the "View all …" link at the foot of the
// columns) and the copy for its promo card: an eyebrow, heading, blurb and TWO
// CTAs — `href` ("Learn more", the surface landing) and `docsHref` ("View docs").
// `width` is a legacy hint — the panel's real width is set per `data-menu` in
// global.css.
//
// NOTE (for PM / design): the `promo` copy below is first-pass placeholder text —
// it's honest and on-brand, but it hasn't been through a copy pass. Flag for review.
export const NAV_SECTIONS = [
  {
    id: 'create', label: 'Create', groups: CREATE_GROUPS, columns: CREATE_MENU, viewAllHref: '/sitemap', width: 960,
    promo: {
      eyebrow: 'Brand kit',
      title: 'Build your brand kit, step by step',
      blurb: 'A guided flow through colour, fonts, type scale and icons — everything saved as you go, then exported as one system.',
      // `guide: true` tells the nav to launch the guided UI-kit builder
      // (colour → fonts → type → icons) instead of following plain links.
      guide: true,
      cta: 'Build a brand kit',
      href: '/learn',
      docsHref: '/learn',
    },
  },
  {
    id: 'discover', label: 'Discover', groups: DISCOVER_GROUPS, columns: DISCOVER_MENU, viewAllHref: '/discover', width: 640,
    promo: {
      eyebrow: 'Discover',
      title: 'Inspiration worth the tab',
      blurb: 'Community UI systems, font pairings and prompts — curated, never scraped.',
      href: '/discover',
      docsHref: '/learn',
    },
  },
  {
    id: 'learn', label: 'Learn', groups: LEARN_GROUPS, columns: LEARN_MENU, viewAllHref: '/learn', width: 800,
    promo: {
      eyebrow: 'Learn',
      title: 'Understand the why',
      blurb: 'Principles, theme systems and guides that make your interfaces hold up.',
      href: '/learn',
      docsHref: '/help',
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
