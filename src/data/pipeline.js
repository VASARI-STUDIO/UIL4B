// App pipeline — the owner's ops view of UIL4B.
//
// Surfaced in the Admin "Pipeline" tab. Where the Board tab tracks each
// feature MODULE, this tracks the app as a whole: its current condition, the
// PROCESSES (workstreams) moving through the pipeline, and the prioritised
// next-to-do queue. Edit this file to keep the pipeline current — it is the
// single source the tab renders from (no backend, no serverless function).
//
// Keep it honest: only list conditions you can verify and tasks that are real.

// ── Current app condition ──────────────────────────────────────────────────
// status: 'good' | 'watch' | 'blocked'
export const APP_CONDITION = [
  { id: 'build', label: 'Build', value: 'Passing', status: 'good', detail: 'vite build clean' },
  { id: 'lint', label: 'Lint', value: '0 errors', status: 'good', detail: 'Advisory warnings tracked separately' },
  { id: 'functions', label: 'Serverless fns', value: '11 / 12', status: 'watch', detail: '1 slot free — consolidate before adding' },
  { id: 'create', label: 'Create surface', value: 'Live', status: 'good', detail: 'Core colour, library and imagery workflows are shipped' },
  { id: 'discover', label: 'Discover surface', value: 'Queued · 20%', status: 'watch', detail: 'Gradient Gallery is live; broader galleries remain backlog' },
  { id: 'learn', label: 'Learn surface', value: 'Coming soon', status: 'watch', detail: 'Content library not started' },
  { id: 'design-system', label: 'Design system', value: 'v2.7 shipped', status: 'good', detail: 'Shared shell, controls, CTA and footer patterns are live' },
  { id: 'phase', label: 'Current phase', value: 'Truth & resilience', status: 'watch', detail: 'Canonical-route accuracy, social cards and global failure states' },
]

// ── Pipeline stages (left → right flow) ─────────────────────────────────────
export const PIPELINE_STAGES = [
  { id: 'backlog', label: 'Backlog', color: 'var(--t3)' },
  { id: 'in-progress', label: 'In progress', color: 'var(--brand)' },
  { id: 'review', label: 'Review', color: 'var(--warn)' },
  { id: 'qa', label: 'QA', color: 'var(--accent-soft)' },
  { id: 'shipped', label: 'Shipped', color: 'var(--ok)' },
]

// ── Active processes / workstreams ──────────────────────────────────────────
// stage: one of PIPELINE_STAGES ids · progress: 0–100
export const PIPELINE_PROCESSES = [
  {
    id: 'public-ui-premium',
    name: 'Premium public UI release',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in v2.7 with the connected living-preview home, editorial mega-menu, shared CTA and footer.',
    updated: '2026-07-28',
  },
  {
    id: 'colour-tools-polish',
    name: 'Colour tools workflow polish',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Gradient, tint, semantic and palette workflow refinements shipped with recovery controls and responsive workbenches.',
    updated: '2026-07-28',
  },
  {
    id: 'library-workflow',
    name: 'Icon + Emoji library workflow',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'The unified library command header, keyboard modes, mobile layout and visible network state are shipped.',
    updated: '2026-07-28',
  },
  {
    id: 'canonical-route-qa',
    name: 'Canonical-route QA',
    area: 'Quality',
    stage: 'in-progress',
    progress: 35,
    summary: 'Continuously reconcile router, navigation, sitemap, metadata and failure states as public routes change.',
    updated: '2026-07-28',
  },
  {
    id: 'discover-buildout',
    name: 'Discover build-out',
    area: 'Product',
    stage: 'backlog',
    progress: 20,
    summary: 'Gradient Gallery is live; broader community and curated-resource galleries are queued after route-truth work.',
    updated: '2026-07-28',
  },
  {
    id: 'learn-content',
    name: 'Learn content library',
    area: 'Product',
    stage: 'backlog',
    progress: 0,
    summary: 'The "understand the why" surface. Routes and metadata exist; the articles do not yet.',
    updated: '2026-07-28',
  },
  {
    id: 'community-backend',
    name: 'Community publishing backend',
    area: 'Product',
    stage: 'backlog',
    progress: 10,
    summary: 'Durable media publishing and server-enforced palette-handle uniqueness need one approved community architecture.',
    updated: '2026-07-28',
  },
  {
    id: 'billing-config',
    name: 'Stripe retention + coupon config',
    area: 'Infra',
    stage: 'backlog',
    progress: 0,
    summary: 'Owner-gated: create the retention coupon and enable cancellation in the Stripe Customer Portal. Code is ready; config is manual.',
    updated: '2026-07-28',
  },
]

// ── Next-to-do queue (prioritised) ──────────────────────────────────────────
// priority: 'P0' | 'P1' | 'P2' · effort: 'S' | 'M' | 'L' · status: 'todo' | 'doing' | 'review' | 'blocked'
export const NEXT_TODO = [
  { id: 'public-route-truth', title: 'Reconcile public routes, metadata and sitemap truth', priority: 'P0', effort: 'M', area: 'Quality', status: 'doing', note: 'Keep App routes, toolTree, PAGE_TITLES/PAGE_DESCRIPTIONS, public sitemap and Soon affordances aligned; no generic loops or claims for workshop-only pages.' },
  { id: 'static-og-card', title: 'Ship the static social-share card', priority: 'P1', effort: 'S', area: 'Growth', status: 'doing', note: 'Create the 1200×630 public/previews/og-image.png already referenced by index.html; palette share cards remain dynamic.' },
  { id: 'account-menu-arrow-nav', title: 'Add arrow-key navigation to the account menu', priority: 'P1', effort: 'S', area: 'Accessibility', status: 'todo', note: 'Complete the menu keyboard contract: roving focus, Home/End, Escape focus restoration and assistive-technology semantics.' },
  { id: 'global-failure-states', title: 'Add global 404 and offline states', priority: 'P1', effort: 'M', area: 'Quality', status: 'todo', note: 'Replace wildcard-to-home recovery with a branded 404 and add one app-level offline signal with retry guidance for network-dependent workflows.' },
  { id: 'font-gallery-readiness', title: 'Prepare Font Gallery for activation', priority: 'P2', effort: 'M', area: 'Performance', status: 'todo', note: 'Deferred until the route is activated: remove featured-card FOUT, reserve metrics, and complete keyboard/dialog accessibility before flipping the Soon state.' },
  { id: 'firebase-critical-path', title: 'Defer Firebase off the public critical path', priority: 'P1', effort: 'L', area: 'Performance', status: 'blocked', note: 'Performance/HVZ block: requires an approved auth-loading design and owner validation before changing Firebase initialization or authenticated routing.' },
  { id: 'openrouter-production-key', title: 'Add the production OpenRouter key', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner action: production Firebase credential and Gemini are healthy; OPENROUTER_API_KEY remains missing, so Gemini currently carries the AI path.' },
  { id: 'stripe-checkout-live-qa', title: 'Run live Stripe checkout return/retry QA', priority: 'P1', effort: 'M', area: 'Quality', status: 'blocked', note: 'Owner/HVZ validation on production checkout, abandon, return and retry flows; separate from retention coupon configuration.' },
  { id: 'stripe-retention-config', title: 'Configure Stripe retention and cancellation', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner action: create RETAIN50 and enable cancellation/retention in the Stripe Customer Portal; checkout code is already live.' },
  { id: 'discover-buildout', title: 'Build Discover galleries', priority: 'P1', effort: 'L', area: 'Product', status: 'todo', note: 'Queued at 20% after canonical-route truth; Gradient Gallery is live and the broader gallery scope remains intentionally deferred.' },
  { id: 'learn-content', title: 'Build the Learn content library', priority: 'P2', effort: 'L', area: 'Content', status: 'todo', note: 'Information architecture exists; articles and learning journeys remain. Homepage Soon Learn cards should be non-navigable preview states until scoped article destinations ship, then link to those destinations instead of looping generically to /learn.' },
  { id: 'community-backend', title: 'Choose and build the community publishing backend', priority: 'P1', effort: 'L', area: 'Product', status: 'blocked', note: 'Founder decision first: durable media/submission storage and server-enforced palette-handle uniqueness must ship as one coherent architecture.' },
]
