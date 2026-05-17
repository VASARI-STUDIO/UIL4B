import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { fetchFonts, loadFont, getFontCSSRule } from '../utils/googleFonts'

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

const FEATURED_NAMES = [
  'Inter', 'Playfair Display', 'Space Grotesk', 'DM Serif Display',
  'Outfit', 'Fraunces', 'Sora', 'Crimson Pro',
  'Manrope', 'Bricolage Grotesque', 'Cormorant Garamond', 'JetBrains Mono',
]

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
const HERO_PHRASE = 'Typography is the voice of design'

const SIZES = [
  { label: 'Display', px: 64 },
  { label: 'H1', px: 48 },
  { label: 'H2', px: 36 },
  { label: 'H3', px: 28 },
  { label: 'Body', px: 16 },
  { label: 'Small', px: 13 },
]

function GalleryCard({ font, onSelect, index }) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadFont(font.family, font.variants.slice(0, 4))
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
      className={`fg-card${isWide ? ' fg-card-wide' : ''}`}
      onClick={() => onSelect(font)}
    >
      <div className="fg-card-preview" style={{ fontFamily: loaded ? css(font) : 'var(--font)' }}>
        <span className="fg-card-sample" style={{ fontWeight: hw(font) }}>
          Aa
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

function FontDetail({ font, onClose, onCopy }) {
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

        <div className="fg-detail-actions">
          <button className="btn btn-accent" onClick={() => {
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

export default function FontGallery({ onCopy }) {
  const [allFonts, setAllFonts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const PAGE_SIZE = 48
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
    return FEATURED_NAMES.map(n => allFonts.find(f => f.family === n)).filter(Boolean)
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
    if (selected) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selected])

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
              <div className="fg-feat-text" style={{ fontFamily: css(font), fontWeight: hw(font) }}>
                {i < 2 ? font.family : 'Aa'}
              </div>
              <div className="fg-feat-info">
                <span className="fg-feat-name">{font.family}</span>
                <span className="fg-feat-cat">{font.category}</span>
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
          />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      {/* Detail modal */}
      {selected && (
        <FontDetail
          font={selected}
          onClose={() => setSelected(null)}
          onCopy={onCopy}
        />
      )}
    </div>
  )
}
