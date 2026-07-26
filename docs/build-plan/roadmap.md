# Roadmap — phases, cluster log, bugs, deferred

_History + what's next. Read when you need the why/where behind the current
state. Hub → [`../BUILD-PLAN.md`](../BUILD-PLAN.md) ·
tool tree → [`tool-tree.md`](tool-tree.md)._

_Current execution lives only in the Build Plan hub and the in-app pipeline.
This file retains release history, known bugs and genuinely deferred work._

---

## Rebuild detail (founder, 2026-07-02)

Full ground-up rebuild in a new design direction: keep the work environment,
reuse tool components, remove all prior design styling. Look inherited from the
**Mobbin** homepage + a **Coolors-style** tools footer; light mode; Awwwards-grade
animations. **Structure first, tools later** — every tool started as a blank
"Soon"-badged shell so the founder could see what was unbuilt; tools are then
built one slice at a time. Doc de-bloat (2026-07-02) collapsed ~13 dated
planning/spec docs into the build plan + `OWNER-ACTIONS.md`.

---

## Phases (fastest path to V1)

- **Phase 0 — Reset (PM).** ✅ Backup branch pushed · doc de-bloat · founder
  checkpoint (tool tree confirmed; TBD = "Soon" badge; design spec approved).
- **Phase 1 — Structure + sales page.** ✅ Route tree, mega-menu nav with "Soon"
  badges, blank tool pages, Mobbin-style sales page, generic tool-page shell,
  re-skinned `ComingSoon.jsx`, Dashboard removed, Workspace→Create.
- **Phase 2 — Accounts & admin (import + refine).** User system, account
  settings, small user-management admin features, feedback tool + admin dashboard
  kept. ⚠ Touches **Human Validation Zones** (auth + Stripe) — flag, founder-
  review, never silently edit.
- **Phase 3 — Icons & Emoji import.** ✅ Imported, unified into one surface.
- **Phase 4+ — Per-tool builds.** Each Create tool built as its own slice, on the
  confirmed design style, when the founder actions it.

---

## Cluster program (2026-07-07 founder brain-dump, PM-regrouped)

A ~45-item brain-dump re-sequenced into clusters A–G. One PR per cluster →
squash-merge → realign the branch.

- **Phase 0 (housekeeping) — ✅ MERGED (#134).** Sonnet agents → high effort;
  stale design-spec reference cleaned.
- **Cluster A — Nav & app shell — ✅ MERGED (#134).** Top-bar-only nav; hover-
  expand search; ExportPanel; gear popover (theme + Settings) + avatar popover
  (Account/Plans/Admin-hidden/Sign-out); day/night toggle; mega-menu redesign
  (columns + promo card); black buttons → brand blue; removed the Create tool
  rail; "Soon" badges on every nav category except Icon Library.
- **Cluster B — Home page — ✅ MERGED (#135).** "The living preview": the page IS
  a working demo. Award-grade micro-animations; mini-tools look real but carry no
  functionality (fun interactive section); Export section opens the lazy, focus-
  trapped `ExportPanel` (preview-only, disabled "Soon" primary); app-wide smooth
  scroll (single Lenis singleton + `prefers-reduced-motion` opt-out; GSAP
  ScrollTrigger rides the shared Lenis).
- **Cluster C — Icon & Emoji libraries — ✅ MERGED (#136).** Icon customiser
  (`icust-*`, stroke/Absolute controls, copy-time serialisation to dodge the
  Lucide copy-reset bug), "Custom Icons" library, cross-pack browse +
  skeleton/error states, emoji "show all" + skin-tone fixes. Anti-tamper closed:
  the ungated `vs-saved-icons` write is gone; the custom store is `isPro`-gated
  end-to-end.
- **Cluster D — Pricing / Plans / Settings — 🟡 SAFE SLICE MERGED (#139, #145);
  remainder founder-gated.** Shipped: Settings restyled (left nav kept), Appearance
  → **Accessibility**, default avatar = initials on a brand-blue gradient,
  location-field autocomplete (native `<datalist>`) (#139); and **every price
  surface (Landing, Settings, Onboarding, Checkout, HelpCentre) now reads live
  Stripe amounts via `src/hooks/usePrices.js`**, so no displayed price can diverge
  from what Stripe charges and the founder's flip propagates UI-wide with zero code
  change (#145). **Still needs the founder:** (1) the **price flip** — save the new
  ladder in Stripe: monthly **$4.99 AUD**, yearly **≈$41.99 AUD**, lifetime
  **$129 AUD**, `.99` international (a live price is real money / a Human Validation
  Zone); lifetime also **needs code first** (one-time price + `mode:'payment'` +
  webhook flag) so it stays a non-advertised "coming soon" placeholder; optional UI
  follow-up is a dedicated **Plans** page + trimming pricing from Settings — targets
  + steps in [`../OWNER-ACTIONS.md`](../OWNER-ACTIONS.md); (2) the **Google-profile
  default avatar** (overridable), which touches a Human Validation Zone
  (`GoogleOneTap.jsx` / `AuthContext.jsx`).
- **Cluster E — Discover / Learn — ✅ MERGED (#136).** Discover + Learn sales
  pages improved; Discover's stylised world map shipped (UIL4B marker on Brisbane,
  hover/click-to-region, no user info); `navbar.gallery` featured in
  `discoverResources.js`.
- **Cluster F — Colour tool — ✅ MERGED (#136).** Tint generator imported; custom
  semantic colours drawn from the applicable side of the colour wheel (e.g.
  success = blue→yellow), capped halfway.
- **Cluster G — Unify Icon + Emoji — ✅ MERGED (#137).** Merged into one pill-
  toggle surface; fixed the malformed nav SVGs (gear, search) and the hover-reveal
  of the gear/avatar controls.

---

## 🐞 Known bugs (fix when the relevant tool is rebuilt)

1. ~~**Colour/Color label flash on refresh.**~~ ✅ **FIXED + MERGED (#141).**
   `en-US` is statically imported and seeded into the `I18nContext` locale cache,
   so the active English locale resolves synchronously on first paint — no
   British→American re-render. Non-English locales keep their async code-split.
2. **Font-gallery FOUT on scroll.** `src/pages/FontGallery.jsx` lazy-loads each
   font via an `IntersectionObserver` and swaps placeholder→real per card — janky
   reflow. **Fix:** preload the visible set + reserve card metrics + reliable
   load path (retry/fallback). _(Deferred — hard to verify headlessly.)_

## 🔴 Owner-blocking (can't be coded) → [`../OWNER-ACTIONS.md`](../OWNER-ACTIONS.md)

Stripe monthly/yearly price flip (targets in OWNER-ACTIONS; the **lifetime tier
needs code first** — a one-time price + entitlement, not a Stripe-only edit) ·
AI keys (Firebase service-account + OpenRouter) ·
Stripe `RETAIN50` coupon + portal · Firebase Storage + `storage.rules` /
`firestore.rules` · `og-image.png` (1200×630) · SEO prerender decision.

---

## Deferred — do NOT start unprompted

Colour Studio later slices (gradient rebuild, UI-states export, brand-logo
indexing, image-zoom pan/long-press); box-shadow rework; search depth; UI Kit;
multi-page SEO crawler; team collaboration / white-label. Logged tech-debt:
`useSlidingThumb` shared hook, reactive popup breakpoint, Slice-2 `onDown`
double-fire guard.
