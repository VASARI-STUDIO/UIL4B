# Design Language V2 — the UIL4B visual system

> Reference doc for UIL4B. **Source of truth for the V2 look.** Derived from the
> founder's Claude Design project *"UI L4B Homepage Redesign V2.0"*
> (`UIL4B Homepage.dc.html`, project `23fe89e5-031b-4932-bb79-ae109ad65d3b`),
> imported 2026-08-16.
>
> Every V2 UI workstream builds against **this file**, not against the `.dc.html`
> directly. If this doc and the design file disagree, the disagreement is a bug —
> raise it, don't silently pick one.

## Provenance and one correction

`github.md` in the design project records that the mock's content was lifted from
`src/pages/Landing.jsx`. **`Landing.jsx` no longer exists.** It was dead code —
imported by nothing and routed nowhere — and has since been deleted outright,
along with the 156 `.landing-*` selectors it owned in `global.css`
(`landing-page-orphaned`). The live homepage is `src/pages/Home.jsx`.

This does not weaken the mock's provenance, but it does change how to read it:
the content the mock was lifted from is now only in git history, so treat the
`.dc.html` as the record of it rather than expecting a file to compare against.

So V2 is a **visual and structural** source, not a content source. Apply it to
`Home.jsx`, which already carries the three things the founder asked to keep:

| Keep | Where |
|---|---|
| Navigation system | `PillNav` |
| The real interactive tools | `HomeWorkbench` (1,068 lines, 5 tabs) |
| Smooth scroll + micro-animations | `useHomeMotion()` — Lenis + GSAP, reduced-motion guarded |

The sticky-scroll section must be driven by **`HomeWorkbench`'s existing tools**.
Do not rebuild the demos from the mock's fake `PALETTES` / `ICONS` / `PAIRS`
arrays — those are mock fixtures. The mock defines the *frame*; the real tools
fill it.

---

## Palette

### Light (default)

| Token | V2 value | Was |
|---|---|---|
| `--bg` (page) | `#EFEEE9` warm bone | white/grey |
| `--surf` (raised) | `#FFFFFF` | — |
| `--fg` (ink) | `#0F0F10` | — |
| `--mute` (secondary) | `#6C6C66` | — |
| `--line` (border) | `#DAD8CF` | — |
| `--accent` | **`#0F6FFF` blue** | `#2563EB` blue |
| `--hi` (highlight) | `#E9FF64` acid lime | *new role* |

> **Accent decision, founder, 2026-08-16: blue `#0F6FFF`.** The design file ships
> violet `#6B4EF0` as its default, but exposes four accents as theme props and the
> founder chose the blue. Blue is the selected accent everywhere in V2; the violet
> is not a fallback and should not appear.

### Dark

`--bg:#101012` · `--surf:#191A1D` · `--fg:#F2F1EC` · `--mute:#8E8E88` ·
`--line:#2A2B2F` · `--accent:#6FA8FF` · `--hi:#E9FF64`

The accent **lightens** in dark mode; the highlight does not. The design ships an
explicit map, which is the rule for any future accent:

```
#6B4EF0 → #9A81FF    #0F6FFF → #6FA8FF
#0FA97F → #3FD9AC    #D24B32 → #FF8468
```

### ⚠️ The blue accent is not safe for small text

`#0F6FFF` on the `#EFEEE9` page ground measures **≈3.85:1**. That clears WCAG AA
for large text (≥24px, or ≥18.66px bold) and for non-text UI, but **fails the
4.5:1 floor for normal body text**. V2 uses the accent heavily for 11–12px mono
eyebrows, counts and category labels — at that size it is a genuine failure, not
a rounding argument.

The existing token architecture already solves this. Use:

- **`--accent` `#0F6FFF`** — fills, borders, icons, large display text, focus rings.
- **`--accent-strong`** — any accent-coloured text below large size. It must be
  darkened until it measures **≥4.5:1** on both `--bg` and `--surf`. `#0B5ED7`
  measures ≈5.07:1 on `#EFEEE9` and is a sound starting point; verify rather than
  trusting that figure.

Dark mode needs the mirror check: `#6FA8FF` is light-on-dark, so it clears
comfortably on `#101012` — confirm, don't assume.

### The highlight is a new, scarce role

`--hi` (`#E9FF64`) is not a general accent. In the whole design it appears
exactly four times: the hero headline mark, the `AAA` contrast badge, the Pro row
in pricing, and `::selection`. **Budget: at most one `--hi` element per
viewport.** It reads as a marker pen — spend it on the single most important
thing on screen and nowhere else.

`::selection { background:#E9FF64; color:#0F0F10 }` is global.

### Founder-selectable accents

The design exposes accent (`#6B4EF0`, **`#0F6FFF` ← selected**, `#0FA97F`,
`#D24B32`) and highlight (**`#E9FF64` ← selected**, `#FFD93D`, `#39E5B6`,
`#FF8E72`) as theme props. Keep the existing M3 role generation in
[`color-system-m3.md`](color-system-m3.md) — V2 changes the **seed**, not the
method. The other three accents remain available should the founder re-pick, but
each would need its own contrast pass before use.

---

## Type

Two families, both from Google Fonts. This replaces `Outfit` in all three roles.

| Role | Family | Weights | Used for |
|---|---|---|---|
| `--font` | **Manrope** | 400 / 500 / 700 / 800 | All UI and display |
| `--mono` | **JetBrains Mono** | 400 / 500 / 700 | Eyebrows, meta, category pills, keycaps, code, footer headings, stat lines |

There is no serif role. The token formerly called `--serif` resolved to Manrope
and was renamed `--display` on 2026-09-04 — same face as `--font`, used at
display sizes. Nothing in this system delivers serif/sans typographic contrast;
contrast comes from Manrope vs JetBrains Mono, and from weight and scale.

**Mono is load-bearing in V2.** It is the texture that makes the design feel like
a tool rather than a marketing page. Eyebrows (`[ COMMUNITY ]`, `01 / COLOUR`),
counts, `⌘K`, token names and category tags are all mono, usually `11–12px` with
`letter-spacing: .08–.1em`, in `--mute` or `--accent`.

### Display scale

| Level | Size | Weight | Tracking |
|---|---|---|---|
| Hero h1 | `clamp(46px, 6.6vw, 96px)` | 800 | `-0.045em`, `line-height:0.98` |
| Section h2 | `clamp(30px, 3.8vw, 48px)` | 800 | `-0.04em` |
| Step h3 | `clamp(26px, 2.8vw, 36px)` | 800 | `-0.03em` |
| Card title | `19px` | 800 | `-0.02em` |
| Body | `16–18px` | 400 | `line-height:1.6–1.65`, `--mute` |

Headings take `text-wrap: balance`; paragraphs take `text-wrap: pretty` and cap
at `42–54ch`.

---

## Shape — one button, one panel ladder

### Buttons: pill, always

**Every** button, CTA, chip, tab, keycap and badge in V2 is `border-radius:999px`.
There is no second button shape. This supersedes the "squarer-with-soft-corners
set — small radii, not pill-everything" note in
[`css-conventions.md`](css-conventions.md), which described V1 and must be
updated when the token remap lands.

Three button treatments, and no others:

| Treatment | Fill | Text | Use |
|---|---|---|---|
| **Primary** | `--accent` | `#fff` | The one action that moves the funnel |
| **Inverse** | `--fg` | `--bg` | Nav "Start free", in-panel tool links |
| **Quiet** | `--surf` + `1px --line` | `--fg` | Secondary / "See all" |

### Panels: remap the existing scale

The V2 radii (6/10/12/14/16/18/24) map onto the existing token names, so **every
existing call site inherits V2 rounding from one edit**:

| Token | V1 | **V2** | Applies to |
|---|---|---|---|
| `--radius-xs` | 3px | **6px** | Tint chips, highlight mark |
| `--radius-s` | 5px | **10px** | Icon tiles, scale rows |
| `--radius` | 7px | **12px** | Swatches, token blocks, inline search |
| `--radius-l` | 10px | **14px** | Inputs, command bar, pricing rows |
| `--radius-xl` | 13px | **16px** | Community / feed cards |
| `--radius-2xl` | 18px | **18px** | Tool cards, sticky demo panel *(unchanged)* |
| `--radius-3xl` | — | **24px** | *new* — full-width feature panels |
| `--radius-pill` | 999px | **999px** | All buttons *(unchanged)* |

> Do the remap **in the token block only**. Do not sweep call sites — the whole
> point of the remap is that call sites already reference the names.

### Elevation

Two shadows carry the design; both are soft, large and low-opacity.

```css
--shadow-cmd:   0 12px 40px rgba(0,0,0,.07);   /* command bar */
--shadow-panel: 0 24px 70px rgba(0,0,0,.09);   /* sticky demo panel, modals */
```

---

## Motion

V2 adds nothing exotic — it is restrained and mostly hover-scale. Map onto the
existing named scale in [`css-conventions.md`](css-conventions.md); **do not
introduce raw literals.**

| Design literal | Use | Existing token |
|---|---|---|
| `.2s ease` | Card hover: `border-color` + `translateY(-3px)` | `--dur-2` `--ease-standard` |
| `.3s ease` | Theme swap, swatch `flex 1→1.8`, step-title opacity | `--dur-3` `--ease-standard` |

Signature interactions worth preserving:

- **Card hover** — `border-color: --line → --fg` *and* `transform: translateY(-3px)`. Both, together. This is the primary hover language across the whole app.
- **Swatch hover** — the swatch grows `flex:1 → 1.8`, pushing its neighbours. Palette-specific; keep it.
- **Sticky step sync** — inactive step titles sit at `opacity:.4`, the active one at `1`.

The mock drives the sticky section with a raw `window.addEventListener('scroll')`
handler. **Do not port that.** Use the existing Lenis/GSAP setup in
`useHomeMotion()` and its reduced-motion guard.

---

## Structural patterns

Reusable beyond the homepage — these are the app's V2 vocabulary.

1. **Sticky header** — `--bg` fill, `1px --line` bottom border, wordmark in mono with a `/route` suffix in `--mute`, inverse pill CTA.
2. **Command bar** — mono `>` prompt · borderless input · `⌘K` keycap pill · `--shadow-cmd`, over a results panel of `[glyph | title + body | category pill]` rows separated by `1px --line`, with quick-fill chips beneath. The app already has `CommandPalette`; V2 gives it a front door.
3. **Sticky demo panel** — browser chrome (three `--line` dots + mono label), body swaps with scroll position. `position:sticky; top:96px`.
4. **Eyebrow** — mono, `letter-spacing:.1em`, in `--accent`, bracketed: `[ COMMUNITY ]`.
5. **Stat line** — mono, `·`-separated, `--mute`: `40+ TOOLS · 200K ICONS · 1,200 FONTS`.
6. **Inverted feature panel** — `--fg` background, `--bg` text, `--radius-3xl`. Used for pricing; the strongest emphasis device in the system. One per page, maximum.
7. **Card grid** — `--surf` fill, `1px --line`, `--radius-2xl`, `26px` padding, mono glyph → 800 title → `--mute` body → `open →` in mono pinned to the bottom.

### Page background

`--bg` is `#EFEEE9`, a warm bone — **not** white and not a saturated tint. This
satisfies the founder's "light shade of the subtle colour" note: content sits on
white `--surf` cards floating above a warm ground. Do not tint the page with the
accent hue.

---

## Deviations from the mock — approved, deliberate

| Mock | Ship instead | Why |
|---|---|---|
| Pro at `$6/mo` | **`$7` monthly · `$18` quarterly ($6/mo) · `$48` yearly ($4/mo)**; lifetime `$89.99 → $99` | Founder-approved ladder, 2026-08-16. Headline everywhere is **"from $4/month"**. |
| "all prices AUD" in footer | USD base, existing multi-currency | `api/_lib/pricing.js` has `BASE_CURRENCY = 'usd'` and 8 currencies. The mock line is wrong. |
| Fake `/tools/*` hrefs | Real routes from `toolTree.js` | The mock invents routes (`/tools/colour-palette-generator`). Never ship a link the router doesn't have. |
| Mock nav (Tools/How/Community/Pricing) | Existing `PillNav` | Founder: keep the current navigation system. |
| Hard-coded hex in markup | Tokens | Single-stylesheet rule stands; the mock is inline-styled because it is a mock. |
