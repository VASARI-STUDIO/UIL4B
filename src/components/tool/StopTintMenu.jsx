import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { tintRampForHex } from '../../utils/tintRamp'
import { popoverArrowTarget, topObstruction } from '../../hooks/usePopover'
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

export default function StopTintMenu({
  color, stopNumber, x, y, isPro, focusFirst = false, returnTo, onApply, onGate, onClose,
}) {
  const ref = useRef(null)
  const tints = useMemo(() => tintRampForHex(color, 11), [color])

  // Place before paint: at the pointer, kept inside the viewport and clear of the
  // fixed bars. Direct style writes, so placing never re-renders the menu.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const minTop = topObstruction() + EDGE
    const left = Math.max(EDGE, Math.min(x, window.innerWidth - w - EDGE))
    const top = Math.max(minTop, Math.min(y, window.innerHeight - h - EDGE))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.maxHeight = `${Math.max(160, window.innerHeight - minTop - EDGE)}px`
  }, [x, y])

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
    const onDown = (e) => { if (!el?.contains(e.target)) close(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); return }
      if (e.key === 'Tab') { close(false); return }
      const list = items()
      const next = popoverArrowTarget(e.key, list.indexOf(document.activeElement), list.length)
      if (next < 0) return
      e.preventDefault()
      list[next]?.focus({ preventScroll: true })
    }
    // Scrolling or resizing would leave the menu floating away from its stop.
    const onAway = () => close(false)
    const onScroll = (e) => { if (!el?.contains(e.target)) close(false) }
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
  }, [focusFirst, returnTo, onClose])

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
