// Discover seed — curated external resources (Slice 2a, static + bundled).
//
// Field model (per docs/reference/discover.md external-resource model):
//   id            stable key (also the localStorage save id + the ?preset value)
//   title         display name
//   host          bare hostname shown under the title (e.g. "designgradients.com")
//   url           full external URL (rendered as a nofollow new-tab <a>)
//   category      one of the keys in discoverCategories.js
//   free          true → "Free" pill, false → "Paid" pill
//   tags          string[] — searchable, shown in the detail modal
//   shortDescription  2-line clamped card body
//   useCase       optional one-liner chip ("what you'd reach for it for")
//   difficulty    optional 'Beginner' | 'Intermediate' | 'Advanced' chip
//   whyUseful     longer detail-modal paragraph
//   relatedTools  [{ label, route, preset? }] — the in-product hand-off.
//                 `preset` is only honoured by GradientGenerator (/create/gradient),
//                 which is where every preset entry below points; every other tool
//                 routes without a reader and toasts. This used to name ColorStudio,
//                 which carried a second copy of the reader that nothing ever
//                 reached — deleted 2026-09-04 with that page's dead sections.
//   added         ISO date — drives the "Recently added" sort
//   featured      true → appears in the Featured rail with a STAFF PICK badge
//
// Security: card faces are generated locally from title+category. We NEVER
// fetch the external URL. All external links carry
// rel="noopener noreferrer nofollow" target="_blank".

export const DISCOVER_RESOURCES = [
  // SCOPE: this page is for what sits OUTSIDE the UIL4B orbit - UI elements,
  // inspiration, assets, motion. Not listed, because a UIL4B tool or library
  // already does the job: the three
  // gradient sites (Design Gradients, uiGradients, Gradient Magic), the three
  // palette sites (Color Hunt, Coolors, Happy Hues) and the three font sites
  // (Google Fonts, Fontshare, Typewolf).

  // ─── Inspiration ─────────────────────────────────────────────────────────
  {
    id: 'motionsites',
    title: 'Motionsites',
    host: 'motionsites.ai',
    url: 'https://motionsites.ai',
    category: 'inspiration',
    free: true,
    tags: ['inspiration', 'motion', 'animation', 'websites'],
    shortDescription: 'A gallery of animated, motion-rich websites — the best place to study how movement and interaction carry a modern landing page.',
    useCase: 'Motion & interaction reference',
    difficulty: 'Intermediate',
    whyUseful: 'When you need to see motion done well — page transitions, scroll effects, micro-interactions. Use it to brief animation, then build the static system in the UI Builder.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
    ],
    added: '2026-06-22',
    featured: true,
  },
  {
    id: 'godly',
    title: 'Godly',
    host: 'godly.website',
    url: 'https://godly.website',
    category: 'inspiration',
    free: true,
    tags: ['inspiration', 'websites', 'curated', 'awards'],
    shortDescription: 'Astronomically good web design — a tightly curated showcase of the best landing pages and product sites around.',
    useCase: 'Landing-page inspiration',
    whyUseful: 'A high bar for visual craft. Study the layouts and type, then assemble your own in the UI Builder.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
    ],
    added: '2026-06-10',
  },
  {
    id: 'mobbin',
    title: 'Mobbin',
    host: 'mobbin.com',
    url: 'https://mobbin.com',
    category: 'inspiration',
    free: false,
    tags: ['inspiration', 'mobile', 'patterns', 'flows'],
    shortDescription: 'Real, screenshotted UI flows from shipped mobile and web apps — the reference library for proven interaction patterns.',
    useCase: 'Flow & pattern research',
    difficulty: 'Beginner',
    whyUseful: 'When you need to see how a real product solves a flow (onboarding, checkout, settings). Pair it with the UI Builder to lay out your own version.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
    ],
    added: '2026-05-30',
  },
  {
    id: 'navbar-gallery',
    title: 'Navbar Gallery',
    host: 'navbar.gallery',
    url: 'https://www.navbar.gallery/',
    category: 'inspiration',
    free: true,
    tags: ['inspiration', 'navigation', 'navbar', 'header', 'menu', 'patterns'],
    shortDescription: 'The largest library of navigation-bar inspiration on the web — hundreds of real headers and menus, filterable by style and industry.',
    useCase: 'Navigation & header patterns',
    difficulty: 'Beginner',
    whyUseful: 'The navbar sets the tone for the whole product, and it is the one component most sites get wrong. Study how shipped sites structure their navigation, mega-menus and mobile drawers here, then rebuild the pattern that fits your system in the UI Builder.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
    ],
    added: '2026-07-08',
    featured: true,
  },

  // ─── Dev tools ───────────────────────────────────────────────────────────
  {
    id: 'cssscan-shadows',
    title: 'CSS Scan — Box Shadows',
    host: 'getcssscan.com',
    url: 'https://getcssscan.com/css-box-shadow-examples',
    category: 'dev-tools',
    free: true,
    tags: ['css', 'box-shadow', 'elevation', 'copy-ready'],
    shortDescription: 'A grid of copy-ready box-shadow examples, including hover states, so you can match elevation without guessing values.',
    useCase: 'Copy-ready shadow states (incl. hover)',
    difficulty: 'Beginner',
    whyUseful: 'Skip the trial-and-error on shadow values — grab a base look here, then dial in blur, spread and layered shadows precisely in the Box Shadow Generator.',
    relatedTools: [
      { label: 'Box Shadow Generator', route: '/create/box-shadow' },
    ],
    added: '2026-06-19',
    featured: true,
  },
  {
    id: 'cubic-bezier',
    title: 'cubic-bezier',
    host: 'cubic-bezier.com',
    url: 'https://cubic-bezier.com',
    category: 'dev-tools',
    free: true,
    tags: ['css', 'easing', 'animation', 'timing'],
    shortDescription: 'A visual editor for CSS easing curves — compare your custom curve against the presets with a live racing preview.',
    useCase: 'Tuning easing curves',
    difficulty: 'Intermediate',
    whyUseful: 'The fastest way to get a natural-feeling transition curve. Hand the value off into any CSS you export from the toolkit.',
    relatedTools: [
      { label: 'Box Shadow Generator', route: '/create/box-shadow' },
    ],
    added: '2026-06-02',
  },
  {
    id: 'transform-tools',
    title: 'Transform Tools',
    host: 'transform.tools',
    url: 'https://transform.tools',
    category: 'dev-tools',
    free: true,
    tags: ['css', 'svg', 'json', 'converters', 'utilities'],
    shortDescription: 'A swiss-army box of converters — SVG to JSX, CSS to JS, JSON to types and dozens more, all client-side.',
    useCase: 'Quick format conversions',
    whyUseful: 'Handy whenever you need to move between formats while wiring up components. Complements the in-app File Converter for code-shaped data.',
    relatedTools: [
      { label: 'File Converter', route: '/create/file-converter' },
    ],
    added: '2026-05-25',
  },

  // ─── Free assets ─────────────────────────────────────────────────────────
  {
    id: 'coverr',
    title: 'Coverr',
    host: 'coverr.co',
    url: 'https://coverr.co',
    category: 'free-assets',
    free: true,
    tags: ['video', 'stock', 'backgrounds', 'free'],
    shortDescription: 'Free, beautifully-shot stock videos for website backgrounds and hero sections — no attribution required.',
    useCase: 'Hero & background video',
    difficulty: 'Beginner',
    whyUseful: 'The go-to for a tasteful background video. Grab a clip, then use the File Converter to pull a poster frame or convert the format for the web.',
    relatedTools: [
      { label: 'File Converter', route: '/create/file-converter' },
    ],
    added: '2026-06-17',
    featured: true,
  },
  {
    id: 'unsplash',
    title: 'Unsplash',
    host: 'unsplash.com',
    url: 'https://unsplash.com',
    category: 'free-assets',
    free: true,
    tags: ['photos', 'stock', 'imagery', 'free'],
    shortDescription: 'The largest library of free, high-resolution photography — endlessly useful for mockups, heroes and content.',
    useCase: 'Free photography',
    whyUseful: 'A staple. Download a photo, then convert or compress it for the web with the File Converter before shipping.',
    relatedTools: [
      { label: 'File Converter', route: '/create/file-converter' },
    ],
    added: '2026-06-04',
  },
  {
    id: 'undraw',
    title: 'unDraw',
    host: 'undraw.co',
    url: 'https://undraw.co',
    category: 'free-assets',
    free: true,
    tags: ['illustrations', 'svg', 'open-source', 'recolour'],
    shortDescription: 'Open-source illustrations you can recolour to your brand on the fly — perfect for empty states and onboarding.',
    useCase: 'Recolourable illustrations',
    difficulty: 'Beginner',
    whyUseful: 'Match the illustration accent to your palette. Pull your brand colour from the Colour System Builder and apply it here.',
    relatedTools: [
      { label: 'Colour System Builder', route: '/create/color' },
    ],
    added: '2026-05-22',
  },

  // ─── Components ──────────────────────────────────────────────────────────
  {
    id: 'cssscan-buttons',
    title: 'CSS Scan — Buttons',
    host: 'getcssscan.com',
    url: 'https://getcssscan.com/css-buttons-examples',
    category: 'components',
    free: true,
    tags: ['css', 'buttons', 'components', 'hover-states'],
    shortDescription: 'A large set of copy-ready CSS button styles, complete with hover and click states you can lift straight into a project.',
    useCase: 'Button styles with hover/click states',
    difficulty: 'Beginner',
    whyUseful: 'A shortcut to a polished button, including interaction states. Use it as a reference and rebuild it in the UI Builder so it fits your design system.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
      { label: 'Box Shadow Generator', route: '/create/box-shadow' },
    ],
    added: '2026-06-21',
    featured: true,
  },
  {
    id: 'wickedblocks',
    title: 'Wicked Blocks',
    host: 'wickedblocks.dev',
    url: 'https://wickedblocks.dev',
    category: 'components',
    free: true,
    tags: ['tailwind', 'blocks', 'components', 'sections'],
    shortDescription: 'Hundreds of free, copy-paste Tailwind blocks — heroes, pricing tables, FAQs and full page sections.',
    useCase: 'Pre-built page sections',
    difficulty: 'Intermediate',
    whyUseful: 'A fast way to block out a page. Drop in a section, then theme it to your system in the UI Builder.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
    ],
    added: '2026-06-07',
  },
  {
    id: 'hyperui',
    title: 'HyperUI',
    host: 'hyperui.dev',
    url: 'https://www.hyperui.dev',
    category: 'components',
    free: true,
    tags: ['tailwind', 'components', 'free', 'application-ui'],
    shortDescription: 'A free, open-source collection of Tailwind components for marketing and application UIs, with light and dark variants.',
    useCase: 'App & marketing components',
    whyUseful: 'Solid, accessible component starting points. Bring the structure into the UI Builder and apply your styles.',
    relatedTools: [
      { label: 'UI Builder', route: '/create/component-designer' },
    ],
    added: '2026-05-18',
  },
]

// 3 static editorial collections (MVP — fixed membership by id).
export const DISCOVER_COLLECTIONS = [
  {
    id: 'best-saas-ui',
    title: 'Best SaaS UI resources',
    blurb: 'Everything you need to design a credible SaaS product front-to-back.',
    items: ['godly', 'mobbin', 'cssscan-buttons', 'hyperui'],
  },
  {
    id: 'free-tools-freelancers',
    title: 'Free tools for freelancers',
    blurb: 'Zero-budget resources that punch well above their price.',
    items: ['colorhunt', 'google-fonts', 'unsplash', 'coverr'],
  },
  {
    id: 'ai-prompt-packs',
    title: 'AI prompt packs',
    blurb: 'Inspiration and assets to feed your AI-assisted workflow.',
    items: ['motionsites', 'designgradients', 'undraw', 'transform-tools'],
  },
]

// Resolve a collection's item ids → resource objects (skips any missing id).
export function resolveCollection(collection) {
  const byId = Object.fromEntries(DISCOVER_RESOURCES.map(r => [r.id, r]))
  return collection.items.map(id => byId[id]).filter(Boolean)
}
