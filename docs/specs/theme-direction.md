# UIL4B — App-Wide Visual Language & Theme Direction

**Register:** Linear × Coolors. Calm, high-contrast, generous, restrained. Dark-default, light a first-class opt-in. This document is the canonical reference every page (starting with Colour Studio) builds against. It is expressed in terms of the **live** `global.css` tokens — it refines values, it does not replace the token set.

> Persisted from the `design` agent's theme-direction spec (2026-06-23). Source of truth for Phase 0.5 of `docs/BUILD-PLAN-2026-06-23.md`.

## 0. References analysed (what we steal / adapt / avoid)

- **Linear** ([linear.app/brand](https://linear.app/brand) — 403 to automated fetch; sourced from the design-system teardowns below). **Steal:** the 4–5 step surface stack from canvas → elevated where cards earn presence through a **1px inset highlight + soft shadow, not fills**; the rationed accent (one accent action per view); a near-mono cool-gray text ladder; the precise sub-bold heading weight (Linear's custom 510/590). **Adapt:** their custom font weight 510 → we map to Outfit 500 for body emphasis, 600 for headings (Outfit has no 510). **Avoid:** Linear's acid/indigo accent and pure-black canvas — we keep `#0A0B0D` (not `#000`) and our blue `--brand`.
  Sources: [getdesign.md/linear.app](https://getdesign.md/linear.app/design-md), [Linear: a calmer interface](https://linear.app/now/behind-the-latest-design-refresh), [LogRocket: Linear design](https://blog.logrocket.com/ux-design/linear-design/).
- **Coolors** ([coolors.co/generate](https://coolors.co/generate), [coolors.co/visualizer](https://coolors.co/visualizer)). **Steal:** the **floating frosted toolbar/nav** that hovers over a full-bleed working canvas (our `.cs-sticky-nav` already does this — keep and standardise it as the glass recipe). The tool surface is content-forward: swatches fill the viewport, chrome is minimal and floats. **Adapt:** the **spacebar-fast, snapping** interaction feel into our sliding-pill nav. **Avoid:** Coolors' ad density and light-first default.
  Sources: [coolors.co](https://coolors.co/), [Coolors review 2026](https://manytools.com/review/coolors/).

**Signature move for UIL4B:** *a quiet near-black (or paper-white) canvas where the only saturated colour is either the user's own content (palettes, fonts, icons) or exactly one brand action per view — chrome floats in frosted glass and never competes with the work.* The product gets out of the way of the design the user is making.

---

## 1. Token palette — dark & light, side by side

Format: **token — dark — light — purpose/notes.** "Keep" = already correct in `global.css`. Changes are flagged with **CHANGE** and a reason.

### Backgrounds / surfaces

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--bg-0` | `#0A0B0D` | `#FFFFFF` | Page canvas. Keep. Dark is intentionally not pure black (Linear principle — pure black crushes shadow depth). |
| `--bg-1` | `#0F1012` | `#FFFFFF` | Chrome (topbar/sidebar/nav rails). Keep. **CHANGE light:** set `--bg-1:#FCFCFD` so chrome separates from `--bg-0` white without a border. Reason: in light, chrome and canvas are both `#fff` today, so the sidebar only reads via its border — a half-step lift is more Linear. |
| `--bg-2` | `#16181C` | `#F7F7F7` | Raised surface / inset wells, hover targets. Keep. |
| `--bg-3` | `#1E2126` | `#EBEBEB` | Pressed / active well, kbd chips. Keep. |
| `--bg-4` | `#272B31` | `#D4D4D4` | Top of stack: range tracks, drag handles. Keep. |
| `--card` | `#16181C` | `#FFFFFF` | Card fill. Keep dark. **Light is fine** (cards = white on `#FCFCFD` chrome / `#F7F7F7` wells reads correctly). |
| `--cbg` | `#0F1012` | `#F5F5F5` | Code blocks. Keep. |
| `--inp` | `#16181C` | `#FFFFFF` | Input fill. Keep. |

### Borders / hairlines

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--border` | `rgba(255,255,255,.07)` | `rgba(0,0,0,.06)` | Default hairline. Keep dark. **CHANGE light → `rgba(0,0,0,.08)`.** Reason: at `.06` on white, card edges nearly vanish; Linear's light borders sit ~`.08–.09` so surfaces read as objects. |
| `--bh` | `rgba(255,255,255,.13)` | `rgba(0,0,0,.12)` | Hover/focus border. Keep both. |
| `--ring` (dark) | `inset 0 1px 0 rgba(255,255,255,.06)` | — | The Linear "top-edge highlight." **ADD a light value:** `[data-theme="light"]{--ring:inset 0 1px 0 rgba(255,255,255,.7)}` so raised surfaces in light get a subtle top sheen. Today `--ring` is only meaningful in dark. |

### Text ladder

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--t0` | `#F2F3F5` | `#171717` | Primary. Keep. Dark `#F2F3F5` on `#0A0B0D` ≈ 17:1; light `#171717` on `#fff` ≈ 16:1. Both AAA. |
| `--t1` | `#B6BAC2` | `#525252` | Body / secondary. Keep. Dark ≈ 9.6:1, light ≈ 7.5:1. AAA. |
| `--t2` | `#888D97` | `#737373` | Muted labels, captions. Keep. Dark ≈ 5.3:1, light ≈ 4.7:1 — both clear **AA** for ≥normal text. **Rule:** never use `--t2` below 14px for essential copy; for <14px microcopy that must be readable, use `--t1`. |
| `--t3` | `#5C616B` | `#A3A3A3` | Decorative only (eyebrow rules, disabled, placeholder). Dark ≈ 2.5:1, light ≈ 2.3:1 — **sub-AA by design.** **Rule:** `--t3` is for non-essential text and 1px rules ONLY. Never a value the user must read. (This is already how `global.css` uses it; documenting the rule prevents misuse.) |

### Brand / accent (locked — tracks `--brand`)

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--brand` / `--accent` | `#3B82F6` | `#2563EB` | Keep. On dark `#3B82F6` as text/icon on `#0A0B0D` ≈ 5.4:1 (AA). On light, `#2563EB` on white ≈ 5.2:1 (AA). |
| `--accent-strong` | `#2563EB` | `#1D4ED8` | Pressed brand. Keep. |
| `--accent-soft` / `--brand-soft` | `#60A5FA` | `#3B82F6` | Hover fill on solid buttons. Keep. |
| `--accent-bg` / `--brand-bg` | `rgba(59,130,246,.12)` | `rgba(37,99,235,.08)` | Tinted wash behind active pills/badges. Keep. |
| `--accent-glow` / `--brand-glow` | `rgba(59,130,246,.20)` / `.18` | `.14` / `.12` | Hero orbs, focal glow only. Keep. |
| `--accent-fg` | `#FFFFFF` | `#FFFFFF` | Text on solid brand. Keep (global, not theme-scoped). White on `#3B82F6` ≈ 3.1:1 — acceptable for **bold ≥14px / large UI** per AA large-text; our buttons are ≥12.5px bold so this passes as UI-component/large. **Rule:** never set brand-solid button text below 13px regular. |

### Semantic (success / warn / danger / info)

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--ok` | `#4ADE80` | `#16A34A` | Keep. |
| `--warn` | `#FACC15` | `#CA8A04` | Keep. **Rule for dark `#FACC15`:** ~13:1 on `#0A0B0D` but only use as text/icon, not as a fill behind white. |
| `--err` | `#F87171` | `#DC2626` | Keep. |
| `--info` | — | — | **ADD: `--info` = `--brand`** (alias, not a new hue). Reason: today informational accents borrow `--accent`; making the alias explicit lets us later retune info without disturbing brand. Add: dark `--info:#3B82F6;--info-bg:rgba(59,130,246,.12)`, light `--info:#2563EB;--info-bg:rgba(37,99,235,.08)`. |

**Recommended additions (new tokens):**

- `--ring` light value (above).
- `--info` / `--info-bg` (above).
- `--glass` recipe variables (see §4) so glass is one source of truth, not hand-tuned per component.
- `--scrim` — modal/overlay backdrop. Today overlays hand-roll `rgba(0,0,0,.4–.55)` and `color-mix(...bg-0 60%)`. Standardise: dark `--scrim:rgba(8,9,11,.62)`; light `--scrim:rgba(23,23,23,.32)`. Use everywhere a modal dims the page.

**Net: the dark palette is already excellent — keep it. Light needs four small lifts (`--bg-1`, `--border`, `--ring`, `--scrim`) to feel as deliberately crafted as dark.**

---

## 2. Type system

**Family — keep Outfit (`--font`) + IBM Plex Mono (`--mono`).** One change to consider: `--serif` is currently aliased to Outfit, so the `em` italics in `.sec-h h1 em` render as Outfit-italic, not a true serif. That is acceptable and on-brand (Linear is sans-only). **Recommendation: keep `--serif` = Outfit** — do *not* introduce a real serif. Linear's "editorial" feel comes from weight/spacing contrast, not a serif. Document `--serif` as "display alias of Outfit, reserved for future."

**Weights (Outfit):** 400 body · 450 nav/secondary UI · 500 emphasis & UI labels · 600 headings & active states · 700 reserved for eyebrows/tags/strong CTAs and numeric callouts. Map of Linear's 510→our **500**, Linear's 590→our **600**. Never use 800+ except the one checkout price callout already in place.

**Scale (keep the live ramp; this codifies it):**

| Role | Size | Line-height | Weight | Letter-spacing |
|---|---|---|---|---|
| Display / page H1 | `clamp(32px,5vw,52px)` | 1.3 → tighten to **1.15** for the largest end | 500–600 | `-.025em` |
| Section H2 | 22–28px | 1.25 | 600 | `-.02em` |
| Card title / H3 | 18–20px | 1.3 | 600 | `-.02em` |
| Body | 15px | 1.65 | 400 | normal |
| Body-small / desc | 13px | 1.6 | 400 | normal |
| UI label | 12–13px | 1.4 | 500 | `-.005em` |
| Micro / caption | 11px | 1.5 | 500 | normal |
| Eyebrow / kicker | 10–11px | 1 | 600 | `+.12–.14em`, uppercase, `--mono` |
| Tag / badge | 9–10px | 1 | 700 | `+.06em`, uppercase |
| Numeric / code | inherit | 1.7 | 600 | `--mono` |

**Vertical rhythm:** body `line-height:1.65` (keep). **Measure: cap body/description containers at `max-width: 68ch`** (the `.sec-h p` 640px is right; generalise as a `.prose` measure of 45–75ch). **Heading micro-fix:** add `line-height:1.15` at the top of the H1 clamp so the 52px display doesn't sit too airy — Linear's big type is tight.

**Serif vs sans (Linear model):** sans (Outfit) everywhere; **mono (IBM Plex Mono) is the "precision voice"** — eyebrows, kbd chips, numeric values, hex codes, code blocks, category counts. This is already the convention; keep it consistent and never use mono for running prose.

---

## 3. Spacing & layout rhythm

- **Base unit: 4px**, 8pt rhythm. Keep the live ramp exactly: `--s-1:4 … --s-10:128`. It is a clean geometric-ish scale (4·8·12·16·24·32·48·64·96·128). **Keep as-is.**
- **Section vertical rhythm:** outer pages `clamp(64px,9vw,128px)` (≈ `--s-8`→`--s-10`) between major sections; in-app sections `48px` (`--s-7`) — matches `.sec-h{margin-bottom:48px}`. Keep.
- **Container widths:** app content `max-width:1400px` (`.sec` — keep); **prose/marketing column** `820px` (matches `.landing-hero`); **reading measure** ≤68ch. Tool canvases (Colour Studio) go **full-bleed** inside `.main`'s `clamp(16px,5vw,64px)` gutter — the Coolors model.
- **Grid / gutter:** 12-col mental model; concrete gutters use the spacing ramp — cards `--s-3`(12)/`--s-4`(16) tight, sections `--s-5`(24) standard. Bento/grid gap `8–12px` (already used). Keep.
- **Page gutter:** `.main{padding:0 clamp(16px,5vw,64px)}` — keep. This is the single horizontal rhythm; do not introduce per-page gutters.

---

## 4. Radii & elevation

**Radius — product default is "medium," CTAs full-round.** Keep the ramp:

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 6px | chips, kbd, tiny swatches |
| `--radius-s` | 8px | nav items, menu items, inner controls, **the sliding pill thumb** |
| `--radius` | 10px | **default** — inputs, code, small cards |
| `--radius-l` | 14px | cards, modals, floating glass nav |
| `--radius-xl` | 20px | large feature panels, hero device frames |
| `--radius-2xl` | 28px | hero background mask only |
| `--radius-pill` | 999px | **all buttons/CTAs**, segmented pill containers, badges |

**Rule:** buttons and CTAs are always `--radius-pill`; cards/panels/modals are `--radius-l`; interactive controls inside panels are `--radius` or `--radius-s`. Never mix a pill button with a sharp panel.

**Elevation (keep dark; the light shadows are good — keep):**

| Token | Use |
|---|---|
| `--shadow-xs` | resting hairline lift (buttons at rest) |
| `--shadow-s` | cards at rest |
| `--shadow-m` | hover lift, dropdowns |
| `--shadow-l` | modals, floating menus (`--warm-shadow-lg` alias — keep) |
| `--shadow-glow` | focal brand glow — **focal points only** (hero, primary CTA on hover) |
| `--ring` | inset top-edge highlight — apply to raised cards/glass for the Linear "lit edge" |

**Elevation principle (Linear):** raised surfaces gain presence from **`--ring` (1px inset top highlight) + `--shadow-s`**, *not* from a lighter fill. Stack moves at most one `--bg` step.

**Glass-morphism recipe (the Coolors floating-nav device) — standardise as tokens:**

```css
[data-theme="dark"]{
  --glass-bg: color-mix(in srgb, var(--bg-1) 72%, transparent);
  --glass-border: var(--bh);
  --glass-shadow: 0 8px 32px -12px rgba(0,0,0,.6);
}
[data-theme="light"]{
  --glass-bg: color-mix(in srgb, #fff 72%, transparent);
  --glass-border: var(--border);
  --glass-shadow: 0 8px 28px -14px rgba(16,24,40,.18);
}
```

Recipe for any floating panel/nav (`.glass`, and what `.cs-sticky-nav` should consume):

```css
background: var(--glass-bg);
backdrop-filter: saturate(160%) blur(14px);
-webkit-backdrop-filter: saturate(160%) blur(14px);
border: 1px solid var(--glass-border);
border-radius: var(--radius-l);
box-shadow: var(--glass-shadow), var(--ring);
```

- **Blur 14px, saturate 160%** (matches `.docs-toc` — the best existing glass; standardise everyone to it; `.cs-sticky-nav` currently lacks the saturate — add it).
- **bg alpha ~72%** (between current 88% on `.cs-sticky-nav`, too opaque, and 60% on `.uip-overlay`). 72% lets the canvas/colour bleed through — the whole point on Colour Studio.
- **Reduced-motion / no-`backdrop-filter` fallback:** `@supports not (backdrop-filter:blur(1px))` → raise alpha to ~94% so it stays legible without blur.

---

## 5. Motion (restrained, Linear-like)

**Durations:** micro 120–150ms (hover, press); standard 200ms (`--t`); entrance 240–320ms; large/scroll choreography 350–550ms (hero, reveal). Nothing exceeds ~600ms.

**Easings (two, plus linear):**
- `--t` = `.2s cubic-bezier(.16,1,.3,1)` — the standard "settle" ease-out for entrances/hovers. **Keep as the workhorse.**
- `cubic-bezier(.2,0,0,1)` — snappier ease for menus/dropdowns (already used by `cp-rise`). Keep for popovers.
- Add `--t-fast:.12s cubic-bezier(.2,0,0,1)` for press states and the **sliding-pill snap** (the pill should feel instant-but-eased, like Coolors' spacebar).

**What animates:** opacity, transform (translate/scale), `border-color`, `box-shadow`, `background`. **Never animate** layout-affecting properties (width/height/top/left) in hot paths — the sliding pill animates `transform: translateX()`, never `left`.

**Choreography:** entrance = `landing-reveal` fade-up (`opacity 0→1`, `translateY(8–14px)→0`) staggered ≤80ms per item. Hover lift = `translateY(-1px to -2px)` + shadow step. Press = `translateY(0)` + slight opacity/`--bg` darken at `--t-fast`. Hero float (`hero-float 4s`) and orb parallax are the only ambient loops — keep them subtle and **gate behind reduced-motion**.

**Reduced motion:** the global `html[data-reduced-motion="true"]` and `prefers-reduced-motion` rules already collapse transitions/animations to 0.01ms — **keep and respect.** Specifically, under reduced motion: kill hero orb parallax, `hero-float`, the reveal translate (fade only, no slide), and the pill **snaps instantly** (no slide) but still moves. Never disable a focus ring under reduced motion.

---

## 6. Component primitives

### Buttons (keep `.btn` system; codify variants)

- **`.btn` (default/secondary):** `--card` fill, `--border`, `--radius-pill`, 10px/22px, 12.5px/500. Hover → `--bg-2` + `--bh`. Keep.
- **`.btn-primary` / `.btn-accent`:** solid `--brand`, `--accent-fg`. Hover → `--brand-soft` + `translateY(-1px)` + brand-tinted shadow. Keep. **This is the only place solid brand fill appears in dense UI.**
- **`.btn-ghost` (ADD):** transparent fill, no border, `--t1` text, hover `--hvr`. For tertiary/toolbar actions where a bordered button is too heavy (Colour Studio toolbars). Class: `.btn.btn-ghost`.
- **Sizes:** `.btn-s` (6/12, 11px) keep; default; add `.btn-l` (14/28, 14–15px) for hero CTAs (the landing already inlines this via `.landing-cta-primary` — generalise it).
- **States (all variants):** default · hover (lift + shadow/wash) · `:focus-visible` (2px `--accent` outline, 2px offset — global, keep) · `:active` (`translateY(0)`, `--t-fast`, opacity .8) · `:disabled` (opacity .4, no transform/shadow). **Loading:** add `.is-loading` → text hidden, inline 14px spinner (`@keyframes fg-spin` exists — reuse), keep button width to avoid layout shift (Doherty: mask latency).

### Pills & the sliding/snapping inner nav (Colour Studio needs this)

Today `.cs-nav-item.active` just recolours (solid `--brand` fill). **Upgrade to a sliding-pill (segmented) control** that fits any label width — the signature Colour Studio nav.

Structure: a glass track (`.cs-seg`) containing buttons (`.cs-seg-btn`) and one absolutely-positioned **thumb** (`.cs-seg-thumb`) that translates/resizes to the active button.

```css
.cs-seg{position:relative;display:inline-flex;gap:2px;padding:4px;
  background:var(--glass-bg);backdrop-filter:saturate(160%) blur(14px);
  -webkit-backdrop-filter:saturate(160%) blur(14px);
  border:1px solid var(--glass-border);border-radius:var(--radius-pill);
  box-shadow:var(--glass-shadow),var(--ring)}
.cs-seg-btn{position:relative;z-index:1;padding:8px 16px;border:none;background:none;
  font:600 12px/1 var(--font);color:var(--t2);cursor:pointer;border-radius:var(--radius-pill);
  white-space:nowrap;min-height:36px;transition:color var(--t-fast)}
.cs-seg-btn:hover{color:var(--t0)}
.cs-seg-btn.active{color:var(--accent-fg)}
.cs-seg-thumb{position:absolute;top:4px;bottom:4px;z-index:0;border-radius:var(--radius-pill);
  background:var(--brand);box-shadow:var(--shadow-s);
  transition:transform var(--t-fast),width var(--t-fast)}
```

**Implementation note:** JS measures the active button's `offsetLeft`/`offsetWidth` and sets the thumb's `transform:translateX()` + `width` via a CSS custom property (`--seg-x`, `--seg-w`) on the track — *no inline style object literals in JSX beyond setting those two custom properties*, which is permitted (a CSS var on a ref, not a style rule). The thumb snaps with `--t-fast`; under reduced motion the transition collapses (global rule) and it jumps. Because the thumb is sized to the active button, **any label width fits** — short ("Tints") or long ("Material States") snap correctly. Keep the existing `.cs-nav-item`/`.cs-sticky-nav` glass shell; this replaces the per-item fill with a moving thumb.

**Other pills:** `.pt-t` toggle, `.tag`, `.search-chip`, `.nav-alpha-badge` — keep. Active pill state uses `--accent-bg` wash + `--accent` text/border (the tinted, not solid, treatment) — keep for multi-select/toggle contexts; reserve solid-fill for the single active segment in a sliding pill.

### Cards (keep `.card` / `.card-i`)

`--card` fill, `--border`, `--radius-l`, `--shadow-s`, hover `--bh`. **Add the Linear lit edge:** include `box-shadow: var(--shadow-s), var(--ring)` so cards get the inset top highlight. Hover lifts border only (no translate by default — translate is for interactive/clickable cards via `.card-link`). Keep `overflow:hidden` for inner media.

### Popups / modals / menus (consolidate)

Many variants exist (`.export-dropdown`, `.profile-menu`, `.cs-add-menu`, `.nav-ctx-menu`, `.pl-modal`, `.uip-modal`, `.il-detail`, `.fg-detail`). They already share: `--card` bg, `--border`, `--radius`/`--radius-l`, `--warm-shadow-lg`, `cp-rise`/`fg-rise` entrance. **Standardise:**

- **Menus/popovers:** `--card`, `--radius`, `--shadow-l`, entrance `cp-rise .15s cubic-bezier(.2,0,0,1)`, origin top. Keep.
- **Modals:** centered/top-anchored card, `--radius-l`, `--shadow-l` + `--ring`, entrance `fg-rise`. **Backdrop uses the new `--scrim` token** with optional `backdrop-filter:blur(6px)` (matches `.uip-overlay`) — make blur the standard for modals so the canvas softens behind. Close affordance top-right circular button (keep `.pl-modal-close` pattern). **Mobile:** full-width, bottom-sheet entrance (`slideUp` exists) ≤480px — keep.

### Inputs (keep)

`--inp` fill, `--border`, `--radius`, 13px. Focus → `--accent` border + `0 0 0 3px var(--accent-bg)` ring. Keep — this is the single focus treatment; reuse for all custom controls. Range thumb white with `--accent` ring — keep.

### Pro-locked overlay (server-gated — spec the placeholder, not hidden content)

**Principle:** the locked artifact is **never rendered client-side**. The server returns a **placeholder payload** (e.g. a low-detail blurred raster, a skeleton, or generic shimmer tiles) — the client only styles the *overlay shell*. So we design the shell, an upsell, and a non-revealing teaser background.

Classes: `.pro-lock` (positioned container), `.pro-lock-veil` (the obscuring layer over the placeholder), `.pro-lock-cta` (centered upgrade card).

```css
.pro-lock{position:relative;border-radius:var(--radius-l);overflow:hidden;isolation:isolate}
/* The blur is applied to the server-sent PLACEHOLDER, not real content. */
.pro-lock-veil{position:absolute;inset:0;background:var(--scrim);
  backdrop-filter:blur(10px) saturate(120%);-webkit-backdrop-filter:blur(10px) saturate(120%)}
.pro-lock-cta{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;
  gap:12px;padding:32px 28px;text-align:center;max-width:360px;margin:0 auto;
  min-height:200px;justify-content:center}
.pro-lock-badge{display:inline-flex;align-items:center;gap:6px;font:700 10px/1 var(--mono);
  letter-spacing:.08em;text-transform:uppercase;color:var(--accent-fg);
  background:var(--brand);padding:4px 10px;border-radius:var(--radius-pill)}
.pro-lock-title{font:600 18px/1.3 var(--font);letter-spacing:-.02em;color:var(--t0)}
.pro-lock-sub{font:400 13px/1.6 var(--font);color:var(--t1);max-width:42ch}
.pro-lock-cta .btn-primary{margin-top:4px}
```

- **Teaser background:** if no server placeholder image, use a static **shimmer skeleton** of generic tiles (`.pro-lock-skeleton` with the existing skeleton/shimmer pattern) — visually communicates "there's content here" **without** leaking it. Skeleton shimmer must respect reduced-motion (freeze to a static muted fill).
- **Copy framing (loss-aversion + value, not nag):** title states the *benefit gained* ("Unlock every export format"), sub states what's behind it, CTA `.btn-primary` "Upgrade to Pro," plus a quiet `.btn-ghost` "See plans." Lock badge top-right uses the `--brand` PRO badge (matches `.profile-menu-probadge`).
- **A11y:** the overlay is the only focusable content (placeholder is `aria-hidden` / `inert`); CTA is keyboard-reachable; `.pro-lock` has `role="group"` + `aria-label="Pro feature"`.

---

## 7. Brand-colour application rules (where `--brand` is allowed — and forbidden)

**`--brand`/`--accent` is RATIONED. One saturated brand moment per view.** (Linear principle: accent rationed to a single primary action; everything else mono.)

**Allowed:**
- The **single primary CTA** per view (`.btn-primary`, `.landing-cta-primary`).
- The **active segment thumb** in a sliding pill (one at a time, by definition).
- Focus rings (`--accent` outline + `--accent-bg` glow) — system-wide, always.
- Links in prose (`a{color:var(--accent)}`) — keep.
- PRO / upgrade badges and the Pro-lock CTA.
- Small accent affordances: the eyebrow kicker text, an active nav item's *tinted wash* (`--accent-bg`) + text, status-positive contexts.
- Focal glow on hero/empty-state illustration only.

**Forbidden / restricted:**
- **#13 — NO blue highlight on pinned nav sections.** The pinned group (`.nav-pinned`) must NOT use brand colour for its resting/section treatment. Its drop-active state currently uses `color-mix(...accent 8%...)` + accent inset ring — **change drop-active to a neutral treatment:** `background: var(--hvr); box-shadow: inset 0 0 0 1.5px var(--bh);` and the empty-state dashed border to `--border`/`--bh`, label `--t3`. Pinned items are user content, not a brand surface. (The pin *icon* may keep a muted neutral, not `--accent`.)
- **No large brand fills.** Brand never fills a card, panel, section background, or the canvas. Tinted `--accent-bg` wash is the maximum area treatment.
- **No more than one solid-brand element competing in a viewport.** If a view has a primary CTA *and* an active pill thumb, that's the budget — don't also colour an icon brand-blue nearby (Von Restorff: the distinct element is only memorable if it's singular).
- **No brand on body text, headings, borders-by-default, or muted labels.** Those stay in the `--t` ladder.
- **No neon/AI-glow.** Glows are low-alpha (`--accent-glow` ≤ .20) and reserved for hero focal lighting — never a halo on buttons or cards in dense UI.

---

## Accessibility checklist (applies app-wide)

- **Contrast:** `--t0/--t1` AAA both themes; `--t2` AA (≥14px); `--t3` decorative only. Brand-as-text AA both themes. White-on-brand only on bold/large UI (buttons ≥13px). Light-theme `--border` raised to `.08` for visible surface edges.
- **Focus:** never strip `:focus-visible`; 2px `--accent` outline + 2px offset is the single, theme-aware focus treatment. Sliding-pill buttons, segmented controls, and the Pro-lock CTA must all show it.
- **Keyboard:** menus/modals trap focus and close on Esc; sliding pill is arrow-key navigable (roving tabindex) and `role="tablist"`/`tab` if it switches panels; pinned drag has a keyboard reorder fallback.
- **Semantics:** modals `role="dialog" aria-modal`; placeholder behind Pro-lock is `inert`/`aria-hidden`; eyebrows are not headings.
- **Reduced motion:** honour the existing global gate — parallax/float/shimmer freeze; reveals fade without slide; pill snaps without sliding; focus rings always remain.

## What NOT to do (traps for this language)

- Don't introduce a real serif, a second accent hue, gradients-as-decoration, or neon glow. The calm comes from restraint.
- Don't make light theme an afterthought — apply the four light lifts (`--bg-1`, `--border`, `--ring`, `--scrim`) or chrome and cards float invisibly on white.
- Don't fill cards/panels/canvas with brand. Don't put brand on pinned nav (#13).
- Don't animate `width/left/top` for the sliding thumb — `transform` + width-as-var only; never inline style *rules* in JSX (CSS custom properties on a ref are the permitted exception).
- Don't render Pro-locked content client-side and blur it — blur only the server-sent placeholder.
- Don't let chrome compete with the user's content; on tool pages, the work is the brightest thing on screen.

## Rationale (key decisions → reference + principle)

- **Rationed single-accent + mono surface stack** → Linear teardowns ([getdesign.md](https://getdesign.md/linear.app/design-md), [LogRocket](https://blog.logrocket.com/ux-design/linear-design/)); **Von Restorff** (the singular element is remembered) + reduced **cognitive load**.
- **Floating frosted nav over a full-bleed canvas** → Coolors generate/visualizer ([coolors.co/generate](https://coolors.co/generate)); content-forward **visual hierarchy** — chrome recedes, the user's palette is the focal point.
- **1px inset top highlight + soft shadow instead of fills** → Linear surface treatment; **aesthetic-usability effect** (crafted depth reads as quality, earns trust in the first ~50ms).
- **Sliding/snapping pill** → Coolors' instant-feel interactions; **Doherty threshold** (<400ms perceived response) and **Fitts/Jakob** (familiar segmented-control pattern, generous targets ≥36px).
- **Loss-aversion-framed Pro-lock with non-revealing skeleton** → conversion logic + **Zeigarnik/goal-gradient** (a visible "there's more here" pulls upgrade) without leaking gated value.
- **Keeping dark palette as-is, lifting only light** → the dark tokens already test AAA/AA; effort goes where the gap is (light first-class parity), not churn.

---

### Files referenced (absolute paths)

- `src/styles/global.css` — the single source of truth this spec refines (tokens at lines 3–5; primitives: buttons, inputs, cards, glass nav, menus/modals, reduced-motion).
- `docs/reference/css-conventions.md` — token names, prefixes, breakpoints.
- `docs/reference/constants-and-config.md` — brand colour + text tokens.
- `src/pages/Landing.jsx` — shipped Linear-redesign baseline this language stays consistent with.

**Sources:** [getdesign.md — Linear](https://getdesign.md/linear.app/design-md) · [Linear: a calmer interface](https://linear.app/now/behind-the-latest-design-refresh) · [LogRocket — Linear design](https://blog.logrocket.com/ux-design/linear-design/) · [Linear brand (bot-blocked, 403)](https://linear.app/brand) · [coolors.co](https://coolors.co/) · [coolors.co/generate](https://coolors.co/generate) · [Coolors review 2026](https://manytools.com/review/coolors/)

*Note: `linear.app/brand` returned HTTP 403 to automated fetch, so Linear specifics (weights 510/590, rationed accent, 4–5 step surface stack, border-not-fill) are drawn from the design-system teardowns above plus trained knowledge — not from a live fetch of the brand page.*
