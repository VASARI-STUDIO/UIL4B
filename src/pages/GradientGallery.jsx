import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GradientGalleryGrid from '../components/discover/GradientGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import { GALLERY_GRADIENTS, GRADIENT_TAGS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { readGradientSubmissions, withdrawGradientSubmission } from '../utils/gradientSubmissions'

// /discover/gradients — the Gradient Library. A designgradients-style browse
// surface over the local static set (src/data/gradientGallery.js): search by
// name/hex/tag, filter by mood tag and gradient type, copy the CSS or open any
// gradient straight in the Gradient Generator. No network, no loading state —
// the only Murphy state is "no results", which is never a dead end (one-tap
// clear).
//
// The masthead and results row come from the shared Discover Library
// components, so this page and the Palette Library stay in lockstep by
// construction rather than by copy-paste.

const TYPES = ['Linear', 'Radial', 'Conic']

export default function GradientGallery({ toast }) {
  const [rawQuery, setRawQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [type, setType] = useState('all')
  // Gradients this browser has queued for review. They are deliberately kept
  // OUT of the browse grid: they are not in the library, and showing them there
  // would imply they had been published. See utils/gradientSubmissions.js.
  const [submissions, setSubmissions] = useState(readGradientSubmissions)
  const query = rawQuery.trim().toLowerCase()

  const visible = useMemo(() => GALLERY_GRADIENTS.filter(g => {
    if (tag !== 'all' && !g.tags.includes(tag)) return false
    if (type !== 'all' && g.type !== type) return false
    if (query) {
      const hay = `${g.name} ${g.type} ${g.tags.join(' ')} ${g.stops.map(s => s.color).join(' ')}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  }), [query, tag, type])

  const filtered = query || tag !== 'all' || type !== 'all'
  const clearAll = () => { setRawQuery(''); setTag('all'); setType('all') }

  return (
    <div className="sec grg-wrap">
      <DiscoverGalleryHero
        eyebrow="Discover / Colour"
        title="Gradient Library"
        description="Production-ready CSS gradients with a point of view. Copy the rule in one tap, save a favourite, or open any of them in the Gradient Generator and make it yours."
        mark={{ label: 'linear-gradient()', value: GALLERY_GRADIENTS.length, caption: 'curated gradients' }}
        action={(
          <Link className="btn" to="/color/gradient">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
            Open the Gradient Generator
          </Link>
        )}
      />

      {submissions.length > 0 && (
        <section className="grg-queue" aria-labelledby="grg-queue-heading">
          <div className="section-h">
            <h2 id="grg-queue-heading">Your submissions</h2>
            <span className="meta">Queued for review — not published</span>
          </div>
          <p className="grg-queue-note">
            These are held on this browser while shared publishing is built. A reviewer has
            to approve a gradient before it joins the library above, so nothing here is live yet.
          </p>
          <ul className="grg-queue-list">
            {submissions.map(s => (
              <li key={s.id} className="grg-queue-item">
                <span className="grg-queue-swatch" style={{ background: gradientCss(s.type, s.angle, s.stops) }} aria-hidden="true" />
                <span className="grg-queue-id">
                  <strong>{s.name}</strong>
                  <span className="meta">{s.type} · {s.stops.length} stops · by {s.author}</span>
                </span>
                <span className="grg-queue-status">Pending review</span>
                <Link className="btn btn-s btn-ghost" to={gradientToolUrl({ ...s, name: s.name })}>Open</Link>
                <button
                  type="button"
                  className="btn btn-s btn-ghost"
                  onClick={() => {
                    setSubmissions(withdrawGradientSubmission(s.id))
                    toast?.('Submission withdrawn')
                  }}
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Toolbar — search joins the tag + type filters (AND semantics) */}
      <div className="grg-toolbar">
        <div className="pl-search-wrap grg-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="pl-search"
            type="search"
            value={rawQuery}
            onChange={e => setRawQuery(e.target.value)}
            placeholder="Search gradients by name, hex or mood…"
            aria-label="Search gradients"
          />
          {rawQuery && (
            <button className="pl-search-clear" onClick={() => setRawQuery('')} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        <div className="pl-chips grg-chips" role="group" aria-label="Filter by mood">
          <button
            className={`pl-chip${tag === 'all' ? ' active' : ''}`}
            onClick={() => setTag('all')}
            aria-pressed={tag === 'all'}
          >
            All
          </button>
          {GRADIENT_TAGS.map(t => (
            <button
              key={t}
              className={`pl-chip${tag === t ? ' active' : ''}`}
              onClick={() => setTag(t)}
              aria-pressed={tag === t}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="ch-sort grg-types" role="group" aria-label="Filter by gradient type">
          <button
            className={`ch-sort-btn${type === 'all' ? ' is-active' : ''}`}
            onClick={() => setType('all')}
            aria-pressed={type === 'all'}
          >
            All types
          </button>
          {TYPES.map(t => (
            <button
              key={t}
              className={`ch-sort-btn${type === t ? ' is-active' : ''}`}
              onClick={() => setType(t)}
              aria-pressed={type === t}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <DiscoverResultHead
        eyebrow="Curated collection"
        title="Gradients worth building with"
        count={visible.length}
        noun="gradient"
        id="grg-grid-heading"
      />

      {visible.length > 0 ? (
        <section aria-labelledby="grg-grid-heading">
          <GradientGalleryGrid toast={toast} gradients={visible} />
        </section>
      ) : (
        <div className="pl-empty grg-empty" role="status">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No gradients match {query ? <>“{rawQuery.trim()}”</> : 'those filters'}.</p>
          {filtered && (
            <button className="btn btn-ghost" onClick={clearAll}>Clear filters</button>
          )}
        </div>
      )}
    </div>
  )
}
