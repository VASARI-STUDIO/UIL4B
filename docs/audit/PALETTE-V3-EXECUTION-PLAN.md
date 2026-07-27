# Palette v3 + Design-System Consistency — Execution Plan

> **Closed historical execution plan (2026-07-28).** All implementation waves
> described here shipped. The only residual is server-side community-handle
> uniqueness, now folded into the canonical Community backend decision/workstream
> in `docs/DECISIONS-NEEDED.md` and `src/data/pipeline.js`. Preserve this document
> for founder-brief provenance; do not use it as a current backlog.

_Founder brief received 2026-07-15 (this doc is the parsed, re-sequenced version).
Written for the next session/agent to execute. Work the waves in order — Wave 1
is the foundation everything else reuses. One wave ≈ one commit/verify cycle._

**Branch:** `claude/nav-redesign-pricing-wwdu8j` (then ff `main` — standing
instruction). **Verify gate:** `npx vite build` + `npx eslint .` (baseline 32
warnings / 0 errors) before every commit. Token economy: run mechanical
implementation on Sonnet subagents; keep judgment calls in the main thread.

**Reference images from the founder (Coolors screenshots):**
- **Image 1 — image picker:** photo with draggable circular picker points on it,
  left panel = "Picked palettes" slider + palette strip with +/− count controls +
  "Browse image" + primary export button. Our image dropdown should feel like this.
- **Image 2 — "Colour System" modal = THE canonical popup/dropdown style:** white
  rounded card, title + × header, tab row (Generate / Image / Brands), labelled
  sections, pill option buttons with small icons (harmony types), full-width blue
  primary CTA + quiet text-link secondary. **All popups and dropdown menus site-wide
  adopt this style.**
- **Image 3 — "Go Pro" modal = THE canonical upgrade popup:** two columns — left:
  bold headline, feature checklist w/ coloured ticks, pink/blue CTA "Upgrade for
  just A$X/mo"; right: gradient artwork + social proof row. Reused everywhere we
  gate a Pro feature.

---

## Wave 1 — Design-system foundation (DO FIRST — everything below inherits)

1. **Canonical menu/popup component + CSS.** Build (or consolidate into) shared
   classes in `src/styles/global.css` matching Image 2: card radius, shadow,
   header w/ ×, section labels, icon-pill option buttons, blue primary CTA.
   Apply to: right-click/context menus, the palette **System** dropdown, the
   **Vision** dropdown, save dropdown, image dropdown, submit-to-community popup,
   coming-soon popup — every popup/dropdown on the site. One system, no variants.
2. **Button system.** Base the site-wide button on the palette **Randomize**
   button's design; header/nav buttons = same design at slightly larger padding +
   font size. Main nav and second (tool) nav buttons must be the SAME size.
   **Update all buttons on all pages** — this is a consistency pass, not just
   /color. Codify as `.btn` scale tokens in global.css, then sweep pages.
3. **Second nav bar polish.** Its rounding must match the dropdown menus and the
   rest of the site's components (it currently doesn't).
4. **System + Vision dropdown icons.** More icons in the second-bar menus: each
   vision (colour-blindness) mode gets an icon; the System button/dropdown gets
   the little "system" graphic (the harmony wheel glyphs seen in Image 2).
5. **Pro-upgrade modal component** (Image 3 style): headline, feature checklist,
   art panel, price CTA reading live prices via `src/hooks/usePrices.js`. Used by
   Wave 3 gates AND replaces the icon-library pro upgrade buttons' current popup.
6. **Login popup component — "single-click sign-in" (BIG UX FIX).** Never
   navigate away to /login for auth: open a login popup over the current page;
   on success, close it and the user resumes exactly where they were, state
   intact. Free-feature variant copy: **"You must log in to use this feature —
   don't worry, it's still free."** with the full login options inside the popup.
   ⚠️ `AuthGate.jsx`, `AuthContext.jsx`, `GoogleOneTap.jsx` are **HVZ** — build
   the popup as a NEW component that calls the existing auth functions; if any
   HVZ file must change, STOP and flag to founder first. Reuse across the whole
   app (save, community, AI tools…).

## Wave 2 — Palette Builder mechanics (`src/pages/PaletteBuilder.jsx`)

7. **Free colour cap → 8** (free palettes can have up to 8 colours).
8. **Whole-swatch drag-and-drop.** Drag anywhere on a swatch to reorder — do not
   require grabbing the small move button (keep it as a visual affordance).
9. **Better randomisation.** Founder: "the calculation for randomisation is not
   very good." Rework generation to be HCT/harmony-aware: pick pleasing hue
   spreads, avoid muddy mid-chroma results, distribute tones (dark anchor +
   light neutral + saturated accents) rather than uniform-random HSL.
10. **Variation persistence (free users).** If a user picks a palette variation
    and reopens the menu: keep the same settings/variations listed, with the
    active one ticked/selected. Only regenerate ("rotate") the variations when
    the palette's base/alt colour actually changes.
11. **Cross-tool state bug (must fix).** Repro: select the Apple brand palette →
    open Gradient builder → return to Palette Builder → palette has been rebuilt
    from just the first colour + analogous system. Root-cause the shared colour
    state (ColorStudio context / localStorage sync between /color/* pages) and
    persist the FULL palette + system settings across tool switches.

## Wave 3 — Free/Pro gating

12. **Contrast (palette-builder view) = premium** — and improve it: show **light
    AND dark contrast** results, not one. Gate opens the Wave-1 Pro modal.
    Founder ruling 2026-07-15: the standalone `/color/contrast` page
    (`ContrastChecker.jsx`) **stays free** — only the palette-builder contrast
    view is gated.
13. **Compare = free for free palettes.** Free users can compare the free
    palettes; premium palettes/features still gated.
14. **HCT editing of individual colours = paid.** Clicking into per-colour HCT
    editing as a free user opens the Pro modal (Image 3).
15. **Brand palettes.** (a) Add more brands. (b) Selecting a brand applies the
    brand's WHOLE system — main colour, harmony/system type, all settings.
    (c) If a FREE user then edits the palette from a brand state, reset the
    system back to default first — otherwise brands become a backdoor into the
    paid harmony feature. Premium users keep the brand system while editing.
16. **Watermark the free PNG export card** (the client-side canvas download in
    PaletteBuilder). Pro export stays clean.

## Wave 4 — Image picker (free tool)

17. **Image button becomes a dropdown menu** (Image 1 as reference):
    - drag-and-drop upload, **file size capped at 4 MB**, with clear error copy;
    - once uploaded the image stays nested inside the menu, with draggable
      picker points over it and a picked-palette strip with +/− colour count;
    - a **reset / auto** action re-runs automatic extraction;
    - founder ruling 2026-07-15: the image picker is a **loss-leader — fully
      free to USE with no login**. Login (Wave-1 popup) is required only to
      **save** the resulting palette/system.

## Wave 5 — Save / Export / Community

18. **Export moves out of the top bar** into the second (tool) bar.
19. **Save button:** bookmark icon; click opens a dropdown (Image-2 style) to
    pick where to save (project/collection). Logged-out users get the Wave-1
    login popup ("still free" copy) instead of today's message.
20. **Submit to community = popup:** shows the palette preview, user chooses a
    name, then submits.
21. **Random palette-name generator:** a dice/random button next to the name
    field. Generate themed names from the palette's hues — greens/browns →
    nature themes, oranges/pinks → sunset themes, black/white + blue accent →
    techy/corporate names, etc. Pure client-side wordlists keyed off HCT hue/
    chroma/tone buckets; no API call.
22. **Unique Social Name (community handle).** Before first community action,
    users must set a unique handle. Uniqueness enforced server-side (Firestore
    doc keyed by lowercased handle). **Profanity filter that also catches
    evasion** — leetspeak, digit/character substitutions (`sh1t`, `f_u_c_k`),
    repeated-char padding — via normalisation (map 1→i, 3→e, 4→a, 0→o, $→s,
    strip separators/repeats) before checking the blocklist. Give freedom
    otherwise (numbers, underscores fine).

## Wave 6 — Nav / pages restructure

23. **Remove the Studio button.** Replace with **"Design System Builder"** which
    opens a coming-soon popup (Image-2 style). Long-term it becomes the guided
    walkthrough across the individual colour tools.
24. **`/color` becomes a sales page** about the colour tools (the studio page is
    being reworked into that walkthrough). Mirror the existing surface-sales-page
    pattern (`SurfaceLanding.jsx` / Discover/Learn pages). Check `toolTree.js` +
    `/sitemap` stay consistent.

## Wave 7 — Tint tool (`src/pages/TintTool.jsx`, `/color/tint`)

25. Rename **"Seed colour" → "Base colour"**.
26. **Multiple colours:** allow adding colours (multiple ramps side by side) and
    **import from palette** (pull the current Palette Builder palette in).
27. **Fix perceived-vs-linear** — the toggle currently does nothing. Perceived =
    tone-spaced in HCT/CAM16; linear = even RGB/lightness interpolation. Results
    must visibly differ.
28. **Range + steps:** allow adding the **0 and 1000** endpoints; allow step
    granularity down to **5** (e.g. 0,5,10…1000). Plus any cheap extras that fit
    (copy row, export ramp) — founder wants "more features" here generally.

---

## Open questions for the founder (don't block Wave 1–3 on these)

- Wave 5: where can a palette be saved to — projects only, or also a new
  "collections" concept?

_(Resolved 2026-07-15: image picker = loss leader, free to use, login only to
save · standalone `/color/contrast` page stays free, only the palette-builder
contrast view is premium.)_

## Known constraints

- **HVZ:** auth popup work must not modify `AuthContext.jsx` / `AuthGate.jsx` /
  `GoogleOneTap.jsx` or any Stripe file without founder sign-off — compose, don't
  edit. Pro-modal pricing reads `usePrices.js` (already safe).
- **/api budget:** 11 of 12 used. Handle uniqueness check can ride Firestore
  security rules + client transaction, OR a task in `api/ai.js`-style dispatcher
  is NOT appropriate (different concern) — if a serverless check is truly needed
  there is exactly ONE slot left; prefer Firestore rules first.
- ESLint baseline is exactly **32 warnings / 0 errors** — match, never add.
