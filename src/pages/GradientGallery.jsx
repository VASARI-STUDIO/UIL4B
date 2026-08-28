import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GradientGalleryGrid from '../components/discover/GradientGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import { GALLERY_GRADIENTS, GRADIENT_TAGS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { readGradientSubmissions, withdrawGradientSubmission } from '../utils/gradientSubmissions'
import { mergeSubmissions } from '../utils/communityQueue'
import { listMySubmissions } from '../utils/communityQueueApi'
import { useAuth } from '../contexts/AuthContext'

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

// Filter options are built once at module scope: they are pure functions of
// static data, and rebuilding them per render would hand LibraryFilterGroup a
// new array identity every keystroke and re-measure the sliding indicator.
//
// The four mood tags that name a colour carry a colour dot. The other three
// (pastel, vivid, mono) describe saturation rather than hue, so a single
// swatch would misrepresent them — a dot is only added where it can be honest.
const MOOD_OPTIONS = [
  { id: 'all', label: 'All' },
  ...GRADIENT_TAGS.map(t => ({
    id: t,
    label: t[0].toUpperCase() + t.slice(1),
    ...(['warm', 'cool', 'dark', 'light'].includes(t) ? { dot: t } : {}),
  })),
]

const TYPE_OPTIONS = [
  { id: 'all', label: 'All types' },
  ...TYPES.map(t => ({ id: t, label: t })),
]

export default function GradientGallery({ toast }) {
  const { user } = useAuth()
  const [rawQuery, setRawQuery] = useState('')
  const [tag, setTag] = useState('all')
  // An ARRAY, because the type tray is multi-select (founder request,
  // 2026-08-08). `['all']` is the unfiltered state; picking every type collapses
  // straight back to it, which LibraryFilterGroup handles.
  const [types, setTypes] = useState(['all'])
  // Gradients this browser has queued for review. They are deliberately kept
  // OUT of the browse grid: they are not in the library, and showing them there
  // would imply they had been published. See utils/gradientSubmissions.js.
  const [submissions, setSubmissions] = useState(readGradientSubmissions)

  // "My pending submissions" is a property of the ACCOUNT, not of this browser.
  //
  // This list used to come from localStorage alone, so a gradient submitted on
  // a phone was invisible on a laptop and vice versa — the reported symptom was
  // "I submitted other gradients that I do not see here". They were never lost;
  // they were simply only ever in one browser's storage, and no reviewer could
  // see them either.
  //
  // The local list still renders first (instant, works offline); the account's
  // copy merges in when it arrives. Local-only entries are KEPT and marked
  // unsynced rather than dropped — they are real submissions that have not
  // reached the queue yet, and hiding them would look exactly like the bug.
  useEffect(() => {
    let cancelled = false
    if (!user?.uid) return undefined
    listMySubmissions(user.uid, 'gradient')
      .then((server) => {
        if (cancelled) return
        setSubmissions(prev => mergeSubmissions(
          server.map(s => ({
            id: s.localId || s.id,
            name: s.name,
            status: s.status,
            createdAt: s.createdAt,
            ...(s.payload || {}),
          })),
          prev,
        ))
      })
      .catch(() => { /* the local list still stands; nothing is lost */ })
    return () => { cancelled = true }
  }, [user?.uid])
  const query = rawQuery.trim().toLowerCase()

  const visible = useMemo(() => GALLERY_GRADIENTS.filter(g => {
    if (tag !== 'all' && !g.tags.includes(tag)) return false
    if (!types.includes('all') && !types.includes(g.type)) return false
    if (query) {
      const hay = `${g.name} ${g.type} ${g.tags.join(' ')} ${g.stops.map(s => s.color).join(' ')}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  }), [query, tag, types])

  const clearAll = () => { setRawQuery(''); setTag('all'); setTypes(['all']) }

  return (
    <div className="sec grg-wrap">
      <DiscoverGalleryHero
        eyebrow="Discover / Colour"
        title="Gradient Library"
        description="Production-ready CSS gradients with a point of view. Copy the rule in one tap, save a favourite, or open any of them in the Gradient Generator and make it yours."
        mark={{ label: 'linear-gradient()', value: GALLERY_GRADIENTS.length, caption: 'curated gradients' }}
        action={(
          <Link className="btn" to="/create/gradient">
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

      {/* Toolbar — search joins the mood + type filters (AND semantics).
          Both filter groups now use the one shared segmented idiom. This
          toolbar previously ran outlined pills for mood and a filled segmented
          control for type, side by side, so a single row asked "which subset?"
          in two visually unrelated ways. */}
      <LibraryToolbar
        className="grg-toolbar"
        search={{
          value: rawQuery,
          onChange: setRawQuery,
          placeholder: 'Search gradients by name, hex or mood…',
          label: 'Search gradients',
        }}
      >
        <LibraryFilterGroup
          label="Filter by mood"
          value={tag}
          onChange={setTag}
          options={MOOD_OPTIONS}
        />
        <LibraryFilterGroup
          label="Filter by gradient type"
          value={types}
          onChange={setTypes}
          options={TYPE_OPTIONS}
          multiSelect
          hint="Shift-click to combine types"
        />
      </LibraryToolbar>

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
        // The reset is unconditional now. It used to render only when the page
        // could prove a filter was set, which hid it in precisely the case
        // where working out what to undo by hand was hardest.
        <LibraryEmpty
          className="grg-empty"
          title={`No gradients match ${query ? `“${rawQuery.trim()}”` : 'those filters'}.`}
          detail="Try a broader search, or reset the mood and type filters to see all of them again."
          onClear={clearAll}
        />
      )}
    </div>
  )
}
