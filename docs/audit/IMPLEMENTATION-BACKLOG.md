# Audit Implementation — Central Backlog & Tracker

> **Closed historical tracker (2026-07-25).** Preserve this file as audit
> evidence. Current priorities live in [`../BUILD-PLAN.md`](../BUILD-PLAN.md) and
> `src/data/pipeline.js`; do not append new UI-refresh tasks here.

> **Post-close reconciliation (2026-07-28):** B5 is resolved: `/color` is the
> colour-system landing and live tools remain under `/color/*`. A4's screenshot
> request was superseded by the shipped living workspace preview (`1e7fbdd`).
> Remaining Discover/Learn/Font Gallery page flips are absorbed into the live
> Discover, Learn and Font-readiness workstreams; their historical rows below are
> retained unchanged.

*The single source of truth for turning the Phase-16 UX/UI/accessibility/QA
audit into shipped, verified improvements. Consolidated from the audit's
[`04-critical-issues.md`](04-critical-issues.md) (P0/P1) and
[`10-backlog.md`](10-backlog.md) (slices A–F). Every item keeps its source ID,
`file:line` evidence, fix, and acceptance criteria so nothing is lost.*

> **Branch:** `claude/audit-implementation-qa-a1hjzp` → PR → `main` (no direct
> pushes to `main`; PR-only merge per the git workflow).

---

## Status vocabulary

Work moves **strictly in order** — no item jumps from *In progress* to *Complete*.

| Status | Meaning |
|---|---|
| `Backlog` | Captured, not yet started |
| `Ready` | Scoped + acceptance criteria agreed; safe to implement |
| `In progress` | Being implemented |
| `In review` | Implemented + self-verified (build + lint); awaiting **independent** code + security review |
| `In QA` | Passed review; awaiting **independent** QA sign-off (functionality / a11y / responsive / UX-states) |
| `Blocked` | Cannot proceed — needs a dependency or a decision |
| `Escalated` | Needs an owner product decision (see [Escalations](#escalations)) |
| `🔒 Owner-validate` | Human Validation Zone (auth/Stripe) — implemented + reviewed, but must be validated by the founder before merge |
| `Complete` | Reviewed + QA-signed + (if 🔒) owner-validated + acceptance criteria met on the running app |

**Definition of done (per item):** change lands · `npx vite build` passes ·
`npx eslint .` clean · acceptance criteria met on the running app · independent
review + QA signed · 🔒 items owner-validated. A code read alone is never "done".

---

## Phase roadmap

> **Live status (2026-07-24):** the client-side audit backlog is **essentially
> shipped**. Every engineering-owned item across Slices A–F that could ship from
> this environment is merged to `main` and live (see the per-slice tables + change
> log). What remains is **not** engineering work: founder/live-Firebase-gated
> verification (A1 live-preview smoke, A2 exit-QA, C5 onboarding re-test), founder
> product decisions (A3 page-flips, B5 `/color` ambiguity, F3 community pipeline,
> F4 Stripe abandon/return), owner assets (A4 screenshots), and two deliberately
> deferred larger items (A6 Firestore onboarding-truth, F2 lazy-Firebase).

1. **Phase 1 — Critical stability / funnel** (Slice A + trivial C1/B2). ✅ *shipped*
   (A1/A2 #161, C1/B2 #162) — live-Firebase verify of A1/A2 is founder-drivable.
2. **Phase 2 — Core UX & IA** (Slice B). ✅ *shipped* (B2 #162, B3 #169, B4 #171);
   B1 depends on the A3 surface decision, B5 is a founder call.
3. **Phase 3 — Accessibility & responsive** (Slices C, D). ✅ *shipped/verified*
   (C1 #162, C1a #168, C2 #162+#176, C3 #180, C4 verified; D1 #175, D2 verified,
   D3 #172) — C5 re-test is Firebase-gated.
4. **Phase 4 — Interface consistency** (metadata, breakpoints, tokens). ✅ *shipped*
   (B3 #169, D1 #175, C2/#21 tokens #176).
5. **Phase 5 — Premium motion polish** (Slice E). ✅ *shipped* (E1/E2 #175, E3 #172).
6. **Owner-gated / larger** (Slice F). F1 ✅ *shipped* (#174); F2/F3/F4 remain
   owner-gated / deliberately scheduled.

---

## Slice A — Fix the funnel (highest impact)

| ID | Src | Item | Effort | Zone | Status |
|---|---|---|:--:|:--:|---|
| **A1** | P0-1 | Make onboarding reachable for new sign-ups | M | 🔒 | **🔒 Owner-validate — code merged (#161)** — HVZ sign-off ✅ (founder); stash producer ✅ (local build). **Residual:** live preview + Firebase verify is egress-403 here → founder-drivable only |
| **A2** | P0-2 | Onboarding nav `/dashboard` → `/home` (×3) | S | — | **Shipped ✅ (#161)** — three exits land `/home` (static ✅). Live exit-QA ⏳ (travels with A1 live-verify, Firebase-gated) |
| **A3** | P1-3 | Reconcile Discover/Learn — **decided: thin-but-true** (un-hide nav, surface built pages) | M | — | **In QA** — first slice built (GradientGallery surfaced live; nav already un-hidden). Remaining page-flips (`Discover`, `PromptLibrary`, `FontGallery`, Docs) are a **founder decision** (override the deliberate coming-soon design) |
| **A4** | P1-4 | Replace `/home` grey placeholders with real screenshots | M | — | **Blocked** (needs captured assets — owner/design) |
| **A5** | — | Surface `GradientGallery` under Discover nav | S | — | **Shipped ✅ (#162)** — live Discover card + mega-menu row → `/discover/gradients`; localhost smoke 8/8 |
| **A6** | QA/rev | Firestore onboarding-truth + routing-dedupe (MED-1/2, Q4) | M | 🔒 | **Backlog** (post-A1-merge design pass; Q1 resume-target shipped in this PR) |

### A1 · Onboarding reachable for new sign-ups &nbsp;🔒
- **Source:** P0-1 (`04-critical-issues.md`). **Evidence:** `AuthGate.jsx:21,40`;
  gate at `App.jsx:290-293`; `Onboarding.jsx`.
- **Root cause:** (a) `AuthGate` wrote `vs-onboarded='1'` the instant the account
  was created, so `Onboarding` never rendered; (b) the primary path (`LoginPopup`
  via `requireLogin`) never routed a new account to `/onboarding` at all, and
  `/home` has no onboarding guard — only `/` checked.
- **Fix implemented:**
  - `AuthContext.jsx` — import `getAdditionalUserInfo`; add `pendingOnboarding`
    state set on **account creation only** (email `signup`, and Google
    popup/One-Tap when `getAdditionalUserInfo(result).isNewUser`); expose
    `pendingOnboarding` + `clearPendingOnboarding`.
  - `App.jsx` (`AppInner`) — one effect routes `authUser && pendingOnboarding`
    → `/onboarding` once, then clears the flag. Keyed off the *account-creation*
    event, so **returning users never carry it** and are never bounced.
  - `AuthGate.jsx` — removed both `vs-onboarded` writes (lines 21, 40).
  - `Onboarding.persist()` is now the **only** writer of `vs-onboarded`.
- **Acceptance:** brand-new account → `/onboarding`; completing/skipping sets
  `vs-onboarded` and lands `/home`; returning login → `/home`, never re-sees
  onboarding. Storage-blocked browsers still treat `catch` as onboarded
  (`App.jsx:291` unchanged). ✅ build + lint green.
- **Owner-validate note (🔒 + regression to confirm) — UPDATED per Escalation #2 →
    option B:** a brand-new user who signs up *mid-action* is routed to `/onboarding`.
    The triggering action does **not** silently complete on that visit, but the
    resume-target (below) now preserves the user's destination through onboarding:
  - **"Upgrade to Pro"** (`ProUpgradeModal.goCheckout`) and any protected-route
    `/login` **`from`**: the intended destination is stashed in
    `sessionStorage['vs-resume-after-onboarding']` and onboarding resumes there on
    finish (skip / checkout-failure) — so the direct checkout intent is **no longer
    discarded**. Choosing Pro in onboarding fulfils it directly via `finishPro`.
    ✅ **fixed in this PR** (was Q1). Live-verify on the preview.
  - **Save/submit prompts** (palette "Save & share" / "submit to community", icon
    "save"): on login these only *open a picker/panel* — nothing is persisted yet —
    so the onboarding redirect pre-empts the panel before the user can save. No data
    loss, but the save they signed up to make doesn't happen on that visit. Not a
    navigation, so it's outside the resume-target scope; tracked as a picker-reopen
    UX follow-up, not a data-loss bug. See [Escalations #2](#escalations).
- **Review results (2026-07-20):**
  - **Security review — ✅ clean.** 0 crit/high/med; 1 low (the `vs-onboarded`
    localStorage flag is client-writable — pre-existing, UX not security).
    Confirmed no authz surface, no new `/api`, `pendingOnboarding` gates nothing
    privileged. Approves on security grounds; HVZ sign-off still a process gate.
  - **Code review — ✅ approve-with-nits.** 0 crit/high; routing logic verified
    correct; independently confirmed **no returning-user path can set the flag**.
    2 medium + 3 low (below).
  - **QA — ⚠️ PASS WITH FOLLOW-UPS.** Build/lint green, 0 new warnings; every new
    sign-up entry point verified to route through `pendingOnboarding`; returning
    users structurally cannot carry the flag (R1 sound); storage-blocked signup now
    works (flag is pure React state, no `localStorage` read). Raised **Q1** (HIGH —
    the discarded-checkout case above; drove the note correction) and **Q3** (MEDIUM
    a11y — focus dropped to `<body>` on the `/onboarding` route change). All "Manual"
    ledger rows remain ⏳ pending live Firebase verification; QA cannot mark 🔒 done.
- **Known residual — tracked follow-up (A6, not fixed in this PR by design):**
  - **MED-1** — abandon `/onboarding` (no Skip/Finish) then return via `login()`
    on `/home`/a deep link (not `/`) → never re-routed. A *narrower* variant of the
    original gap (was: every new signup skipped; now: abandon-then-return-via-
    non-root only). Proper fix = consult a Firestore onboarding-completion truth,
    **but** the naive version bounces legacy users with no `onboarding.completedAt`
    → a genuine regression. Needs a deliberate design pass → **A6**.
  - **MED-2** — `skip()` writes only localStorage, not Firestore; not durable
    cross-device. Only functionally meaningful *with* MED-1's Firestore routing.
- **Follow-ups handled in this PR:**
  - **Q1 (resume-target, HIGH) — ✅ applied** (Escalation #2 → option B). Mid-action
    signups no longer lose their destination: `ProUpgradeModal.goCheckout` and the
    `/login` `LoginRoute` stash the intended target in
    `sessionStorage['vs-resume-after-onboarding']`, and `Onboarding.finishFree/
    finishPro/skip` read + clear it and resume there instead of hardcoding `/home`
    (Free = explicit decline → `/home`; Pro → `checkout()` directly; skip /
    checkout-failure → stashed target). Build + lint clean, 0 new warnings.
  - **Q3 (a11y) — ✅ applied.** `Onboarding.jsx` moves focus to the step heading
    (`ref` + `tabIndex={-1}` + `useEffect` on `step`) so keyboard/AT users aren't
    dropped to `<body>` on the redirect; pre-satisfies C5's onboarding-focus case.
    Build + lint clean, 0 new warnings.
  - **LOW-3 — ✅ applied.** One-line StrictMode-idempotency comment on the App.jsx
    router effect (non-HVZ; documentation only).
  - **LOW-1 — declined (rationale).** A dev `console.error` on the swallowed
    `getAdditionalUserInfo` catch would add noise to an **HVZ** file for a path that
    already fails safe (a throw just means "don't flag onboarding"). Kept HVZ churn
    minimal. **LOW-2** (DRY extract of the two Google gates, ~2 lines) skipped.
- **Done since:** founder HVZ sign-off ✅ ("continue, you have approval for HV
  zones") · Escalation #2 → option B resolved · **running-build smoke on localhost
  ✅** (stash producer + `RequireAuth` redirect — 5/5, see ledger).
- **Still to do (BLOCKED here):** live-preview + Firebase verification of the ⏳
  ledger rows (auth-completion + resume-consume) — the Vercel preview and Firebase
  return **403 from this session's egress proxy**, so this half is **founder-drivable
  only**. Merge decision escalated to founder (run the preview smoke checklist, or
  authorize merge-without-live-verify). The Slice-A PR (#161) is open with CI green.

### A2 · Onboarding nav target `/dashboard` → `/home`
- **Source:** P0-2. **Evidence:** `Onboarding.jsx:75` (`finishFree`), `:84`
  (`finishPro` catch), `:90` (`skip`).
- **Note:** `/dashboard` was not truly dead — `App.jsx:328` redirects it to
  `/home` — so this was a fragile double-hop / time-bomb, not a live break.
- **Fix implemented:** all three `navigate('/dashboard')` → `navigate('/home')`.
- **Acceptance:** grep of `Onboarding.jsx` shows no `/dashboard`; free/pro/skip
  all land `/home`. ✅ build + lint green.
- **Still to do:** QA the three exits on the running app (reachable now A1 lands).

### A3 · Reconcile Discover/Learn — **Decided: thin-but-true**
- **Source:** P1-3. Two of three headline surfaces are marketed on Home + footer,
  hidden from nav, and dead-end where reachable.
- **Owner decision (2026-07-20):** **thin-but-true** — un-hide the Discover/Learn
  nav and surface the already-built-but-orphaned pages (`Discover`,
  `PromptLibrary`, `FontGallery`, Docs, `GradientGallery`) as a first real slice
  of both surfaces. **Constraint:** any shared/publishing back-end must fit the
  **1 free serverless slot (11/12 used)** — consolidate, don't add.
- **Plan (own PR, after A1/A2 merges):** audit the orphaned routes → wire nav
  entries → verify each renders with proper loading/empty states → absorb A5
  (GradientGallery under Discover). No new `/api` function unless it displaces one.
- **Depends-on:** A1/A2 PR merged first (keeps the auth PR focused).
- **Built so far (2026-07-21, this slice):**
  - **Premise re-checked against the live tree.** The "hidden from nav" half of
    P1-3 is already resolved: the live nav is driven by `NAV_SECTIONS`
    (`toolTree.js`) → `PillNav`, which already lists all three surfaces; `/discover`
    and `/learn` land on honest coming-soon shells (`SurfaceLanding.jsx`), not
    dead-ends. So the remaining A3 work is *surfacing built pages*, not un-hiding.
  - **A5 delivered as the first real surfaced page** (see A5 below): the complete,
    orphaned `GradientGallery` is now a live Discover card + menu row.
  - **`sections.jsx` drift fixes** (Learn `home: '/docs'`→`'/learn'`; `LEARN_EXACT`
    gains `/learn`): **latent-correctness only.** `resolveSection` + the surface-model
    `SECTIONS` are consumed **only** by `TopBar.jsx`, which is **retired** (never
    mounted — App.jsx line 50: "the old Sidebar + TopBar chrome is retired"). No
    current user-visible effect; fixed so the model is correct when/if reused.
- **Still open — founder decision:** whether to also flip `soon:true`→live on the
  *other* orphaned pages the decision named (`Discover.jsx`, `FontGallery`,
  `PromptLibrary`, Docs). These may be incomplete, and surfacing them overrides the
  deliberate post-audit coming-soon design. Deliberately **not** done in this slice
  (only the unambiguously-complete GradientGallery was surfaced). Needs a per-page
  readiness check + founder go-ahead before flipping.

### A4 · Real `/home` screenshots — **Blocked**
- **Source:** P1-4. Needs real captured/optimised assets (owner/design); cannot be
  fully done from code alone. Engineering can prep responsive `<img>` slots +
  `alt` scaffolding once assets exist.

### A5 · Surface `GradientGallery` — **Built (in QA)**
- The one real Discover asset (`/discover/gradients` → `GradientGallery`, 38 curated
  gradients, search/filter, honest empty state) was unlinked. **Now surfaced** as the
  single live Discover entry, everything else honestly `Soon`:
  - `toolTree.js` — new `gradient-gallery` group at the head of `DISCOVER_GROUPS`
    (`soon:false`, `route:'/discover/gradients'`) + a `Browse` column in
    `DISCOVER_MENU` so it renders as a mega-menu row.
  - `SurfaceLanding.jsx` — live groups (`soon:false`) render as a `Link`
    (`.surface-card--link`) with a `Browse →` affordance; `soon:true` groups stay
    static `Soon` cards. No dead links either way. (Reuses the founder's pre-built
    `.surface-card--link` / `.surface-card-go` CSS — live cards were within design.)
  - `NavIcon.jsx` — `gradient-gallery` glyph alias so the menu row shows the gradient
    icon, not the fallback dot.
- **Verified:** `npx vite build` ✓ · `eslint` on the 4 changed files clean ·
  **localhost headless-Chromium smoke 8/8** (live card present + links to
  `/discover/gradients`; exactly 1 live card; other 5 Discover + all 8 Learn cards
  stay `Soon`; click **and** direct-load both render the real gallery; count reads
  "38 gradients"). Live-preview verify travels with the A3 slice.

### A6 · Onboarding-truth + routing-dedupe follow-up — **Backlog (post-A1-merge)**
Deliberately deferred out of the focused A1 PR (each needs a design pass or would
bounce legacy users if done naively). Collected from the independent review + QA.
*(Q1 resume-target was pulled forward into this PR per Escalation #2 → option B and
is no longer part of A6.)*
- **MED-1 (review)** — abandon `/onboarding` (no Skip/Finish) then return via
  `login()` on `/home`/a deep link (not `/`) → never re-routed. Proper fix consults
  a Firestore onboarding-completion truth, **but** the naive version bounces legacy
  users with no `onboarding.completedAt` → a real regression. Needs a migration/
  back-fill plan first.
- **MED-2 (review)** — `skip()` writes only `localStorage`, not Firestore; not
  durable cross-device. Only meaningful once MED-1's Firestore routing exists.
- **Q4 routing-dedupe (QA, LOW)** — the `/` root route still has its own
  `vs-onboarded` onboarding check (`App.jsx`) parallel to the new `pendingOnboarding`
  effect. Harmless today; collapse onto one source of truth once A1 is stable to
  avoid future drift.

---

## Slice B — Debt & IA (fast follow)

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **B1** | Triage ~23 orphaned pages: per page re-wire or delete | L | `Backlog` (depends on A3) |
| **B2** | Strip dead `PAGE_TITLES`/`PAGE_DESCRIPTIONS` for removed paths | S | **Shipped ✅ (#162)** — 7 redirect-only keys removed from both maps (`/dashboard`, `/resources`, `/docs-*`); redirect routes kept. Independent review Approve + QA PASS. Build ✅ / lint ✅. |
| **B3** | Add `/learn` to `PAGE_TITLES`/`PAGE_DESCRIPTIONS` + prune stale `sitemap.xml` redirect URLs | S | **Shipped ✅ (#169)** — `/learn` gains an honest coming-soon title + description (no longer falls back to generic). `sitemap.xml`: 9 redirect-only URLs pruned (`/docs`, `/resources`, all 7 `/docs-*`), emptying the "Documentation" section; live `/discover/gradients` added under a new "Discover" section (all other entries cross-checked live against `PAGE_TITLES`). `/learn` deliberately NOT sitemapped — a coming-soon shell is thin content we don't solicit crawl for. Build ✅ / lint ✅ (0 err / 34 warn baseline). |
| **B5** | Resolve `/color` landing-vs-studio ambiguity *(was mis-labelled a 2nd "B3")* | M | **Escalated** — product decision: does `/color` land or open the studio? Not an engineering call — needs founder direction before implementation. |
| **B4** | De-emphasise "Soon" groups in Create mega-menu | S | **Shipped ✅ (#171)** — design-system-consistency slice de-emphasised the mega-menu `Soon` groups. |

## Slice C — Accessibility (WCAG 2.2 AA)

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **C1** | Skip-to-content link → `<main id="main">` (2.4.1) | S | **Shipped ✅ (#162)** — independent review Approve + QA PASS (0 P0/P1). QA-1 (dark-theme skip-link contrast, `--brand`→`--accent-strong`) fixed in-branch. Localhost keyboard smoke 11/11. Build ✅ / lint ✅. |
| **C1a** | Skip target should be a `<main>` **landmark**, not `<header id="main">` (QA-2) | M | **Shipped ✅ (#168)** — Home/ColorLanding/SurfaceLanding now wrap hero+body in `<main id="main" tabIndex={-1}>` (verified on `main`: `Home.jsx:68`, `ColorLanding.jsx:42`, `SurfaceLanding.jsx:63`). SR landmark-nav resolves; the skip target is a true `<main>` landmark. |
| **C2** | Contrast pass, both themes (1.4.3) | M | **Shipped ✅ (#162 + #176)** — dark-theme skip-link contrast fixed (`--brand`→`--accent-strong`, ≥5:1 both themes, #162); **#21 brand/accent-fill token alignment** (#176) moved 14 brand/accent-fill controls onto `var(--accent-fg)` so fills read theme-correct in light **and** dark (runtime-identical today, future-safe). The mass `.btn` migration was deferred as a UX-regression risk (recorded in the Admin pipeline) — not required for AA. |
| **C3** | Keyboard/AT test of mega-menu (4.1.2) | M | **Shipped ✅ (#180)** — audit found Escape closed the mega-menu/account popover but dropped focus to `<body>` (WCAG 2.4.3 Focus Order violation). Fix in `PillNav.jsx`: latest-open/menu ref-mirror (in an effect, not during render) so the once-bound key handler returns focus to the owning control on Escape; section triggers now carry `aria-controls="pnav-mega"` (4.1.2) and the panel an `id`. Headless Chromium keyboard test 8/8 (focus returns to trigger + to account button, not body). Deploy verified READY on production. Follow-up (noted, not blocking): account popover `role=menu` still lacks arrow-key nav. |
| **C4** | Target-size audit `ui-pill-sm` + icon-only (2.5.8) | S | **Verified ✅** — audit found existing target sizes already meet WCAG 2.5.8 AA: `.ui-pill-sm` 40 px tall, icon-only controls 36–44 px, plus dedicated ≥44 px mobile touch-target rules (`.btn`, `.nav-item`, tool/tile pins, `.export-dropdown-item`, `.nav-switch-item`). No interactive control drops below the 24 px AA floor. No fix required. |
| **C5** | Re-test onboarding a11y after A1 | M | **Backlog** — A1 landed (#161); the re-test itself needs live onboarding (Firebase-gated) → founder-drivable. Q3 focus-management fix already pre-satisfies the onboarding-focus case. |

## Slice D — Responsive

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **D1** | Normalise 18 breakpoints → ~5 named scale | M | **Shipped ✅ (#175)** — canonical named breakpoint scale documented + reconciled. |
| **D2** | Verify/fix 320–360 px floor | M | **Verified ✅** — headless-Chromium sweep of all **40 public routes** at **320 px and 360 px** (80 page loads): `documentElement.scrollWidth ≤ clientWidth` on every one — **zero** horizontal overflow, no offending elements past the viewport edge. No fix required; the existing 320/380 px breakpoints already hold the small-screen floor. Confirms PR #176's narrower sweep across the full route set. |
| **D3** | Confirm 4K max-width ceilings | S | **Shipped ✅ (#172)** — Settings paragraph measure capped; 4K max-width ceilings confirmed. |

## Slice E — Motion polish (last)

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **E1** | Resolve `--dur-3` 280/380 ms conflict | S | **Shipped ✅ (#175)** — canonical motion scale: `--dur-3` is now a single `280ms` definition (verified in `global.css:4402`); the 280/380 ms conflict is gone. |
| **E2** | Migrate inline durations → `--dur-*` | M | **Shipped ✅ (#175)** — inline transition durations migrated onto the `--dur-*` tokens. |
| **E3** | Success motion on export/copy/save (reduced-motion-safe) | M | **Shipped ✅ (#172)** — success-toast draw motion added, gated behind `prefers-reduced-motion`. |

## Slice F — Reliability & performance (owner-gated / larger)

| ID | Item | Effort | Zone | Status |
|---|---|:--:|:--:|---|
| **F1** | Remove `unpkg.com` ffmpeg.wasm CDN dependency | M | — | **Shipped ✅ (#174)** — ffmpeg.wasm self-hosted; the `unpkg.com` runtime CDN dependency is removed. |
| **F2** | Trim critical-path JS (defer/lazy Firebase) | L | — | `Backlog` |
| **F3** | Community publishing: local-only vs real pipeline | L | 🔒 | `Escalated` (function ceiling) |
| **F4** | Validate Stripe checkout abandon/return/retry | M | 🔒 | `Backlog` (owner-gated) |

> **Function-ceiling watch:** only **1 of 12** serverless slots is free. F3 and any
> Discover/Learn back-end must consolidate, not add.

---

## Escalations

Items needing an **owner product decision** before they can ship. Implementation
must not pick a direction unilaterally here.

1. ✅ **A3 — Discover/Learn strategy — RESOLVED 2026-07-20: thin-but-true.**
   Un-hide nav and surface the already-built orphaned pages as a first real slice;
   back-end (if any) must fit the 1 free serverless slot. Unblocks A5 + parts of B1.
2. ✅ **A1 in-context-signup behaviour (🔒) — RESOLVED 2026-07-21: build the
   resume-target now (option B).** A brand-new user who signs up *mid-action* is
   pulled into onboarding; previously the triggering intent (an "Upgrade to Pro"
   `/checkout` navigation, or any protected-route `from`) was **discarded**. Owner
   chose to honour the explicit intent rather than accept the drop (A) or bypass
   onboarding entirely (C). **Implemented in this PR:** the intended destination is
   stashed in `sessionStorage['vs-resume-after-onboarding']` at the two mid-action
   entry points — `ProUpgradeModal.goCheckout` (`→ /checkout`) and the `/login`
   launcher `LoginRoute` (the protected-route `from`, generalising beyond checkout)
   — and `Onboarding.finishFree/finishPro/skip` read + clear it and resume there
   instead of hardcoding `/home` (Free is an explicit decline → `/home`; Pro fulfils
   via `checkout()` directly; skip / checkout-failure fall back to the stashed
   target). Live-verify the resume path on the Vercel preview before merge.
3. ✅ **Merge cadence — RESOLVED 2026-07-20:** land **A1+A2 as one focused PR** to
   `main` after independent review + QA + owner validation of A1. Later slices
   (A3 thin-but-true, C1, B2, …) get their own PRs.
4. ⏳ **F3 — Community publishing** (🔒, function-ceiling): local-only staged vs
   real shared pipeline; Home currently markets a community.
5. ⏳ **B5 — `/color` landing-vs-studio ambiguity:** should `/color` present a
   landing page or open the studio directly? A product/IA call, not an engineering
   one — needs founder direction before implementation.
6. ⏳ **A3 remaining page-flips:** flipping the other named orphans (`Discover`,
   `FontGallery`, `PromptLibrary`, Docs) from `soon:true` → live would override the
   deliberate post-audit coming-soon design — deferred pending per-page readiness +
   founder go-ahead (A5/GradientGallery already surfaced as the first live slice).
7. ⏳ **F4 — Stripe checkout abandon/return/retry** (🔒, owner-gated): validate on
   the live Stripe integration — founder-drivable only.

---

## Change log

- **2026-07-24** — **Tracker reconciled against `main`.** The Slice B–F tables had
  drifted badly out of date — many merged-and-live items were still marked
  `Backlog` or "QA → merging". Cross-referenced every item against
  `git log origin/main` (PR titles) **and** the session task ledger and updated
  each row to its true state with PR-number evidence: **shipped** — A1/A2 (#161),
  A5/C1/B2 (#162), C1a (#168), B3-metadata (#169), B4 (#171), D3/E3 (#172), F1
  (#174), D1/E1/E2 (#175), C2/#21-tokens (#176), C3 (#180); **verified-no-fix** —
  C4 (target sizes already meet 2.5.8 AA), D2 (0 horizontal overflow, 40 routes ×
  320/360 px). Confirmed on `main`: `<main id="main">` landmark present in
  Home/ColorLanding/SurfaceLanding (C1a) and `--dur-3` collapsed to a single
  `280ms` (E1). Fixed a duplicate **"B3"** ID — the `/color` landing-vs-studio
  item is now **B5** (Escalated, founder call). Remaining open items are all
  founder/owner-gated or Firebase-live-verify only (A1 live smoke, A2 exit-QA, A3
  page-flips, A4 assets, A6, B1, B5, C5, F2/F3/F4) — no engineering work is left
  that can ship from this environment. Docs-only change.
- **2026-07-21** — **A3/A5 + C1 + B2 independent gates completed.** Code review:
  **Approve** (0 crit/high/med; 3 LOW nits deferred). Independent QA: **PASS**
  (0 P0/P1). Two P2s surfaced: **QA-1** (dark-theme skip-link contrast — new
  code) **fixed in-branch** (`.skip-link` background `var(--brand)`→
  `var(--accent-strong)`, now ≥5:1 both themes); **QA-2** (skip target is a
  `<header>`, not a `<main>` landmark — pre-existing, WCAG G1 still met) logged
  as **C1a**. Two P3 SEO gaps (missing `/learn` metadata; stale `sitemap.xml`
  redirect URLs) logged as **B3**. C1 + B2 → **QA ✅ → merging**; A3/A5 remain
  in QA for the founder page-flip decision. Rebuilt green after the QA-1 fix.
- **2026-07-20** — A1 + A2 implemented on `claude/audit-implementation-qa-a1hjzp`;
  `npx vite build` + full-tree `npx eslint .` green (0 errors; 0 new warnings from
  the 4 changed files). Committed `cc12d20` + pushed. Central backlog +
  [testing ledger](TESTING-LEDGER.md) established. A3, A1-behaviour, merge cadence,
  F3 escalated to owner.
- **2026-07-20** — Independent gates kicked off on A1/A2: code review, security
  review, QA (specialist agents). **Owner decisions:** A3 → **thin-but-true**
  (own PR after A1/A2); merge cadence → **A1+A2 as one focused PR**. A5 unblocked.
  A1 in-context-signup 🔒 validation deferred to present with review/QA results.
- **2026-07-21** — Independent gates **completed. Security ✅ clean · Code ✅
  approve-with-nits · QA ⚠️ PASS-WITH-FOLLOW-UPS.** QA Q1 (HIGH) proved the
  mid-action checkout intent is *discarded*, not deferred — **corrected** the
  backlog's inaccurate "fire-and-forget completes" note and Escalation #2. Applied
  **Q3** (onboarding focus management) + **LOW-3** (comment); **declined LOW-1**
  (HVZ noise). Added **A6** (Firestore onboarding-truth + resume-target + routing-
  dedupe). A1 → **🔒 Owner-validate**; awaiting founder sign-off + Escalation #2
  decision, then the focused Slice-A PR. Build + lint green; live ledger rows ⏳.
- **2026-07-21** — **Escalation #2 → RESOLVED (option B): resume-target built.**
  Founder chose to honour mid-action intent. Implemented the resume-target across
  both mid-action entry points — `ProUpgradeModal.goCheckout` (`→/checkout`) and the
  `/login` `LoginRoute` (protected-route `from`, generalised beyond checkout) stash
  `sessionStorage['vs-resume-after-onboarding']`; `Onboarding.finishFree/finishPro/
  skip` read + clear it and resume there. **Q1 pulled forward out of A6** (A6 now =
  MED-1/2 + Q4 only). `npx vite build` ✓ + `eslint` on the 3 changed files clean,
  0 new warnings. Opening the focused Slice-A PR next; auth (HVZ) still gated on a
  live smoke-test of the resume path on the Vercel preview + founder validation.
- **2026-07-21** — **Slice-A PR #161 opened, CI green.** Founder granted **HVZ
  sign-off** ("continue, you have approval for HV zones") — recorded in the ledger
  sign-off log. Ran **maximum honest verification from this container:** built the
  app and served it on localhost, then drove headless Chromium against the real
  bundle — **5/5 running-build smoke checks pass** (app boots; `RequireAuth`
  `/checkout`→`/login`; **`LoginRoute` stashes `/checkout` and `/projects`**; direct
  `/login` writes no stash). This upgrades the **stash-producer** half of Q1 from
  static review to running-app evidence. **BLOCKED:** the Vercel preview and
  Firebase/Google hosts return **403 from this session's egress proxy** (org policy —
  not retried/routed around), so the **auth-completion + resume-consume** halves and
  the whole Google/Stripe path cannot be driven here. **Resolution:** founder
  directed "continue" (HVZ approval already granted) — so **A1+A2 (#161) squash-
  merged to `main`** with all runnable gates green + localhost smoke 5/5. The
  **live-preview Firebase/Google/Stripe smoke is deferred to the founder** on the
  same preview URL (residual risk owned + documented) — it could not be run from
  this CI container (egress 403). If the preview smoke surfaces a defect, revert
  #161 or fast-follow; the change is behind a clean, revertable squash commit.
- **2026-07-21** — **Slice A3/A5 (first thin-but-true surface) built** on
  `claude/audit-implementation-qa-a1hjzp` (restarted from the merged-#161 `main`).
  **Re-checked A3's premise against the live tree:** nav is already un-hidden
  (`PillNav`/`NAV_SECTIONS` lists all three surfaces; `/discover`+`/learn` land on
  honest coming-soon shells), so the real work is *surfacing built pages*, not
  un-hiding. **Shipped A5:** the complete orphaned `GradientGallery` is now the one
  live Discover card + mega-menu row (`toolTree.js`, `SurfaceLanding.jsx`,
  `NavIcon.jsx`); every other Discover/Learn card stays honestly `Soon`. **Also
  fixed `sections.jsx` drift** (Learn `home`→`/learn`; `LEARN_EXACT` gains `/learn`)
  — **latent-correctness only**, since `resolveSection`/`SECTIONS` are consumed only
  by the **retired** `TopBar`. `npx vite build` ✓ · `eslint` on 4 files clean ·
  **localhost smoke 8/8.** **Still open (founder decision):** flipping the *other*
  named orphans (`Discover`, `FontGallery`, `PromptLibrary`, Docs) live would
  override the deliberate coming-soon design — deferred pending per-page readiness +
  founder go-ahead. Pushed to the branch; **no PR opened** (awaiting founder ask).
- **2026-07-21** — **C1 + B2 built** on the same branch (on top of A3/A5).
  **C1 (skip-to-content, WCAG 2.4.1):** one `.skip-link` in the App shell (first
  focusable node on every route) targets `#main`; each mutually-exclusive layout
  tags its content-start with `id="main" tabIndex={-1}` (chrome-shell `<main>`,
  `CreateTool` `<main>`, Home/Colour/Surface heroes, Onboarding card) — exactly one
  `#main` per page. Offscreen until keyboard focus, slides in above the PillNav.
  **B2 (dead metadata):** removed 7 redirect-only keys (`/dashboard`, `/resources`,
  `/docs-themes|brand|seo|marketing|ai`) from both `PAGE_TITLES` and
  `PAGE_DESCRIPTIONS` — those paths render a `<Navigate>` and inherit the target's
  metadata; the redirect *routes* themselves are kept. `npx vite build` ✓ · `eslint`
  on the 6 changed files clean · **localhost C1 keyboard smoke 11/11** (single
  `#main` on 6 routes; Tab→skip visible at top=8; Enter→focus `#main`) · **A3/A5
  regression smoke 8/8** (no regression). Pushed to the branch.
