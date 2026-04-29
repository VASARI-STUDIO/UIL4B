import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const ICON_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'nav', label: 'Navigation' },
  { id: 'action', label: 'Actions' },
  { id: 'ui', label: 'Interface' },
  { id: 'media', label: 'Media' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'comms', label: 'Communication' },
  { id: 'dev', label: 'Development' },
  { id: 'content', label: 'Content' },
  { id: 'status', label: 'Status' },
  { id: 'social', label: 'Social' },
  { id: 'location', label: 'Location' },
  { id: 'time', label: 'Time' },
]

const API_BASE = 'https://api.iconify.design'

function localIcons() {
  return Array.isArray(window.icons) ? window.icons : []
}

function svgFromPath(d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
}

export default function IconLibrary({ onCopy }) {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [apiResults, setApiResults] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const searchTimer = useRef(null)

  const filtered = useMemo(() => {
    const all = localIcons()
    let list = activeType === 'all' ? all : all.filter(i => i.c === activeType)
    if (query.length >= 2 && !apiResults) {
      const q = query.toLowerCase()
      list = list.filter(i => i.n.includes(q))
    }
    return list
  }, [activeType, query, apiResults])

  const searchApi = useCallback(async (q) => {
    if (q.length < 2) { setApiResults(null); return }
    setApiLoading(true)
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(q)}&limit=80`, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const icons = (data.icons || []).map(name => {
        const [prefix, ...rest] = name.split(':')
        return { fullName: name, prefix, name: rest.join(':') || name }
      })
      setApiResults(icons)
    } catch {
      setApiResults(null)
    } finally {
      setApiLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (query.length >= 2) {
      searchTimer.current = setTimeout(() => searchApi(query), 350)
    } else {
      setApiResults(null)
    }
    return () => clearTimeout(searchTimer.current)
  }, [query, searchApi])

  const copyIcon = async (icon, type) => {
    let text = ''
    if (type === 'local') {
      text = svgFromPath(icon.d)
    } else {
      try {
        const res = await fetch(`${API_BASE}/${icon.fullName}.svg?height=24`)
        text = await res.text()
      } catch {
        text = icon.fullName
      }
    }
    if (onCopy) onCopy(text)
    setCopied(type === 'local' ? icon.n : icon.fullName)
    setTimeout(() => setCopied(null), 1500)
  }

  const typeCounts = useMemo(() => {
    const all = localIcons()
    const counts = { all: all.length }
    for (const icon of all) {
      counts[icon.c] = (counts[icon.c] || 0) + 1
    }
    return counts
  }, [])

  const showApi = apiResults && query.length >= 2
  const displayIcons = showApi ? apiResults : filtered

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Icon Library</h1>
        <p>Search thousands of icons by type. Click any icon to copy its SVG.</p>
      </div>

      {/* Search + controls */}
      <div className="icon-toolbar">
        <div className="icon-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="icon-search"
            placeholder="Search icons (e.g. arrow, heart, settings)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="icon-search-clear" onClick={() => setQuery('')} aria-label="Clear">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="icon-view-toggle">
          <button
            className={`icon-view-btn${viewMode === 'grid' ? ' active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            className={`icon-view-btn${viewMode === 'list' ? ' active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Type filters */}
      <div className="icon-types">
        {ICON_TYPES.map(t => (
          <button
            key={t.id}
            className={`icon-type-btn${activeType === t.id ? ' active' : ''}`}
            onClick={() => { setActiveType(t.id); setQuery(''); setApiResults(null) }}
          >
            {t.label}
            {typeCounts[t.id] != null && (
              <span className="icon-type-count">{typeCounts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div className="icon-status">
        <span>
          {apiLoading ? 'Searching...' : showApi
            ? `${apiResults.length} results from Iconify`
            : `${displayIcons.length} icons`}
        </span>
        {showApi && (
          <span className="icon-status-badge">API</span>
        )}
        {!showApi && query.length < 2 && (
          <span className="icon-status-hint">Type 2+ characters to search online</span>
        )}
      </div>

      {/* Icon grid */}
      {displayIcons.length === 0 && !apiLoading ? (
        <div className="icon-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No icons found for &ldquo;{query}&rdquo;</p>
          <span>Try a different search term</span>
        </div>
      ) : showApi ? (
        <div className={viewMode === 'grid' ? 'icon-grid' : 'icon-list'}>
          {apiResults.map(icon => (
            <button
              key={icon.fullName}
              className={`icon-cell${copied === icon.fullName ? ' copied' : ''}`}
              onClick={() => copyIcon(icon, 'api')}
              title={`${icon.fullName} — click to copy SVG`}
            >
              <img
                src={`${API_BASE}/${icon.fullName}.svg?height=24&color=%23${document.documentElement.getAttribute('data-theme') === 'dark' ? 'f0f0f5' : '111113'}`}
                alt={icon.name}
                width="24"
                height="24"
                loading="lazy"
                className="icon-cell-img"
              />
              <span className="icon-cell-name">{icon.name}</span>
              {viewMode === 'list' && <span className="icon-cell-set">{icon.prefix}</span>}
              {copied === icon.fullName && <span className="icon-copied-badge">Copied</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'icon-grid' : 'icon-list'}>
          {filtered.map(icon => (
            <button
              key={icon.n}
              className={`icon-cell${copied === icon.n ? ' copied' : ''}`}
              onClick={() => copyIcon(icon, 'local')}
              title={`${icon.n} — click to copy SVG`}
            >
              <svg
                width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d={icon.d} />
              </svg>
              <span className="icon-cell-name">{icon.n}</span>
              {viewMode === 'list' && <span className="icon-cell-set">{window.PACKS?.[icon.p] || icon.p}</span>}
              {copied === icon.n && <span className="icon-copied-badge">Copied</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
