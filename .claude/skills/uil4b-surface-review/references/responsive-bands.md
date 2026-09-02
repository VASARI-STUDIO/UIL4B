# The bands this app actually breaks at

Measured from `src/styles/global.css`, not from the breakpoint scale. The scale
says what we intended; this says what shipped.

> **This is a reference, not a second skill.** Responsive review is the same
> procedure as any other surface review, run at more widths — it needs different
> *data*, not a different *method*. Splitting it into its own skill would create
> two documents answering "how do I review a UIL4B surface", which is the
> duplication the docs-staleness pass exists to remove.

## The measurement

```bash
grep -oE "@media[^{]*" src/styles/global.css \
  | grep -oE "(max|min)-width: *[0-9]+px" | sort | uniq -c | sort -rn
```

Re-run it. The counts below were taken on `main` and will move.

| Width | `@media` blocks | Note |
|---|---|---|
| **640px** | **30** | The busiest breakpoint in the stylesheet |
| 480px | 25 | |
| 768px | 19 | |
| 560px | 18 | |
| 980px | 14 | Paired with `min-width:981px` |
| 380px | 13 | |

Then a long tail of content-specific one-offs — 1180 · 1050 · 1024 · 960 · 900 ·
880 · 860 · 820 · 780 · 760 · 720 · 700 · 680 · 600 · 520 · 430 · 320 — each
tied to one component's natural reflow width.

**640px carries more of this stylesheet than any other width, and for a long
time no document told you to test there.** `css-conventions.md`, `murphys-law.md`
and `build-and-verify.md` all named "768 / 480 / 380". That triple omits the
busiest breakpoint in the app.

## The four widths to capture

**390 · 640 · 834 · 1280**, plus any width the component itself reflows at.

- **390** — a real phone. Where the known content-clipping defects live.
- **640** — the stacking boundary. Capture **641 as well** when a toolbar is in
  scope; the two are visually different pages and the interesting one is 641.
- **834** — iPad landscape-width, in the dead band. See below.
- **1280** — the reference desktop.

## 641–900px is the least-tested band in the app

Below 641 you get the thirty `max-width:640px` overrides. Above 900 you are
comfortably desktop. Between them, **the named scale has a hole**: it goes
640 → 768 → 980, and 768 is the last stop before 980.

The consequence is concrete. **At 834px every `max-width:640px` rule is off**, so
a tablet is served the desktop branch of every toolbar that stacks only at 640 —
`.lbry-toolbar`, `.lbry-toolbar-filters`, `.lbry-filters`,
`.lbry-toolbar-action`, and the `.lbry-toolbar-action` full-width promotion.
834px is not a hypothetical width; it is an iPad in landscape.

This band is where `.plb-toolbar-group:last-child` hides **7 of 11 controls,
Randomise among them** — the Space-bar primary action. That defect is recorded in
`global.css` itself, in the standing "THE RECURRING DEFECT" note, and it was
found at 834px and nowhere else.

**When a pass covers phone and desktop and skips this band, say so.** It is the
band most likely to still be broken.

## The recurring defect, and why it is the first thing to look for

`global.css` carries a standing note on it — read that note, it is the canonical
version. In summary: **`overflow-x:auto` with the scrollbar deleted** on both
`scrollbar-width` and `::-webkit-scrollbar`. On a touch device an overlay
scrollbar paints nothing until a scroll is already under way, so a deleted
scrollbar leaves no affordance at all. Content past the fold is not merely
hidden — as far as the user can tell it does not exist.

**Eleven instances are on record.** Five were found in one 2026-09 sweep and
four of those were hiding a primary action:

| Selector | Width | What was hidden |
|---|---|---|
| `.hw-tabs` | 390px | 5th tab (Typography) invisible |
| `.plans-compare-wrap` | 390px | the entire Pro column, 162px out |
| `.seo-tags-code` | 390px | `og:type` sliced mid-attribute |
| `.plb-toolbar-group:last-child` | **834px** | 7 of 11 controls, Randomise among them |
| `.ggn-presets` | 390px | 14 of 16 presets, zero peek |

Naming this class once closed six defects in #298. Fixing them one at a time
would not have, and the seventh would still have shipped. **When you find one,
go looking for the rest of the class before writing it up.**

The fix vocabulary is in the same `global.css` note — wrap first where the item
set is small and discrete; the three layered affordances (a fractional peek, an
edge fade, an explicit control) are for rails where wrapping is genuinely not on
the table.

## Capture rule that changes the result

Use **real device metrics** for phone and tablet — `isMobile: true`,
`hasTouch: true`, an iOS user agent, `deviceScaleFactor` 3 for phone and 2 for
tablet. Verify in-run:

```js
matchMedia('(hover: hover)').matches   // must be false
matchMedia('(pointer: coarse)').matches // must be true
```

A desktop Chromium narrowed to 390px still reports `hover: hover`. Every
hover-dependent affordance then behaves as it never does on a phone, which hides
exactly the class of defect a mobile pass exists to find. Both August audits made
this explicit and it is the reason their findings reproduced.

## Hard floor

**320px.** Never break below it. The layout must hold from 320px to 4K.
