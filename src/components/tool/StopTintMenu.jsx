import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { tintRampForHex } from '../../utils/tintRamp'
import { anchorOutOfView, bottomObstruction, popoverArrowTarget, topObstruction } from '../../hooks/usePopover'
import ToolIcon from './ToolIcon'

// The menu a gradient stop opens on right-click (or from its Tints button): the
// eleven tints of the stop's colour, one press to put a tint on the stop.
//
// Applying a tint is a Pro tool. A free account still sees the ramp, so the menu
// shows what the tool does, but every row is a locked row and pressing it hands
// off to `onGate` (the caller raises the Pro modal) instead of changing the stop.
//
// It is a menu, not a dialog: one tab stop, arrow keys between rows, Escape or a
// press outside closes it and focus goes back to the control that opened it.
// Portalled to the body and placed in viewport coordinates, because the stop
// list is a scrolling card that would clip it.

const EDGE = 8
const GAP = 4

// Where the menu goes when it hangs off a control (`anchor`): below it if the
// whole menu fits, else above, else beside it (the side with more room), and
// only when none of those fit does it shrink and scroll inside. It never lands
// on the control, so a second press still reaches the control. All rects are in
// viewport coordinates; `band` is the visible strip between the fixed bars.
function placeBesideAnchor(a, w, h, band) {
  const { vw, minTop, maxBottom } = band
  const clampLeft = (l) => Math.max(EDGE, Math.min(l, vw - w - EDGE))
  if (a.bottom + GAP + h <= maxBottom) return { left: clampLeft(a.left), top: a.bottom + GAP, maxHeight: null }
  if (a.top - GAP - h >= minTop) return { left: clampLeft(a.left), top: a.top - GAP - h, maxHeight: null }
  const roomRight = vw - EDGE - (a.right + GAP)
  const roomLeft = a.left - GAP - EDGE
  if (roomRight >= w || roomLeft >= w) {
    const left = roomRight >= roomLeft ? a.right + GAP : a.left - GAP - w
    const height = Math.min(h, maxBottom - minTop)
    return {
      left,
      top: Math.max(minTop, Math.min(a.top, maxBottom - height)),
      maxHeight: height < h ? height : null,
    }
  }
  // Nowhere clear for the whole menu: the roomier of above and below, capped.
  const roomBelow = Math.max(0, maxBottom - (a.bottom + GAP))
  const roomAbove = Math.max(0, a.top - GAP - minTop)
  if (roomBelow >= roomAbove) return { left: clampLeft(a.left), top: a.bottom + GAP, maxHeight: roomBelow }
  return { left: clampLeft(a.left), top: a.top - GAP - roomAbove, maxHeight: roomAbove }
}

export default function StopTintMenu({
  color, stopNumber, x, y, isPro, focusFirst = false, returnTo, ignoreDownOn = null, anchor = null, onApply, onGate, onClose,
}) {
  const ref = useRef(null)
  const tints = useMemo(() => tintRampForHex(color, 11), [color])

  // Place before paint: at the pointer, or off the control that opened it
  // (`anchor`), kept inside the viewport and clear of the fixed bars. Direct style
  // writes, so placing never re-renders the menu. Held in a ref so the scroll
  // listener below can re-place without re-running (and re-focusing) its effect.
  const placeRef = useRef(null)
  const place = useCallback(() => {
    const el = ref.current
    if (!el) return
    const scrolled = el.scrollTop
    el.style.maxHeight = ''
    const w = el.offsetWidth
    const h = el.offsetHeight
    const minTop = topObstruction() + EDGE
    const maxBottom = bottomObstruction() - EDGE
    let left
    let top
    let maxHeight
    if (anchor?.isConnected) {
      ;({ left, top, maxHeight } = placeBesideAnchor(anchor.getBoundingClientRect(), w, h, { vw: window.innerWidth, minTop, maxBottom }))
    } else {
      left = Math.max(EDGE, Math.min(x, window.innerWidth - w - EDGE))
      top = Math.max(minTop, Math.min(y, maxBottom - h))
      maxHeight = Math.max(160, maxBottom - minTop)
    }
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    if (maxHeight != null) el.style.maxHeight = `${maxHeight}px`
    el.scrollTop = scrolled
  }, [x, y, anchor])
  useLayoutEffect(() => {
    placeRef.current = place
    place()
  }, [place])

  useEffect(() => {
    const el = ref.current
    const items = () => Array.from(el?.querySelectorAll('[role="menuitem"]') || [])
    // A pointer opens the menu with focus on the panel itself, so no row looks
    // pressed; the keyboard lands on the first tint.
    ;(focusFirst ? items()[0] : el)?.focus({ preventScroll: true })

    const close = (restoreFocus) => {
      onClose()
      if (restoreFocus) returnTo?.focus?.({ preventScroll: true })
    }
    // A press on the control that opened the menu is left to that control, so a
    // second press on the Tints button closes the menu once (its click does it)
    // instead of closing on pointerdown and reopening on click.
    const onDown = (e) => { if (!el?.contains(e.target) && !ignoreDownOn?.contains?.(e.target)) close(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); return }
      // Tab leaves the menu. It is the last node in the body, so without this focus
      // would fall off the page: put it back on the opener and let the Tab carry
      // on from there (no preventDefault).
      if (e.key === 'Tab') { close(true); return }
      const list = items()
      const next = popoverArrowTarget(e.key, list.indexOf(document.activeElement), list.length)
      if (next < 0) return
      e.preventDefault()
      list[next]?.focus({ preventScroll: true })
    }
    // Scrolling or resizing would leave a pointer-placed menu floating away from
    // its stop, so that closes it. A menu hung off a control follows the control
    // instead, and closes only once the control has scrolled out of sight.
    const follow = (e) => {
      if (e.target instanceof Node && el?.contains(e.target)) return
      if (!anchor?.isConnected || anchorOutOfView(anchor)) { close(false); return }
      placeRef.current()
    }
    const onAway = follow
    const onScroll = follow
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onAway)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onAway)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [focusFirst, returnTo, ignoreDownOn, anchor, onClose])

  return createPortal(
    <div
      ref={ref}
      className="grd-tintmenu"
      role="menu"
      aria-label={`Tints of stop ${stopNumber}, ${color.toUpperCase()}`}
      tabIndex={-1}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="grd-tintmenu-head" role="presentation">
        {isPro ? (
          <span>Tints of {color.toUpperCase()}</span>
        ) : (
          <span className="grd-tintmenu-pro">
            <ToolIcon name="lock-simple" size={13} />
            <span>Tints are a Pro tool</span>
          </span>
        )}
      </div>
      {tints.map((t) => (
        <button
          key={t.label}
          type="button"
          role="menuitem"
          className="grd-tintmenu-item"
          aria-disabled={!isPro || undefined}
          aria-label={isPro ? `Apply tint ${t.label}, ${t.hex.toUpperCase()}` : `Tint ${t.label}, ${t.hex.toUpperCase()} (Pro)`}
          onClick={() => {
            if (!isPro) { onGate(); onClose(); return }
            onApply(t.hex.toUpperCase(), t.label)
            onClose()
            returnTo?.focus?.({ preventScroll: true })
          }}
        >
          <span className="grd-tintmenu-chip" style={{ background: t.hex }} aria-hidden="true" />
          <span className="grd-tintmenu-label">{t.label}</span>
          <span className="grd-tintmenu-hex">{t.hex.toUpperCase()}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
