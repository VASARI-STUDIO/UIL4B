import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_MAP, categoryLabel } from '../../data/discoverCategories'
import { monogram, buildToolHandoffUrl, primaryAvailableTool } from './discoverUtils'
import CategoryGlyph from './CategoryGlyph'

// External-resource Discover card (the only variant in Slice 2a). Two-zone:
// a generated type-coded face (NEVER fetched — generated locally from the
// title hash so there is no SSRF surface) over an informative body with a
// load-bearing foot CTA.
//
// All external links are real <a target="_blank" rel="noopener noreferrer
// nofollow"> with a visible ↗. "Use in tool" is a real navigation. Save is a
// <button aria-pressed>. The card body (not the buttons) opens a detail modal.

function ExternalGlyph({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dsc-ext-glyph">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

// Palette face — the resource's real sample swatches as full-height columns
// (data is static + local in discoverResources.js; nothing is ever fetched).
function PaletteFace({ resource }) {
  return (
    <div className="dsc-face dsc-face-swatches" data-cat={resource.category} aria-hidden="true">
      {resource.palette.map((hex) => (
        <span key={hex} className="dsc-swatch" style={{ background: hex }} />
      ))}
      <span className="dsc-face-glyph"><CategoryGlyph category={resource.category} size={20} /></span>
    </div>
  )
}

// Mini UI preview face — a tiny generated mock interface (window chrome, text
// skeleton, buttons) for component / design-system resources. Pure local CSS,
// tinted by the category colour; never a remote screenshot.
function UiPreviewFace({ category }) {
  return (
    <div className="dsc-face dsc-face-ui" data-cat={category} aria-hidden="true">
      <div className="dsc-ui-window">
        <div className="dsc-ui-bar"><span /><span /><span /></div>
        <div className="dsc-ui-body">
          <span className="dsc-ui-line dsc-ui-line-w60" />
          <span className="dsc-ui-line dsc-ui-line-w40" />
          <div className="dsc-ui-btns">
            <span className="dsc-ui-btn is-primary" />
            <span className="dsc-ui-btn" />
          </div>
        </div>
      </div>
      <span className="dsc-face-glyph"><CategoryGlyph category={category} size={20} /></span>
    </div>
  )
}

function BookmarkGlyph({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function DiscoverCard({ resource, saved, broken, offline, onToggleSave, onReport, onOpen }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const cat = CATEGORY_MAP[resource.category]
  // Only offer a "Use in tool" CTA for a PUBLIC tool; admin-gated routes
  // (/ui-builder, /file-converter) would dead-end on <ComingSoon/> for normal
  // users, so we fall back to the no-tool "Visit site" path instead.
  const primaryTool = primaryAvailableTool(resource)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  // Hand-off: navigate to the related tool. Only ColorStudio reads ?preset; every
  // other public tool just routes (gated tools never reach here — see primaryTool).
  const goToTool = (tool) => {
    navigate(buildToolHandoffUrl(tool))
  }

  const openModal = (e) => {
    // Ignore clicks that originate on an interactive control inside the card.
    if (e.target.closest('a,button')) return
    onOpen(resource)
  }
  const onBodyKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(resource) }
  }

  return (
    <article className="dsc-card" data-cat={resource.category}>
      {/* Generated face — local, never fetched. Palette resources show their
          real sample swatches, component/design-system resources show a mini
          UI preview, everything else keeps the type-coded monogram. */}
      {Array.isArray(resource.palette) && resource.palette.length > 0 ? (
        <PaletteFace resource={resource} />
      ) : resource.category === 'components' ? (
        <UiPreviewFace category={resource.category} />
      ) : (
        <div className="dsc-face" data-cat={resource.category}>
          <span className="dsc-face-mono">{monogram(resource.title, resource.category)}</span>
          <span className="dsc-face-glyph"><CategoryGlyph category={resource.category} size={20} /></span>
        </div>
      )}

      <button
        className={`dsc-save${saved ? ' is-saved' : ''}`}
        onClick={() => onToggleSave(resource.id)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${resource.title} from saved` : `Save ${resource.title}`}
        title={saved ? 'Saved' : 'Save'}
      >
        <BookmarkGlyph filled={saved} />
      </button>

      <div className="dsc-menu-wrap" ref={menuRef}>
        <button
          className="dsc-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More actions for ${resource.title}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
        {menuOpen && (
          <div className="dsc-menu" role="menu">
            <button
              className="dsc-menu-item"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onReport(resource.id) }}
              disabled={broken}
            >
              {broken ? 'Reported' : 'Report broken link'}
            </button>
          </div>
        )}
      </div>

      {/* Body — clicking opens the detail modal (keyboard: Enter) */}
      <div
        className="dsc-card-body"
        role="button"
        tabIndex={0}
        onClick={openModal}
        onKeyDown={onBodyKey}
        aria-label={`View details for ${resource.title}`}
      >
        <div className="dsc-card-top">
          <span className="dsc-pill" data-cat={resource.category}>
            {categoryLabel(resource.category)}
          </span>
          <span className={`dsc-pill-free${resource.free ? '' : ' is-paid'}`}>
            {resource.free ? 'Free' : 'Paid'}
          </span>
          {broken && <span className="dsc-pill-broken">Reported</span>}
        </div>

        <div className="dsc-card-title">
          <span className="dsc-card-title-text">{resource.title}</span>
          <ExternalGlyph />
        </div>
        <p className="dsc-card-desc">{resource.shortDescription}</p>

        {(resource.useCase || resource.difficulty) && (
          <div className="dsc-chips">
            {resource.useCase && <span className="dsc-chip">{resource.useCase}</span>}
            {resource.difficulty && <span className="dsc-chip dsc-chip-diff">{resource.difficulty}</span>}
          </div>
        )}
      </div>

      {/* Foot — the load-bearing hand-off */}
      <div className="dsc-foot">
        {primaryTool ? (
          <>
            <button
              className="dsc-foot-cta"
              data-cat={resource.category}
              onClick={() => goToTool(primaryTool)}
              aria-label={`Use ${resource.host} in ${primaryTool.label}`}
            >
              <span aria-hidden="true">→</span> Use in {primaryTool.label}
            </button>
            <a
              className={`dsc-foot-visit${offline ? ' is-disabled' : ''}`}
              href={offline ? undefined : resource.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-disabled={offline || undefined}
              tabIndex={offline ? -1 : undefined}
              title={offline ? 'You are offline — reconnect to open external links' : `Visit ${resource.host} (opens in a new tab)`}
              onClick={(e) => { if (offline) e.preventDefault() }}
            >
              Visit <ExternalGlyph />
            </a>
          </>
        ) : (
          <a
            className={`dsc-foot-visit-primary${offline ? ' is-disabled' : ''}`}
            href={offline ? undefined : resource.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-disabled={offline || undefined}
            tabIndex={offline ? -1 : undefined}
            title={offline ? 'You are offline — reconnect to open external links' : `Visit ${resource.host} (opens in a new tab)`}
            onClick={(e) => { if (offline) e.preventDefault() }}
          >
            <span aria-hidden="true">↗</span> Visit site
          </a>
        )}
      </div>
      {cat && <span className="dsc-rail" data-cat={resource.category} aria-hidden="true" />}
    </article>
  )
}
