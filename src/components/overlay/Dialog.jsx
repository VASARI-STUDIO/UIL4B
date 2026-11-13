import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import useModalDialog from '../../hooks/useModalDialog'
import { useCloseOnBack, useInertBehind } from '../../hooks/useCloseOnBack'

// The shared centred dialog (a bottom sheet under 768px; the skin is in
// styles/v3-overlays.css). It owns the keyboard contract through the existing
// hooks: focus trap, Escape, scroll lock, focus restored to the opener, the
// back gesture, and the page inert behind.
//
//   open            render nothing when false
//   onClose         Escape, the close disc, Back, and (if allowed) the scrim
//   title           the visible heading; also the dialog's accessible name
//   size            's' (440), 'm' (560) or 'l' (880)
//   closeOnScrim    a press on the scrim closes it. Off for a confirm and for
//                   anything holding typed text, where a stray click loses work.
//   initialFocus    a selector for the control that takes focus on open; the
//                   dialog itself when omitted.
//   strip           an array of colours drawn as a full-bleed band on top
//   showClose       the close disc (a confirm has Cancel instead)
//
// Rendered through a portal into <body>, so it sits outside #main, which the
// inert hook switches off while it is open.
export default function Dialog({
  open, onClose, title, size = 's', closeOnScrim = false, initialFocus = null,
  strip = null, showClose = false, className = '', children,
}) {
  const titleId = useId()
  const layerRef = useRef(null)
  const downOnScrim = useRef(false)
  const dialogRef = useModalDialog(onClose, { enabled: !!open, initialFocus })
  useCloseOnBack(!!open, onClose)
  useInertBehind(!!open)
  if (!open) return null

  return createPortal(
    <div
      ref={layerRef}
      className="ov-layer"
      onMouseDown={(e) => { downOnScrim.current = e.target === layerRef.current }}
      onClick={(e) => {
        // Only a press that began and ended on the scrim counts: a drag that
        // starts in a field and lets go outside must not close the dialog.
        if (closeOnScrim && downOnScrim.current && e.target === layerRef.current) onClose()
        downOnScrim.current = false
      }}
    >
      <div
        ref={dialogRef}
        className={`ov-dialog${className ? ` ${className}` : ''}`}
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {strip && strip.length > 0 && (
          <div className="ov-dialog-strip" aria-hidden="true">
            {strip.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
          </div>
        )}
        {showClose && (
          <button type="button" className="ov-dialog-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="ov-dialog-body">
          <h2 id={titleId} className="ov-dialog-title">{title}</h2>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
