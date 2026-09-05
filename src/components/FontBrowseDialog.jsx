import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import LibraryToolbar from './library/LibraryToolbar'
import LibraryFilterGroup from './library/LibraryFilterGroup'
import LibraryGrid from './library/LibraryGrid'
import LibraryCard from './library/LibraryCard'
import LibraryEmpty from './library/LibraryEmpty'
import useModalDialog from '../hooks/useModalDialog'
import { FontAboutPanel, FontDossierTabs, FontExamplesPanel, FontInUsePanel } from './FontDossier'
import { filterPickableTypefaces, ladderWeights, specimenSizeCqw, weightName } from '../utils/fontGallery'
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

// Every category the pickable corpus actually contains, so the tray can reach
// all of it. Mono was missing, and it was not a cosmetic gap: this picker keeps
// monospace families on purpose (see `filterPickableTypefaces` — a mono body
// face is a legitimate choice for a technical product), so the catalogue served
// 51 mono families that no chip could reach and that EVERY non-"All" chip hid.
// The only route to one was knowing its name and typing it — which is the exact
// remember-and-type failure this dialog was built to end.
const CATS = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Script' },
  { id: 'monospace', label: 'Mono' },
]

// The catalogue can be ~1,700 families. Rendering every card would mount
// thousands of nodes and ask the browser to load a face for each; the page
// grows on scroll instead, and search is the route to anything past the end.
const PAGE = 36

// THE SPECIMEN IS THE NAME (#font-picker-shows-handgloves).
//
// Every tile used to read "Handgloves", so 1,851 cards differed only by shape
// and the reader had to look away to the caption to learn what they were
// looking at. Setting each tile in its own name makes the specimen and the
// label the same object - which is what Canva, Visual Electric and Magnific all
// do in their font pickers, and it is the difference between their lists and
// Readymag's, which shows "Ag" in every tile with the name in a caption below:
// the same split this change closes.
//
// THE CAPTION STAYS, and it is not redundant. LibraryCard still renders
// `name={font.family}` in the UI font underneath. That is the safety net for
// the faces whose whole point is that they are decorative - a barcode face, a
// blackletter, a script - where the specimen is unreadable BY DESIGN and the
// caption is the only way to know what you are looking at. Canva does exactly
// this: the name appears twice, once as shape and once as text. The repo has
// been caught by the other choice before - a sentence about scripts being hard
// to read set in a script - and the lesson was that the legible label must not
// be the thing rendered in the decorative face.

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function FontTile({ font, selected, onPick, onInspect }) {
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
              // Sized off the name's own length so a 32-character family fills
              // the tile as fully as a 4-character one. See specimenSizeCqw.
              el.style.setProperty('--fbd-cap', String(specimenSizeCqw(font.family)))
            }}
            aria-hidden="true"
          >
            {font.family}
          </span>
        </button>
      )}
      // A SECOND ROUTE, not a replacement for the first. Clicking the tile still
      // picks the family and closes — that fast path is the whole reason this
      // dialog is quick, and putting a detail step in front of it would tax
      // every selection to serve the occasional one. This is the route for the
      // occasional one: the dialog previously had NO way to look at a family
      // before committing to it, so "what is this face, actually?" could only
      // be answered by choosing it and then undoing that.
      //
      // It lives in LibraryCard's `actions` slot, which is a SIBLING of the
      // tile button rather than a child of it — a button inside a button is
      // invalid and would not be reachable by keyboard anyway. The slot is real
      // DOM at all times and revealed on hover AND focus-within, so tabbing
      // reaches exactly what a pointer reveals.
      actionsLabel={`About ${font.family}`}
      actions={(
        <button
          type="button"
          className="fbd-info"
          onClick={() => onInspect(font)}
          aria-label={`About ${font.family} — weights, designer and examples`}
        >
          <InfoIcon />
        </button>
      )}
      name={font.family}
      meta={`${font.category} · ${font.variants.length}w`}
    />
  )
}

// The per-family view the browse grid never had. Head and actions are pinned
// and only the tab panel scrolls, so "Use this family" is reachable the moment
// it opens — #305 found the Font Gallery's specimen dialog 1,763px tall in a
// 900px viewport with every action below the fold, and a tabbed detail view is
// exactly how that returns if the whole thing is allowed to grow.
function FontDetail({ font, selected, onUse, onBack }) {
  const [tab, setTab] = useState('specimen')
  const cuts = useMemo(() => ladderWeights(font.variants, 5), [font])

  useEffect(() => { loadFont(font.family, cuts) }, [font, cuts])
  // Back to the top of the panel on every tab change: the panels are different
  // heights, and landing halfway down "About" because "Examples" was scrolled
  // reads as a broken tab rather than a preserved position.
  const panelRef = useRef(null)
  useEffect(() => { panelRef.current?.scrollTo?.({ top: 0 }) }, [tab])

  const ff = fontStack(font)
  const setVars = (el) => {
    if (!el) return
    el.style.setProperty('--fbd-ff', ff)
    el.style.setProperty('--fbd-fw', String(headingWeight(font)))
  }

  return (
    <div className="fbd-detail">
      <div className="fbd-detail-head">
        <button type="button" className="fbd-back" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All families
        </button>
        <p className="fbd-detail-name" ref={setVars}>{font.family}</p>
      </div>

      <FontDossierTabs
        value={tab}
        onChange={setTab}
        idBase="fbd"
        label={`${font.family} details`}
      />

      <div className="fbd-detail-body" ref={panelRef}>
        {tab === 'specimen' && (
          <div className="fdx-panel" id="fbd-panel-specimen" role="tabpanel" aria-labelledby="fbd-tab-specimen" tabIndex={0}>
            {/* One full line per cut, set in the cut it names — the Pitch
                specimen pattern, and the reason #305 replaced six "Ag" tiles
                with it: two letters cannot show what a weight does to a word. */}
            <ul className="fbd-cuts">
              {cuts.map(w => (
                <li key={w}>
                  <span
                    className="fbd-cut-line"
                    ref={(el) => {
                      if (!el) return
                      el.style.setProperty('--fbd-ff', ff)
                      el.style.setProperty('--fbd-fw', String(w))
                    }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </span>
                  <span className="fbd-cut-label">{w}{weightName(w) ? ` ${weightName(w)}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tab === 'about' && (
          <FontAboutPanel font={font} id="fbd-panel-about" labelledBy="fbd-tab-about" />
        )}
        {tab === 'examples' && (
          <FontExamplesPanel font={font} id="fbd-panel-examples" labelledBy="fbd-tab-examples" />
        )}
        {tab === 'inuse' && (
          <FontInUsePanel font={font} id="fbd-panel-inuse" labelledBy="fbd-tab-inuse" />
        )}
      </div>

      <div className="fbd-detail-actions">
        <button type="button" className="fbd-use" onClick={() => onUse(font)}>
          {selected ? `${font.family} is in use` : `Use ${font.family}`}
        </button>
      </div>
    </div>
  )
}

export default function FontBrowseDialog({ title, fonts, value, onPick, onClose }) {
  const ref = useModalDialog(onClose)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  // The family being inspected, or null while browsing. Held as the FAMILY NAME
  // rather than the object so a catalogue refresh underneath cannot leave the
  // detail view rendering a stale entry.
  const [inspecting, setInspecting] = useState(null)

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

  // Resolved against the live list, so a family that vanished from the
  // catalogue drops the detail view rather than rendering a ghost.
  const detailFont = useMemo(
    () => (inspecting ? pickable.find(f => f.family === inspecting) || null : null),
    [pickable, inspecting],
  )

  // PORTALLED TO THE BODY, because a modal must not live inside the stacking
  // context of whatever opened it. FontPicker sits in the tools' config
  // sidebar, and that sidebar is `position:sticky` in the two-column band —
  // sticky creates a stacking context unconditionally, which traps this overlay
  // inside the sidebar however high its own z-index goes. It only ever worked
  // because the sidebar happened to come after the output pane in source order,
  // so it painted last; the moment the controls were moved before their output
  // (which is the right thing for the workflow) the output pane began painting
  // over the open dialog and swallowing its clicks. A z-index on the sidebar
  // would paper over this one instance and leave the trap set for the next
  // person to reorder anything. The portal removes the class of bug.
  const overlay = (
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

        {/* Browsing and inspecting are one dialog, not two stacked ones. A
            second overlay on top of this one would trap focus twice and give
            Escape two meanings; swapping the body keeps one focus trap, one
            Escape, and a Back button that is plainly not a close button. */}
        {detailFont ? (
          <FontDetail
            font={detailFont}
            selected={value?.family === detailFont.family}
            onUse={pick}
            onBack={() => setInspecting(null)}
          />
        ) : (
          <>
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
                        onInspect={f => setInspecting(f.family)}
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
          </>
        )}
      </div>
    </div>
  )

  // Guarded for the prerender pass, which has no document. The dialog only
  // mounts behind a click so this never fires there, but a component that
  // reaches for `document` at render time is a trap for whoever mounts it next.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
}
