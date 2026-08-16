import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

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

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// Distance kept between a flipped popover and the viewport edge.
const EDGE_PAD = 8

export function focusablesIn(node) {
  return Array.from(node?.querySelectorAll(FOCUSABLE) || [])
    .filter(el => el.offsetParent !== null || el === document.activeElement)
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
  panel.setAttribute('data-pop-align', align)

  // Vertical: open upward only when the panel genuinely does not fit below AND
  // there is more room above. Flipping into an equally short gap helps nobody.
  const roomBelow = vh - anchor.bottom
  const roomAbove = anchor.top
  const side = h + EDGE_PAD > roomBelow && roomAbove > roomBelow ? 'top' : 'bottom'
  panel.setAttribute('data-pop-side', side)

  // Whatever side it lands on, never let it grow taller than the space it has.
  panel.style.setProperty('--pop-max-h', `${Math.max(140, Math.round((side === 'top' ? roomAbove : roomBelow) - EDGE_PAD * 2))}px`)
}

export default function usePopover(open, onClose, { initialFocus = null, autoFocus = true } = {}) {
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
  useLayoutEffect(() => {
    if (!open) return undefined
    const reposition = () => placePopover(triggerRef.current, popRef.current)
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const panel = popRef.current

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
      if (e.key !== 'Tab' || !panel) return
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
    }
  }, [open, initialFocus, autoFocus, closeToTrigger])

  return { triggerRef, popRef, closeToTrigger }
}
