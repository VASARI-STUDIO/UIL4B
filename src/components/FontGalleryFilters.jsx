import { useEffect, useRef } from 'react'
import useModalDialog from '../hooks/useModalDialog'
import { fontStack, loadFont, bodyWeight } from '../utils/googleFonts'

// The Font Gallery's Filters sheet and its list / grid toggle. The page owns
// every value; this file only draws them. A change applies at once, and the
// foot's count line says what the sheet is showing.

// Per-item values go through custom properties, never inline styles.
function vars(map) {
  return (el) => {
    if (!el) return
    for (const key of Object.keys(map)) el.style.setProperty(key, map[key])
  }
}

function ViewIcon({ kind }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'grid'
        ? <><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></>
        : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>}
    </svg>
  )
}

// Two icon buttons, one pressed. Used on the toolbar; the sheet spells the
// same choice out as "List" and "Grid" pills.
export function ViewToggle({ view, onChange }) {
  return (
    <div className="fg-view" role="group" aria-label="View">
      {[['list', 'List view'], ['grid', 'Grid view']].map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={view === id ? 'fg-view-btn is-on' : 'fg-view-btn'}
          aria-pressed={view === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
        >
          <ViewIcon kind={id} />
        </button>
      ))}
    </div>
  )
}

// A downward drag on the sheet's head closes it when it goes this far (px) or
// this fast (px per ms); anything less snaps back. Moves under DRAG_JITTER never
// count as a flick, so a tap that wobbles cannot close the sheet.
const DRAG_CLOSE_DY = 96
const DRAG_CLOSE_SPEED = 0.5
const DRAG_JITTER = 12

// `faces` maps a category id to the catalogue family that stands for it, so
// each category pill is drawn in a face from its own class. `previewFirst` puts
// the preview text field above Category, where the phone keyboard leaves it in
// view.
export default function FiltersSheet({
  onClose, cats, category, onCategory, sorts, sort, onSort, size, sizeMin, sizeMax, onSize,
  view, onView, previewText, onPreviewText, faces, count, canClear, onClear, previewFirst,
}) {
  const ref = useModalDialog(onClose)
  const drag = useRef(null)

  // The drag is a phone gesture: from 768px the sheet is a centred dialog.
  const onDragStart = (e) => {
    if ((e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('button')) return
    if (!window.matchMedia('(max-width: 767px)').matches) return
    const sheet = e.currentTarget.closest('.fg-sheet')
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, sheet }
    sheet.classList.add('is-dragging')
  }
  const onDragMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    d.dy = Math.max(0, e.clientY - d.y)
    d.sheet.style.setProperty('--fg-drag', `${d.dy}px`)
  }
  const endDrag = (e, cancelled) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    d.sheet.classList.remove('is-dragging')
    const speed = d.dy / Math.max(1, e.timeStamp - d.t)
    if (!cancelled && (d.dy > DRAG_CLOSE_DY || (d.dy > DRAG_JITTER && speed > DRAG_CLOSE_SPEED))) {
      onClose()
      return
    }
    d.sheet.style.removeProperty('--fg-drag')
  }

  const previewGroup = (
    <div className="fg-sheet-group">
      <label className="fg-sheet-k" htmlFor="fg-sheet-preview">Preview text</label>
      <input
        id="fg-sheet-preview"
        className="fg-sheet-field"
        type="text"
        value={previewText}
        maxLength={72}
        spellCheck="false"
        enterKeyHint="done"
        placeholder="Type your own words"
        onChange={e => onPreviewText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
    </div>
  )

  useEffect(() => {
    Object.values(faces).forEach(font => { if (font) loadFont(font.family, [bodyWeight(font)]) })
  }, [faces])

  return (
    <div className="fg-sheet-layer">
      <div className="fg-sheet-scrim" aria-hidden="true" onClick={onClose} />
      <div className="fg-sheet" role="dialog" aria-modal="true" aria-label="Filters" tabIndex={-1} ref={ref}>
        <div
          className="fg-sheet-drag"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={e => endDrag(e, false)}
          onPointerCancel={e => endDrag(e, true)}
        >
          <span className="fg-sheet-grab" aria-hidden="true" />
          <div className="fg-sheet-head">
            <h2 className="fg-sheet-title">Filters</h2>
            <button type="button" className="fg-sheet-x" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="fg-sheet-body">
          {previewFirst && previewGroup}
          <div className="fg-sheet-group" role="group" aria-labelledby="fg-sheet-cat">
            <span className="fg-sheet-k" id="fg-sheet-cat">Category</span>
            <div className="fg-sheet-cats">
              {cats.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={category === c.id ? 'fg-sheet-pill fg-sheet-pill--face is-on' : 'fg-sheet-pill fg-sheet-pill--face'}
                  aria-pressed={category === c.id}
                  onClick={() => onCategory(c.id)}
                  ref={vars(faces[c.id] ? { '--fg-ff': fontStack(faces[c.id]) } : {})}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fg-sheet-group" role="group" aria-labelledby="fg-sheet-sort">
            <span className="fg-sheet-k" id="fg-sheet-sort">Sort</span>
            <div className="fg-sheet-pills">
              {sorts.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={sort === s.id ? 'fg-sheet-pill is-on' : 'fg-sheet-pill'}
                  aria-pressed={sort === s.id}
                  onClick={() => onSort(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fg-sheet-group">
            <div className="fg-sheet-row">
              <label className="fg-sheet-k" htmlFor="fg-sheet-size">Size</label>
              <span className="fg-sheet-v" aria-hidden="true">{size}px</span>
            </div>
            <input
              id="fg-sheet-size"
              className="fg-sheet-range"
              type="range"
              min={sizeMin}
              max={sizeMax}
              value={size}
              onChange={e => onSize(+e.target.value)}
              aria-valuetext={`${size} pixels`}
            />
          </div>

          <div className="fg-sheet-group" role="group" aria-labelledby="fg-sheet-view">
            <span className="fg-sheet-k" id="fg-sheet-view">View</span>
            <div className="fg-sheet-pills">
              {[['list', 'List'], ['grid', 'Grid']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={view === id ? 'fg-sheet-pill is-on' : 'fg-sheet-pill'}
                  aria-pressed={view === id}
                  onClick={() => onView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!previewFirst && previewGroup}
        </div>

        <div className="fg-sheet-foot">
          <button type="button" className="fg-sheet-btn" onClick={onClear} disabled={!canClear}>Clear filters</button>
          <button type="button" className="fg-sheet-btn fg-sheet-btn--primary" onClick={onClose}>
            Show {count.toLocaleString()} {count === 1 ? 'family' : 'families'}
          </button>
        </div>
      </div>
    </div>
  )
}
