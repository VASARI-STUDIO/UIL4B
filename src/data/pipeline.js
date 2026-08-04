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
  { id: 'create', label: 'Create surface', value: 'Live', status: 'good', detail: 'Colour, typography, library and imagery workflows are shipped; UI Component Builder and AI Studio remain in the workshop' },
  { id: 'discover', label: 'Discover surface', value: 'Queued · 20%', status: 'watch', detail: 'Gradient Gallery is live; broader galleries remain backlog' },
  { id: 'learn', label: 'Learn surface', value: 'Coming soon', status: 'watch', detail: 'Content library not started' },
  { id: 'design-system', label: 'Design system', value: 'v2.7 shipped', status: 'good', detail: 'Shared shell, controls, CTA and footer patterns are live' },
  { id: 'ci', label: 'CI gates', value: 'Green on every PR', status: 'good', detail: 'Lint, build, unit, Firestore rules and the Playwright acceptance suite run on every pull request since #188' },
  { id: 'phase', label: 'Current phase', value: 'V1 readiness — polish, then review', status: 'watch', detail: 'Founder-reported colour-tool defects closed (#190–#193) and the dead-code sweep shipped (#196). The readiness review is written up in docs/V1-READINESS.md and returns NO-GO: firestore.rules is hardened but still UNPUBLISHED, so paid entitlements are not server-enforced. The layout/motion/typography passes and the QA pass remain' },
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
    id: 'colour-tool-defects',
    name: 'Founder-reported colour-tool defects',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #190–#193. The adjust sliders no longer compound, warming crosses the hue antipode correctly, the gradient inspector caps to the canvas height, the Saturation slider responds across its whole range, and right-clicking the between-colours plus inserts several colours at once within the plan caps.',
    updated: '2026-07-29',
  },
  {
    id: 'ci-quality-gates',
    name: 'Quality gates in CI',
    area: 'Quality',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #188. Every pull request now runs lint, build, the unit suite, the Firestore rules tests that pin the entitlement lock, and the Playwright user-simulation suite. #189 removed the flaky offline-banner test that reddened the first run.',
    updated: '2026-07-29',
  },
  {
    id: 'typography-tools',
    name: 'Typography tools activation',
    area: 'Product',
    stage: 'review',
    progress: 90,
    summary: 'Type Scale (/typescale), Font Pair (/fontpairs) and Font Gallery (/fontgallery) are rebuilt on the current design system, routed through CreateTool and flipped out of the Soon state in the tool tree, the visual sitemap and the crawler sitemap. Three standalone tools on one Google Fonts catalogue, wired to each other through a versioned in-memory hand-off (utils/typeHandoff.js) so no tool ever opens empty. The catalogue degrades to the bundled list with a visible notice and a working retry, and reconnecting reloads it automatically. The font-gallery-readiness items are closed: featured cards render a skeleton until the face is verified (no FOUT), every preview box has reserved height so cards cannot shift as faces stream in, cards are real buttons, and both overlays are focus-trapped dialogs with Escape and focus restoration.',
    updated: '2026-07-30',
  },
  {
    id: 'design-system-scales',
    name: 'Page-gutter and layering scales',
    area: 'Design system',
    stage: 'in-progress',
    progress: 60,
    summary: 'One page-gutter scale and one z-index ladder replace ad-hoc padding and stacking values, fixing the toolbar shifting on hover. Remaining: sweep the last ad-hoc z-index values, fix the Community gallery popover stacking and the 961–999px Palette Builder toolbar break, then document the ladder.',
    updated: '2026-07-29',
  },
  {
    id: 'v1-readiness-review',
    name: 'V1 readiness review',
    area: 'Release',
    stage: 'in-progress',
    progress: 80,
    summary: 'Security, code, SEO and analytics passes are complete and written up in docs/V1-READINESS.md; the QA responsive/theme/keyboard/contrast pass is the last one outstanding. Verdict so far is NO-GO — one hard blocker (firestore.rules hardened but UNPUBLISHED, so paid entitlements are not server-enforced) and three soft ones (analytics environment guard, per-route canonical/OG tags, upgrade-gate instrumentation).',
    updated: '2026-07-29',
  },
  {
    id: 'dead-code-sweep',
    name: 'Dead-code sweep',
    area: 'Codebase health',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #196. Removed 6 unrouted pages, 7 unreferenced components and their orphaned CSS — 3,284 deletions, zero insertions. Every file was confirmed unreferenced across src/ and tests/ first; the lazily-imported tool pages a naive grep misses were explicitly checked and kept. ESLint warnings fell 34 → 32.',
    updated: '2026-07-29',
  },
  {
    id: 'homepage-chaos-to-calm',
    name: 'Homepage chaos → calm proof',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #185. Eight stable satellite links resolve into four honest workbench tabs; motion is decoration only and the static composition is the finished page. All 17 acceptance tests executed; homepage initial JS fell 0.49 KB gzip and the 19.1 MB unused 4K references became 173 KB thumbnails.',
    updated: '2026-07-28',
  },
  {
    id: 'account-switch-reliability',
    name: 'Account-switch reliability',
    area: 'Account',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #183. Root cause was signing out before authenticating the target account; the session now survives until the new credential commits. Real Google OAuth popup behaviour still needs one manual founder pass.',
    updated: '2026-07-28',
  },
  {
    id: 'plans-lifetime-build',
    name: 'Plans redesign + lifetime billing',
    area: 'Billing',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #184 with security review PASS. Premium Plus removed, One-off tab added and degrading honestly until a Stripe price exists. Closed a live privilege escalation (client-writable entitlement fields), refunded-entitlement re-grants and missing chargeback revocation. Owner must PUBLISH firestore.rules and configure the lifetime webhook events before creating the price.',
    updated: '2026-07-28',
  },
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
    name: 'Public route truth release',
    area: 'Quality',
    stage: 'shipped',
    progress: 100,
    summary: 'Router, public navigation, metadata and sitemap truth shipped to main in d210a0d and passed the 79/79 release suite.',
    updated: '2026-07-28',
  },
  {
    id: 'static-og-card',
    name: 'Static social-share card',
    area: 'Growth',
    stage: 'shipped',
    progress: 100,
    summary: 'The static public social-share card shipped to main in d210a0d and passed the 79/79 release suite.',
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
  { id: 'account-delete-cascade', title: 'Delete accounts through a server-side cascade', priority: 'P1', effort: 'M', area: 'Account', status: 'todo', note: 'deleteAccount now removes the auth user before the Firestore doc, so a failed second step can orphan a users/{uid} record holding email and display name. An Admin-SDK route should delete auth user, profile and sync data atomically.' },
  { id: 'homepage-field-metrics', title: 'Measure homepage field metrics on a throttled profile', priority: 'P2', effort: 'S', area: 'Performance', status: 'todo', note: 'HOMEPAGE-CHAOS-TO-CALM §11 targets LCP ≤ 2.5s, CLS ≤ 0.05 and INP ≤ 200ms on Slow-4G with 4x CPU. Structural preconditions shipped in #185 but the numbers were never traced. Also covers 200% zoom, forced-colours and screen-reader passes from §10.' },
  { id: 'account-menu-arrow-nav', title: 'Add arrow-key navigation to the account menu', priority: 'P1', effort: 'S', area: 'Accessibility', status: 'todo', note: 'Complete the menu keyboard contract: roving focus, Home/End, Escape focus restoration and assistive-technology semantics.' },
  { id: 'global-failure-states', title: 'Add global 404 and offline states', priority: 'P1', effort: 'M', area: 'Quality', status: 'todo', note: 'Replace wildcard-to-home recovery with a branded 404 and add one app-level offline signal with retry guidance for network-dependent workflows.' },
  { id: 'firebase-critical-path', title: 'Defer Firebase off the public critical path', priority: 'P1', effort: 'L', area: 'Performance', status: 'blocked', note: 'Performance/HVZ block: requires an approved auth-loading design and owner validation before changing Firebase initialization or authenticated routing.' },
  { id: 'openrouter-production-key', title: 'Add the production OpenRouter key', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner action: production Firebase credential and Gemini are healthy; OPENROUTER_API_KEY remains missing, so Gemini currently carries the AI path.' },
  { id: 'stripe-checkout-live-qa', title: 'Run live Stripe checkout return/retry QA', priority: 'P1', effort: 'M', area: 'Quality', status: 'blocked', note: 'Owner/HVZ validation on production checkout, abandon, return and retry flows; separate from retention coupon configuration.' },
  { id: 'stripe-retention-config', title: 'Configure Stripe retention and cancellation', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner action: create RETAIN50 and enable cancellation/retention in the Stripe Customer Portal; checkout code is already live.' },
  { id: 'discover-buildout', title: 'Build Discover galleries', priority: 'P1', effort: 'L', area: 'Product', status: 'todo', note: 'Queued at 20% after canonical-route truth; Gradient Gallery is live and the broader gallery scope remains intentionally deferred.' },
  { id: 'learn-content', title: 'Build the Learn content library', priority: 'P2', effort: 'L', area: 'Content', status: 'todo', note: 'Information architecture exists; articles and learning journeys remain. Homepage Soon Learn cards should be non-navigable preview states until scoped article destinations ship, then link to those destinations instead of looping generically to /learn.' },
  { id: 'community-backend', title: 'Choose and build the community publishing backend', priority: 'P1', effort: 'L', area: 'Product', status: 'blocked', note: 'Founder decision first: durable media/submission storage and server-enforced palette-handle uniqueness must ship as one coherent architecture.' },
]
