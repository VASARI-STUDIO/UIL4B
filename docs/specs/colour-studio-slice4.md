# Colour Studio — Slice 4: High-Quality UI Previews + Pro-Gated Previews (CS#3.2)

**Status:** Ready-to-build design spec.
**Depends on:** Slice 1 (`colour-studio.md`), Slice 2 (`colour-studio-slice2.md` — SHIPPED), Slice 3 (`colour-studio-slice3.md` — SHIPPED). This slice **replaces** the existing inline-styled "Palette Visualizer" section (`ColorStudio.jsx` §SECTION 5, lines ~3169–3346) wholesale. It must inherit the anti-tamper render contract and spec discipline established in Slice 3 §5.3 / §8 exactly.

> Network note: external reference sites were not re-fetched in this session; the analysis below is from current, verified knowledge of these named, stable exemplars (Realtime Colors, Coolors Visualizer, Material Theme Builder). No fetch is claimed that did not happen.

---

## 1. Goal & success metric

**Goal:** Turn swatches into a *product the user can see themselves shipping*. The current Visualizer renders tiny 240px-tall toy mockups built from `<div>` bars with inline styles — they read as placeholder wireframes, not as "my palette in a real interface." Slice 4 replaces them with full, believable UI scenes (a marketing hero, an app dashboard, a mobile feed, a typographic article) that consume the live palette through a disciplined role-mapping, plus **Pro-gated premium scenes** that are a genuine, inspect-element-proof conversion surface.

**Primary metric:** Visualizer scroll-depth → **Pro-gate impression rate** on the locked scenes, and locked-scene → upgrade-CTA click-through. This is the loss-aversion moment of the whole tool: the user has just built something beautiful and now sees two more gorgeous scenes they *can't* have. That is the engineered conversion peak.

**Secondary:** time-in-section (engagement / aesthetic–usability halo) and "does the palette survive a contrast sanity check on real UI" (the previews double as an accessibility proof — a user watching their CTA go illegible is far more persuasive than a number).

**Why this matters behaviourally:** Per the **~50ms first-impression + halo effect** and the **aesthetic–usability effect**, a designer judges UIL4B's craft by *this* surface more than any other — it's the one place the tool shows it understands real interfaces, not just hex codes. **Peak–end rule:** the Visualizer is the end of the palette-building scroll (immediately before the "Continue to Typography" CTA), so its quality is disproportionately remembered. **Von Restorff / loss aversion:** the locked Pro scenes are the distinct, desirable thing the free user is denied — the single most effective spot in Colour Studio to drive an upgrade.

---

## 2. References analysed

| Reference | What we borrow | What we deliberately improve |
|---|---|---|
| **Realtime Colors** (realtimecolors.com) | The signature move: a *single, full, believable* marketing/app scene (nav + hero + testimonial + pricing) that recolours **live** as you change the palette. Real type at real sizes, real layout — not thumbnails. The recolour *is* the demo. | Realtime Colors uses exactly 4 roles (text / bg / primary / secondary / accent) applied globally, which can blow out contrast on extreme palettes. **We add a lightness-sorted role-derivation with a per-surface AA guarantee** (§5.3) so the scene never goes illegible, and we offer *four distinct scene archetypes*, not one. |
| **Coolors — Visualizer / "Explore" mockups** (coolors.co/visualizer) | A small gallery of distinct real-context scenes (dashboard, e-commerce, article, app) so the user sees the palette across contexts, not one layout. | Coolors' mockups are static photographic templates with a fixed colour-count assumption and no Pro tiering inside the visualizer. **Ours are vector/CSS scenes (crisp at 4K, no image weight), role-mapped to survive any palette length, and tiered (free + Pro) as a conversion surface.** |
| **Material Theme Builder** (m3.material.io / Theme Builder) | The discipline of **semantic roles** (primary / on-primary / surface / on-surface / outline) derived from a seed, with guaranteed tonal separation so on-colour text is always legible by construction. | Material Theme Builder is engineering-facing and visually clinical. **We keep the role rigor but spend it on editorial, premium scenes (Linear/Stripe-grade), and we expose the role mapping as a quiet legend so the user learns *why* colour X became the CTA.** |
| **Stripe / Linear / Framer marketing pages** (north-star, per `theme-direction.md`) | Editorial hero composition, gradient lighting, generous type scale, one focal CTA, restrained accent. The "premium SaaS landing" register the hero scene must hit. | We adapt the *composition*, recoloured by the user's palette, as a believable template — the user instantly imagines their brand at Stripe's level. |

**The signature move:** *The palette stops being swatches and becomes a shipped product.* Realtime Colors proves a live-recoloured full scene is hypnotic; Material proves semantic roles keep it legible; Coolors proves variety sells. We fuse all three into **vector scenes that recolour live, never break contrast, work at 4K with zero image weight, and end on a locked premium scene that is the conversion peak** — and the locked content is *genuinely never rendered*, so it can't be inspect-elemented out (our hard differentiator over every blur-based "pro preview" on the market).

---

## 3. The concept (1–2 sentences)

A **"See it shipped" Previews** section that renders the user's live palette inside four full, believable, vector UI scenes — **two free** (Marketing Hero, App Dashboard) and **two Pro-locked** (Mobile Feed, Editorial Article) — each driven by a single deterministic **palette-role mapping** with a built-in WCAG-AA safety net so the scene stays legible for *any* palette. For non-Pro users the locked scenes render **only a generic, palette-free static placeholder** (the user's colours are never computed or placed in the DOM for those scenes), topped with a lock badge and a closing upgrade CTA.

---

## 4. Information architecture & where it mounts

### 4.1 Mount point

This **replaces** the entire `<section id="visualizer">` block in `ColorStudio.jsx` (the IIFE at ~3177–3345 and its inline-styled mockups). It keeps:

- the **section `id="visualizer"`** (so the existing `SECTIONS`/IntersectionObserver pill-nav, line ~1524–1545, and its "Visualizer" label keep working with no other change),
- the existing **collapsible `cs-section-header`** pattern (chevron + `toggleCollapse('visualizer')`), and
- its position: **last content section**, immediately before `cs-next-step` ("Continue to Typography"). This placement is deliberate — **peak–end** + **serial-position recency**.

Rename the visible `<h2>` from "Palette Visualizer" to **"See it shipped"** with sub-label **"Your palette inside real interfaces."** (Editorial naming over generic "Visualizer" — it sells the *outcome*.)

### 4.2 Section structure

```
section#visualizer  .cs-pv                      (Previews root)
├─ .cs-section-header  (reused — chevron + h2 "See it shipped" + sublabel)
└─ .cs-pv-body                                  (hidden when collapsed.visualizer)
   ├─ .cs-pv-legend        role=group, aria-label="How your palette maps to the UI"
   │   └─ .cs-pv-legend-item × N  (role chip: dot + role name + hex)   ← teaches the mapping
   ├─ .cs-pv-grid          (the scene cards)
   │   ├─ .cs-pv-scene  data-scene="hero"   (FREE)
   │   ├─ .cs-pv-scene  data-scene="app"    (FREE)
   │   ├─ .cs-pv-scene.is-locked  data-scene="mobile"   (PRO)
   │   └─ .cs-pv-scene.is-locked  data-scene="article"  (PRO)
   └─ .cs-pv-upsell        (closing upgrade CTA — only rendered when !isPro)
```

**Scene order (Miller's chunking + primacy/recency):** Hero (free, the strongest first impression) → Dashboard (free) → Mobile (Pro) → Article (Pro). Free scenes first so the section delivers value before it asks; the two locked scenes are the recency-weighted "what you're missing" finale, flowing into `.cs-pv-upsell`.

### 4.3 The role legend (signature literacy device)

Above the grid, a compact horizontal legend shows the derived semantic roles and which hex fills each — e.g. `● Background #0A0B0D · ● Surface … · ● Primary/CTA … · ● Text … · ● Accent …`. This is the Material-Theme-Builder "you can see the role logic" move, adapted as a quiet teaching layer (most palette tools hide it). It answers the user's pre-conscious question *"why did my third colour become the button?"* and makes the previews feel intelligent rather than arbitrary. On Pro-locked scenes the legend still reflects the **free** palette mapping (the locked scenes don't add roles).

---

## 5. The palette-role mapping (the engine — read this twice)

Every scene consumes **one shared, pure, deterministic role object** derived from `allColors` (the live, post-adjust palette). Compute it once per render in the page and pass it down; never let a scene invent its own mapping. This is what keeps four scenes coherent and legible.

### 5.1 Derivation algorithm (`derivePreviewRoles(allColors, theme)`) — new pure helper

Roles are derived by **lightness sorting + chroma ranking**, *not* by raw index, so the mapping stays sensible as the palette changes order or length:

1. **Compute WCAG luminance** for each colour via the existing `luminance()` / `contrastRatio()` from `colors.js`. Sort a working copy by luminance.
2. **`bg` (page background):** the **darkest** palette colour *if* the scene is dark-mode, else the **lightest**. Each scene declares its own mode (`hero` = dark, `app` = light, `mobile` = light, `article` = light) so we exercise the palette in both. (Rationale: a palette must look good on both light and dark UI; forcing all-light hides failures.)
3. **`surface` (cards/panels):** one tonal step off `bg` toward the opposite end — derived with the existing `mixHex(bg, opposite, 0.06–0.10)` so surfaces read as *raised from the same material*, never a random palette colour. This is the Material "surface is tonal, not chromatic" rule and is what stops the scenes looking like a clown suit.
4. **`primary` (CTA / brand fill):** the palette colour with the **highest chroma** (most saturated) that **also** clears **≥3:1 against `surface`** (so the button is visible) — found by ranking candidates and taking the first that passes. This is the colour the eye should land on (**Von Restorff**), so it must be the most vivid *usable* one.
5. **`accent` (secondary highlights, links, tags):** the **next** highest-chroma colour distinct from `primary` (≥ a small hue/Δ distance so they don't collide). Falls back to `mixHex(primary, accentSeed, .5)` if the palette has only one chromatic colour.
6. **`text` (body copy on `bg`):** **not** taken from the palette. Computed for legibility: `textColorForBg(bg)` gives the base near-black/near-white; we then *tint* it ~8% toward `primary` via `mixHex` for warmth, **only if** the tinted result still clears **≥7:1** on `bg` (else use the untinted value). Text is a *function of contrast*, never a swatch — this is the single most important rule for not shipping illegible scenes.
7. **`muted` (secondary text, captions, borders):** `mixHex(text, bg, 0.45)` clamped so it still clears **≥4.5:1** on `bg`; `border` = `mixHex(text, bg, 0.86)` (a hairline). Derived, not from the palette.
8. **`onPrimary` (label on the CTA):** `textColorForBg(primary)` — guaranteed legible black/white on the button.

### 5.2 The AA safety net (Murphy-proofing the mapping)

After derivation, **validate and self-heal** before any scene renders:

- If `contrastRatio(text, bg) < 7` → fall back `text` to pure `#FFFFFF`/`#0A0B0D` (whichever wins) — body copy AA-large is non-negotiable.
- If `contrastRatio(onPrimary, primary) < 4.5` → `onPrimary = fixForeground(onPrimary, primary, 4.5)` (reuse the existing HCT binary-search nudger from `colors.js`).
- If `contrastRatio(primary, surface) < 3` (CTA invisible on its card) → derive a `primaryBorder = mixHex(primary, text, .35)` and the scene gives the CTA a 1px border so it never disappears on a low-contrast palette.
- If the palette yields **no** colour with chroma above a threshold (an all-grey palette) → `primary` and `accent` both fall back to `--brand` tokens so the scenes still have a focal colour (the user sees *a* button, just our brand blue, with a quiet legend note "add a saturated colour to brand the CTA").

**Net guarantee:** for *any* `allColors` array (1 colour, 12 colours, all-white, all-black, all-grey, neon), every scene renders with legible text, a visible CTA, and a sensible surface. The previews can never produce an unreadable or broken-looking screen. This is the bar Realtime Colors misses and our differentiator.

### 5.3 Why derive instead of index-map (the trap we avoid)

The *old* visualizer did `pri = allColors[0]; sec = allColors[1]; acc = allColors[2]` and hard-coded `#fff` card backgrounds. That breaks the instant a user's `allColors[0]` is light, or they have 2 colours, or a dark palette — text on `#fff` cards with a light primary is invisible, and the scene ignores the user's actual background colour entirely. Luminance/chroma derivation + the safety net is the fix. **Do not reintroduce index mapping.**

---

## 6. The four scenes (full spec)

All scenes are **CSS/vector** (divs, gradients, text, inline SVG icons) — **no `<img>`, no canvas** — so they are razor-sharp from 320px to 4K with zero asset weight, and recolour instantly. Each scene is a `.cs-pv-scene` card: `--bg-1` chrome frame, `var(--border)`, `var(--radius-l)`, `var(--warm-shadow), var(--ring)`, `overflow:hidden`. A small **scene chrome bar** (`.cs-pv-scene-head`) labels it (e.g. "Marketing site") in the existing 10px uppercase `--t2` eyebrow style. The **scene canvas** (`.cs-pv-canvas`) is where the palette lives, set via custom properties on the canvas ref (see §8).

Each scene's recoloured surfaces read their colours from CSS custom properties scoped to `.cs-pv-canvas`: `--pv-bg`, `--pv-surface`, `--pv-primary`, `--pv-on-primary`, `--pv-accent`, `--pv-text`, `--pv-muted`, `--pv-border`. The React component sets these eight props on the canvas element (the sanctioned dynamic-value-via-custom-property pattern, exactly like `cs-sw-bg`/`cs-csys-x`). **No inline `style` attribute on scene markup.**

### 6.1 Scene A — Marketing Hero (FREE, dark mode) `data-scene="hero"`

The Stripe/Linear-grade landing hero. Composition top→bottom:

- **Nav bar:** wordmark dot (`--pv-primary`) + brand text (`--pv-text`), 3 nav links (`--pv-muted`), a pill CTA (`--pv-primary` fill, `--pv-on-primary` label).
- **Hero block:** an eyebrow tag (`--pv-accent` text on `--pv-accent` @ 12% bg), a **large headline** (2 lines, `--pv-text`, the type star of the section — see §7), a sub-paragraph at a 60ch measure (`--pv-muted`), and a **CTA row**: primary button (`--pv-primary`/`--pv-on-primary`) + ghost button (`--pv-text` label, `--pv-border` outline).
- **Gradient lighting:** a soft radial glow behind the headline using `radial-gradient` from `color-mix(in srgb, var(--pv-primary) 18%, transparent)` to transparent — the premium "depth & light" device, derived from the palette, not a fixed neon. One glow only (restraint).
- **Logo strip / social proof:** a row of 4 muted wordmark blocks (`--pv-muted` @ low opacity) — the "trusted by" band that every premium SaaS hero uses (social proof cue).

Maps: `bg→--pv-bg` (page), `surface→`nav glass, `primary→`CTA + wordmark, `accent→`eyebrow tag, `text→`headline, `muted→`body/links.

### 6.2 Scene B — App Dashboard (FREE, light mode) `data-scene="app"`

The "your palette as a real product" shell. Layout: a **left sidebar** (`--pv-surface`, icon nav, active item highlighted `--pv-primary` @ 12% bg with `--pv-primary` icon), a **top bar** (page title `--pv-text`, a primary action button), and a **content grid**: three **KPI stat cards** (`--pv-surface`, big number `--pv-primary`/`--pv-text`, label `--pv-muted`, a tiny trend chip `--pv-accent`), and a **bar/area chart** where bars are `--pv-primary` with one peak bar `--pv-accent` (the Von Restorff highlight). Borders all `--pv-border`. This proves the palette works in a data-dense, light-mode app context — the inverse of the dark hero, so the user sees both ends.

### 6.3 Scene C — Mobile Feed (PRO-LOCKED, light mode) `data-scene="mobile"`

*Real content for this scene is Pro-only and must never be computed/rendered for non-Pro users — see §9.*

When **isPro**: a centred **phone frame** (`--pv-bg` device chrome, `--pv-surface` screen) containing a status bar, a header (avatar `--pv-accent`, title `--pv-text`), a **card feed** of 3 content cards (`--pv-surface`, image-block placeholder filled with a `--pv-primary`→`--pv-accent` gradient at low opacity, title `--pv-text`, body `--pv-muted`, a "like/save" row where the active icon is `--pv-primary`), a floating **FAB** (`--pv-primary`/`--pv-on-primary`), and a bottom tab bar (active tab `--pv-primary`, rest `--pv-muted`). This is the "consumer app" register the dashboard doesn't cover.

### 6.4 Scene D — Editorial Article (PRO-LOCKED, light mode) `data-scene="article"`

*Real content Pro-only — see §9.*

When **isPro**: a typographic blog/article layout — a category kicker (`--pv-accent`), a **serif-scale headline** (`--pv-text`), byline + date (`--pv-muted`), a hero rule/divider (`--pv-primary`), then **two columns of body text** at a 66ch measure (`--pv-text` body, `--pv-muted` captions), a **pull-quote** block (`--pv-surface` bg, `--pv-primary` left-border, `--pv-text` quote), and an inline **link colour demo** (links rendered in `--pv-accent` with underline). This is the only scene that stress-tests the palette as *long-form reading colour* — the contrast-critical case, and a beautiful one.

---

## 7. Type scale & spacing

Type **is** the design here — the hero headline and article are where the section earns "premium." Outfit (`--font`) throughout; mono (`--mono`) only for the legend hex chips.

| Element | Size / line-height | Weight | Token colour |
|---|---|---|---|
| Section `h2` "See it shipped" | 18px / 1.2 | 700 | `--t0` (reuses existing section header) |
| Section sublabel | 10px / 1.4, `.06em`, uppercase | 600 | `--t2` |
| Legend role name | 10px / 1, `.04em`, uppercase | 700 | `--t1` |
| Legend hex | 10px `--mono` / 1 | 500 | `--t2` |
| Scene head eyebrow | 10px / 1, `.08em`, uppercase | 700 | `--t2` |
| **Hero headline** | clamp **22px → 30px** / 1.1, `-.02em` | 800 | `--pv-text` |
| Hero sub-paragraph | 12px / 1.55, ≤60ch | 450 | `--pv-muted` |
| Hero / app button label | 11px / 1 | 650 | `--pv-on-primary` |
| App KPI number | 22px / 1 | 800 | `--pv-primary` |
| App label / caption | 9px / 1.3 | 500 | `--pv-muted` |
| **Article headline** | clamp **18px → 24px** / 1.15, `-.015em` | 750 | `--pv-text` |
| Article body | 11.5px / **1.7** (long-form rhythm), 66ch | 450 | `--pv-text` |
| Article pull-quote | 14px / 1.4 | 600 | `--pv-text` |

**Spacing (8pt, existing `--s-*`):** section vertical rhythm `--s-7` (48px) below; legend→grid gap `--s-5`; grid gap `--s-4` (16px); scene-internal padding `--s-4`; scene-internal element rhythm `--s-2`/`--s-3`. Scenes have a **fixed aspect frame** (`aspect-ratio: 16/10` on the canvas) so the grid stays tidy and each scene has consistent breathing room regardless of content — no arbitrary `height:240px`.

---

## 8. Implementation notes for OUR stack

Single `global.css`, kebab-case, **`cs-pv-` prefix** (Colour Studio · Previews — a new, scoped prefix consistent with the `cs-*` family; flagged as new below). No CSS-in-JS, no inline styles **except** the sanctioned eight custom-property assignments on each scene's canvas ref.

### 8.1 React structure (replaces the old IIFE)

```
<section id="visualizer" className="cs-pv">
  <header className="cs-section-header" onClick={()=>toggleCollapse('visualizer')}> … h2 + sublabel … </header>
  {!collapsed.visualizer && (
    <div className="cs-pv-body">
      <PreviewLegend roles={roles} />
      <div className="cs-pv-grid">
        <PreviewScene scene="hero"  roles={roles} />
        <PreviewScene scene="app"   roles={roles} />
        <PreviewScene scene="mobile"  locked={!isPro} roles={isPro ? roles : null} onUpgrade={…} />
        <PreviewScene scene="article" locked={!isPro} roles={isPro ? roles : null} onUpgrade={…} />
      </div>
      {!isPro && <PreviewUpsell onUpgrade={…} />}
    </div>
  )}
</section>
```

`roles = useMemo(() => derivePreviewRoles(allColors, …), [allColors])` — computed **once** in `ColorStudio` and passed down. `derivePreviewRoles` is a **new pure helper** added to `src/utils/colors.js` (it only uses existing `luminance`, `contrastRatio`, `mixHex`, `textColorForBg`, `fixForeground`, `hexToHsl` — no new dependency).

**Setting the canvas colours (no inline style):** inside `PreviewScene`, a `useLayoutEffect` on the canvas ref:

```js
const set = (k, v) => canvasRef.current?.style.setProperty(k, v)
set('--pv-bg', r.bg); set('--pv-surface', r.surface); set('--pv-primary', r.primary)
set('--pv-on-primary', r.onPrimary); set('--pv-accent', r.accent)
set('--pv-text', r.text); set('--pv-muted', r.muted); set('--pv-border', r.border)
```

For the **locked, non-Pro** branch, `r` is `null` and **this effect never runs** — no palette value is ever written into that scene's DOM (see §9).

### 8.2 Full new class list (`cs-pv-` — all NEW)

**Root / structure:** `cs-pv` · `cs-pv-body` · `cs-pv-grid` · `cs-pv-legend` · `cs-pv-legend-item` · `cs-pv-legend-dot` · `cs-pv-legend-name` · `cs-pv-legend-hex`

**Scene chrome (shared):** `cs-pv-scene` (`.is-locked`) · `cs-pv-scene-head` · `cs-pv-scene-tag` · `cs-pv-canvas` · `cs-pv-scene-mode` (light/dark badge)

**Scene-internal building blocks (mode-agnostic, coloured by custom props):** `cs-pv-nav` · `cs-pv-wordmark` · `cs-pv-link` · `cs-pv-btn` (`.is-ghost`) · `cs-pv-headline` · `cs-pv-sub` · `cs-pv-tag` · `cs-pv-glow` · `cs-pv-logos` · `cs-pv-side` · `cs-pv-side-item` (`.is-active`) · `cs-pv-topbar` · `cs-pv-kpi` · `cs-pv-kpi-num` · `cs-pv-chart` · `cs-pv-bar` (`.is-peak`) · `cs-pv-phone` · `cs-pv-screen` · `cs-pv-feed-card` · `cs-pv-fab` · `cs-pv-tabbar` · `cs-pv-article` · `cs-pv-kicker` · `cs-pv-byline` · `cs-pv-cols` · `cs-pv-quote` · `cs-pv-a` (link demo)

**Locked / Pro:** `cs-pv-lock` (the placeholder container shown to non-Pro) · `cs-pv-lock-art` (generic static diagram) · `cs-pv-lock-badge` (lock glyph + "Pro") · `cs-pv-lock-label` · `cs-pv-lock-cta`

**Upsell:** `cs-pv-upsell` · `cs-pv-upsell-copy` · `cs-pv-upsell-cta`

### 8.3 Tokens reused vs. new

**Reuse (no new tokens):** `--bg-0/1/2`, `--t0/1/2/3`, `--border`, `--bh`, `--brand`, `--brand-bg`, `--brand-soft`, `--brand-glow`, `--accent`, `--radius-s/l/xl/pill`, `--s-1…8`, `--warm-shadow`, `--warm-shadow-lg`, `--ring`, `--shadow-l`, `--scrim`, `--mono`, `--font`, `--t` (`.2s cubic-bezier(.16,1,.3,1)`), `--t-fast`. Reuse the `LockGlyph` component and `cs-pro-lock-glyph` styling for the lock badge. Reuse `.btn .btn-accent` for the upsell CTA button (no bespoke button). Reuse the `cs-deal` keyframe + `cs-d0…cs-d5` delay classes for scene entrance.

**New (flagged):**
- **Prefix `cs-pv-`** — new component prefix (Previews). Justified: this is a distinct, large surface; sharing `cs-csys-`/`cs-sw-` would be misleading.
- **Scene-scoped custom properties** `--pv-bg`, `--pv-surface`, `--pv-primary`, `--pv-on-primary`, `--pv-accent`, `--pv-text`, `--pv-muted`, `--pv-border` — these are **per-element runtime values**, not `:root` design tokens (exactly like `--cs-sw-bg`, `--cs-x`), so they don't pollute the global token set.
- One keyframe **`cs-pv-rise`** *only if* you want a distinct scene entrance; otherwise reuse `cs-deal`. Prefer reuse.

### 8.4 Key CSS rules (load-bearing)

```css
/* Section + grid */
.cs-pv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s-4)}
.cs-pv-scene{background:var(--bg-1);border:1px solid var(--border);border-radius:var(--radius-l);
  overflow:hidden;box-shadow:var(--warm-shadow),var(--ring);
  animation:cs-deal .32s cubic-bezier(.16,1,.3,1) backwards}
.cs-pv-canvas{aspect-ratio:16/10;background:var(--pv-bg);color:var(--pv-text);
  padding:var(--s-4);position:relative;overflow:hidden;container-type:inline-size}

/* Recoloured atoms read ONLY from the scene's custom props (no inline style) */
.cs-pv-btn{background:var(--pv-primary);color:var(--pv-on-primary);border-radius:var(--radius-pill)}
.cs-pv-btn.is-ghost{background:transparent;color:var(--pv-text);border:1px solid var(--pv-border)}
.cs-pv-tag{color:var(--pv-accent);background:color-mix(in srgb,var(--pv-accent) 12%,transparent)}
.cs-pv-headline{color:var(--pv-text);font-weight:800;letter-spacing:-.02em;
  font-size:clamp(22px,4cqi,30px);line-height:1.1}
.cs-pv-sub{color:var(--pv-muted);max-width:60ch}
.cs-pv-glow{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(60% 50% at 50% 30%,
    color-mix(in srgb,var(--pv-primary) 18%,transparent),transparent 70%)}

/* Locked scene: the ONLY thing rendered for non-Pro — a generic, palette-free art */
.cs-pv-scene.is-locked .cs-pv-canvas{background:var(--bg-2)}  /* app token, NOT --pv-bg */
.cs-pv-lock{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:var(--s-3);text-align:center;
  padding:var(--s-5)}
.cs-pv-lock-art{/* generic monochrome wireframe, var(--t3)/var(--border) only — no palette */}
.cs-pv-lock-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
  border-radius:var(--radius-pill);background:var(--brand-bg);color:var(--brand);
  font-size:11px;font-weight:700}
.cs-pv-lock-cta{/* small ghost button → onUpgrade */}

/* Closing upsell */
.cs-pv-upsell{display:flex;align-items:center;justify-content:space-between;gap:var(--s-4);
  margin-top:var(--s-5);padding:var(--s-5);border-radius:var(--radius-l);
  border:1px solid var(--brand);background:var(--brand-bg)}

/* Reduced motion: scene entrance only is decorative; the global gate handles it. */
[data-reduced-motion] .cs-pv-scene{animation:none}
```

### 8.5 Files touched (advisory — engineering implements)

- `src/pages/ColorStudio.jsx` — replace `<section id="visualizer">` body with the `cs-pv` structure + `PreviewLegend` / `PreviewScene` / `PreviewUpsell` components (define them near the other Slice components, e.g. after `ColourSystemPopup`). Wire `roles` (memo), `isPro`, and an `onUpgrade` that calls the **existing** `onProGate('extra-colours')` or a new `onProGate('previews')` label (add the label to the existing `onProGate` map in §line 1458 — **no auth/Stripe file touched**; this is the same client stub Slice 3 uses).
- `src/utils/colors.js` — add the pure `derivePreviewRoles(allColors, scene)` helper (uses existing exports only).
- `src/styles/global.css` — append the `cs-pv-*` block (after the `cs-csys-*` block for locality).
- **No auth/Stripe files touched.** Per Human Validation Zones: the gate reads `isPro` from `useSubscription()` and calls the existing `onProGate` stub only. If a future change to the entitlement check itself is proposed, **flag to founder first** — this spec proposes none.

---

## 9. THE ANTI-TAMPER RENDER CONTRACT (engineer's blueprint — central, non-negotiable)

> User's verbatim constraint: *"make sure people can't use inspect element to get around the overlays."* A CSS blur over rendered content is **defeatable** and is **NOT acceptable.** Mirror the Slice 3 §5.3 / §8 harmony gate exactly.

**The rule:** For the two Pro scenes (`mobile`, `article`), the real palette-applied scene **must never be computed, placed in state, rendered to the DOM, or present in the tree** for non-Pro users. There is **no** "render then cover/blur." The locked branch renders **only** a generic, palette-free static placeholder.

**The exact conditional-render structure `PreviewScene` must follow:**

```jsx
function PreviewScene({ scene, roles, locked, onUpgrade }) {
  // HARD GATE. For a locked, non-Pro scene we take the locked branch and RETURN.
  // `roles` is passed as null by the parent for locked scenes, so even the prop
  // carries no palette. Nothing below this line that touches `roles` can run.
  if (locked) {
    return (
      <div className="cs-pv-scene is-locked" data-scene={scene} aria-label={`${SCENE_LABEL[scene]} — Pro preview, locked`}>
        <div className="cs-pv-scene-head">…generic label…</div>
        <div className="cs-pv-canvas">
          <LockedPlaceholder scene={scene} />   {/* generic monochrome wireframe — NO palette */}
          <div className="cs-pv-lock">
            <div className="cs-pv-lock-badge"><LockGlyph size={12} /> Pro</div>
            <div className="cs-pv-lock-label">{SCENE_LABEL[scene]}</div>
            <button className="cs-pv-lock-cta" onClick={onUpgrade}>Unlock Pro previews</button>
          </div>
        </div>
      </div>
    )
  }
  // PRO / FREE branch: real scene. Only reached when NOT locked (i.e. isPro, or a free scene).
  return renderRealScene(scene, roles)   // sets --pv-* custom props, renders recoloured markup
}
```

And in the parent, `roles` is **withheld** from locked scenes at the call site, so the value never even reaches the component:

```jsx
<PreviewScene scene="mobile"  locked={!isPro} roles={isPro ? roles : null} onUpgrade={…} />
<PreviewScene scene="article" locked={!isPro} roles={isPro ? roles : null} onUpgrade={…} />
```

**Why this is inspect-proof:**
- The `if (locked) return` short-circuits *before* `renderRealScene` is ever called — React never builds the recoloured subtree, so it isn't in the DOM, in React state, or in the fibre tree.
- `roles` is passed as `null` for locked scenes, so there is **no client array of "locked colours"** to read out of props, state, or a data-attribute. The user's palette is simply absent from those two scenes' branches.
- `LockedPlaceholder` is a **generic monochrome wireframe** built only from `--t3` / `--border` / `--bg-2` — app chrome tokens, never the palette. It is identical for every user regardless of their colours; there is nothing palette-derived to extract.
- The `--pv-*` custom properties are **never set** on a locked canvas (the `useLayoutEffect` lives inside `renderRealScene`'s component and never mounts), so there is no CSS variable to read in DevTools.

**What this is NOT (the forbidden patterns):**
- ❌ Render the real recoloured scene, then put a `filter:blur()` / `pro-lock-veil` over it. (Inspect-removable.)
- ❌ Compute `roles` for the locked scene and stash it in a `data-*` attribute, a hidden node, or component state "for when they upgrade." (Readable.)
- ❌ Render the real scene with `opacity:0` / `visibility:hidden` / `display:none`. (Still in the DOM/tree.)
- ❌ Pass the full `roles` object into the locked component "but guard the JSX." (The prop is inspectable in React DevTools.) — Pass `null`.

This is the same contract Slice 3 enforced on Pro harmonies ("no harmony hex is ever placed into the DOM, state, or the preview strip for a non-entitled user"). The free scenes (`hero`, `app`) render real palette content for everyone — they are free by design and carry no gate.

> Server-side entitlement enforcement (so a tampered `isPro` can't unlock the real scene) is **deferred to the Phase-3 export/paywall slice**, as scoped. Slice 4 ships the **client render gate + the UI**; it must not weaken the render gate on the assumption the server will catch it.

---

## 10. States (every scene + section)

| State | Trigger | UX |
|---|---|---|
| **Default (Pro)** | isPro | all four scenes render real, recoloured, live. No lock, no upsell. |
| **Default (free)** | !isPro | hero + app real; mobile + article = locked placeholder; `.cs-pv-upsell` shown at the end. |
| **Collapsed** | `collapsed.visualizer` | `cs-pv-body` unmounted (chevron rotates) — reuses existing section-collapse behaviour. |
| **Scene hover** | pointer over `.cs-pv-scene` | card lifts `translateY(-2px)`, shadow → `--warm-shadow-lg`, 200ms `--t`. Locked scene: same lift + the `cs-pv-lock-cta` brightens. **No colour reveal on the locked scene.** |
| **Legend item hover** | pointer over `.cs-pv-legend-item` | optional: subtly outline every surface in the scenes that uses that role (via a `data-role` highlight) — a *teaching* micro-interaction. Defer if it complicates; not required for ship. |
| **Live recolour** | user edits palette (any swatch / harmony / adjust) | `roles` memo recomputes → scenes recolour instantly via the changed `--pv-*` props. No transition longer than 200ms on the colour-bearing properties so it feels live (the Realtime-Colors hook), not laggy. |
| **Empty palette (0 colours)** | `allColors.length === 0` | `derivePreviewRoles` returns the **`--brand` fallback set** (§5.2): scenes render in brand blue on app neutrals with a quiet legend note "Add colours to see them here." Scenes are **never blank** (Murphy). |
| **One colour** | `length === 1` | `primary`/`accent` both derive from the one colour (accent = `mixHex(primary, brand, .5)`); `bg`/`surface`/`text` are tonal/derived. Fully legible, just monochromatic. |
| **Too-light palette** (all luminance > .8) | e.g. pastels | dark-mode hero falls back `bg` to the darkest available; if none is dark enough for AA text, the safety net forces `text` to `#0A0B0D` and `bg` to the lightest colour (light scene). CTA gets a border if it's low-contrast. **Never illegible.** |
| **Too-dark palette** (all luminance < .15) | e.g. deep navys | inverse: `text` forced to `#F2F3F5`; light scenes use the lightest available colour as `surface`; CTA border if needed. |
| **All-grey / no chroma** | max chroma below threshold | `primary`/`accent` fall back to `--brand`/`--brand-soft`; legend shows "add a saturated colour to brand the CTA" hint. |
| **Locked (non-Pro)** | mobile/article + !isPro | generic placeholder + lock badge + cta, per §9. |

There is **no loading/offline/error state** for this section — it is pure client-side computation from `allColors` (already in memory) and CSS. It can't fail a network call. (Murphy's-law "offline" is N/A here by construction, which is itself a resilience win.)

---

## 11. Responsive behaviour (320 → 4K)

| Width | Behaviour |
|---|---|
| **≥1440 → 4K** | `cs-pv-grid` stays 2-col but **clamp scene max-width** so scenes don't become cartoonishly large; centre the grid with `max-width:1280px;margin-inline:auto` inside the studio column. Scenes scale crisply (vector). Type uses `cqi`/`clamp` so headlines grow with the card, not the viewport — no giant text. |
| **769–1439 (desktop)** | 2-col grid, `gap:var(--s-4)`. Default. Scene `aspect-ratio:16/10`. |
| **≤768 (tablet)** | grid → **1-col**; scenes full-width; `aspect-ratio:16/9` (slightly shorter so a scene fits the viewport). Upsell stacks copy above CTA if cramped. |
| **≤480 (phone)** | 1-col; scene `aspect-ratio:4/3`; hero headline drops to the bottom of its `clamp` (22px); app dashboard **hides the sidebar** (collapses to a top-bar-only shell via a `@container` query on `.cs-pv-canvas`) so the content grid stays readable; mobile-feed phone frame shrinks; article goes **1-col** body. Legend wraps to 2 rows, horizontally scrollable if needed (`overflow-x:auto`, momentum). |
| **≤380 (tiny)** | legend hex chips hide the `#` glyph to save width; scene-internal type floors honoured; upsell CTA full-width below copy. |
| **≤320** | nothing hidden, only reflowed: scenes `aspect-ratio:1/1` max; all buttons full-width within scenes; lock badge + cta stack. |

Use a **`@container` query** on `.cs-pv-canvas` (it sets `container-type:inline-size`) for *scene-internal* responsiveness (e.g. dashboard sidebar collapse) so a scene reflows by **its own width**, not the viewport — this keeps the 1-col-on-tablet scenes looking right and is the modern, robust approach. `cqi` units drive scene type.

---

## 12. Motion / animation

| Moment | Property | Duration | Easing |
|---|---|---|---|
| Section / scene entrance | reuse `cs-deal` (translateY 6px + scale .98 + opacity), staggered via `cs-d0…cs-d3` | 320ms | `cubic-bezier(.16,1,.3,1)` |
| Scene hover lift | transform, box-shadow | 200ms | `--t` (`.16,1,.3,1`) |
| **Live recolour** | background/color on `--pv-*`-bound atoms | ≤180ms | `cubic-bezier(.2,0,0,1)` — fast, so it reads as *live* |
| Legend dot / chip hover | background | 120ms | `--t-fast` |
| Lock-cta hover | background, color | 150ms | `--t` |
| Upsell CTA | reuse `.btn-accent` hover (translateY -1px + glow) | 200ms | existing |

**Reduced motion (`[data-reduced-motion]` / `prefers-reduced-motion`):** the global gate already collapses all transitions/animations to `0.01ms`. We add no exceptions — **all motion here is decorative** (entrance, hover lift, recolour easing). The recolour itself still *happens* (colours change), just without the 180ms tween — the scene snaps to the new palette, which is correct and legible. Add explicit `[data-reduced-motion] .cs-pv-scene{animation:none}` for belt-and-braces, matching the Slice 3 pattern.

---

## 13. Accessibility checklist (WCAG 2.2 AA)

- **Contrast within scenes:** the **§5.2 safety net guarantees** body text ≥7:1 (AAA-large / AA-normal) on its scene bg, button labels ≥4.5:1 on the CTA, and the CTA ≥3:1 on its surface — *for any palette*. The previews are themselves an accessibility instrument: a user watching the safety net add a CTA border learns their palette is low-contrast.
- **Section chrome contrast:** all `cs-pv-*` chrome text uses AA-verified app tokens (`--t0/1/2`, `--brand` on `--brand-bg`) — already AA in both themes.
- **Scenes are decorative compositions, semantically:** wrap each `.cs-pv-canvas` content as `role="img"` with a descriptive `aria-label` (e.g. `aria-label="Marketing site preview using your palette: dark background, [primary] call-to-action button, [accent] highlights."`). The *internal* `<div>`s are presentational (`aria-hidden` on the decorative bars) — a screen-reader user gets one meaningful description, not 40 empty divs. The legend (real text) carries the literal role→hex info accessibly.
- **Legend:** `role="group"` / `aria-label="Palette role mapping"`; each item announces "Primary, #2563EB" etc. (text, not colour-only).
- **Locked scene semantics:** the scene container has `aria-label="… — Pro preview, locked"`; the **`cs-pv-lock-cta`** and **`cs-pv-upsell-cta`** are real `<button>`s, keyboard-focusable, with `aria-label="Unlock Pro previews — upgrade"`. Lock state is conveyed by **glyph + the word "Pro" + the label**, never colour alone (colour-not-sole-channel).
- **Keyboard:** the only interactive elements are the section header (existing), the two upgrade buttons, and (optionally) legend items. All reachable by Tab in DOM order, all show `:focus-visible` (`--ring` / the global 2px `--accent` outline — never stripped). No keyboard trap; nothing drag-only.
- **Target size:** upgrade buttons and the lock cta ≥44px hit height (WCAG 2.2 Target Size).
- **Reduced motion:** honoured via the global gate (§12).
- **Theme:** scenes declare their own light/dark *mode internally* (driven by derived roles), independent of the app theme — but all *chrome* respects `data-theme`. Verify both app themes.

---

## 14. What NOT to do (traps for this surface)

- ❌ **Don't** render the real Pro scene then blur/veil/`opacity:0`/`display:none` it. That is the exact inspect-element bypass the user forbade. The locked branch renders a **palette-free placeholder only**, and `roles` is passed as `null` (§9).
- ❌ **Don't** reintroduce index-based role mapping (`allColors[0]=primary`) or hard-coded `#fff` card backgrounds — that's the old visualizer's bug; it breaks on dark/light/short/extreme palettes. Use `derivePreviewRoles` + the safety net (§5).
- ❌ **Don't** use `<img>` or canvas screenshots for scenes. Vector/CSS only — crisp at 4K, zero weight, recolours instantly. Photographic mockups can't recolour live and bloat the bundle.
- ❌ **Don't** ship inline `style={{…}}` on scene markup (the old code's whole approach). Use the eight `--pv-*` custom properties set on the canvas ref + classes (§8.1). The *only* sanctioned imperative style is those custom-property sets.
- ❌ **Don't** let a scene go illegible on any palette. If you can find one `allColors` value that produces unreadable text or an invisible CTA, the safety net (§5.2) is incomplete.
- ❌ **Don't** over-accent. One focal CTA + one accent highlight per scene (the peak bar, the active tab). No neon glow on everything, no gradient on every tile — that's the "AI slop" register `theme-direction.md` forbids. The single derived radial glow on the hero is the one rationed depth moment.
- ❌ **Don't** invent new section chrome, scrim, or easings. Reuse `cs-section-header`, `cs-deal`, `--t`, `.btn-accent`, `LockGlyph`, `--brand*` tokens. Seam-free with the rest of Colour Studio.
- ❌ **Don't** add a "preview more scenes" infinite gallery or per-scene controls — restraint. Four curated scenes (2 free / 2 Pro) is the chunked, Hick's-Law-clean set.
- ❌ **Don't** gate the *free* scenes or hide the legend behind Pro — the free value must be genuine and beautiful, or the upsell reads as a bait-and-switch (kills trust / the halo).

---

## 15. Rationale (per major decision)

- **Replace toy mockups with full vector scenes** — aesthetic–usability + ~50ms halo: this is the surface where a visually-literate designer judges UIL4B's craft. Realtime Colors proves a believable full scene is the persuasive unit; tiny div-bar wireframes undersell the palette and the product.
- **Two free, two Pro** — free scenes deliver real value first (trust), the locked finale is the **loss-aversion / Von Restorff** conversion peak placed at the **peak–end / recency** position of the scroll. The user converts on "I want *those* too," not on a nag.
- **Derive roles by luminance/chroma + AA safety net** — Material Theme Builder's semantic-role discipline is what keeps four scenes coherent and legible across *any* palette; index mapping (the old code) demonstrably breaks. The net turns the previews into an accessibility instrument (accessibility-as-feature).
- **Vector/CSS scenes + custom props** — crisp 320→4K, zero asset weight, instant live recolour (the Realtime-Colors hook), and fully within the no-inline-style / single-`global.css` conventions.
- **The role legend** — Material's "see the logic" move as a quiet literacy layer; answers the pre-conscious "why is *that* the button?" and makes the previews feel intelligent, not arbitrary.
- **Hard render gate (not blur)** — directly honours the user's verbatim constraint and mirrors the shipped Slice 3 anti-tamper contract; passing `roles=null` + `if (locked) return` means the palette is genuinely absent from the locked subtree — nothing to inspect-element.
- **`@container` queries for scene-internal reflow** — a scene reflows by *its own* width, so 1-col-on-tablet scenes still look right; the modern, robust responsive primitive.
- **Reuse `cs-deal`, `cs-section-header`, `.btn-accent`, `LockGlyph`, `--brand*`** — Jakob's Law (internal consistency); a seamless visual language across Colour Studio is what reads as premium and systemic.

---

### Files referenced (absolute paths)

- `/home/user/UIL4B/src/pages/ColorStudio.jsx` — replaces `<section id="visualizer">` (~lines 3169–3346); reuses `derivePreviewRoles`, `roles` memo, `isPro` (~1448), `onProGate` (~1457), `allColors` (~1598), `mixHex`/`textColorForBg`/`fixForeground`/`contrastRatio`/`luminance`/`tonalRamp` (imported line 4), `LockGlyph` (~139), `cs-section-header`/`toggleCollapse` (~1533), `SECTIONS` Visualizer entry (~1529).
- `/home/user/UIL4B/src/utils/colors.js` — add `derivePreviewRoles`; reuses `luminance` (~125), `contrastRatio` (~133), `textColorForBg` (~141), `mixHex` (~65), `fixForeground` (~509), `tonalRamp` (~454).
- `/home/user/UIL4B/src/styles/global.css` — append `cs-pv-*` block after the `cs-csys-*` block; reuses tokens from `:root`/theme blocks (lines 3–5), `cs-deal` (~261–268), `cs-section-header` (~232), `.btn`/`.btn-accent` (~362–369), `cs-pro-lock-glyph` (~321), reduced-motion gate (~7–8).
- `/home/user/UIL4B/docs/specs/colour-studio-slice3.md` — anti-tamper contract mirrored (§5.3, §8, §9 here).

**Sources (named exemplars, not fetched this session):** Realtime Colors (realtimecolors.com) · Coolors Visualizer (coolors.co/visualizer) · Material Theme Builder (m3.material.io) · Stripe / Linear / Framer marketing pages (per `theme-direction.md` north-stars).
