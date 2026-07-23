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
  { id: 'lint', label: 'Lint', value: '0 errors', status: 'good', detail: '≤34 warnings (baseline)' },
  { id: 'functions', label: 'Serverless fns', value: '11 / 12', status: 'watch', detail: '1 slot free — consolidate before adding' },
  { id: 'create', label: 'Create surface', value: 'Live', status: 'good', detail: 'Full tool suite shipped' },
  { id: 'discover', label: 'Discover surface', value: 'Building', status: 'watch', detail: 'Gradients live; more resources coming' },
  { id: 'learn', label: 'Learn surface', value: 'Coming soon', status: 'watch', detail: 'Content library not started' },
  { id: 'design-system', label: 'Design system', value: 'Consolidating', status: 'watch', detail: 'Unifying bespoke buttons onto .btn' },
  { id: 'phase', label: 'Current phase', value: 'Phase 16', status: 'good', detail: 'Audit implementation + QA' },
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
    id: 'audit-impl',
    name: 'Phase-16 audit implementation',
    area: 'Quality',
    stage: 'in-progress',
    progress: 72,
    summary: 'Turning the UX/UI/a11y/QA audit into shipped, tested improvements — slice by slice to main.',
    updated: '2026-07-23',
  },
  {
    id: 'design-system',
    name: 'Design-system consolidation',
    area: 'Design',
    stage: 'in-progress',
    progress: 25,
    summary: 'One button primitive, one spacing scale. Folding ~40 bespoke button classes onto .btn and normalising padding/radius to tokens.',
    updated: '2026-07-23',
  },
  {
    id: 'discover-buildout',
    name: 'Discover build-out',
    area: 'Product',
    stage: 'in-progress',
    progress: 20,
    summary: 'Community + curated-resource hub. Gradient library live; palettes, shadows and fonts still to come.',
    updated: '2026-07-23',
  },
  {
    id: 'a11y-pass',
    name: 'Accessibility (WCAG AA) pass',
    area: 'Quality',
    stage: 'review',
    progress: 80,
    summary: 'Contrast, target sizes, landmarks and keyboard paths. A few items need a running app to verify (mega-menu, small-screen floor).',
    updated: '2026-07-23',
  },
  {
    id: 'seo-pass',
    name: 'SEO / metadata pass',
    area: 'Growth',
    stage: 'shipped',
    progress: 100,
    summary: 'Per-route titles/descriptions and a pruned sitemap. Shipped in the B3 slice.',
    updated: '2026-07-23',
  },
  {
    id: 'learn-content',
    name: 'Learn content library',
    area: 'Product',
    stage: 'backlog',
    progress: 0,
    summary: 'The "understand the why" surface. Routes and metadata exist; the articles do not yet.',
    updated: '2026-07-23',
  },
  {
    id: 'community-backend',
    name: 'Community publishing backend',
    area: 'Product',
    stage: 'backlog',
    progress: 10,
    summary: 'Media at scale needs a real backend. Escalated — a design decision before build.',
    updated: '2026-07-23',
  },
  {
    id: 'billing-config',
    name: 'Stripe retention + coupon config',
    area: 'Infra',
    stage: 'backlog',
    progress: 0,
    summary: 'Owner-gated: create the retention coupon and enable cancellation in the Stripe Customer Portal. Code is ready; config is manual.',
    updated: '2026-07-23',
  },
]

// ── Next-to-do queue (prioritised) ──────────────────────────────────────────
// priority: 'P0' | 'P1' | 'P2' · effort: 'S' | 'M' | 'L' · status: 'todo' | 'doing' | 'review' | 'blocked'
export const NEXT_TODO = [
  { id: 'design-consistency', title: 'Consolidate bespoke buttons onto .btn', priority: 'P1', effort: 'L', area: 'Design', status: 'doing', note: 'Headline red flag: multiple button styles + inconsistent padding.' },
  { id: 'F1', title: 'Remove unpkg.com ffmpeg.wasm CDN dependency', priority: 'P1', effort: 'M', area: 'Infra', status: 'done', note: 'Self-hosted: ffmpeg core+wasm now bundled by Vite as fingerprinted same-origin assets — no third-party CDN.' },
  { id: 'C3', title: 'Mega-menu accessibility retest', priority: 'P1', effort: 'M', area: 'A11y', status: 'review', note: 'Needs a running app to verify keyboard + ARIA.' },
  { id: 'D2', title: '320–360px small-screen floor', priority: 'P1', effort: 'M', area: 'Responsive', status: 'review', note: 'Needs a running app to verify no overflow at the floor.' },
  { id: 'B4', title: 'De-emphasise "Soon" groups in Create mega-menu', priority: 'P2', effort: 'S', area: 'Nav', status: 'todo', note: 'Coming-soon groups compete with live tools.' },
  { id: 'E2', title: 'Migrate inline transition durations to --dur-* tokens', priority: 'P2', effort: 'M', area: 'Design', status: 'todo', note: 'Consistent motion timing across the app.' },
  { id: 'E3', title: 'Success motion on export / copy / save', priority: 'P2', effort: 'M', area: 'Design', status: 'todo', note: 'Reduced-motion-safe confirmation feedback.' },
  { id: 'D1', title: 'Normalise breakpoints to a named scale', priority: 'P2', effort: 'M', area: 'Responsive', status: 'todo', note: 'Ad-hoc breakpoints scattered through global.css.' },
  { id: 'D3', title: 'Confirm / add 4K max-width ceilings', priority: 'P2', effort: 'S', area: 'Responsive', status: 'todo', note: 'Wide-screen content should not stretch edge-to-edge.' },
  { id: 'F4', title: 'Stripe checkout / retention config', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner-gated — manual Stripe dashboard config.' },
  { id: 'F3', title: 'Community publishing backend', priority: 'P1', effort: 'L', area: 'Product', status: 'blocked', note: 'Escalated — needs a design decision first.' },
]
