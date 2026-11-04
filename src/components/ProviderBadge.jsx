import { useEffect, useId, useRef, useState } from 'react'
import { providerBadgeStyle } from '../utils/aiProvider'
import './ProviderBadge.css'

// The provider badge on an AI result. A hover tooltip is out of reach on a
// touch screen and from the keyboard, so the badge is a button: pressing it
// shows what the provider name means. Escape, a second press, a press anywhere
// else or Tab moving on hides it again.
//
// The note is a sibling of the button, not a popover: both result headers are
// wrapping flex rows, so a full-width note drops onto its own line under the
// badge and can never run past the edge of a narrow screen.
export default function ProviderBadge({ provider }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const noteRef = useRef(null)
  const noteId = useId()

  useEffect(() => {
    if (!open) return undefined
    const inside = (node) => buttonRef.current?.contains(node) || noteRef.current?.contains(node)
    const onDown = (e) => { if (!inside(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onFocus = (e) => { if (!inside(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocus)
    }
  }, [open])

  if (!provider) return null
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="ai-prov"
        data-testid="ai-provider-badge"
        data-provider={provider.id}
        aria-expanded={open}
        aria-controls={open ? noteId : undefined}
        onClick={() => setOpen((v) => !v)}
        style={providerBadgeStyle(provider)}
      >
        {provider.label}
        <svg className="ai-prov-ico" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7.25v4" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r=".6" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <p ref={noteRef} id={noteId} className="ai-prov-note" data-testid="ai-provider-note">
          {provider.note}
        </p>
      )}
    </>
  )
}
