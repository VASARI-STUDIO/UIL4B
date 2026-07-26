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
  { id: 'create', label: 'Create surface', value: 'Polishing', status: 'watch', detail: 'Core tools live; public workflow QA in progress' },
  { id: 'discover', label: 'Discover surface', value: 'Building', status: 'watch', detail: 'Galleries are intentionally a later workstream' },
  { id: 'learn', label: 'Learn surface', value: 'Coming soon', status: 'watch', detail: 'Content library not started' },
  { id: 'design-system', label: 'Design system', value: 'Public consistency pass', status: 'watch', detail: 'Shared shell, controls and CTA patterns under review' },
  { id: 'phase', label: 'Current phase', value: 'Public UI quality', status: 'watch', detail: 'Premium refresh, resilience and cross-device QA' },
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
    stage: 'review',
    progress: 88,
    summary: 'A connected home, editorial mega-menu, shared CTA and footer system across every public surface.',
    updated: '2026-07-25',
  },
  {
    id: 'colour-tools-polish',
    name: 'Colour tools workflow polish',
    area: 'Product',
    stage: 'in-progress',
    progress: 85,
    summary: 'Gradient, tint, semantic and palette workflows are being refined around clearer actions, safer reset paths and responsive workbenches.',
    updated: '2026-07-25',
  },
  {
    id: 'library-workflow',
    name: 'Icon + Emoji library workflow',
    area: 'Product',
    stage: 'review',
    progress: 92,
    summary: 'One resilient library header with distinct modes, keyboard navigation, mobile layout and visible network state.',
    updated: '2026-07-25',
  },
  {
    id: 'public-page-qa',
    name: 'Public-page release QA',
    area: 'Quality',
    stage: 'qa',
    progress: 70,
    summary: 'Build, lint, keyboard, narrow-screen, reduced-motion, loading and offline checks before release.',
    updated: '2026-07-25',
  },
  {
    id: 'discover-buildout',
    name: 'Discover build-out',
    area: 'Product',
    stage: 'in-progress',
    progress: 20,
    summary: 'Community and curated-resource galleries are the next product workstream after the public UI release.',
    updated: '2026-07-25',
  },
  {
    id: 'learn-content',
    name: 'Learn content library',
    area: 'Product',
    stage: 'backlog',
    progress: 0,
    summary: 'The "understand the why" surface. Routes and metadata exist; the articles do not yet.',
    updated: '2026-07-25',
  },
  {
    id: 'community-backend',
    name: 'Community publishing backend',
    area: 'Product',
    stage: 'backlog',
    progress: 10,
    summary: 'Media at scale needs a real backend. Escalated — a design decision before build.',
    updated: '2026-07-25',
  },
  {
    id: 'billing-config',
    name: 'Stripe retention + coupon config',
    area: 'Infra',
    stage: 'backlog',
    progress: 0,
    summary: 'Owner-gated: create the retention coupon and enable cancellation in the Stripe Customer Portal. Code is ready; config is manual.',
    updated: '2026-07-25',
  },
]

// ── Next-to-do queue (prioritised) ──────────────────────────────────────────
// priority: 'P0' | 'P1' | 'P2' · effort: 'S' | 'M' | 'L' · status: 'todo' | 'doing' | 'review' | 'blocked'
export const NEXT_TODO = [
  { id: 'public-release-qa', title: 'Complete public-page release QA', priority: 'P0', effort: 'M', area: 'Quality', status: 'doing', note: 'Verify every public route at desktop and mobile widths, including keyboard, reduced-motion, loading, offline and slow-network states.' },
  { id: 'fout-font-gallery', title: 'Remove Font Gallery first-load font flash', priority: 'P1', effort: 'M', area: 'Performance', status: 'todo', note: 'Known deferred issue; solve when Font Gallery is next in scope.' },
  { id: 'discover-buildout', title: 'Build Discover galleries', priority: 'P1', effort: 'L', area: 'Product', status: 'todo', note: 'Founder intentionally deferred Discover work until after this public UI release.' },
  { id: 'learn-content', title: 'Build the Learn content library', priority: 'P2', effort: 'L', area: 'Content', status: 'todo', note: 'Information architecture exists; articles and learning journeys remain.' },
  { id: 'F4', title: 'Stripe checkout / retention config', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner-gated — manual Stripe dashboard config.' },
  { id: 'F3', title: 'Community publishing backend', priority: 'P1', effort: 'L', area: 'Product', status: 'blocked', note: 'Escalated — needs a design decision first.' },
]
