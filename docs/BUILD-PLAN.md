# UIL4B — Build Plan (living)

_The **one** doc that holds the current direction, the tool tree, the phase
sequence, and how work is routed. It gets **updated in place** — no dated copies,
no parallel backlog. Owner-only infra tasks live in the **one** other doc,
[`OWNER-ACTIONS.md`](OWNER-ACTIONS.md). Everything else in `docs/reference/*` is
stable operating guardrails (read the relevant one before working in that area)._

_Last updated: 2026-07-02 — start of the ground-up rebuild._

---

## 0. The direction (2026-07-02 — founder)

Full ground-up rebuild in a new design direction. We keep the **work environment**
(APIs, Auth, Stripe, Firebase — all already wired) and **reuse tool components**,
but we **remove all existing design styles** and start from a fresh canvas.

- **Design inheritance:** the new look is inherited from the **Mobbin homepage**
  (sales page structure) and a **Coolors-style tools footer** (the mega-menu
  dropdown pattern). Light mode for now. **Awwwards-grade animations + micro-
  animations** carried through the app. (The earlier GitHub design reference is
  dropped — Mobbin + Coolors screenshots only.)
- **Doc de-bloat (done 2026-07-02):** collapsed ~13 dated planning/spec docs into
  **this** doc + `OWNER-ACTIONS.md`. Backup of the pre-rebuild app is on
  `backup/pre-redesign-2026-07-02` (local + origin) — return there if needed.
- **Three surfaces, three nav dropdowns:** **Create** (was "Workspace") ·
  **Discover** · **Learn**. Each top-level label opens its own mega-menu dropdown
  (Coolors footer style: large bold main-tool heading + smaller sub-tool links
  with one-line descriptions).
- **Dashboard page is removed** (not needed). **Home stays a sales page.**
- **Structure first, tools later.** Every tool is a **blank "coming soon" page**
  for now, **marked TBD in the nav with a subtle "Soon" badge** (founder-confirmed
  2026-07-02 — chosen over a `#` prefix so the public menu reads as intentional,
  not broken) so the founder can see what's unbuilt. **Do not import any tool logic
  yet** — just the route + shell. Tools get built one slice at a time afterwards
  ("I will action each one").
- **Two "not-ready" systems, kept distinct:**
  1. **Blank TBD tool pages** — public, in the nav, "Soon"-badged, "coming soon".
  2. **Hidden tools** reached by direct URL — keep the existing
     "🤫 You found something we're still building" page (`ComingSoon.jsx`),
     re-skinned. (Its old `/dashboard` link must be repointed — Dashboard is gone.)

---

## 1. Site structure & navigation

**Top nav:** logo · **Create ▾** · **Discover ▾** · **Learn ▾** · search · account.
Each ▾ opens a mega-menu. **A left in-tool sidebar exists ONLY inside tool pages**
— quick access to sibling tools in the same Create group; at its bottom a **CTA to
Upgrade**, which becomes a **profile link** if the user is already Pro.

**Home (`/`)** = the rebuilt Mobbin-style **sales page** with placeholder images.
**Dashboard removed** — `sections.jsx` `workspace.home: '/dashboard'` must move to
`/create` (or the first tool); the "Create" label + surface id rename from
`workspace` → `create`.

---

## 2. Tool tree  ✅ _founder-confirmed 2026-07-02 — scaffolding_

Main tools = **large heading** (a *system* with sub-tools built in). Sub-tools =
**smaller font** beneath, each also getting its **own standalone page** (reused
components). `→ /route` shown where a route already exists; **new blank pages get
a "Soon" badge in the nav until built.**

### CREATE (build)

- **Colour System Generator** — _one merged tool_ (`/color`; already merges these,
  so Vercel uses 1 function-free client tool for the whole section)
  - Palette Generator · Semantic (UI-state) Colour Generator · Tint Generator ·
    UI Colour Generator · Gradient Generator · Contrast Checker
- **Typography System Builder**
  - Font Gallery `→ /fontgallery` · Font Pair Tool `→ /fontpairs` · Type Scale `→ /typescale`
- **UI Component Builder**
  - Component Designer `→ /ui-builder` · Box Shadow Generator `→ /box-shadow` ·
    UI Auto-Builder `→ /auto-builder`
- **Imagery & Media**
  - File Converter `→ /file-converter` (image + video + frames merged) ·
    Aspect-Ratio Calculator `→ /ratio`
- **AI Studio**
  - AI Image-Prompt Generator `→ /ai-prompt` · AI Landing-Page Prompt Generator
    `→ /landing-prompts` · Alt-Text Generator `→ /alt-text` · Prompt Library `→ /prompts`
- **Icons & Emoji** — _importable as-is, light mode_ (see Phase 3)
  - Icon Library `→ /icons` · Emoji Library `→ /emoji`

### DISCOVER (browse — new community surface: inspiration + free-to-copy assets)

- **Inspiration** — curated sites (Mobbin, Godly, Lapa Ninja, …), each linking back
  to the relevant Create tool
- **Community Palettes / Systems** · **Community Fonts & Pairings** ·
  **Community Prompts**
- **Curated Resources** — the ~45 ExternalResources links fold in here
- **Collections**

### LEARN (understand — all documentation)

- Design Principles · UI Themes · Brand Colour Guide · Typography Guide ·
  SEO (Small-Business + Specialist) · Marketing Fundamentals / Social & Marketing ·
  AI Coding Assistants · Help Centre

> Nothing above is imported yet except the **shell**. Blank pages carry a "Soon"
> badge in the nav. Colour is **one** client-side tool (no Vercel function). We stay
> within the **12/12 serverless-function cap** — the rebuild adds no functions.

---

## 3. Phases (fastest path to V1; next tool set ~1 month later)

- **Phase 0 — Reset (PM).** ✅ Backup branch pushed. ✅ Doc de-bloat → this doc +
  `OWNER-ACTIONS.md`. ✅ Founder checkpoint (tool tree §2 confirmed; TBD = "Soon"
  badge; design spec approved 2026-07-02).
- **Phase 1 — Structure + sales page.** ⏳ Design spec (design) → engineer builds:
  route tree, mega-menu nav (Create/Discover/Learn) with "Soon" TBD badges, blank
  "coming soon" tool pages, Mobbin-style sales page (placeholders, Awwwards
  micro-animations), generic tool-page shell (left in-tool nav + Upgrade→profile
  CTA), re-skinned `ComingSoon.jsx`. **Remove Dashboard.** Rename Workspace→Create.
- **Phase 2 — Accounts & admin (import + refine).** User system, account settings,
  small user-management admin features, **keep the feedback tool + admin dashboard**
  (refine, don't rebuild). ⚠ Touches **Human Validation Zones** (auth + Stripe) —
  flag, founder-review, never silently edit.
- **Phase 3 — Icons & Emoji import (as-is, light mode).** Verify no blocking TODOs
  first; import; leave UI-styling polish until after the homepage design is locked.
- **Phase 4+ — Per-tool builds.** Each Create tool built as its own slice, on the
  confirmed design style, when the founder actions it.

---

## 4. How work is routed (company workflow)

`research → design → engineer → code-review + security-review → secret-scan → qa → ship`

- **PM (main thread) never writes product code** — parses/re-sequences the
  founder's instructions, routes to the fewest agents, runs the verify gate, reads
  diffs, **writes docs** (this doc, `OWNER-ACTIONS.md`, `.claude/agents/*`), and
  commits/pushes + opens/squash-merges per-slice PRs via GitHub MCP. See
  [`reference/project-manager.md`](reference/project-manager.md).
- **Models:** opus for **design, engineer, security-reviewer, PM**; everything else
  sonnet.
- **Batched gate:** local `vite build` + `eslint` per change; one combined
  **code-review + qa per cluster** before merge; **secret-scanner +
  security-reviewer ALWAYS** for anything touching `/api`, auth, Stripe, or UGC.
- **Verify baseline:** build green, ESLint **0 errors / 31 warnings** (the 31 are
  pre-existing advisory `set-state-in-effect` hints — match, don't add, don't
  "fix"). Never mark work complete without running it.
- **Ship cadence:** one PR per slice → squash-merge to `main` → realign the feature
  branch (`git reset --hard origin/main` + `--force-with-lease`).
- **Anti-tamper:** Pro-gated content is never computed / placed in state / rendered
  / sent as props for non-Pro users; entitlement re-verified server-side when output
  gains real value.
- **UGC (Discover):** external links `rel="noopener noreferrer nofollow"
  target="_blank"`; no server-side auto-fetch of external URLs (SSRF); sanitise
  rendered text; rate-limit; manual approval before public display.

---

## 5. Current state (what we keep / reuse)

- **`main` health:** build green, ESLint 0 err / 31 warn (through the pre-rebuild
  history; backup on `backup/pre-redesign-2026-07-02`).
- **Reusable tool code (do NOT delete — reuse when each tool is actioned):**
  Colour Studio (`/color`, already merges palette/tints/contrast/gradients),
  Typography (`/fontgallery`, `/fontpairs`, `/typescale`), UI (`/ui-builder`,
  `/box-shadow`, `/auto-builder`), Imagery (`/file-converter`, `/ratio`), AI
  (`/ai-prompt`, `/landing-prompts`, `/alt-text`, `/prompts`), Icons/Emoji
  (`/icons`, `/emoji`).
- **Kept infra/features:** Firebase Auth/Firestore, Stripe (Free + Pro $4.99/mo),
  DeepSeek/Gemini AI, feedback tool, admin dashboard, `sections.jsx` surface model
  (adapt Workspace→Create), `ComingSoon.jsx` hidden-tool page.
- **Removed:** Dashboard page; all prior design styling; the dated planning/spec
  docs (this doc supersedes them).

### 🐞 Known bugs (carried over — fix when the relevant tool is rebuilt)

1. **Colour/Color label flash on refresh.** Two locale files —
   `src/locales/en.json` (British "Colour Studio") vs `src/locales/en-US.json`
   (American "Color Studio"); British paints first, US resolves and re-renders.
   **Fix:** resolve active locale synchronously before first paint.
2. **Font-gallery FOUT on scroll.** `src/pages/FontGallery.jsx` lazy-loads each
   font via an `IntersectionObserver` and swaps placeholder→real per card — janky
   reflow. **Fix:** preload the visible set + reserve card metrics + reliable
   load path (retry/fallback).

### 🔴 Owner-blocking (can't be coded) → see [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md)

AI keys (Firebase service-account + DeepSeek) · Stripe `RETAIN50` coupon + portal ·
Firebase Storage + `storage.rules`/`firestore.rules` · `og-image.png` (1200×630) ·
SEO prerender decision.

---

## 6. Deferred — do NOT start unprompted

Colour Studio later slices (gradient rebuild, UI-states export, brand-logo
indexing, image-zoom pan/long-press); box-shadow rework; search depth; UI Kit;
multi-page SEO crawler; team collaboration / white-label. Logged tech-debt:
`useSlidingThumb` shared hook, reactive popup breakpoint, Slice-2 `onDown`
double-fire guard.

---

_When state changes, update this doc in place — it is the contract with the next PM._
