import { useEffect, useRef, useState } from 'react'
import { getLenis } from '../hooks/useSmoothScroll'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { buildStyleGuideHtml, buildStyleGuideMarkdown } from '../utils/styleGuideExport'

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
  { id: 'html', name: 'Style guide (HTML)', desc: 'A paginated A4 booklet — cover, palette with contrast evidence, and the type ladder. Prints to PDF from the browser.', live: true },
  { id: 'md', name: 'Style guide (Markdown)', desc: 'The same guide, importable straight into Notion or Google Docs.', live: true },
  { id: 'png', name: 'Style guide (PNG)', desc: 'A single A4 sheet at 2× — palette, contrast grades and the type ladder. For pasting into a deck or a handoff ticket.', live: true },
  { id: 'jpeg', name: 'Style guide (JPEG)', desc: 'The same sheet, smaller file — for anywhere that will not take a PNG.', live: true },
  { id: 'css', name: 'CSS tokens', desc: 'Custom properties for colour, type, spacing and radii — drop into any stylesheet.' },
  { id: 'json', name: 'JSON tokens', desc: 'Design tokens as JSON for pipelines and Style Dictionary.' },
  { id: 'tailwind', name: 'Tailwind theme', desc: 'A tailwind.config theme extension mapped to your system.' },
  { id: 'assets', name: 'Asset bundle', desc: 'Icons and swatches exported together as SVG + PNG.' },
]

export default function ExportPanel({ onClose }) {
  const [format, setFormat] = useState('html')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { design } = useProject()
  const { isPro } = useSubscription()
  const activeFormat = FORMATS.find(f => f.id === format)
  const EXPORT_LABEL = { md: 'Markdown', html: 'HTML', png: 'PNG', jpeg: 'JPEG' }

  // Build and download in the browser. No server round trip: the document is a
  // pure function of the saved design (see utils/styleGuideExport.js), so there
  // is nothing to upload and nothing to wait for — and a paid export that can
  // fail on someone else's infrastructure is a support ticket waiting to happen.
  //
  // Free exports carry a visible footer credit; Pro exports are clean. That is
  // the policy the Plans page already states, so it is read from the live
  // entitlement rather than hard-coded here.
  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoked on the next tick rather than immediately: revoking synchronously
    // races the download in Safari and produces an empty file.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const runExport = async () => {
    const projectName = design?.name || 'Design System'
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'style-guide'
    setBusy(true)
    setError('')
    try {
      if (format === 'png' || format === 'jpeg') {
        // Drawn on a canvas rather than rasterised from the HTML — see the note
        // at the top of utils/styleGuideRaster.js. Loaded on demand so the
        // raster path costs nothing to anyone exporting HTML.
        const { renderStyleGuideImage } = await import('../utils/styleGuideRaster')
        const blob = await renderStyleGuideImage(design, { projectName, watermark: !isPro, format })
        download(blob, `${slug}-style-guide.${format === 'jpeg' ? 'jpg' : 'png'}`)
      } else {
        const markdown = format === 'md'
        const body = markdown
          ? buildStyleGuideMarkdown(design, { projectName, watermark: !isPro })
          : buildStyleGuideHtml(design, { projectName, watermark: !isPro })
        download(
          new Blob([body], { type: markdown ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8' }),
          `${slug}-style-guide.${markdown ? 'md' : 'html'}`,
        )
      }
      onClose()
    } catch (err) {
      // The panel stays open on failure: closing it would leave the user with
      // no file and no explanation, which reads as the button doing nothing.
      setBusy(false)
      setError(err?.message || 'The export could not be created. Please try again.')
    }
  }
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
              The style guide exports for real. The token formats are still on their way and say so.
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
                {!f.live && <span className="exp-fmt-soon">Soon</span>}
              </button>
            )
          })}
        </div>

        {error && <p className="exp-error" role="alert">{error}</p>}

        <div className="exp-foot">
          <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {activeFormat?.live ? (
            <button type="button" className="ui-pill ui-pill-accent ui-pill-md" onClick={runExport} disabled={busy}>
              {busy ? 'Exporting…' : `Export ${EXPORT_LABEL[format] || 'file'}`}
            </button>
          ) : (
            <button
              type="button"
              className="ui-pill ui-pill-accent ui-pill-md"
              disabled
              aria-disabled="true"
              title="This format is coming soon"
            >
              Export &mdash; Soon
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
