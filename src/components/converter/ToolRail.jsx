import { useEffect, useRef, useState } from 'react'
import useModalDialog from '../../hooks/useModalDialog'
import { railPanelId, railTabId, splitRail } from './railGroups'

// The Video tab's tool rail: one button per group of edits, one group open at a
// time. A proper tablist (arrow keys, Home and End move AND open a group, one
// Tab stop); the group's controls live in a tabpanel the page renders, named
// by `panelId(id)`.
//
// `layout` is where the page put it, and only changes how it is drawn:
//   'side' a column left of the stage (desktop)
//   'row'  a row above the settings (tablet)
//   'bar'  the phone's pinned row: at most five slots, the fifth "More",
//          which opens one sheet holding the groups that did not get a slot
//
// A small filled mark on a button means that group holds an edit.

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)

const ICONS = {
  clip: <Svg><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></Svg>,
  crop: <Svg><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" /></Svg>,
  turn: <Svg><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Svg>,
  time: <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  look: <Svg><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" /></Svg>,
  add: <Svg><path d="M12 5v14M5 12h14" /></Svg>,
  size: <Svg><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></Svg>,
  more: <Svg><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></Svg>,
}


function Mark({ on }) {
  return on ? (
    <>
      <span className="fc-rail-mark" aria-hidden="true" />
      <span className="sr-only">, edited</span>
    </>
  ) : null
}

// The sheet behind "More". Mounted only while open, so the modal hook's focus
// trap, Escape and scroll lock are all tied to it being on screen. Focus goes
// back to the More button when it closes.
function MoreSheet({ groups, active, marks, onPick, onClose }) {
  const ref = useModalDialog(onClose)
  return (
    <div className="fc-rail-scrim" onClick={onClose}>
      <div
        ref={ref} className="fc-rail-sheet" role="dialog" aria-modal="true" aria-label="More tools" tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <div className="fc-rail-sheet-head">
          <span className="fc-rail-sheet-title">More tools</span>
          <button type="button" className="fc-btn fc-btn--quiet fc-rail-sheet-close" onClick={onClose}>Close</button>
        </div>
        <ul className="fc-rail-sheet-list">
          {groups.map(g => (
            <li key={g.id}>
              <button
                type="button" className="fc-rail-sheet-item" data-group={g.id}
                aria-current={g.id === active ? 'true' : undefined}
                onClick={() => onPick(g.id)}
              >
                {ICONS[g.id]}
                <span>{g.label}</span>
                <Mark on={marks[g.id]} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function ToolRail({ groups, active, onSelect, marks, layout = 'side', base = 'fc-vid' }) {
  const refs = useRef({})
  const [sheet, setSheet] = useState(false)
  const barRef = useRef(null)

  // The pinned phone row is one more thing the toast has to clear, so its
  // height goes to --fc-rail-live on <html> while it is on screen.
  useEffect(() => {
    const el = barRef.current
    if (layout !== 'bar' || !el) return undefined
    const html = document.documentElement
    const publish = () => html.style.setProperty('--fc-rail-live', `${Math.round(el.getBoundingClientRect().height)}px`)
    publish()
    const sizer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null
    sizer?.observe(el)
    return () => {
      sizer?.disconnect()
      html.style.removeProperty('--fc-rail-live')
    }
  }, [layout])

  const split = layout === 'bar' ? splitRail(groups) : { direct: groups, more: [] }
  const { direct, more } = split
  const inMore = more.some(g => g.id === active)

  // One Tab stop: the open group's button, or the first slot when the open
  // group is one of those behind "More".
  const stop = direct.some(g => g.id === active) ? active : direct[0]?.id

  const onKey = (e, i) => {
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = direct[(i + 1) % direct.length]
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = direct[(i - 1 + direct.length) % direct.length]
    else if (e.key === 'Home') next = direct[0]
    else if (e.key === 'End') next = direct[direct.length - 1]
    if (!next) return
    e.preventDefault()
    onSelect(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <>
      <div ref={barRef} className={`fc-rail fc-rail--${layout}`} data-slots={direct.length + (more.length ? 1 : 0)}>
        <div role="tablist" aria-label="Edit tools" aria-orientation={layout === 'side' ? 'vertical' : 'horizontal'} className="fc-rail-tabs">
          {direct.map((g, i) => (
            <button
              key={g.id}
              ref={el => { refs.current[g.id] = el }}
              type="button"
              role="tab"
              id={railTabId(base, g.id)}
              aria-selected={g.id === active}
              aria-controls={railPanelId(base, g.id)}
              tabIndex={g.id === stop ? 0 : -1}
              className="fc-rail-tab"
              data-group={g.id}
              data-edited={marks[g.id] ? 'true' : undefined}
              onClick={() => onSelect(g.id)}
              onKeyDown={e => onKey(e, i)}
            >
              {ICONS[g.id]}
              <span className="fc-rail-label">{g.label}</span>
              <Mark on={marks[g.id]} />
            </button>
          ))}
        </div>
        {more.length > 0 && (
          <button
            type="button"
            className="fc-rail-tab fc-rail-more"
            data-group="more"
            data-active={inMore ? 'true' : undefined}
            data-edited={more.some(g => marks[g.id]) ? 'true' : undefined}
            aria-haspopup="dialog"
            aria-expanded={sheet}
            onClick={() => setSheet(true)}
          >
            {ICONS.more}
            <span className="fc-rail-label">More</span>
            <Mark on={more.some(g => marks[g.id])} />
          </button>
        )}
      </div>
      {sheet && more.length > 0 && (
        <MoreSheet
          groups={more} active={active} marks={marks}
          onPick={id => { onSelect(id); setSheet(false) }}
          onClose={() => setSheet(false)}
        />
      )}
    </>
  )
}
