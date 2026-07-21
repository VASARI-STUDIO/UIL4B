# Audit Implementation — Central Backlog & Tracker

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

1. **Phase 1 — Critical stability / funnel** (Slice A + trivial C1/B2). Stop the
   acquired-user leak; make onboarding real. ← *in progress*
2. **Phase 2 — Core UX & IA** (Slice B) once the surface strategy (A3) is decided.
3. **Phase 3 — Accessibility & responsive** (Slices C, D).
4. **Phase 4 — Interface consistency** (metadata, breakpoints, tokens).
5. **Phase 5 — Premium motion polish** (Slice E) — last, never before core usability.
6. **Owner-gated / larger** (Slice F) — scheduled deliberately.

---

## Slice A — Fix the funnel (highest impact)

| ID | Src | Item | Effort | Zone | Status |
|---|---|---|:--:|:--:|---|
| **A1** | P0-1 | Make onboarding reachable for new sign-ups | M | 🔒 | **🔒 Owner-validate** (review + QA ✅; awaiting founder + live verify) |
| **A2** | P0-2 | Onboarding nav `/dashboard` → `/home` (×3) | S | — | **In QA** (static ✅; live exits ⏳ with A1) |
| **A3** | P1-3 | Reconcile Discover/Learn — **decided: thin-but-true** (un-hide nav, surface built pages) | M | — | **Ready** (own PR, after A1/A2 merges) |
| **A4** | P1-4 | Replace `/home` grey placeholders with real screenshots | M | — | **Blocked** (needs captured assets — owner/design) |
| **A5** | — | Surface `GradientGallery` under Discover nav | S | — | **Ready** (rolls into A3 slice) |
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
- **Still to do:** founder HVZ sign-off + Escalation #2 decision (present with the
  full review + QA package) · live-app verification of the ⏳ ledger rows · then the
  focused Slice-A PR.

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

### A4 · Real `/home` screenshots — **Blocked**
- **Source:** P1-4. Needs real captured/optimised assets (owner/design); cannot be
  fully done from code alone. Engineering can prep responsive `<img>` slots +
  `alt` scaffolding once assets exist.

### A5 · Surface `GradientGallery` — **Ready (rolls into A3)**
- The one real Discover asset (`/discover/gradients` → `GradientGallery`) is
  unlinked. Now that A3 is decided **thin-but-true**, this is just one of the nav
  entries wired in that slice — no longer a standalone blocked item.

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
| **B2** | Strip dead `PAGE_TITLES`/`PAGE_DESCRIPTIONS` for removed paths | S | `Ready` (trivial; ship with A) |
| **B3** | Resolve `/color` landing-vs-studio ambiguity | M | `Backlog` |
| **B4** | De-emphasise "Soon" groups in Create mega-menu | S | `Backlog` |

## Slice C — Accessibility (WCAG 2.2 AA)

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **C1** | Skip-to-content link → `<main id="main">` (2.4.1) | S | `Ready` (trivial; ship with A) |
| **C2** | Contrast pass, both themes (1.4.3) | M | `Backlog` |
| **C3** | Keyboard/AT test of mega-menu (4.1.2) | M | `Backlog` (needs running app) |
| **C4** | Target-size audit `ui-pill-sm` + icon-only (2.5.8) | S | `Backlog` |
| **C5** | Re-test onboarding a11y after A1 | M | `Backlog` (needs A1 landed) |

## Slice D — Responsive

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **D1** | Normalise 18 breakpoints → ~5 named scale | M | `Backlog` |
| **D2** | Verify/fix 320–360 px floor | M | `Backlog` (needs running app) |
| **D3** | Confirm 4K max-width ceilings | S | `Backlog` |

## Slice E — Motion polish (last)

| ID | Item | Effort | Status |
|---|---|:--:|---|
| **E1** | Resolve `--dur-3` 280/380 ms conflict | S | `Backlog` |
| **E2** | Migrate inline durations → `--dur-*` | M | `Backlog` |
| **E3** | Success motion on export/copy/save (reduced-motion-safe) | M | `Backlog` |

## Slice F — Reliability & performance (owner-gated / larger)

| ID | Item | Effort | Zone | Status |
|---|---|:--:|:--:|---|
| **F1** | Remove `unpkg.com` ffmpeg.wasm CDN dependency | M | — | `Backlog` |
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

---

## Change log

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
