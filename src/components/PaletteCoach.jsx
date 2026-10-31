import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { COACH_BEATS } from '../utils/paletteCoach'
import { hasOpenOverlays, suspendGuideForOverlays } from '../utils/openOverlays'

// The first-palette coach: two beats, docked above the Palette Builder's bottom
// toolbar as one stack with it. Which beat shows, and what Save does, are the
// page's decisions (PaletteBuilder.jsx); the rules for when it appears at all
// are in utils/paletteCoach.js.
//
// ─────────────────────────────────────────────────────────────────────────────
// IT NEVER BLOCKS THE BOARD
// ─────────────────────────────────────────────────────────────────────────────
// A region, not a dialog: no focus trap, no scrim, no scroll lock, and focus is
// NOT moved into it on arrival, because the person's first move is an edit on
// the board. Its controls sit in the tab order after the toolbar. Beat 1 has no
// button of its own for the real action (the edit is the action); Next is there
// for someone happy with the draw.
//
// Escape dismisses it from anywhere on the page, but only when nothing else is
// open: a popover, menu or dialog takes Escape first. While one is open the
// coach steps out of the way (hidden, inert) and returns when it closes, the
// same arrangement the brand-kit walkthrough's panel makes.
//
// It sits at the foot of the screen, so the page measures where the toolbar's
// top edge is: the coach hangs from that edge and follows it as the page
// scrolls or resizes.
const CLOSE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function PaletteCoach({ beat, onNext, onSave, onDismiss, anchorSelector }) {
  const ref = useRef(null)
  const titleId = useId()
  const [bottom, setBottom] = useState(0)
  const copy = COACH_BEATS[beat] || COACH_BEATS[0]

  // Hang from the toolbar's top edge. Measured before paint so the coach never
  // shows in one place and then jumps.
  useLayoutEffect(() => {
    const anchor = anchorSelector ? document.querySelector(anchorSelector) : null
    let frame = 0
    const measure = () => {
      frame = 0
      const top = anchor ? anchor.getBoundingClientRect().top : window.innerHeight
      // Off the foot of the screen (a page that scrolls the toolbar away), the coach rests on the screen's edge.
      setBottom(Math.max(0, Math.round(window.innerHeight - top)))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    if (anchor) observer?.observe(anchor)
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
    }
  }, [anchorSelector])

  // Escape, when nothing else is open to take it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (hasOpenOverlays(document.body)) return
      onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  // Another overlay is open: the coach stays mounted, fades out and goes inert.
  useLayoutEffect(() => {
    if (!ref.current) return undefined
    return suspendGuideForOverlays(document, [ref.current])
  }, [])

  return (
    <section
      ref={ref}
      className="plb-coach"
      role="region"
      aria-labelledby={titleId}
      data-beat={copy.id}
      style={{ '--plb-coach-bottom': `${bottom}px` }}
    >
      <div className="plb-coach-head">
        <p className="plb-coach-count">{copy.count}</p>
        <button type="button" className="plb-coach-x" onClick={onDismiss} aria-label="Close">
          {CLOSE_ICON}
        </button>
      </div>
      <h2 className="plb-coach-title" id={titleId}>{copy.title}</h2>
      <p className="plb-coach-body">{copy.body}</p>
      <div className="plb-coach-foot">
        <button type="button" className="plb-coach-hide" onClick={onDismiss}>Hide tips</button>
        {beat === 0
          ? <button type="button" className="btn plb-coach-go" onClick={onNext}>Next</button>
          : <button type="button" className="btn btn-accent plb-coach-go" onClick={onSave}>Save palette</button>}
      </div>
    </section>
  )
}
