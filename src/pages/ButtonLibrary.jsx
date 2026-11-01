import { useCallback, useMemo, useState } from 'react'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import LibraryGrid from '../components/library/LibraryGrid'
import LibraryCard from '../components/library/LibraryCard'
import ButtonLibraryDialog from '../components/library/ButtonLibraryDialog'
import {
  BUTTON_ROLES,
  buttonById,
  buttonCss,
  buttonHtml,
  buttonPreviewCss,
  filterButtons,
} from '../data/buttonLibrary'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
// This page's own sheet — every selector rooted at `.blib-page`.
import '../styles/pages/button-library.css'

// /discover/buttons — the Button Library. Ten button designs, each running on a
// fixed light stage, with the HTML and CSS to copy. A card copies the CSS in one
// press with no account; its dialog adds the HTML and, for Pro, quick edits
// (size, corners, colour) and an AI prompt.
//
// The data and every string a visitor copies come from src/data/buttonLibrary.js.
// This page only draws them.

// Hoisted: static data, so the filter group is not handed a new array each render.
const ROLE_OPTIONS = BUTTON_ROLES

// The previews on the grid. One sheet, every design at its defaults, scoped to
// the stage so no rule reaches the rest of the page.
const PREVIEW_CSS = buttonPreviewCss('.blib-stage')

// A preview button is a picture of a button: it still answers hover and press,
// but it is out of the tab order and hidden from assistive tech, because the
// card's own buttons are the controls. The markup is our own constant, not input.
const previewHtml = (item) => buttonHtml(item).replace('<button ', '<button tabindex="-1" ')

const ROLE_LABEL = Object.fromEntries(BUTTON_ROLES.map((r) => [r.id, r.label]))

export default function ButtonLibrary({ onCopy }) {
  const [role, setRole] = useState('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)

  const items = useMemo(() => filterButtons({ role, query }), [role, query])
  const openItem = openId ? buttonById(openId) : null

  const clearFilters = useCallback(() => { setQuery(''); setRole('all') }, [])
  const closeDialog = useCallback(() => setOpenId(null), [])
  const copy = useCallback((text) => onCopy?.(text), [onCopy])

  return (
    <div className="sec lib-surface blib-page">
      <DiscoverGalleryHero
        title="Button Library"
        description="Ten buttons for the jobs a button does, each with hover, pressed, focus and disabled states built in. Copy the HTML and CSS, free."
      />

      <LibraryToolbar
        className="blib-toolbar"
        quick={0}
        activeFilters={role !== 'all' ? 1 : 0}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search buttons by name or job…',
          label: 'Search buttons',
        }}
      >
        <LibraryFilterGroup
          label="Filter buttons by role"
          triggerLabel="Role"
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
        />
      </LibraryToolbar>

      <section aria-labelledby="blib-grid-heading">
        <DiscoverResultHead
          eyebrow="Curated collection"
          title="Buttons for every job"
          count={items.length}
          noun="design"
          id="blib-grid-heading"
        />

        {items.length > 0 ? (
          <>
            <style>{PREVIEW_CSS}</style>
            <LibraryGrid className="blib-grid" min={260}>
              {items.map((item) => (
                <LibraryCard
                  key={item.id}
                  className="blib-card"
                  media={(
                    <div className="blib-stage" aria-hidden="true">
                      <div className="blib-demo" style={item.previewWidth ? { width: item.previewWidth } : undefined} dangerouslySetInnerHTML={{ __html: previewHtml(item) }} />
                    </div>
                  )}
                  name={item.name}
                  meta={ROLE_LABEL[item.role]}
                  tail={(
                    <>
                      <button
                        type="button"
                        className="blib-act"
                        onClick={() => copy(buttonCss(item))}
                        aria-label={`Copy ${item.name} CSS`}
                        title="Copy CSS"
                      >
                        Copy CSS
                      </button>
                      <button
                        type="button"
                        className="blib-act blib-act--open"
                        onClick={() => setOpenId(item.id)}
                        aria-label={`Open ${item.name} button`}
                        aria-haspopup="dialog"
                      >
                        Open <span aria-hidden="true">→</span>
                      </button>
                    </>
                  )}
                />
              ))}
            </LibraryGrid>
          </>
        ) : (
          <LibraryEmpty
            className="blib-empty"
            title={`No buttons match ${query.trim() ? `“${query.trim()}”` : 'that role'}.`}
            detail="Try a broader search, or clear the filters to see every design."
            onClear={clearFilters}
          />
        )}
      </section>

      <GalleryCloseCta
        className="blib-cta"
        detail="Tell us which button, or which part of an interface, you want in the library next."
        action="Send a suggestion"
        to="/feedback"
      />

      {openItem && <ButtonLibraryDialog key={openItem.id} item={openItem} onClose={closeDialog} onCopy={copy} />}
    </div>
  )
}
