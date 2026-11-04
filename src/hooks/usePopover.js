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

// The bottom edge of the pinned bar matching `selector`, when it is one of
// `kinds` and is in contact with `reach` px from the top of the viewport; else 0.
const clearedBy = (selector, kinds, reach) => {
  const bar = document.querySelector(selector)
  if (!bar) return 0
  const style = getComputedStyle(bar)
  if (!kinds.includes(style.position) || style.visibility === 'hidden' || style.display === 'none') return 0
  const box = bar.getBoundingClientRect()
  return box.top <= reach && box.bottom > 0 ? box.bottom : 0
}

// How far down the viewport is painted over by FIXED top chrome, in px.
//
// Read off the element rather than off `--nav-clear`, which is the token the
// stylesheets use for the same distance (`.lbry-toolbar`, `.rc-vis-panel`,
// `.lart-toc`). That token is `calc(var(--nav-top) + var(--nav-h) + 8px)`, and
// an unregistered custom property holding a calc() comes back from
// `getComputedStyle` as the unevaluated string, not a number — parsing it here
// would be a second, drifting copy of a sum the layout engine has already done.
//
// Guarded three ways, because a popover must still place itself on a surface
// that has no nav at all: a prerendered shell before hydration, and the
// standalone checkout and onboarding routes. Anything other than a fixed bar
// resting against the top of the viewport contributes nothing.
//
// A tool page also pins its own toolbar (`.tl-toolbar`, sticky) directly under
// the nav, and it is just as much a thing a popover must not sit on: the tint
// picker pinned itself over "Copy variables" because only the nav was counted.
// It counts only while it is in contact with the nav's bottom edge (or the top
// of the viewport when there is no nav), which is exactly when it is chrome.
export const topObstruction = () => {
  const nav = clearedBy('.pnav', ['fixed'], 0)
  return Math.max(nav, clearedBy('[data-tool-toolbar]', ['fixed', 'sticky'], nav + 1))
}

// The line fixed bottom tabs begin on (the viewport's bottom when there are none).
export const bottomObstruction = () => {
  const tabs = document.querySelector('.pnav-tabs')
  return tabs && getComputedStyle(tabs).position === 'fixed' ? Math.min(window.innerHeight, tabs.getBoundingClientRect().top) : window.innerHeight
}

// True once the trigger has scrolled wholly out of the band the page is visible
// in: behind the fixed chrome above, behind the tabs below, or off a side. A
// panel clamped to the edge of that band is not attached to anything.
export function anchorOutOfView(trigger) {
  if (!trigger) return false
  const box = trigger.getBoundingClientRect()
  return box.bottom <= topObstruction() || box.top >= bottomObstruction()
    || box.right <= 0 || box.left >= window.innerWidth
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

  // Portalled listboxes use viewport coordinates and clear both fixed bars.
  if (panel.dataset.popFixed === 'true') {
    const bottom = bottomObstruction()
    const top = topObstruction() + EDGE_PAD
    const below = Math.max(0, bottom - Math.max(top, anchor.bottom) - EDGE_PAD * 2)
    const above = Math.max(0, Math.min(bottom, anchor.top) - top - EDGE_PAD)
    const side = h > below && above > below ? 'top' : 'bottom'
    const maxHeight = Math.max(0, side === 'top' ? above : below)
    const width = Math.min(Math.max(w, anchor.width, 180), vw - EDGE_PAD * 2)
    const left = Math.max(EDGE_PAD, Math.min(anchor.left, vw - width - EDGE_PAD))
    setIfChanged(panel, 'data-pop-side', side)
    panel.style.setProperty('--pop-max-h', `${maxHeight}px`)
    panel.style.setProperty('--select-min-w', `${Math.min(anchor.width, vw - EDGE_PAD * 2)}px`)
    panel.style.setProperty('--select-left', `${left}px`)
    panel.style.setProperty('--select-top', `${side === 'top' ? Math.max(top, anchor.top - EDGE_PAD - Math.min(h, maxHeight)) : Math.max(top, anchor.bottom + EDGE_PAD)}px`)
    // The line an upward panel's BOTTOM edge sits on. `--select-top` above is
    // worked out from the height at open time, so a panel that grows afterwards
    // (the colour picker gains a Recent row) would grow down over its own
    // trigger. A panel that pins its bottom edge here grows upward instead.
    panel.style.setProperty('--select-anchor-top', `${Math.max(top, anchor.top - EDGE_PAD)}px`)
    return
  }

  // Horizontal: the panel is end-aligned (its right edge on the trigger's) by
  // default. Flip to start-aligned when that would run off the left edge, and
  // back again when start-aligned would run off the right.
  const endFits = anchor.right - w >= EDGE_PAD
  const startFits = anchor.left + w <= vw - EDGE_PAD
  let align = 'end'
  if (!endFits && startFits) align = 'start'
  else if (!endFits && !startFits) align = 'clamp'
  setIfChanged(panel, 'data-pop-align', align)

  // 'clamp' used to centre the panel on the trigger, which is not a clamp: a
  // trigger near either edge put the panel off screen on the other side.
  // Measured 2026-09-09 on /create/palette at 320px: the seed picker (268px)
  // centred on a chip 79px from the left rendered from x=-24, so "PICK SEED
  // COLOUR" read "ICK SEED COLOUR" and the first preset column was gone.
  // The panel is at most `100vw - 2*EDGE_PAD` wide (global.css .pop), so
  // pinning its left edge EDGE_PAD from the viewport always fits. The offset
  // is written relative to the panel's containing block because `left` is;
  // the trigger is the fallback for a panel that has none.
  if (align === 'clamp') {
    const parent = panel.offsetParent?.getBoundingClientRect() || anchor
    const x = `${Math.round(EDGE_PAD - parent.left)}px`
    if (panel.style.getPropertyValue('--pop-x') !== x) panel.style.setProperty('--pop-x', x)
  }

  // Vertical: open upward only when the panel genuinely does not fit below AND
  // there is more room above. Flipping into an equally short gap helps nobody.
  //
  // THE ROOM ABOVE IS NOT `anchor.top`, AND ASSUMING IT WAS MADE A DEAD END.
  //
  // `.pnav` is `position:fixed; top:0; z-index:120` on every app page, so the
  // top band of the viewport is painted over by the nav at a z-index no popover
  // reaches. A panel flipped up into that band is fully VISIBLE and completely
  // unclickable — `document.elementFromPoint` on the option returns the nav.
  //
  // MEASURED 2026-09-13 on /create/emoji, light, 844px tall, before this: the
  // twelve-option category menu flipped up to y=10 at every desktop width, and
  // its FIRST option — "All", the only way back to the unfiltered library —
  // hit-tested to `.pnav-inner` at 700, 768, 1024, 1280, 1440 and 1920. Filter
  // to Flags and the control that undoes it is under the navigation bar.
  //
  // So the obstruction is subtracted from both the flip decision and the height
  // cap. The cap is what actually moves the panel: it is anchored to the
  // trigger and grows upward, so bounding it to the clear space keeps its top
  // edge below the nav instead of behind it.
  const roomBelow = vh - anchor.bottom
  const roomAbove = anchor.top - topObstruction()
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

// The control Tab should reach from a popover that lives at the end of <body>
// instead of beside its trigger: the first tabbable one after the trigger in
// document order that is not inside the panel. Null when there is none.
function focusableAfter(trigger, panel) {
  if (!trigger) return null
  const all = Array.from(document.querySelectorAll(FOCUSABLE))
    .filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'))
  const at = all.indexOf(trigger)
  if (at < 0) return null
  return all.slice(at + 1).find(el => !panel.contains(el)) || null
}

export default function usePopover(open, onClose, { initialFocus = null, autoFocus = true, arrowNav = false, portalled = false, closeWhenAnchorLeaves = false } = {}) {
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
  //
  // `closeWhenAnchorLeaves` is for a panel that is placed in viewport
  // coordinates (the portalled colour picker). Such a panel is clamped to the
  // band below the fixed chrome, so once its trigger scrolls out of that band
  // the clamp keeps it pinned under the nav, detached from anything and over the
  // controls behind it. It closes instead, without taking focus: the person is
  // scrolling, not choosing, and a focus() would scroll the page back. The
  // check follows the placement, so a later scroll event is what triggers it —
  // never the first placement at open, which would close a panel on arrival.
  useLayoutEffect(() => {
    if (!open) return undefined
    let frame = 0
    const place = () => {
      frame = 0
      placePopover(triggerRef.current, popRef.current)
    }
    const follow = () => {
      place()
      if (closeWhenAnchorLeaves && anchorOutOfView(triggerRef.current)) closeRef.current?.()
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(follow) }
    place()
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open, closeWhenAnchorLeaves])

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
      if (e.target.closest?.('[data-pop-scrim]')?.getAttribute('data-pop-scrim') === panel?.id) return
      const owner = e.target.closest?.('[data-pop-trigger]')?.getAttribute('data-pop-trigger')
      if (owner && panel?.contains(document.getElementById(owner))) return
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
      if (!leavingForward && !leavingBack) return
      if (portalled) {
        // A portalled panel is not next to its trigger in the document, so the
        // browser's own next stop is the skip link (forward) or the page's last
        // control (back). Send focus where an inline panel would have sent it.
        e.preventDefault()
        const target = leavingForward ? focusableAfter(triggerRef.current, panel) : null
        ;(target || triggerRef.current)?.focus?.()
      }
      closeRef.current?.()
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
  }, [open, initialFocus, autoFocus, arrowNav, portalled, closeToTrigger])

  return { triggerRef, popRef, closeToTrigger }
}
