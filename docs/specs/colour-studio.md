# Colour Studio — Rebuild Design Spec

> Source: `design` agent, 2026-06-23. Engineer-ready. Tracks Phase 1 of
> [`BUILD-PLAN-2026-06-23.md`](../BUILD-PLAN-2026-06-23.md). **Slice 1** below is
> the page nav + Palette Builder core; later slices (Colour System popup, swatch
> popup + right-click, HQ previews + paywall, quick-export, gradient, colour-data)
> get appended as they're spec'd.
>
> **PM dependency decision (HCT util):** do **not** pull the full
> `@material/material-color-utilities` package — use a minimal self-contained HCT
> (Cam16/Hct core) conversion in `src/utils/colors.js` (~6KB) to keep the bundle
> lean (founder cares about weight). Engineer: if the tree-shaken cost of the
> official lib turns out negligible, flag it and we'll reconsider.
>
> **Theme tokens:** this spec is written against the live `global.css` tokens
> (`--bg-*`, `--brand`, `--accent-fg`, `--shadow-*`, `--t0..--t2`, etc.). The
> theme-direction spec (`theme-direction.md`) may refine token *values*; because
> the component references token *names*, it tracks any value change automatically.

---

## Slice 1 — Page Nav + Palette Builder Core

Scope: page nav (CS#1/2/2.1) + Palette Builder core (CS#3.1, 3.3–3.6, 3.8, 3.10,
3.15, 3.16). Later slices get separate briefs — this spec leaves named hooks where
they attach.

### 1. Goal & success metric

Make the top-priority page feel **Coolors-grade but unmistakably UIL4B** within the
first 3 seconds, and make the core loop (open → randomise → lock → refine →
understand the palette) so fluid it's addictive.

- **Primary metric:** time-to-first-satisfying-palette ↓ and randomise-loop
  engagement ↑ (proxy for retention).
- **Secondary:** the nav clearly orients the user (section-find time ↓), and the
  page reads as premium (first-impression / halo effect → trust for the rest of
  the rebuild).

### 2. References (steal / adapt / avoid)

**Coolors generator** — full-height colour **columns**, spacebar regenerates
everything except locked columns, drag to reorder, per-swatch controls on hover
(drag · lock · copy · view shades · adjust · remove). **Insert-between (verified):**
hover the gap between two columns → reveal `+` → click to insert, **keep-clicked to
choose how many** (1–3) — auto-fades from one colour to the other. This is exactly
CS#3.5.
- **Steal:** column metaphor, spacebar, lock-survives-randomise, hover toolbar,
  gap-insert.
- **Adapt:** we run on **HCT/Material-3 tonal** maths (not Coolors' randomiser);
  our columns are **rounded cards inside the page frame**, not edge-to-edge, so
  they live inside our app shell with our radii/shadows.
- **Avoid:** Coolors' flat full-bleed columns and always-on chrome — that's their
  brand. We keep low visual noise (controls hidden until hover/focus).

**Material 3 — HCT / tonal system** — colours defined in **HCT (hue, chroma,
tone)**; each role gets a 13-tone palette at stops 0,10,20,30,40,50,60,70,80,90,
95,98,99(+100). **Verified principle:** "contrast is guaranteed simply by picking
colours whose tone values are far enough apart."
- **Steal:** generate the default "Auto" palette as **tonal stops off a seeded
  hue**, not naive HSL lightness — what makes defaults feel designed and accessible.
- **Adapt:** map 5 swatches to 5 tone roles along one (or harmonised) hue; built-in
  tints = the **tonal ramp** of the active swatch (CS#3.3).
- **Avoid:** exposing M3 jargon — the system is the engine; the UI stays
  plain-language.

**Linear** — custom glass material; tactile feedback ("when you touch an element it
lifts up slightly, a quick pulse"); dimmer chrome so content stands out.
- **Steal:** **glass pill nav** with a **sliding active indicator**, low-noise
  chrome, "lift on press" micro-interaction on swatches.
- **Slider technique:** position the pill via measured transform offsets (not flex
  %) with a springy cubic-bezier, so it **resizes to each label width** (CS#2.1).

### 3. The concept (signature move)

**"The Tonal Frame."** A single glass pill nav pinned to the top whose inner pill
**physically slides and rubber-bands** to the active section and **morphs its width**
to the label — and below it, a palette of **rounded tonal-glass cards** that on
randomise **re-deal like cards** (fast staggered flip), each carrying a built-in
tonal ramp on its underside. The whole thing runs on **HCT tonal maths**, so every
"Auto" palette is quietly accessible-by-construction. The signature: *everything
snaps to a tonal rhythm* — nav pill snaps to label, swatch snaps to tone, tints are
the tonal ramp. That spatial+chromatic snapping is what a designer notices in 3
seconds and can't get from Coolors.

---

### 4. Concrete spec

#### A. PAGE NAV — `cs-pillnav` (CS#1, 2, 2.1)

Replaces the current `.cs-sticky-nav` / `.cs-nav-item` (global.css L221–224, L1227,
L1258–1260) and removes the **Tints** entry from `SECTIONS` (ColorStudio.jsx
L467–474) — tints now live inside the palette builder.

**Sections after change** (Tints removed): `Palette · States · Systems · Gradients ·
Visualizer` (further removals like Visualizer are later slices — keep the array
data-driven so they drop out cleanly).

**Layout & grid**
- A horizontally-centered pill, `max-width: fit-content`, pinned at the top of the
  scroll frame.
- Structure: outer **glass panel** `cs-pillnav` → a single absolutely-positioned
  **moving pill** `cs-pillnav-thumb` → a row of **buttons** `cs-pillnav-item` sitting
  above the thumb (z-index).
- Items are `inline-flex`, natural width (label + horizontal padding). The thumb is
  **not** a flex child — it's `position:absolute`, driven by JS-measured `left`/`width`.

**Pinned / sticky behaviour**
- `position: sticky; top: var(--s-3)` (12px) inside the scroll container. Sits at the
  top on load; pins as the page body scrolls.
- `z-index: 40` (above content, below modals/topbar at 98–200).
- Keep the existing click → `scrollIntoView({behavior:'smooth', block:'start'})`
  (ColorStudio.jsx L1145) and `scroll-margin-top: 100px` on each `<section>` so the
  pinned pill never overlaps the heading.

**The slide / snap / resize (CS#2 + 2.1) — core motion.** The thumb is positioned by
two CSS custom properties set in React from a `getBoundingClientRect()` measure of
the active button relative to the nav:

```
--cs-thumb-x: <activeBtn.offsetLeft>px
--cs-thumb-w: <activeBtn.offsetWidth>px
```

```css
.cs-pillnav-thumb{
  transform: translateX(var(--cs-thumb-x, 0));
  width: var(--cs-thumb-w, 0);
  transition:
    transform .42s cubic-bezier(.34,1.56,.64,1),   /* rubber-band snap */
    width     .42s cubic-bezier(.34,1.56,.64,1);
}
```

- **Easing** `cubic-bezier(.34,1.56,.64,1)` — controlled overshoot (~6% past then
  settle). Reads as physical, echoing Linear's "lift/pulse" without a toy-ish bounce.
- **Duration 420ms** — long enough to read the widest jump, short enough to stay
  responsive (settle under the 400ms Doherty threshold; the overshoot tail is sugar).
- **Resize:** width animates on the same curve, so the pill stretches/shrinks between
  short ("States") and long ("Visualizer") labels — satisfies "fit any label width."
- **Why measured offsets, not `calc(index*width)`/flex %:** labels differ in width;
  a uniform step misaligns. Measuring guarantees pixel-perfect fit at any zoom /
  font-load state.

**Re-measure on:** active-section change, mount (after fonts load — `requestAnimationFrame`
+ `document.fonts.ready` then re-measure), window `resize`, breakpoint change. Store
button refs in an array; `ResizeObserver` on the nav element is the robust choice.

**Glass recipe (theme-aware, BOTH themes)** — token-derived translucency via
`color-mix` so it tracks the live theme, no hardcoded rgba:

```css
.cs-pillnav{
  position: sticky; top: var(--s-3); z-index: 40;
  display: inline-flex; align-items: center; gap: 2px;
  margin: 0 auto var(--s-5); padding: 5px;
  max-width: fit-content;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--bg-1) 72%, transparent);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-m), var(--ring);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  backdrop-filter: blur(16px) saturate(1.4);
  isolation: isolate;            /* contain the thumb's blend */
}
```

- **Dark** (`--bg-1:#0F1012`, `--border:rgba(255,255,255,.07)`, `--ring:inset 0 1px 0
  rgba(255,255,255,.06)`): 72% near-black + blur = smoked-glass bar; inset top
  highlight gives the glass edge.
- **Light** (`--bg-1:#fff`, `--border:rgba(0,0,0,.06)`): 72% white + blur = frosted
  bar over scrolling colour. `--ring` is dark-only, so add a light fallback (below);
  in light, lean on `--shadow-m` + border, no top highlight.
- `saturate(1.4)` makes the colourful palette scrolling *behind* the bar bloom
  through the frost — the premium "real glass" tell vs a flat translucent panel.

**Items + thumb**
```css
.cs-pillnav-item{
  position: relative; z-index: 1;
  padding: 8px 16px; min-height: 36px;
  border: none; background: none; cursor: pointer;
  font-family: var(--font); font-size: 13px; font-weight: 600;
  letter-spacing: -.01em; white-space: nowrap;
  color: var(--t2);
  transition: color .2s ease;
}
.cs-pillnav-item:hover{ color: var(--t0); }
.cs-pillnav-item.active{ color: var(--accent-fg); font-weight: 700; }

.cs-pillnav-thumb{
  position: absolute; top: 5px; left: 0; z-index: 0;
  height: calc(100% - 10px);
  border-radius: var(--radius-pill);
  background: var(--brand);
  box-shadow: 0 2px 8px -2px var(--brand-glow);
  transform: translateX(var(--cs-thumb-x,0));
  width: var(--cs-thumb-w,0);
  transition: transform .42s cubic-bezier(.34,1.56,.64,1),
              width .42s cubic-bezier(.34,1.56,.64,1);
}
```

- Active label uses `--accent-fg` (`#fff`) over the `--brand` thumb. The thumb is the
  page's single Von Restorff focal element → the eye locks to "where am I." (Contrast
  notes in §6; if QA flags dark, darken the thumb base to `--accent-strong`.)

**States (nav):** Default — thumb under active section, other labels `--t2`. Hover
(non-active) — label → `--t0`, no thumb move (hover doesn't hijack the indicator;
only scroll/click does); optional 1px `--hvr` wash on the item. Focus-visible —
`outline:2px solid var(--accent); outline-offset:2px;` never stripped. Active — label
`--accent-fg` + bold, thumb beneath. Pressed — `transform: translateY(.5px)` `.1s ease`.
Scrolling — thumb follows the existing `IntersectionObserver` active section
(ColorStudio.jsx L479–489 — reuse; it sets `activeSection`, which drives the measure
effect). Loading/empty — static content, render immediately, no skeleton.

**Responsive (nav):** >768 centered fit-content, thumb animates. ≤768 the pill becomes
a **scroll-snap rail** (keep glass + thumb): `overflow-x:auto;
-webkit-overflow-scrolling:touch; scrollbar-width:none` (port from L1258–1260), items
`flex-shrink:0; scroll-snap-align:center`; on active change `scrollIntoView({inline:'center',
block:'nearest'})` then re-measure after settle (rAF); `min-height:44px` (Fitts). ≤480
font 12.5px, padding `7px 13px`, pin `top: var(--s-2)`. ≤380 padding `6px 11px`, gap 0;
keep ≥2 labels visible at rest. Reduced-motion — thumb `transition:none` → jumps
(handled globally by `data-reduced-motion`).

---

#### B. PALETTE BUILDER CORE — `cs-pb` (CS#3.1, 3.3–3.6, 3.8, 3.10, 3.15, 3.16)

Replaces the swatch block at ColorStudio.jsx L1250–1337 and the harmony row L1216–1248.
**All inline styles in that block are deleted** and re-expressed as `cs-pb-*` classes
(the current block violates the no-inline-styles rule — this rebuild fixes it).

**Engine: HCT / Material-3 tonal "Auto" (CS#3.6, 3.8)**
- **Default on open:** `mode='auto'`. Seed a hue (random 0–360), low-ish chroma jitter,
  deal **5 swatches** as 5 tone roles along that hue (optionally 2 harmonised hues for
  primary/accent). Default tone roles (from the M3 13-tone set):
  - **Primary** → tone 40 · **Secondary** → tone 60 (or ±30° sibling at tone 50) ·
    **Accent** → tone 70 (higher chroma) · **Neutral/Subtle** → tone 90 (low chroma) ·
    **Deep** → tone 20.
  - Map to the existing `ROLES = ['PRIMARY','SECONDARY','ACCENT','SUBTLE','DEEP']`
    (ColorStudio.jsx L19) — keep the labels.
- **Why tonal not HSL:** the current `randomPalette` (L520–546) uses random HSL →
  muddy, random-contrast. Tonal stops give accessible-by-construction palettes
  ("contrast guaranteed by tone distance"). Biggest quality jump; the reason Auto is
  the default.
- **Implementation:** add HCT util in `src/utils/colors.js` — `hctToHex(h,c,t)`,
  `tonalRamp(hex, stops[])`. Keep existing `hexToHsl`/`hslToHex` for manual/global-adjust
  paths. (See PM dependency note at top — use the minimal self-contained HCT port.)
  Error path: if `hctToHex` throws, fall back to HSL random + non-blocking toast; never
  white-screen.

**Layout & grid (swatch row)**
- Container `cs-pb-rail`: `display:flex; gap: var(--s-2)`; each card `flex: 1 1 0;
  min-width: 84px`; wraps on narrow screens.
- Card `cs-pb-swatch`: `min-height:160px`, `border-radius: var(--radius-l)`,
  `background:<color>`, `color: textColorForBg(<color>)`.
- **Tonal underside (CS#3.3 tints-in-generator):** bottom ~38px is a 5-step tonal ramp
  strip (`cs-pb-tints`) via `tonalRamp(color,[30,45,60,75,90])`. Always visible as thin
  bands; grows on hover to show hex labels. *This is the built-in tints — no separate
  Tints section.*

```css
.cs-pb-rail{ display:flex; gap:var(--s-2); margin-bottom:var(--s-3); flex-wrap:wrap; }
.cs-pb-swatch{
  position:relative; flex:1 1 0; min-width:84px; min-height:160px;
  border-radius:var(--radius-l); overflow:hidden;
  border:1px solid var(--border);
  display:flex; flex-direction:column; justify-content:flex-end;
  cursor:grab;
  transition: transform .18s cubic-bezier(.16,1,.3,1),
              box-shadow .18s ease, flex-basis .3s cubic-bezier(.16,1,.3,1);
}
.cs-pb-swatch:active{ cursor:grabbing; }
.cs-pb-swatch:hover{ transform: translateY(-3px); box-shadow: var(--shadow-m); } /* Linear lift */
.cs-pb-swatch.active{ outline:2px solid var(--accent); outline-offset:2px; }
.cs-pb-swatch.locked{ box-shadow: inset 0 0 0 2px color-mix(in srgb,var(--accent) 60%,transparent); }
.cs-pb-swatch-meta{ padding: var(--s-3) var(--s-3) var(--s-2); }
.cs-pb-role{ font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; opacity:.65; }
.cs-pb-hex{ font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:.02em; }
.cs-pb-tints{ display:flex; height:36px; flex-shrink:0; }
.cs-pb-tint{ flex:1; transition: filter .15s; }
.cs-pb-tint:hover{ filter: brightness(1.06); }
```

**Hover toolbar (per swatch)** — top-row floating icons, appear on `:hover`/`:focus-within`
(low-noise). Order L→R: **drag handle · lock · copy · (i) info-hook · remove(if extra)**.
Reuse current handlers (`toggleLock`, `removeExtra`, `setInfoColor`) as classed buttons.

```css
.cs-pb-tools{
  position:absolute; top:6px; left:6px; right:6px;
  display:flex; align-items:center; gap:4px;
  opacity:0; transform: translateY(-4px);
  transition: opacity .15s ease, transform .15s ease;
}
.cs-pb-swatch:hover .cs-pb-tools,
.cs-pb-swatch:focus-within .cs-pb-tools{ opacity:1; transform:none; }
.cs-pb-tool{
  width:24px; height:24px; display:grid; place-items:center;
  border:none; border-radius:50%; cursor:pointer; color:#fff;
  background: color-mix(in srgb, #000 42%, transparent);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  transition: background .15s, transform .1s;
}
.cs-pb-tool:hover{ background: color-mix(in srgb,#000 58%,transparent); }
.cs-pb-tool:active{ transform: scale(.92); }
.cs-pb-tool.locked{ background: color-mix(in srgb,#fff 28%,transparent); }
```
- Drag handle `cs-pb-tool--drag` has `cursor:grab` (whole card stays draggable too).
- **Lock** toggles the `locked` Set (existing `toggleLock` L294); icon swaps to closed
  padlock + `.locked` inset ring.
- **(i)** is the hook for the later swatch-popup slice — wire `onClick={() => setInfoColor(color)}`
  now. **Right-click hook:** `onContextMenu` on the card calls `setInfoColor` now; later
  slice swaps it for the custom menu.

**Randomise (CS#3.10)**
- **Spacebar:** keep the existing global keydown (L548–558, already guards
  inputs/textareas) → point at the new `randomize()` that respects `mode==='auto'`
  (tonal) and locks.
- **On-screen button:** primary header action `cs-pb-randomize` (`.btn-accent`) with a
  `kbd` "Space" hint; make it the biggest control in the header (Fitts).
- **Re-deal motion (signature):** unlocked cards play a fast staggered flip; locked
  cards don't (visual lock confirmation).

```css
@keyframes cs-deal{
  0%   { transform: translateY(6px) scale(.98); opacity:.4; }
  60%  { opacity:1; }
  100% { transform: none; opacity:1; }
}
.cs-pb-swatch.dealing{ animation: cs-deal .32s cubic-bezier(.16,1,.3,1) both; }
```
Stagger via index-keyed delay classes `cs-d0…cs-d5` (avoid inline custom props; or set
`animation-delay` imperatively). Max stagger across 6 = 240ms — under Doherty.

**Lock + drag-reorder (CS#3.10)** — Lock as above; locked cards survive randomise (port
L522–545 to tonal). Drag-reorder: keep HTML5 DnD handlers (`handleDragStart/Over/End`
L1260–1262) but move visual feedback to classes:
```css
.cs-pb-swatch.drag-ghost{ opacity:.4; }
.cs-pb-swatch.drag-over{ box-shadow: inset 0 0 0 2px var(--brand); transform: scale(1.03); }
```
Keyboard reorder (a11y): arrow-left/right on a focused card moves it; announce via
`aria-live`.

**Insert exact midpoint between two swatches ×1–3 (CS#3.5) — `cs-pb-gap`.** The Coolors
"hover gap → plus → keep-clicking for count" interaction. A thin interactive gap zone
between adjacent cards:

```css
.cs-pb-gap{
  position:relative; flex:0 0 var(--s-2); align-self:stretch;
  display:grid; place-items:center; cursor:pointer;
}
.cs-pb-gap-btn{
  width:26px; height:26px; border-radius:50%;
  background: var(--brand); color: var(--accent-fg);
  border:2px solid var(--bg-0);
  display:grid; place-items:center;
  opacity:0; transform: scale(.6);
  transition: opacity .15s ease, transform .2s cubic-bezier(.34,1.56,.64,1);
  box-shadow: var(--shadow-s);
}
.cs-pb-gap:hover .cs-pb-gap-btn,
.cs-pb-gap:focus-within .cs-pb-gap-btn{ opacity:1; transform: scale(1); }
```
- **Behaviour:** hover gap → `+` springs in. **Click** = insert 1 midpoint; **click again
  within 600ms** cycles 1→2→3 (a count badge `cs-pb-gap-count` shows N); release/timeout
  commits N evenly-spaced colours between the two neighbours.
- **Midpoint maths:** insert at the **exact tonal/Lab midpoint** via `mixHex(a,b,t)` at
  `t = k/(N+1)` for k=1..N (N=1 → t=.5). Lab/tonal mix avoids muddy HSL midpoints.
- **Smooth add transition (CS#3.4):** new card enters with `cs-deal` (or width grow from
  0); the rail's `gap` + `flex-basis .3s` transition slides neighbours apart smoothly.
  FLIP optional; the `flex-basis`/opacity transition is the minimum bar.

**Add colour (end) + Colour System hook (CS#3.14 — later slice)** — keep the trailing
**"+ Add"** card (`cs-pb-add`, replaces L1318–1336). The current "+ Add Colour" dropdown
(`cs-add-menu` L1168–1210) holds harmonies + brand palettes; **for Slice 1 keep it
functional** but it's the entry point that becomes the "Colour System" popup later. Wrap
the trigger so the later slice swaps the dropdown for a modal without touching the rail.
Mark harmony items as the Pro-lock attach point.

**Global adjust: Hue / Saturation / Brightness / Temperature (CS#3.15)** — a compact
strip `cs-pb-adjust` below the rail; four sliders transform the **whole palette** live.

```css
.cs-pb-adjust{
  display:grid; grid-template-columns: repeat(4, 1fr);
  gap: var(--s-4); padding: var(--s-4) var(--s-5);
  background: var(--card-grad); border:1px solid var(--border);
  border-radius: var(--radius-l); box-shadow: var(--warm-shadow);
  margin-bottom: var(--s-3);
}
.cs-pb-adjust-field{ display:flex; flex-direction:column; gap:6px; }
.cs-pb-adjust-label{ display:flex; justify-content:space-between; font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--t2); }
.cs-pb-adjust-val{ color: var(--t1); }
/* reuse global input[type=range] styling (global.css L299-300) */
```
- **Hue:** −180…+180° rotate all hues. **Saturation/Chroma:** −100…+100% scale chroma.
  **Brightness/Tone:** −100…+100 shift tone. **Temperature:** −100 (cool→blue) … +100
  (warm→amber), bias hues toward 30°/210°.
- **Non-destructive:** sliders apply as a transform layer (`globalAdjust {h,s,b,temp}`)
  over the generated/overridden base; randomise/manual-edit are the base, adjust is the
  lens. A "Reset adjust" link zeroes it. `display = applyAdjust(baseColors, globalAdjust)`;
  persist `globalAdjust` to ProjectContext alongside `palette`.
- **Behaviour:** `input` updates live (rAF-throttled, <16ms frames); commit on `change`.
- **Responsive:** ≤768 grid → 2 cols; ≤480 → 1 col stacked.

**Manual per-swatch colour set (CS#3.16)** — each card has a native `<input type="color">`
overlay (existing `editPaletteColor` L1288–1293) → keep, classed `cs-pb-edit`, triggered
from the toolbar and by clicking the hex label. Writes to `overrides[i]` (existing).
Typing a hex: editable mono input (`cs-pb-hex-input`); the inline `<input type="color">`
+ existing text-hex pattern is sufficient for Slice 1.

**Pro-lock hooks (real gates, not hidden DOM)** — per Insurances (anti-tamper =
server-gate / don't-render):
- **Harmony systems** (analogous/complement/etc.) → Pro-locked (CS#3.7). Slice 1: harmony
  buttons get a `cs-pro-lock` affordance + lock glyph and route to an upgrade popup stub
  (`onProGate('harmonies')`). **Do not compute Pro harmonies client-side for non-Pro
  users** — the generator only runs the free Auto/tonal path unless `isPro`. (Free users
  see *that* harmonies exist — the lock is the conversion driver.)
- **>6-colour randomize** → Pro (CS#3.17). Free users get up to 6 cards; the
  gap-insert/add that would create a 7th calls `onProGate('extra-colours')`. **Enforce
  the cap in the reducer, not just the UI.**
- Hooks are **function props** (`isPro`, `onProGate`) so the later paywall slice wires
  real gating without refactoring the builder.

**States (palette builder):** Default/on-open — Auto tonal, 5 cards, randomised once on
mount (CS#3.8). Loading — HCT is synchronous (no spinner); if async-imported, show 5
`cs-pb-swatch.skeleton` shimmer cards for the import frame only. Empty — can't be empty
(min 1 swatch; "Reset" restores 5). Error — `hctToHex` throw → HSL fallback + toast;
never white-screen (Murphy's-law). Hover — card lifts, toolbar + tint hexes appear.
Focus — `:focus-visible` outline, toolbar via `:focus-within`. Active — accent outline.
Locked — padlock + inset ring, excluded from randomise/adjust. Dragging — ghost + drop
ring. Reduced-motion — deal/gap-spring collapse to instant.

**Responsive (palette builder):** >768 5–6 cards in a row, gaps interactive, adjust 4-up.
≤768 cards wrap to 2 rows; in-row gap-insert works (between-row `+` hidden); adjust 2-up.
≤480 cards `flex-basis: calc(50% - var(--s-2))` (2/row), `min-height:128px`; toolbar
shown at `opacity:.85` via `@media (hover:none)`; adjust 1-up; on touch the trailing
"+ Add" card is the primary add path. ≤380 2/row holds; hide role label if cramped, keep
hex. `@media (hover:none)` reveals `cs-pb-tools` at rest.

---

### 5. Implementation notes (our stack)

**Files:** `src/pages/ColorStudio.jsx` (rebuild nav + palette-builder JSX),
`src/styles/global.css` (add `cs-pillnav-*` and `cs-pb-*`; remove/replace
`.cs-sticky-nav`/`.cs-nav-item`), `src/utils/colors.js` (add `hctToHex`, `tonalRamp`,
`applyAdjust`). No CSS-in-JS, no inline styles — the inline-heavy block L1216–1337 is
fully replaced by classes.

**SECTIONS change** (L467–474): remove `{ id:'tints', label:'Tints' }` and delete the
standalone Tints `<section id="tints">` (L1363+) — tints render inside each swatch. Keep
the `IntersectionObserver` scrollspy (L479–489); it feeds `activeSection`.

**Thumb measurement (React 19):**
```jsx
const navRef = useRef(null)
const itemRefs = useRef({})           // {sectionId: HTMLButtonElement}
const [thumb, setThumb] = useState({ x: 0, w: 0 })

const measure = useCallback(() => {
  const el = itemRefs.current[activeSection]
  if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth })
}, [activeSection])

useEffect(() => { measure() }, [activeSection, measure])
useEffect(() => {
  measure()
  document.fonts?.ready.then(measure)              // re-measure after Outfit loads
  const ro = new ResizeObserver(measure)
  if (navRef.current) ro.observe(navRef.current)
  window.addEventListener('resize', measure)
  return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
}, [measure])
```
Set the custom props on the thumb via an imperative ref `style.setProperty('--cs-thumb-x',
thumb.x+'px')` (an imperative style set, not a JSX inline-style attribute) to satisfy the
no-inline-styles rule. Document this choice for code-review.

**New CSS blocks** (kebab-case, `cs-` prefix): `cs-pillnav`, `cs-pillnav-item`,
`cs-pillnav-thumb`; `cs-pb-rail`, `cs-pb-swatch`, `cs-pb-swatch-meta`, `cs-pb-role`,
`cs-pb-hex`, `cs-pb-tints`, `cs-pb-tint`, `cs-pb-tools`, `cs-pb-tool` (+`--drag`/`.locked`),
`cs-pb-gap`, `cs-pb-gap-btn`, `cs-pb-gap-count`, `cs-pb-add`, `cs-pb-adjust`
(+`-field`/`-label`/`-val`), `cs-pb-randomize`, `cs-pb-edit`, `cs-pb-hex-input`,
`cs-pro-lock`. Keyframes `cs-deal`, `cs-shimmer`.

**Theme-aware, both themes:** all surfaces use `color-mix(in srgb, var(--bg-*) …%,
transparent)` + `var(--border)`/`var(--shadow-*)`. One exception — `--ring` (top glass
highlight) is dark-only; add a light variant:
```css
[data-theme="light"] .cs-pillnav{ box-shadow: var(--shadow-m); }
```

**State shape additions** (extend the palette state in ProjectContext sync L497–500):
`mode:'auto'|'harmony'`, `globalAdjust:{h:0,s:0,b:0,temp:0}`; persist with the rest.
`isPro` + `onProGate` come in as props from the page's auth context.

**Reduced motion:** nothing extra — `global.css` L7–8 neutralises transition/animation
durations; the thumb jumps, deals are instant. Verify the gap-spring still *appears*
(opacity) at instant timing.

### 6. Accessibility checklist

- **Nav:** `<nav aria-label="Colour Studio sections">`; items are `<button>` (scroll, not
  navigate); active item `aria-current="true"`; thumb `aria-hidden`.
- **Contrast:** active label `--accent-fg` (#fff) on `--brand` — dark #fff/#3B82F6 ≈
  3.7:1, light #fff/#2563EB ≈ 4.6:1; label is 13px **700** (AA Large; light passes full
  AA). If QA flags dark, set the dark thumb to `--accent-strong` (#2563EB) → ≈ 5.2:1.
  Inactive labels `--t2` on glass — verify ≥4.5:1, else use `--t1`.
- **Swatch hex labels:** `textColorForBg()` guarantees readable on any swatch.
- **Focus:** every interactive element keeps `:focus-visible` (never stripped). Gap `+`
  and toolbar buttons Tab-reachable with `aria-label` ("Insert colour between Primary and
  Secondary").
- **Keyboard:** Space = randomise (guarded against inputs); arrows move/reorder cards;
  Enter selects; Esc closes menus. `aria-live="polite"` announces "Palette randomised",
  "Inserted 2 colours", "Colour locked".
- **Sliders:** native `<input type="range">` with `<label>` + `aria-valuetext` ("Hue +30
  degrees"). **Lock:** `aria-pressed`. **Hit targets:** ≥44px on touch.

### 7. What NOT to do

- Don't keep the HSL randomiser as default — Auto = tonal/HCT is the whole point.
- Don't make the nav full-bleed edge-to-edge like Coolors — it must read as *our* glass
  pill inside *our* app shell.
- Don't drive the sliding thumb with `calc(index*width)`/flex % — measure.
- Don't bounce the thumb with a heavy spring — the 1.56 overshoot is the ceiling.
- Don't leave inline styles in the rebuilt JSX.
- Don't compute Pro harmonies / >6 randomize client-side for free users — gate by
  not-rendering / not-computing (anti-tamper). Slice 1 needs the hooks built as real
  gates, not hidden DOM.
- Don't animate adjust sliders without rAF-throttling.
- Don't overlap the pinned pill with section headings (`scroll-margin-top:100px`).
- Don't show the swatch toolbar at rest on desktop (low noise); do show on touch.
- Don't forget the `document.fonts.ready` re-measure — Outfit loads after first paint and
  shifts label widths.
