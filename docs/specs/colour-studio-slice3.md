# Colour Studio — Slice 3: The "Colour System" Popup (CS#3.14)

**Status:** Ready-to-build design spec.
**Depends on:** Slice 1 (`colour-studio.md`), Slice 2 (`colour-studio-slice2.md` — SHIPPED). This surface must be visually indistinguishable in chrome, motion, and dismissal behaviour from the live `cs-sw-*` swatch popup.

---

## 1. Goal & success metric

**Goal:** Turn the weakest part of the palette builder — the throwaway "+ Add Colour" dropdown (`cs-add-menu`) — into the single, confident, *named* creation surface of Colour Studio: **"Colour System."** It is where a user goes from "blank canvas" to "a coherent set of colours" in three ways: **let the system build one (Auto/Harmony), pull one from the real world (Image), or borrow a great one (Brands).**

**Primary metric:** % of new palettes that reach ≥3 committed swatches within the first session (activation). The current one-shot dropdown leaks users at the "now what?" moment; this surface removes that moment.
**Secondary:** Image-extract engagement rate (it is the signature, free, shareable interaction — the *peak* in peak–end terms), and Pro-gate impression→click on maths harmonies (loss-aversion surface).

**Why this matters behaviourally:** the add flow is the first *creative* action in the tool. Per the **aesthetic–usability effect** and the **~50ms first-impression/halo**, the quality of this one popup colours the perceived quality of the entire app. A dropdown of 12 text rows is decision fatigue (**Hick's Law**); three clearly-bounded modes is a chunked, ~3-choice decision (**Miller's Law**, **Gestalt common region**).

---

## 2. References analysed

| Reference | URL | What we borrow | What we deliberately improve |
|---|---|---|---|
| **Coolors — Image Picker** | https://coolors.co/image-picker | Image stays on screen; hover shows a magnifier loupe; click drops a point that becomes a palette swatch; HEX/RGB/HSL readout under the cursor. | Coolors' points aren't freely re-draggable after placement and have weak keyboard support. **We make every point a persistent, draggable, keyboard-nudgeable handle** with a live readout chip. |
| **Adobe Color — Extract from Image** | https://color.adobe.com/create/image | Draggable circular handles on the image, up to 5; auto-seeds a "colorful/dominant" mood; live RGB+HEX per handle. | Adobe caps at exactly 5 and hides the mood logic. **We seed with our existing kMeans (auto-placed points), let users add/remove freely up to the plan cap, and keep the math visible (luminance-sorted).** |
| **Khroma** | https://www.khroma.co/ | Per-pair **WCAG contrast badges (AA/AAA, normal vs large)** shown inline on results; "the tool tells you if it's accessible." | Khroma needs a 50-swatch training step before it's useful. **We give an instant Auto (HCT tonal) default with zero training and surface the same contrast literacy as a passive badge on each sampled colour.** |
| **Photoshop — Color Samplers / loupe** | https://helpx.adobe.com/photoshop/using/tool-techniques/eyedropper-tool.html | Up to 10 persistent samplers; pixelated loupe redraws a small pixel square at large size for per-pixel accuracy; sample-ring (new colour top / current colour bottom); Alt-click to delete. | Photoshop is expert-only and modal-heavy. **We adopt the loupe + split-ring readout but make placement a single tap and removal a visible affordance, not a hidden modifier.** |
| **Linear / Framer popovers (system register)** | (north-star, per `theme-direction.md`) | Anchored popover chrome, restrained glass, sliding tab underline, 120–600ms easing, one accent moment. | — (we inherit this directly from Slice 2). |

**The signature move:** *The image never leaves the stage.* Most palette tools treat "extract from image" as a black-box one-shot (upload → here are 5 colours → image gone). Ours keeps the photograph on screen as a **live colour instrument** the user plays — dropping, dragging, and nudging eyedropper points with a per-pixel magnifier loupe and an instant accessibility read on every sample. That is the memorable, free, screenshot-worthy moment that no competitor fully delivers, and it is the *peak* of the Colour Studio experience.

---

## 3. The concept (1–2 sentences)

**Colour System** is one popup with three chunked modes — **Generate** (Auto + harmonies), **Image** (the draggable-eyedropper instrument), **Brands** (sample a real brand's palette) — that share Slice 2's exact popup chrome, motion, and dismissal. Auto is the free, zero-config default that produces a coherent palette instantly; the maths harmonies are real, server-honoured Pro gates; and the Image mode is the free signature interaction.

---

## 4. Information architecture

### 4.1 Entry point (the rename)

In `ColorStudio.jsx`, the palette-builder trigger currently labelled **"+ Add Colour"** (the `cs-pb-add-trigger` button that opens `cs-add-menu`) is **renamed to "Colour System"** and its glyph changes from a bare `+` to a small 2×2 swatch-grid mark (signals "a system of colours," not "add one thing"). It opens the **Colour System popup** described here. The old `cs-add-menu` dropdown DOM is removed.

> Label: **"Colour System"**. Keep an `aria-label="Open Colour System"` and `aria-haspopup="dialog"`, `aria-expanded` reflecting open state.

### 4.2 Popup structure

```
cs-csys-popup            role=dialog, aria-modal=true, aria-labelledby=cs-csys-title
├─ cs-csys-grabber       (mobile bottom-sheet only; ::before pill, like cs-sw)
├─ cs-csys-head
│  ├─ h2#cs-csys-title   "Colour System"
│  └─ cs-csys-close      (× button, 40px target)
├─ cs-csys-tabs          role=tablist, sliding underline (cs-csys-tab-underline)
│  ├─ [Generate]  role=tab  aria-controls=cs-csys-panel-gen   (default)
│  ├─ [Image]     role=tab  aria-controls=cs-csys-panel-img
│  └─ [Brands]    role=tab  aria-controls=cs-csys-panel-brand
├─ cs-csys-body          (single scroll region; one panel visible)
│  ├─ #cs-csys-panel-gen    role=tabpanel
│  ├─ #cs-csys-panel-img    role=tabpanel
│  └─ #cs-csys-panel-brand  role=tabpanel
└─ cs-csys-foot          (contextual action bar; per-tab primary action)
```

**Three tabs, in this order (primacy/recency + Hick's Law):**

1. **Generate** — default. Where 80% of intent lives; placed first (primacy).
2. **Image** — the signature. Second so it's discovered, not buried.
3. **Brands** — the "borrow a known-good" shortcut; last (recency, and lowest-frequency).

**Why three, not the old twelve rows:** the dropdown forced a flat scan of pick/custom/6 harmonies/extract/6 brands — a textbook **Hick's Law** failure and **banner-blindness** risk. Collapsing into three **common-region** groups (Gestalt) makes the choice ~3-wide and lets each mode have room to be *good*.

### 4.3 Removal of the "Pick Colour" tab

The standalone single-colour native-picker row (`cs-add-menu` "Pick Colour" overlay) is **removed entirely**. Rationale:
- Manual hex / single-colour editing is already fully covered by **Slice 2's per-swatch Edit tab** (`cs-sw` popup). Two doors to the same room is redundant and dilutes this surface's identity.
- **Recommendation for where a single-colour add lives:** the **Image** and **Brands** tabs already cover "I have a specific colour in mind from the world." For "I have an exact hex," the canonical path is: add any swatch (Auto produces one instantly), then open it and use Slice 2 Edit → hex field. To make that discoverable, the **Generate** tab includes a subtle secondary affordance — a **"Custom hue"** chip (the existing free `addColor` hue-offset action) — which covers the "just give me one more, slightly different" need without resurrecting a full picker. No new single-colour picker UI is built.

---

## 5. Concrete spec

### 5.0 Shared chrome (inherited verbatim from Slice 2 `cs-sw`)

Do not invent new popup chrome. The `cs-csys-popup` shell uses the *same* recipe as `cs-sw`:

```
width: 380px;                         /* wider than cs-sw 340px: image needs canvas room */
max-width: calc(100vw - 24px);
max-height: min(620px, calc(100vh - 24px));
background: var(--bg-1);
border: 1px solid var(--border);
border-radius: var(--radius-xl);
box-shadow: var(--shadow-l), var(--ring);
animation: cs-sw-in .18s cubic-bezier(.16,1,.3,1);   /* reuse existing keyframe */
```

Anchored-popover positioning + flip algorithm: **reuse Slice 2's exact positioner** (anchor to `cs-pb-add-trigger`, prefer below-start, flip above/right on collision, clamp 12px from viewport edge). Dismissal: **Esc**, **outside click**, **route change** — all restore focus to the trigger. This is a hard consistency requirement; a user moving between the swatch popup and Colour System must feel zero seam.

### 5.1 Type scale (Outfit `--font`, mono `--mono`)

| Element | Token / size | Weight | Notes |
|---|---|---|---|
| `cs-csys-title` "Colour System" | 16px / 1.2 | 600 | matches `cs-sw` title |
| Tab labels | 13px / 1 | 550 | uppercase tracking `.02em` off (sentence case) |
| Section labels ("Harmony", "Sampled colours") | 11px / 1 | 600, `--t2`, `letter-spacing:.06em`, uppercase | eyebrow rhythm from Slice 1 |
| Body / brand names | 13px / 1.4 | 450 | `--t1` |
| HEX readouts | 12px `--mono` | 500 | tabular, `--t0` |
| Contrast badge | 10px `--mono` | 600 | AA/AAA literacy |
| Helper / Murphy copy | 12px / 1.45 | 450 | `--t2` |

Measure inside the body is naturally bounded by the 380px shell (≈40ch) — within the 45–75ch guidance for the short helper strings used here.

### 5.2 Spacing (8pt, existing `--s-*`)

- Popup padding: `--s-4` (16px) horizontal, `--s-3` (12px) vertical for head/foot.
- Tab strip height: 44px (Fitts-comfortable).
- Body scroll padding: `--s-4`.
- Grid gaps between swatch tiles: `--s-2` (8px).
- Section-to-section vertical rhythm: `--s-5` (24px).

---

### 5.3 Tab 1 — **Generate** (default, free Auto + Pro harmonies)

**Panel layout (top→bottom):**

1. **Auto preview strip** (`cs-csys-auto`): a full-width 5-tile tonal ramp produced by the existing **HCT/Material-3 `tonalRamp`** from the current base hue. Tiles are 40px tall, `--radius-m`, gapless (continuous ramp reads as "a system," per Gestalt continuity). Above it, eyebrow label **"Auto"** + a `cs-csys-free-badge` ("Free"). This renders immediately on open — **Doherty threshold**: the user sees a result in <100ms, no click required.

2. **Harmony radiogroup** (`cs-csys-harm`, `role=radiogroup`, `aria-label="Harmony"`): a 2-column chip grid of the seven modes from `HARMS`:
   - **Free, ungated:** `Auto` (selected by default), `Custom` (hue-offset), `Monochromatic` — these mirror the currently-free set in `cs-pb-harms`.
   - **Pro-gated (real gate):** `Complementary`, `Analogous`, `Triadic`, `Split`, `Tetradic`. Each renders a `cs-csys-lock` glyph (the shared `LockGlyph`) in the chip's top-right.

   Each chip shows a tiny **2–3 dot harmony diagram** (mono SVG, `--t2`) so the *relationship* is legible pre-consciously (Gestalt), not just a word. Selecting a free chip live-updates the Auto preview strip to that harmony's output.

3. **Foot action:** primary button **"Add to palette"** (`cs-csys-add`) commits the previewed ramp/harmony, respecting `checkCanAdd()` cap chokepoint. Secondary ghost link **"Custom hue"** (the `addColor` free single-add escape hatch from §4.3).

**Anti-tamper (hard requirement, consistent with Slice 1):**
The Pro-gated harmony outputs are **not computed or rendered client-side for non-Pro users**. The chip shows only the *label + lock glyph + a static diagram* — never the resulting colours. Clicking a locked chip calls `onProGate('harmonies')` and does **nothing else**; no harmony hex is ever placed into the DOM, state, or the preview strip for a non-entitled user. There is no client array of "locked colours" to inspect. The preview strip only ever shows free-tier output. Entitlement is server/`useAuth`-honoured exactly as Slice 1 specifies — the lock is a real gate, not a CSS veil over present data.

**States:**
- *default:* Auto selected, preview shown.
- *hover (chip):* `background:var(--bh)`, 120ms.
- *focus (chip):* `box-shadow: var(--ring)`, visible 2px.
- *selected:* `border-color:var(--brand)`, `--brand-glow` inner ring (the single rationed accent moment — **Von Restorff**).
- *locked hover:* lock glyph brightens to `--t1`, cursor `pointer`, tooltip "Pro" — but no colour reveal.
- *cap reached:* foot button disabled, helper "Free palettes hold up to N colours" + inline Pro link (loss-aversion framing).

---

### 5.4 Tab 2 — **Image** (the signature interaction, FREE)

This is the headline. Spec it exhaustively.

#### 5.4.1 Empty state (no image yet) — `cs-csys-drop`

A dashed-border drop zone filling the body (min-height 240px), `--bg-2`, `--radius-l`. Centre: an upload glyph, **"Drop an image, or browse"**, sub-line **"PNG, JPG, WEBP · up to 12 MB"**. The whole zone is a button (opens the existing hidden `<input type=file accept="image/*">`) *and* a drag-drop target.
- *drag-over:* border → `--brand`, `background: color-mix(in srgb, var(--brand) 8%, var(--bg-2))` via a `.is-dragover` class (no inline style), 120ms.
- **Jakob's Law:** this is the universal drop-zone pattern; no innovation here — innovation is reserved for the stage.

#### 5.4.2 Loaded state — `cs-csys-stage`

Once an image decodes, it is drawn to a `<canvas>` (`cs-csys-canvas`) that fills the body width, `object-fit: contain` logic (letterboxed in `--bg-0`), max-height 300px (desktop) so the swatch tray stays visible without scroll. **The image stays on screen** — this is the whole point.

On load we **auto-seed** points: run the existing `extractColorsFromImage(file, 5)` (kMeans) to get 5 colours, then *place 5 eyedropper points at the canvas coordinates nearest each cluster centroid* (back-map cluster → representative pixel). This gives an instant, populated, editable result (Adobe's "dominant mood," but transparent and movable). Auto-seeding is **goal-gradient**: the user starts at "5 of N," not zero (**Zeigarnik** pull to refine).

#### 5.4.3 Eyedropper points — `cs-csys-pt`

Each point is an absolutely-positioned handle over the canvas (positioned via the sanctioned **custom-property pattern**: `el.style.setProperty('--cs-x', x+'px')` / `--cs-y`; CSS consumes `left:var(--cs-x); top:var(--cs-y)` — *no inline style*).

**Visual:** a 28px ring handle (Fitts-comfortable, exceeds the 24px min touch target shrunk only visually, hit-area 44px via padding). The ring's centre fill shows the **currently sampled colour** (split-ring on hover/drag: sampled colour top, neutral grey bottom — Photoshop's neutralising ring). A 1px white + 1px black double-stroke keeps the handle visible over any photo (the classic crosshair-on-any-background trick).

**Add a point:**
- *Click/tap empty canvas* → drops a new point there, immediately sampled, committed to the tray. Up to the **plan cap** (free cap via `checkCanAdd`); seeded points count toward it. Adding past cap fires `onProGate('extra-colours')` (reusing the existing overflow gate).
- A floating **"＋ Tap image to add"** hint chip shows while count < cap.

**Drag a point:**
- *Pointer/touch drag* moves the handle; sampling updates **live** every animation frame via `getImageData(x,y,1,1)` (point sample) — see loupe below. The tray chip for that point updates in real time (**Doherty <400ms**, in practice <16ms).
- Drag is clamped to the canvas bounds. Releasing commits the final colour.

**Remove a point:**
- A small `×` appears on the handle on hover/focus (`cs-csys-pt-del`), 20px, top-right. Click/tap removes it. Keyboard: focus point → **Delete/Backspace**. Minimum 1 point enforced (can't empty the instrument; removing the last is disabled with a hint).

**Live preview readout — `cs-csys-readout`:**
A small chip that follows the active handle (above it, flipping below near the top edge) showing: swatch · **HEX** (`--mono`) · and a **contrast badge** (the Khroma-style AA/AAA read of that colour as text on the current canvas-letterbox bg, computed with existing `contrastRatio`). This is passive accessibility literacy — the tool teaches contrast while the user plays.

#### 5.4.4 Magnifier loupe — `cs-csys-loupe`

On hover/drag of a point (and on keyboard focus), a **circular loupe** (96px) appears offset from the cursor/handle. It redraws an 11×11 pixel neighbourhood from the canvas, scaled up ~8× with `image-rendering: pixelated`, with a **1px crosshair** marking the exact sampled pixel and a centre cell outline. This is the Coolors/Photoshop precision affordance — without it, per-pixel sampling on a photo is guesswork. The loupe repositions to avoid the viewport edge. Hidden when `data-reduced-motion` is set? **No** — the loupe is *function*, not decoration, so it stays; only its fade-in transition is collapsed.

#### 5.4.5 Zoom (precision on dense images)

A `cs-csys-zoom` segmented control (1× / 2×) above the stage. At 2×, the canvas is scaled and pannable (drag on empty space pans; drag on a handle moves the handle — disambiguated by hit-test). Points stay pinned to image-space coordinates (store normalized 0–1 coords, re-project on zoom/resize), so they never drift. Free feature.

#### 5.4.6 Sampled tray — `cs-csys-tray`

Below the stage: a horizontal row of the current sampled swatches (one per point), each a 36px tile with HEX on hover and a `×`. This is the bridge between "points on image" and "palette." Reordering by drag is out of scope for Slice 3 (Slice 2 owns swatch ordering).

#### 5.4.7 Commit — foot

Primary **"Add N colours"** (`cs-csys-add`, count is live) commits the tray into the palette via the same `checkCanAdd`/`addBrandColors`-style clamp path, shows the **undo toast** (reuse `handleImageExtract`'s existing undo toast), and closes the popup. Secondary ghost **"Replace image"** clears points and returns to the drop state.

#### 5.4.8 Keyboard contract for the instrument (WCAG — full parity)

This is non-negotiable and is where we beat every reference (all four cited tools are mouse-only for placement).

- The canvas is a `role="application"` region with `aria-label="Image colour sampler. Use arrow keys to move the selected point; press P to place a new point; Delete to remove."` and an `aria-describedby` pointing at a visually-hidden instructions node.
- **Tab** moves into the stage; a **roving tabindex** cycles through points (each point is focusable, `role="slider"`-like with `aria-label="Sample point N, HEX #…"` and `aria-valuetext` = the live hex + contrast).
- **Arrow keys** nudge the focused point 1px; **Shift+Arrow** 10px. Live region (`aria-live="polite"`, `cs-csys-live`) announces the new hex on settle (debounced 300ms so it doesn't spam).
- **P** (or **Enter** on the canvas) places a new point at the centre of the current viewport, then focuses it for nudging — this is the keyboard "tap to add."
- **Delete/Backspace** removes the focused point.
- The loupe follows the keyboard-focused point exactly as it follows the cursor.

---

### 5.5 Tab 3 — **Brands** (keep "From brand palette")

A 2-column grid of brand cards (`cs-csys-brand`) from the existing **`BRANDS`** array (all 10, scrollable — Google, Spotify, Stripe, Netflix, Discord, Airbnb, Slack, GitHub, Linear, Figma). Each card: brand name (13px) + the 5-swatch ramp shown as a continuous bar. **Free.**

- *hover:* card lifts (`translateY(-1px)`, `--shadow-s`), 120ms.
- *click:* selects the brand (single-select, `--brand` border) and previews its 5 colours in the foot.
- *foot:* **"Add palette"** commits via the existing `addBrandColors` (which already filters duplicates, clamps to `freeSlotsLeft()`, and fires `onProGate('extra-colours')` on overflow — reuse verbatim).
- *Per-swatch micro-affordance:* clicking an individual swatch in a card's bar adds just that one colour (covers the "I only want Stripe's purple" case — our improvement over a whole-palette-only add).

**Search/filter** is out of scope (10 brands fit a short scroll — Hick's Law says don't add a search box for 10 items).

---

### 5.6 Motion & timing

| Moment | Property | Duration | Easing |
|---|---|---|---|
| Popup enter | opacity + translateY(6px→0) + scale(.98→1) | 180ms | `cubic-bezier(.16,1,.3,1)` (reuse `cs-sw-in`) |
| Bottom-sheet enter (≤480) | translateY(100%→0) | 240ms | `cubic-bezier(.16,1,.3,1)` (reuse `cs-sheet-up`) |
| Tab underline slide | transform | 280ms | `cubic-bezier(.34,1.56,.64,1)` (rubber-band, reuse `cs-sw-tab-underline`) |
| Chip / card hover | background, transform | 120ms | `cubic-bezier(.2,0,0,1)` |
| Eyedropper drag → readout/tray | (rAF-driven, no CSS transition) | per-frame | — |
| Loupe fade-in | opacity | 120ms | `cubic-bezier(.2,0,0,1)` |
| Selected accent ring | box-shadow | 200ms | `cubic-bezier(.16,1,.3,1)` |
| Drop-zone drag-over | border-color, background | 120ms | linear |

**Reduced motion:** when the global `data-reduced-motion` attribute is present, all of the above collapse to `0.01ms` (the existing global gate), **except** the loupe and live readout, which are functional and remain — only their *fade* is removed (they appear instantly). Drag/nudge is positional, not animated, so it is unaffected.

---

### 5.7 Responsive behaviour

| Breakpoint | Behaviour |
|---|---|
| **>768 (desktop)** | Anchored popover, 380px, flip algorithm. Stage canvas max-height 300px; loupe 96px; tray single row. |
| **768–481 (tablet)** | Still anchored popover but clamp width to `min(380px, calc(100vw-32px))`; canvas max-height 260px. |
| **≤480 (mobile)** | **Bottom-sheet**, mirroring Slice 2 exactly: `align-items:flex-end`, full-width, `max-height:85vh`, `--radius-xl` top corners only, **grabber pill** (`cs-csys-grabber::before`), `--scrim` backdrop, `cs-sheet-up` entrance. Tabs become a sticky top strip. Canvas fills width, max-height 44vh. Loupe shrinks to 80px and offsets *above-left* of the thumb so the finger doesn't cover it (NN/g thumb-zone). Drag uses `touch-action:none` on the stage to prevent scroll-stealing; the sheet body scroll is locked while a point is being dragged. |
| **≤380** | Tab labels shrink to 12px; harmony chip grid stays 2-col but tighter (`--s-1` gap); brand grid → 1-col; readout chip width-clamped, HEX wraps under swatch if needed. |
| **≤320** | Foot buttons stack full-width; tray tiles 32px; loupe 72px. Nothing is hidden — only reflowed. |

**Touch specifics for the instrument:** tap-to-add, long-press-and-drag to move (250ms hold disambiguates from a tap-add so a user dragging the *image* at 2× doesn't accidentally drop points), tap the handle's `×` to delete. Hit area 44px regardless of the 28px visual. The loupe is *essential* on touch because the finger occludes the target — it always shows during a touch-drag, offset clear of the contact point.

---

## 6. Implementation notes for OUR stack

Single `global.css`, class-based, kebab-case, `cs-csys-` prefix. No CSS-in-JS, no inline styles **except** the sanctioned dynamic-value-via-custom-property pattern (point coordinates, sampled colour, loupe transform) set imperatively on refs.

### 6.1 Full class list

**Shell / chrome**
`cs-csys-popup` · `cs-csys-grabber` · `cs-csys-head` · `cs-csys-title` · `cs-csys-close` · `cs-csys-tabs` · `cs-csys-tab` · `cs-csys-tab-underline` · `cs-csys-body` · `cs-csys-panel` · `cs-csys-foot` · `cs-csys-add` · `cs-csys-ghost` · `cs-csys-free-badge` · `cs-csys-lock` · `cs-csys-live` (visually-hidden aria-live)

**Generate tab**
`cs-csys-auto` · `cs-csys-auto-tile` · `cs-csys-harm` · `cs-csys-harm-chip` · `cs-csys-harm-diagram` · (state: `.is-selected`, `.is-locked`)

**Image tab**
`cs-csys-drop` (`.is-dragover`) · `cs-csys-stage` · `cs-csys-canvas` · `cs-csys-zoom` · `cs-csys-pt` (`.is-active`, `.is-dragging`) · `cs-csys-pt-ring` · `cs-csys-pt-del` · `cs-csys-readout` · `cs-csys-readout-hex` · `cs-csys-readout-badge` · `cs-csys-loupe` · `cs-csys-loupe-canvas` · `cs-csys-loupe-cross` · `cs-csys-tray` · `cs-csys-tray-tile` · `cs-csys-hint` · `cs-csys-state` (Murphy container: `.is-loading`, `.is-error`, `.is-offline`)

**Brands tab**
`cs-csys-brand` (`.is-selected`) · `cs-csys-brand-name` · `cs-csys-brand-bar` · `cs-csys-brand-sw`

### 6.2 Key rules (illustrative, the load-bearing ones)

```css
/* Shell — inherits Slice 2 recipe, only width differs */
.cs-csys-popup{
  width:380px; max-width:calc(100vw - 24px);
  max-height:min(620px, calc(100vh - 24px));
  background:var(--bg-1); border:1px solid var(--border);
  border-radius:var(--radius-xl);
  box-shadow:var(--shadow-l), var(--ring);
  display:flex; flex-direction:column;
  animation:cs-sw-in .18s cubic-bezier(.16,1,.3,1);
}

/* Dynamic point — coordinate via custom property, NOT inline style */
.cs-csys-pt{
  position:absolute;
  left:var(--cs-x); top:var(--cs-y);
  transform:translate(-50%,-50%);
  width:28px; height:28px;
  padding:8px;                 /* expands hit area to 44px */
  background-clip:content-box;
  touch-action:none;
}
.cs-csys-pt-ring{
  background:var(--cs-c);      /* sampled colour via custom property */
  box-shadow:0 0 0 1px #000, 0 0 0 2px #fff; /* visible on any photo */
}

/* Loupe — pixelated zoom for per-pixel accuracy */
.cs-csys-loupe-canvas{ image-rendering:pixelated; }

/* Selected accent — the single rationed brand moment */
.cs-csys-harm-chip.is-selected{
  border-color:var(--brand);
  box-shadow:inset 0 0 0 1px var(--brand), 0 0 0 3px var(--brand-glow);
}

/* Mobile bottom-sheet — mirror Slice 2 exactly */
@media (max-width:480px){
  .cs-csys-popup{
    position:fixed; inset:auto 0 0 0; width:100%;
    max-width:100%; max-height:85vh;
    border-radius:var(--radius-xl) var(--radius-xl) 0 0;
    animation:cs-sheet-up .24s cubic-bezier(.16,1,.3,1);
  }
  .cs-csys-grabber::before{ /* pill — copy cs-sw grabber */ }
}

/* Reduced motion — global gate already collapses transitions;
   loupe/readout remain functional, only fades removed */
[data-reduced-motion] .cs-csys-loupe{ transition:none; }
```

### 6.3 State / engine wiring

- **Reuse** `extractColorsFromImage(file, 5)` from `src/utils/extractColors.js` for auto-seeding (kMeans). Add one small helper to **back-map a cluster colour to its nearest representative pixel coordinate** so seeded points land on real image locations.
- **New:** a per-frame point sampler — draw image once to an offscreen canvas at natural resolution; `getImageData(px,py,1,1)` on drag/nudge. Store point coords **normalized 0–1** so they survive zoom/resize/letterbox.
- **Reuse** `contrastRatio` / `textColorForBg` (`src/utils/colors.js`) for readout badges.
- **Reuse** `tonalRamp` / `hctToHex` for the Auto preview; reuse the existing harmony handlers (`addComplement`, `addAnalogous`, `addTriadic`, `addSplitComp`, etc.) for free outputs only.
- **Reuse** `checkCanAdd`, `freeSlotsLeft`, `addBrandColors`, `onProGate`, and the existing undo-toast from `handleImageExtract` for commits and gating.
- **Pro gate:** locked harmony chips call `onProGate('harmonies')`; locked overflow calls `onProGate('extra-colours')`. **No locked colour is ever computed or placed in state/DOM for non-Pro users** (anti-tamper, §5.3).

### 6.4 Files touched (advisory — engineering implements)

- `src/pages/ColorStudio.jsx` — rename trigger, remove `cs-add-menu` + "Pick Colour" overlay, add `<ColourSystemPopup>` (or inline) with the three tabs and the canvas instrument.
- `src/styles/global.css` — append the `cs-csys-*` block (after the `cs-sw-*` block for locality).
- `src/utils/extractColors.js` — add cluster→coordinate back-map helper. (No change to kMeans behaviour.)
- **No auth/Stripe files touched.** The Pro gate uses the existing `onProGate` / `useAuth` entitlement read only — **flag to founder per Human Validation Zones if any change to the entitlement check itself is proposed; this spec proposes none.**

---

## 7. Accessibility checklist (WCAG 2.2 AA)

- **Dialog semantics:** `role=dialog`, `aria-modal=true`, `aria-labelledby=cs-csys-title`. **Focus trap** on open; focus lands on the active tab. Esc / outside-click / route-change close and **restore focus to the trigger**.
- **Tabs:** `role=tablist` / `role=tab` / `role=tabpanel`, **roving tabindex**, Left/Right arrows switch tabs, `aria-selected` reflects state.
- **Harmony chips:** `role=radiogroup` / `role=radio`, Arrow-key selection, `aria-checked`. Locked chips are `aria-disabled` with an `aria-label` ending "— Pro" and do not change state on activation.
- **Image instrument:** canvas `role=application` with describedby instructions; points are focusable slider-like elements with live `aria-valuetext` (hex + contrast); **full keyboard** add (P/Enter), nudge (arrows / Shift+arrows), remove (Delete). `aria-live=polite` announces sampled hex on settle (debounced).
- **Contrast:** all chrome text on `--bg-1` meets AA (existing tokens are AA-verified). Readout badge explicitly *reports* the sampled colour's contrast (≥4.5 normal / ≥3 large) so users don't ship inaccessible palettes — accessibility as a feature.
- **Targets:** every interactive element ≥44px hit area (handles padded, close button 40px, chips ≥44px tall). Meets WCAG 2.2 **Target Size (Minimum)**.
- **Focus visible:** `--ring` on every focusable; never removed. Point handles show a high-contrast focus ring over any photo (double-stroke + `--ring`).
- **Reduced motion:** honours global `data-reduced-motion`; functional loupe/readout retained, decorative motion removed.
- **Drag alternatives:** WCAG 2.2 **Dragging Movements** — every drag (place/move point, pan at 2×) has a non-drag keyboard equivalent (P to place, arrows to move, zoom buttons). Brand/harmony selection is click/keyboard, never drag-only.
- **Colour not sole channel:** Pro state uses lock *glyph + label*, not colour; selected state uses ring *and* `aria-checked`.

---

## 8. What NOT to do (traps for this surface)

- **Don't** keep the flat 12-row dropdown or re-introduce a standalone single-colour picker tab — that's the redundancy and Hick's-Law failure we're removing.
- **Don't** render or compute Pro-harmony colours client-side "but hidden/blurred." That's an inspect-element bypass and violates the Slice 1 anti-tamper contract. The lock is real and server-honoured.
- **Don't** make the image a one-shot extract that disappears. The persistent, playable stage *is* the product differentiator — losing it loses the whole concept.
- **Don't** ship the eyedropper as mouse-only. Every cited competitor fails keyboard placement; matching them is not the bar. Full keyboard parity is the bar.
- **Don't** invent new popup chrome, easings, or a new scrim. Reuse `cs-sw` chrome, `cs-sw-in`/`cs-sheet-up`/`cs-sw-tab-underline` keyframes, and `--scrim`. Seam-free consistency with Slice 2 is a feature.
- **Don't** over-accent. One `--brand` moment per view (the selected chip/card). No neon glow on the loupe, no gradient on every tile — that's the "AI slop" register `theme-direction.md` forbids.
- **Don't** add a search box to 10 brands or a sample-size dropdown to the loupe — restraint over options.
- **Don't** let the canvas drag steal page scroll on mobile (`touch-action:none` on the stage; lock sheet scroll mid-drag) or let the finger occlude the sample (loupe offset clear of contact).
- **Don't** block the UI during decode — show the skeleton/spinner (Murphy below), never a frozen popup (Doherty threshold).

### Murphy's-law states (Image tab) — all required

| State | Trigger | UX |
|---|---|---|
| **Loading / decoding** | file selected, decode in progress | `cs-csys-state.is-loading`: shimmer skeleton over the stage + "Reading image…"; foot disabled. |
| **Empty / no image** | tab opened, nothing dropped | the `cs-csys-drop` zone (§5.4.1) — never a blank canvas. |
| **Invalid type** | non-image dropped | inline error: "That's not an image. Try PNG, JPG, or WEBP." Drop zone shakes (120ms, reduced-motion: no shake, just colour). |
| **Too large** | file > 12 MB | "Image is over 12 MB. Try a smaller one." (We downscale to 150px internally anyway, but reject huge uploads pre-decode to avoid jank.) |
| **Decode error** | corrupt / unsupported codec | "Couldn't read that image. Try another file." + "Choose another" button. |
| **Offline** | commit attempted with no connection | colours are sampled client-side so sampling still works; only persistence is queued — toast "Saved locally, will sync when you're back online" (consistent with app offline behaviour). The instrument itself never requires network. |
| **Zero usable pixels** | all-transparent / all-white image | kMeans returns nothing → "We couldn't find distinct colours in that image" + keep the image up so the user can still place points manually. |

---

## 9. Rationale (per major decision)

- **Three chunked tabs over a 12-row menu** — Hick's Law + Miller's chunking + Gestalt common region. The old menu was a flat scan; three bounded modes is a ~3-choice decision and gives each mode room to be excellent.
- **Auto renders instantly, no click** — Doherty threshold + aesthetic–usability: a coherent result in <100ms makes the tool feel intelligent and earns the halo for everything after.
- **Image stays on screen as a playable instrument** — the signature move; Coolors/Adobe/Photoshop each do *part* of this, none do all of it with full keyboard support (refs §2). Peak–end rule: this is the engineered *peak* of Colour Studio.
- **Loupe + split-ring readout** — Photoshop/Coolors precedent; per-pixel sampling on a photo is impossible without magnification. Function, not decoration, so it survives reduced-motion.
- **Auto-seed 5 points via existing kMeans** — goal-gradient + Zeigarnik: starting at "5 of N, now refine" pulls completion harder than a blank canvas, and reuses shipped code (extractColors.js).
- **Contrast badge on every sample** — Khroma precedent; turns the tool into a passive accessibility teacher and prevents users shipping inaccessible palettes (accessibility-as-feature).
- **Real, server-honoured Pro gate on maths harmonies** — Slice 1 contract + loss-aversion framing; the lock is a genuine entitlement gate, never a DOM veil over present data, so it's not inspect-element-bypassable.
- **Remove the standalone picker, route single-add through Slice 2 Edit + a "Custom hue" chip** — one door per job; eliminates redundancy and sharpens this surface's identity. Single-colour editing already lives, well, in Slice 2.
- **Reuse cs-sw chrome / keyframes / scrim verbatim** — Jakob's Law (internal consistency is a kind of familiarity); a seamless move between the swatch popup and Colour System reinforces the premium, systemic feel.
- **Bottom-sheet at ≤480 mirroring Slice 2** — NN/g thumb-zone; the grabber + flex-end + 85vh pattern is already learned by users in this app.
- **One rationed `--brand` accent (selected state only)** — Von Restorff + theme-direction's "one accent moment per view"; the singular highlight is what's remembered, and restraint is what reads as premium.

---

**Sources:**
- [Coolors — Image Picker](https://coolors.co/image-picker)
- [Adobe Color — Extract Theme from Image](https://color.adobe.com/create/image)
- [Khroma — AI Color Tool for Designers](https://www.khroma.co/)
- [Khroma — How it works / training](https://www.khroma.co/train)
- [How Khroma Uses Machine Learning to Create Endless Color Palettes (DeMagSign)](https://medium.com/demagsign/how-khroma-uses-machine-learning-to-create-endless-color-palettes-c00fff9247ed)
- [Photoshop — Sample image colors with the Eyedropper tool (Adobe Help)](https://helpx.adobe.com/photoshop/using/tool-techniques/eyedropper-tool.html)
- [Julieanne Kost — The Eyedropper, Color Samplers, and Info Panel in Photoshop](https://jkost.com/blog/2018/03/the-eyedropper-color-samplers-and-info-panel-in-photoshop-cc.html)
