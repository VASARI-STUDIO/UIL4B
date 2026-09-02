# The review procedure

Run these in order. Steps 3 and 5 are the ones agents skip, and skipping either
turns the pass into an essay.

---

## 1. Build and serve the real artefact

```bash
npm run build     # vite + prerender. NEVER bare `npx vite build`.
npm run preview   # http://localhost:4174
```

`npm run preview` binds **4174 with `strictPort`**. If it is taken, another
agent is using it — **wait and retry, never change the port.** A review run
against a different port is reviewing a different artefact than the acceptance
suite does.

Bare `npx vite build` skips `scripts/prerender.mjs`, so the shells are absent
and you are reviewing a page that production does not serve.

## 2. Choose routes, and say which you did not cover

The 27 prerendered routes come from `public/sitemap.xml` — read them there
rather than keeping a list here:

```bash
grep -oE "<loc>[^<]+</loc>" public/sitemap.xml | sed 's|<loc>||;s|</loc>||'
```

Pick by what the pass is for. A full sweep is rarely the right answer; six
routes reviewed properly beat twenty-seven skimmed.

**State the routes you did not cover and why.** A review that silently covers a
third of the app reads as a review of the app. Signed-in surfaces, `/admin`,
`/checkout` and UI System mode are unreachable to a signed-out capture — say so
rather than reporting them as clean.

## 3. Capture at real widths — then look at the pictures

Widths come from
[responsive-bands.md](responsive-bands.md). The short version: **390 / 640 /
834 / 1280**, plus any width the component itself reflows at.

Two capture rules that change what you see:

- **Use real device metrics for phone and tablet** — `isMobile: true`,
  `hasTouch: true`, an iOS user agent. A desktop Chromium narrowed to 390px
  still reports `hover: hover`, and hover-dependent CSS then behaves as it never
  does on a phone. This hides exactly the class of defect a mobile pass exists
  to find. Verify in-run that `matchMedia('(hover: hover)')` is `false` and
  `(pointer: coarse)` is `true`.
- **Scroll the page before the full-page capture.** Not optional — see
  [capture-artefacts.md](capture-artefacts.md).

Then **open the images and look at them**. This is the step the procedure exists
to force. A geometry sweep rated the 2026-09-01 surfaces clean; the eye pass
found nine defects on the same surfaces.

## 4. Discount the artefacts before writing anything

Read [capture-artefacts.md](capture-artefacts.md) and rule out all three known
classes. Every one of them produces a confident, plausible, high-severity
finding that is purely a property of how you took the picture.

If you are unsure whether something is an artefact, **reproduce it by
interacting with the live page** rather than reasoning about the screenshot.

## 5. Verify every selector in source

For each finding, grep the class you are about to name:

```bash
grep -n "lbry-toolbar-action" src/styles/global.css
grep -rn "lbry-toolbar-action" src/ --include=*.jsx
```

Both must hit. A selector that exists in the stylesheet but in no component is a
dead rule; a selector in a component with no rule is unstyled. Either is worth
knowing, and neither is what you meant to report.

**Confirm the component is actually routed.** A page file existing does not mean
a route reaches it — `IconLibrary.jsx` and `EmojiLibrary.jsx` are both unrouted,
and #306 spent a whole pass editing one of them. Grep for the import.

## 6. Rank, and prefer the systemic finding

Group by cause before you order by severity. Three findings sharing a root cause
are one finding with three instances.

Order the list so the first thing read is the thing most worth fixing.

---

## Severity

Three tiers. Assign on **what it does to the user**, not on how hard it is to
fix or how much of the screen it occupies.

| Tier | Means | Test |
|---|---|---|
| **BROKEN** | A user cannot complete the task, or cannot find that they could. Content or a control is unreachable, invisible, or unusable. | Would a real user give up, or do the wrong thing believing it was right? |
| **POOR** | The task is completable but the surface actively works against it — misleading hierarchy, a control that reads as decoration, a state that does not announce itself, an obviously unintended layout. | Would a user notice something is wrong and be annoyed, while still getting there? |
| **POLISH** | Correct and usable; below the bar UIL4B holds itself to. Spacing, rhythm, an inconsistent treatment, a missed chance to look authored. | Would a designer notice and a user not? |

Rules that keep this honest:

- **Frequency does not promote a tier.** A cosmetic wobble on every page is
  still POLISH. Severity is about depth, not breadth — record breadth separately.
- **Rarity does not demote one.** A defect that only appears at 834px is still
  BROKEN if it hides the primary action there. `.plb-toolbar-group:last-child`
  is exactly this case.
- **Accessibility, data loss and dead ends are BROKEN on impact alone**, however
  rare.
- If you are torn between two tiers, write the lower one and say why you
  considered the higher. An inflated severity list gets ignored wholesale, which
  costs more than one under-rated finding.

## The finding format

```
### N. <the complaint, in a person's words>

- **Route:** /create/palette
- **Viewport:** 834px (holds 641–900)
- **Severity:** BROKEN
- **Selector:** `.plb-toolbar-group:last-child` — global.css:1738, PaletteBuilder.jsx
- **Evidence:** measured

<Two or three sentences: what is visible, what the user would do about it, and
the cause if you found it. Not a fix — a fix is a separate pass.>
```

Lead the heading with the complaint, never the selector. *"Seven of the eleven
palette controls are off the edge, Randomise among them"* is a heading. *"Toolbar
group overflow"* is a filename.

## What to return

1. **What you covered** — routes, viewports, signed-out or signed-in, and what
   you did not cover.
2. **The systemic findings**, ranked, instances nested.
3. **The remaining instance findings**, ranked.
4. **Artefacts considered and discounted** — briefly, by name. This tells the
   reader you looked, and stops the next agent re-reporting them.
5. **What you could not verify** and what would settle it.

Do not attach a score. Do not grade the surface out of ten. The list is the
deliverable.
