// App pipeline — the owner's ops view of UIL4B.
//
// Surfaced in the Admin "Pipeline" tab. Where the Board tab tracks each
// feature MODULE, this tracks the app as a whole: its current condition, the
// PROCESSES (workstreams) moving through the pipeline, and the prioritised
// next-to-do queue. Edit this file to keep the pipeline current — it is the
// single source the tab renders from (no backend, no serverless function).
//
// Keep it honest: only list conditions you can verify and tasks that are real.
//
// This file owns EXECUTION: order, progress, blockers and known-unfixed bugs.
// It does not own gate baselines (docs/reference/build-and-verify.md), founder
// verdicts on proposals (docs/PROPOSALS.md), the record of decisions already made
// (CHANGELOG.md), owner console work (docs/OWNER-ACTIONS.md) or release history
// (CHANGELOG.md). Link, don't restate — copied numbers drift.

// ── Current app condition ──────────────────────────────────────────────────
// status: 'good' | 'watch' | 'blocked'
export const APP_CONDITION = [
  { id: 'build', label: 'Build', value: 'Passing', status: 'good', detail: 'vite build clean' },
  { id: 'lint', label: 'Lint', value: '0 errors', status: 'good', detail: 'Advisory warnings tracked separately' },
  { id: 'functions', label: 'Serverless fns', value: '12 / 12', status: 'blocked', detail: 'FULL. delete-account.js took the last slot; the next endpoint must replace one or fold into api/_lib/. tests/unit/account-deletion.test.js fails the build if the count goes over' },
  { id: 'create', label: 'Create surface', value: 'Live', status: 'good', detail: 'Colour, typography, library and imagery workflows are shipped; UI Component Builder and AI Studio remain in the workshop' },
  { id: 'discover', label: 'Discover surface', value: 'Queued · 20%', status: 'watch', detail: 'Gradient Gallery is live; broader galleries remain backlog' },
  { id: 'learn', label: 'Learn surface', value: 'Coming soon', status: 'watch', detail: 'Content library not started' },
  { id: 'design-system', label: 'Design system', value: 'v2.8 shipped', status: 'good', detail: 'Typography, Palette/Tint consistency, authored previews and UI System Mode all released in #200' },
  { id: 'ci', label: 'CI gates', value: 'Green on every PR', status: 'good', detail: 'Lint, build, unit, Firestore rules and the Playwright acceptance suite run on every pull request since #188. Baselines: docs/reference/build-and-verify.md' },
  { id: 'phase', label: 'Current phase', value: 'Post-v2.8 hardening', status: 'watch', detail: 'Everything through #249 is on main. The Firestore rules publication blocker is founder-confirmed closed. All four proposals (P-001…P-004) now carry founder verdicts and have shipped, so no approved feature batch is in flight; the queue below is hardening, accessibility, instrumentation and the large unbuilt surfaces. Three entries that had already shipped were corrected to done/partial on 2026-08-15 — check status before starting anything here' },
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
    id: 'typography-activation',
    name: 'Typography activation + homepage integration',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #200 (v2.8). Font Gallery, Font Pair Finder and Type Scale are live Create tools on a shared Google Fonts catalogue, and Typography is the fifth homepage workbench tab. Detail in CHANGELOG.md.',
    updated: '2026-08-05',
  },
  {
    id: 'palette-consistency',
    name: 'Palette/Tint consistency + defect pass',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #200 (v2.8). Gutters, toolbar layout shifts, seed/swatch mismatch, control sizing, Temperature and HCT behaviour, directional swap, per-swatch contrast, multi-insert menus and Palette ↔ Tint continuity. Detail in CHANGELOG.md.',
    updated: '2026-08-05',
  },
  {
    id: 'ui-system-mode',
    name: 'Premium UI System Mode',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #200 (v2.8). Perceptual 100–900 Brand, Success, Warning, Error, Information and Neutral scales from one 500 seed, with WCAG evidence and CSS/DTCG/Tailwind exports. Free users preview; editing, expanded scenes and export are Pro-gated.',
    updated: '2026-08-05',
  },
  {
    id: 'colour-hifi-previews',
    name: 'High-fidelity colour previews',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #200 (v2.8). The Palette preview applies the active colours to authored UI, brand and graphic scenes; additional scenes are visibly Pro-gated.',
    updated: '2026-08-05',
  },
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
    summary: 'Shipped in #188. Every pull request now runs lint, build, the unit suite, the Firestore rules tests that pin the entitlement lock, and the Playwright user-simulation suite. #189 removed the flaky offline-banner test that reddened the first run. Baselines: docs/reference/build-and-verify.md.',
    updated: '2026-07-29',
  },
  {
    id: 'design-system-scales',
    name: 'Page-gutter and layering scales',
    area: 'Design system',
    stage: 'in-progress',
    progress: 90,
    summary: 'The shared gutter and layering scales hold the Palette toolbar across the 961–999px transition. The toolbar hover labels moved into the buttons\' own flow in the founder batch-2 branch, so the label-clipping item that sat in this queue is closed — below 961px the labels are simply pinned open. Still open: the broader Community popover/z-index sweep.',
    updated: '2026-08-07',
  },
  {
    id: 'release-readiness-review',
    name: 'Release readiness review',
    area: 'Release',
    stage: 'shipped',
    progress: 100,
    summary: 'v2.8 shipped in #200 and the founder bug batch in #202. The Firestore-rules publication blocker is founder-confirmed closed and per-route metadata shipped in #198. Analytics environment guards, upgrade/activation instrumentation and the live external checks are tracked as their own queue items, not as an open review.',
    updated: '2026-08-05',
  },
  {
    id: 'dead-code-sweep',
    name: 'Dead-code sweep',
    area: 'Codebase health',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #196. Removed 6 unrouted pages, 7 unreferenced components and their orphaned CSS — 3,284 deletions, zero insertions. Every file was confirmed unreferenced across src/ and tests/ first; the lazily-imported tool pages a naive grep misses were explicitly checked and kept. ESLint warnings fell 34 → 32 at that commit; the current baseline lives in docs/reference/build-and-verify.md.',
    updated: '2026-07-29',
  },
  {
    id: 'homepage-chaos-to-calm',
    name: 'Homepage chaos → calm proof',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'The base experience shipped in #185; the Typography extension shipped in #200. Eleven stable tool links resolve into five honest workbench modes with icon-led satellites and a reduced-motion-safe merge/splash. The field-metric and assistive-technology passes are still unrun — their budgets now live on the homepage-field-metrics item in the queue.',
    updated: '2026-08-05',
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
    summary: 'Shipped in #184 with security review PASS. Premium Plus was removed, One-off was added and degrades honestly until a Stripe price exists. The Firestore rules are founder-confirmed published, so client-side entitlement escalation is closed; the owner must still verify webhook event subscriptions before creating the lifetime price. Subscription-chargeback revocation is founder-approved and now queued as its own P1 security item below.',
    updated: '2026-08-05',
  },
  {
    id: 'founder-bug-batch',
    name: 'Founder bug batch — palette + gradient',
    area: 'Product',
    stage: 'shipped',
    progress: 100,
    summary: 'Shipped in #202. Adjust slider handles became a lens onto their own track, icon-button hover labels lay out at their real width, a gradient stop is created and placed in one press-and-drag gesture, Randomise respects the selected colour system, and a gradient can be submitted for review as an explicitly unpublished local queue entry.',
    updated: '2026-08-05',
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
    summary: 'Router/navigation/sitemap truth shipped in d210a0d; per-route canonical, Open Graph/Twitter metadata and noindex for Soon routes followed in #198.',
    updated: '2026-07-31',
  },
  {
    id: 'static-og-card',
    name: 'Static social-share card',
    area: 'Growth',
    stage: 'shipped',
    progress: 100,
    summary: 'The static public social-share card shipped to main in d210a0d. Per-route share images were explicitly out of scope for #198.',
    updated: '2026-08-05',
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
    progress: 15,
    summary: 'Founder chose Firebase. Build Firestore + Storage publishing, a transactional lowercased handle registry and moderation state; Storage activation/rules remain owner-verified work.',
    updated: '2026-07-31',
  },
  {
    id: 'public-route-prerender',
    name: 'Public-route prerendering',
    area: 'Growth',
    stage: 'backlog',
    progress: 5,
    summary: 'Founder approved prerendering. Define an explicit eligible public-route matrix and emit crawlable content without prerendering Soon, auth or admin routes.',
    updated: '2026-07-31',
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
  { id: 'analytics-env-guard', title: 'Keep dev/preview traffic out of production aggregates', priority: 'P1', effort: 'S', area: 'Analytics', status: 'done', note: 'DONE (P-001, founder-approved). utils/environment.js allowlists the production hosts and flushAggregate refuses to write from anywhere else — guarded at the single choke point every shared counter passes through, so a counter added later cannot forget to opt in. Fail-safe: an unrecognised host is never treated as production, and blocked increments are DROPPED rather than queued (queuing would write them the moment someone opened the real site). Historic aggregates are still contaminated by CI and preview traffic and were not back-corrected.' },
  { id: 'upgrade-activation-events', title: 'Instrument the canonical upgrade gate and activation actions', priority: 'P1', effort: 'M', area: 'Analytics', status: 'partial', note: 'PARTIAL (P-001, founder-approved). trackUpgradeGate fires once inside ProModalContext with a gate id, so all 16 openProModal call sites are covered and a gate added later is measured by existing. trackActivation is wired to the two clearest wins — saving a project and completing a style-guide export — and is deliberately separate from trackToolAction so ordinary usage cannot inflate it. STILL TO DO: per-tool activation for palette, gradient and type scale specifically, and naming a `gate` on each of the 16 call sites (they currently fall back to the modal title, which groups but does not identify).' },
  { id: 'onboarding-completion-truth', title: 'Reconcile onboarding completion and resume truth', priority: 'P1', effort: 'M', area: 'Account', status: 'blocked', note: 'HVZ design required: the one-shot pendingOnboarding flag routes fresh signup, but abandoning then returning directly to /home or a deep link is not re-routed. Root routing checks vs-onboarded in localStorage while profile hydration separately checks Firestore. Avoid bouncing legacy users with no completedAt; then run live Firebase fresh/returning/resume/finish/skip QA.' },
  { id: 'stripe-webhook-ordering', title: 'Add Stripe webhook event dedupe and ordering guards', priority: 'P1', effort: 'M', area: 'Billing', status: 'blocked', note: 'HVZ/security slice: signatures are verified, but processed event.id values and event ordering are not stored. Make retries idempotent and prevent an older subscription update from overwriting newer deletion/revocation state.' },
  { id: 'plans-injectable-clock', title: 'Give planForUser an injectable now — it reads the ambient clock and is untestable by construction', priority: 'P2', effort: 'S', area: 'Billing', status: 'blocked', note: 'KNOWN DEFECT, found 2026-08-16 when tests/unit/billing-state.test.js went from 484/484 to 483/484 mid-session with NOTHING in the diff. planForUser({ subscription, lifetimeEntitlement, email }) in api/_lib/plans.js takes no clock and calls Date.now() internally, so any fixture with a fixed timestamp silently rots: the test pinned NOW = 2026-08-12 and the 7-day past-due grace window expired in real time, flipping "keeps Pro" to "loses it" on a date nobody chose. Note the failure mode — it is a time bomb, not a flake. It cannot be reproduced by re-running, it will not bisect to any commit, and it presents as a billing regression in whatever unrelated branch happens to be open when it detonates. Its siblings billingAlert() and isWithinPastDueGrace() both already accept an injected now and were never affected, which is the shape of the fix. PROPOSED FIX: add an options bag with an injectable now defaulting to Date.now() — planForUser({ ... }, { now = Date.now() } = {}) — matching the sibling signatures. Additive and fully backwards-compatible: every existing call site keeps working untouched. BLOCKED because api/_lib/plans.js is a founder-gated Human Validation Zone file (billing), so it needs the HVZ + security gate rather than a drive-by edit. MITIGATED meanwhile, not worked around: the test now anchors NOW to the real clock so its fixtures are relative and honest, with every assertion intact and mutation-verified. That makes the suite stable but leaves the production function still unable to be tested at a chosen point in time — which is what this entry is for.' },
  { id: 'subscription-chargeback-revocation', title: 'Revoke access when a subscription charge is refunded or charged back', priority: 'P1', effort: 'M', area: 'Security', status: 'todo', note: 'Founder APPROVED the fix on 2026-08-07 (in conversation with the Director), so this is engineering work and no longer an open product decision. The refund/dispute revocation path in api/stripe-webhook.js is keyed to the one-off lifetimeEntitlement.paymentIntentId; a reversed SUBSCRIPTION charge does not use that lifetime record, so it can leave the yearly entitlement active. Give subscription payments a reliable user link and revoke or cancel access when a subscription payment is refunded or disputed. Human Validation Zone slice plus security review before merge.' },
  { id: 'support-abuse-hardening', title: 'Rate-limit and abuse-protect /api/support', priority: 'P1', effort: 'M', area: 'Security', status: 'todo', note: 'The public endpoint has no auth, rate limit or bot challenge; one unauthenticated request can attempt a Firestore write, optional Sheets append and optional Resend email. Preserve legitimate logged-out support while adding server-enforced abuse controls and security review.' },
  { id: 'account-delete-cascade', title: 'Delete accounts through a server-side cascade', priority: 'P1', effort: 'M', area: 'Account', status: 'done', note: 'DONE, shipped in #231 — this entry sat as todo after the work landed, which is exactly how a task gets done twice. The fault it describes was ORDER: deleting the auth user first meant a failed second step orphaned a users/{uid} doc still holding email and display name. api/delete-account.js reverses that — billing, then db.recursiveDelete(userRef) (which takes the sync subcollection with it), then adminAuth().deleteUser(uid) LAST, so a failure at any stage leaves a recoverable account rather than orphaned personal data. It took the twelfth and final Vercel function slot.' },
  { id: 'homepage-field-metrics', title: 'Measure homepage field metrics on a throttled profile', priority: 'P2', effort: 'S', area: 'Performance', status: 'partial', note: 'Structural preconditions shipped in #185/#200. PARTIALLY TRACED in #248, on a 4x-CPU-throttled Chromium at 1440x900 against a local preview build, ten cold loads — note there was NO network throttling, so every Slow-4G figure below is still unrun. MET: CLS mean 0.0000, worst 0.0000 (budget 0.05); no remote font call (Outfit is self-hosted from /fonts, replacing two sequential third-party round trips to googleapis then gstatic); GSAP still dynamically loaded, and nothing above the fold waits on it any more since the hero entrance became CSS. Total Layout fell 407ms to ~200ms cold, and the second full-document relayout was eliminated; a warm-cache run does the same page in 27ms, which is the ceiling to aim at. STILL UNRUN: LCP, interaction response, and everything on a Slow-4G profile; the 12 KB gzip workbench JS budget; the 180 KB thumbnail total; the remote image/icon-catalogue and FFmpeg checks. BUDGETS (migrated here from the retired homepage acceptance contract, which is now git history — these are the only part of it still unmet): on a mobile Slow-4G / 4x CPU profile, LCP ≤ 2.5s, CLS ≤ 0.05, interaction response ≤ 200ms, and nothing may shift after fonts, motion or thumbnails resolve. Homepage initial executable JS may carry at most 12 KB gzip of the workbench; heavier panel logic stays lazy and user-triggered. The three bundled reference thumbnails stay ≤ 180 KB encoded in total. The homepage must make no remote image/icon/font-catalogue call, must not load the converter FFmpeg JS/WASM, and must keep GSAP dynamically loaded so it never blocks headline, satellite or workbench render. STILL-UNRUN ASSISTIVE PASSES: keyboard-only, screen-reader names, 200% zoom, reduced motion and forced-colours/high-contrast. The behavioural half of the old contract is already encoded as tests in tests/user-sim/10-home-chaos-to-calm.spec.js.' },
  { id: 'account-menu-arrow-nav', title: 'Add arrow-key navigation to the account menu', priority: 'P1', effort: 'S', area: 'Accessibility', status: 'todo', note: 'Complete the menu keyboard contract: roving focus, Home/End, Escape focus restoration and assistive-technology semantics.' },
  { id: 'global-failure-states', title: 'Add global 404 and offline states', priority: 'P1', effort: 'M', area: 'Quality', status: 'partial', note: 'HALF DONE — read this before picking it up, because the 404 half is finished. Shipped in #235: src/pages/NotFound.jsx behind the wildcard route, replacing the old redirect-to-home (which made every dead URL a soft 404 that told search engines the page existed). STILL OPEN: the app-level offline signal. Offline is currently handled only per-component — the Discover cards and FontCatalogState each own a state — so there is no single signal telling a user their connection is the problem, and no retry guidance for the network-dependent workflows (AI tools, font catalogue, community). Related and already fixed, do not re-diagnose: the vite:preloadError reload loop that fired when offline was fixed in #235 (src/main.jsx checks navigator.onLine before reloading).' },
  { id: 'firebase-critical-path', title: 'Defer Firebase off the public critical path', priority: 'P1', effort: 'L', area: 'Performance', status: 'blocked', note: 'Performance/HVZ block: requires an approved auth-loading design and owner validation before changing Firebase initialization or authenticated routing.' },
  { id: 'openrouter-path-verification', title: 'Verify a production request really routes through OpenRouter', priority: 'P1', effort: 'S', area: 'Infra', status: 'todo', note: 'The production OpenRouter key is set and redeployed (founder statement in conversation with the Director, 2026-08-07), which closes the owner action that was blocking it. The key being present is NOT the route being exercised: no production request through the OpenRouter path has been verified. A wrong, revoked or rate-limited key fails over to Gemini silently, so the app looks healthy while the primary provider is dead. Confirm via the AI diagnostic (access details in docs/OWNER-ACTIONS.md) that OpenRouter reports available, then confirm a real generation is served by OpenRouter rather than the fallback.' },
  { id: 'stripe-checkout-live-qa', title: 'Run live Stripe checkout return/retry QA', priority: 'P1', effort: 'M', area: 'Quality', status: 'blocked', note: 'Owner/HVZ validation on production checkout, abandon, return and retry flows; separate from retention coupon configuration.' },
  { id: 'stripe-retention-config', title: 'Configure Stripe retention and cancellation', priority: 'P1', effort: 'S', area: 'Infra', status: 'blocked', note: 'Owner action: create RETAIN50 and enable cancellation/retention in the Stripe Customer Portal; checkout code is already live.' },
  { id: 'discover-buildout', title: 'Build Discover galleries', priority: 'P1', effort: 'L', area: 'Product', status: 'todo', note: 'Queued at 20% after canonical-route truth; Gradient Gallery is live and the broader gallery scope remains intentionally deferred.' },
  { id: 'learn-content', title: 'Build the Learn content library', priority: 'P2', effort: 'L', area: 'Content', status: 'todo', note: 'Information architecture exists; articles and learning journeys remain. Homepage Soon Learn cards should be non-navigable preview states until scoped article destinations ship, then link to those destinations instead of looping generically to /learn.' },
  { id: 'community-backend', title: 'Build the Firebase community publishing backend', priority: 'P1', effort: 'L', area: 'Product', status: 'todo', note: 'Architecture is decided: Firestore + Storage, transactional lowercased handle registry and moderation state. Do not consume a new serverless slot without reconciling the 12-function ceiling.' },
  { id: 'public-route-prerender', title: 'Prerender eligible public routes', priority: 'P1', effort: 'L', area: 'Growth', status: 'todo', note: 'Founder approved prerendering. Define the route matrix first; exclude Soon, authenticated and admin routes and retain canonical/noindex truth.' },
  { id: 'ai-diagnostic-env', title: 'Protect or disable the AI diagnostic endpoint in production', priority: 'P2', effort: 'S', area: 'Security', status: 'todo', note: 'Information-disclosure risk: replace the committed access check with verified administrator authentication, or a server-only DIAG_CODE with the endpoint disabled in production. Do not expose credential values. This touches /api and requires the normal security gate.' },
  { id: 'csv-formula-injection', title: 'Neutralise CSV formula injection in every export', priority: 'P1', effort: 'S', area: 'Security', status: 'done', note: 'DONE. Found during #250 and never recorded until 2026-08-15. Correct RFC 4180 quoting is NOT a defence — a spreadsheet decides a cell is a formula from its first character, quoted or not, so a cell beginning = + - @ (or tab / CR) executes on open. THREE exports had it, not the one that was reported: AltTextGenerator downloadCSV (alt text is model output from a user-supplied image), Admin exportUsersCSV (displayName, company, location are user-controlled), and Admin exportCSV for feedback — which is the sharp one, because /api/support accepts subject, message and email UNAUTHENTICATED and the file is opened by an admin, so the attacker picks the payload and a privileged user runs it. All three now go through src/utils/csv.js (csvCell / toCsv), which prefixes a lone apostrophe. Plain numbers are deliberately exempt so a legitimate -5 is not corrupted. tests/unit/csv-injection.test.js also fails the build if any export hand-rolls quote escaping again, which is how all three got it wrong the first time.' },

  // ── Founder batch, 2026-08-08 ────────────────────────────────────────────
  // Reported by the founder in conversation with the Director. Three of the
  // original items are gone from this block — the Temperature snap, the Font
  // Pair panel overflow and the auth popup closing to /home were reproduced,
  // fixed and covered by tests on fix/nav-login-slider-panel (see CHANGELOG).
  // Every item that REMAINS is OBSERVED ONLY: it is the founder's description
  // of what he saw, and none of it has been reproduced by an engineer, isolated
  // to a cause, or pinned by a failing test yet. Reproduce first, then fix — do not
  // treat the description as a diagnosis. Recorded 2026-08-08.
  { id: 'image-palette-marker-popup', title: 'Enlarge and centre the image→palette popup so markers are visible', priority: 'P1', effort: 'S', area: 'Colour', status: 'todo', note: 'Observed (founder report, not reproduced): the image-to-palette popup is too small and is not centred, so the user cannot see where the sample markers are being placed on the image.' },
  { id: 'emoji-library-search-perf', title: 'Make Emoji Library search work and the surface responsive', priority: 'P1', effort: 'M', area: 'Imagery', status: 'todo', note: 'Observed (founder report, not reproduced): search returns nothing usable and the whole surface is laggy and slow to render/load. Two separate symptoms — confirm whether the search failure is a filtering bug or a consequence of the render cost before fixing either.' },
  { id: 'colour-picker-ui', title: 'Replace the colour picker with a richer picker', priority: 'P1', effort: 'M', area: 'Colour', status: 'todo', note: 'Founder request (2026-08-08): Solid / Gradient / Image tabs, an SV field, hue and alpha sliders, a format dropdown and saved swatches. Shared component — scope which surfaces adopt it before building.' },
  { id: 'colour-role-names-by-system', title: 'Name colour roles to suit the active colour system', priority: 'P1', effort: 'M', area: 'Colour', status: 'done', note: 'DONE, shipped in #244 — reproduced exactly as the founder reported it ("all systems say the same from left to right primary, secondary, accent, subtle, deep"). src/utils/paletteRoles.js carries HARMONY_ROLE_LABELS, one label set per harmony, mirroring each generateHarmony branch: Monochromatic now reads BASE/LIGHT/LIGHTER/DARK/DARKER instead of calling a subtle tone "Accent". Only the DISPLAY caption changed — ROLES[i] stays the stable export token identity, so saved palettes and exported tokens are unaffected.' },
  { id: 'semantic-pack-extra-colour', title: 'Add a semantic colour to the premade packs and show real usage', priority: 'P1', effort: 'M', area: 'Colour', status: 'todo', note: 'Founder request (2026-08-08): one more semantic colour so the premade packs list evenly, and swatch demos replaced with real usage examples — icons, buttons, switches, alerts.' },
  { id: 'contrast-checker-overhaul', title: 'Overhaul the contrast checker UI and its live preview', priority: 'P1', effort: 'L', area: 'Colour', status: 'todo', note: 'Founder request (2026-08-08): the live preview needs a far better example, and the tool needs a UI/UX overhaul rather than a patch. Needs a design specification before implementation.' },
  { id: 'font-gallery-ui', title: 'Improve the Font Gallery UI', priority: 'P1', effort: 'M', area: 'Typography', status: 'todo', note: 'Founder request (2026-08-08), restated with direction 2026-08-15: "the gallery needs improving", and the whole typography set should "take influence from the UI in the gradient and pallete libraries". PARTIALLY ADDRESSED in #243, which fixed the hard corners the founder pointed at in a screenshot (undefined radius tokens meant the declarations were dropped entirely) — the layout and browsing model were NOT touched and are what remains. Do the rendered diagnosis before proposing a direction; see library-ui-language for the shared visual target.' },
  { id: 'fontpair-browsable-selection', title: 'Make Font Pair selection browsable instead of recall-and-type', priority: 'P1', effort: 'M', area: 'Typography', status: 'todo', note: 'Observed (founder report, not reproduced): choosing a pair expects the user to remember and type font names. Selection should be visual and browsable. Founder direction 2026-08-15 ties this to library-ui-language — the gradient and palette libraries already solve exactly this browsing problem and are the reference.' },
  { id: 'founder-intro-popup', title: 'Add a "welcome / about the founder" popup', priority: 'P1', effort: 'M', area: 'Growth', status: 'todo', note: 'Founder request 2026-08-15, verbatim: "a popup ... that says, hey welcome to UI L4B, give them a quick about me (Dylan) the founder ... the point of this exercise is to help the app feel more down to earth to people who think oh another app from another company". Content brief, also verbatim: "include a little why i bult this app and finish it with something like im a solo developer and building this with a user first approach so here is how to access the feedback tools please do not hesitate to provide feedback feature requests and submit your creations to the community". VOICE IS THE HARD PART AND IS FOUNDER-OWNED: "make sure to use real australian style english to sound like me not an AI written statement." Do NOT invent biography — the repo records no personal history, and a fabricated origin story is the exact opposite of the down-to-earth effect being asked for. Draft the structure and the verifiable parts, then have the founder write or rewrite the personal paragraphs. Must respect the once-per-person rule shipped in #240 (per account, not per browser) and must not fire on top of onboarding. Reachable again afterwards — a one-time popup nobody can re-open is a dead end. See docs/reference/growth-persuasion.md before writing the copy.' },
  { id: 'typography-paywall-model', title: 'Decide what Pro means for the typography tools', priority: 'P1', effort: 'M', area: 'Monetisation', status: 'todo', note: 'Founder request 2026-08-15: "look into our paywall for the typography tools". FINDING, measured 2026-08-15: there is NO paywall. FontGallery.jsx, FontMatcher.jsx and TypeScale.jsx contain zero references to openProModal, isPro, useSubscription or AuthGate, src/config/plans.js has no typography limit of any kind, and the Plans page does not mention fonts or typography anywhere. The entire monetisation model is AI_LIMITS (5/day, 40/month free) plus FREE_SAVE_LIMITS (3 projects, 8 custom icons). So typography is wholly outside it. Against the approved P-003 direction ("the free tier is a foot in the door") typography is currently all door and no room. This needs a founder DECISION on what is worth paying for before any gate is built — and note the P-003 lesson from #247: a silent collapse reads as broken, so whatever is gated must be visible and named.' },
  { id: 'library-ui-language', title: 'Extend the gradient/palette library UI language to the other browsing surfaces', priority: 'P1', effort: 'L', area: 'Design system', status: 'partial', note: 'EXTRACTED — src/components/library/ (LibraryToolbar, LibrarySearch, LibraryFilterGroup, LibraryGrid, LibraryCard, LibraryEmpty) + the .lbry- block in global.css. Read this before touching any browse surface; do NOT start a fourth implementation. What the diagnosis actually found, so it is not re-derived: the two references had solved the same problem twice and disagreed on every part of it — two search fields of different heights (.pgl-search vs .pl-search-wrap, the latter borrowed from the Prompt Library), THREE filter idioms across two toolbars (the Gradient Library ran outlined .pl-chip pills for mood and a filled .ch-sort segment for type SIDE BY SIDE, so one row asked "which subset?" two unrelated ways), one sticky toolbar and one that scrolled its filters away over ~100 cards, and two answers to where a card\'s actions live. Consumers add their identity class alongside the shared one (.grg-card, .pgal-card) so per-surface deltas and the browser-test hooks survive. Also closed by construction: the sliding active-filter indicator and the Warm/Cool/Dark/Light colour dots that library-filter-ux asks for (the indicator is MEASURED off the active button, not derived from its index — options have different widths and the tray wraps). STILL OPEN: PaletteGalleryGrid\'s card internals are the one part not yet on LibraryCard; it is also mounted inside the Palette Builder popup with selection state and Pro gating, so it is its own slice with its own rendered QA. Contract: tests/user-sim/15-discover-library-parity.spec.js now asserts the two libraries share ONE implementation (computed toolbar/tray/search geometry equal across both pages, position sticky) rather than merely looking alike.' },
  { id: 'modal-ui-pass', title: 'Improve the popup/modal UI across the app', priority: 'P1', effort: 'M', area: 'Design system', status: 'todo', note: 'Founder direction 2026-08-15: "the popups UI needs improving". Scope it as one pass over the shared modal surfaces rather than per-page fixes — ProUpgradeModal, LoginPopup, FeedbackModal, UIPreviewModal, ColorPickerPop and the onboarding sheet. Two already have named work against them: login-modal-redesign covers "Log in to continue", and founder-intro-popup adds another. Known constraints to preserve, not rediscover: focus management and Escape restoration, the >=24px target-size rule (WCAG 2.5.8) that reflow work already had to enforce, and the fact that undefined radius/shadow tokens silently drop the whole declaration (the cause of the square corners fixed in #242/#243).' },
  { id: 'fonts-in-use-surface', title: 'Build a "fonts in use" surface', priority: 'P2', effort: 'L', area: 'Typography', status: 'blocked', note: 'Founder request (2026-08-08), restated 2026-08-15: "i want a way of seeing fonts with real life use cases of them and images and abouts". STILL BLOCKED, and the restatement makes the blocker sharper rather than softer — "images" of real brand work is precisely the part that needs rights clearance. Unresolved and FOUNDER-ONLY: who owns the imagery, under what licence it may be shown, who curates it, and what provenance is displayed. Reference: fontsinuse.com. Do not start the build until that is answered; building it first would create a takedown surface.' },
  { id: 'gradient-randomiser-weighting', title: 'Weight the gradient randomiser toward 2-stop linear gradients', priority: 'P2', effort: 'S', area: 'Discover', status: 'todo', note: 'Founder request (2026-08-08): a 2-stop linear gradient should come up slightly more often than the rest — a weighting, not an exclusion.' },
  { id: 'library-filter-ux', title: 'Rebuild the gradient/palette library filter interaction', priority: 'P1', effort: 'M', area: 'Discover', status: 'todo', note: 'Founder request (2026-08-08): sliding pill animation on the active filter, shift-click multi-select (selecting all three types resets to "All types"), and colour dots on Warm / Cool / Dark / Light. Keyboard equivalents are required for the shift-click behaviour.' },
  { id: 'palette-library-categories', title: 'Categorise the Palette Library on scroll', priority: 'P1', effort: 'M', area: 'Discover', status: 'todo', note: 'Founder request (2026-08-08): trending/popular first, then brand palettes, then community. The trending category is BLOCKED on real usage data (see upgrade-activation-events / analytics instrumentation) — ship the other categories first and do not fake a trending order.' },
  { id: 'login-modal-ui', title: 'Redesign the "Log in to continue" modal', priority: 'P1', effort: 'M', area: 'Account', status: 'todo', note: 'Founder request (2026-08-08): the modal needs a much better UI. Auth surface — read docs/reference/human-validation-zones.md before touching the flow behind it.' },
  { id: 'nav-search-hover-expand', title: 'Expand the nav search on hover with a cycling typing animation', priority: 'P2', effort: 'S', area: 'Navigation', status: 'todo', note: 'Founder request (2026-08-08): the nav search bar expands on hover and shows a typing animation cycling common search terms. Must respect prefers-reduced-motion / data-reduced-motion, and must not regress the homepage CLS/LCP budgets recorded on homepage-field-metrics.' },
]
