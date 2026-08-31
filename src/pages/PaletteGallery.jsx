import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'

// `dot` on the two lightness filters only. Curated/Brand describe provenance
// and Vivid describes saturation — none of the three has a colour to show, and
// inventing one would suggest the filter selects by hue.
const FILTERS = [
  { id: 'all', label: 'All palettes' },
  { id: 'curated', label: 'Curated' },
  { id: 'brand', label: 'Brand' },
  { id: 'dark', label: 'Dark', dot: 'dark' },
  { id: 'light', label: 'Light', dot: 'light' },
  { id: 'vivid', label: 'Vivid' },
]

// ── Categories, in browse order ─────────────────────────────────────────────
//
// Founder request (2026-08-08): "trending/popular first, then brand palettes,
// then community". Two of those three do not exist yet, and neither is faked:
//
//   TRENDING is blocked on real usage data. There is no ranking signal in the
//   product — see the `upgrade-activation-events` queue item — and sorting by
//   anything else while calling it trending would be an invention dressed as a
//   measurement. The curated collection therefore leads in its catalogue order
//   and is not labelled trending.
//
//   COMMUNITY has no source. Community publishing is the `community-backend`
//   item and is not built. An empty "Community" heading would be a promise the
//   product cannot keep, so there isn't one.
//
// What ships is the ordering and the sectioning, over the two categories that
// hold real palettes today. Adding trending later is one entry in this array.
const SECTIONS = [
  {
    id: 'curated',
    label: 'Curated collection',
    blurb: 'Colour systems with a point of view, built here.',
    match: (palette) => palette.kind === 'curated',
  },
  {
    id: 'brand',
    label: 'Brand systems',
    blurb: 'Published identity colours from interfaces you already know.',
    match: (palette) => palette.kind === 'brand',
  },
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

  // Sections are for BROWSING. The moment a search or a category filter is
  // applied the user has already said which subset they want, and splitting
  // that answer back into headed groups — often one of them empty — buries it.
  // So a narrowed view is one flat grid, exactly as before.
  const browsing = filter === 'all' && !query.trim()
  const grouped = useMemo(() => (
    browsing
      ? SECTIONS.map((section) => ({ ...section, palettes: visible.filter(section.match) }))
        .filter((section) => section.palettes.length > 0)
      : []
  ), [browsing, visible])

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

      <LibraryToolbar
        className="pgl-toolbar"
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search by name or hex…',
          label: 'Search palettes',
        }}
        action={<Link className="pgl-build-link" to="/create/palette">Create a palette <span aria-hidden="true">↗</span></Link>}
      >
        <LibraryFilterGroup label="Filter palettes" value={filter} onChange={setFilter} options={FILTERS} />
      </LibraryToolbar>

      <DiscoverResultHead
        eyebrow={filter === 'brand' ? 'Brand systems' : 'Curated collection'}
        title={filter === 'brand' ? 'Identities you already know' : 'Colours worth building with'}
        count={visible.length}
        noun="palette"
        id="pgl-grid-heading"
      />

      {visible.length ? (
        <section aria-labelledby="pgl-grid-heading">
          {browsing ? (
            grouped.map((section) => (
              <div className="pgl-section" key={section.id}>
                {/* Sticky, so the category you are inside stays legible while
                    you scroll a hundred cards — which is the whole point of
                    sectioning a list this long rather than filtering it. */}
                <div className="pgl-section-head">
                  <h3 id={`pgl-section-${section.id}`}>{section.label}</h3>
                  <span className="pgl-section-count">{section.palettes.length}</span>
                  <p className="pgl-section-blurb">{section.blurb}</p>
                </div>
                <PaletteGalleryGrid
                  toast={toast}
                  palettes={section.palettes}
                  labelledBy={`pgl-section-${section.id}`}
                />
              </div>
            ))
          ) : (
            <>
              {brandCount > 0 && filter !== 'brand' && (
                <p className="pgl-note">
                  {brandCount} of these {brandCount === 1 ? 'is a' : 'are'} published brand
                  {brandCount === 1 ? ' system' : ' systems'}, badged <strong>Brand</strong> on the card.
                </p>
              )}
              <PaletteGalleryGrid toast={toast} palettes={visible} />
            </>
          )}
        </section>
      ) : (
        <LibraryEmpty
          className="pgl-empty"
          title="No palettes match that combination."
          detail="Try a broader search, or reset the mood and collection filters."
          onClear={clear}
        />
      )}
    </div>
  )
}
