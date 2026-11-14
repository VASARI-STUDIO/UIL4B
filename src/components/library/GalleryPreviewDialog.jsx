import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import useModalDialog from '../../hooks/useModalDialog'
import { hexToOklch } from '../../utils/colors'
import { classifyPalette, MOOD_IDS, MOOD_LABELS } from '../../utils/paletteMood'
import { gradientCss, gradientToolUrl } from '../../data/gradientGallery'
import { paletteBuilderUrl } from '../../data/paletteGallery'
import {
  readablePairs, gradientTextContrast, floorRatio, verdictFor,
} from '../../utils/galleryPreview'

// The dialog a library tile opens: the palette or gradient large, every colour
// as a copy row, what it is good for, the pairs that read as text, and the way
// into the editor. One dialog for both libraries; `kind` picks the rows.
//
// DOM order is the reading order and the tab order: Close, Previous, Next, the
// "i of n" counter, the name, then the sections, with the editor link last.
// Desktop lays it out as a split (preview left, panel right), a tablet stacks
// it, and a phone gets the bottom sheet the toolbar's Mood sheet uses.
//
// Previous and Next wrap and are never disabled; with one item they are not
// drawn. Left and Right move the same way, except while a control that owns
// the arrows (an input, a menu) has focus.

const COPIED_MS = 1600
const SWIPE_PX = 60
const DRAG_CLOSE_PX = 90

function GlyphClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function GlyphStep({ dir }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir < 0 ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} />
    </svg>
  )
}

const oklchText = (hex) => {
  const [l, c, h] = hexToOklch(hex)
  return `oklch(${l}% ${c} ${h})`
}

function ColourRow({ hex, detail, copied, onCopy }) {
  return (
    <li>
      <button type="button" className="gpd-row" onClick={() => onCopy(hex)} aria-label={`Copy ${hex}`}>
        <span className="gpd-row-swatch" style={{ background: hex }} aria-hidden="true" />
        <span className="gpd-row-text" aria-hidden="true">
          <span className="gpd-row-hex">{hex}</span>
          <span className="gpd-row-detail">{detail}</span>
        </span>
        <span className="gpd-row-copy" aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </li>
  )
}

function PaletteBody({ item, copied, onCopy }) {
  const colours = item.colors.map((c) => c.toUpperCase())
  const moods = classifyPalette(item.colors)
  const moodNames = MOOD_IDS.filter((m) => moods[m]).map((m) => MOOD_LABELS[m])
  const pairs = readablePairs(colours)
  return (
    <>
      <section className="gpd-sec" aria-labelledby="gpd-colours">
        <h3 className="gpd-sec-h" id="gpd-colours">Colours</h3>
        <ul className="gpd-list">
          {colours.map((hex) => <ColourRow key={hex} hex={hex} detail={oklchText(hex)} copied={copied === hex} onCopy={onCopy} />)}
        </ul>
      </section>
      {(moodNames.length > 0 || item.use) && (
        <section className="gpd-sec" aria-labelledby="gpd-mood">
          <h3 className="gpd-sec-h" id="gpd-mood">Mood</h3>
          {moodNames.length > 0 && <p className="gpd-text">{moodNames.join(', ')}</p>}
          {item.use && <p className="gpd-text">Good for {item.use}.</p>}
        </section>
      )}
      <section className="gpd-sec" aria-labelledby="gpd-pairs">
        <h3 className="gpd-sec-h" id="gpd-pairs">Readable pairs</h3>
        {pairs.any ? (
          <ul className="gpd-pairs">
            {pairs.shown.map((p) => (
              <li key={`${p.a}-${p.b}`} className="gpd-pair">
                <span className="gpd-pair-chip" style={{ background: p.a, color: p.b }} aria-hidden="true">Aa</span>
                <span className="gpd-pair-text">{p.b} on {p.a}</span>
                <span className="gpd-pair-ratio">{floorRatio(p.ratio)}:1 · {p.verdict}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gpd-text">No two of these colours reach 3:1 against each other.</p>
        )}
        {pairs.moreText > 0 && (
          <p className="gpd-text gpd-text--quiet">{pairs.moreText} more {pairs.moreText === 1 ? 'pair passes' : 'pairs pass'} for text.</p>
        )}
      </section>
    </>
  )
}

function GradientBody({ item, copied, onCopy }) {
  const stops = [...item.stops].sort((a, b) => a.position - b.position)
  const { white, black } = gradientTextContrast(stops)
  const tags = Array.isArray(item.tags) ? item.tags : []
  return (
    <>
      <section className="gpd-sec" aria-labelledby="gpd-colours">
        <h3 className="gpd-sec-h" id="gpd-colours">Stops</h3>
        <ul className="gpd-list">
          {stops.map((s) => {
            const hex = s.color.toUpperCase()
            return <ColourRow key={`${hex}-${s.position}`} hex={hex} detail={`${oklchText(hex)} · ${Math.round(s.position)}%`} copied={copied === hex} onCopy={onCopy} />
          })}
        </ul>
      </section>
      {tags.length > 0 && (
        <section className="gpd-sec" aria-labelledby="gpd-mood">
          <h3 className="gpd-sec-h" id="gpd-mood">Mood</h3>
          <p className="gpd-text">{tags.map((t) => t[0].toUpperCase() + t.slice(1)).join(', ')}</p>
        </section>
      )}
      <section className="gpd-sec" aria-labelledby="gpd-pairs">
        <h3 className="gpd-sec-h" id="gpd-pairs">Text over it</h3>
        <ul className="gpd-pairs">
          <li className="gpd-pair">
            <span className="gpd-pair-chip" style={{ background: gradientCss(item.type, item.angle, item.stops), color: '#FFFFFF' }} aria-hidden="true">Aa</span>
            <span className="gpd-pair-text">White text, lowest {floorRatio(white)}:1</span>
            <span className="gpd-pair-ratio">{verdictFor(white)}</span>
          </li>
          <li className="gpd-pair">
            <span className="gpd-pair-chip" style={{ background: gradientCss(item.type, item.angle, item.stops), color: '#000000' }} aria-hidden="true">Aa</span>
            <span className="gpd-pair-text">Black text, lowest {floorRatio(black)}:1</span>
            <span className="gpd-pair-ratio">{verdictFor(black)}</span>
          </li>
        </ul>
      </section>
    </>
  )
}

/**
 * @param kind      'palette' | 'gradient'
 * @param items     the rows the viewer is browsing, in order
 * @param index     which one is showing
 * @param onIndex   called with the new index
 * @param metaOf    the tile's meta line for a row, shown under the name
 * @param actionsOf rows -> [{ key, label, ariaLabel, onClick }] for the Actions grid
 */
export default function GalleryPreviewDialog({ kind, items, index, onIndex, onClose, metaOf, actionsOf, toast }) {
  const ref = useModalDialog(onClose)
  const [copied, setCopied] = useState(null)
  const timer = useRef(null)
  const drag = useRef(null)
  const item = items[index]
  const many = items.length > 1
  const noun = kind === 'palette' ? 'palette' : 'gradient'

  useEffect(() => () => clearTimeout(timer.current), [])

  const step = useCallback((dir) => {
    onIndex((index + dir + items.length) % items.length)
  }, [index, items.length, onIndex])

  const copy = useCallback((hex) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied({ id: item?.id, hex })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), COPIED_MS)
      toast?.(`Copied ${hex}`)
    }).catch(() => toast?.('Failed to copy'))
  }, [toast, item?.id])

  const onKeyDown = (event) => {
    if (!many || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    if (event.target.closest?.('input, textarea, select, [role="menu"], [role="listbox"]')) return
    event.preventDefault()
    step(event.key === 'ArrowLeft' ? -1 : 1)
  }

  // A touch swipe across the preview steps; a pull down on the header closes the
  // sheet. Every gesture has a button, so this is a shortcut and nothing else.
  const down = (event) => {
    if (event.pointerType === 'mouse') return
    drag.current = { x: event.clientX, y: event.clientY, header: !!event.currentTarget.dataset.dragClose }
  }
  const up = (event) => {
    const start = drag.current
    drag.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (start.header) {
      if (dy > DRAG_CLOSE_PX && Math.abs(dx) < dy) onClose()
    } else if (many && Math.abs(dx) > SWIPE_PX && Math.abs(dy) < Math.abs(dx)) {
      step(dx < 0 ? 1 : -1)
    }
  }

  if (!item) return null
  // A copied tick belongs to the row it was pressed on, not to the next item.
  const copiedHex = copied && copied.id === item.id ? copied.hex : null
  const isPalette = kind === 'palette'
  const to = isPalette ? (item.pro ? '/create/palette' : paletteBuilderUrl(item.colors)) : gradientToolUrl(item)
  const editor = isPalette ? 'Open in Palette Builder' : 'Open in Gradient Generator'
  const actions = actionsOf ? actionsOf(item) : []
  const previewStyle = isPalette ? undefined : { background: gradientCss(item.type, item.angle, item.stops) }

  return createPortal(
    <div className="lib-surface lib-v3 lbry-sheet-layer gpd-layer">
      <div className="lbry-sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className="gpd lbry-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gpd-name"
        aria-describedby="gpd-meta"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="gpd-head" data-drag-close="true" onPointerDown={down} onPointerUp={up}>
          <button type="button" className="gpd-icon gpd-close" onClick={onClose} aria-label="Close">
            <GlyphClose />
          </button>
          {many && (
            <>
              <button type="button" className="gpd-icon gpd-prev" onClick={() => step(-1)} aria-label={`Previous ${noun}`}>
                <GlyphStep dir={-1} />
              </button>
              <button type="button" className="gpd-icon gpd-next" onClick={() => step(1)} aria-label={`Next ${noun}`}>
                <GlyphStep dir={1} />
              </button>
              <span className="gpd-count" aria-hidden="true">{index + 1} of {items.length}</span>
              <span className="sr-only" aria-live="polite">{item.name}, {index + 1} of {items.length}</span>
            </>
          )}
        </div>
        <div className="gpd-preview" style={previewStyle} aria-hidden="true" onPointerDown={down} onPointerUp={up}>
          {isPalette && item.colors.map((hex, i) => <span key={`${hex}-${i}`} className="gpd-band" style={{ background: hex }} />)}
        </div>
        <div className="gpd-panel">
          <h2 className="gpd-name" id="gpd-name">{item.name}</h2>
          <p className="gpd-meta" id="gpd-meta">{metaOf ? metaOf(item) : ''}</p>
          {isPalette
            ? <PaletteBody item={item} copied={copiedHex} onCopy={copy} />
            : <GradientBody item={item} copied={copiedHex} onCopy={copy} />}
          {actions.length > 0 && (
            <section className="gpd-sec" aria-labelledby="gpd-actions">
              <h3 className="gpd-sec-h" id="gpd-actions">Actions</h3>
              <div className="gpd-actions">
                {actions.map((a) => (
                  <button key={a.key} type="button" className="gpd-action" onClick={a.onClick} aria-label={a.ariaLabel}>
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="gpd-foot">
          <Link className="gpd-primary" to={to}>{editor}</Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}
