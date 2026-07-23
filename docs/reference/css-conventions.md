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
`--radius-xs:4px`, `--radius-s:5px`, `--radius:7px`, `--radius-l:9px`,
`--radius-xl:12px`, `--radius-2xl:16px`, `--radius-pill:999px`

> Squarer-with-soft-corners set — small radii, not pill-everything. Use the
> scale; don't hard-code `border-radius`.

### Type
`--font:'Outfit'`, `--serif:'Outfit'`, `--mono:'Outfit'` — one family across
all three roles today.

### Motion — the named scale

Every transition/animation **duration** should come from this scale, not a raw
literal. This is the source of truth for E2 (motion consistency).

**Durations:** `--dur-1:120ms`, `--dur-2:200ms`, `--dur-3:280ms`,
`--dur-4:420ms`, `--dur-5:600ms`, `--dur-6:700ms`.

**Easings:** `--ease-out:cubic-bezier(.16,1,.3,1)` (default — decelerate),
`--ease-soft:cubic-bezier(.4,0,.2,1)`, `--ease-inout:cubic-bezier(.45,0,.15,1)`,
`--ease-spring:cubic-bezier(.34,1.56,.64,1)` (overshoot — confirmations, pops).

**Composite shortcuts:** `--t` = `.2s cubic-bezier(.16,1,.3,1)` (= `--dur-2` +
`--ease-out`, the standard hover/state transition), `--t-fast` = `.12s …` (=
`--dur-1`), `--fl-reveal` = `.42s …` (= `--dur-4`, scroll reveals),
`--fl-stagger:55ms` (cascade step).

> **New code:** reach for `var(--t)` / `var(--t-fast)` for standard transitions,
> or `<dur-token> var(--ease-*)` when you need a specific pairing. Avoid raw
> `.15s` / `.25s` / `.3s` literals — those are off-scale legacy values slated to
> reconcile onto the scale (a reviewed motion pass, not a blind find-replace,
> since snapping changes timing).

### Layout
`--sw:248px` (sidebar width), `--top-h:56px` (top bar height).

### Theme-scoped colour tokens (`[data-theme="dark"]` / `[data-theme="light"]`)

| Token group | Purpose |
|---|---|
| `--bg-0` … `--bg-4` | Background layers (0 = page, 4 = raised). |
| `--t0` … `--t3` | Text contrast (0 = strongest, 3 = faintest). |
| `--border`, `--bh` | Borders / hovered borders. |
| `--card`, `--inp`, `--cbg`, `--hvr` | Surfaces, inputs, hover wash. |
| `--accent`, `--accent-strong`, `--accent-soft`, `--accent-bg`, `--accent-glow`, `--accent-fg` | Accent system. |
| `--brand`, `--brand-soft`, `--brand-bg`, `--brand-glow` | Brand system (tracks accent). |
| `--ok`, `--warn`, `--err` | Status colours. |
| `--shadow-xs/s/m/l`, `--shadow-glow`, `--ring` | Elevation. |

> Live values for `--t0`–`--t3` and `--brand` are in `constants-and-config.md`.

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

Designs must hold from **320px → 4K**. Test the affected screen at 768 / 480 /
380 before claiming done (see `murphys-law.md`).

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
