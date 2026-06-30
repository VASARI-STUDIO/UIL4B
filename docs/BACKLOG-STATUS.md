# UIL4B — Backlog & Handoff Status

_Last updated: 2026-06-30. **This is the doc a fresh PM reads first** to take over
and hit the ground running: what we're building, how we work, what's shipped,
what's in flight, what's blocked on the owner, and what's queued._

---

## 0. New here? Read these, in order

1. **`CLAUDE.md`** — the lean index + how Dylan likes to work.
2. **This doc** — live state, the active workstream, the backlog.
3. **`docs/BUILD-PLAN-2026-06-23.md`** — the phased Master Build Plan (the ~60-item
   founder list, sequenced). Your roadmap.
4. **`docs/reference/project-manager.md`** — how the PM behaves (you are the main
   thread; **you never write code**), routing, the batched gate, the model policy.
5. **`.claude/agents/README.md`** — the 10-agent roster + which model each runs on.
6. **`docs/OWNER-ACTIONS.md`** — the things only Dylan can do (infra/keys).

Health check (2026-06-30): **build green**, ESLint **0 errors / 31 warnings**
(the 31 are pre-existing advisory `set-state-in-effect` hints — match this
baseline; don't add new warnings, don't "fix" the 31). `main` is current through
**PR #127**.

---

## 1. How we work now (read before routing anything)

- **The PM (you, the main thread) never writes or edits product code.** Ever. All
  implementation goes to the **engineer** agent. The PM parses Dylan's
  (ADHD-style, out-of-order) instructions, re-sequences them, routes to the
  fewest agents that do the job, runs the verify gate, reads diffs, **writes
  docs/markdown** (that IS PM scope), commits/pushes reviewed diffs, and
  opens + squash-merges PRs via GitHub MCP. See `project-manager.md`.
- **Batched gate (lighten the process — founder rule 2026-06-30):** simple local
  check (`vite build` + `eslint`) **per change**; one combined **code-review + qa
  per cluster** before merging; **secret-scanner + security-reviewer always** for
  anything touching `/api`, auth, Stripe, or UGC. Don't over-route — that's the
  token waste Dylan flagged. For a tiny pure-UI diff the PM may do the inline
  secret-review itself instead of launching the scanner.
- **Models (founder rule 2026-06-30):** opus only for **design, engineer,
  security-reviewer, PM**; everything else **sonnet**.
- **Ship cadence:** one PR per slice → squash-merge to `main` → realign the
  feature branch (`git reset --hard origin/main` + `--force-with-lease`).
- **Human Validation Zones** (auth + Stripe — see `human-validation-zones.md`)
  are founder-gated: flag, never silently edit.
- **Anti-tamper:** Pro-gated content is never rendered/placed in DOM/state for
  non-Pro users (inspect-element must not unlock it). Export/save entitlement is
  re-verified server-side when output gains real value.

---

## 2. 🟢 Active workstream — Global Nav Redesign

Dylan's brief: *"redo the nav — a button at the top with a dropdown (like
coolors.co), the left sidebar specific to each section, and make Discover
supersede Resources."* Decoded into a 6-slice plan; design spec is **done**
(task #52). Founder decisions locked: **fold Resources cards into Discover
immediately** (no interim redirect) and **absorb `/community` into the Discover
page** (no standalone).

| Slice | What | Status |
|---|---|---|
| **1** | Section model (`src/data/sections.jsx`) + top-bar **section switcher** (Workspace/Discover/Learn dropdown) | ✅ **shipped — PR #127** |
| **2** | **Discover supersedes Resources** — fold ExternalResources cards into Discover, absorb `/community`, update the switcher/links | ☐ next |
| **3** | Section-aware **Workspace** left sidebar | ☐ |
| **4** | **Discover** left sidebar | ☐ |
| **5** | **Learn** left sidebar | ☐ |
| **6** | Edge cases + polish (e.g. `/checkout` = no sidebar — HVZ-adjacent, founder-review) | ☐ |

This is the in-app realisation of the **three surfaces** (`positioning.md`) and
overlaps Build-Plan **Phase 2** items #1/#2/#3/#13/#14.

---

## 3. ✅ Shipped & live on `main`

### Colour Studio (Build-Plan Phase 1 — ground-up rebuild)
- **Slice 1** — page nav (sliding pill) + Palette Builder core: HCT/Material-3
  tonal "Auto", midpoint insert ×1–3, built-in tints, lock + drag-reorder,
  Pro-locked harmonies as real non-DOM gates.
- **Slice 2** — per-swatch layer (all free): swatch popup + context menu,
  colour-blindness variants (Machado-2009), manual per-swatch hex.
- **Slice 3** — the **"Colour System" popup** (Generate / Image / Brands tabs);
  image extract keeps the image on screen with draggable eyedropper points.
- **Slice 4** — high-quality UI previews + **1–3 Pro-gated blurred previews**
  with upgrade CTA; client-side anti-tamper (Pro preview never rendered for
  non-Pro). _Server-rendered entitlement gate folds into the Phase 3 paywall slice._

### Discover (the community + curated-resource surface — replaces "Library")
- Canonical plan doc `docs/reference/discover.md`; docs repositioned Library→Discover.
- **Slice 2a** — read-only Discover surface shipped + a follow-up consolidation
  fix pass. _Slice 2b (submit-resource form + manual-approval pipeline) is queued
  and **security-gated** — task #49._

### Navigation
- **Nav Slice 1** — global section switcher in the top bar (PR #127, above).

### Homepage / first-load / platform
- Homepage Linear redesign (pass 1 + 2); first-load FOUC polish; `/dashboard`
  kept **public** (no auth wrap); Google-Fonts error + ad-blocker false-trigger
  fixes; theme = **dark default, light opt-in, no OS-follow**.

---

## 4. 🔴 BLOCKING — needs the owner (can't be done in code)

Status is **uncertain** — Dylan wasn't sure which he'd done, and the agent
environment **can't reach `uil4b.com` to verify** (egress-blocked). Each item in
`docs/OWNER-ACTIONS.md` now leads with a **self-check**; run it first.

1. **AI keys (CRITICAL).** Last diagnostic (2026-06-20) showed
   `FIREBASE_SERVICE_ACCOUNT_KEY` malformed + `DEEPSEEK_API_KEY` missing → all AI
   tools dead. **Re-check:** `https://uil4b.com/api/generate-prompt?diag=uil4b-dev-2026`.
2. Stripe `RETAIN50` retention coupon + customer-portal config.
3. Enable Firebase Storage + publish `storage.rules` & `firestore.rules`.
4. `og-image.png` (1200×630) → `public/previews/`.
5. SEO prerender decision (SPA vs prerender for crawlers + AI answer engines).

→ Full step-by-step + self-checks in **`docs/OWNER-ACTIONS.md`**.

---

## 5. 🛠️ Backlog to clear (Dylan: "clear the backlog before we move forward")

Roughly in priority order. Detail + item numbers live in `BUILD-PLAN-2026-06-23.md`.

- **Nav redesign Slices 2–6** (active workstream above).
- **Discover Slice 2b** — submit-resource form + manual-approval pipeline
  (security-gated: `rel="noopener noreferrer nofollow"`, no server-side
  auto-fetch of external URLs/SSRF, sanitise rendered text, rate-limit, manual
  approval before public display). Task #49.
- **Image/Video converter overhaul** (tasks #22–26; design spec #27 done,
  engineer feasibility #28 done) — estimated shrink + re-convert, max-dimensions
  redesign, more file types, video→gif → full video converter, video↔frames both
  directions.
- **Homepage redesign** (tasks #32/#33; "questly" spec #30/#31 done) — ⚠ decision
  pending: this is a *second* redesign on top of the shipped Linear homepage;
  confirm with Dylan whether to build the questly direction or iterate the Linear
  one before routing the engineer.
- **Admin dashboard restyle** + move Style Guide into Admin (Style Guide move
  already done; restyle outstanding).
- **Security hardening pass** (rules reviewed OK; tighten remaining surfaces —
  Dylan: *"be careful with public-facing code so we can't get hacked and have
  users steal data."*).

---

## 6. 🔮 Deferred — do NOT start unprompted

- Colour Studio later slices: gradient tool rebuild + flip-button fix, UI-states
  export, colour-data/brand-logo indexing, image-zoom 2× pan + touch long-press
  (logged Slice-3 gaps), removals (visualiser, named-colour library, taglines).
- Box-shadow generator rework; search depth; UI Kit.
- ainews.tech/skills agents (paste the list when ready); multi-page SEO crawler;
  team collaboration / white-label.
- Logged tech-debt: `useSlidingThumb` shared hook (M2), reactive popup
  breakpoint (L2), Slice-2 `onDown` double-fire guard (M3).

---

_When state changes, update this doc — it's the contract with the next PM._
