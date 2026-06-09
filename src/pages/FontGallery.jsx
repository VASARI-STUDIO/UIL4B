import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { fetchFonts, loadFont, getFontCSSRule } from '../utils/googleFonts'
import { useProject } from '../contexts/ProjectContext'

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Script' },
  { id: 'monospace', label: 'Mono' },
]

const FALLBACK = { 'serif': 'serif', 'sans-serif': 'sans-serif', 'display': 'cursive', 'handwriting': 'cursive', 'monospace': 'monospace' }
const css = (f) => getFontCSSRule(f.family, FALLBACK[f.category] || 'sans-serif')
const hw = (f) => f.variants.includes(700) ? 700 : f.variants[f.variants.length - 1] || 400

const FEATURED = [
  { family: 'Playfair Display', phrase: 'Beauty in every serif', tag: 'Editorial' },
  { family: 'Space Grotesk', phrase: 'Clean, geometric, modern', tag: 'UI' },
  { family: 'DM Serif Display', phrase: 'Bold statements', tag: 'Display' },
  { family: 'Inter', phrase: 'The workhorse of the web', tag: 'Interface' },
  { family: 'Outfit', phrase: 'Friendly & versatile', tag: 'Modern' },
  { family: 'Fraunces', phrase: 'Soft serif character', tag: 'Variable' },
  { family: 'Sora', phrase: 'Geometric precision', tag: 'Sans Serif' },
  { family: 'Crimson Pro', phrase: 'Elegant body text', tag: 'Reading' },
  { family: 'Manrope', phrase: 'Open & approachable', tag: 'Geometric' },
  { family: 'Bricolage Grotesque', phrase: 'Expressive grotesk', tag: 'Display' },
  { family: 'Cormorant Garamond', phrase: 'Classical refinement', tag: 'Serif' },
  { family: 'JetBrains Mono', phrase: '0Oo 1Il {}();', tag: 'Code' },
]

const PANGRAM = 'The quick brown fox jumps over the lazy dog'

const SIZES = [
  { label: 'Display', px: 64 },
  { label: 'H1', px: 48 },
  { label: 'H2', px: 36 },
  { label: 'H3', px: 28 },
  { label: 'Body', px: 16 },
  { label: 'Small', px: 13 },
]

function GalleryCard({ font, onSelect, index, inCompare, onToggleCompare }) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Load the two weights the card actually renders (regular + heading)
        // so the preview never falls back to a synthesised face.
        const reg = font.variants.includes(400) ? 400 : font.variants[0]
        loadFont(font.family, [reg, hw(font)])
        setLoaded(true)
        obs.disconnect()
      }
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [font])

  const isWide = index % 7 === 0

  return (
    <div
      ref={ref}
      className={`fg-card${isWide ? ' fg-card-wide' : ''}${inCompare ? ' fg-card-comparing' : ''}`}
      onClick={() => onSelect(font)}
    >
      <button
        type="button"
        className={`fg-card-compare${inCompare ? ' active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleCompare(font) }}
        title={inCompare ? 'Remove from comparison' : 'Add to comparison'}
        aria-pressed={inCompare}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {inCompare
            ? <polyline points="20 6 9 17 4 12" />
            : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
        </svg>
      </button>
      <div className="fg-card-preview" style={{ fontFamily: loaded ? css(font) : 'var(--font)' }}>
        <span className="fg-card-sample" style={{ fontWeight: hw(font) }}>
          {font.family.length <= 18 ? font.family : 'Aa'}
        </span>
        <span className="fg-card-pangram" style={{ fontWeight: font.variants.includes(400) ? 400 : font.variants[0] }}>
          {PANGRAM}
        </span>
      </div>
      <div className="fg-card-meta">
        <span className="fg-card-name">{font.family}</span>
        <span className="fg-card-info">{font.category} · {font.variants.length}w</span>
      </div>
    </div>
  )
}

function CompareView({ fonts, onClose, onRemove, onSelect, onCopy }) {
  const [text, setText] = useState(PANGRAM)
  const [size, setSize] = useState(40)
  const [weightMode, setWeightMode] = useState('heading') // 'heading' | 'regular'

  useEffect(() => {
    fonts.forEach(f => loadFont(f.family, f.variants))
  }, [fonts])

  const weightFor = (f) => weightMode === 'regular'
    ? (f.variants.includes(400) ? 400 : f.variants[0])
    : hw(f)

  return (
    <div className="fg-detail-overlay" onClick={onClose}>
      <div className="fg-compare" onClick={e => e.stopPropagation()}>
        <div className="fg-compare-head">
          <div>
            <div className="fg-detail-label">Compare</div>
            <h2 className="fg-compare-title">{fonts.length} typefaces, side by side</h2>
          </div>
          <button className="fg-detail-close fg-compare-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="fg-compare-controls">
          <input
            className="fg-compare-input"
            type="text"
            value={text}
            placeholder="Type to preview…"
            onChange={e => setText(e.target.value)}
          />
          <div className="fg-compare-control">
            <span>{size}px</span>
            <input type="range" min="12" max="96" value={size} onChange={e => setSize(+e.target.value)} />
          </div>
          <div className="fg-compare-toggle">
            <button className={weightMode === 'heading' ? 'active' : ''} onClick={() => setWeightMode('heading')}>Bold</button>
            <button className={weightMode === 'regular' ? 'active' : ''} onClick={() => setWeightMode('regular')}>Regular</button>
          </div>
        </div>

        <div className="fg-compare-cols" style={{ gridTemplateColumns: `repeat(${fonts.length}, minmax(220px, 1fr))` }}>
          {fonts.map(font => {
            const fam = css(font)
            return (
              <div key={font.family} className="fg-compare-col">
                <div className="fg-compare-col-head">
                  <button className="fg-compare-col-name" onClick={() => onSelect(font)} title="Open details">
                    {font.family}
                  </button>
                  <button className="fg-compare-col-remove" onClick={() => onRemove(font)} title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="fg-compare-meta">{font.category} · {font.variants.length} weight{font.variants.length !== 1 ? 's' : ''}</div>
                <div className="fg-compare-sample" style={{ fontFamily: fam, fontSize: size, fontWeight: weightFor(font) }}>
                  {text || PANGRAM}
                </div>
                <div className="fg-compare-charset" style={{ fontFamily: fam, fontWeight: weightFor(font) }}>
                  <div>AaBbCcDd</div>
                  <div>0123456789</div>
                </div>
                <button
                  className="fg-compare-copy"
                  onClick={() => {
                    const url = `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, '+')}:wght@${font.variants.join(';')}&display=swap`
                    if (onCopy) onCopy(url)
                  }}
                >
                  Copy import
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FontDetail({ font, onClose, onCopy, onCompare, onApply, inCompare }) {
  useEffect(() => {
    loadFont(font.family, font.variants)
  }, [font])

  const fam = css(font)
  return (
    <div className="fg-detail-overlay" onClick={onClose}>
      <div className="fg-detail" onClick={e => e.stopPropagation()}>
        <button className="fg-detail-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="fg-detail-hero" style={{ fontFamily: fam, fontWeight: hw(font) }}>
          {font.family}
        </div>

        <div className="fg-detail-tags">
          <span className="fg-tag">{font.category}</span>
          <span className="fg-tag">{font.variants.length} weight{font.variants.length !== 1 ? 's' : ''}</span>
          {font.subsets?.length > 0 && <span className="fg-tag">{font.subsets.length} subset{font.subsets.length !== 1 ? 's' : ''}</span>}
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Type Scale</div>
          {SIZES.map(s => (
            <div key={s.label} className="fg-scale-row">
              <span className="fg-scale-label">{s.label}<br /><span>{s.px}px</span></span>
              <span className="fg-scale-text" style={{ fontFamily: fam, fontSize: s.px, fontWeight: hw(font) }}>
                {PANGRAM}
              </span>
            </div>
          ))}
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">All Weights</div>
          <div className="fg-weights-grid">
            {font.variants.map(w => (
              <div key={w} className="fg-weight-card">
                <div className="fg-weight-sample" style={{ fontFamily: fam, fontWeight: w }}>Ag</div>
                <div className="fg-weight-num">{w}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Character Set</div>
          <div className="fg-charset" style={{ fontFamily: fam, fontWeight: hw(font) }}>
            <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
            <div>abcdefghijklmnopqrstuvwxyz</div>
            <div>0123456789 !@#$%^&*()+-=</div>
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Paragraph</div>
          <div className="fg-paragraph" style={{ fontFamily: fam }}>
            <p style={{ fontWeight: hw(font), fontSize: 28, lineHeight: 1.2, marginBottom: 16 }}>The fundamentals of great typography</p>
            <p style={{ fontWeight: font.variants.includes(400) ? 400 : font.variants[0], fontSize: 16, lineHeight: 1.75 }}>
              Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the space between pairs of letters. Good typography enhances readability and creates visual hierarchy.
            </p>
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Add to your kit</div>
          <div className="fg-detail-apply">
            <button className="btn" onClick={() => onApply?.(font, 'heading')}>Use for headings</button>
            <button className="btn" onClick={() => onApply?.(font, 'body')}>Use for body</button>
          </div>
        </div>

        <div className="fg-detail-actions">
          <button className="btn btn-accent" onClick={() => onCompare?.(font)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {inCompare
                ? <polyline points="20 6 9 17 4 12" />
                : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
            </svg>
            {inCompare ? 'Added to compare' : 'Compare'}
          </button>
          <button className="btn" onClick={() => {
            const url = `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, '+')}:wght@${font.variants.join(';')}&display=swap`
            if (onCopy) onCopy(url)
          }}>
            Copy Import URL
          </button>
          <a
            href={`https://fonts.google.com/specimen/${font.family.replace(/ /g, '+')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            View on Google Fonts
          </a>
        </div>
      </div>
    </div>
  )
}

export default function FontGallery({ onCopy, toast }) {
  const { setFonts } = useProject()
  const [allFonts, setAllFonts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const MAX_COMPARE = 2
  const PAGE_SIZE = 48

  const compareIds = useMemo(() => new Set(compare.map(f => f.family)), [compare])

  const toggleCompare = useCallback((font) => {
    setCompare(prev => {
      if (prev.some(f => f.family === font.family)) {
        return prev.filter(f => f.family !== font.family)
      }
      if (prev.length >= MAX_COMPARE) {
        toast?.(`You can compare ${MAX_COMPARE} fonts at a time — remove one first`)
        return prev
      }
      return [...prev, font]
    })
  }, [toast])

  // From the detail modal: add the font to the comparison and return to the gallery.
  const compareFromDetail = useCallback((font) => {
    const already = compare.some(f => f.family === font.family)
    if (!already && compare.length >= MAX_COMPARE) {
      toast?.(`You can compare ${MAX_COMPARE} fonts at a time — remove one first`)
      return
    }
    if (!already) setCompare(prev => [...prev, font])
    setSelected(null)
  }, [compare, toast])

  // Apply a gallery font straight into the active design (heading or body role).
  const applyFont = useCallback((font, role) => {
    const weight = role === 'heading' ? hw(font) : (font.variants.includes(400) ? 400 : font.variants[0])
    loadFont(font.family, font.variants)
    setFonts({ [role]: { family: font.family, weight, category: font.category } })
    toast?.(`${font.family} set as ${role} font`)
  }, [setFonts, toast])
  const observerRef = useRef(null)
  const sentinelRef = useRef(null)

  useEffect(() => {
    fetchFonts().then(fonts => {
      setAllFonts(fonts)
      setLoading(false)
    })
  }, [])

  const featured = useMemo(() => {
    if (!allFonts.length) return []
    return FEATURED.map(f => {
      const font = allFonts.find(af => af.family === f.family)
      return font ? { ...font, phrase: f.phrase, tag: f.tag } : null
    }).filter(Boolean)
  }, [allFonts])

  useEffect(() => {
    featured.forEach(f => loadFont(f.family, f.variants.slice(0, 3)))
  }, [featured])

  const filtered = useMemo(() => {
    let result = allFonts
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(f => f.family.toLowerCase().includes(q))
    }
    if (category !== 'all') {
      result = result.filter(f => f.category === category)
    }
    return result
  }, [allFonts, query, category])

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = paged.length < filtered.length

  useEffect(() => { setPage(1) }, [query, category])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasMore) setPage(p => p + 1)
    }, { rootMargin: '400px' })
    obs.observe(sentinelRef.current)
    observerRef.current = obs
    return () => obs.disconnect()
  }, [hasMore, paged.length])

  useEffect(() => {
    if (selected || showCompare) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selected, showCompare])

  if (loading) {
    return (
      <div className="sec">
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div className="fg-loader" />
          <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 16 }}>Loading fonts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="sec fg-page">
      {/* Hero */}
      <div className="fg-hero">
        <div className="fg-hero-eyebrow">Typography</div>
        <h1 className="fg-hero-title">Font Gallery</h1>
        <p className="fg-hero-sub">
          Explore {allFonts.length.toLocaleString()} typefaces from Google Fonts.
          Find the perfect font for your next project.
        </p>
      </div>

      {/* Featured */}
      <div className="fg-featured">
        <div className="fg-section-label">Featured Typefaces</div>
        <div className="fg-featured-grid">
          {featured.map((font, i) => (
            <div
              key={font.family}
              className={`fg-feat-card${i < 2 ? ' fg-feat-large' : ''}`}
              onClick={() => setSelected(font)}
            >
              <div className="fg-feat-tag">{font.tag}</div>
              <div className="fg-feat-text" style={{ fontFamily: css(font), fontWeight: hw(font) }}>
                {i < 2 ? font.phrase : font.family}
              </div>
              <div className="fg-feat-info">
                <span className="fg-feat-name">{font.family}</span>
                <span className="fg-feat-cat">{font.variants.length} weight{font.variants.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="fg-filters">
        <div className="fg-filter-cats">
          {CATS.map(c => (
            <button
              key={c.id}
              className={`fg-cat-pill${category === c.id ? ' active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="fg-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search fonts..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="fg-count">
        {filtered.length.toLocaleString()} font{filtered.length !== 1 ? 's' : ''}
        {category !== 'all' && ` in ${CATS.find(c => c.id === category)?.label}`}
      </div>

      {/* Gallery grid */}
      <div className="fg-grid">
        {paged.map((font, i) => (
          <GalleryCard
            key={font.family}
            font={font}
            index={i}
            onSelect={setSelected}
            inCompare={compareIds.has(font.family)}
            onToggleCompare={toggleCompare}
          />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      {/* Compare tray */}
      {compare.length > 0 && !showCompare && (
        <div className="fg-compare-tray">
          <div className="fg-compare-tray-chips">
            <span className="fg-compare-tray-label">Comparing</span>
            {compare.map(f => (
              <button key={f.family} className="fg-compare-chip" onClick={() => toggleCompare(f)} title="Remove">
                {f.family}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
          <div className="fg-compare-tray-actions">
            <button className="btn btn-s" onClick={() => setCompare([])}>Clear</button>
            <button className="btn btn-accent btn-s" onClick={() => setShowCompare(true)} disabled={compare.length < 2}>
              Compare {compare.length}
            </button>
          </div>
        </div>
      )}

      {/* Compare view */}
      {showCompare && compare.length > 0 && (
        <CompareView
          fonts={compare}
          onClose={() => setShowCompare(false)}
          onRemove={(f) => {
            const next = compare.filter(c => c.family !== f.family)
            setCompare(next)
            if (next.length < 2) setShowCompare(false)
          }}
          onSelect={(f) => { setShowCompare(false); setSelected(f) }}
          onCopy={onCopy}
        />
      )}

      {/* Detail modal */}
      {selected && (
        <FontDetail
          font={selected}
          onClose={() => setSelected(null)}
          onCopy={onCopy}
          onCompare={compareFromDetail}
          onApply={applyFont}
          inCompare={compareIds.has(selected.family)}
        />
      )}
    </div>
  )
}
