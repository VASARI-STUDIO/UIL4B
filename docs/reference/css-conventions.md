# CSS Conventions

> Reference doc for UIL4B. Linked from `CLAUDE.md`. All styling lives in one
> file: `src/styles/global.css`. No CSS-in-JS, no per-component stylesheets, no
> inline styles in new code.

## Rules

- **One file.** Add classes to `src/styles/global.css`. Do not create new
  stylesheets.
- **No inline styles** in new code — add a class instead.
- **Use existing custom properties** rather than hard-coded values.
- **Class naming**: kebab-case with a component prefix, e.g. `cs-` (Color
  Studio), `adm-` (Admin), `aipg-` (AI Prompt Generator). Pick a short prefix
  per component and keep it consistent.

## Design tokens (`:root` in `global.css`)

### Spacing scale
`--s-1:4px`, `--s-2:8px`, `--s-3:12px`, `--s-4:16px`, `--s-5:24px`,
`--s-6:32px`, `--s-7:48px`, `--s-8:64px`, `--s-9:96px`, `--s-10:128px`

### Radius scale

Remapped to Design Language V2, 2026-08-16. See
[`design-language-v2.md`](design-language-v2.md#panels-remap-the-existing-scale).

| Token | Value | Applies to |
|---|---|---|
| `--radius-xs` | `6px` | Tint chips, highlight mark |
| `--radius-s` | `10px` | Icon tiles, scale rows |
| `--radius` | `12px` | Swatches, token blocks, inline search |
| `--radius-l` | `14px` | Inputs, command bar, pricing rows |
| `--radius-xl` | `16px` | Community / feed cards |
| `--radius-2xl` | `18px` | Tool cards, sticky demo panel |
| `--radius-3xl` | `24px` | Full-width feature panels |
| `--radius-pill` | `999px` | **All buttons** |

> The V2 remap was done in the **token block only**. The scale's whole value is
> that ~1000 call sites already reference the names, so they inherited V2
> rounding from one edit. Don't sweep call sites; don't hard-code
> `border-radius`.

> Corrected 2026-08-08 to match the live `:root` in `global.css` — this table
> had drifted (4/9/12/16). The stylesheet is the source of truth for the values;
> this doc is the source of truth for the rule that you use the scale.

> **V2 shape rule:** buttons are pill, panels use the scale. There is no second
> button shape — every button, CTA, chip, tab, keycap and badge is
> `--radius-pill`. (This replaces the former "squarer-with-soft-corners set —
> small radii, not pill-everything" note, which described V1 and is now false.)

### Type

Two families, both self-hosted and variable. V2 replaced `Outfit` in all three
roles, 2026-08-16 — see [`design-language-v2.md`](design-language-v2.md#type).

| Token | Family | Weights used | Role |
|---|---|---|---|
| `--font` | **Manrope** | 400 / 500 / 700 / 800 | All UI and display |
| `--serif` | **Manrope** | — | Retired as a distinct role; aliases `--font`. The name stays so existing call sites keep resolving. |
| `--mono` | **JetBrains Mono** | 400 / 500 / 700 | Eyebrows, meta, category pills, keycaps, code, footer headings, stat lines |

**Mono is load-bearing in V2** — it is the texture that makes the product read as
a tool rather than a marketing page. It is also above the fold, so both families
are preloaded in `index.html`, not just the UI face.

> **Mind the axis.** Manrope's variable axis is `200..800` and JetBrains Mono's
> is `100..800` — both narrower than Outfit's `100..900`. A weight outside the
> axis is **silently clamped**, which is the same failure mode static instances
> had. Keep authored weights inside `200..800`;
> `tests/unit/hero-entrance.test.js` enforces this and bounds the two known
> pre-existing `900` call sites so a third can't appear unnoticed.

### Motion — the named scale

**Source of truth for all UIL4B motion.** Every duration and easing comes from
this scale — no raw literals (`.15s`, `.25s`, `cubic-bezier(...)`) in new code.
The tokens live in **one** authoritative block in the first `:root` at the top of
`global.css`; never redeclare them in a second `:root` or scope them to a page.

**Durations**

| Token | Value | Use for |
|---|---|---|
| `--dur-1` | `120ms` | Pure tint — `color`, `background-color`, `border-color`, `opacity`, `box-shadow` on hover. Nothing that moves. |
| `--dur-2` | `200ms` | The default. Any state change that moves or resizes: hover lifts, small `transform`s, chevron rotations, focus rings. **Floor for all geometry.** |
| `--dur-3` | `280ms` | Reveals with travel — labels expanding, accordions, small panels, drawer contents. |
| `--dur-4` | `420ms` | Scroll reveals and entrances covering real distance. |
| `--dur-5` | `600ms` | Large surfaces — modals, sheets, full-width panels. |
| `--dur-6` | `700ms` | Page-level / hero-scale motion. Rare. |

**Easings — pick by intent, not by taste**

| Token | Value | Reach for it when |
|---|---|---|
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | The thing **starts and ends on screen**: state changes, hovers, resizes, colour, rotation. Symmetrical — no implied arrival or departure. |
| `--ease-entrance` | `cubic-bezier(.16,1,.3,1)` | Something is **arriving**. Decelerates into place. Enter animations, reveals, mount transitions. |
| `--ease-exit` | `cubic-bezier(.4,0,1,1)` | Something is **leaving**. Accelerates away and never settles. Dismissals, close, unmount. |
| `--ease-inout` | `cubic-bezier(.45,0,.15,1)` | Both ends anchored and you want a pronounced ease at each — collapse/expand of a whole element. |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | Deliberate overshoot: confirmations, pops, "it worked" moments. Use sparingly. |

Two aliases exist so older call sites stay valid — `--ease-out` is identical to
`--ease-entrance`, `--ease-soft` is identical to `--ease-standard`. Prefer the
semantic names in new code; don't churn existing `--ease-out` usages.

**Composite shortcuts** — use these where a call site already does:

- `--t` = `var(--dur-2) var(--ease-out)` — the standard hover/state transition.
- `--t-fast` = `var(--dur-1) var(--ease-entrance)` — quick tint changes.
- `--fl-reveal` = `var(--dur-4) var(--ease-entrance)` — scroll reveals.
- `--fl-stagger:55ms`, `--stagger:70ms` — cascade steps, not durations.

> A composite **already carries its easing**. `transition:opacity var(--t) ease`
> expands to two timing functions and is silently invalid — the transition never
> runs. Write `transition:opacity var(--t)`.

**Loop timings are not on the scale.** `--fl-shimmer-dur:1.4s`, marquees and
other `infinite` animations are timed by feel because the duration *is* the
effect. Don't snap them onto `--dur-*`.

#### Rule: geometry never transitions below `--dur-2`

Anything that changes layout or position — `transform`, `translate`, `width`,
`height`, `margin`, `padding`, `gap`, `grid-template-columns`, `border-radius`,
`font-size` — gets `--dur-2` or slower. Below ~160ms the eye reads a geometry
change as a jump-cut rather than a movement; that is exactly the "snappy and
jumpy" feel we removed.

**One exception:** `:active` press feedback (`.btn:active` and friends) stays at
`--dur-1`. Press feedback has to track the pointer to feel physical; a 200ms
press lags behind the finger. It is annotated in `global.css` where it appears.

#### Rule: reveal-on-hover labels use `grid-template-columns`, never `max-width`

```css
/* the collapsible wrapper is the grid container */
.thing-label   { display:grid; grid-template-columns:0fr;
                 transition:grid-template-columns var(--dur-3) var(--ease-entrance) }
/* its single track item clips the overflow so 0fr can reach zero */
.thing-label-i { overflow:hidden; min-width:0; white-space:nowrap }
.thing:hover .thing-label { grid-template-columns:1fr }
```

`max-width:0 → 120px` is **banned** for this pattern. The ceiling is an invented
number, always wider than the real text, so the element reaches its natural width
partway through the transition and the remaining tail of the easing curve plays
with nothing left to move. The result reads as a snap even though the transition
technically completed. `0fr → 1fr` interpolates across the *actual* content width,
so the whole curve is visible.

The inner element is required: without `overflow:hidden; min-width:0` a grid
item's automatic minimum size stops the `0fr` track collapsing to zero. In JSX
that means wrapping the label text in an inner `<span>` — do it in the markup,
not with a pseudo-element. Because the wrapper (not the button) is the grid
container, buttons with extra children beside the label are unaffected.

If the collapsing element has horizontal padding, animate `padding` alongside the
track: a `border-box` element cannot narrow past its own padding.

**If the reveal element is `position:absolute`, add `width:max-content`.** An
absolutely positioned box with only `left` (or only `right`) set has an *auto*,
shrink-to-fit inline size — which is indefinite, so `1fr` has no free space to
claim and resolves to **`0px`**. The pill animates open around nothing and the
label never appears; `visibility`, `opacity` and `clip-path` all flip correctly,
which is what makes it look like a styling bug rather than a sizing one. This is
exactly what broke Palette Builder's `.plb-icobtn .plb-lbl` after #199.
`width:max-content` makes the inline size definite so the track resolves to the
real text width; `0fr` still collapses to zero because the inner item carries
`overflow:hidden;min-width:0`.

#### Reduced-motion contract

Reduced motion means **near-instant, not merely fast**. Both the app-level
`html[data-reduced-motion="true"]` block and the
`@media(prefers-reduced-motion:reduce)` fallback must clamp all four of:

```css
transition-duration:0.01ms!important; animation-duration:0.01ms!important;
animation-iteration-count:1!important;
transition-delay:0s!important;   animation-delay:0s!important;
```

Duration alone is not enough. An `animation-iteration-count:infinite` loop at
`0.01ms` spins thousands of iterations per second — real CPU burn and, on some
engines, a visible strobe. And a surviving `transition-delay` leaves the UI
feeling laggy for precisely the users who asked for less motion.

`AppearanceContext` writes `data-reduced-motion` on `<html>` and is
**authoritative**; the OS media query is only the fallback for when the attribute
is absent. JS-driven motion (rAF count-ups, IntersectionObserver reveals, GSAP)
is out of CSS's reach — it must read the attribute itself and jump to the final
state:

```js
const rm = document.documentElement.getAttribute('data-reduced-motion')
const reduce = rm === 'true' ||
  (rm !== 'false' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))
```

Per-component `[data-reduced-motion]` opt-outs (e.g. `animation:none` on a
specific decorative element) layer on top of the global block — keep them.

### Layout
`--sw:248px` (sidebar width), `--top-h:56px` (top bar height).

Shared app chrome uses `--page-gutter` / `--page-inline` so the PillNav, tool
bars, tool footers, UI-system sections, app footer **and every page container**
(`.app-page`, `.rail-content`, `.home-container`) keep one horizontal alignment.
Desktop content can span up to `--page-content-max` (1680px), with a fluid
minimum gutter. Extend these tokens instead of adding local shell padding.

The gutter has three steps (2026-08-08):

| Width | `--page-gutter` |
|---|---|
| ≤768px | `16px` |
| 769–1439px | `clamp(20px,1.5vw,32px)` |
| ≥1440px | `clamp(36px,3.2vw,64px)` |

`--page-inline` is `max(--page-gutter, (100vw - --page-content-max)/2)` — the
centring branch takes over above 1680px. It is measured against **`100vw`, not
`100%`**, on purpose: a percentage inside a custom property re-resolves against
whichever element reads it, so a full-bleed child inside an already-padded page
container would compute a smaller inset than its parent and bleed the wrong
distance. Anything that cancels a page container's padding with a negative
margin (`.plb`, `.plb--ui-system`) depends on this.

### Theme-scoped colour tokens (`[data-theme="dark"]` / `[data-theme="light"]`)

| Token group | Purpose |
|---|---|
| `--bg-0` … `--bg-4` | Background layers (0 = page, 4 = raised). |
| `--t0` … `--t3` | Text contrast (0 = strongest, 3 = faintest). |
| `--border`, `--bh` | Borders / hovered borders. |
| `--card`, `--inp`, `--cbg`, `--hvr` | Surfaces, inputs, hover wash. |
| `--accent`, `--accent-strong`, `--accent-soft`, `--accent-bg`, `--accent-glow`, `--accent-fg` | Accent system. |
| `--brand`, `--brand-soft`, `--brand-bg`, `--brand-glow` | Brand system (tracks accent). |
| `--hi`, `--hi-fg` | **V2 highlight.** Acid lime marker. Scarce by design. |
| `--ok`, `--warn`, `--err` | Status colours. |
| `--shadow-xs/s/m/l`, `--shadow-glow`, `--ring` | Elevation. |
| `--shadow-cmd`, `--shadow-panel` | **V2 elevation** — command bar, and sticky panel / modals. Theme-independent. |

> Live values for `--t0`–`--t3` and `--brand` are in `constants-and-config.md`.

**V2 colour, 2026-08-16.** The accent is the founder-selected **blue**: light
seeds `--accent:#0F6FFF` on a warm-bone page (`#EFEEE9`) with white cards; dark
seeds `--accent:#6FA8FF` on `#101012`. The accent lightens in dark; **`--hi` does
not** — it is the same `#E9FF64` in both themes. Budget at most **one `--hi`
element per viewport**: it reads as a marker pen, and it also drives the global
`::selection`.

> #### ⚠️ `--accent` and `--accent-strong` are not interchangeable
>
> The blue misses the 4.5:1 floor for **normal-size text** on every light ground
> — measured `3.82` on the page, `4.43` on white, `4.06` on `--bg-2`.
>
> - **`--accent`** — fills, borders, icons, focus rings, and **large** display
>   text only (≥24px, or ≥18.66px bold), where the floor is 3:1.
> - **`--accent-strong`** (`#0B5ED7` light) — **every accent-coloured text below
>   large size.** Measures `5.03 / 5.84 / 5.35` on those same three grounds. V2
>   leans on 11–12px mono eyebrows, counts and category labels, so this is the
>   common case, not the exception.
> - **`--accent-soft`** is decorative only — `2.68` on the page. Never text.
>
> The same split governs **fills carrying `--accent-fg` text**: a 12–14px label
> on an `--accent` fill measures 4.43:1 and fails, so `.btn-accent`,
> `.btn-primary` and `.ui-pill-accent` all fill with `--accent-strong`. Don't
> "restore" them to `--accent`.
>
> **`--accent-fg` is theme-scoped.** White in light, ink (`#101012`) in dark —
> because the dark accent is a *light* blue and white on it measures 2.41:1.
> This is standard M3 on-primary behaviour: the on-colour tracks the tone of the
> colour beneath it.

> The light background ladder is deliberately **not** a straight ramp. Cards rise
> to white above the bone ground, so `--bg-2` sits *between* page and white
> (subtle fills, `.btn:hover`) and only `--bg-3`/`--bg-4` recede below the page.
> A darker-than-page text surface cannot carry the V2 mute at AA — the
> measurements are in the `[data-theme="light"]` block in `global.css`.

### Buttons — one shape, three treatments

V2 has no second button shape. The shared `.btn` family is `--radius-pill`.

| Treatment | Class | Fill | Text |
|---|---|---|---|
| Primary | `.btn-accent` / `.btn-primary` | `--accent-strong` (see the contrast note) | `--accent-fg` |
| Inverse | `.btn-inverse` | `--t0` (ink) | `--bg-0` (page) |
| Quiet | `.btn` (the base rule) | `--card` + `1px --border` | `--t0` |

Don't add a fourth. `.hover-lift` carries the shared card-hover language —
`border-color` to ink **and** `translateY(-3px)`, together, on
`--dur-2`/`--ease-standard`. Both, or it reads as a different interaction.

## Responsive breakpoints — the named scale

New `@media` blocks should snap to this scale, not invent a new value. This is
the source of truth for D1 (breakpoint normalisation).

| Breakpoint | Target |
|---|---|
| `980px` | Small laptop / large tablet |
| `768px` | Tablet (iPad portrait) |
| `640px` | Large phone / phablet |
| `560px` | Phone |
| `480px` | Small phone |
| `380px` | Tiny phone |
| `320px` | Hard floor — never break below this |

`max-width` carries the mobile-down overrides; the matching **`min-width`
companion sits one pixel past** the floor of the tier above it — `min-width:981px`
pairs with `max-width:980px`. The lone `min-width:768px` (landing bento) is a
deliberate exception, **not** an off-by-one: 768 is iPad-portrait width, and the
bento wants its multi-column layout there — snapping it to 769 would strand
iPad-portrait in the stacked layout. Leave it.

> **Content-specific one-offs** (`1180/1024/960/900/880/860/820/760/700/680/600/520`)
> exist where a specific component reflows at its own natural width. Folding
> these onto the scale is a **reviewed** pass (D1), not a blind snap — each one
> is tied to real content geometry, so moving it can reintroduce overflow.

### Which widths to actually test

Designs must hold from **320px → 4K**. Test the affected screen at
**390 / 640 / 834 / 1280** before claiming done, and add any width the component
itself reflows at.

**This replaces the old "768 / 480 / 380" triple**, which three documents
repeated — this file, `murphys-law.md` and `build-and-verify.md` — and which was
wrong in the same way in all three:

- It omitted **640px**, which carries **30** `@media` blocks in `global.css`,
  more than any other width and more than 768px's 19. Every shared browse
  toolbar stacks there and nowhere else (`.lbry-toolbar`, `.lbry-filters`,
  `.lbry-toolbar-action`).
- It left the **641–900px band** untested. At 834px — iPad portrait in landscape
  orientation, and a real device — the 640px overrides are all off, so a tablet
  is served the desktop branch. That band is where
  `.plb-toolbar-group:last-child` hides 7 of 11 controls including Randomise,
  recorded in this stylesheet's own "THE RECURRING DEFECT" note.

Full band-by-band detail, and what breaks in each, is in
[`.claude/skills/uil4b-surface-review/references/responsive-bands.md`](../../.claude/skills/uil4b-surface-review/references/responsive-bands.md).

## Accessibility

- Respect `prefers-reduced-motion` and the `data-reduced-motion` attribute
  (already wired in `global.css`).
- Keep `:focus-visible` outlines — don't strip focus styles.
- Maintain WCAG AA contrast (QA checks this).

## Icon conventions

- **Any "Random" / "Randomise" button uses the Lucide shuffle glyph** via the
  shared `<ShuffleIcon />` component (`src/components/ShuffleIcon.jsx`) — never a
  bespoke glyph. It's `stroke="currentColor"`, so it inherits the button colour;
  pass `size` to match the button's text.
