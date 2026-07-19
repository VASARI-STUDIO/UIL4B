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
`--radius-xs:6px`, `--radius-s:8px`, `--radius:10px`, `--radius-l:14px`,
`--radius-xl:20px`, `--radius-2xl:28px`, `--radius-pill:999px`

### Type
`--font:'Outfit'`, `--serif:'Outfit'`, `--mono:'IBM Plex Mono'`

### Motion / layout
`--t:.2s cubic-bezier(.16,1,.3,1)` (standard transition), `--sw:248px`
(sidebar width), `--top-h:56px` (top bar height)

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

## Responsive breakpoints

| Breakpoint | Target |
|---|---|
| `768px` | Tablet |
| `480px` | Phone |
| `380px` | Tiny phone |

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
