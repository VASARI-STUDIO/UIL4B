import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoryLabel } from '../../data/discoverCategories'
import CategoryGlyph from './CategoryGlyph'

// Detail view for a single resource OR a collection. Reuses the shared
// `.ch-modal*` shell (overlay, head, body, foot) so it matches the Community
// modal exactly. Focus is trapped inside the dialog and Escape closes it.
//
// Two shapes via `item`:
//   resource  → { id, title, host, url, ... }  (single resource)
//   collection→ { id, title, blurb, _members } (members attached by the page)
//
// All external links are real nofollow new-tab <a>; the hand-off is a real
// navigation. We never fetch the external URL — faces are local monograms.

function monogram(title) {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return title.slice(0, 2).toUpperCase()
}

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

  const handoff = (tool) => {
    const params = new URLSearchParams()
    if (tool.preset) params.set('preset', tool.preset)
    if (tool.tab) params.set('tab', tool.tab)
    if (!tool.preset) params.set('from', 'discover')
    const qs = params.toString()
    onClose()
    navigate(qs ? `${tool.route}?${qs}` : tool.route)
  }

  // ─── Collection view ──────────────────────────────────────────────────────
  if (kind === 'collection') {
    const members = item._members || []
    return (
      <div className="ch-modal-overlay" onClick={onClose} role="presentation">
        <div className="ch-modal dsc-modal" ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Collection: ${item.title}`}>
          <div className="ch-modal-head">
            <h2>{item.title}</h2>
            <button className="ch-modal-close" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="ch-modal-body">
            <p className="dsc-modal-blurb">{item.blurb}</p>
            <ul className="dsc-modal-members">
              {members.map(r => (
                <li key={r.id}>
                  <button
                    className="dsc-modal-member"
                    onClick={() => onOpenResource(r)}
                    aria-label={`View details for ${r.title}`}
                  >
                    <span className="dsc-modal-member-face" data-cat={r.category} aria-hidden="true">{monogram(r.title)}</span>
                    <span className="dsc-modal-member-meta">
                      <span className="dsc-modal-member-title">{r.title}</span>
                      <span className="dsc-modal-member-host">{categoryLabel(r.category)} · {r.host}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="ch-modal-foot">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Resource view ────────────────────────────────────────────────────────
  const r = item
  const tools = r.relatedTools || []
  return (
    <div className="ch-modal-overlay" onClick={onClose} role="presentation">
      <div className="ch-modal dsc-modal" ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${r.title} details`}>
        <div className="ch-modal-head">
          <h2>{r.title}</h2>
          <button className="ch-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ch-modal-body">
          <div className="dsc-modal-top">
            <span className="dsc-modal-face" data-cat={r.category} aria-hidden="true">
              <span className="dsc-face-mono">{monogram(r.title)}</span>
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
        </div>
        <div className="ch-modal-foot">
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
  )
}
