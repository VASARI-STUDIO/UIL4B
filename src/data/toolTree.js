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
    home: '/create/color',
    desc: 'Palettes, tints, gradients and contrast — one system.',
    soon: false,
    // Every colour feature is its own tool on its own page. /create/color stays the
    // merged full studio; palette/semantic/gradient render the studio
    // focused on their section, while tint + contrast are standalone pages.
    tools: [
      { id: 'palette', label: 'Palette', route: '/create/palette', soon: false },
      { id: 'semantic', label: 'Semantic Colour', route: '/create/semantic-color', soon: false },
      { id: 'tint', label: 'Tint', route: '/create/tint', soon: false },
      { id: 'gradient', label: 'Gradient', route: '/create/gradient', soon: false },
      { id: 'contrast', label: 'Contrast Checker', route: '/create/contrast', soon: false },
    ],
  },
  {
    id: 'icons',
    label: 'Icons & Emoji',
    hue: 'icons',
    home: '/create/icons-emoji',
    desc: '200k icons and every emoji, copy-ready.',
    soon: false,
    tools: [
      { id: 'icons', label: 'Icon Library', route: '/create/icons', soon: false },
      { id: 'emoji', label: 'Emoji Library', route: '/create/emoji', soon: false },
    ],
  },
  {
    id: 'type',
    label: 'Typography System Builder',
    hue: 'type',
    home: '/create/typography',
    desc: 'Pair fonts and build scales that hold up.',
    soon: false,
    // ⚠️ A tool is only `soon: false` when its route is in CreateTool's
    // LIVE_TOOLS map — otherwise the route renders the 🤫 workshop state and
    // the nav must dim it. Keep the two in sync.
    tools: [
      { id: 'font-gallery', label: 'Font Gallery', route: '/create/font-gallery', soon: false },
      { id: 'font-pair', label: 'Font Pair', route: '/create/font-pair', soon: false },
      { id: 'type-scale', label: 'Type Scale', route: '/create/type-scale', soon: false },
    ],
  },
  {
    id: 'component',
    label: 'UI Component Builder',
    hue: 'component',
    home: '/create/components',
    desc: 'Design components with live preview and CSS out.',
    soon: true,
    tools: [
      { id: 'component-designer', label: 'Component Designer', route: '/create/component-designer', soon: true },
      { id: 'box-shadow', label: 'Box Shadow', route: '/create/box-shadow', soon: true },
      { id: 'auto-builder', label: 'Auto-Builder', route: '/create/auto-builder', soon: true },
    ],
  },
  {
    id: 'imagery',
    label: 'Imagery & Media',
    hue: 'imagery',
    home: '/create/imagery',
    desc: 'Convert, compress and frame every asset.',
    soon: false,
    tools: [
      { id: 'file-converter', label: 'File Converter', route: '/create/file-converter', soon: false },
      { id: 'ratio', label: 'Aspect & Resolution', route: '/create/aspect-ratio', soon: false },
    ],
  },
  {
    id: 'ai',
    label: 'AI Studio',
    hue: 'ai',
    home: '/create/ai-tools',
    desc: 'Generators for prompts, pages and alt text.',
    // Live because Alt Text is live and mounted in CreateTool's LIVE_TOOLS. The
    // three unbuilt siblings now carry their own Soon badge, which is exactly
    // the per-tool behaviour the header comment describes.
    soon: false,
    tools: [
      { id: 'alt-text', label: 'Alt Text', route: '/create/alt-text', soon: false },
      { id: 'ai-prompt', label: 'Image Prompt', route: '/create/ai-prompt', soon: true },
      { id: 'landing-prompts', label: 'Landing-Page Prompt', route: '/create/landing-prompts', soon: true },
      // Prompt Library is no longer here — it moved to Discover, where the
      // other browse-and-take surfaces live. Create is for tools you OPERATE.
    ],
  },
]

// The ONE Create category home that is a real page rather than a redirect.
//
// CreateTool.jsx sends a live group's category home to its first tool ("A live
// group's category home has no screen of its own"), so /create/typography,
// /create/imagery, /create/ai-tools and /create/icons-emoji are redirects, not
// destinations; /create/components is `soon` and renders the workshop state.
// /create/color is the exception because App.jsx intercepts it ABOVE CreateTool
// and renders ColorLanding, the colour sales page.
//
// This lives here, next to the groups it describes, because THREE things need
// it and none of them may keep its own copy:
//   1. scripts/route-matrix.mjs, so a URL that only bounces gets no crawlable
//      shell (it re-exports this name, so its own importers are unchanged);
//   2. src/data/toolIndex.js, so search never offers a category row that
//      redirects the moment you click it;
//   3. tests/unit/prerender-routes.test.js, which asserts this against the
//      actual text of App.jsx.
//
// It is the one fact about the Create tree that is asserted rather than
// derived, because LIVE_TOOLS and the App.jsx intercept live in .jsx modules
// Node cannot import. An unchecked assumption is just a parallel list with
// better manners, so both are read as source text by the tests above.
export const CREATE_HOMES_THAT_RENDER = Object.freeze(['/create/color'])

// WHERE A LINK TO A CATEGORY SHOULD ACTUALLY GO.
//
// The fact above says which homes are real pages. This is what a link is
// supposed to do about it, and it exists because two surfaces were getting it
// wrong by hand: AppFooter.jsx pointed "Imagery" at /create/imagery, and the
// homepage tools grid linked every category head at `group.home` — four of the
// six only bounce. CreateTool.jsx then 302s the visitor to the group first
// tool, so the click cost a navigation to arrive where a direct link would have
// gone. That is the same defect #332 fixed in the search index, where "alt
// text" landed a visitor on /create/ai-tools.
//
// The rule is CreateTool.jsx own, restated once here instead of guessed at four
// times: a live group whose home is not a real screen sends you to its first
// tool; a Soon group keeps its home, because that home renders the workshop
// state and IS a destination. tests/unit/tool-tree-surfaces.test.js reads the
// redirect branch out of CreateTool.jsx and fails if the two stop agreeing.
export function categoryDestination(groupOrId) {
  const group = typeof groupOrId === 'string'
    ? CREATE_GROUPS.find((g) => g.id === groupOrId)
    : groupOrId
  if (!group) throw new Error(`categoryDestination: "${groupOrId}" is not a Create group`)
  const first = group.tools?.[0]
  const bounces = !group.soon
    && !CREATE_HOMES_THAT_RENDER.includes(group.home)
    && !!first
    && normalise(first.route) !== normalise(group.home)
  return bounces ? first.route : group.home
}

// Every Create tool the app can actually mount, flattened out of the groups.
// `soon` is inherited from the group as well as the tool, because a tool inside
// a Soon group renders the workshop state whatever its own flag says.
export function createTools() {
  return CREATE_GROUPS.flatMap((g) =>
    g.tools.map((t) => ({
      id: t.id,
      label: t.label,
      route: t.route,
      group: g.id,
      soon: !!(g.soon || t.soon),
    })),
  )
}

// The routes that mount a real screen — the set CreateTool.jsx's LIVE_TOOLS map
// must equal exactly. tests/unit/search-index.test.js reads that map out of the
// .jsx source and fails if the two ever disagree, which is what turns the
// "keep the two in sync" comment above into something a build can check.
export function liveToolRoutes() {
  return createTools().filter((t) => !t.soon).map((t) => normalise(t.route))
}

// ── Homepage: two deliberately separate models ──────────────────────────────
// ELEVEN live tools against FIVE task modes in the mini-workbench. They are not
// one-to-one — Semantic, Tint and Contrast stay direct tool links, both media
// tools belong to Image, and the three typography tools resolve into one
// Typography mode. Keeping the two models apart is the point of the section: it
// makes the scattered-to-system relationship legible instead of decorative.
//
// `family` is the workbench mode a tool resolves into. It never selects a tab
// and never changes an href.
//
// CORRECTED: this used to say the hero SHOWS the eleven, and that `family`
// drives their hover hint and the decorative convergence. Both stopped being
// true when V2 removed the satellite field — useHomeMotion.js says so in its
// own comment, Home.jsx says "The satellites are gone, but the RELATIONSHIP is
// not", and there is no `hsat` left in global.css. What `family` drives now is
// the aria-describedby on the tools grid, so a screen-reader user still hears
// which mode a tool resolves into. See HOME_SATELLITE_SPEC below.

export const HOME_WORKBENCH_TABS = [
  { id: 'palette', label: 'Palette', hue: 'colour', icon: 'palette' },
  { id: 'gradient', label: 'Gradient', hue: 'colour', icon: 'gradient' },
  { id: 'image', label: 'Image', hue: 'imagery', icon: 'imagery' },
  { id: 'icon', label: 'Icon', hue: 'icons', icon: 'icons' },
  { id: 'typography', label: 'Typography', hue: 'type', icon: 'typography' },
]

// Source order IS the reading order (and the ≤768px list order).
//
// ── What this table may and may not say ─────────────────────────────────────
//
// The spec below is PRESENTATION, keyed by a tool own id in CREATE_GROUPS. It
// can choose which live tools appear, in what order, with which glyph, in which
// zone, and it can give one a shorter name than the nav uses. It CANNOT invent
// a tool, and it never writes a ROUTE or a HUE down — both are read back out of
// the group that owns the tool, so a satellite can no longer point at a URL the
// router does not have. Same split src/data/toolIndex.js makes for search: this
// file owns identity, the consumer owns its own presentation.
//
// Before this, all seven fields were typed by hand next to the table they were
// copied from, and three of the eleven labels had already diverged from the
// tree ("Semantic" vs "Semantic Colour", "Contrast" vs "Contrast Checker",
// "Gradient Generator" vs "Gradient"). Those three are deliberate — the chips
// are small — so they stay as explicit overrides, and the test fails an
// override that has become identical to the tree label, because a redundant
// copy is just the next thing to go stale.
//
// FLAGGED, NOT ACTIONED. The comment that used to sit here said the wide-screen
// offsets live in global.css as `.hsat-item:nth-child()` rules. There are ZERO
// occurrences of `hsat` in global.css: the satellite field was removed from the
// hero and its CSS with it. The only field any consumer still reads is
// `family` — Home.jsx builds a route → family map so the tools grid can carry
// the same many-tools-into-five-modes relationship for assistive tech. So
// `label`, `hue`, `icon` and `zone` currently render nowhere. They are kept
// because the surfaces above them are being restyled right now and the fields
// are the whole description of the satellite model; deleting them is a separate
// call from de-duplicating them, which is what this change is.
const HOME_SATELLITE_SPEC = [
  { id: 'palette', family: 'palette', icon: 'palette', zone: 'upper left' },
  { id: 'semantic', label: 'Semantic', family: 'palette', icon: 'semantic', zone: 'left' },
  { id: 'tint', family: 'palette', icon: 'tint', zone: 'lower left' },
  { id: 'gradient', label: 'Gradient Generator', family: 'gradient', icon: 'gradient', zone: 'upper right' },
  { id: 'contrast', label: 'Contrast', family: 'palette', icon: 'contrast', zone: 'right' },
  { id: 'icons', family: 'icon', icon: 'icons', zone: 'outer right' },
  { id: 'file-converter', family: 'image', icon: 'imagery', zone: 'lower right' },
  { id: 'ratio', family: 'image', icon: 'ratio', zone: 'lower outer edge' },
  { id: 'font-gallery', family: 'typography', icon: 'type', zone: 'upper inner left' },
  { id: 'font-pair', family: 'typography', icon: 'font-pair', zone: 'upper inner right' },
  { id: 'type-scale', family: 'typography', icon: 'typography', zone: 'upper centre' },
]

// A tool id resolved against the tree, or a loud failure. Silently dropping an
// unknown id is how a homepage entry disappears without anyone noticing — the
// exact failure mode toolIndex.js names for an orphan metadata key — so this
// throws at import, which fails `npm run build` (prerender.mjs imports this
// module) as well as the unit suite.
function requireTool(id, where) {
  const tool = createTools().find((t) => t.id === id)
  if (!tool) throw new Error(`${where} names "${id}", which is not a tool in CREATE_GROUPS`)
  return tool
}

// A tool id resolved to the route the router actually has.
//
// categoryDestination() above answers a different question — where a link to a
// CATEGORY HEAD should land — and it is not interchangeable with this one. Four
// of the homepage step rail's five destinations are specific tools that are not
// their group's destination: the Colour group's head resolves to /create/color
// (its home renders), not to /create/palette or /create/gradient, and the Type
// group's head resolves to /create/font-gallery, not /create/type-scale. Only
// Icons coincides. Reaching for categoryDestination() there would have quietly
// moved four links, which is why the rule a consumer needs is stated once here
// rather than borrowed from the one next to it.
//
// Unknown ids throw at import, so a typo fails `npm run build` (prerender.mjs
// imports this module) rather than shipping a dead href.
export function toolRoute(id) {
  return requireTool(id, 'toolRoute').route
}

export const HOME_SATELLITES = HOME_SATELLITE_SPEC.map((sat) => {
  const tool = requireTool(sat.id, 'HOME_SATELLITE_SPEC')
  const group = CREATE_GROUPS.find((g) => g.id === tool.group)
  return {
    id: tool.id,
    label: sat.label || tool.label,
    route: tool.route,
    family: sat.family,
    hue: group.hue,
    icon: sat.icon,
    zone: sat.zone,
  }
})

// Family id → the workbench tab it resolves into. Read by Home.jsx for the
// accessible description on each tool link; it never selects a tab. (It used to
// say "the satellite's family hint and the decorative convergence" — both went
// with the satellite field.)
export const HOME_FAMILY_LABEL = Object.fromEntries(HOME_WORKBENCH_TABS.map((t) => [t.id, t.label]))

// Discover + Learn are landing shells in Phase 1: most menu entries route to the
// surface landing (which owns the honest "coming soon" messaging), so there are
// no dead links and nothing claims to be live before it is. The exception is the
// Gradient Library — a real, curated browse surface — which is `soon: false` and
// links straight to its live page, so it renders as a live card and menu row.
//
// TWO KINDS OF ROW, and only one of them may write a route down.
//
//   `tool:` names a CREATE_GROUPS tool id. The route AND the `soon` flag come
//   from the tree, so a Discover row cannot point at a Create URL the router
//   does not have, and a tool that goes back into the workshop dims its
//   Discover card on the same edit. Two rows are this kind — Font Gallery and
//   Icon Library — and both used to carry a hand-typed second copy of a
//   /create/ route sitting eighty lines below the table it was copied from.
//
//   `route:` is for the surfaces the Create tree does not own (/discover and
//   its galleries). Those are still declared, because nothing else declares
//   them — but the test asserts every one is a route the app can actually
//   render and is not a retired URL.
const DISCOVER_SPEC = [
  { id: 'palette-library', icon: 'palette', label: 'Palette Library', desc: 'Curated colour systems ready to copy, save or open in the Palette Builder.', route: '/discover/palettes', soon: false },
  { id: 'gradient-gallery', label: 'Gradient Library', desc: 'A curated set of production-ready CSS gradients — copy one, or open it in the generator.', route: '/discover/gradients', soon: false },
  { id: 'font-gallery', icon: 'type', label: 'Font Gallery', desc: 'Browse, compare and test the Google Fonts catalogue with full live specimens.', tool: 'font-gallery' },
  // Reachable from BOTH surfaces on purpose. The page is already a Discover
  // gallery in everything but its URL — #292 put it on the shared Library
  // browse components and #306 put it under DiscoverGalleryHero — so listing it
  // here is the founder's “access icon library from the discover tab” without a
  // canonical move. Same shape as Font Gallery above: one entry, one live route,
  // no redirect table entry and no change to the prerendered route count. The
  // Emoji Library is deliberately not a second entry — it is the other tab of
  // this same page, one click away inside the hero #306 shipped.
  { id: 'icon-library', icon: 'icons', label: 'Icon Library', desc: 'Search 200,000+ icons from the popular open-source packs — preview, recolour, then copy SVG or JSX.', tool: 'icons' },
  { id: 'inspiration', label: 'Inspiration', desc: 'Community-submitted UI systems — browse, save and submit your own.', route: '/discover', soon: true },
  { id: 'community-prompts', icon: 'community-prompts', label: 'Prompt Library', desc: 'Ready-to-use prompts for UI, web design and marketing — a free selection for everyone, the full library with Pro.', route: '/discover/prompts', soon: false },
  { id: 'curated', label: 'Curated Resources', desc: 'Hand-picked external tools that earn a tab.', route: '/discover', soon: true },
  { id: 'collections', label: 'Collections', desc: 'Save and organise everything you find.', route: '/discover', soon: true },
]

export const DISCOVER_GROUPS = DISCOVER_SPEC.map((row) => {
  if (!row.tool) return row
  const { tool: id, ...rest } = row
  const tool = requireTool(id, 'DISCOVER_SPEC')
  return { ...rest, route: tool.route, soon: tool.soon }
})

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
// eyebrow.
//
// This USED to be a hand-written table that repeated every tool's id, label,
// route and `soon` flag beside the authoritative CREATE_GROUPS above, with a
// comment explaining that the duplication was deliberate. It was the same
// defect class #332 removed from the search index — "a parallel list with
// better manners" — and it had already drifted: the menu said "AI Image
// Prompt" where CREATE_GROUPS says "Image Prompt". A nav that keeps its own
// copy of the route table is one edit away from advertising a tool that does
// not exist, which is exactly what #332 found search doing.
//
// So the menu now owns only what is genuinely PRESENTATION — the column
// grouping, the order within a column, and the icon glyph — and resolves
// everything else (label, route, soon) out of CREATE_GROUPS at build time.
// A menu tweak still cannot break routing, because the menu never writes a
// route down. tests/unit/search-index.test.js asserts the two agree.
//
// Shape: `columns` is an array of STACKS; a stack is an array of captioned
// groups `{ label, tools }` that render top-to-bottom inside one grid column.
// Most stacks hold a single group; Create's third column stacks three small
// groups — "Icons", "Media" (converter + aspect calculator) and "AI" — so each
// gets its own eyebrow without forcing a fourth (cramped) grid column.

// Which NavIcon glyph a tool row shows. Presentation only: an id missing here
// falls back to the tool's own id, which is what NavIcon keys on anyway.
const MENU_ICONS = {
  'font-gallery': 'type',
  'type-scale': 'typography',
  'component-designer': 'component',
  'auto-builder': 'auto',
  icons: 'icons',
  emoji: 'emoji',
  'file-converter': 'imagery',
  'ai-prompt': 'ai',
  'landing-prompts': 'marketing',
}

// Which category hue a tool row wears. Read off the owning CREATE_GROUP, so a
// tool that moves group changes colour automatically.
const TOOL_HUE = Object.fromEntries(
  CREATE_GROUPS.flatMap((g) => g.tools.map((t) => [t.id, g.hue])),
)

// The column layout: eyebrow + the tool ids under it, in reading order. Ids
// only — no labels, no routes, no soon flags.
const CREATE_MENU_SPEC = [
  [{ label: 'Colour', ids: ['palette', 'gradient', 'contrast', 'tint', 'semantic'] }],
  // "Type & UI" was one eyebrow over six rows drawn from two different
  // categories — three typography tools that all work today and three component
  // tools that are all still Soon. Under one heading the live half inherited the
  // dead half's reputation. Split, using the names CREATE_GROUPS already gives
  // these categories, so a scanner sees three working type tools and a
  // separately-labelled group that has not shipped.
  [
    { label: 'Typography', ids: ['font-gallery', 'font-pair', 'type-scale'] },
    { label: 'Components', ids: ['component-designer', 'box-shadow', 'auto-builder'] },
  ],
  [
    { label: 'Icons', ids: ['icons', 'emoji'] },
    { label: 'Media', ids: ['file-converter', 'ratio'] },
    { label: 'AI', ids: ['alt-text', 'ai-prompt', 'landing-prompts'] },
  ],
]

// Resolve the spec against the authoritative tool list. Label, route and soon
// come from CREATE_GROUPS every time; the spec supplies only grouping + order.
function buildCreateMenu() {
  const tools = createTools()
  const byId = new Map(tools.map((t) => [t.id, t]))
  const placed = new Set()
  const toRow = (t) => ({
    id: t.id,
    label: t.label,
    route: t.route,
    soon: t.soon,
    icon: MENU_ICONS[t.id] || t.id,
    hue: TOOL_HUE[t.id],
  })
  const columns = CREATE_MENU_SPEC.map((stack) =>
    stack
      .map(({ label, ids }) => ({
        label,
        tools: ids
          .map((id) => byId.get(id))
          .filter((t) => t && !placed.has(t.id) && placed.add(t.id))
          .map(toRow),
      }))
      .filter((group) => group.tools.length),
  ).filter((stack) => stack.length)
  // Same safety net groupsToMenu uses below: a tool added to CREATE_GROUPS but
  // not to the spec surfaces in a trailing "More" column rather than being
  // silently dropped from the nav. The test asserts this stays empty, so the
  // net catches the omission in CI as well as in the UI.
  const rest = tools.filter((t) => !placed.has(t.id))
  if (rest.length) columns.push([{ label: 'More', tools: rest.map(toRow) }])
  return columns
}

const CREATE_MENU = buildCreateMenu()

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
    icon: g.icon || g.id,
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
  { label: 'Browse', ids: ['palette-library', 'gradient-gallery', 'font-gallery', 'icon-library'] },
  { label: 'Community', ids: ['inspiration', 'community-prompts'] },
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
