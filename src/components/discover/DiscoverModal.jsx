import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoryLabel } from '../../data/discoverCategories'
import { monogram, buildToolHandoffUrl, isToolAvailable } from './discoverUtils'
import CategoryGlyph from './CategoryGlyph'

// Detail view for a single resource OR a collection. Uses the canonical
// `.ui-modal*` shell (overlay, head, body, actions) so it matches every other
// modal site-wide. Focus is trapped inside the dialog and Escape closes it.
//
// Two shapes via `item`:
//   resource  → { id, title, host, url, ... }  (single resource)
//   collection→ { id, title, blurb, _members } (members attached by the page)
//
// All external links are real nofollow new-tab <a>; the hand-off is a real
// navigation. We never fetch the external URL — faces are local monograms.

function ExternalGlyph({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dsc-ext-glyph">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

export default function DiscoverModal({ item, kind, offline, onClose, onOpenResource }) {
  const navigate = useNavigate()
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE)
        if (!focusable || !focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    // Move focus into the dialog on open.
    const t = requestAnimationFrame(() => {
      dialogRef.current?.querySelector(FOCUSABLE)?.focus()
    })
    return () => { document.removeEventListener('keydown', onKey); cancelAnimationFrame(t) }
  }, [onClose])

  // Lock background scroll while the modal is open; restore the prior value on
  // close (mirrors CommandPalette / FeedbackModal).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handoff = (tool) => {
    onClose()
    navigate(buildToolHandoffUrl(tool))
  }

  // ─── Collection view ──────────────────────────────────────────────────────
  if (kind === 'collection') {
    const members = item._members || []
    return (
      <div className="ui-modal-overlay" onClick={onClose} role="presentation">
        <div className="ui-modal ui-modal--wide" ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Collection: ${item.title}`}>
          <div className="ui-modal-head">
            <h2 className="ui-modal-title">{item.title}</h2>
            <button className="ui-modal-x" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="ui-modal-body">
            <p className="dsc-modal-blurb">{item.blurb}</p>
            <ul className="dsc-modal-members">
              {members.map(r => (
                <li key={r.id}>
                  <button
                    className="dsc-modal-member"
                    onClick={() => onOpenResource(r)}
                    aria-label={`View details for ${r.title}`}
                  >
                    <span className="dsc-modal-member-face" data-cat={r.category} aria-hidden="true">{monogram(r.title, r.category)}</span>
                    <span className="dsc-modal-member-meta">
                      <span className="dsc-modal-member-title">{r.title}</span>
                      <span className="dsc-modal-member-host">{categoryLabel(r.category)} · {r.host}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="ui-modal-actions ui-modal-actions--row">
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Resource view ────────────────────────────────────────────────────────
  const r = item
  // Hide admin-gated tools — their routes render <ComingSoon/> for normal users,
  // so listing them here would be a dishonest dead end. The section hides if none
  // remain (see `tools.length > 0` below).
  const tools = (r.relatedTools || []).filter(isToolAvailable)
  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div className="ui-modal ui-modal--wide" ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${r.title} details`}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">{r.title}</h2>
          <button className="ui-modal-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ui-modal-body">
          <div className="dsc-modal-top">
            <span className="dsc-modal-face" data-cat={r.category} aria-hidden="true">
              <span className="dsc-face-mono">{monogram(r.title, r.category)}</span>
            </span>
            <div className="dsc-modal-id">
              <span className="dsc-modal-host">{r.host}</span>
              <div className="dsc-modal-pills">
                <span className="dsc-pill" data-cat={r.category}>
                  <CategoryGlyph category={r.category} size={12} /> {categoryLabel(r.category)}
                </span>
                <span className={`dsc-pill-free${r.free ? '' : ' is-paid'}`}>{r.free ? 'Free' : 'Paid'}</span>
                {r.difficulty && <span className="dsc-chip dsc-chip-diff">{r.difficulty}</span>}
              </div>
            </div>
          </div>

          {r.whyUseful && (
            <div className="dsc-modal-section">
              <h3 className="dsc-modal-h">Why it's useful</h3>
              <p className="dsc-modal-why">{r.whyUseful}</p>
            </div>
          )}

          {r.tags?.length > 0 && (
            <div className="dsc-modal-section">
              <h3 className="dsc-modal-h">Tags</h3>
              <div className="dsc-modal-tags">
                {r.tags.map(t => <span key={t} className="dsc-modal-tag">#{t}</span>)}
              </div>
            </div>
          )}

          {tools.length > 0 && (
            <div className="dsc-modal-section">
              <h3 className="dsc-modal-h">Use it in a tool</h3>
              <div className="dsc-modal-tools">
                {tools.map(tool => (
                  <button
                    key={tool.label}
                    className="dsc-modal-tool"
                    data-cat={r.category}
                    onClick={() => handoff(tool)}
                    aria-label={`Use ${r.host} in ${tool.label}`}
                  >
                    <span aria-hidden="true">→</span> {tool.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="ui-modal-actions ui-modal-actions--row">
            <button className="btn" onClick={onClose}>Close</button>
            <a
              className={`btn btn-accent${offline ? ' is-disabled' : ''}`}
              href={offline ? undefined : r.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-disabled={offline || undefined}
              tabIndex={offline ? -1 : undefined}
              title={offline ? 'You are offline — reconnect to open external links' : `Visit ${r.host} (opens in a new tab)`}
              onClick={(e) => { if (offline) e.preventDefault() }}
            >
              Visit site <ExternalGlyph />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
