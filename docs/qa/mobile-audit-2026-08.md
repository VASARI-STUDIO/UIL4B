# Mobile UI Audit — August 2026

**Brief:** founder, 2026-08-20 — *"the entire app's mobile UI needs an overhaul. there are
heaps of clipping issues and other things."*

**This is a diagnosis-only pass. Nothing was fixed.** Line references are evidence, not
patches.

---

## Method

`npm run build` (green) → `npm run preview` on `http://localhost:4174`, driven with
Playwright/Chromium under **real device metrics** — `isMobile: true`, `hasTouch: true`,
`deviceScaleFactor` 3 (phone) / 2 (tablet), and an iOS user agent. Verified in every run:
`matchMedia('(hover: hover)')` reports **false** and `(pointer: coarse)` reports **true**,
so hover-dependent CSS behaved as it does on a phone rather than as it does on a narrowed
desktop window. That distinction is load-bearing — a desktop Chromium resized to 390px
still reports hover capability and hides exactly the class of defect this pass exists to
find.

### Viewport matrix

| Class | Viewports |
|---|---|
| Phone portrait | 320×568 · 390×844 · 430×932 |
| Phone portrait, **short** | 360×560 · 390×640 |
| Phone **landscape** (short, not narrow) | 844×390 · 932×430 |
| Tablet portrait | 768×1024 · 834×1194 |
| Tablet landscape | 1024×768 · 1180×820 |

Plus targeted width scans where a defect needed a boundary (e.g. 430 → 560 → 640 → 700 →
768 on `/color/semantic`).

### What was measured per route × viewport

Document overflow; elements escaping the viewport; elements clipped by an
`overflow:hidden` ancestor; horizontal scrollers with off-screen children; `elementFromPoint`
hit-testing of every interactive element at three points; pairwise overlap of interactive
elements; **gap between adjacent targets**, not only target size; targets under 24px
(WCAG 2.5.8); text truncation where the text is the content; inputs whose own value does
not fit; controls hidden at rest by `opacity:0` / `visibility:hidden`; tall `fixed`/`sticky`
chrome against short viewports.

### Scope boundaries

- **Branch under test:** `origin/main` @ `5cff38c`. Routes were verified against
  `src/App.jsx` and `createRoutes()` in `src/data/toolTree.js`. **PR #266 moves every
  Create tool to `/create/<pagetitle>`** — every Create path in this document is the
  pre-#266 path and will need renaming if the audit is read against that branch. The
  defects are in `global.css` and are unaffected by the route change.
- Excluded as already in flight in **PR #263**: the Palette Builder toolbar blocker, the
  981px two-column flip, and Tint's off-panel stops.
- This sandbox reaches `localhost` but **not** `www.uil4b.com`. **No production result is
  claimed anywhere in this document.**
- Signed-out only. Google One Tap is live on app-shell routes and was measured, then
  suppressed so it did not mask every other finding.
- Evidence class for every defect below: `measured`. Severity reasoning is `judgement`
  where stated.

---

## Defects

<!-- SLICE 1: routes the responsive audit never reached — Create tools -->

### MAJOR · S1 · Semantic Colours — 7 of 10 tones per ramp are hidden behind an invisible scroller, and the hex values are switched off

- **Page / route:** Semantic Colours · `/color/semantic`
- **Occurs:** every width **below ~724px**. Worst at 320px.
- **Clears:** ~724px (measured 9/10 visible at 700px, 10/10 at 768px).
- **Screenshots:** `docs/qa/screenshots-mobile/semantic-320x568-ramp.png` (broken) ·
  `semantic-390x844-ramp.png` · `semantic-768x1024-ramp.png` (clean)

**What is wrong.** Each of the four state ramps (success / warning / error / info) holds
10 tone cells. Measured cells fully visible, per ramp:

| Viewport width | Cells visible | Ramp `scrollWidth` → `clientWidth` |
|---|---|---|
| 320 | **3 of 10** | 640 → 252 |
| 390 | **5 of 10** | 640 → 322 |
| 430 | **5 of 10** | 640 → 362 |
| 560 | 7 of 10 | 640 → 492 |
| 640 | 8 of 10 | 640 → 556 |
| 700 | 9 of 10 | 640 → 616 |
| 768 | 10 of 10 | 684 → 684 |

At 320px a phone user sees **50 · 100 · 200 · 300** and nothing else, across all four
ramps — 28 of 40 tones unreachable without discovering a swipe. The page's own copy
promises *"every state gets a full 50–900 ramp"* and the toolbar reads
*"Balanced · 40 canonical tokens"* while 12 tones are on screen.

Two things make this worse than an ordinary overflow:

1. **The scroller has no affordance whatsoever.** `overflow-x:auto` with
   `scrollbar-width:thin` renders no scrollbar at all under touch emulation (overlay
   scrollbars), there is no fade, arrow or peek, and `.stc-ramp` has
   `border-radius:var(--radius-s)` so the ramp's right edge is drawn **rounded and
   closed**. The control actively signals "this is the end of the scale". See the 320px
   screenshot: the `300` cell has a rounded right corner.
2. **The hex value is deleted on exactly the viewports that need it.**
   `global.css:636` — `@media(max-width:640px){.stc-cell-hex{display:none}}`. Below 641px
   the cells show a tone number and no hex, so the tool's actual output cannot be read on
   any phone; a user can only tap-to-copy blind. Note the resulting band 641–723px, where
   the hex is back but a tone is still off-screen.

**Likely cause.** `global.css:663–664` —
`.stc-ramp{overflow-x:auto;scrollbar-width:thin}` with `.stc-cell{flex:1 0 64px}`. The
`0` flex-shrink pins each cell at a 64px floor, so 10 cells demand 640px before the
container is allowed to be narrower than its content. `global.css:627`'s base
`.stc-cell{flex:1;min-width:0}` would have let them compress; the workbench override at
663 replaces it. `global.css:636` is the `.stc-cell-hex` suppression.

### MAJOR · S2 · Semantic Colours — the bundle picker shows 1 of 7 presets with no affordance

- **Page / route:** Semantic Colours · `/color/semantic`
- **Occurs:** ≤560px (the `.stc-bundles` flex/scroller override). 320–560px.
- **Screenshot:** `docs/qa/screenshots-mobile/semantic-390x844-top.png`

**What is wrong.** Measured at both 320px and 390px: `.stc-bundles` holds **7** preset
bundles, of which **1** is fully visible. `scrollWidth` 1518 against `clientWidth` 288
(320px) / 358 (390px) — **79% of the control is off-screen**. The visible second card is
cut mid-word (`Materia…`), which is the only cue that anything follows, and the seventh
bundle is 1160px away.

Choosing a starting bundle is the first decision the page asks for. On a phone six of the
seven options are undiscoverable.

**Likely cause.** `global.css:712–713` —
`@media(max-width:560px){.stc-bundles{display:flex;overflow-x:auto;scroll-snap-type:x proximity}
.stc-bundle{flex:0 0 210px;scroll-snap-align:start}}`. `scroll-snap` is present, so the
scroller was intended; what is missing is any visible indication that it scrolls. Compare
`global.css:700` (`@media(max-width:980px){.stc-bundles{grid-template-columns:repeat(2,…)}}`),
which wraps rather than scrolling — the same content wraps to two columns at 561–980px and
becomes a 7-wide scroller below 560px.

### MINOR · S3 · Semantic Colours — preset chip rows are cut mid-word

- **Page / route:** Semantic Colours · `/color/semantic` · `.stc-role-presets`
- **Occurs:** ≤560px. Measured 320px and 390px.

**What is wrong.** Each role's preset row holds 7 chips. At 320px, 4 of 7 are fully
visible (`scrollWidth` 358–391 against `clientWidth` 254); at 390px, 5–6 of 7. The
truncated chip renders as `Mater` / `Mat`, so the partial chip is at least an honest cue
that the row scrolls — which is why this is MINOR where S1 and S2 are MAJOR. `Custom`,
the last chip, is always the one hidden.

**Likely cause.** `global.css:715` —
`@media(max-width:560px){.stc-role-presets{width:100%;margin-left:0;justify-content:flex-start;
flex-wrap:nowrap;overflow-x:auto}}`. The base rule at `global.css:624` has
`flex-wrap:wrap`; the mobile override removes wrapping.

### MINOR · S4 · Emoji Library — 9 of 12 category chips are off-screen

- **Page / route:** Emoji Library · `/emoji` · `.pl-chips`
- **Occurs:** every viewport tested, 320px through 1180px (the chip row is a scroller at
  all widths; the count hidden varies).
- **Screenshot:** `docs/qa/screenshots-mobile/emoji-390x844-chips.png`

**What is wrong.** At 390×844 the category row holds 12 chips of which **3** are fully
visible — `scrollWidth` 1166 against `clientWidth` 358. `All · Smileys · Hands` are
readable and `People` is cut. Category is the primary navigation for a 1,655-item library.
As with S3 the partial chip is a cue, and the search field above it is a working
alternative path to the same content, which holds this to MINOR.

### MINOR · S5 · Prompt Library — the feedback FAB lands on a filter chip at landscape heights

- **Page / route:** Prompt Library · `/discover/prompts`
- **Occurs:** short viewports — measured 844×390 (fully occluding) and 932×430,
  768×1024, 834×1194, 1024×768, 1180×820 (overlapping).
- **Screenshot:** `docs/qa/screenshots-mobile/prompts-844x390-fab.png`

**What is wrong.** `.global-feedback-btn` is `position:fixed; right:20px; bottom:20px;
z-index:80`. At 844×390 it sits over the filter chip row: `elementFromPoint` at the centre
of `button.pl-chip "UI Components"` returns the feedback button, and it also overlaps
`button.pl-add-btn "Submit prompt"` by 117×26px. Measured overlaps at 844×390: 5 pairs.

Held to MINOR because the page scrolls and the covered control moves out from under the
FAB — measured at the scroll extremity, nothing is permanently covered. It is still a
control that cannot be tapped where the page first renders, on the viewport class where
vertical space is scarcest.

**Likely cause.** `global.css:2349` — a fixed FAB with no short-viewport treatment. The
`@media(max-width:640px)` rule at `global.css:2352` shrinks it to an icon by *width*;
there is no height-based rule, and a landscape phone is 844–932px **wide**, so it never
applies. This is the width-vs-height confusion described in "Systemic patterns" below.

### Clean on this slice

`/ratio` and `/alt-text` measured clean at all 11 viewports — no overflow, no clipping, no
occlusion, no hidden scrollers, no overlapping targets. The only findings on those two
routes are the app-wide sub-24px targets covered in the systemic section.

---

<!-- further slices appended below -->
