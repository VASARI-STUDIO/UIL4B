# Mobile UI Audit — August 2026

**Brief:** founder, 2026-08-20 — *"the entire app's mobile UI needs an overhaul. there are
heaps of clipping issues and other things."*

**This is a diagnosis-only pass. Nothing was fixed.** Line references are evidence, not
patches.

> **The `docs/qa/screenshots/…` files cited below are NOT in the repository.**
> They were local capture evidence from the run that produced this audit, and
> they are `.gitignore`d — 11 MB of PNGs that go stale the moment the stylesheet
> they document changes, against a suite that reproduces them on demand. The
> paths are kept as a record of what was captured and at which width, not as
> links you can follow. To regenerate: `npm run build`, `npm run preview`, then
> drive the widths listed in the Method section. See `screenshots/README.md` for
> why the portfolio directory of the same name is tracked and this one is not.


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

<!-- SLICE 2: account, legal and system pages -->

### MAJOR · S6 · Information Centre — the page is 37px wider than a 320px phone and the excess is thrown away, not scrolled

- **Page / route:** Information Centre · `/info`
- **Occurs:** **320px only.** Clean from 360px up (measured 360, 390, 430 and every larger
  viewport in the matrix).
- **Screenshot:** `docs/qa/screenshots-mobile/info-320x568-overflow.png`

**What is wrong.** At 320×568, `.ic-wrap` renders **341px wide** inside a 288px content box
(`.app-page` is 320px with a 16px gutter each side), so its right edge sits at x=357 in a
320px viewport. `document.documentElement.scrollWidth` is **320** — there is no page
scrollbar — because `body` carries `overflow-x: clip`. The 37px is therefore **discarded,
not reachable**.

In the screenshot the `<h1>` reads *"Everything you need to kno"* (the `w` is gone), the
intro paragraph reads *"Learn what each too"* / *"check how your scr"*, the table-of-contents
card's right border is off-screen, and the `🖼️ Imagery, Icons & Emoji` pill runs off the
edge. The text *is* the content of this page, and none of it can be recovered by scrolling.

**Likely cause — isolated by measurement, not inference.** Hiding each child of `.ic-wrap`
in turn:

| Change | `.ic-wrap` width |
|---|---|
| (unchanged) | **341** |
| `header.ic-head` hidden | 341 |
| `div.ic-intro` hidden | 341 |
| `nav.ic-toc` hidden | 341 |
| `div.ic-sections` hidden | 341 |
| **`section.ic-stats` hidden** | **288 ✅** |
| **`.ic-stats-grid` hidden** | **288 ✅** |
| **`.ic-stats-grid` set to `repeat(2,minmax(0,1fr))`** | **288 ✅** |

`global.css:3421` —
`@media(max-width:560px){.ic-stats-grid{grid-template-columns:repeat(2,1fr)}}`. A bare `1fr`
track has an automatic minimum of `auto`, i.e. min-content, so the track cannot shrink below
the widest `.ic-stat` card (measured min-content 91–99px). Two of those plus the 10px gap
plus `.ic-stats`'s `padding:22px` (`global.css:3406`) plus borders sets a 341px floor that
the whole page inherits. Swapping the track to `minmax(0,1fr)` removes the overflow entirely
— verified live in the page.

This is one instance of a pattern counted across the whole stylesheet in
[Systemic patterns](#systemic-patterns), item 2.

### MAJOR · S7 · Login — the Sign In button is cut in half on a landscape phone, and sign-up is below the fold

- **Page / route:** Login · `/login` (also every `RequireAuth` route that redirects here —
  `/projects` was measured and is byte-identical)
- **Occurs:** short viewports. Measured broken at **844×390** and **932×430**. Clean at
  360×560, 390×640, 390×844, 430×932 and every tablet viewport.
- **Screenshot:** `docs/qa/screenshots-mobile/login-844x390-modal.png` (broken) ·
  `login-390x640-modal.png` (clean)

**What is wrong.** At 844×390 the dialog is capped at 358px tall against 489px of content.
Measured: `.ui-modal` `scrollHeight` 489 → `clientHeight` 356. The screenshot shows the
primary submit button **sliced horizontally by the modal's bottom edge** — the word
`Sign In` is visible, the bottom half of its background is not. Two controls are entirely
below the fold:

| Control | `top` | `bottom` | Viewport height |
|---|---|---|---|
| `Don't have an account? Sign up` | 402 | 440 | 390 |
| `Forgot password?` | 446 | 484 | 390 |

The modal does scroll internally (`overflow: hidden auto`), so the content is reachable —
but nothing indicates it: no scrollbar renders under touch emulation, and the button
sliced at the boundary reads as a rendering fault rather than as "scroll for more". For a
signed-out visitor on a landscape phone, **the account-creation link is invisible**.

**What is not wrong — tested explicitly.** Escape dismisses the dialog (measured: overlay
removed, route falls back to `/home`). Focus is trapped: after 12 Tab presses focus was
still inside the modal, on `Forgot password?`, and the browser had scrolled it into view.
Both behaviours are correct.

**Likely cause.** `global.css:6854` —
`.ui-modal{max-height:calc(100dvh - 32px);overflow:hidden auto}` combined with
`global.css:6853` `.ui-modal-overlay{place-items:center;padding:clamp(16px,4vw,40px)}`.
The height cap is correct; what is missing is any treatment for the case where content
exceeds it — a sticky action footer, a scroll shadow, or a short-viewport layout that
drops the divider and the Google row to buy the ~100px needed.

### MAJOR · S8 · Settings — 3 of 5 sections are off-screen in a scroller with the scrollbar explicitly deleted

- **Page / route:** Settings · `/settings` · `.settings-nav`
- **Occurs:** ≤~900px (the `.settings-nav` row override). Measured at 320×568, 360×560,
  390×640, 390×844, 430×932.
- **Screenshot:** `docs/qa/screenshots-mobile/settings-390x844-nav.png`

**What is wrong.** At 390×844 the section nav holds 5 items; **2 are fully visible**
(`Subscription`, `Accessibility`) and `Language`, `Data Management` and `Privacy & Legal`
are cut or entirely off. `scrollWidth` 675 against `clientWidth` 356.

This is worse than the other hidden scrollers in this report because the scrollbar is
**deliberately removed**: `global.css:1492` — `.settings-nav::-webkit-scrollbar{display:none}`.
On a phone that is the only affordance the platform would have offered. `Data Management`
holds account deletion and data export; `Privacy & Legal` holds consent. Those are the two
sections a user goes to Settings specifically to find, and on a phone neither is visible.

**Likely cause.** `global.css:1491–1493` —
`.settings-nav{flex-direction:row;overflow-x:auto}` with
`.settings-nav-item{white-space:nowrap;flex-shrink:0}` and the scrollbar suppressed.
Duplicated at `global.css:1878–1879` without the scrollbar rule.

### MAJOR · S9 · Information Centre — 8 links inside collapsed accordions stay in the tab order

- **Page / route:** Information Centre · `/info`
- **Occurs:** **all viewports**, 320 through 1180. Not a breakpoint fault — logged here
  because it compounds every other mobile problem on the page.

**What is wrong.** The page has 12 accordion panels; 11 are collapsed on load. Tabbing
through at realistic speed, focus lands **8 times** on links inside a collapsed panel —
tab stops 20, 25, 27, 29, 31, 33, 34 and 37 of 45. Each focused element sits inside an
`.ic-acc-body-inner` measured at **zero height with `overflow:hidden`**, so the focus ring
is invisible; stop 29 (`Projects`) was additionally scrolled entirely off-screen.

A keyboard, switch-control or screen-reader user is repeatedly moved to a target they
cannot see and cannot tell they are on.

**Likely cause.** `global.css:3396–3398` —
`.ic-acc-body{display:grid;grid-template-rows:0fr}` + `.ic-acc-body-inner{overflow:hidden;min-height:0}`.
The `0fr` grid-row collapse animates cleanly, which is why it was chosen, but unlike
`display:none` it does not remove descendants from the tab order. Nothing sets
`inert`, `hidden` or `visibility:hidden` on the collapsed panel.

### MINOR · S10 · Sitemap — the feedback FAB sits on a route link at 320px

- **Page / route:** Sitemap · `/sitemap`
- **Occurs:** 320×568, 360×560, 390×640, 390×844. Clean from 430px up.

**What is wrong.** `.global-feedback-btn` overlaps `a.smap-link-a "Palette /color/palette"`
by 29×12px. Recoverable by scrolling, so MINOR — same root cause as S5, and the same
single fix. See [Systemic patterns](#systemic-patterns), item 4.

### Clean on this slice

`/privacy`, `/terms`, `/feedback` and `/help` measured clean at all 11 viewports — no
overflow, no clipping, no hidden scrollers, no occlusion, no overlapping targets. `/help`
showed a single transient occlusion at 834×1194 only, which did not reproduce and is not
logged. `/projects` is a `RequireAuth` route and redirects to `/login` when signed out; its
authenticated layout was **not reached** (see [Coverage](#coverage)).

---

<!-- SLICE 3: the hover-only pattern, and the tablet class nobody had tested -->

### BLOCKER · S11 · Palette Builder — all 34 per-swatch controls are invisible on every tablet and every landscape phone

- **Page / route:** Palette Builder · `/color/palette`
- **Occurs:** **769px and wider on any device without hover.** Measured broken at
  **844×390, 834×1194, 1024×768, 1180×820**. Measured **clean at 768×1024, 390×844,
  390×640, 320×568** (1 unrelated hidden control only).
- **Screenshots:** `docs/qa/screenshots-mobile/palette-834x1194-tools-invisible.png` (broken,
  iPad Air) · `palette-768x1024-tools-visible.png` (clean, iPad mini) ·
  `palette-1024x768-tools-invisible.png`

**What is wrong.** Put the two screenshots side by side. At 768×1024 every swatch row shows
its seven controls — drag, lock, adjust, contrast, swap, duplicate, delete. At 834×1194 the
same page shows **five bare colour columns and nothing else**.

Measured at 834×1194, 1024×768, 1180×820 and 844×390:

| Control | Count | Computed | Size | In tab order |
|---|---|---|---|---|
| `button.plb-tool` | **30** | `opacity: 0`, `visibility: visible`, `pointer-events: auto` | 32×32 | yes |
| `button.plb-gap` | **4** | `opacity: 0`, `visibility: visible`, `pointer-events: auto` | 28×**568** | yes |

At 768×1024 the same query returns **1** (an unrelated ghost button), because
`global.css:6819` sets `.plb-tool{opacity:1}` and `global.css:6827` sets
`.plb-gap{display:none}` — but both live inside `@media(max-width:768px)`
(`global.css:6796`), and a tablet is wider than that while still having no hover.

Two distinct harms:

1. **Undiscoverable.** Lock, delete, duplicate, reorder and HCT edit are the Palette
   Builder's core interactions. On an iPad there is no hover to reveal them and no
   `@media(hover:hover)` guard, so a user sees a colour picker with no editing controls at
   all.
2. **Invisible but live.** These are not `pointer-events:none`. Thirty 32×32 hit targets
   and four **28×568px full-column** targets sit under the finger with zero paint. Tapping
   a swatch to select it can land on `Remove PRIMARY` or insert a swatch, with nothing on
   screen to explain what happened.

**Severity.** Rated BLOCKER on impact and reach rather than on strict unclickability: the
controls *can* be activated, which is precisely the problem — a destructive action with no
visible target is worse than a missing one. It covers the entire tablet class and every
phone held sideways, on the product's flagship surface. This is also the fault the QA role
calls out by name — **the working surface gets worse as the screen gets bigger.**

**Likely cause.** `global.css:6323–6324` —
`.plb-tool{opacity:0}` revealed only by `.plb-col:hover`, `.plb-col:focus-within` or
`.plb-tool--on`; `global.css:6358–6359` — `.plb-gap{opacity:0}` revealed only by
`:hover`/`:focus-visible`. The mobile correction exists but is scoped to `max-width:768px`
instead of to `(hover: none)`. The stylesheet already knows the right idiom — `.grg-like`
at `global.css:7637` is guarded `@media(hover:hover)` and is correct on every device.

### MAJOR · S12 · Palette Library — five per-card actions are invisible on every touch device

- **Page / route:** Palette Library · `/discover/palettes`
- **Occurs:** **every viewport tested** (320×568 through 1180×820) on a touch device.
  Measured **350** hidden controls per page load — the reveal layer across every rendered
  card.
- **Screenshots:** `docs/qa/screenshots-mobile/palettes-390x844-rest.png` (at rest) ·
  `palettes-390x844-after-tap.png` (after tapping a stripe)

**What is wrong.** `.pgal-actions` is `visibility:hidden; opacity:0` at rest and revealed
only by `.pgal-card:hover` or `.pgal-card:focus-within` (`global.css:4253–4254`). Measured
in the touch context: `matchMedia('(hover: hover)')` is **false**, so the hover half can
never fire. The five hidden actions per card are:

`Open … in the Palette Builder` · `Save … to your projects` · `Open …` ·
`Copy … as CSS` · `Copy all 4 hex codes`

Across a 100-card library that is **every take-away action the surface offers**. What
remains visible in the card foot is only the like button and the "use" pill.

**The one touch path that works is an accident.** Tapping a `.pgal-stripe` gives the card
focus, `:focus-within` matches, and the layer appears (measured: `visibility` flips to
`visible`, `opacity` to `1`). But that same tap fires the stripe's own copy action — so the
only way to see the actions is to trigger a different action first.

**Likely cause.** `global.css:4253–4254`, with no `@media(hover:hover)` guard and no
touch-equivalent reveal.

### MAJOR · S13 · The `visibility` reveal is timing-dependent — and the CSS comment explaining it is wrong

This is the pattern the brief asked to be hunted, and the naive diagnosis does not hold.
It is recorded separately because the fix is different from S12's.

**The claim in the code.** `global.css:4245–4250`:

> *"The layer is always in the DOM … and only its VISIBILITY is CSS, so keyboard reaches
> every action a pointer does — `:focus-within` is what carries that, and `visibility`
> rather than `opacity` alone keeps the buttons out of the tab order until the card is
> actually engaged."*

**The obvious objection is wrong.** "`visibility:hidden` removes the buttons from the tab
order, so `:focus-within` can never fire" does **not** happen here — the card holds 11
focusables, 6 of them outside the hidden layer (`.pgal-stripe` ×4, `.pgal-like`,
`.pgal-use`). Focus reaches one of those first and `:focus-within` does fire. Measured.

**The real fault is that the reveal costs a frame.** `visibility` is listed in the element's
`transition` (`transition: … , visibility 0.2s`). Measured reachability of the 5 reveal
buttons on `/discover/palettes` at 390×844, tabbing with **no round-trip between presses**:

| Median gap between focus moves | Reveal buttons reached |
|---|---|
| **2 ms** | **0 of 5** |
| 16 ms | 5 of 5 |
| 31 ms | 5 of 5 |
| 46 ms | 5 of 5 |
| 76 ms | 5 of 5 |
| 263 ms | 5 of 5 |

At 2ms per Tab the whole 14-stop sequence completes inside one animation frame, style is
never recomputed, and the browser skips the layer entirely — the recorded sequence is
`pgal-stripe → pgal-stripe → pgal-stripe → pgal-stripe → pgal-like → pgal-use` with no
`pgal-act` in it. From one frame (~16ms) upward every button is reached.

**Honest reading:** on this branch a *human* tabbing at any realistic speed **does** reach
these buttons. The failure window is a single frame, so it bites programmatic focus
advancement, not fingers. It is logged as MAJOR because it is a real, reproducible
zero-of-five result and because it makes any measurement of this pattern
speed-dependent — **a slow scripted tab passes a control a fast one cannot reach**, which
is how an audit misses it.

**Methodology note for anyone re-testing this.** An `evaluate()` between Tab presses adds
~100ms of round-trip and silently converts a 0/5 into a 5/5. The same test run naively
(read `document.activeElement` after each press) reported 5/5 at every speed. Focus moves
must be recorded **in the page** with a `focusin` listener and read once at the end.

**Same pattern, second instance — `/home`.** 33 links and buttons
(`a.htool-link` ×18, `a.htool-head` ×6, `a.hcomm-card-link` ×6, `button.hcomm-tab` ×3) are
`visibility:hidden` at load and revealed on scroll. Tab census at 390×844 over 140 Tab
presses:

| Median gap | Reached |
|---|---|
| fastest possible | **11 of 33** |
| 30 ms per Tab | 31 of 33 |
| 120 ms per Tab | 31 of 33 |

Two were not reached at any speed within 140 presses. Same shape as `.pgal-actions`, but
driven by an IntersectionObserver, which fires later than a CSS transition.

### Every occurrence of the hover-hidden pattern — full census

`global.css` searched for `visibility:hidden`, `opacity:0` at rest, and `transition` lists
containing `visibility`. Every hit classified:

| # | Selector | Line | Hidden by | Revealed by | Interactive? | Verdict |
|---|---|---|---|---|---|---|
| 1 | `.plb-tool` ×30 | 6323–6324 | `opacity:0` | `.plb-col:hover` / `:focus-within` | **yes — 30 buttons** | **DEFECT — S11.** `opacity:1` fix exists but is scoped `max-width:768px`, so it misses every tablet |
| 2 | `.plb-gap` ×4 | 6358–6359 | `opacity:0` | self `:hover` / `:focus-visible` | **yes — 4 buttons, 28×568px** | **DEFECT — S11.** `display:none` fix scoped `max-width:768px` |
| 3 | `.pgal-actions` ×5/card | 4253–4254 | `visibility:hidden` + `opacity:0`, **`visibility` in the transition** | `.pgal-card:hover` / `:focus-within` | **yes — 5 links/buttons per card, 350 per page** | **DEFECT — S12 + S13.** No hover guard; reveal costs a frame |
| 4 | `.pgal-actions` reduced-motion | 4267 | same | same | yes | **DEFECT.** The `prefers-reduced-motion` variant repeats `visibility var(--dur-1)`, so the reduced-motion path has the same frame dependency |
| 5 | `.ch-heart` ×12 | 3362–3363 | `opacity:0` | `.ch-card:hover` / self `:focus-visible` | **yes — 1 button per card** | **DEFECT — S14.** No hover guard |
| 6 | `.cs-pb-tools` | 431–433 | `opacity:0` | `.cs-pb-swatch:hover` / `:focus-within` | yes | **Not reproduced.** `ColorStudio` backs `/color/semantic`, but this block did not render on any route in the matrix. Same shape as #1; flagged for the overhaul, not measured as live |
| 7 | `.pgal-hex` | 4237, 4244 | `opacity:0` + `pointer-events:none` | `.pgal-stripe:hover` / `:focus-visible` | no — label | **Cosmetic.** The hex is also printed in the card foot |
| 8 | `.grg-pill` | 7631–7632 | `opacity:0` + `pointer-events:none` | `.grg-card:hover` | no — label | **Cosmetic.** Type/angle is repeated in `.grg-meta` |
| 9 | `.wmap-tip` | 5273–5275 | `visibility:hidden` + `pointer-events:none` | `.wmap-blip:hover` / `:focus-visible` | no — tooltip | **Cosmetic**, but tooltip-only content on touch. Already logged as N4 in the responsive audit |
| 10 | `.ggn-handle-val` | 7388–7389 | `visibility:hidden` + `pointer-events:none` | `.is-dragging` / `:focus-visible` | no — value bubble | **CORRECT.** Reveals on `.is-dragging`, which touch produces, and the hide is delayed (`visibility 0s linear var(--dur-1)`) so the fade completes |
| 11 | `.plb-adjust-reset--idle` | 6739 | `visibility:hidden` + `pointer-events:none` | state class | n/a | **CORRECT.** A deliberate idle state, not a hover reveal |
| 12 | `.btn.is-loading>*` | 558 | `visibility:hidden` | state class | n/a | **CORRECT.** Loading state |
| 13 | `.grg-like` | 7637–7639 | `opacity:0` **inside `@media(hover:hover)`** | `.grg-card:hover` / `:focus-visible` / `.is-liked` | yes | **CORRECT — this is the reference implementation.** On a touch device the whole rule never applies and the button is simply visible |
| 14 | `.fg-card-compare` | 7998–8000 | — | — | yes | **CORRECT.** `@media(pointer:coarse)` gives it 44×44 and `opacity:1` |
| 15 | `a.htool-link` / `.htool-head` / `.hcomm-card-link` / `.hcomm-tab` ×33 | scroll-reveal | `visibility:hidden` | IntersectionObserver on scroll | **yes — 33 links** | **DEFECT — S13.** 11 of 33 reached at fastest tab; 31 of 33 at human speed |

**Five live defects (#1, #2, #3/#4, #5, #15). Two correct implementations already in the
file (#13, #14) that the other five should copy.**

### MAJOR · S14 · Community — the like button on every card is invisible on touch

- **Page / route:** Community · `/community`
- **Occurs:** every viewport tested, 320×568 through 1180×820. **12 buttons**, one per card.

**What is wrong.** `button.ch-heart` measures `opacity: 0` at 46×24px on a touch device.
It is revealed by `.ch-card:hover` — which never fires — or by its own `:focus-visible`,
which is keyboard-only. The like control is the surface's only engagement action and it is
invisible on every phone and tablet.

**Likely cause.** `global.css:3362–3363`. Fix shape is `.grg-like`'s: wrap the
`opacity:0` in `@media(hover:hover)`.

### MAJOR · S15 · The primary nav CTA renders as "tart for Fre" between 769px and ~870px

- **Page / route:** every app-shell and Create route. Measured on `/color/palette` and
  `/settings`.
- **Occurs:** **769–~870px.** Measured broken at **769, 800, 834, 844**. Measured clean at
  **768, 900, 960, 1000, 1024**. Not an animation artefact — re-measured after a 5-second
  settle, identical.
- **Screenshots:** `docs/qa/screenshots-mobile/nav-844x390-cta-clipped.png` ·
  `palette-834x1194-tools-invisible.png` (top-right corner)

**What is wrong.** `.pnav-cta` is an `inline-grid` with one `1fr` track holding
`.pnav-cta-i{overflow:hidden;min-width:0;white-space:nowrap}`. In this band the nav row
runs out of space, the track is compressed, and the label is clipped with **no ellipsis**:

| Viewport | Track width | Label needs | Label gets | Renders as |
|---|---|---|---|---|
| 768 | `1fr` | 124 | 124 | `Start for Free` |
| **769** | **`0px`** | 62 | **36** | an unlabelled 38px blob |
| **800** | — | 65 | **43** | truncated |
| **834** | **`23.58px`** | 74 | **60** | `tart for Fre` |
| **844** | **`28.58px`** | 76 | **65** | truncated |
| 900 | `1fr` | 93 | 93 | `Start for Free` |
| 1024 | `1fr` | 124 | 124 | `Start for Free` |

This is the site's primary conversion control, in the persistent nav, on every page, and
this band is iPad-portrait and landscape-phone territory. `innerText` still reads
`Start for Free`, so a screen reader is fine and only sighted users see the damage.

**Likely cause.** `global.css:4655–4656` — `.pnav-cta{display:inline-grid;
grid-template-columns:1fr}` with `.pnav-cta-i{overflow:hidden;min-width:0}`. There is no
`flex-shrink:0` on the CTA in the nav's flex row, so it is the element chosen to absorb the
shortfall, and `overflow:hidden` on the inner track then hides the evidence.

### MAJOR · S16 · Type Scale — all 9 specimen rows truncate to 192px on a phone

- **Page / route:** Type Scale Generator · `/typescale`
- **Occurs:** 320×568 (8 of 9), 390×640 and 390×844 (**9 of 9**), 844×390 (4 of 9),
  768×1024 (5 of 9), 834×1194 and 1180×820 (4 of 9), 1024×768 (6 of 9).
- **Screenshot:** `docs/qa/screenshots-mobile/typescale-390x844.png`

**What is wrong.** At 390×844 every one of the 9 `.tsc-row-text` specimens is truncated.
The largest needs **1328px** and is given **192px** — 14% of the string. Every row reads
`The quick b…`.

This is **not** the same defect as the responsive audit's M3, which covered the 981–1345px
two-column flip. This is the phone case, which that audit did not reach: the specimen
column is 192px wide on a 390px phone, so the tool's entire output — *"read it back in a
real layout"* — is a truncated fragment at every size.

### Escalation of an existing finding — Palette Builder at short heights

The responsive audit's **M1** recorded overlapping control pairs on `.plb-col` at
heights below 820px. Hit-testing escalates it: at **390×640** the harness found **25
controls where `elementFromPoint` at 20%, 50% and 80% returns a different element** — they
are not merely overlapping, they cannot be tapped. 19 at 320×568. Clean at 390×844.

Sample at 390×640: `button.plb-tool "Lock PRIMARY"` → hit returns `div.plb-name`;
`"Remove PRIMARY"` → returns `section.plb-col`; `"Show contrast guidance"` → returns
`button.plb-hex`. Not re-reported as a separate defect — the diagnosis and cause in M1
stand, but the severity there should be read as blocking, not cosmetic.

### Not defects — checked and cleared

Three things the automated pass flagged that measurement cleared, recorded so they are not
re-investigated:

- **`/discover/gradients` and `/fontgallery` "overlaps"** — `a.grg-swatch` under
  `button.grg-like`, and `button.fg-card-open` under `button.fg-card-compare`. Both are a
  small control layered on a full-card control; the top one wins the hit test. Both are
  also correctly touch-guarded (`@media(hover:hover)` and `@media(pointer:coarse)`).
- **`/home` "clipping"** — every hit was a `div.sr-only` helper or a decorative
  `.system-cta-beams` element. Working as designed.
- **`.pgal-stripe` touch spacing** — 4 stripes per card with **0px** between them, but
  measured at 92.5px, 38.5px, 38.5px and 38.5px tall. All exceed 24px, so WCAG 2.5.8 is
  met on size and the zero spacing does not fail it. A mis-tap copies a neighbouring
  colour; noted, not logged.

---

<!-- further slices appended below -->
