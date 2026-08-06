import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'

const FILTERS = [
  { id: 'all', label: 'All palettes' },
  { id: 'curated', label: 'Curated' },
  { id: 'brand', label: 'Brand' },
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

// Profiles are pure functions of static data, so compute them once at module
// scope rather than on every keystroke — the library is ~100 palettes and the
// search input filters on every character.
const PROFILES = new Map(LIBRARY_PALETTES.map((palette) => [palette.id, paletteProfile(palette)]))
const HAYSTACKS = new Map(LIBRARY_PALETTES.map((palette) => [
  palette.id,
  `${palette.name} ${palette.kind === 'brand' ? 'brand system' : 'curated'} ${palette.colors.join(' ')}`.toLowerCase(),
]))

export default function PaletteGallery({ toast }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LIBRARY_PALETTES.filter((palette) => {
      const profile = PROFILES.get(palette.id)
      if (filter === 'brand' && palette.kind !== 'brand') return false
      if (filter === 'curated' && palette.kind !== 'curated') return false
      if (filter === 'dark' && profile.lightness >= 0.48) return false
      if (filter === 'light' && profile.lightness < 0.62) return false
      if (filter === 'vivid' && profile.vividness < 145) return false
      if (q && !HAYSTACKS.get(palette.id).includes(q)) return false
      return true
    })
  }, [filter, query])

  const brandCount = useMemo(() => visible.filter((p) => p.kind === 'brand').length, [visible])

  const clear = () => {
    setQuery('')
    setFilter('all')
  }

  return (
    <div className="sec pgl-page">
      <DiscoverGalleryHero
        eyebrow="Discover / Colour"
        title="Palette Library"
        description="Colour systems with a point of view — ours, plus the published brand palettes behind the interfaces you already know. Copy a swatch, save a favourite, or open the complete palette in the builder and make it yours."
        mark={{ label: '#4338E0', value: LIBRARY_PALETTES.length, caption: 'palettes' }}
      />

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

      <DiscoverResultHead
        eyebrow={filter === 'brand' ? 'Brand systems' : 'Curated collection'}
        title={filter === 'brand' ? 'Identities you already know' : 'Colours worth building with'}
        count={visible.length}
        noun="palette"
        id="pgl-grid-heading"
      />

      {visible.length ? (
        <section aria-labelledby="pgl-grid-heading">
          {brandCount > 0 && filter !== 'brand' && (
            <p className="pgl-note">
              {brandCount} of these {brandCount === 1 ? 'is a' : 'are'} published brand
              {brandCount === 1 ? ' system' : ' systems'}, badged <strong>Brand</strong> on the card.
            </p>
          )}
          <PaletteGalleryGrid toast={toast} palettes={visible} />
        </section>
      ) : (
        <div className="pgl-empty" role="status">
          <strong>No palettes match that combination.</strong>
          <span>Try a broader search, or reset the mood and collection filters.</span>
          <button type="button" onClick={clear}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
