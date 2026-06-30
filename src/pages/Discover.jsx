import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { DISCOVER_RESOURCES, resolveCollection } from '../data/discoverResources'
import { FILTER_CATEGORIES, categoryLabel } from '../data/discoverCategories'
import DiscoverCard from '../components/discover/DiscoverCard'
import FeaturedRail from '../components/discover/FeaturedRail'
import BrowseTiles from '../components/discover/BrowseTiles'
import CollectionsBand from '../components/discover/CollectionsBand'
import DiscoverEmpty from '../components/discover/DiscoverEmpty'
import DiscoverModal from '../components/discover/DiscoverModal'

// Discover (Slice 2a) — a read-only surface over the static seed in
// src/data/discoverResources.js. Everything here is client-side: search,
// filter, sort, saves (localStorage), broken-link flags (localStorage), and
// the modal. There is NO network call and NO /api route — external links are
// real nofollow new-tab anchors and faces are generated locally (no SSRF).
//
// `forcedType` lets /discover/gradients reuse this exact page scoped to one
// category (the grid + toolbar only, no "All", no browse tiles). When set we
// render the focused gradient-library view.

const SAVES_KEY = 'vs-discover-saves'
const BROKEN_KEY = 'vs-discover-broken'

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}

const SORTS = [
  { key: 'trending', label: 'Trending' },
  { key: 'saved', label: 'Most saved' },
  { key: 'recent', label: 'Recently added' },
]

// Deterministic "trending" weight so the order is stable across renders without
// a backend. Featured items float up; otherwise newest-ish first.
function trendingWeight(r) {
  return (r.featured ? 1000 : 0) + new Date(r.added).getTime() / 1e10
}

function GridSkeleton({ count = 8 }) {
  return (
    <div className="ch-grid dsc-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="dsc-card dsc-card-sk">
          <div className="sk dsc-face-sk" />
          <div className="dsc-card-body">
            <div className="sk sk-line w-40" />
            <div className="sk sk-line w-80 dsc-sk-gap" />
            <div className="sk sk-line w-60 dsc-sk-gap" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Discover({ toast, forcedType = null }) {
  const focused = !!forcedType

  // ─── Persistent state ─────────────────────────────────────────────────────
  const [saves, setSaves] = useState(() => loadSet(SAVES_KEY))
  const [broken, setBroken] = useState(() => loadSet(BROKEN_KEY))

  // ─── View state ───────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(forcedType || 'all')
  const [sort, setSort] = useState('trending')
  const [phase, setPhase] = useState('loading') // loading | ready | error
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [modal, setModal] = useState(null) // { kind:'resource'|'collection', item }

  const gridRef = useRef(null)

  // ─── Load (simulated, local-only) — gives us a real loading + error path ───
  // `phase` starts at 'loading' (initial state), so the effect only ever calls
  // setState asynchronously inside the timeout — never synchronously in the body.
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      if (!alive) return
      // Defensive: if the seed somehow failed to bundle, fail loudly not silently.
      if (!Array.isArray(DISCOVER_RESOURCES) || DISCOVER_RESOURCES.length === 0) setPhase('error')
      else setPhase('ready')
    }, 220)
    return () => { alive = false; clearTimeout(t) }
  }, [])

  // ─── Debounced search (~150ms) ────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim().toLowerCase()), 150)
    return () => clearTimeout(t)
  }, [rawQuery])

  // ─── Offline awareness ────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ─── Persist saves / broken flags (quota-safe) ────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify([...saves])) } catch { /* quota / disabled */ }
  }, [saves])
  useEffect(() => {
    try { localStorage.setItem(BROKEN_KEY, JSON.stringify([...broken])) } catch { /* quota / disabled */ }
  }, [broken])

  // ─── Counts per category (drives Browse tiles + chip labels) ──────────────
  const counts = useMemo(() => {
    const out = {}
    for (const r of DISCOVER_RESOURCES) out[r.category] = (out[r.category] || 0) + 1
    return out
  }, [])

  // ─── Featured (rail) — only in the full surface, max 4 ────────────────────
  const featured = useMemo(
    () => (focused ? [] : DISCOVER_RESOURCES.filter(r => r.featured).slice(0, 4)),
    [focused],
  )

  // ─── The visible grid list ────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = DISCOVER_RESOURCES
    if (forcedType) list = list.filter(r => r.category === forcedType)
    else if (filter !== 'all') list = list.filter(r => r.category === filter)

    if (sort === 'saved') list = list.filter(r => saves.has(r.id))

    if (query) {
      list = list.filter(r => {
        const hay = `${r.title} ${r.host} ${r.shortDescription} ${(r.tags || []).join(' ')} ${r.useCase || ''} ${categoryLabel(r.category)}`.toLowerCase()
        return hay.includes(query)
      })
    }

    list = [...list]
    if (sort === 'recent') list.sort((a, b) => new Date(b.added) - new Date(a.added))
    else if (sort === 'saved') list.sort((a, b) => new Date(b.added) - new Date(a.added))
    else list.sort((a, b) => trendingWeight(b) - trendingWeight(a))
    return list
  }, [forcedType, filter, sort, query, saves])

  // ─── Actions ──────────────────────────────────────────────────────────────
  const toggleSave = useCallback((id) => {
    setSaves(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const reportBroken = useCallback((id) => {
    setBroken(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
    if (toast) toast('Thanks — flagged for review')
  }, [toast])

  const clearFilters = useCallback(() => {
    setRawQuery('')
    setQuery('')
    setFilter(forcedType || 'all')
    setSort('trending')
  }, [forcedType])

  const pickCategory = useCallback((key) => {
    setFilter(key)
    setSort('trending')
    // Scroll the grid into view after the state settles.
    requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const onSubmit = useCallback(() => {
    if (toast) toast('Resource submissions open soon')
  }, [toast])

  const openResource = useCallback((r) => setModal({ kind: 'resource', item: r }), [])
  const openCollection = useCallback((coll) => {
    setModal({ kind: 'collection', item: { ...coll, _members: resolveCollection(coll) } })
  }, [])
  // Stable close handler — a fresh closure each render would tear down + re-run
  // the modal's focus effect (deps on onClose) on ANY parent re-render and yank
  // focus back to the first element. useCallback keeps the identity stable.
  const closeModal = useCallback(() => setModal(null), [])

  // ─── Empty-state variant resolution (never a dead end) ────────────────────
  const emptyVariant = useMemo(() => {
    if (visible.length) return null
    if (sort === 'saved') return 'no-saved'
    if (!query && filter !== 'all' && (counts[filter] || 0) === 0) return 'empty-cat'
    return 'no-results'
  }, [visible.length, sort, query, filter, counts])

  const headingId = 'dsc-grid-heading'

  // ─── Sub-renders ──────────────────────────────────────────────────────────
  const Toolbar = (
    <div className="dsc-toolbar">
      <div className="pl-search-wrap dsc-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="pl-search"
          type="search"
          value={rawQuery}
          onChange={e => setRawQuery(e.target.value)}
          placeholder="Search resources, tools, tags…"
          aria-label="Search resources"
        />
        {rawQuery && (
          <button className="pl-search-clear" onClick={() => setRawQuery('')} aria-label="Clear search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      {!focused && (
        <div className="pl-chips dsc-chips-row" role="group" aria-label="Filter by type">
          <button
            className={`pl-chip${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            All
          </button>
          {FILTER_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`pl-chip dsc-chip-cat${filter === cat.key ? ' active' : ''}`}
              data-cat={cat.key}
              onClick={() => setFilter(cat.key)}
              aria-pressed={filter === cat.key}
            >
              <span className="dsc-chip-dot" data-cat={cat.key} aria-hidden="true" />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="ch-sort dsc-sort" role="group" aria-label="Sort resources">
        {SORTS.map(s => (
          <button
            key={s.key}
            className={`ch-sort-btn${sort === s.key ? ' is-active' : ''}`}
            onClick={() => setSort(s.key)}
            aria-pressed={sort === s.key}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="sec dsc-wrap">
      {/* Header */}
      <header className="sec-h dsc-head">
        <span className="sec-h-eyebrow">Discover</span>
        <h1>{focused ? 'Gradient library.' : 'Discover what designers are using.'}</h1>
        <p>
          {focused
            ? 'A curated set of the best gradient resources on the web — preview, then bring one straight into the Gradient Generator.'
            : 'A curated, growing directory of the best external design resources — and a one-tap hand-off into the tools that use them.'}
        </p>
        <button className="btn btn-accent dsc-submit" onClick={onSubmit}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Submit a resource
        </button>
      </header>

      {/* Offline banner — saved + seed still render; external links disabled. */}
      {offline && (
        <div className="dsc-offline" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
          You're offline. Saved resources still show, but external links are paused until you reconnect.
        </div>
      )}

      {/* Sticky toolbar */}
      {Toolbar}

      {phase === 'error' ? (
        <div className="pl-empty dsc-empty" role="alert">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>Couldn't load Discover.</p>
          <button className="btn btn-accent" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : phase === 'loading' ? (
        <GridSkeleton />
      ) : (
        <>
          {/* Featured rail (full surface only) */}
          {!focused && <FeaturedRail resources={featured} onOpen={openResource} offline={offline} />}

          {/* Browse by type (full surface only) */}
          {!focused && <BrowseTiles counts={counts} activeFilter={filter} onPick={pickCategory} />}

          {/* Grid band */}
          <section className="dsc-grid-band" ref={gridRef} aria-labelledby={headingId}>
            <div className="section-h">
              <h2 id={headingId}>
                {focused
                  ? 'All gradient resources'
                  : filter === 'all' ? 'All resources' : categoryLabel(filter)}
              </h2>
              <span className="meta" aria-live="polite">
                {visible.length} {visible.length === 1 ? 'resource' : 'resources'}
              </span>
            </div>

            {emptyVariant ? (
              <DiscoverEmpty
                variant={emptyVariant}
                categoryLabel={categoryLabel(filter)}
                focused={focused}
                hasQuery={!!query}
                onClear={clearFilters}
                onBrowseAll={() => { setSort('trending'); setFilter(forcedType || 'all') }}
                onPickCategory={pickCategory}
                onSubmit={onSubmit}
              />
            ) : (
              <div className="ch-grid dsc-grid">
                {visible.map(r => (
                  <DiscoverCard
                    key={r.id}
                    resource={r}
                    saved={saves.has(r.id)}
                    broken={broken.has(r.id)}
                    offline={offline}
                    onToggleSave={toggleSave}
                    onReport={reportBroken}
                    onOpen={openResource}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Collections (full surface only) */}
          {!focused && <CollectionsBand onOpen={openCollection} />}
        </>
      )}

      {modal && (
        <DiscoverModal
          item={modal.item}
          kind={modal.kind}
          offline={offline}
          onClose={closeModal}
          onOpenResource={openResource}
        />
      )}
    </div>
  )
}
