# UIL4B — Backlog & Handoff Status

_Last updated: 2026-07-01. **This is the doc a fresh PM reads first** to take over
and hit the ground running: what we're building, how we work, what's shipped,
what's in flight, what's blocked on the owner, and what's queued._

> **Taking over from scratch?** The paste-ready spin-up prompt for a brand-new PM
> chat lives in [`docs/PM-HANDOFF-PROMPT.md`](PM-HANDOFF-PROMPT.md). Read this doc
> first, then that.

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

Health check (2026-07-01): **build green**, ESLint **0 errors / 31 warnings**
(the 31 are pre-existing advisory `set-state-in-effect` hints — match this
baseline; don't add new warnings, don't "fix" the 31). `main` is current through
**PR #128** (the previous PM-handoff overhaul).

**What landed 2026-07-01 (this doc pass — direction changes a fresh PM must know):**
1. **Nav pivoted** from a single section *switcher* to a **normal 3-item nav bar
   with per-item mega-menu dropdowns** (Workspace · Discover · Learn) — see §2.
2. **Homepage direction decided:** rebuild from the **Mobbin homepage** as the new
   starting point (supersedes the shipped Linear homepage and the shelved "questly"
   spec) — see §5.
3. **Mobbin** added to the "make-irrelevant" competitor set + queued as a Discover
   inspiration card — see §5.
4. **SEO reverse-engineering** directive added (mine competitor search terms, audit
   our real rank, seed to climb) — see §5 + `.claude/agents/seo.md`.
5. **Two UX bugs logged** (Colour/Color label flash on refresh; font-gallery FOUT on
   scroll) — see §5 "🐞 Known bugs."

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

## 2. 🟢 Active workstream — Global Nav Redesign (mega-menu direction)

⚠️ **DIRECTION CHANGE — 2026-07-01 (founder, supersedes the earlier switcher
plan).** Original brief was a single coolors-style **section switcher** (one
button that swaps between Workspace/Discover/Learn) — that shipped as Slice 1
(PR #127). Dylan has since pivoted:

> *"for the navigation instead of having 3 sections, Learn, Workspace and
> discover, the navigation should be a normal navigation menu with these labels,
> and their own drop downs; these dropdowns will look similar to the attached
> reference images."*

So the top bar becomes a **normal horizontal nav** with **three top-level items —
Workspace · Discover · Learn — each opening its own mega-menu dropdown**, styled
like the two reference images below. The Slice 1 **section *data model*
(`src/data/sections.jsx`) is kept and reused**; only the *switcher UI* is
superseded by the mega-menu nav. The two locked founder decisions still stand:
**fold Resources cards into Discover immediately** (no interim redirect) and
**absorb `/community` into the Discover page** (no standalone).

**Revised slice plan:**

| Slice | What | Status |
|---|---|---|
| **1** | Section model (`src/data/sections.jsx`) + top-bar section switcher | ✅ **shipped — PR #127** — ⚠ switcher UI now **superseded by Slice 3**; the `sections.jsx` data model is retained |
| **2** | **Discover supersedes Resources** — fold ExternalResources cards into Discover, absorb `/community`, update links | ☐ **next** (unaffected by the pivot) |
| **3** | **Mega-menu nav bar** — replace the switcher with a horizontal 3-label nav (Workspace · Discover · Learn); each label opens its own mega-menu dropdown (see reference styling below) | ☐ **NEW — needs a design spec first** |
| **4** | **Workspace** mega-menu panel content + section-aware left sidebar | ☐ |
| **5** | **Discover** mega-menu panel content + left sidebar | ☐ |
| **6** | **Learn** mega-menu panel content + left sidebar | ☐ |
| **7** | Edge cases + polish (`/checkout` = no sidebar — HVZ-adjacent, founder-review) + wire **global search** into the mega-menus | ☐ |

**Reference-image styling for the mega-menus** (a fresh PM/design agent won't have
the screenshots — build to these written specs, then route a `design` teardown):

- **Jasper mega-menu (light theme).** A wide **3-column** panel. Each column has a
  small uppercase section header (e.g. *"Popular tools & topics"* / *"Learn Jasper"*
  / *"Get support"*) above a list of **link rows**, each row = **icon + bold title +
  one-line description**. A **bottom promo band** of 2–3 cards (Blog / Customer
  Stories / Reviews). Generous padding, soft shadows, rounded corners.
- **incident.io mega-menu (dark theme).** A **3-column split** labelled
  *PRODUCTS / PLATFORM / FEATURED*. **Left column** = rounded **icon tile + title +
  sub-label** (with inline product chips, e.g. Slack/Teams). **Middle column** =
  a **title + description** list. **Right column** = a single **featured promo card**
  (image + CTA). A **thin footer row** with secondary links plus a primary CTA
  (*"Start a free trial"*).

Net: our three panels should borrow Jasper's icon+title+description link rows and
incident.io's featured-card + footer-CTA structure, re-skinned to the UIL4B
theme-direction tokens (dark default / light opt-in).

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
- **Nav Slice 1** — global section switcher in the top bar (PR #127). ⚠ The
  switcher **UI is being superseded** by the mega-menu nav (§2, Slice 3); its
  `src/data/sections.jsx` **data model is kept and reused**.

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
- **Homepage redesign — ✅ DECIDED 2026-07-01 (founder):** rebuild from the
  **Mobbin homepage (mobbin.com) as the new starting design point.** Dylan:
  *"use the homepage from the mobbin app as new basic starting design point for
  the app. i like this homepage design as a starting point."* This **supersedes**
  both the shipped Linear homepage **and** the shelved "questly" spec (#30/#31 —
  now history, do not build). Route: **research → `design` teardown of
  mobbin.com's homepage → engineer (#32) → review/QA → ship (#33)**. Keep the
  UIL4B positioning copy (`positioning.md`) and theme-direction tokens; borrow
  Mobbin's *layout/structure*, not its brand.
- **Mobbin → "make-irrelevant" set + Discover card (2026-07-01).** Dylan:
  *"another app to add to the list of Apps to make irrelivant https://mobbin.com/
  a inspiration app."* Mobbin is already in the `seo`/`research` agent competitor
  lists; the new work is to add **mobbin.com as a curated Discover `inspiration`
  card** (title/description/category/tags/use-case/free-paid label, links back to
  our tools per `discover.md`) — fold into the Discover Slice 2 work.
- **SEO reverse-engineering (2026-07-01) — see `.claude/agents/seo.md`.** Dylan:
  *"reverse engineer SEO, via using common search terms for similar tools to help
  us seed better on the search results; currently if i search 'UI colour palette
  generator' i am not even in the first 5 pages; we need to check this for many
  search queries."* → mine competitor high-intent queries, audit our **real** rank
  across many queries, seed to climb (per-tool landing pages, "[competitor]
  alternative" pages, metadata/H1, AI-citable content), covering **both** "color"
  (US) and "colour" (UK/AU) spellings. Pairs with owner-action #5 (prerender
  decision).
- **Admin dashboard restyle** + move Style Guide into Admin (Style Guide move
  already done; restyle outstanding).
- **Security hardening pass** (rules reviewed OK; tighten remaining surfaces —
  Dylan: *"be careful with public-facing code so we can't get hacked and have
  users steal data."*).

---

### 🐞 Known bugs (logged 2026-07-01 — route a fix)

Both reported by Dylan; root-caused via read-only recon so the engineer can go
straight to the fix.

1. **Colour/Color label flash on refresh.** *"if i refresh the page the colour
   studio label says Colour then corrects to color."* **Root cause:** two locale
   files — `src/locales/en.json` (British *"Colour Studio"*, ~L94/112/177) and
   `src/locales/en-US.json` (American *"Color Studio"*). British paints first, the
   US locale resolves and re-renders → a visible flash. **Fix direction:** resolve
   the active locale **synchronously before first paint** (or align the default so
   the first paint already matches), so no swap is visible. Pure client i18n — no
   HVZ, no `/api`.
2. **Font-gallery FOUT on scroll.** *"a rendering issue on the font pages causes me
   to be able to see fonts loading as i scroll, they switch family from the
   placeholder to the actual font; it often doesnt work and it often renders them
   as you load the page so its not a very clean UX system."* **Root cause:**
   `src/pages/FontGallery.jsx` lazy-loads each font via an `IntersectionObserver`
   (~L53–60, L511) using `loadFont`/`reloadFont`/`verifyFontLoaded` from
   `../utils/googleFonts`, swapping each card placeholder→real typeface only after
   verify — an unreliable, janky per-card reflow on scroll. **Fix direction:**
   preload/`font-display` the visible set and reserve card metrics so the swap
   isn't visible (avoid per-card observer thrash); make the load path reliable
   (retry/fallback) so cards don't get stuck on the placeholder.

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
