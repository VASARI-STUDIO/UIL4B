import { useEffect, useRef, useState } from 'react'
import { getLenis } from '../hooks/useSmoothScroll'

// The Export shell — a polished, accessible dialog that previews the handoff
// formats UIL4B will ship. There is NO real export logic yet: every format is a
// selectable preview and the primary action is a disabled "Soon" so we never lie
// about a capability that isn't wired. It works from any page (it reads nothing
// from the current tool) and is opened from the PillNav search cluster.
//
// Accessibility: role="dialog" + aria-modal, focus moves into the panel on open,
// Tab is trapped, Escape and a backdrop click close it, and focus is restored to
// the opener (the Export button) on unmount.

const FORMATS = [
  { id: 'html', name: 'HTML design system', desc: 'A full page — tokens, components and styles as ready-to-ship HTML + CSS.' },
  { id: 'css', name: 'CSS tokens', desc: 'Custom properties for colour, type, spacing and radii — drop into any stylesheet.' },
  { id: 'json', name: 'JSON tokens', desc: 'Design tokens as JSON for pipelines and Style Dictionary.' },
  { id: 'tailwind', name: 'Tailwind theme', desc: 'A tailwind.config theme extension mapped to your system.' },
  { id: 'assets', name: 'Asset bundle', desc: 'Icons and swatches exported together as SVG + PNG.' },
]

export default function ExportPanel({ onClose }) {
  const [format, setFormat] = useState('html')
  const panelRef = useRef(null)
  const restoreRef = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  // Lock body scroll while open; restore focus to the opener when we unmount.
  // Also pause the app-wide Lenis so its rAF loop doesn't fight the locked body
  // (a no-op when reduced motion is on and Lenis was never instantiated).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    getLenis()?.stop()
    const opener = restoreRef.current
    return () => {
      document.body.style.overflow = prev
      getLenis()?.start()
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  // Move focus into the panel, trap Tab within it, and close on Escape.
  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="exp-overlay" onMouseDown={onClose}>
      <div
        className="exp-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exp-title"
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="exp-head">
          <div className="exp-head-text">
            <span className="exp-eyebrow">Export</span>
            <h2 className="exp-title" id="exp-title">Export your design system</h2>
            <p className="exp-sub">
              Pick a format. Real exports are landing soon — this is a preview of what you&rsquo;ll be able to ship.
            </p>
          </div>
          <button type="button" className="exp-close" onClick={onClose} aria-label="Close export">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="exp-formats" role="radiogroup" aria-label="Export format">
          {FORMATS.map((f) => {
            const active = f.id === format
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? 'exp-fmt is-active' : 'exp-fmt'}
                onClick={() => setFormat(f.id)}
              >
                <span className="exp-fmt-check" aria-hidden="true" />
                <span className="exp-fmt-text">
                  <span className="exp-fmt-name">{f.name}</span>
                  <span className="exp-fmt-desc">{f.desc}</span>
                </span>
                <span className="exp-fmt-soon">Soon</span>
              </button>
            )
          })}
        </div>

        <div className="exp-foot">
          <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-pill ui-pill-accent ui-pill-md"
            disabled
            aria-disabled="true"
            title="Exports are coming soon"
          >
            Export &mdash; Soon
          </button>
        </div>
      </div>
    </div>
  )
}
