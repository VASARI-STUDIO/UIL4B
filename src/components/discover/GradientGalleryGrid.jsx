import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import LibraryCard from '../library/LibraryCard'
import LibraryGrid from '../library/LibraryGrid'
import { GALLERY_GRADIENTS, gradientCss, gradientToolUrl } from '../../data/gradientGallery'

// The browse grid on /discover/gradients. Everything is local + static
// (src/data/gradientGallery.js): swatches are plain CSS backgrounds, likes live
// in localStorage, "CSS" copies the production background rule and "Open" hands
// the gradient to the Gradient Generator via the ?gs= URL scheme.
//
// Card anatomy comes from the shared Library language (components/library), so
// this grid and the Palette Library's now agree on where a badge, a like button
// and a card's actions live. `.grg-` classes remain for the deltas that are
// genuinely specific to a gradient — chiefly the 3:4 swatch, which is a
// gradient's most useful shape and a palette's least.

const LIKES_KEY = 'vs-gradient-likes'

function loadLikes() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')) } catch { return new Set() }
}

function HeartGlyph({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function GradientGalleryGrid({ toast, gradients = GALLERY_GRADIENTS }) {
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

  const copyCss = useCallback((g) => {
    const css = `background: ${gradientCss(g.type, g.angle, g.stops)};`
    navigator.clipboard.writeText(css).then(() => {
      if (toast) toast(`Copied ${g.name} CSS`)
    }).catch(() => {
      if (toast) toast('Failed to copy')
    })
  }, [toast])

  return (
    <LibraryGrid className="grg-grid" min={280}>
      {gradients.map(g => (
        <LibraryCard
          key={g.id}
          className="grg-card"
          // The type used to appear only on hover. It is a filterable property,
          // so hiding it at rest meant the one place you could confirm what the
          // "Radial" filter had actually selected was under the pointer.
          badge={g.type === 'Linear' ? `${g.angle}°` : g.type}
          media={(
            <Link
              className="grg-swatch"
              to={gradientToolUrl(g)}
              style={{ background: gradientCss(g.type, g.angle, g.stops) }}
              aria-label={`Open ${g.name} in the Gradient Generator`}
            />
          )}
          float={(
            <button
              type="button"
              className={`grg-like${likes.has(g.id) ? ' is-liked' : ''}`}
              onClick={() => toggleLike(g.id)}
              aria-pressed={likes.has(g.id)}
              aria-label={likes.has(g.id) ? `Unlike ${g.name}` : `Like ${g.name}`}
              title={likes.has(g.id) ? 'Liked' : 'Like'}
            >
              <HeartGlyph filled={likes.has(g.id)} />
            </button>
          )}
          name={g.name}
          meta={`${g.type} · ${g.stops.length} stops`}
          tail={(
            <>
              <button
                type="button"
                className="grg-copy"
                onClick={() => copyCss(g)}
                aria-label={`Copy ${g.name} CSS`}
                title="Copy CSS"
              >
                Copy CSS
              </button>
              <Link
                className="grg-open"
                to={gradientToolUrl(g)}
                aria-label={`Open ${g.name} in the Gradient Generator`}
              >
                Open <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        />
      ))}
    </LibraryGrid>
  )
}
