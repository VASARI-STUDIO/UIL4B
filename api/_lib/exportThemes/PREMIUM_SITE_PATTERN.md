# Premium HTML sites: the pattern each theme follows

The premium export turns a theme's brand guide and UI kit into two small static sites (a zip each), drawn in that theme's own look,
not a generic default. Theme 21 (`themes/21-presentation`) is the worked example. This note is how a theme gets there.

## 1. What the engine gives you

| Piece | File | What it does |
|---|---|---|
| Guide site build | `engine/guide-site-build.js` | `guideSiteFiles(ctx, T)` returns a file map from `T.guideSite`: `index.html` (cover and contents), one file per page, `assets/guidelines.css`, a client script and the fonts. |
| Kit site build | `engine/kit-site-build.js` | `kitSiteFiles(ctx, T)` does the same from `T.kitSite`, into `ui-kit-html/` beside the code package, sharing its assets and fonts. |
| Page units | `engine/guide-site.js` | `siteUnits` and the `T.guideSite` contract: `shell`, `front`, `page`, `css`, `adapt`, `darkSample`. |
| HTML passes | `engine/html-tree.js` | Anchors, table labels, outline and in-text links, run on a small tree (no browser on the server). |
| Placeholders | `engine/placeholders.js` | The slot edition's placeholder swap. Only themes in `PH_THEMES` (`engine/pages.js`) get it. |

The route (`exportThemeRoute.js`) picks the site build when the theme exports `guideSite` / `kitSite`. A theme without them keeps the
single document in both rows.

Differences from the engine's browser build, so nothing assumes them: no Chromium, `--fit` is measured in the visitor's browser,
there are no photos (art-directed slots only), every string goes through `put()`, and there is no check, shot or zip step.

## 2. The theme's side of the contract

A theme exports, from `index.js` (merged from its lane modules):

- `guideSite` — `{ shell, front, page, css, adapt, darkSample, prepare?, keep? }`
  - `prepare(ctx)` (optional) returns the context the site is drawn from. Theme 21 uses it to name the font it really ships (`servedCtx`).
  - `keep(ctx, id)` (optional) returns false for a page with nothing real on it. The engine then drops it from the build, the contents
    and Next/Previous, and renumbers what is left (`keptCtx`). Never ship a page that is only a heading.
- `kitSite` — the same shape for the kit.
- `meta` hooks the engine reads, all optional:
  - `realCopy(path, value)` — the words to print for a brand path in the slot edition (the project's own name and colours, specimen copy
    a component needs). Return `undefined` to leave the placeholder.
  - `screenContent(ctx)` — the product screen's content, when the theme adjusts the brand's own.
  - `exampleDemo(ctx)` — the demo page's total and account value, so they match the sample data.

## 3. Rules a premium site must meet

These are the faults the theme 21 reviews kept finding. Each one has a test in `tests/unit/export-themes-premium-site.test.js`.

1. **No placeholder ships.** Draw from a cleaned context (`lane-ht-clean.js`: `hasPh`, `realOnly`, `cleaned`, `siteCtx`). A line, list
   item or group with nothing real left is not printed. No dashed boxes, logo frames or editor labels.
2. **A missing name gets a typeset stand-in** (`PLACEHOLDER_NAME`), set in the display face. One symbol everywhere (`symbolOf`), so
   logo versions differ only where they should.
3. **One sample story.** Put the theme's sample data in one module (theme 21: `real-copy.js`, `once.js`). Every list, table, card,
   dialog, alert and product screen reads it. Statuses match on every chip, tab and alert. Any total adds up from the rows it sums.
   No "Item 1", "Main action" or street-name filler.
4. **Status labels come from one place.** `ctx.status` is synced from the swapped brand (`placeholders.js`); do not copy it earlier.
5. **Name the font that ships.** A face served by a stand-in is labelled as the stand-in (`servedCtx`), in the `@font-face`, the
   specimens and every label.
6. **No photo-slot instructions** ("Place a photograph here…") and no empty device frames.
7. **Clean markup.** No `class=""`, no closing tags on void elements, and shown code never clips.
8. **Reflow, don't shrink.** Below 1024 px a slide becomes its figure above its notes. At 390 no page scrolls sideways. Theme 21 splits
   pages into a REFLOW set (notes only at narrow widths) and a COVERED set (the slide stays; the notes are for narrow widths only).
9. **Tokens from the palette.** No stock blue, and no pure white as a surface or a label.
10. **No whole-slide shrink.** Below 1024 px a figure that only reads at slide size (clear space, smallest size, layouts) is drawn
    again at the column's width, with no text under 12 px. Do not scale the 1440 slide down, and drop the slide's running head.
11. **Keep the wordmark's spaces.** A typeset name sits in its own inner span, so an accent tag beside it cannot eat the space in
    "Tide & Co.".
12. **An empty brand reads as a finished default.** No dashed `.ph-c` outlines. A project with no name is "Your name" in titles, page
    comments and the example. Clear space is stated as a multiple of the logo's height, not in pixels.
13. **A product screen shows one theme.** Light and dark are separate screens; each has the top bar nav, its tabs and the full sample
    set, and the phone screen sits in a portrait frame. No status chip repeated in a header and its card.

## 4. Checking a theme

```bash
node scripts/premium-site-check.mjs <theme> <outside-repo-dir>/fixture --shots --dark=guide-index,kit-example
node scripts/premium-site-check.mjs <theme> <outside-repo-dir>/empty --empty --shots
```

- The first builds the fixture brand (an orders business, five colours, two Google faces). The second builds a project with no design,
  which must read as a finished default, not a broken one.
- `--shots` shoots every page at 390, 768 and 1440 into `<dir>/shots`, writes `<dir>/widths.txt`, and exits non-zero if a page
  overflows at 390. Shots stay outside the repository.
- `--dark=<page>,<page>` also shoots those pages at 1440 in dark. It sets the kit's stored mode, clicks the example page's own
  Dark switch, and fails if the page's `data-theme` is not `dark`, so a light page is never passed off as the dark shot.
- `keep()` decides from the page's notes, and a notes function that throws is caught and read as "no notes". A page lost to a bug
  therefore drops with no error. Assert the pages a theme must have by name, and check the contents link to each.
- A design review scores both sets on the same eight categories each round. The bar is 8.0. Fix, rebuild and re-shoot until it passes.
- Add the theme to the built-page tests in `export-themes-premium-site.test.js` (no empty page, no editor words, one story, faces
  shipped), with and without a design.

## 5. Order of work for the other themes

- Themes 22–32 already export `guideSite` and `kitSite`. For each: add a `real-copy.js` (or reuse theme 21's story through
  `meta.realCopy` where the theme is in `PH_THEMES`), add `keep`, apply the rules in section 3, then check as in section 4.
- Themes 01–10 have no site lanes yet. They keep the single document until a theme gains `guideSite` / `kitSite` lanes built the way
  theme 21's `lane-ht*.js` are.
- The free themes (04, 07, 25, 27) follow the same rules. Their premium sites are still gated server-side to Pro.
