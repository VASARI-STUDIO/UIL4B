// Does a filter tray fit the toolbar row, or must it collapse to a menu?
//
// Founder, 2026-09-04: "the header design changes height switching from the
// emoji to icon library. the bar is broken visually on a standard desktop."
// Measured at 1440x900: /create/icons rendered a 68px toolbar, /create/emoji a
// 213px one, so switching tabs moved the page by 145px.
//
// #318 had already met this shape and answered it with a media query, because
// 641-980 was the band with no layout of its own. But the band was a proxy. What
// actually breaks a toolbar is a tray that cannot fit the row it is on, and the
// emoji tray wants 1478px - twelve categories each carrying a glyph, a label and
// a count. No desktop under about 2050px can give it a line, so the fault was
// never going to come right at a wider breakpoint; it simply sat outside the
// band that had been fixed.
//
// THE TWO INPUTS ARE CHOSEN SO THAT COLLAPSING CANNOT CHANGE EITHER OF THEM,
// which is what makes a measure-then-change-layout rule safe:
//
//   · `intrinsic` is a property of the OPTIONS - the tray's width with wrapping
//     turned off. The caller measures it once and caches it, so it survives the
//     tray leaving the DOM.
//   · The budget is built from the row's width, the search field's CEILING and
//     the action's width. Never the search field's or the filter container's
//     MEASURED width: those two do move when the group collapses, and that is
//     exactly the feedback that would let the layout oscillate.
//
// Asking "would the tray fit if the search field were at its cap?" is also the
// honest question. A search field with no ceiling eats the row, and then every
// tray looks like it comfortably fits on a line of its own - which is precisely
// how the emoji toolbar came to be three rows tall.

/**
 * @param {object} m
 * @param {number} m.intrinsic    tray width with `flex-wrap:nowrap`, in px
 * @param {number} m.rowWidth     `.lbry-toolbar-row` content width, in px
 * @param {number} m.actionWidth  `.lbry-toolbar-action` width, or 0 if absent
 * @param {number} m.searchCap    `.lbry-search{max-width}` from global.css
 * @param {number} m.gap          `.lbry-toolbar-row{gap}` from global.css
 * @returns {boolean} true when the tray must collapse to its menu form
 */
export function trayOverflowsRow({ intrinsic, rowWidth, actionWidth = 0, searchCap, gap }) {
  // An unmeasured tray is not an overflowing one. Reporting `true` here would
  // collapse every group on first paint, before anything had been measured.
  if (!(intrinsic > 0) || !(rowWidth > 0)) return false
  return intrinsic > rowWidth - searchCap - actionWidth - gap * 2
}
