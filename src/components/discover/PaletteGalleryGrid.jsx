import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LibraryCard from '../library/LibraryCard'
import LibraryGrid from '../library/LibraryGrid'
import { GALLERY_PALETTES, paletteBuilderUrl } from '../../data/paletteGallery'
import { setGradientDraft, resetGradientDraft } from '../../utils/colorHandoff'
import { useProject } from '../../contexts/ProjectContext'

// Colorhunt-style palette gallery — shared by the Discover palettes view and
// the Palette Builder's colour-gallery popup. Everything is local + static
// (src/data/paletteGallery.js): stripes are plain CSS backgrounds, likes live
// in localStorage, and "use" either navigates to the Palette Builder with a
// ?c= hand-off or (when `onPick` is provided, e.g. inside the builder popup)
// applies the colours directly via the callback.
//
// Palettes may carry `kind: 'brand'` (see data/paletteLibrary.js). Those get a
// visible "Brand" badge so a published identity system is never mistaken for
// one of our invented palettes. Brands the Palette Builder gates behind Pro
// (`pro: true`) keep that gate here: the card links to the builder, where the
// existing upgrade path lives, instead of handing the colours straight over.

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

function BuilderGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="13" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="14" r="2.5" />
      <path d="M12 22a10 10 0 1 1 0-20 8 8 0 0 1 0 16h-1.5a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 1 0 1z" />
    </svg>
  )
}

function ProjectGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7.5L10 4H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z" />
    </svg>
  )
}

function GradientGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15 15 3M9 21 21 9" />
    </svg>
  )
}

function CssGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 17-5-5 5-5M15 7l5 5-5 5" />
    </svg>
  )
}

function HexGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

// The CSS a palette copies as. Named from the palette so the variables mean
// something in the file they are pasted into, rather than --c1…--c5.
function paletteCss(palette) {
  const slug = palette.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'palette'
  const lines = palette.colors.map((hex, i) => `  --${slug}-${(i + 1) * 100}: ${hex.toUpperCase()};`)
  return `/* ${palette.name} — UIL4B Palette Library */\n:root {\n${lines.join('\n')}\n}\n`
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
  const navigate = useNavigate()
  const { setPalette, canSaveProjects } = useProject()

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

  const copyText = useCallback((text, label) => {
    navigator.clipboard.writeText(text)
      .then(() => toast?.(label))
      .catch(() => toast?.('Failed to copy'))
  }, [toast])

  // Stage the palette as the live gradient draft, then navigate. Mirrors
  // openInGradient in PaletteBuilder — including the honest failure when a
  // palette has no two distinct colours to gradient between, and the reset so a
  // failed navigation never leaves a stale draft behind.
  const openInGradient = useCallback((palette) => {
    if (!setGradientDraft(palette.colors)) {
      toast?.('A gradient needs two different colours')
      return
    }
    try {
      navigate('/create/gradient')
    } catch {
      resetGradientDraft()
      toast?.('Couldn’t open the Gradient Generator — try again')
    }
  }, [navigate, toast])

  // Write into the shared design the way the Palette Builder does, then send
  // the user to Projects to name and keep it. Deliberately NOT a silent save:
  // saveProject needs a name, and inventing one on the user's behalf is how a
  // projects list fills up with things nobody chose.
  const saveToProject = useCallback((palette) => {
    if (!canSaveProjects) {
      toast?.('Sign in to save palettes to a project')
      navigate('/login')
      return
    }
    setPalette({ colors: palette.colors, baseColors: palette.colors, base: palette.colors[0] })
    toast?.(`${palette.name} loaded — name it to save`)
    navigate('/projects')
  }, [canSaveProjects, navigate, setPalette, toast])

  return (
    <LibraryGrid className="pgal-grid">
      {palettes.map(p => {
        const selected = selectedId != null && p.id === selectedId
        return (
        <LibraryCard
          key={p.id}
          className="pgal-card"
          data-kind={p.kind || 'curated'}
          selected={selected}
          nameClassName="pgal-name"
          badgeClassName="pgal-badge"
          badge={p.kind === 'brand' ? `Brand${p.pro ? ' · Pro' : ''}` : null}
          // The like button moved out of the foot and onto the swatch, where
          // the Gradient Library already keeps it. The two libraries put the
          // same control in two different places, which is exactly the
          // divergence the shared card exists to end.
          float={(
            <>
              {selected && (
                <span className="pgal-tick" aria-hidden="true"><CheckGlyph /></span>
              )}
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
            </>
          )}
          // The stripes. On Discover (no onPick) each stripe copies its hex.
          // Inside the builder popup (onPick) the whole swatch is the select
          // surface: clicking any stripe enables the palette (or, when it is
          // already selected, toggles it back off) — no per-hex copy.
          media={(
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
          )}
          actionsLabel={`${p.name} actions`}
          // Hover / focus actions. Discover only — inside the builder popup
          // (onPick) the whole card is already one select surface and a second
          // action layer would compete with it.
          //
          // These are real buttons in the DOM at all times, not injected on
          // hover: the shared card reveals the layer with CSS (opacity and
          // visibility under :hover and :focus-within), so keyboard users tab
          // into exactly the same actions a pointer reveals, and a screen
          // reader never meets a control that appears only under a mouse. Pro
          // brand systems are excluded — the builder owns that gate, and
          // handing the colours over here would route around it.
          actions={!onPick && !p.pro ? (
            <>
              <Link
                className="pgal-act"
                to={paletteBuilderUrl(p.colors)}
                title="Open in the Palette Builder"
                aria-label={`Open ${p.name} in the Palette Builder`}
              >
                <BuilderGlyph /><span>Builder</span>
              </Link>
              <button
                type="button"
                className="pgal-act"
                onClick={() => saveToProject(p)}
                title="Save to a project"
                aria-label={`Save ${p.name} to a project`}
              >
                <ProjectGlyph /><span>Project</span>
              </button>
              <button
                type="button"
                className="pgal-act"
                onClick={() => openInGradient(p)}
                title="Open in the Gradient Generator"
                aria-label={`Open ${p.name} in the Gradient Generator`}
              >
                <GradientGlyph /><span>Gradient</span>
              </button>
              <button
                type="button"
                className="pgal-act"
                onClick={() => copyText(paletteCss(p), `Copied ${p.name} as CSS`)}
                title="Copy as CSS custom properties"
                aria-label={`Copy ${p.name} as CSS custom properties`}
              >
                <CssGlyph /><span>CSS</span>
              </button>
              <button
                type="button"
                className="pgal-act"
                onClick={() => copyText(p.colors.join(', ').toUpperCase(), `Copied ${p.colors.length} hex codes`)}
                title="Copy every hex code"
                aria-label={`Copy all ${p.colors.length} hex codes from ${p.name}`}
              >
                <HexGlyph /><span>Hex</span>
              </button>
            </>
          ) : null}
          name={p.name}
          tail={(
            <>
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
            ) : p.pro ? (
              // Pro-gated brand system. The Palette Builder decides who may
              // load it (pickBrand there), so the library sends the user to
              // that gate rather than handing the colours over via ?c=.
              <Link
                className="pgal-use pgal-use--pro"
                to="/create/palette"
                aria-label={`${p.name} is a Pro brand system — open the Palette Builder to load it`}
                title="Pro brand system — load it from the Palette Builder"
              >
                Pro <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link
                className="pgal-use"
                to={paletteBuilderUrl(p.colors)}
                aria-label={`Open ${p.name} in the Palette Builder`}
              >
                Open <span aria-hidden="true">→</span>
              </Link>
            )}
            </>
          )}
        />
        )
      })}
    </LibraryGrid>
  )
}
