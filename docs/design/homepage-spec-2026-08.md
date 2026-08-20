# Homepage design specification — August 2026

> Buildable specification for the V2 homepage rework (founder batch 2026-08-20,
> Group C: C1–C13). **Design authority only — no code in this file.**
>
> **Inputs.** `docs/research/homepage-patterns-2026-08.md` (Mobbin, 95 cited
> captures) · `docs/build-plan/founder-batch-2026-08-20.md` (F-1…F-4) ·
> `docs/reference/design-language-v2.md` · `docs/reference/growth-persuasion.md`
> · `docs/reference/positioning.md` · a fresh Mobbin pass run for this spec ·
> and a **rendered measurement pass** run against `src/pages/Home.jsx` on a local
> dev build (§0).
>
> **Evidence classes.** `measured` (a number actually run here) · `observed`
> (seen in a cited Mobbin capture) · `inferred` (reasoned from observed
> evidence) · `judgement` (design opinion, no evidence). Every non-obvious claim
> below is labelled.
>
> **What this file does not decide.** No price amounts (F-1 is unresolved and
> `api/_lib/pricing.js` is a Human Validation Zone). No Stripe, auth or
> entitlement behaviour. No founder biography. Nothing about the `/plans` page
> beyond the homepage panel's own structure.

---

## §0 — Measured findings from this pass

Run 2026-08-20 against `vite dev` on the current working tree, Chromium, at two
viewports. These convert three of the research document's open `judgement` calls
into `measured` facts. **Do not re-diagnose them.**

### 0.1 The workbench panel's height is the "jumpy" tab switch. `measured`

Topic 8 of the research named the height change as its primary suspect and asked
for verification before any motion value was touched. Verified — and it is worse
than the hypothesis. Heights of `.hsteps-sticky .hw-shell`, by tab:

| Tab | @ 1440×900 | @ 1024×768 |
|---|---|---|
| `palette` | 445px | 467px |
| `gradient` | 527px | 596px |
| `image` | **758px** | 758px |
| `icon` | 441px | 558px |
| `typography` | 591px | **918px** |
| **Swing** | **317px** | **451px** |

Two consequences:

1. Switching from `icon` to `image` grows the panel by **317px in one frame** at
   1440×900, and from `palette` to `typography` by **451px** at 1024×768.
   Everything below the panel moves with it. That is the whole complaint.
2. At 1024×768 the tallest panel (918px) is **150px taller than the entire
   viewport**. C1 ("centre the graphic vertically") is *not implementable* until
   the panel is capped — you cannot centre something that does not fit.

**Therefore: the fixed panel frame (§4.1) is a precondition for both C1 and C3,
and it is the first thing to build.**

### 0.2 The hero highlight is clipped by 19px, not 13px. `measured`

F-2 identified the cause correctly (`overflow:hidden` on `.home-hero-line` with
`line-height:.98`, compensated at the bottom only) and proposed mirroring the
existing `.14em`. **Measured at the 96px cap (1440×900): the `--hi` mark's
painted inline box is 130px tall against a 93.1px line box, and 19px shears off
the top; 4px still shears off the bottom even with the existing `.14em`
compensation.**

`.14em` × 95.04px = 13.3px — **the proposed fix under-delivers by ~6px and the
mark would still clip.** The correct value is derived from font metrics, not
chosen: half-leading each side = (1.368em − 0.98em) ÷ 2 ≈ **0.194em**. Specify
`0.2em`, which covers it at every clamp size because it is expressed in `em`.

### 0.3 Collapsing the inactive steps costs zero layout shift. `measured`

`.hstep` reserves `min-height:62vh` and centres its content:

| Viewport | Reserved box | Natural content | Slack |
|---|---|---|---|
| 1440×900 | 558px | 317–343px | 215–241px |
| 1024×768 | 476px | 327px | 149px |

Because the content is shorter than the reserve at both sizes, hiding an
inactive step's body/points/CTA **does not change the box height**. The collapse
recommended by Topic 7 is therefore CLS-free — *provided the reserve stays and is
floored so the expanded step can never exceed it* (§3.4).

### 0.4 The typing animation cannot shift layout, by construction. `measured`

`.hcmd-bar` is `grid-template-columns: auto minmax(0,1fr) auto`. The input's
width is set by the grid track, not by its content, so **placeholder text of any
length produces zero layout change**. The CLS budget (currently mean 0.0000 —
`homepage-field-metrics` in `src/data/pipeline.js`) is safe as long as the
animation never introduces an in-flow element that sizes on content. §2.2
specifies the reserved-width approach that guarantees this.

### 0.5 The "Try" chip row is left-aligned under a centred hero. `measured`

`.hcmd-chips` computes `justify-content: normal`. At 1440 the row spans the full
660px `.hcmd` measure while its content is only 441px wide, so it reads as
flush-left beneath a centred headline, sub-line and command bar. Founder
complaint C7 reproduced exactly.

### 0.6 Existing homepage targets already clear WCAG 2.5.8. `measured`

`.hcmd-chip` 34px · `.hcmd-kbd` 36px · `.hw-tab` 44px · `.hcomm-tab` 36px. All
clear the 24px minimum. Every new target specified below inherits the same
floor, and the existing `≤480px` rule that lifts small targets to 40px extends
to the new components.

### 0.7 Correction to the research: the Docs routes no longer exist. `measured`

Topic 5 recommends the Learn strip link to "the routes that actually exist today
— `DocsDesign`, `DocsBrand`, `DocsSEO`, `DocsAI`". **Those routes are gone.**
`src/App.jsx:336-343` redirects `/docs`, `/docs-design`, `/docs-social`,
`/docs-themes`, `/docs-brand`, `/docs-seo`, `/docs-marketing` and `/docs-ai` all
to `/learn`. Every entry in `LEARN_GROUPS` (`src/data/toolTree.js:167-175`) is
`soon: true` with `route: '/learn'`.

The only live Learn-surface destinations are **`/learn`** (the honest
coming-soon `SurfaceLanding`) and **`/help`** (`HelpCentre`). This rewrites §8
substantially and is why no read-times appear there.

---

## §1 — Page order

Current: hero → workspace → toolset → community → pricing → CTA.

**Specified:**

| # | Section | Eyebrow | Status |
|---|---|---|---|
| 1 | Hero | — | reworked (§2) |
| 2 | Live workbench, sticky scroll | `[ THE WORKSPACE ]` | reworked (§3, §4) |
| 3 | The toolset | `[ THE TOOLSET ]` | copy + card change (§5) |
| 4 | The gallery | `[ DISCOVER ]` | **pivoted** (§6) |
| 5 | Export | `[ EXPORT ]` | **new** (§7) |
| 6 | Pricing | `[ PRICING ]` | structure only (§9) |
| 7 | Learn | `[ LEARN ]` | **new** (§8) |
| 8 | `SystemCTA` | — | unchanged |

**Deviation from the research, stated.** Topic 4 recommends export sit
immediately after the workbench and before the gallery ("tools working → what
comes out → what others made → price"). This spec puts export **immediately
before pricing** instead, because Topic 4 also designates export as *the proof
section for the Pro line*, and proof lands hardest adjacent to the ask. The
gallery becomes the lower-commitment beat in the middle. `judgement` — one
ordering swap, cheap to reverse if the founder prefers the research's sequence.

**Eyebrow words.** `[ COMMUNITY ]` becomes `[ DISCOVER ]` (§6.2 — nothing in the
grid is community-submitted yet, so the old word was a claim we cannot back).
`[ EXPORT ]` and `[ LEARN ]` are new. The bracketed mono device itself is
untouched — corroborated by Grok
([products](https://mobbin.com/sites/sections/af82f082-c333-48b4-8601-ca330ec1b109))
and BitcoinOS
([article](https://mobbin.com/sites/sections/744a8baf-ae51-43ce-916d-7ac79130e96d)).
All eyebrows keep `--accent-strong`, never `--accent`, at `--fs-micro`.

> `[ THE WORKSPACE ]` conflicts with the CLAUDE.md rule that "Workspace" must
> not appear in user-facing copy — see §14, Open decision 4. Flagged, not
> changed: the research says the eyebrows stay, and the founder did not raise it.

---

## §2 — Hero

### 2.1 · H-1 — the highlight clips the line above it (C5 / F-2)

**Problem.** `--hi` on `.home-mark` paints the full inline box; `.home-hero-line`
clips it at the top; measured 19px is sheared off (§0.2).

**Pattern.** No Mobbin pattern applies — this is a typographic defect, and the
fix is a font-metric derivation, not a reference.

**Specification.**

- `.home-hero-line` gains a **top** compensation mirroring the existing bottom
  one: `padding-top: .2em; margin-top: -.2em`. Raise the existing bottom pair
  from `.14em` to `.2em` in the same edit so both edges use one value and the
  4px bottom shear (§0.2) closes too.
- `overflow:hidden` **stays** — it is the mask for the `home-hero-clip-up`
  entrance and removing it lets the two headline lines slide through one another
  (already fixed once; do not regress it).
- Do **not** relax `line-height` below `.98` as the primary fix. The V2 display
  scale specifies `.98` and the mark's overflow is a function of the font's
  ascent/descent, not the leading — a looser line-height would mask the symptom
  and change the hero's whole rhythm.
- `.home-mark` keeps `--radius-xs`, `padding: 0 .1em`, `box-decoration-break:
  clone`. Add **`padding-block: .06em`** so the marker reads as a marker rather
  than a tight underlay — this is what makes the extra clip room legible rather
  than merely uncropped.
- Vertical rhythm: `.home-hero-sub` moves from `var(--s-5)` to **`var(--s-6)`**
  top margin at ≥981px. The founder asked for "more spacing" as well as the
  clip fix; the mark now occupies more of its line box, so the sub-line needs
  the extra step to keep the same optical gap. The `max-height:900px` rule that
  tightens the hero on short laptops keeps its `var(--s-4)` override.

**Verification required.** The clip container is the entrance mask. Re-run the
hero entrance in a browser at 1440×900 and at 380px after the change, and
confirm the reduced-motion paths at `global.css:5386-5388` still settle the hero
instantly. A static measurement is not sufficient (F-2's trap).

**Responsive.** Phone: at `clamp()`'s 46px floor, `.2em` = 9.2px — still correct,
because the derivation is proportional. Tablet and desktop: unchanged logic.

### 2.2 · H-2 — the search bar types, pauses, backspaces, types again (C6)

**Problem.** The command bar is the hero's primary instrument and it is
motionless. A visitor does not know it searches until they type.

**Pattern.** Mobbin returned **no capture of a typing animation** — this is
honestly the weakest-evidenced item in the batch, and the research says so. What
Mobbin does show is the family of states such an animation passes through, and
all of them make the sample query **visually distinct from user input**:
ClickUp's muted sample query
([get the answer](https://mobbin.com/sites/sections/7c24c474-7b8e-4c0a-a8be-b3588c67233f)),
mymind's oversized non-input typography
([associative searching](https://mobbin.com/sites/sections/191d027d-69c2-4609-b3b6-60e57d42521e)),
Copy.ai's focused field with a visible caret over a placeholder and an open
suggestion list
([hero](https://mobbin.com/sites/sections/c646a2dd-b699-44fc-a414-9a9a8b908cc2)).
A fresh pass run for this spec adds **OpenPhone**
([help centre](https://mobbin.com/sites/sections/e4996806-6bbc-4e34-8517-3895f4d7febf))
— a centred search field with a labelled `Popular:` row of underlined query
links directly beneath it, which is also the reference for §2.3.

Everything below about *pacing* is `judgement`. No timing here is
evidence-backed and none should be attributed to Mobbin.

**Specification — structure.**

- The `<input>`'s **`value` stays empty** for the entire animation. Cycling the
  value creates a field the visitor must clear before using; every observed
  example designs around exactly that. `inferred`, consistent across six
  captures.
- The animating text is a **decorative overlay**, not the placeholder attribute
  and not the value:
  - Wrap the input in a `position:relative; display:grid; min-width:0` element
    occupying the existing `minmax(0,1fr)` grid track of `.hcmd-bar`. The track
    is unchanged, so the bar's geometry is unchanged.
  - The overlay is `position:absolute; inset:0; display:flex; align-items:center;
    pointer-events:none; aria-hidden="true"`. **Out of flow — this is the
    reserved-width guarantee.** Combined with §0.4, the animation cannot
    contribute to CLS at any string length.
  - Overlay type: `var(--font)`, `var(--fs-body)`, weight 500, colour
    **`var(--t3)`** — the same colour the real placeholder uses, so the demo
    reads as a placeholder rather than as someone's dirty input (ClickUp's
    muted-colour signal, `observed`).
  - The caret is a `1px` × `1.15em` block in `var(--accent)` rendered as the
    overlay's last flex child. It sits after the text, so it moves with the
    typing without any measurement.
- The input keeps a **static, non-animating `placeholder`** (`Search tools —
  contrast, gradient, type scale…`) for the moment the overlay is hidden, and
  keeps its existing stable `aria-label="Search every UIL4B tool"`.
- The overlay is hidden the instant the input is non-empty or focused.

**Specification — content.** Cycle the product's own taxonomy, using the
strings already asserted by `tests/user-sim` to return real results — the same
strings the quick-fill chips beneath use:

```
contrast  →  gradient  →  type scale  →  icons
```

This makes the animation teach the search vocabulary rather than decorate.
`observed` support: Airbnb's chip row
([search](https://mobbin.com/sites/sections/04ec26fb-062e-4210-815d-08ef23fa0888))
is the static form of the same idea.

**Specification — motion.** All values `judgement`.

| Phase | Value | Notes |
|---|---|---|
| Start delay | `1200ms` after mount | The command bar's own entrance ends at ~1140ms; the animation must not overlap it |
| Type | `60ms` per character | Deliberately slow. The pattern's whole risk is looking gimmicky |
| Hold at full | `2200ms` | The founder's "after a couple of seconds" |
| Backspace | `30ms` per character | Faster than typing — how people actually delete |
| Gap before next | `500ms` | |
| Caret blink | `1060ms`, `steps(1)`, infinite | Stops with the cycle |
| **Loop count** | **one full pass, then stop** | After the fourth query it stays on screen and the caret stops. **No perpetual loop** — motion in a reader's peripheral vision while they read the headline is the gimmicky failure the research warns about. Total run ≈ 16s |

No `transition`/`easing` token applies — this is discrete text substitution, not
an interpolated property. Do not invent an easing for it.

**Specification — stopping.**

- **Permanent stop on first interaction.** `focus`, `input`, `pointerdown` or any
  keypress on the bar freezes the cycle for the session and hides the overlay.
  Precedent is on this very page: `pinnedRef` in `Home.jsx` stops scroll from
  overriding a manual tab choice.
- **Pause when off-screen.** An `IntersectionObserver` on `.hcmd` pauses the
  cycle when the hero leaves the viewport and does not resume it. No frames are
  burned below the fold.

**Rejected: the results payoff.** Topic 9 suggests rendering the real results
panel for the first cycled query (Copy.ai / Dovetail show the payoff, not just
the query). **Reject it.** `.hcmd-results` is an in-flow sibling below
`.hcmd-bar`; showing and hiding it moves every element beneath, which is a
guaranteed CLS regression against a 0.0000 baseline. The quick-fill chips
already give the visitor a one-click route to a real result set. `measured`
reasoning, from §0.4.

**Reduced motion.** Required, both directions, matching `global.css:5386-5388`:

- JS reads the same `prefersReducedMotion()` contract as `useHomeMotion.js` —
  the `data-reduced-motion` attribute wins over the OS query in **both**
  directions, so a visitor who turned motion back on inside the app still gets
  the animation.
- When reduced: the cycle never starts. The overlay renders **one static
  query** (`contrast`) with **no caret and no blink**. The field is still
  empty, so the demo is still honest.
- CSS mirror for the caret: `animation:none` under both
  `@media (prefers-reduced-motion:reduce) html:not([data-reduced-motion="false"])`
  and `html[data-reduced-motion="true"]`.

**Screen readers.** The overlay is `aria-hidden="true"`. The input's accessible
name comes from its stable `aria-label`, never from the animating string — a
name that changes every few seconds inside a search field is an interruption,
not a hint. The existing `role="status" aria-live="polite"` result count is
untouched and stays silent while the field is empty.

**Focus order.** Unchanged: prompt glyph (decorative) → input → `⌘K` keycap
button → results rows → chips. The overlay is `pointer-events:none` and not
focusable, so it inserts nothing.

**Responsive.** Phone (≤480px): the animation runs, but the type-speed is
unchanged and the query set is unchanged. The `⌘K` keycap is already hidden at
this width; the overlay is not affected. Tablet/desktop: identical.

### 2.3 · H-3 — centre the "try" line (C7)

**Problem.** §0.5 — the chip row is flush-left beneath a centred hero.

**Pattern.** OpenPhone
([help centre](https://mobbin.com/sites/sections/e4996806-6bbc-4e34-8517-3895f4d7febf))
— a centred search field with `Popular:` and three underlined query links
centred directly beneath it. `observed`. Airbnb
([search](https://mobbin.com/sites/sections/04ec26fb-062e-4210-815d-08ef23fa0888))
centres a five-chip row under a centred field the same way.

**Specification.**

- `.hcmd-chips` takes `justify-content: center`.
- `.hcmd` keeps `text-align: left` — the bar itself, its results rows and the
  empty state must stay left-aligned. Only the chip row centres.
- The `Try` label keeps `--fs-micro`, `--mono`, `--t3`, and keeps
  `aria-hidden="true"` (each chip already carries its own
  `aria-label="Search for …"`). It stays the first flex child so it reads as a
  label for the row, not as a chip.
- Chips keep `--radius-pill`, 34px min-height, 40px at ≤480px.

**Responsive.** ≤380px the `Try` label is already hidden; centring then applies
to the chips alone, which is correct. At ≥981px the row centres within the 660px
`.hcmd` measure, so it sits under the bar rather than under the page.

---

## §3 — Sticky scroll section

### 3.1 · S-1 — centre the graphic vertically (C1)

**Problem.** `.hsteps-sticky` pins at `top: calc(var(--nav-clear) + var(--s-4))`
(measured 84px) — top-aligned, not centred. And §0.1: at 1024×768 the tallest
panel is 150px taller than the viewport, so centring is impossible until the
panel is capped.

**Pattern.** Ditto
([workflow](https://mobbin.com/sites/sections/74f2a8a6-5b4f-4590-8ae1-7a9ae2231aa5))
and Sana
([product panel](https://mobbin.com/sites/sections/01be0505-beef-4ed0-a932-76fb40a07ae8))
both float the pinned panel on a tinted ground with visible margin above and
below rather than letting it touch the viewport edges; the active text block
sits roughly at the pinned panel's vertical centre. `observed` for layout, no
measurement available.

**Specification.**

- **Precondition:** §4.1 (fixed panel frame). Build that first.
- `.hsteps-sticky` becomes a full-height sticky box that centres its child:
  - `position: sticky`
  - `top: var(--nav-clear)`
  - `height: calc(100svh - var(--nav-clear))`
  - `display: grid; align-content: safe center`
- **`safe center` is load-bearing.** It centres while the panel fits and falls
  back to start-alignment when it does not, so a panel taller than the available
  box can never overflow off the top of the screen where it is unreachable. If
  `safe` is unavailable in a target browser, the fallback is `align-content:
  start` plus the §4.1 cap — never plain `center`.
- `100svh` (not `vh`/`dvh`): a mobile URL bar collapsing must not resize the
  pinned box mid-scroll. Same reasoning as the existing `.home-hero` rule.
- The panel keeps `--shadow-panel` and `--radius-2xl` (V2 structural pattern 3).
- Guard: this whole block stays inside the existing `@media(min-width:981px)`,
  in step with the `matchMedia` guard in `useHomeMotion.js`. Below 981px there is
  no sticky column.

**Reduced motion.** The existing block already sets `.hsteps-sticky {position:
static}` under both guards. Extend it to also reset `height: auto` and
`align-content: start`, so the panel becomes a normal in-flow block. Both
directions, mirroring `global.css:5386-5388`.

**Responsive.** Phone/tablet (<981px): no sticky, no centring — a plain stacked
read, panel after its step. Desktop: centred as above.

### 3.2 · S-2 — change the panel when the text is higher on the screen (C2)

**Problem.** `ScrollTrigger` fires at `start:'top 55%'`. Because the step *box*
is 558px tall while its *content* is 317–343px and centred (§0.3), the text's
optical centre sits at **≈86% of viewport height** when the swap fires — the
bottom seventh of the screen. Derived from §0.3 measurements; `measured`.

**Pattern.** No Mobbin evidence exists for scroll trigger points — the research
is explicit that Mobbin captures states, not motion. The only direct evidence of
transition *feel* in the entire research is Anchor's accidental mid-transition
frame
([product tabs](https://mobbin.com/sites/sections/682fde40-6191-44c4-a246-c75ad9d9c2f2)),
which shows a **per-line staged arrival** rather than a block cut. `observed`.

**Specification.**

- **Key the trigger to the step's own centre, not its top.** Keying to `top` is
  the bug: with a tall reserve box, `top` is nowhere near the text.
  - `start: 'center 52%'` — activates as the step's centre passes just below the
    viewport middle, scrolling down.
  - `end: 'center 44%'` — reactivates on `onEnterBack`, scrolling up.
  - The 8%-of-viewport band (72px at 900px) is deliberate hysteresis; without it
    a step sitting exactly on the line flickers between modes.
- Keep `onEnter` and `onEnterBack` both calling `activate`. Keep `pinnedRef` —
  once the visitor drives the tablist, scroll stops overriding them.
- **The 44–56% window is the tuning range.** One number, one line, easy for the
  founder to nudge after seeing it.

> **Founder wording is ambiguous** — "just before centre" could mean the swap
> fires slightly before the text reaches centre (≈56%) or when the text has
> passed slightly above it (≈44%). This spec reads it as *at, or a hair above,
> centre* and picks 52/44. Either reading lands inside the tuning window, and
> both are enormous improvements on the measured 86%. See §14, Open decision 1.

**Reduced motion.** The sync never runs (`useHomeMotion` returns early), the
steps all render at `opacity:1`, and the workbench's own tablist is the sole
control. Already correct — do not change it.

**Responsive.** Desktop only (≥981px). Below that there is no sync to trigger.

### 3.3 · S-3 — `02 / GRADIENT` (C9) — **the recommendation**

**Problem.** `.hstep-num` renders `{num} / {kicker}` — an ordinal with no
denominator, bolted to a category word the step's own heading already implies.
The founder reads it as AI-generated, and the research agrees: it is the *form*
of meta-information without the meta-information.

**Pattern.** Mobbin's test, `inferred` across eight captures: a sequence marker
earns its place when it carries information the reader cannot already see —
position within a known total (Daydream `01 / 04`,
[operating model](https://mobbin.com/sites/sections/db6e26f1-2858-4509-85e9-0236e05f3802)),
a different axis (Seed's `Day 1` / `Week 4`,
[benefits timeline](https://mobbin.com/sites/sections/0a635ee3-8326-4ebe-bd7f-89a3230a8d2e)),
or a cross-reference to something else on screen (Grammarly's circled numerals
matching callout pins on the screenshot above,
[business section](https://mobbin.com/sites/sections/1db9aea8-a59f-4359-9e58-d46d4d73b84a)).
Ditto
([workflow](https://mobbin.com/sites/sections/74f2a8a6-5b4f-4590-8ae1-7a9ae2231aa5))
drops numerals entirely: a vertical connector with a coloured dot per step, so
order becomes spatial.

**Two options.**

**Option A — the fraction.** `01 / COLOUR` becomes `01 / 05`, mono,
`--accent-strong`, the category word folded into the step title. Matches
Daydream exactly, one character-class of change, adds a progress signal the
pinned section currently lacks.

**Option B — the route, plus a connector. ← RECOMMENDED.** Replace the numeral
entirely:

- **Meta line becomes the tool's real route**, mono, `--fs-micro`,
  `letter-spacing:.08em`, `--t3`:
  `/color/palette` · `/color/gradient` · `/file-converter` · `/icons` ·
  `/typescale`.
- **Order becomes spatial**, Ditto-style: a `1px --line` vertical connector down
  the left edge of `.hsteps-rail`, with a `9px` dot per step centred on it.
  Inactive dot: `--bg-1` fill, `1px --line` border. Active dot: `--accent` fill,
  no border, `transition: background var(--dur-2) var(--ease-standard)`.
- The rail indents by `var(--s-5)` to clear the connector.

**Why B over A.** The founder asked for "something else", and A is the same
device with a different denominator — a real risk it reads as the same tic. B
passes all three of Mobbin's tests at once: the route is a fact the reader
cannot see; it is a **cross-reference**, because the panel beside it already
renders `UIL4B / Create / {mode}` in its own chrome, so the string points at
something on screen (Grammarly's test, which A fails); and the connector supplies
the progress signal A was introducing. It is also unmistakably a tool product
rather than a template, which is the actual brief. `judgement`, but a
well-supported one.

**Not recommended:** the Squarespace/Trawelt giant-numeral treatment
([how-it-works](https://mobbin.com/sites/sections/ef3efe83-bc75-4ef1-8ead-f758883587b3)).
Real and effective, but it is display typography that would fight the panel for
attention, and V2's emphasis budget is spent.

**Screen-reader treatment of the decorative numbering.**

- The route string is `aria-hidden="true"`. "Slash colour slash gradient" is
  noise, and it duplicates the step's CTA destination.
- The connector and dots are `aria-hidden="true"` — pure decoration.
- **Position is not lost.** `.hsteps-rail` is already an `<ol>`; assistive
  technology announces "list item 2 of 5" natively. The visible numbering was
  always redundant to AT, which is itself an argument for removing it.
- The step's accessible sequence therefore comes from list semantics, and its
  destination from the CTA's own text ("Open Gradient Generator").

**Target sizes.** If Option B's step titles become buttons (§3.4), each is a
full-width target well over 24px; the dots are decorative and are never targets.

### 3.4 · S-4 — collapse the inactive steps

**Problem.** All five steps render at full length simultaneously — title, body,
three ticked points and a CTA each — with only an opacity change. That is a very
long left column, which forces a long scroll distance, which is what makes the
pinned panel feel like it is lagging behind the text. Not a founder complaint,
but Topic 7 names it as the single largest lever on the section's feel, and
§0.3 shows it is free.

**Pattern.** Mural
([start strong](https://mobbin.com/sites/sections/94100049-8b7d-4b4a-a114-bde6f6dd71f5))
— the active step is a filled card carrying title *and* description; the four
inactive steps are bare titles on hairline dividers with **no body copy at all**.
The rail's height barely changes and the reader's eye has one place to be.
`observed`; the strongest single capture in Topic 7.

**Specification.**

- Inactive step renders: connector dot, route line, title only.
- Active step renders: all of the above plus body, points and CTA.
- **The collapse must not shift layout.** Hide the sub-content with
  `visibility:hidden; opacity:0`, never `display:none`, and keep the reserve —
  `.hstep { min-height: max(58vh, 380px) }`. The `380px` floor is derived from
  §0.3 (measured max natural content 343px) plus headroom; it guarantees the
  expanded active step never exceeds the reserve at any viewport height, which
  is what makes the collapse CLS-free.
- Sub-content transition: `opacity var(--dur-3) var(--ease-standard)`,
  `visibility` stepped at the same duration. Inactive title stays at
  `opacity:.4` per V2's motion note; active at `1`.
- **Make the rail clickable.** Each step title becomes a `<button>` that sets
  `mode` and pins it, using the same path `onTabChange` already takes.
  Scroll-only is an impatience and accessibility failure — Mural, Anchor, Ada,
  Daydream and Figma all make the equivalent rail operable. Daydream's prev/next
  circular buttons are the same idea.
- The reserve drop from `62vh` to `58vh` shortens the rail by ~20vh overall and
  tightens the pacing C2 complains about. It is a tuning knob; the floor is not.

**Reduced motion.** All steps render **expanded** with `opacity:1` and
`min-height:0` — the existing block at `global.css` already does this for
opacity and min-height; extend the same selectors to force `visibility:visible;
opacity:1` on the sub-content so a reduced-motion visitor reads a plain,
complete stacked list. Both directions.

**Responsive.** <981px: no collapse at all — every step renders expanded,
because there is no sticky panel to sync against and a collapsed step would hide
content behind an interaction the layout does not explain. Desktop: as above.

### 3.5 · S-5 — the section heading (C8)

**Problem.** Founder: *"i dont like 'Not a screenshot. The actual tools, running
here.' this just sounds stupid"* (`Home.jsx:260`).

**Pattern.** Topic 3's clearest finding: every persuasive section heading in the
sample **names a consequence for the reader** — ElevenLabs "Our creative suite of
AI audio tools reimagines professional workflows"
([creative suite](https://mobbin.com/sites/sections/096778a1-7d16-4119-8b49-6db127275d74)),
1Password "Protection for all – from enterprises to individuals"
([protection for all](https://mobbin.com/sites/sections/41ed7eaf-aed8-4ca6-a362-7757f2f91146)),
Figma "The right tool for any job"
([FigJam](https://mobbin.com/sites/sections/45aee286-54a3-4545-a416-a85f6fa6ca62)).
`observed`.

**Copy — two options.**

> **Option 1 — RECOMMENDED**
> **Use the tools here, then take the values with you.**

> Option 2
> **Try the whole thing before you make an account.**

Option 1 names the consequence in the product's own noun ("values"), and it sets
up the export section that now follows. Option 2 answers the reader's real
objection but overlaps the hero's existing `No credit card · No setup` line.

Neither uses the denial-then-assertion construction the founder rejected. No
superlatives, no "effortless/supercharge/reimagine".

**Lede — keep, unchanged:**

> Everything below is live: real generated values, real keyboard handling, real
> clipboard. Nothing saves, nothing needs an account, and every panel names
> where it hands off before you press it.

It is doing the honest work the rejected headline was trying to do, and it names
real limits, which is exactly what the anti-slop bar asks for.

---

## §4 — The mini-tool (C3, C4, F-3)

### 4.1 · W-1 — one fixed frame for all five modes

**Problem.** §0.1 — a 317–451px height swing between tabs. The founder's
"jumpy". Precondition for §3.1.

**Pattern.** Topic 8's most actionable finding: **none of the observed panels
change size between tabs.** Poly
([view modes](https://mobbin.com/sites/sections/954077a6-b1a9-4625-8e1f-5e0d6fc7783d)),
Sunday
([designed for real use](https://mobbin.com/sites/sections/e8714fa3-9716-45f1-80a8-ec75f10465c1)),
Zipline
([platform](https://mobbin.com/sites/sections/ce7e2b2b-54f9-4a13-952e-4a895a0f7c30))
and MOUTHWASH
([case study](https://mobbin.com/sites/sections/f1dc0b80-5422-410e-86fd-0d64a1b998e5))
all switch content inside a fixed-size media frame with the segmented control
floated over its lower edge. `observed`.

**Specification.**

- A single token drives the frame:
  `--hw-frame: clamp(420px, calc(100svh - var(--nav-clear) - var(--s-8)), 640px)`.
  At 1440×900 that resolves to ~640px; at 1024×768 to ~636px — both **below the
  measured 758/918px worst cases**, which is the point: the modes must fit the
  frame, not the frame the modes.
- `.hw-panel` in the sticky variant takes `height: var(--hw-frame)` and its
  content is laid out inside it, so `.hw-shell` is the same height in all five
  modes and nothing below the panel ever moves.
- **The two zones inside the frame** (Topic 10's canonical structure, §4.3):
  - `preview` — `flex: 1 1 auto; min-height: 240px`. The artefact. Never
    scrolls, never leaves the frame.
  - `controls` — `flex: 0 0 auto; max-height: 46%; overflow-y: auto;
    overscroll-behavior: contain`. Only the controls may scroll, and only when a
    mode genuinely needs it.
- **Design constraint on the engineer:** `image` and `typography` must be
  re-laid-out to fit `--hw-frame` at a 471px column width without internal
  scrolling. §4.3 says how. Internal scroll is the fallback, not the plan.
- The frame is **layout, not motion** — it stays in force under reduced motion.
  This is the anti-jump fix and it must not be conditional.

**Responsive.** Phone/tablet: `--hw-frame` resolves toward its 420px floor and
the section variant (`variant="section"`) keeps its own natural height — the
fixed frame is only required where the panel is pinned and where a height change
moves the page. Desktop: as above.

### 4.2 · W-2 — the tab transition (C3)

**Problem.** With §4.1 in place the container no longer resizes; what remains is
a hard content cut, which reads as a cut rather than a change.

**Pattern.** Two separate animations, and only one should be fast — `inferred`
from Topic 8. The indicator is a small positional change and reads as responsive
when quick; the content is a large change and reads as violent at the same
speed. Anchor's mid-transition capture
([product tabs](https://mobbin.com/sites/sections/682fde40-6191-44c4-a246-c75ad9d9c2f2))
is the only direct evidence of feel available and shows a **staged, per-line
arrival**. `observed`.

**Specification.** All values from the project's named scale
(`global.css:60-65`); no raw literals.

| Element | Property | Duration | Easing |
|---|---|---|---|
| `.hw-tab` label + icon colour, background | `color`, `background` | `--dur-2` (200ms) | `--ease-standard` |
| `.hw-tab[data-active]::after` underline | `background`, `opacity` | `--dur-2` | `--ease-standard` |
| Panel content arrival | `opacity 0→1`, `translateY(8px→0)` | `--dur-3` (280ms) | `--ease-entrance` |
| Per-child stagger inside `.hw-body` | `animation-delay` | `40ms` × index, **capped at 3** | — |

- **Enter-only, no cross-fade.** React unmounts the old panel; because the frame
  is fixed (§4.1), nothing moves, so an exit fade buys nothing and costs a
  double mount. The new panel simply settles in. A true cross-fade (both trees
  mounted, outgoing `--dur-1`/`--ease-exit`, incoming starting at 80ms) is an
  optional upgrade, not a requirement.
- The indicator finishing at 200ms while the content finishes at ~400ms is
  deliberate: the click is acknowledged immediately, the content arrives
  considered.
- **Do not adopt Ada's expanding-pill treatment**
  ([top features](https://mobbin.com/sites/sections/9b10b8f3-262e-497f-9d9a-6dabc7e14593))
  — it reflows layout on every selection, the opposite of the requested fix.
- Keep pills. V2 permits no other button shape, and Zipline/Poly/Sunday all use
  pill segmented controls anyway.

> **Timing is `judgement`.** Mobbin provided no timing evidence whatsoever and
> none should be attributed to it. The durations are the project's existing
> tokens, chosen for the separation principle above.

**Reduced motion.** Both directions, `global.css:5386-5388` pattern:
`.hw-panel` content animation → `animation:none`; tab transitions →
`transition:none`. The swap becomes instantaneous. **The fixed frame stays** —
without it a reduced-motion visitor gets the worst version of the bug (a 451px
jump with no transition to soften it).

**Focus order.** Unchanged and already correct: the tablist is a roving tab stop
(`tabIndex` 0 on the active tab, −1 elsewhere) with arrow-key navigation, and
`aria-selected` / `aria-controls` / `aria-labelledby` are already wired. The
panel's `role="tabpanel"` and the `role="status" aria-live="polite"` announcer
are untouched. **When the rail titles become buttons (§3.4), they must not enter
the tablist** — they are ordinary buttons that set the same state, so they get
their own tab stops and no `role="tab"`.

**Target sizes.** `.hw-tab` measures 44px (§0.6). At ≤480px keep it ≥44px; do
not let the five-tab row shrink below the 24px floor by squeezing.

### 4.3 · W-3 — make the previews feel like the real app (C4)

**Problem.** Founder: *"make the live previews look and feel more like the
actual app"*. The panel already wears app chrome (three dots, a
`UIL4B / Create / {mode}` breadcrumb, a `Live preview` state readout) — the gap
is inside the panel, where the controls read as marketing widgets rather than
tool controls.

**Pattern.** Topic 10 — six rules, each observed in at least three creative
apps. The four that apply here:

1. **Canvas above, controls below.** Spotify
   ([create cover art](https://mobbin.com/screens/a10af09d-6ee0-4d3b-953d-ca6b55c17841))
   is the clearest: live canvas on top, control drawer beneath, tabs *inside*
   the drawer. `observed`.
2. **Every slider gets a numeric readout, and it is editable.** The iOS system
   colour sheet across Apple Notes
   ([sliders](https://mobbin.com/screens/63d95cf0-0452-451f-aa1c-0a5c2654c4c4)),
   Freeform, Tiimo and yope; Spotify's two labelled sliders each with a numeric
   readout in a fixed right-hand column. **The most consistently observed detail
   in the entire topic.**
3. **Options scroll sideways in a rail; properties stack vertically as
   label-left / control-right rows. The two are never mixed.** Linktree
   ([style panel](https://mobbin.com/screens/3a795edb-c8ae-4277-9fe1-cd7fa67d8515)),
   Spotify, Play
   ([property inspector](https://mobbin.com/screens/e2228a8f-fd11-46e6-8321-76e7f46a608d)).
4. **Name the colour space.** The iOS sheet writes `sRGB Hex Colour #`, not
   `Hex`. Squarespace
   ([edit palette](https://mobbin.com/screens/30f6998c-36ca-4505-bc77-6173d63e34fa))
   puts a `Hex ▾` format selector immediately left of the value field.

**Specification.**

- **Two zones per mode**, exactly as §4.1 defines them. The artefact pins to the
  top of the frame; controls sit beneath it. This one decision makes the rest
  fall out and it is what closes the height swing.
- **Every numeric control gains an editable readout** in a fixed right-hand
  column: gradient angle, type base size, type ratio, icon stroke width, image
  compression. `min-height:32px`, `--radius`, `--mono` for the value, `--font`
  for the label. On a narrow column a slider alone cannot hit a precise value —
  the number is the real input and the slider is the coarse one.
- **Split rails from rows.** Icon sizes and stroke widths and image formats are
  *options* → a horizontally scrolling rail of pill tiles, active one inverted.
  Base size, ratio, angle and compression are *properties* → stacked
  label-left/control-right rows. Do not put both in one vertical stack. This is
  also what buys back the vertical space `typography` and `image` need to fit the
  frame.
- **Label the colour space.** Every hex field in the palette and gradient panels
  reads `sRGB hex` rather than `Hex`. For a product whose pitch is defensible
  colour systems — with an M3 method documented in `color-system-m3.md` — naming
  the space is both more correct and a credibility signal that costs four
  characters.
- **Keep the chrome and keep it honest.** The dots stay `--line`-coloured (a
  window affordance, not a macOS pastiche), the breadcrumb keeps tracking the
  active tab, and the whole bar stays `aria-hidden="true"` with nothing
  focusable inside it. Do **not** move the tablist into the chrome bar — an
  `aria-hidden` container cannot hold the section's primary control. The tabs
  already sit on the panel, which is the docking win Topic 8 was after.
- Buttons inside the panel keep `.hw-btn`'s shape and the app's `--radius-l`, so
  the widget and the tool page use one control language.

**Reduced motion.** No new animation is introduced by this item beyond the
existing hover language; the V2 swatch `flex:1→1.8` hover stays and is already
covered by the global clamp. State any new hover with `--dur-2`
`--ease-standard` and no transform under reduced motion.

**Responsive.** Phone: the two zones stack as canvas-then-controls at full
width; the options rail scrolls horizontally with `scrollbar-width:none` as
`.hw-tabs` already does. Tablet: same, wider. Desktop: as above. **Tablet is
`judgement` only — Mobbin returned no tablet-sized captures, and the responsive
audit (B2) should run its own pass rather than extrapolating from phones.**

### 4.4 · W-4 — the default gradient is violet (F-3)

**Problem.** `HomeWorkbench.jsx:239` — `DEFAULT_GRADIENT = { from:'#7C3AED',
to:'#22D3EE' }`. `#7C3AED` is the design file's default violet, and `CHANGELOG.md`
records for V2 that the violet is **not used anywhere**. It is sample content
rather than a token, so it is not a token bug — but the first thing a visitor
sees demonstrated is violet/cyan while the product's accent is `#0F6FFF`.

**Specification — decided.** Do not pick a new hex. **Seed the gradient panel's
two stops from the palette panel's current first and last swatch.** The two
modes then visibly share one system, which is literally the product's pitch —
"a value you set in one tool is set in all of them" (§5) — demonstrated rather
than asserted, in the one place on the page where two tools sit side by side.

- The seed applies on first render of the gradient mode only; once the visitor
  edits a stop, their value stands for the session (the workbench already holds
  one state bag per mode).
- Fallback if the coupling is judged too much for this slice: a blue→teal pair
  drawn from existing tokens. **The violet must not survive either way.**

`judgement`. No Mobbin evidence bears on it; the argument is product coherence.

---

## §5 — The toolset section (C10)

**Problem.** Founder: *"'Six categories. One account.' … this section makes me
feel like skipping over it"* (`Home.jsx:319`). The instinct is right and Topic 3
explains why: six identical `--surf` cards, each with an icon glyph, a
description and **a nested `<ul>` of every tool route**. Every entry has
identical visual weight and reads descriptively, so the reader correctly infers
they can skip the block.

**Pattern.** The failure mode is Patreon's tile directory
([all tools and resources](https://mobbin.com/sites/sections/2c5b55e8-5381-40a0-9788-39b88eab081a))
— the least persuasive section in the whole research sample. The fix is
Family B: give each entry its own image or colour identity and title it with the
outcome. ElevenLabs
([creative suite](https://mobbin.com/sites/sections/096778a1-7d16-4119-8b49-6db127275d74))
puts a screenshot of the tool actually in use inside each card; Teachable
([more options](https://mobbin.com/sites/sections/24bd8e84-5b3c-4fd2-8020-04c5a8335275))
gives each card a distinct coloured illustration band and a mono-caps title.
`observed`.

**Specification.**

1. **Cut the nested tool list from the card face.** Replace it with a single
   derived count line in mono `--t3`: `7 tools · 2 soon`. The count must be
   **computed from `CREATE_GROUPS` at module load**, exactly as `LIVE_TOOL_COUNT`
   already is, so the claim can never drift from the product. The full route
   list belongs on the category page, which `group.home` already links to.
2. **Replace the icon glyph with evidence.** UIL4B has an advantage none of the
   referenced companies had: `HomeWorkbench` already renders live output for five
   of the six categories. Put a **small, static, non-interactive render** at the
   head of each card — a five-step ramp for Colour, a type specimen for Type, a
   3×3 icon set for Icons, a format strip for Imagery. Highest-value change in
   this section. The sixth (UI Component Builder) keeps its glyph and its `Soon`
   badge, because there is nothing live to render and faking one would be the
   exact slop the founder is objecting to elsewhere.
   - Render height `88px`, `--radius-s`, `1px --line`, `--bg-2` ground.
   - `aria-hidden="true"` — the card's title and description carry the meaning.
3. **Keep the `Soon` badges** and keep the sentence "Component tooling is coming
   next." It is canonical founder direction (surface-principles.md) and must be
   named, never hidden.
4. Keep V2 card hover: `border-color: --line → --fg` **and**
   `transform: translateY(-3px)`, together, `--dur-2` `--ease-standard`. That is
   the primary hover language across the whole app.
5. **Considered and not recommended:** Mural's expanding left rail
   ([start strong](https://mobbin.com/sites/sections/94100049-8b7d-4b4a-a114-bde6f6dd71f5)).
   It is the most information-efficient version of the pattern in the sample, but
   the page already has one scroll-driven mechanic directly above it and two in
   sequence is a lot. If the founder wants this section shorter rather than
   better, adopt it — but make it click-driven, not scroll-driven.

**Copy — heading, two options.**

> **Option 1 — RECOMMENDED**
> **A value you set in one tool is set in all of them.**

> Option 2
> **Every tool writes to the same system, so you never re-type a value.**

Option 1 is the promise currently buried in the lede, promoted to the H2 where
Topic 3 says it belongs — it names the consequence rather than an inventory and
a billing fact. Option 2 names the removed friction more explicitly (which
`growth-persuasion.md` §Pillar 1 asks for) but runs long for
`clamp(30px,3.8vw,48px)` display type.

**Lede — revised**, since its first clause is now the headline:

> Six categories, one account, and one system underneath them. Component tooling
> is coming next.

**Accessibility.** The `sr-only` family descriptions (`htool-fam-*`) stay — a
screen-reader user still needs to hear which workbench mode a tool resolves
into, and cutting the visible route list must not cut that relationship. Every
card link keeps its real `to` route. Card targets exceed 24px throughout.

**Responsive.** Phone: one column, render band full-width. Tablet (≤1180px): two
columns. Desktop: three columns, unchanged.

---

## §6 — The gallery (C11) — **the consequential change**

### 6.1 · The problem, stated precisely

Founder: *"'Systems worth stealing.' is bad copy. this whole section is to
showcase the community gallery so pivot towards that"* (`Home.jsx:386`).

The copy is the smaller half. The larger half is the data:

- `COMMUNITY_DESIGNS` (`src/data/communityDesigns.js`) is **twelve outbound links
  to Dribbble, Awwwards, Behance and Mobbin** — other people's inspiration
  sites. Not community systems, and not UIL4B content.
- `Home.jsx:415-419` renders each as
  `<a href={design.url} target="_blank" rel="noopener noreferrer nofollow">`.
- So the section labelled `[ COMMUNITY ]` currently **sends visitors off the
  site**, which is precisely the failure `positioning.md` warns about: Discover
  must "link back to the relevant UIL4B tools so Discover drives users *into*
  the product, not away."

The seed data is honest — it was deliberately rewritten to stop fabricating
designers and save counts, and that integrity work must be preserved. It is
simply the wrong source for a section whose job is to showcase our gallery.

### 6.2 · The pivot, as a concrete data and behaviour change

**Change the source.** Stop rendering `COMMUNITY_DESIGNS` on the homepage.
Render the live UIL4B galleries instead — all four already exist and ship real
data:

| Source module | Export | Count | Live route |
|---|---|---|---|
| `src/data/paletteGallery.js` | `GALLERY_PALETTES` | 64 | `/discover/palettes` |
| `src/data/gradientGallery.js` | `GALLERY_GRADIENTS` | 100 | `/discover/gradients` |
| `src/data/brandPalettes.js` (via `paletteLibrary.js`) | `BRAND_LIBRARY_PALETTES` | 36 | `/discover/palettes` |

**Change the thumbnail.** The generated `--hcomm-c1/--hcomm-c2` two-stop gradient
is a decorative stand-in for content that does not exist. Replace it with **the
artefact itself**: a palette card renders its four swatches; a gradient card
renders `gradientCss(type, angle, stops)`. Still no external asset, still no
Storage dependency, still renders offline — and now the thumbnail *is* the
product rather than a picture of nothing. This is the single change that turns
the section from a link list into a gallery.

**Change the link.** Every card links **inward**, to a real in-product route
with the values already loaded, using the helpers that already exist:

- `paletteBuilderUrl(colors)` → `/color/palette?c=…`
- `gradientToolUrl(g)` → `/color/gradient?gs=…&gt=…&ga=…&gn=…`

No `target="_blank"`, no `rel="nofollow"`, no outbound host. **This is the
behaviour change the founder's instruction actually requires.**

**Change the density.** Six large cards in three columns reads as a curated
sample. Go to a **4-column grid of 12 items** with a `Show more` pill that
expands in place rather than navigating away. Lovable
([From the Community](https://mobbin.com/sites/sections/bf12496d-52c5-487f-997e-eb9f6b9bdeab),
[lower half](https://mobbin.com/sites/sections/c0aa7b35-1950-418e-aa77-11a0c882631a))
shows twelve thumbnails in four columns with exactly that expander. `observed`;
"density beats size" is `inferred`.

**Change the hover verb.** Gamma
([template preview](https://mobbin.com/flows/691a707b-e858-47dd-be49-93e9e6fbbb4f)),
Mural
([preview a template](https://mobbin.com/flows/e81aba69-d55b-426e-9c5c-e078b3f366fa))
and Figma Community
([template details](https://mobbin.com/flows/1fe086ce-7352-4497-b9b4-a50083696f86))
all reveal the primary action on hover over the thumbnail, and **all three chose
the *use* verb over the *view* verb.** `observed`, three independent flows.

- Hover / focus-within reveals two stacked pill buttons over the thumbnail:
  **`Open in Palette Builder`** (primary, `--accent` fill) above **`Copy CSS`**
  (quiet, `--surf` + `1px --line`). Gradient cards read `Open in Gradient
  Generator` / `Copy CSS`.
- Reveal: `opacity 0→1` `--dur-2` `--ease-standard`. No transform on the buttons
  themselves; the card keeps the V2 `translateY(-3px)` lift.
- **The buttons must be reachable without a pointer**: they are always in the
  DOM and always focusable; the reveal is visual only, driven by `:hover`,
  `:focus-within` and `:focus-visible`. A hover-only affordance would put the
  section's primary action out of reach of the keyboard.

**Change the metric.** Today each card shows `{saves} saves`, which is honestly
zero across the board and reads as emptiness rather than integrity. Palettes and
gradients have no save signal on the homepage. **Show the artefact's own facts
instead** — a palette card shows its four hex values in mono on hover; a
gradient card shows its type (`Linear` / `Radial` / `Conic`). When the community
backend lands, switch to the **reuse** metric (opens/remixes), not saves —
Lovable chose `Remixes`, Figma `users`, Uxcel upvotes
([contest winners](https://mobbin.com/sites/sections/41e2650d-c0dc-40c1-94fa-e24bdfca1a1d)).
`observed` for the metric choice; `judgement` for the interim.

**Move the honesty note, keep it intact.** `.hcomm-note` currently sits between
the heading and the grid, so the section opens on a disclaimer. Move it **below
the grid, beside the CTA**, at `--fs-caption` `--t2`. It must survive — it is
doing real integrity work.

### 6.3 · Copy

**Eyebrow:** `[ DISCOVER ]` — the product's actual surface name. `[ COMMUNITY ]`
is retired until member submissions exist; claiming a community we have not
built yet is exactly the fabricated-proof failure `growth-persuasion.md`
forbids.

**Heading — two options.**

> **Option 1 — RECOMMENDED**
> **Start from something that already works.**

> Option 2
> **Open any of these straight into the editor.**

Option 1 names the reader's benefit and is honest about what the grid is — a set
of curated starting points, not member work. Option 2 names the mechanism, which
the hover buttons already demonstrate. Lovable's flat `From the Community`
works precisely because the grid does the talking; ours cannot use that phrase
until the grid is genuinely community-sourced.

**Sub-line, under the grid beside the CTA:**

> Every card opens in the tool with its values already loaded. Member
> submissions and real save counts arrive with the community build.

**Section CTA:** keep the quiet text-link treatment — the gallery is the
persuasion, the link is plumbing (`observed`, Lovable's `View All`). Keep
`Explore Discover →` → `/discover`.

**Note for a later slice (out of scope here).** `SurfaceLanding.jsx:22` gives
`/discover` the H1 **"Find systems worth stealing."** — the same phrase the
founder just rejected. If it is bad on the homepage it is bad there. That is
batch item D3, not this spec, but it should not be forgotten.

**Accessibility.** Cards remain a `<ul>` of `<li>`. Each card's accessible name
is the artefact name; the swatch/gradient render is `aria-hidden="true"`. The
two hover buttons are real focusable controls in DOM order after the card link,
each ≥40px tall. The `Show more` pill announces the new count through the
existing polite live region pattern.

**Responsive.** Phone: one column, hover buttons become always-visible (there is
no hover on touch) — this is a genuine behaviour difference and must be
specified, not left to `:hover` never firing. Tablet (≤1180px): two columns.
Desktop ≥1180px: four columns.

---

## §7 — Export (C12) — **new section**

### 7.1 · Why it exists and where it sits

Founder: a new section showing off the export abilities. This is the
best-covered topic in the entire research — developer-facing "you get real code
out" sections are a mature, well-solved pattern — and Topic 4 designates it as
**the proof section for the Pro line**.

Placement: between the gallery and pricing (§1).

### 7.2 · Pattern

**Resend is the reference**
([integrate this morning](https://mobbin.com/sites/sections/ba73bbd7-0644-4c95-b730-f32830a6ef34)):
a format switcher whose *breadth is the claim*, a code panel with tool-chrome
signals (line numbers in a muted gutter, a copy icon visible **at rest**), and a
footer carrying two quiet text exits (`View on GitHub`, `Download ZIP`).
`observed`.

**Stripe**
([designed for developers](https://mobbin.com/sites/sections/286613b2-cec3-4b45-ba6e-77930aa42ef4))
adds the move that makes a code block persuasive rather than decorative: it
stacks **the code above its own output** — the API call on top, a terminal
showing real log lines beneath. Webflow
([developers](https://mobbin.com/sites/sections/cb749566-b4c0-4a83-a3b2-6799ac6b0cbe))
does the same request/response pairing inside one panel. `observed`.

**Browserbase**
([works with the tools you already use](https://mobbin.com/sites/sections/7b413555-643c-4e2d-9efb-2ee108b6b90c))
is the restrained version, and its best detail is **inline `// comments` used as
narration** — they do the explaining a paragraph would otherwise do.

**The closest analogue to our actual product is Sketch**
([make handoff colorful](https://mobbin.com/sites/sections/3ea93e9a-8591-423b-aef7-d78fedddd674))
— a colour-token export section whose visual is a screenshot of the product's own
`Copy To Clipboard ›` menu expanding to `Hex`, `RGB`, `HSL`, `Swift`… The format
list is shown as the product's UI, not as marketing chips.

**Token-card treatment** for the input half: Mural
([colour palette](https://mobbin.com/sites/sections/617cde5a-9515-4ce1-b1f2-5e78811b29ef))
— colour block, name, hairline rule, `Hex #FF4B4B` in mono; Linear
([brand colours](https://mobbin.com/sites/sections/f0c7f39b-7818-4461-a3f7-ab32ee183c67))
— value centred inside the swatch.

### 7.3 · Specification

**Structure — Stripe's pairing, Resend's switcher, collapsed to one tier.**

```
[ EXPORT ]
H2
lede

┌─ input ──────────────┐   ┌─ output ─────────────────────────┐
│ five-swatch ramp     │   │ ● ● ●   tokens.css        [copy] │
│ + names + sRGB hex   │ → │  1  :root {                      │
│ (Mural/Linear card)  │   │  2    --color-primary-500: …     │
│ type ladder, 3 rows  │   │  3  }                            │
└──────────────────────┘   └──────────────────────────────────┘
        [ CSS custom properties · DTCG tokens · Tailwind · Style guide ]
        Open the Colour System Generator →
```

- **Left panel — the system as the user sees it.** A five-swatch ramp with names
  and `sRGB hex` values (Mural/Linear token-card treatment), plus three rows of
  the type ladder. `--radius-2xl`, `--surf`, `1px --line`.
- **Right panel — the same system as a file.** Reuse the V2 sticky-panel browser
  chrome: three `--line` dots plus a mono label. **The mono label is the
  filename**, which is a free extra signal that the export is a *file*:
  `tokens.css` · `tokens.json` · `tailwind.config.js` · `style-guide.html`.
  `--radius-2xl`, `--shadow-panel`.
- That pairing — input and output in one frame — is the entire pitch of the
  product, and no competitor in the research sample has an equivalent.

**The switcher.** One row of four pill tabs beneath the panel pair:
`CSS custom properties` · `DTCG tokens` · `Tailwind` · `Style guide`. Four is not
twelve, so one tier is correct. Pills are already the only button shape in V2, so
this needs no new component. Active tab: `--fg` fill, `--bg` text (V2's inverse
treatment). `min-height:40px`.

**Feed it from the real exporter — non-negotiable.** The code shown must be the
actual output of the shipped builders for a fixed sample system:

| Tab | Real source |
|---|---|
| CSS custom properties | `buildSystemExports().css` (`src/utils/uiSystem.js`) / `buildCSSVars()` (`src/utils/exportBuilder.js`) |
| DTCG tokens | `buildSystemExports().dtcg` |
| Tailwind | `buildSystemExports().tailwind` |
| Style guide | `buildStyleGuideHTML()` (`src/utils/exportBuilder.js`) |

A hand-written code sample here would be the one dishonest thing on the page —
and it would drift the first time the exporter changes. This is the same
principle `Home.jsx` already applies to `LIVE_TOOL_COUNT`.

**Panel chrome details.**

- Line numbers in a muted `--t3` gutter, `--mono`, non-selectable.
- **Copy button visible at rest**, top-right, not on hover (Resend, Browserbase).
  ≥32px target. On press: the button's label swaps to `Copied` for 1600ms and the
  change is announced through a polite live region.
- Two or three `// comments` inside the CSS output used as narration, Browserbase-
  style, naming what the reader is looking at.
- Vertical overflow inside the code panel scrolls; the section never scrolls
  horizontally.

**The Style guide tab is the exception.** Three of the four formats are code; the
styled HTML page is a *rendered artefact*. When that tab is active, render the
**page** in the panel, not its source — a scaled, non-interactive, `aria-hidden`
render with the same filename in the chrome. This is the one place the pattern
needs adapting rather than copying.

**Footer exit.** One quiet text link with a mono label, Resend-style:
**`Open the Colour System Generator →`** → `/color`.

> **Do not invent an `/export` route.** `/export` currently redirects to
> `/color` (`App.jsx`), and export runs as a panel inside the tool. Never ship a
> link the router does not have — a standing V2 deviation rule.

**The Pro line.** Exports are what Pro unlocks, so this is the natural place to
say so — but the entitlement wording must be **bound to whatever `/plans` says**,
rendered from the same source, never restated here. F-1 is unresolved and
entitlements are a Human Validation Zone. One short line under the footer exit,
no amounts, no badge.

### 7.4 · Copy

**Eyebrow:** `[ EXPORT ]`

**Heading — two options.**

> **Option 1 — RECOMMENDED**
> **Everything you build here comes out as code.**

> Option 2
> **Four formats, generated from the system you just built.**

Option 1 states the consequence in seven words and lets the panel prove it.
Option 2 names the breadth, which the switcher already shows.

**Lede:**

> The panel on the right is the real exporter running on a sample system — the
> same function that writes your files. Nothing here is hand-written.

That last sentence is the honesty note this section needs, and it is verifiable.

### 7.5 · Accessibility

- The switcher is a **tablist** (`role="tablist"` / `role="tab"` /
  `role="tabpanel"`) with a roving tab stop and arrow-key navigation — the same
  contract `HomeWorkbench` already implements. Do not build it as plain buttons.
- Panel swap animation matches §4.2 exactly: content `opacity 0→1` +
  `translateY(8px→0)`, `--dur-3`, `--ease-entrance`; indicator `--dur-2`
  `--ease-standard`. **Reduced motion, both directions: `animation:none`,
  instant swap.**
- **The panel height is fixed across all four tabs**, for the same reason as
  §4.1 — four formats of wildly different length must not resize the section.
  `height: clamp(320px, 42vh, 480px)`, content scrolls inside.
- The code block is a `<pre>` with a real accessible name
  (`aria-label="tokens.css — CSS custom properties export"`). Line numbers are
  `aria-hidden` and generated in CSS, never as text content, so a copy from
  selection does not carry them.
- The rendered style-guide preview is `aria-hidden="true"` with a visible text
  equivalent beside it naming what it is; a scaled render is not readable content.
- Focus order: heading → left panel (static, not focusable) → code panel → copy
  button → switcher tabs → footer exit.
- Targets: tabs ≥40px, copy button ≥32px, footer link ≥24px.

### 7.6 · Responsive

- **Phone.** Panels stack: swatch/type card first, code panel beneath. The
  switcher becomes a horizontally scrolling pill rail (`scrollbar-width:none`),
  matching `.hw-tabs`. Code panel fixed height drops to `clamp(240px,38vh,320px)`.
- **Tablet.** Same stack, wider panels; switcher fits on one line.
- **Desktop.** Side-by-side pairing as drawn, switcher centred beneath.

---

## §8 — Learn (C13) — **new section**

### 8.1 · The constraint that dominates

Founder: a section about Learn — "information that makes you a better designer /
brand designer / builder."

**§0.7: there is nothing to link to yet.** Every Docs route redirects to
`/learn`; every `LEARN_GROUPS` entry is `soon: true` with `route: '/learn'`. The
standing rule in `src/data/pipeline.js` (`learn-content`) is explicit: *"Homepage
Soon Learn cards should be non-navigable preview states until scoped article
destinations ship, then link to those destinations instead of looping generically
to /learn."*

So this section must prove Learn *exists as an intention* and is worth returning
for — without implying a library that does not exist. Building the shell before
the content produces the exact "AI generated site" feel the founder is objecting
to elsewhere: a grid of plausible-looking cards that go nowhere.

### 8.2 · Pattern

**Do not build the destination-grid pattern on a homepage.** Sketch
([Guides & Courses](https://mobbin.com/sites/sections/7fde2329-84c2-4efa-ad6f-5f933dfaab80))
and Stripe
([Guides and resources](https://mobbin.com/sites/sections/ea7fe67c-9a3c-4245-bd54-ab6af4822260))
are destination pages and need a real corpus with cover art.

**Build the strip.** Figma
([learn how to use Figma](https://mobbin.com/sites/sections/5e5e1437-b37b-4648-8649-e2fe6f7f71e0))
— a company with an enormous learning library — spends **two lines** on its
homepage: one heading and three underlined inline links, each followed by a small
coloured glyph. `observed`.

**Use a list, not a grid.** A fresh pass run for this spec found the row form
that survives a small library: **Better Stack**
([community guides](https://mobbin.com/sites/sections/10d84fbc-93ec-46ed-88de-4d4f9eb6e45d))
groups guides under a titled card — group name, a one-line description of what
the group is for, then rows of `[glyph | title | duration | chevron]` with the
duration right-aligned in a fixed column. **Slack**
([previously featured tutorials](https://mobbin.com/sites/sections/96fdaa44-80ae-473b-8635-c1b170c72b15))
uses the same list form with author and date in a left column. `observed`, both
new to this spec. A four-row list reads as a considered programme; a four-card
grid reads as a half-built page.

**Modality beats topic when the library is small.** Dropbox
([fundamentals](https://mobbin.com/sites/sections/daaed103-83a8-4b8c-82f5-b2410feedeb0))
splits by *how you learn* (instructor-led / self-guided / quick start), not by
subject. `observed` — worth adopting when content lands, not now.

### 8.3 · Specification

- **A strip, two to three rows of vertical space.** Not a grid, not a carousel.
  Heading, one lede line, a list of four rows, one CTA.
- Row anatomy, Better Stack's, adapted:
  `[ 20px line glyph | title (--fs-body-s, 700) | status column (right) | chevron ]`
  on `1px --line` dividers, `--radius-l` container, `--surf` fill.
- **The status column carries `Soon`, not a read time.** Notion and Framer both
  name the time cost and it is the highest-signal, lowest-cost metadata
  available — **but there is no honest read time for an unwritten guide, and
  inventing one is fabrication.** Adopt the format-and-time idea when the
  articles exist; until then the column tells the truth.
- **Rows that are `soon` are not links.** They render as non-navigable preview
  rows — no `<a>`, no chevron affordance, `aria-disabled` semantics via plain
  text plus a visible `Soon` badge. This is the `pipeline.js` rule, and it is
  also what stops the section reading as generated.
- **Exactly one live row.** `Help & Getting Started` → `/help`, which is a real
  route with real content today. It carries the chevron and no badge, so the
  difference between shipped and coming is visible at a glance rather than
  claimed in prose.
- **One CTA** beneath the list: a quiet pill, `See what's coming →` → `/learn`.
  `/learn` is the honest coming-soon surface landing and owns its own messaging.
- Rows to show (from `LEARN_GROUPS`, so the list cannot drift from the product):
  `Design Principles` · `Brand Colour Guide` · `Typography Guide` ·
  `Help & Getting Started`. Four is enough to show the shape without implying a
  catalogue.

### 8.4 · Copy

**Eyebrow:** `[ LEARN ]`

**Heading — two options.**

> **Option 1 — RECOMMENDED**
> **Guides for the part the tools can't do for you.**

> Option 2
> **Get better at this, not just faster at it.**

Option 1 states the section's actual job without a rhetorical flip, and it is
honest that the guides are not yet written — it promises a kind of help, not a
library. Option 2 lands the founder's own angle harder ("makes you a better
designer") but uses the comparative-flip rhythm, and the founder has just
rejected a headline built on a flip. Recommend 1; Option 2 is available if he
wants the sharper line.

**Lede:**

> Learn is being written now. The Help Centre is live today; everything else
> below is on the way.

Two sentences, both verifiable, no fabricated corpus.

### 8.5 · Accessibility and responsive

- The list is a `<ul>`. Live rows are `<Link>`s with real hrefs (so middle-click
  and open-in-new-tab work, as everywhere else on this page). `Soon` rows are
  `<li>` with plain text and a `<span>` badge — **not** disabled buttons, which
  would be focusable dead ends.
- The `Soon` badge reuses `.htool-soon` exactly, so the language is one language
  across the page.
- Glyphs are `aria-hidden="true"`.
- No animation is specified for this section beyond the existing
  `[data-reveal]` scroll reveal, which is already reduced-motion guarded by
  `useHomeMotion` — under reduced motion `revealAll()` shows everything at rest.
- Targets: live row ≥44px, CTA ≥40px.
- **Phone:** rows go full-width, status column stays right-aligned, title wraps
  to two lines maximum. **Tablet/desktop:** the list caps at `54ch` and sits
  left; the heading and lede share the same measure.

---

## §9 — Pricing panel — structure only (F-1 blocks the numbers)

**No price amount appears in this spec.** Three ladders are shipped and disagree
(F-1); the same visitor can currently be shown either `$7` or `$4.99`. Every
amount below binds to `src/config/planLadder.js` and renders from it.

**Pattern.** Eight pricing pages, clear consensus (`observed`):

- **The toggle belongs wherever the choice applies.** Current
  ([pricing](https://mobbin.com/sites/sections/43086f47-57f2-4d64-937f-3f18a780846b))
  has **no page-level toggle at all** — the cadence control sits inside the Pro
  card only, because Free has no cadence. UIL4B has a three-cadence ladder, so a
  binary switch cannot express it; the in-card rows already shipped are the right
  shape. Keep them.
- **Name the saving, don't make the reader compute it.** Five of six observed
  toggles state the discount. `PRICE_LADDER`'s existing notes already do this;
  carry the same strings to `/plans` so the two surfaces cannot drift.
- **Emphasis is one device, not four.** Every example picks *one* of badge,
  raised card, coloured border, tint. The panel currently uses `data-best`
  **and** the `--hi` CTA. Per V2's budget of one `--hi` element per viewport,
  spend `--hi` on the CTA **or** the best-value row — not both. Recommend the
  CTA, since the panel's job is the click.
- **Carry-forward the list.** `Everything in Free, plus:` above `PRO_INCLUDES`.
  Universal across Dub, Current, Relume and Oku.
- **Give Free an explicit list.** Today Free is described in prose while Pro gets
  a ticked list, which visually advantages Pro in a way the copy does not intend.
- **Risk reversal next to the button, not in a footnote.** `No credit card ·
  7-day free trial` directly under the CTA (Lyssna, Maze).
- **Currency inline.** `$X USD / month` (Lyssna, Relume) — honest, and it removes
  the need for the current three-line disclaimer.
- **Tone: Oku, not Maze.** Oku
  ([pricing](https://mobbin.com/sites/sections/f66ba39e-9d4f-4336-955d-8721fef92d47))
  is an indie product at almost exactly our price point, and it marks a
  not-yet-shipped feature as coming-soon **inside the feature list** — directly
  compatible with the `Soon` badge language already in use. We have no enterprise
  logo row and should not pretend otherwise.

**Do not restructure Stripe or the price service to achieve any of this.** The
quarterly price does not exist in `useProPrice` / `api/_lib/pricing.js`; that is
founder-gated. The in-card cadence rows degrade to the cadences the service
actually knows until quarterly is wired.

---

## §10 — Motion register

Every animation specified in this document, with its reduced-motion behaviour.
**Nothing ships from this spec without a row here.** All durations and easings
come from the named scale at `global.css:60-65` — no raw literals.

| # | What | Property | Duration | Easing | Reduced motion (BOTH directions) |
|---|---|---|---|---|---|
| M1 | Hero entrance (existing) | `transform`, `opacity` | existing | `--ease-entrance` | `animation:none` — already at `global.css:5386-5388`. Re-verify after §2.1 |
| M2 | Search typing overlay | text substitution | 60ms/char type · 2200ms hold · 30ms/char delete · 500ms gap · one pass | none (discrete) | Cycle never starts. One static query, no caret, no blink |
| M3 | Typing caret blink | `opacity` | 1060ms `steps(1)` infinite | — | `animation:none`; caret not rendered |
| M4 | Sticky step activation | state change | — | — | Sync never runs; all steps `opacity:1`, `min-height:0`, panel `position:static` |
| M5 | Step collapse / expand | `opacity`, `visibility` | `--dur-3` | `--ease-standard` | All steps expanded, `visibility:visible; opacity:1` |
| M6 | Connector dot fill | `background` | `--dur-2` | `--ease-standard` | `transition:none`; colour still changes |
| M7 | Workbench tab indicator | `color`, `background`, underline | `--dur-2` | `--ease-standard` | `transition:none` |
| M8 | Workbench panel arrival | `opacity`, `translateY(8px→0)` | `--dur-3` | `--ease-entrance` | `animation:none`. **Fixed frame stays** |
| M9 | Panel child stagger | `animation-delay` | 40ms × index, max 3 | — | `animation-delay:0` |
| M10 | Tool card hover (existing) | `border-color`, `translateY(-3px)` | `--dur-2` | `--ease-standard` | Global clamp; keep colour, drop transform |
| M11 | Gallery card hover lift | `border-color`, `translateY(-3px)` | `--dur-2` | `--ease-standard` | Colour only, no transform |
| M12 | Gallery hover buttons reveal | `opacity` | `--dur-2` | `--ease-standard` | Instant; buttons always visible |
| M13 | Export tab indicator | `background`, `color` | `--dur-2` | `--ease-standard` | `transition:none` |
| M14 | Export panel arrival | `opacity`, `translateY(8px→0)` | `--dur-3` | `--ease-entrance` | `animation:none`; fixed height stays |
| M15 | Copy-button confirmation | label swap, 1600ms hold | — | — | Unchanged — it is state, not decoration |
| M16 | Scroll reveals (existing) | `opacity`, `y` | existing GSAP | `power3.out` | `revealAll()` shows everything at rest |

**The guard pattern, mandatory for every CSS row above** — mirroring
`global.css:5386-5388` so an explicit in-app toggle wins over the OS query in
both directions:

```
@media (prefers-reduced-motion:reduce){
  html:not([data-reduced-motion="false"]) <selector>{ … }
}
html[data-reduced-motion="true"] <selector>{ … }
```

JavaScript-driven motion (M2, M3) must read the same contract
`prefersReducedMotion()` implements in `useHomeMotion.js` — attribute first, OS
query only as fallback.

---

## §11 — Accessibility contract

**Focus order, top to bottom.** Skip link → PillNav → hero headline (not
focusable) → command bar input → `⌘K` keycap → result rows → `Try` chips →
primary CTA → secondary CTA → step rail buttons (§3.4) → step CTA links →
workbench tablist (roving) → panel controls → panel hand-off links → tool cards
→ gallery cards, each followed by its two action buttons → `Show more` →
`Explore Discover` → export code panel → copy button → export switcher (roving)
→ export exit → pricing CTA → Learn live row → Learn CTA → `SystemCTA`.

Nothing in this spec introduces a focus trap, a hover-only affordance, or a
focusable element that is visually hidden.

**Target sizes (WCAG 2.5.8, ≥24×24 CSS px).** Measured existing: `.hcmd-chip`
34 · `.hcmd-kbd` 36 · `.hw-tab` 44 · `.hcomm-tab` 36 (§0.6). New minimums:

| Component | Min | ≤480px |
|---|---|---|
| Step rail title button | 44px | 44px |
| Gallery hover action buttons | 40px | 44px, always visible |
| `Show more` pill | 40px | 44px |
| Export switcher tab | 40px | 44px |
| Export copy button | 32px | 40px |
| Learn live row | 44px | 48px |
| Numeric readout field (§4.3) | 32px | 40px |

**Decorative numbering and ornament — screen-reader treatment.**

| Element | Treatment | Why |
|---|---|---|
| Step route line (`/color/gradient`) | `aria-hidden="true"` | Reads as noise; duplicates the CTA destination |
| Connector line and dots | `aria-hidden="true"` | Pure ornament |
| Step position | **Native `<ol>` semantics** | "list item 2 of 5" — the visible numeral was always redundant to AT |
| Typing overlay + caret | `aria-hidden="true"` | A name that changes every few seconds is an interruption |
| Command bar accessible name | stable `aria-label` | Must never come from the animating string |
| Workbench chrome (dots, breadcrumb, `Live preview`) | `aria-hidden="true"`, nothing focusable | Already correct — keep it that way, and do not move the tablist into it |
| Tool card evidence render | `aria-hidden="true"` | Title and description carry the meaning |
| Gallery swatch / gradient render | `aria-hidden="true"` | Card name is the accessible name |
| Code panel line numbers | CSS-generated, `aria-hidden` | Never text content — a selection copy must not carry them |
| Style-guide rendered preview | `aria-hidden="true"` + visible text equivalent | A scaled render is not readable content |
| `sr-only` family descriptions (`htool-fam-*`) | **keep** | The many-tools-into-five-modes relationship survives the card change |

**Contrast.** Every accent-coloured string below large text uses
`--accent-strong`, never `--accent` — `#0F6FFF` measures ≈3.85:1 on the page
ground and fails the 4.5:1 body-text floor. This binds the eyebrows, the step
route line if it ever takes accent, the category pills and every count line. On
the inverted pricing panel, colours come from `--bg-0` at stated opacities and
`--hi`, as they already do. **Dark mode needs its own pass — confirm, don't
assume.**

**The `--hi` budget.** At most one `--hi` element per viewport. Currently spent
on: the hero mark (viewport 1) and the pricing CTA (viewport 6). §9 removes the
second `--hi` from the pricing row so the CTA keeps it alone. **The export
section must not introduce a third** — its emphasis is the inverted-fill active
tab, not the highlight.

**Still unrun, and must not be claimed as passed** (`homepage-field-metrics`):
keyboard-only, screen-reader names, 200% zoom, reduced motion and
forced-colours/high-contrast passes. This spec defines the intent; it is not
evidence any of it was verified.

---

## §12 — Responsive intent

| Section | Phone (≤640px) | Tablet (641–980px) | Desktop (≥981px) |
|---|---|---|---|
| Hero | Chips centred, `⌘K` hidden ≤480px, typing runs | As desktop, narrower measure | Full composition |
| Sticky steps | Stacked list, every step expanded, no sticky, no sync | Same | Two columns, panel sticky + vertically centred, steps collapse, sync at 52/44% |
| Workbench | Canvas-above/controls-below, options rail scrolls sideways, natural height | Same, wider | Fixed `--hw-frame`, two zones |
| Toolset | One column, evidence render full width | Two columns | Three columns |
| Gallery | One column, **hover buttons always visible** | Two columns | Four columns, hover reveal |
| Export | Panels stacked, switcher scrolls sideways, panel 240–320px | Stacked, wider | Side-by-side pairing |
| Pricing | Rows stack to one column (existing) | Existing | Two-column panel (existing) |
| Learn | Full-width rows, status right-aligned | Same | List capped at 54ch |

**Tablet is the weakest band in this spec.** Mobbin returned no tablet-sized
captures in either research pass, and the 641–980px range currently inherits
whichever of the two neighbours the breakpoint happens to catch. Nothing about
tablet here is evidenced — treat it as the starting hypothesis for the responsive
audit (batch item B2, `docs/qa/responsive-audit-2026-08.md`) and verify before
committing.

---

## §13 — Acceptance criteria

Observable, testable, and mapped to the founder's batch items.

1. **C5** — At 1440×900 and at 380px, no part of the `--hi` mark is clipped at
   the top or bottom of `.home-hero-line`. The hero entrance still plays, and
   still settles instantly under both reduced-motion paths.
2. **C6** — With motion on, the command bar types `contrast`, holds ~2.2s,
   backspaces and types the next query, four times, then stops. The input's
   `value` is `''` at every moment. Focusing, clicking or typing stops it
   permanently. With reduced motion on (either mechanism), one static query is
   shown and nothing animates.
3. **C6 / CLS** — Homepage CLS stays at 0.0000 mean on the existing measurement
   profile (4× CPU, 1440×900, ten cold loads). Any regression is a fail, not a
   rounding argument.
4. **C7** — The `Try` row is optically centred under the command bar at ≥481px,
   and the chips are centred at ≤380px where the label is hidden.
5. **C1** — The sticky panel sits vertically centred in the space below the nav
   at 1440×900 **and** at 1024×768, with visible margin above and below, and is
   never taller than the viewport.
6. **C2** — Each step's panel swap fires while the step's text is at or just
   above the viewport's vertical centre. Measured trigger between 44% and 56%;
   the current effective 86% is a fail.
7. **C3** — `.hw-shell` measures the **same height in all five modes** at both
   1440×900 and 1024×768. Nothing below the panel moves on a tab switch. The
   swap is visibly staged, not a cut. Both hold under reduced motion, minus the
   staging.
8. **C4** — Every numeric control in the panel has an editable readout; hex
   fields read `sRGB hex`; option sets are horizontal rails and properties are
   stacked rows.
9. **C8 / C10 / C11** — The three rejected headlines are gone. No replacement
   uses a denial-then-assertion construction, a manufactured superlative, or a
   claim the product cannot back.
10. **C9** — No `NN / WORD` string remains on the page. A screen reader still
    announces each step's position via `<ol>` semantics.
11. **C11 / the pivot** — No homepage card links off-site. Every gallery card
    resolves to an in-product route with the artefact's values pre-loaded, and
    the thumbnail is the artefact itself.
12. **C12** — Every code sample in the export section is produced by the shipped
    exporter at render time. Changing `uiSystem.js`'s output changes the page.
    The panel is the same height on all four tabs.
13. **C13** — No Learn row links to a destination that does not exist. Exactly
    one row (`/help`) is navigable. No read time is shown for an unwritten guide.
14. **F-3** — No violet appears in the workbench's default state.
15. **F-1** — No price amount is hard-coded by any change made from this spec.
16. **Reduced motion** — Every row in §10 verified in both mechanisms: OS query
    with no attribute, and `data-reduced-motion="true"` with the OS query off.
17. **Keyboard** — Every interactive element added here is reachable, operable
    and visibly focused in the §11 order, with no hover-only affordance.

---

## §14 — Open decisions — founder judgement required

1. **The step-numbering replacement (C9).** Option A (`01 / 05`, the fraction —
   minimal, matches Daydream) or **Option B (the route plus a Ditto connector —
   recommended)**. §3.3 argues for B because the founder asked for "something
   else" and A is the same device with a different denominator. One call, and it
   changes the rail's whole character.
2. **The C2 trigger reading.** "just before centre" is ambiguous — before the
   text reaches centre (≈56%) or once it has passed slightly above it (≈44%).
   This spec picks 52/44. Both readings are inside the tuning window; the founder
   should look at it running and nudge one number.
3. **Section order.** Export before pricing (this spec) or export straight after
   the workbench (the research's recommendation). §1 states the reasoning for the
   deviation. Cheap to swap.
4. **`[ THE WORKSPACE ]`.** `CLAUDE.md` says "Workspace" survives only as an
   internal code name and must not be reintroduced in UI copy; the homepage
   eyebrow uses it, and the hero stat line says `ONE WORKSPACE`. Either the rule
   is about the *nav surface label* only (in which case both are fine and the
   rule should say so), or the eyebrow should read `[ CREATE ]`. Not changed
   here — the research says the eyebrows stay and the founder did not raise it.
5. **The price ladder (F-1, batch A2).** Nothing in §9 can be built past
   structure until this is answered. Three ladders are shipped; a visitor can
   currently be shown either `$7` or `$4.99` for the same plan.
6. **The Pro/export entitlement wording (§7.3).** "Pro = all file exports"
   (`positioning.md`) versus the shipped behaviour, where free exports carry a
   footer credit rather than being blocked (`ExportPanel.jsx`). The export
   section must state one of these. It is an entitlement question, not a design
   one, and it sits in a Human Validation Zone.
7. **`/discover`'s own H1.** `SurfaceLanding.jsx:22` still reads "Find systems
   worth stealing." — the phrase just rejected for the homepage. Batch item D3,
   flagged here so it is not lost.

---

## Sources

**Verified in this pass (`measured`):** `src/pages/Home.jsx` ·
`src/components/HomeWorkbench.jsx` · `src/components/HomeCommandBar.jsx` ·
`src/hooks/useHomeMotion.js` · `src/styles/global.css` (`.home-*`, `.h*`,
tokens at `:root`, reduced-motion blocks) · `src/data/toolTree.js` ·
`src/data/communityDesigns.js` · `src/data/paletteGallery.js` ·
`src/data/gradientGallery.js` · `src/data/paletteLibrary.js` ·
`src/utils/uiSystem.js` · `src/utils/exportBuilder.js` ·
`src/components/ExportPanel.jsx` · `src/pages/SurfaceLanding.jsx` ·
`src/App.jsx` · `src/data/pipeline.js` — plus a rendered measurement pass at
1440×900 and 1024×768 (§0).

**Research:** `docs/research/homepage-patterns-2026-08.md` (95 Mobbin captures,
2026-08-20), plus three further Mobbin searches run for this spec, which added
OpenPhone (§2.2, §2.3), Better Stack and Slack (§8.2) and confirmed the research
document's honest finding that **Mobbin holds no capture of a typing animation
and no motion timing data of any kind**. Every duration in §10 that is not an
existing project token is `judgement`.

**Reference:** `docs/reference/design-language-v2.md` ·
`docs/reference/growth-persuasion.md` · `docs/reference/positioning.md` ·
`docs/reference/color-system-m3.md` ·
`.claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md` ·
`CLAUDE.md`.
