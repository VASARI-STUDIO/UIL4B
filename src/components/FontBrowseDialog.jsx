import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LibraryToolbar from './library/LibraryToolbar'
import LibraryFilterGroup from './library/LibraryFilterGroup'
import LibraryGrid from './library/LibraryGrid'
import LibraryCard from './library/LibraryCard'
import LibraryEmpty from './library/LibraryEmpty'
import useModalDialog from '../hooks/useModalDialog'
import { filterPickableTypefaces } from '../utils/fontGallery'
import { bodyWeight, fontStack, headingWeight, loadFont } from '../utils/googleFonts'

// Browse the catalogue and pick a family by LOOKING at it.
//
// What this replaces: a native <select> fed by a search box. The select was a
// defensible choice for keyboard and mobile support, but it has one fault it
// cannot be argued out of — a <select> renders every option in the UI font, so
// choosing a typeface meant recognising a NAME in a list. You could not see
// what you were choosing. That is the whole of the founder's report that
// selection "expects you to remember and type font names": it is not a
// discoverability problem, it is structural.
//
// So the specimen is the control. Each card renders its own family, at a size
// you can judge, and clicking the card is the selection. Search and the
// category filters narrow it; both come from the shared Library language, so
// this dialog browses the same way the Font Gallery and the colour libraries do.
//
// Everything the <select> earned for free is re-earned explicitly here: the
// dialog traps focus, closes on Escape, restores focus to the trigger
// (useModalDialog), and every card is a real button, so arrow-free tabbing,
// screen-reader names and touch targets all hold.

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Script' },
]

// The catalogue can be ~1,700 families. Rendering every card would mount
// thousands of nodes and ask the browser to load a face for each; the page
// grows on scroll instead, and search is the route to anything past the end.
const PAGE = 36

const SAMPLE = 'Handgloves'

function FontTile({ font, selected, onPick }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  // Load the face only once the tile is near the viewport, and reveal the
  // specimen only once it is genuinely painting — a tile showing the fallback
  // face is worse than a blank one here, because the whole point of the tile is
  // that you are judging the face.
  useEffect(() => {
    const el = ref.current
    let cancelled = false

    // Deliberately never synchronous: revealing on the same tick as the effect
    // would show the tile before the face can possibly have registered, which
    // is the fallback-pretending-to-be-the-family fault this guard exists for.
    const start = () => {
      loadFont(font.family, [headingWeight(font), bodyWeight(font)])
      Promise.resolve(document.fonts?.ready)
        .then(() => { if (!cancelled) setReady(true) })
        .catch(() => { if (!cancelled) setReady(true) })
    }

    if (!el || typeof IntersectionObserver === 'undefined') {
      start()
      return () => { cancelled = true }
    }

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      start()
    }, { rootMargin: '260px' })
    obs.observe(el)
    return () => { cancelled = true; obs.disconnect() }
  }, [font])

  return (
    <LibraryCard
      className="fbd-card"
      selected={selected}
      media={(
        <button
          type="button"
          className="fbd-tile"
          ref={ref}
          aria-pressed={selected}
          onClick={() => onPick(font)}
          aria-label={`Use ${font.family} — ${font.category}, ${font.variants.length} weights`}
        >
          <span
            className={ready ? 'fbd-sample' : 'fbd-sample fbd-sample--pending'}
            ref={(el) => {
              if (!el) return
              el.style.setProperty('--fbd-ff', fontStack(font))
              el.style.setProperty('--fbd-fw', String(headingWeight(font)))
            }}
            aria-hidden="true"
          >
            {SAMPLE}
          </span>
        </button>
      )}
      name={font.family}
      meta={`${font.category} · ${font.variants.length}w`}
    />
  )
}

export default function FontBrowseDialog({ title, fonts, value, onPick, onClose }) {
  const ref = useModalDialog(onClose)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)

  // Paging resets where the filter changes, not in an effect watching it: an
  // effect would render one frame of page N against the new, shorter result set.
  const changeQuery = useCallback((next) => { setQuery(next); setPage(1) }, [])
  const changeCategory = useCallback((next) => { setCategory(next); setPage(1) }, [])

  // Emoji, icon and symbol families are dropped before anything else: they
  // would render the preview word as a row of boxes, which reads as a rendering
  // fault rather than as a typeface you would not want. Monospace is KEPT — a
  // mono body face is a legitimate choice, and this is a picker, not a curated
  // gallery.
  const pickable = useMemo(() => filterPickableTypefaces(fonts), [fonts])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pickable.filter((font) => {
      if (category !== 'all' && font.category !== category) return false
      if (q && !font.family.toLowerCase().includes(q)) return false
      return true
    })
  }, [pickable, category, query])

  const shown = useMemo(() => matches.slice(0, page * PAGE), [matches, page])

  const pick = useCallback((font) => {
    onPick(font)
    onClose()
  }, [onPick, onClose])

  const clear = useCallback(() => { setQuery(''); setCategory('all'); setPage(1) }, [])

  return (
    <div className="fbd-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="fbd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fbd-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="fbd-head">
          <h2 id="fbd-title">{title}</h2>
          <button type="button" className="fbd-close" onClick={onClose} aria-label="Close the font browser">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <LibraryToolbar
          className="fbd-toolbar"
          search={{
            value: query,
            onChange: changeQuery,
            placeholder: 'Search families…',
            label: 'Search font families',
          }}
        >
          <LibraryFilterGroup
            label="Filter by category"
            triggerLabel="Category"
            value={category}
            onChange={changeCategory}
            options={CATS}
          />
        </LibraryToolbar>

        <p className="fbd-count" aria-live="polite">
          {matches.length.toLocaleString()} famil{matches.length === 1 ? 'y' : 'ies'}
        </p>

        <div className="fbd-body">
          {matches.length === 0 ? (
            <LibraryEmpty
              className="fbd-empty"
              title="No family matches that."
              detail={`Nothing in the loaded catalogue ${query.trim() ? `contains “${query.trim()}”` : 'is in this category'}. Clear the filters to see all ${pickable.length.toLocaleString()} again.`}
              onClear={clear}
            />
          ) : (
            <>
              <LibraryGrid className="fbd-grid">
                {shown.map((font) => (
                  <FontTile
                    key={font.family}
                    font={font}
                    selected={value?.family === font.family}
                    onPick={pick}
                  />
                ))}
              </LibraryGrid>
              {shown.length < matches.length && (
                <div className="fbd-more">
                  <button type="button" className="fg-more-btn" onClick={() => setPage(p => p + 1)}>
                    Show more families ({(matches.length - shown.length).toLocaleString()} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
