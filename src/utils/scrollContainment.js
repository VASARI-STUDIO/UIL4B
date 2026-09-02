// Keeping a popup's scroll inside the popup.
//
// Plain DOM, no React and no Lenis import, deliberately: usePopover is otherwise
// pure keyboard logic that tests/unit/popover-keys.test.js loads directly under
// node, and pulling the Lenis singleton (and through it AppearanceContext) into
// that import graph broke the suite the moment this was tried there.

const SCROLLS = /^(auto|scroll|overlay)$/

/**
 * Mark an overlay and every scroll container inside it `data-lenis-prevent`,
 * and return the undo.
 *
 * This is the boundary half of the popup-scroll fix, and it is in JS for a
 * reason that cost a wrong first attempt to find. `allowNestedScroll` already
 * gets a gesture into the popup; what decides whether the gesture STOPS at the
 * popup's last line, instead of handing the remainder to the page underneath,
 * is `overscroll-behavior: contain` on the element that is doing the scrolling —
 * Lenis reads that property directly and keeps out at the boundary when it is
 * set. The `[data-lenis-prevent]` rule in global.css is what applies it.
 *
 * The obvious way to apply it is a CSS rule over the dialog's subtree, and that
 * is wrong: `contain` on a box that is NOT a scroll container still blocks the
 * gesture passing THROUGH it, so a rule broad enough to be sure of hitting the
 * scroller also lands on the ordinary spans between the pointer and that
 * scroller, and the popup stops scrolling at all. Measured, not reasoned: the
 * font specimen dialog's body scrolled 0px with the subtree rule and 413px
 * without it.
 *
 * CSS cannot ask which elements are scroll containers. `getComputedStyle` can,
 * so the question is asked here, once, when the overlay opens — the same
 * measurement Lenis itself makes — and the answers are marked. Overlays whose
 * scrolling body only appears later (after a fetch, say) still scroll correctly
 * from `allowNestedScroll`; they just do not get the boundary until they next
 * open.
 *
 * An element that already carries the attribute by hand is left alone, so the
 * undo can never strip markup this function did not add.
 */
export function markScrollContainers(root) {
  if (!root) return () => {}
  const marked = []
  const mark = (el) => {
    if (el.hasAttribute('data-lenis-prevent')) return
    el.setAttribute('data-lenis-prevent', '')
    marked.push(el)
  }
  mark(root)
  for (const el of root.querySelectorAll('*')) {
    const style = getComputedStyle(el)
    if (SCROLLS.test(style.overflowY) || SCROLLS.test(style.overflowX)) mark(el)
  }
  return () => { for (const el of marked) el.removeAttribute('data-lenis-prevent') }
}
