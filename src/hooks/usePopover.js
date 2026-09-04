import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { markScrollContainers } from '../utils/scrollContainment.js'

// The keyboard + dismissal contract every NON-MODAL popover in the app owes its
// user. Modals get useModalDialog (focus trapped, background inert); popovers
// are lighter by design — the page behind them stays live, so trapping focus in
// one would be a lie to assistive technology.
//
// What a popover owes instead:
//   · Escape closes it and returns focus to its trigger.
//   · A pointer press outside closes it.
//   · Opening moves focus INTO the panel, so a keyboard user reaches its
//     contents without tabbing through the rest of the page first.
//   · Tabbing past either end closes it and lets focus continue naturally —
//     the disclosure behaviour in the WAI-ARIA APG, not a trap.
//   · It flips at the viewport edge instead of being clipped off-screen.
//
// Usage:
//   const { triggerRef, popRef } = usePopover(open, close)
//   <button ref={triggerRef} aria-expanded={open} aria-haspopup="…">
//   {open && <div ref={popRef} className="pop">…</div>}
//
// `initialFocus` is a CSS selector for the control that should take focus
// instead of the panel itself — reach for it only where the popover's whole
// purpose is one control (the colour picker opens onto its saturation pad).
//
// `arrowNav` adds Up/Down/Home/End movement between the panel's own controls.
// It does NOT make the panel a `role="menu"`: these panels hold segmented
// controls, links and status lines, and claiming menu semantics for that told
// assistive technology to expect a single-tab-stop widget it isn't. Arrow keys
// here are a movement convenience layered on a disclosure — every control keeps
// its own tab stop, so a user who ignores the arrows loses nothing.

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// Distance kept between a flipped popover and the viewport edge.
const EDGE_PAD = 8

export function focusablesIn(node) {
  return Array.from(node?.querySelectorAll(FOCUSABLE) || [])
    .filter(el => el.offsetParent !== null || el === document.activeElement)
}

// Write an attribute only when it would actually change.
//
// This runs on every scroll event while a popover is open, and the writes are
// the expensive half rather than the reads: a `setAttribute` invalidates layout,
// so writing an unchanged value and then reading `getBoundingClientRect` on the
// next event is a read-write-read cycle that forces a fresh layout each time.
// The nav trigger sits in a FIXED bar, so its box does not move while the page
// scrolls and every one of those writes was rewriting the value it already had.
// Measured on the home page with the account panel open, one wheel gesture:
// 110 attribute writes before this guard, 0 after — the placement genuinely
// never changes during a scroll, so the whole cycle was waste.
const setIfChanged = (el, name, value) => {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

// Decide which side the panel hangs off and whether it opens upward, by
// measuring the TRIGGER and the panel's own size rather than the panel's
// current position. Measuring the positioned panel would feed its own placement
// back into the decision and oscillate between the two sides on every resize.
export function placePopover(trigger, panel) {
  if (!trigger || !panel) return
  const anchor = trigger.getBoundingClientRect()
  const w = panel.offsetWidth
  const h = panel.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal: the panel is end-aligned (its right edge on the trigger's) by
  // default. Flip to start-aligned when that would run off the left edge, and
  // back again when start-aligned would run off the right.
  const endFits = anchor.right - w >= EDGE_PAD
  const startFits = anchor.left + w <= vw - EDGE_PAD
  let align = 'end'
  if (!endFits && startFits) align = 'start'
  else if (!endFits && !startFits) align = 'clamp'
  setIfChanged(panel, 'data-pop-align', align)

  // Vertical: open upward only when the panel genuinely does not fit below AND
  // there is more room above. Flipping into an equally short gap helps nobody.
  const roomBelow = vh - anchor.bottom
  const roomAbove = anchor.top
  const side = h + EDGE_PAD > roomBelow && roomAbove > roomBelow ? 'top' : 'bottom'
  setIfChanged(panel, 'data-pop-side', side)

  // Whatever side it lands on, never let it grow taller than the space it has.
  const maxH = `${Math.max(140, Math.round((side === 'top' ? roomAbove : roomBelow) - EDGE_PAD * 2))}px`
  if (panel.style.getPropertyValue('--pop-max-h') !== maxH) panel.style.setProperty('--pop-max-h', maxH)
}

// Which control an arrow/Home/End press should move to. Pure, so the wrapping
// behaviour is testable without a browser. `index` is the currently focused
// control's position (-1 when focus is on the panel itself); the return is the
// index to focus, or -1 to leave the key alone.
export function popoverArrowTarget(key, index, count) {
  if (!count) return -1
  switch (key) {
    // From the panel itself (index -1) Down enters at the top and Up at the
    // bottom, which is what both the APG menu and listbox patterns do.
    case 'ArrowDown': return index < 0 ? 0 : (index + 1) % count
    case 'ArrowUp': return index < 0 ? count - 1 : (index - 1 + count) % count
    case 'Home': return 0
    case 'End': return count - 1
    default: return -1
  }
}

// Home/End belong to the caret inside a text-entry control, and arrow keys move
// it. Never steal them from one.
function ownsItsOwnKeys(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (tag !== 'INPUT') return false
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(el.type)
}

export default function usePopover(open, onClose, { initialFocus = null, autoFocus = true, arrowNav = false } = {}) {
  const triggerRef = useRef(null)
  const popRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  // Return focus to the trigger, then close. Order matters: closing first
  // unmounts the panel and drops focus to <body> for a frame, which some screen
  // readers announce as a page change.
  const closeToTrigger = useCallback(() => {
    triggerRef.current?.focus?.()
    closeRef.current?.()
  }, [])

  // Placement runs before paint so the panel is never seen in the wrong place.
  //
  // The FIRST placement stays synchronous, inside the layout effect, for exactly
  // that reason. Every LATER one is coalesced into a single animation frame.
  //
  // The listener is on `window` in the CAPTURE phase, which is the only position
  // that sees a scroll event from every element in the document rather than only
  // the page. That breadth is WANTED — an ancestor scroller moving the trigger
  // has to move the panel with it — but it is also what makes the handler run
  // often, and placePopover forces synchronous layout every time it does.
  //
  // BE HONEST ABOUT WHAT THE COALESCING BUYS, because it was measured and it is
  // less than it looks. On the home page with the account panel open, one wheel
  // gesture delivers 55 scroll events across 93 frames — already at most one per
  // frame — so rAF merges nothing there, and the invocation count is identical
  // with and without it. It is a BOUND, not a saving: it caps the work at one
  // placement per frame for the case the capture phase exists to catch, several
  // scrollers reporting in the same frame. The measured saving came from the
  // idempotent writes in placePopover instead (110 attribute writes to 0).
  //
  // `passive` because neither handler calls preventDefault: it tells the browser
  // it never has to wait on this listener before it scrolls.
  useLayoutEffect(() => {
    if (!open) return undefined
    let frame = 0
    const place = () => {
      frame = 0
      placePopover(triggerRef.current, popRef.current)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place) }
    place()
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const panel = popRef.current

    // A popover is not modal, so the page behind it stays live BY DESIGN and
    // nothing here stops Lenis or locks the body — that would be the modal
    // contract, claimed by a surface that deliberately does not hold it.
    //
    // What a popover does owe is that a wheel gesture with the pointer inside it
    // scrolls IT. `allowNestedScroll` (useSmoothScroll) already gives every
    // scrollable element that much. Marking the panel's scroll containers adds
    // the boundary half: reaching the end of a scrolling popover stops there
    // rather than passing the rest of the gesture to the page underneath —
    // which, with the popover still open over the top, reads as the page moving
    // on its own. That matters more here than in a modal, because a popover
    // leaves the page scrollable on purpose, so there is a live scroller waiting
    // to take anything the panel lets through.
    const unmark = markScrollContainers(panel)

    if (autoFocus) {
      const target = initialFocus ? panel?.querySelector(initialFocus) : focusablesIn(panel)[0]
      // rAF so the panel has been laid out (and placed) before focus lands —
      // focusing a not-yet-positioned element makes the browser scroll to it.
      requestAnimationFrame(() => (target || panel)?.focus?.())
    }

    const onDown = (e) => {
      if (panel?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      closeRef.current?.()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // stopPropagation so a popover opened inside another surface closes only
        // itself rather than collapsing the whole stack.
        e.stopPropagation()
        closeToTrigger()
        return
      }
      if (!panel) return
      if (arrowNav && !ownsItsOwnKeys(e.target) && (panel === document.activeElement || panel.contains(document.activeElement))) {
        const controls = focusablesIn(panel)
        const next = popoverArrowTarget(e.key, controls.indexOf(document.activeElement), controls.length)
        if (next >= 0) {
          e.preventDefault()
          controls[next].focus()
          return
        }
      }
      if (e.key !== 'Tab') return
      const list = focusablesIn(panel)
      if (!list.length) return
      const active = document.activeElement
      const leavingForward = !e.shiftKey && active === list[list.length - 1]
      const leavingBack = e.shiftKey && (active === list[0] || active === panel)
      // Let the Tab through — the browser moves focus onward on its own. We just
      // close behind it, which is what "disclosure" means as opposed to "modal".
      if (leavingForward || leavingBack) closeRef.current?.()
    }

    // Capture phase on pointerdown: an ancestor panel may stop propagation to
    // guard its own overlay, so a bubble-phase listener never sees presses
    // landing elsewhere inside it and the popover would stay stuck open.
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      unmark()
    }
  }, [open, initialFocus, autoFocus, arrowNav, closeToTrigger])

  return { triggerRef, popRef, closeToTrigger }
}
