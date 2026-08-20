# Responsive Breakpoint Audit — August 2026

**Scope:** 16 routes × 17 viewport widths (320 · 360 · 390 · 414 · 480 · 600 · 768 ·
834 · 900 · 961 · 980 · 999 · 1024 · 1180 · 1280 · 1440 · 1920) at height 900, plus a
short-viewport pass at 390×640 and a 560→1000px height sweep on Palette Builder.

**Method:** rendered evidence only. `npm run build` (green, 27 prerendered route shells)
→ `npm run preview` on `http://localhost:4174` → driven with Playwright/Chromium. Every
defect below was measured in a live layout, not read out of the stylesheet. CSS causes
were traced afterwards to `src/styles/global.css`.

**This is a diagnosis-only pass. Nothing was fixed.** Line references are evidence, not
patches.

---

## Headline

The founder's complaint reproduces, and the named example is the worst defect on the
list. Palette Builder's colour-system selector is **completely unclickable between 961px
and 1000px**, and partially blocked to 1079px.

Two systemic patterns account for 6 of the 8 top defects:

1. **The 981px two-column flip is too early.** Four tools (`.tt-grid`, `.tsc-grid`,
   `.fpr-grid`, and Palette's toolbar) switch from a full-width single column to
   `minmax(0,1fr) 340px` the instant the viewport passes 980px. The fixed sidebar plus
   gap plus page gutters take ~390px, so **the working column gets narrower as the window
   gets wider** — a Type Scale user at 999px sees *less* of their scale than at 980px.
   Every one of these needs roughly 1345px before it recovers the width it had at 980px.
2. **Grid minimums that are smaller than the card content.** The Gradient Library packs
   two columns from 450px with a 200px minimum, against cards that need ~245px.

**One genuine positive:** across all 16 pages × 17 widths there was **no horizontal page
scrolling anywhere** and no element escaping the document. The page-gutter token system is
holding. Every defect below is *inside* a container, not a body overflow.

**Defect count:** 1 BLOCKER · 6 MAJOR · 8 MINOR.

---

## BLOCKER

### B1 · Palette Builder — the colour-system selector is unclickable at 961–1000px

- **Page / route:** Palette Builder · `/color/palette`
- **Occurs:** **961px**, exactly. Clean at 960px, broken at 961px.
- **Fully blocked:** 961–1000px. **Partially blocked:** 1001–1079px. **Clears:** 1080px.
- **Screenshots:** `docs/qa/screenshots/palette-bar-980.png` ·
  `docs/qa/screenshots/palette-bar-1024.png` · `docs/qa/screenshots/palette-980.png`

**What is wrong.** The toolbar's second group (Image / Explore / Preview / Vision Type /
Randomise / undo / history / save) slides left over the first group and covers the
`System · Auto` button. Measured overlap: **+115px at 961px**, peaking at **+118px at
962px**, decaying to 0 at 1080px. The button itself is only 110px wide, so at 961px it is
covered end to end.

`document.elementFromPoint` sampled at 20% / 50% / 80% across the System button:

| Width | 20% | 50% | 80% |
|---|---|---|---|
| 961 | `.plb-icobtn` | icon svg | `.plb-icobtn` |
| 981 | icon svg | `.plb-toolbar-group` | `.plb-icobtn` |
| 1001 | `.plb-harm` | icon svg | icon svg |
| 1061 | `.plb-harm` | `.plb-harm` | `.plb-harm` |

At 961–1000px **no point on the control hits the control**. Choosing a colour harmony —
monochromatic, analogous, triadic, the thing a palette builder exists to do — is
impossible at those widths with a mouse. The visible symptom is a stray `EM`/`SYSTEM`
text fragment bleeding out from behind the round icon buttons.

**Likely cause.** `global.css:6747` — the mid-band fix is scoped
`@media(min-width:769px) and (max-width:960px)` and simply stops at 960. Above it the base
rules take over:

- `global.css:6206` — `.plb-toolbar{display:flex;justify-content:space-between;flex-wrap:nowrap;gap:18px}`
- `global.css:6212` — `.plb-toolbar-group:first-child{min-width:0;flex:0 1 auto}`
- `global.css:6213` — `.plb-toolbar-group:last-child{flex:0 0 auto}`
- `global.css:6226` — `.plb-harm{white-space:nowrap}`

The first group is allowed to shrink below its content (`min-width:0` + `flex:0 1 auto`)
while the action group refuses to shrink at all (`flex:0 0 auto`). Overflow on the group
is `visible`, so the squeezed content spills right, under the later-painted action group.
The 769–960 band solves this by inverting the two (`first-child{flex:0 0 auto}`,
`last-child` becomes the scroller) — there is no equivalent for 961–1079.

---

## MAJOR

### M1 · Palette Builder — swatch controls collide on every real phone (height-driven)

- **Page / route:** Palette Builder · `/color/palette`
- **Occurs:** width ≤ 430px **and viewport height < 820px**. This is not a width
  breakpoint — it is a height one, and it covers essentially every phone in portrait
  (iPhone 14 Pro ≈ 390×664 usable; Pixel ≈ 393×730).
- **Screenshot:** `docs/qa/screenshots/palette-390x640.png` (compare
  `docs/qa/screenshots/palette-390.png` at 390×900, which is clean)

**What is wrong.** Each swatch row shrinks linearly with viewport height. Measured
`.plb-col` height at 390px wide:

| Viewport height | Row height | Overlapping control pairs |
|---|---|---|
| 560 | 24px | 30 |
| 640 | 35px | 16 |
| 760 | 59px | 7 |
| 820 | 71px | **0** |

The wrapped tool row needs ~61px (a 32px `.plb-tool` line + a ~21px name/hex line + 8px
`row-gap`). At 24–35px the two wrapped lines sit on top of each other: the drag / lock /
adjust / contrast / swap / duplicate / delete buttons overlap the hex labels of the rows
below, and the duplicate and close icons land directly on top of the **ADD** button's
label (visible as `AD`+icons in the screenshot). It is also impossible to tell which
swatch the floating tool row belongs to.

**Likely cause.** `global.css:8378` — `@media(max-width:430px){.plb-col{flex-wrap:wrap;
row-gap:8px;min-height:0;...}}`. The comment above it (`global.css:8368–8376`) documents
a *correct* earlier fix: wrap the tools onto their own line so they keep full touch size.
But it also sets `min-height:0`, removing the 64px floor that `global.css:6817` sets for
≤768. Combined with `.plb-col{flex:1 1 0}` (`global.css:6317`) and `.plb-board{min-height:0}`
(`global.css:6816`), each row is now free to collapse to whatever the viewport leaves.
The wrap fix and the `min-height` removal are in tension: wrapping *doubles* the row's
content height at the same moment the floor is removed.

### M2 · Tint Scale — 1 to 3 of the 11 tint stops are invisible at 981–1119px

- **Page / route:** Tint Scale Generator · `/color/tint`
- **Occurs:** **981px**. Clean at 980px. **Clears:** 1120px.
- **Screenshots:** `docs/qa/screenshots/tint-999.png` (broken) ·
  `docs/qa/screenshots/tint-980.png` (clean) · `docs/qa/screenshots/tint-1040.png`

**What is wrong.** The ramp row width collapses from **888px at 980px to 534px at 990px**
and the trailing stops render outside the panel, where they are clipped and unreachable:

| Width band | Stops hidden |
|---|---|
| 981–999 | 3 (800, 900, 950) |
| 1000–1059 | 2 (900, 950) |
| 1060–1119 | 1 (950) |
| ≥1120 | none |

The page's own status bar reads **"11 stops per scale"** and **"11 generated tokens"**
while only 9 are on screen. The hidden cells are still in the layout — they geometrically
overlap the `#tt-hue` and `#tt-chroma` sliders in the right-hand panel (42px of overlap at
999px) — so this is content escaping its container, not a deliberate truncation. The
darkest end of a tonal ramp is exactly the part a designer needs for text-on-dark roles.

**Likely cause.** `global.css:5957` — `.tt-grid{grid-template-columns:minmax(0,1fr) 340px}`,
released by `global.css:6090` (`@media(max-width:980px){.tt-grid{grid-template-columns:1fr}}`).
At 981px the 340px sidebar + 24px gap + gutters remove ~390px from a viewport that has
only gained 1px.

### M3 · Type Scale — the specimen column halves at 981px; 6 of 9 rows truncate

- **Page / route:** Type Scale Generator · `/typescale`
- **Occurs:** **981px**. **Clears:** ~1345px (the point at which the preview column
  regains the width it had at 980px).
- **Screenshots:** `docs/qa/screenshots/typescale-rows-999.png` (broken) ·
  `docs/qa/screenshots/typescale-rows-980.png` (clean)

**What is wrong.** `.tsc-row-text` available width drops from **724px at 980px to 361px at
981px** — cut in half by *widening the window by one pixel*. Truncated specimen rows go
from 3 to 6 out of 9 at the same step. At 999px the top six sizes all read
`The quick brown fox jumps o…`.

The page's stated job is *"read it back in a real layout"* — the whole product value is
seeing the specimen at its real size. Truncating two thirds of the scale defeats it, and
the user's natural corrective action (make the window bigger) makes it *worse* until they
pass ~1345px.

**Likely cause.** `global.css:7868` — `.tsc-grid{grid-template-columns:minmax(0,1fr) 340px}`,
released by `global.css:7953` (`@media(max-width:980px)`). Identical shape to M2.

### M4 · Font Pair — the specimen loses 37% of its width at 981px, then loses more at 1051px

- **Page / route:** Font Pair Finder · `/fontpairs`
- **Occurs:** **981px** (first drop) and **1051px** (second drop). Recovers 980px's width
  only past ~1330px.

**What is wrong.** Measured width of the specimen column:

| Width | Grid columns | Specimen column |
|---|---|---|
| 980 | `940px` | **940px** |
| 1000 | `592px 350px` | 592px (**−37%**) |
| 1040 | `632px 350px` | 632px |
| **1060** | `612px 390px` | **612px (−20px — narrower again at a wider viewport)** |
| 1180 | `732px 390px` | 732px |

Two separate wider-is-narrower steps. The second one is the sneakier of the two: at 1051px
the sidebar grows from 350px to 390px, so widening the browser from 1040 to 1060 makes the
type specimen *smaller*. No text clipping was detected (the specimen reflows), so this is
a quality/usability regression rather than data loss — but this is a tool whose entire
output is a large type specimen.

**Likely cause.** `global.css:7722` (`.fpr-grid{minmax(0,1fr) 340px}`), `global.css:8195`
(`minmax(0,1fr) 390px`), `global.css:8222` (`@media(max-width:1050px){...350px}`), released
by `global.css:7813` / `8228` at `max-width:980px`.

### M5 · Home — palette swatch buttons overlap and show invalid hex values at 320–399px

- **Page / route:** Home · `/home` (HomeWorkbench, Palette tab)
- **Occurs:** 320–399px. **Clears:** 400px.
- **Screenshots:** `docs/qa/screenshots/home-pal-320.png` (broken) ·
  `docs/qa/screenshots/home-pal-400.png` (clean)

**What is wrong.** Two faults, one cause.

1. **The hex labels are wrong, not merely truncated.** The screenshot at 320px reads
   `#461994` · `#9826` · `#C751` · `#E68E` · `#F5C2`. Four of the five are cut to 5
   characters with no ellipsis, so they render as *plausible but invalid* hex values. A
   visitor reading a colour off the homepage gets a value that does not exist. This is the
   first thing a first-time visitor touches on the sales page.
2. **The copy buttons overlap each other by up to 15px** (15px at 320, 7px at 360, 1px at
   390, 0 at 400). Tapping near a swatch's right edge copies the *neighbouring* colour.

**Likely cause.** `global.css:5733` — `.hw-pal-copy{flex:1;padding:0 6px 12px}` with no
`min-width:0`. Its automatic minimum size is set by the `.hw-pal-hex` text
(`global.css:5734`, 12.5px mono ≈ 54px) plus 12px padding = a 66px floor. Five of those
need 330px against a ~296px content box. `.hw-pal` carries `overflow:hidden`
(`global.css:5726`) so the row does not push the page, but the buttons still overlap each
other inside it. `.hw-pal-sw` correctly has `min-width:0` (`global.css:5729`); the copy
button inside it does not.

### M6 · Gradient Library — every gradient name and meta line truncates at 450–579px

- **Page / route:** Gradient Library · `/discover/gradients`
- **Occurs:** **450px**. Clean at 440px (single column). **Clears:** 580px.
- **Screenshots:** `docs/qa/screenshots/disc-gradients-grid-480.png` (broken) ·
  `docs/qa/screenshots/disc-gradients-grid-600.png` (clean)

**What is wrong.** The grid flips to two columns at 450px, giving 201px columns. Measured
count of truncated `.grg-name` / `.grg-meta` elements across the 100-card library:

| Width | Columns | Truncated labels |
|---|---|---|
| 440 | 1 × 408px | 0 |
| **450** | 2 × 201px | **177** |
| 480 | 2 × 216px | 157 |
| 520 | 2 × 236px | 121 |
| 530 | 2 × 241px | 17 |
| 580 | 2 × 266px | 0 |

At 480px the card footer reads `Cool Br…` / `Molten …` and `Linear · 2…`. The name is the
only way to identify a gradient, and the meta line (`Linear · 3 stops`) is the only way to
tell a 2-stop from a 3-stop before opening it. Across a 100-card library this makes
browsing on a phone close to useless — and 450–579px is a very common phone-landscape and
large-phone band.

**Likely cause.** `global.css:7673` —
`@media(max-width:640px){.grg-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}}`.
The 200px minimum is well below the ~245px the card footer actually needs (name + meta +
`Copy CSS` + `Open →` on one row). The desktop rule at `global.css:7625` uses a 280px
minimum, which is correct — the mobile override lowers it too far.

---

## MINOR

### N1 · Font Gallery — 7 family names truncated at 320px
`/fontgallery` · 320–379px, clears at 380px. `.fg-card-name` gets 94px against
`Roboto Condensed`'s 151px; `.fg-card-sample` and `.fg-card-pangram` also truncate at
320–360. Ellipsis is present, so the truncation is at least honest — but the family name
is the content of a font gallery, and `css-conventions.md` names 320px a hard floor.
Screenshots: `docs/qa/screenshots/fontgallery-320.png`, `fontgallery-360.png`.

### N2 · Gradient Generator — stop hex inputs clip their value in two narrow bands
`/color/gradient` · 320–349px and 769–799px. `.ggn-stop-hex` needs 91px and gets 77–87px,
so `#7C3AED` renders as `#7C3AE`. It is an `<input>`, so the value is recoverable by
focusing and scrolling — hence MINOR rather than MAJOR, but the at-a-glance value is
wrong. The 769–799 band is a fresh regression right at the `min-width:769px` boundary.

### N3 · Palette Builder — swatch name clipped at 480px
`/color/palette` · 480px only. `.plb-name` "Bauhaus Amethyst" needs 106px, gets 100px.
Ellipsis present (`global.css:6824`). Single width, cosmetic.

### N4 · Discover / Learn — the tool-map tooltip overflows the page container below 400px
`/discover`, `/learn` · ≤400px. `.wmap-tip` extends 3–9px past the right edge of `.home`
and is cut by `.home{overflow:hidden}`. Does not cause page scroll. The tooltip's last
few characters are lost.

### N5 · Icon Library — long icon names truncate at every width
`/icons` · all widths 320–1920. `align-center-horizontal` needs 117px against a 79px
cell; ~51–75 labels are truncated at any given width. Ellipsis is present and the tile
size is fixed by design, so this is a content-density decision rather than a breakpoint
break — but it means a large fraction of the library cannot be identified by name without
hovering. Listed here because it is width-invariant, i.e. *not* a breakpoint fault.

### N6 · Home — workbench tab strip hides the tab set at 320px
`/home` · 320–399px. The 5-tab strip is a 501px scroller in a 286px box; 3 of 5 tabs are
off-screen at 320px and the `Image` label is cut mid-word with no visible scroll
affordance. The active tab does remain in view, which is what keeps this MINOR.
Screenshot: `docs/qa/screenshots/home-pal-320.png` (upper strip visible in the 700px-tall
capture).

### N7 · File Converter — the tool tab pill wraps to two rows below ~430px
`/file-converter` · ≤~430px. `3D → Blender SOON` drops to a second line inside a
pill-radius container, which reads as a layout accident rather than a design. Purely
cosmetic; every control stays reachable and full size.
Screenshot: `docs/qa/screenshots/fileconverter-390.png`.

### N8 · WCAG 2.5.8 — interactive targets under 24px (width-invariant)
Present at **all** widths, so these are accessibility debt rather than breakpoint faults,
but they were measured during the sweep and are worth logging:

| Control | Page | Size |
|---|---|---|
| `input#plb-h/-s/-b/-temp` (range) | `/color/palette` | 135–324 × **14** |
| `button.plb-hex` | `/color/palette` (≤768) | 67.5 × **21** |
| `button.plb-ramp-bar` | `/color/palette` (≥834) | **14** × 34 |
| `button.snapv-value` | palette / tint / typescale | 48–56 × **23** |
| `button.ggn-handle` | `/color/gradient` | **20 × 20** |
| `input` (checkbox) | `/color/tint` | **13 × 13** |
| `input.pl-search` | `/icons`, galleries | 155–394 × **18** |
| App-footer nav links | every page | 34–133 × **21.4** |

---

## Pages covered

The route list in the brief did not match the router. Correct paths were taken from
`src/data/toolTree.js` (`createRoutes()`), which is what `src/App.jsx:62` actually uses.

| # | Page | Route (actual) | Brief said | Depth |
|---|---|---|---|---|
| 1 | Palette Builder | `/color/palette` | ✓ | Full sweep + 1px scan 940–1000 + height sweep 560–1000 |
| 2 | Home | `/home` | ✓ | Full sweep + 10px scan 320–480 |
| 3 | Gradient Generator | `/color/gradient` | ✓ | Full sweep + 5px scan 740–800 |
| 4 | Tint Scale | `/color/tint` | ✓ | Full sweep + 1px scan 900–1200 |
| 5 | Contrast Checker | `/color/contrast` | ✓ | Full sweep + visual at 768/961/999/1180 — **clean** |
| 6 | Plans | `/plans` | ✓ | Full sweep + visual at 768/961/999/1180 — **clean** |
| 7 | Font Gallery | `/fontgallery` | *said `/fonts`* | Full sweep + 20px scan 320–700 |
| 8 | Font Pair | `/fontpairs` | *said `/fonts/pair`* | Full sweep + 20px scan 940–1200 |
| 9 | Type Scale | `/typescale` | *said `/type-scale`* | Full sweep + 1px scan 900–1200 |
| 10 | Icon Library | `/icons` | ✓ | Full sweep |
| 11 | Discover | `/discover` | ✓ | Full sweep + 10px scan 320–400 |
| 12 | Gradient Library | `/discover/gradients` | ✓ | Full sweep + 10px scan 420–720 |
| 13 | Palette Library | `/discover/palettes` | ✓ | Full sweep |
| 14 | Learn | `/learn` | ✓ | Full sweep |
| 15 | File Converter | `/file-converter` | *said `/convert`* | Full sweep + visual at 390/999 |
| 16 | UI Builder | `/ui-builder` | *said `/ui`* | Full sweep + visual at 390/999 (coming-soon shell) |

Short-viewport pass (390×640) run on: Palette Builder, Tint, Type Scale, Gradient
Generator, Contrast Checker.

## Not reached

`/color/semantic`, `/emoji`, `/ratio`, `/alt-text`, `/discover/prompts`, `/settings`,
`/projects`, `/community`, `/help`, `/info`, `/sitemap`, `/login`, `/checkout`,
`/checkout/return`, `/privacy`, `/terms`, `/feedback`, `/seo`, `/admin`, `/style-guide`,
and the `/color` sales landing. `/plans` renders its honest "pricing unavailable" state
here because Stripe is unreachable from this sandbox — the paid-price layout at each
breakpoint is therefore **not verified**.

## Suggested triage order

`B1` first — it is the founder's named example, it is a true blocker, and the 961–1079
gap is a single missing media band. `M2` / `M3` / `M4` are one shared decision (the 981px
`minmax(0,1fr) 340px` flip is ~350px too early across four tools) and are best fixed
together rather than one page at a time. `M1` and `M5` are the two mobile faults a real
phone user hits immediately. `M6` is a one-line minimum-width change.
