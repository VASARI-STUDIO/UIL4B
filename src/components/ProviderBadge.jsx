import { useEffect, useId, useRef, useState } from 'react'
import { providerBadgeStyle } from '../utils/aiProvider'

// The provider badge on an AI result. A hover tooltip is out of reach on a
// touch screen and from the keyboard, so the badge is a button: pressing it
// shows what the provider name means, and Escape, a second press or a press
// anywhere else hides it again.
export default function ProviderBadge({ provider }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const noteId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!provider) return null
  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={buttonRef}
        type="button"
        data-testid="ai-provider-badge"
        data-provider={provider.id}
        aria-expanded={open}
        aria-controls={open ? noteId : undefined}
        aria-label={`Made by ${provider.label}. What this means`}
        onClick={() => setOpen((v) => !v)}
        style={{ font: 'inherit', ...providerBadgeStyle(provider), background: 'none', cursor: 'pointer' }}
      >
        {provider.label}
      </button>
      {open && (
        <span
          id={noteId}
          role="note"
          data-testid="ai-provider-note"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width: 'max-content',
            maxWidth: 'min(280px, calc(100vw - 32px))',
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--t1)',
            fontSize: 13,
            lineHeight: 1.45,
            whiteSpace: 'normal',
            boxShadow: 'var(--shadow-m)',
          }}
        >
          {provider.title}
        </span>
      )}
    </span>
  )
}
