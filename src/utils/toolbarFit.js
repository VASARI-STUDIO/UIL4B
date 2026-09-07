// Does the Palette Builder's action rail fit the row, or must its exploratory
// cluster collapse behind one labelled trigger?
//
// Founder, 2026-09-05, two screenshots. DESKTOP: the toolbar "is a run of
// icon-only buttons of uneven weight and spacing sitting beside two labelled
// buttons and a select, and it reads as unresolved rather than designed."
// NARROW (662px): "the row overflows — Save/export, Image, Explore, Preview,
// Vision type and Gradient are visible with the row clipped mid-control."
//
// ── WHY MEASURED AND NOT A BREAKPOINT ───────────────────────────────────────
// The icon and emoji library toolbar had this exact class of fault and #318
// answered it with a media query, which fixed one band and left the fault
// sitting outside it. `filterFit.js` records how that ended: the emoji tray
// wanted 1478px, so no desktop under about 2050px could give it a line and no
// breakpoint anyone guessed was ever going to be the right one. The rule that
// worked was to measure the intrinsic width and compare it to a budget.
//
// The same is true here, and measurement found a band nobody had reported.
// Rail intrinsic vs the rail's own client width, measured across 21 widths:
//
//   >=1180   712 / 712    one row, 57px tall, nothing hidden      — correct
//   981-1080 712 / 712    the rail fits, and the TOOLBAR still wraps
//                         to two rows, 105px tall                 — a fault
//   769-960  1033 / 425-551   one row, the rail is a deliberate
//                         swipeable ribbon (#318, and pinned)     — by design
//   <=768    964 / 366-744    TWO ROWS *and* the rail still clips
//                         3 to 6 controls                         — the report
//
// The founder's 662px capture is the last row: the worst of both, a wrapped
// toolbar whose second row is itself a clipping scroller.
//
// ── WHY THIS CANNOT OSCILLATE ───────────────────────────────────────────────
// The hazard in any measure-then-change-layout rule. Both sides are chosen so
// that collapsing cannot move either of them:
//
//   · `intrinsic` is a property of the CONTROLS — their widths laid out on one
//     line. The caller measures it once per band and caches it, so it is still
//     known after the cluster has left the row. It is never re-measured while
//     collapsed, where it would read as the width of a menu.
//   · The budget is built from the toolbar's own width less the lead group's
//     CEILING and the gaps. Never the lead group's or the rail's MEASURED
//     width: both move when the cluster collapses, and that feedback is what
//     would make a loop. The toolbar's width and a constant do not move.
//
// Asking "would the rail fit if the lead group were at its full size?" is also
// the honest question — the lead group is flexible, so a rail measured against
// a squeezed lead looks like it fits right up until the seed field needs its
// room back.
//
// A GRID WAS TRIED ON THE LIBRARY TOOLBAR AND REVERTED: a fixed track cannot
// give width back the way flex does. This stays a flex row for the same reason.

// THE ONE BAND THE MEASURED RULE DOES NOT GOVERN, and why that is not the
// breakpoint mistake this module exists to avoid.
//
// 769–960 is a shipped, argued, twice-tested decision: the rail is a SWIPEABLE
// RIBBON there, with Randomise, Undo, Reset and Save/export promoted ahead of
// the fade so the irreversible controls are the ones you get without a gesture
// (`palette-save-export-off-rail`). 36-rail-overflow pins it at 834 and
// 23-responsive-mid-band at 769/900/960, and the reason recorded there is that
// which control you get for free should be a choice rather than an accident of
// fitting. The founder's report names DESKTOP and 662px; it does not touch this
// band, and overturning a decision he did not question is not this change's to
// make.
//
// filterFit.js carries the mirror image of this — a band where the tray
// collapses WHATEVER it measures, "because the reason there is touch room, not
// fit". The lesson from #318 was never "no bands"; it was that a band must not
// stand in for a measurement it cannot make. Here the measurement is made
// everywhere, and this one band is an explicit design exemption rather than a
// guess about where the fault is.
export const RIBBON_QUERY = '(min-width:769px) and (max-width:960px)'

// A NOTE ON THE MARKUP, because it is where the first attempt went wrong.
// The collapsing cluster adds NO wrapper element while it is on the row — the
// five controls stay direct children of the rail. `display:contents` on a
// wrapper looks like it would do the same job and does not: it removes the
// BOX, not the ELEMENT, so every `>` selector aimed at the rail's children
// stops matching. Measured on the first attempt: the rail's own
// `.plb-toolbar-group:last-child>*{flex:0 0 auto}` and the mid-band rules
// stopped reaching the five, and Vision type shrank from 171px to 117px at
// 900px — a band this change is not even supposed to touch. So the wrapper is
// rendered only in the collapsed form, where it is a real panel and the
// selectors it breaks are ones that no longer apply.

/** `.plb-toolbar-group` (the lead half) laid out at its full content width.
 *  Measured at 359px and constant from 769px up — it holds a title, a colour
 *  trigger, a hex field and the system button, none of which reflow. Stated as
 *  a ceiling rather than read from the DOM: see the oscillation note above. */
export const LEAD_CAP = 359

/** `.plb-toolbar{gap}` in global.css — the column gap between the two groups. */
export const TOOLBAR_GAP = 18

/* ROW WIDTH IS THE CONTENT BOX, NOT `clientWidth`. Read this before changing
   the caller.

   `.plb-toolbar` is `padding:10px var(--page-inline)`, and `--page-inline` is
   20px at the widths this rule decides at. `clientWidth` INCLUDES that padding,
   so a caller that passes it hands this function 40px of room the flex line
   cannot use — and the cluster is then expanded onto a row it does not fit.

   Measured on `main` at 2026-09-06, fresh load per width, one context each:

     viewport  clientWidth  content  lead+gap+rail  toolbar height  rows
       1096       1096       1056         1097          57px          1
       1097       1097       1057         1097         105px          2   <-- wraps
       1136       1136       1096         1097         105px          2
       1137       1137       1097         1097          57px          1

   Forty pixels of padding, forty pixels of wrong answer: the cluster expanded
   at 1097 and did not fit until 1137, so every width in 1097–1136 rendered the
   toolbar at 105px in two rows instead of 57px in one. That is the founder's
   "wrapped to 105px tall" report, and it survived the previous fix because the
   unit table below passed VIEWPORT widths as `rowWidth` while the call site
   passed `clientWidth`. The helper was right and the wiring was wrong — the
   exact split this repo keeps paying for, so the browser test in
   tests/user-sim/23-responsive-mid-band.spec.js now pins the rendered height
   rather than the arithmetic.

   The name stays `rowWidth`; what changed is that it is documented as, and
   asserted to be, the space a flex line actually has. */

/**
 * @param {object} m
 * @param {number} m.intrinsic  the rail's width laid out on one line, in px
 * @param {number} m.rowWidth   `.plb-toolbar`'s CONTENT width — `clientWidth`
 *                              minus its own inline padding, in px
 * @param {number} m.leadCap    the lead group's ceiling
 * @param {number} m.gap        the toolbar's column gap
 * @returns {boolean} true when the exploratory cluster must collapse
 */
export function railOverflowsToolbar({ intrinsic, rowWidth, leadCap = LEAD_CAP, gap = TOOLBAR_GAP }) {
  // An unmeasured rail is not an overflowing one. Reporting `true` here would
  // collapse the cluster on first paint, before anything had been measured.
  if (!(intrinsic > 0) || !(rowWidth > 0)) return false
  return intrinsic > rowWidth - leadCap - gap
}
