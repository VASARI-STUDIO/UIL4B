import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { GALLERY_PALETTES, paletteBuilderUrl } from '../../data/paletteGallery'

// Colorhunt-style palette gallery — shared by the Discover palettes view and
// the Palette Builder's colour-gallery popup. Everything is local + static
// (src/data/paletteGallery.js): stripes are plain CSS backgrounds, likes live
// in localStorage, and "use" either navigates to the Palette Builder with a
// ?c= hand-off or (when `onPick` is provided, e.g. inside the builder popup)
// applies the colours directly via the callback.

const LIKES_KEY = 'vs-palette-likes'

function loadLikes() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')) } catch { return new Set() }
}

function HeartGlyph({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function EyeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

// `selectedId` (optional) marks a card as the currently-imported palette: it gets
// a tick badge and its action flips to "Selected", so clicking it again toggles
// the import off (the builder reverts to the pre-import system).
export default function PaletteGalleryGrid({ toast, onPick, onCompare, selectedId = null, palettes = GALLERY_PALETTES }) {
  const [likes, setLikes] = useState(loadLikes)

  const toggleLike = useCallback((id) => {
    setLikes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(LIKES_KEY, JSON.stringify([...next])) } catch { /* quota / disabled */ }
      return next
    })
  }, [])

  const copyHex = useCallback((hex) => {
    navigator.clipboard.writeText(hex).then(() => {
      if (toast) toast(`Copied ${hex}`)
    }).catch(() => {
      if (toast) toast('Failed to copy')
    })
  }, [toast])

  return (
    <div className="pgal-grid">
      {palettes.map(p => {
        const selected = selectedId != null && p.id === selectedId
        return (
        <article key={p.id} className={`pgal-card${selected ? ' is-selected' : ''}`}>
          {selected && (
            <span className="pgal-tick" aria-hidden="true"><CheckGlyph /></span>
          )}
          {/* The stripes. On Discover (no onPick) each stripe copies its hex.
              Inside the builder popup (onPick) the whole swatch is the select
              surface: clicking any stripe enables the palette (or, when it's
              already selected, toggles it back off) — no per-hex copy. */}
          <div className="pgal-stripes" role="group" aria-label={`${p.name} palette`}>
            {p.colors.map(hex => (
              <button
                key={hex}
                type="button"
                className="pgal-stripe"
                style={{ background: hex }}
                onClick={() => onPick ? onPick(p.colors, p.name, p.id) : copyHex(hex)}
                title={onPick ? (selected ? `Deselect ${p.name}` : `Use ${p.name}`) : `Copy ${hex}`}
                aria-label={onPick
                  ? (selected ? `Deselect ${p.name} and restore your previous palette` : `Use ${p.name} in the Palette Builder`)
                  : `Copy ${hex}`}
              >
                {!onPick && <span className="pgal-hex">{hex.replace('#', '')}</span>}
              </button>
            ))}
          </div>

          <div className="pgal-foot">
            <button
              type="button"
              className={`pgal-like${likes.has(p.id) ? ' is-liked' : ''}`}
              onClick={() => toggleLike(p.id)}
              aria-pressed={likes.has(p.id)}
              aria-label={likes.has(p.id) ? `Unlike ${p.name}` : `Like ${p.name}`}
              title={likes.has(p.id) ? 'Liked' : 'Like'}
            >
              <HeartGlyph filled={likes.has(p.id)} />
            </button>
            <span className="pgal-name">{p.name}</span>
            {onCompare && (
              <button
                type="button"
                className="pgal-cmp"
                onClick={() => onCompare(p.colors, p.name)}
                aria-label={`Compare ${p.name} with the current palette`}
                title="Compare with the current palette"
              >
                <EyeGlyph />
              </button>
            )}
            {onPick ? (
              <button
                type="button"
                className={`pgal-use${selected ? ' is-selected' : ''}`}
                onClick={() => onPick(p.colors, p.name, p.id)}
                aria-pressed={selected}
                aria-label={selected ? `Deselect ${p.name} and restore your previous palette` : `Use ${p.name} in the Palette Builder`}
              >
                {selected ? (
                  <><CheckGlyph /> Selected</>
                ) : (
                  <>Use <span aria-hidden="true">→</span></>
                )}
              </button>
            ) : (
              <Link
                className="pgal-use"
                to={paletteBuilderUrl(p.colors)}
                aria-label={`Open ${p.name} in the Palette Builder`}
              >
                Open <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </article>
        )
      })}
    </div>
  )
}
