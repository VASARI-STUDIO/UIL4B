# Colour System Method (Material 3-based)

> Reference doc for UIL4B. Linked from `CLAUDE.md`. The **method** behind our
> colour generation, and the foundation for the **UI System Builder** and
> **Brand System Builder**. Adapted from Google's Material 3 (M3) colour system.

## The model in one paragraph

Pick **one seed/brand colour**. Derive **5 key colours** (primary, secondary,
tertiary, neutral, neutral-variant) by fixing hue/chroma in **HCT** colour
space. Each key colour expands to a **tonal palette** — 13 stops on a tone scale
of **0 (black) → 100 (white)**. Semantic **roles** (primary, on-primary,
surface, outline…) are not raw hex — they are **pointers to specific tones**. A
**light** scheme and a **dark** scheme are two tone-mapping tables over the
*same* palettes, so one seed yields both — with **contrast guaranteed by
construction** (a tone-40 fill is always paired with a tone-100 label).

## Tonal palette

13 stops: `0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100` (extra stops near
white, where UI surfaces live). Five palettes from the seed: **Primary**
(chroma ≈ 48), **Secondary** (≈ 16), **Tertiary** (hue-shifted), **Neutral** &
**Neutral-Variant** (low chroma — these drive surfaces and outlines).

## Role taxonomy

Roles come in groups. The four accent groups (**primary / secondary / tertiary /
error**) share the same 4-role shape: `X`, `on-X`, `X-container`,
`on-X-container`.

| Role | Purpose |
|---|---|
| **primary / on-primary** | Highest-emphasis fill (main CTA, FAB) + its legible foreground |
| **primary-container / on-…** | Low-emphasis tonal fill of the hue (chips, highlighted cards) + foreground |
| **secondary** group | Supporting accents (filters, selected nav) |
| **tertiary** group | Expressive contrast for balance/personality — *not* a third brand colour |
| **error** group | Destructive & invalid states |
| **surface** | Default background |
| **surface-dim / -bright** | Lowest / highest-luminance surface |
| **surface-container-lowest → highest** | The 5-rung **elevation ladder** (cards → menus/dialogs) |
| **on-surface / on-surface-variant** | Primary text / secondary-inactive text on a surface |
| **outline / outline-variant** | Borders & dividers (contrast) / subtle dividers |
| **inverse-surface / -on-surface / inverse-primary** | Inverted surface (snackbars, tooltips) + foregrounds |
| **scrim / shadow** | Modal dim layer / cast-shadow colour (usually neutral-0) |

## Light / dark tone map

The inversion rule: light uses **mid/dark tones for fills + light "on-" tones**;
dark flips it. (Surface-container integers vary ±1–2 across M3 revisions — the
*ordering and spacing* is what matters, not the exact value.)

| Role | Light | Dark |
|---|---|---|
| primary | 40 | 80 |
| on-primary | 100 | 20 |
| primary-container | 90 | 30 |
| on-primary-container | 10 | 90 |
| (secondary / tertiary / error follow the same pattern) | 40 / 100 / 90 / 10 | 80 / 20 / 30 / 90 |
| surface | 98 | 6 |
| surface-dim → bright | 87 → 98 | 6 → 24 |
| surface-container lowest…highest | 100, 96, 94, 92, 90 | 4, 10, 12, 17, 22 |
| on-surface / on-surface-variant | 10 / 30 | 90 / 80 |
| outline / outline-variant | 50 / 80 | 60 / 30 |
| inverse-surface / inverse-primary | 20 / 80 | 90 / 40 |

## Rules we adopt

1. **Never ship a fill without its `on-` pair.** Tokens come in pairs; every
   accent/container generates a legible foreground in the same step.
2. **Container + on-container for soft fills** (chips, badges, callouts); reserve
   solid `primary`/`on-primary` for the one high-emphasis action per view.
3. **Elevation = surface tone, not just shadow.** Climb the surface-container
   ladder for raised layers (cleaner in dark mode than stacked drop-shadows);
   keep `shadow`/`scrim` for true overlays.
4. **Contrast baked into tone choice** — pick tones, not hex, and AA falls out
   (tone-40 vs tone-100, and the dark flip, guarantee ≥3:1 UI / ≥4.5:1 body).
5. **One seed → full light + dark.** No parallel dark palette to maintain.
6. **Neutrals carry low chroma from the seed** so surfaces feel tinted toward
   the brand, not dead grey.

## How it maps to UIL4B

**Flow:** seed → HCT → 5 key colours → 5 tonal palettes → tone-map table →
light + dark **role tokens** → export as CSS custom properties.

- **Brand System Builder owns** the seed/brand colour, optional secondary/
  tertiary hues, and chroma/expression (vivid vs muted) — *"what is the brand?"*
- **UI System Builder owns** mapping palettes → roles, the surface ladder,
  interaction states, light/dark parity, contrast validation, and token export —
  *"how does the brand become a usable UI system?"*
- **Token bridge** — keep our existing token names as the public contract; let
  M3 be the generation engine behind them: `--brand` ← primary-40/80; `--bg-0…4`
  ← the surface-container ladder; `--t0…3` ← on-surface / on-surface-variant;
  `--border` ← outline-variant; `--accent` ← tertiary.
- **Colour Studio** (existing palette + contrast logic) is the natural home for
  the HCT generator + WCAG checks; both Builders consume its output. *(Confirm
  the exact module before building.)*

## Sources

M3's own `how-the-system-works` and `roles` pages return 403 through our proxy;
this is reconstructed from the official mirror + Android docs + search, and
verified where possible. Verify exact surface-container integers against
`material-color-utilities` at build time.

- [material-components-android `Color.md`](https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md) — role list + tone mappings.
- [Android Wear M3 — Color roles & tokens](https://developer.android.com/design/ui/wear/guides/styles/color/roles-tokens) — per-role purposes, contrast guarantee.
- [material-color-utilities](https://github.com/material-foundation/material-color-utilities) — the open-source seed→scheme (HCT) engine to wrap.
- [M3 colour system](https://m3.material.io/styles/color/system/how-the-system-works) · [M3 colour roles](https://m3.material.io/styles/color/roles) — primary references (403 via proxy).
