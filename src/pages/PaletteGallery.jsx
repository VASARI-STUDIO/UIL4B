import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import { GALLERY_PALETTES } from '../data/paletteGallery'

const FILTERS = [
  { id: 'all', label: 'All palettes' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'vivid', label: 'Vivid' },
]

function channel(hex, offset) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

function paletteProfile(palette) {
  const values = palette.colors.map((hex) => {
    const r = channel(hex, 1)
    const g = channel(hex, 3)
    const b = channel(hex, 5)
    return {
      lightness: (Math.max(r, g, b) + Math.min(r, g, b)) / 510,
      spread: Math.max(r, g, b) - Math.min(r, g, b),
    }
  })
  return {
    lightness: values.reduce((sum, value) => sum + value.lightness, 0) / values.length,
    vividness: Math.max(...values.map((value) => value.spread)),
  }
}

export default function PaletteGallery({ toast }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GALLERY_PALETTES.filter((palette) => {
      const profile = paletteProfile(palette)
      if (filter === 'dark' && profile.lightness >= 0.48) return false
      if (filter === 'light' && profile.lightness < 0.62) return false
      if (filter === 'vivid' && profile.vividness < 145) return false
      if (q && !`${palette.name} ${palette.colors.join(' ')}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [filter, query])

  const clear = () => {
    setQuery('')
    setFilter('all')
  }

  return (
    <div className="sec pgl-page">
      <header className="pgl-hero">
        <div>
          <span className="pgl-eyebrow">Discover / Colour</span>
          <h1>Palette Library</h1>
          <p>Colour systems with a point of view. Copy a swatch, save a favourite, or open the complete palette in the builder and make it yours.</p>
        </div>
        <div className="pgl-hero-mark" aria-hidden="true">
          <span>#4338E0</span>
          <strong>{GALLERY_PALETTES.length}</strong>
          <small>curated palettes</small>
        </div>
      </header>

      <div className="pgl-toolbar">
        <label className="pgl-search">
          <span className="sr-only">Search palettes</span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or hex…" />
        </label>
        <div className="pgl-filters" role="group" aria-label="Filter palettes">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <Link className="pgl-build-link" to="/color/palette">Create a palette <span aria-hidden="true">↗</span></Link>
      </div>

      <div className="pgl-result-head">
        <div>
          <span>Curated collection</span>
          <h2>Colours worth building with</h2>
        </div>
        <p aria-live="polite">{visible.length} palette{visible.length === 1 ? '' : 's'}</p>
      </div>

      {visible.length ? (
        <PaletteGalleryGrid toast={toast} palettes={visible} />
      ) : (
        <div className="pgl-empty" role="status">
          <strong>No palettes match that combination.</strong>
          <span>Try a broader search or reset the mood filter.</span>
          <button type="button" onClick={clear}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
