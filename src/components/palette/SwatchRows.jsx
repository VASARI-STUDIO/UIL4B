import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { barRef } from '../../utils/paletteBoard'
import { textColorForBg } from '../../utils/colors'
import { reportUpgradeGate } from '../../contexts/ProModalContext'

// The rows of the Palette Builder's Suggest and Explore panels. One component
// for variations, palettes and brands: a name line over a strip of equal chips,
// so chip n of every row sits under chip n of "Your palette" and a variation
// reads as a column-by-column diff of the user's own colours. Design:
// memory/designs/design-2026-10-31-suggest-explore.md, sections 3, 4 and 7.

const Svg = ({ size = 14, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)
export const IcoLockSm = ({ size = 12 }) => <Svg size={size}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>
export const IcoUndoSm = ({ size = 14 }) => <Svg size={size}><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></Svg>
export const IcoSearchSm = ({ size = 14 }) => <Svg size={size}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>

// A strip of equal chips. `hex` shows the colour's hex without the # on row hover
// or keyboard focus (the CSS decides when); a chip narrower than 48px hides it.
function Chips({ colors, hex = true, className = '' }) {
  return (
    <span className={`plb-sw-chips ${className}`.trim()}>
      {colors.map((c, k) => (
        <span key={k} className="plb-sw-chip" ref={barRef(c)}>
          {hex && <span className="plb-sw-hex" style={{ color: textColorForBg(c) }}>{String(c).replace('#', '').toUpperCase()}</span>}
        </span>
      ))}
    </span>
  )
}

// Neutral stand-in chips for a locked row whose colours never reach the page
// (utils/lockedPreview.js): the tokenised steps, blurred by the CSS.
function LockedChips({ slots }) {
  return (
    <span className="plb-sw-chips">
      {Array.from({ length: Math.max(1, Number(slots) || 1) }, (_, k) => <span key={k} className="plb-sw-chip lockt-rowcell" data-step={k % 4} />)}
    </span>
  )
}

/**
 * variant:
 *   'press'  a button that applies the row (and, when applied, puts the board back)
 *   'gate'   a button on a locked variation: opens Pro plans; chips blurred
 *   'static' a teased locked palette or brand: not pressable
 */
export function SwatchRow({
  id, variant = 'press', name, detail, meta, colors, slots, applied = false, mine, ariaLabel, onPress,
}) {
  const locked = variant !== 'press'
  const cls = `plb-sw-row${applied ? ' is-on' : ''}${locked ? ' is-locked' : ''}${variant === 'static' ? ' is-static' : ''}`
  const strip = (
    <span className="plb-sw-strip" aria-hidden="true">
      {variant === 'static' ? <LockedChips slots={slots} /> : <Chips colors={colors} hex={!locked} />}
      {applied && mine?.length > 0 && <Chips colors={mine} hex={false} className="plb-sw-chips--mine" />}
    </span>
  )
  const line = (
    <span className="plb-sw-line">
      <span className="plb-sw-name">{name}</span>
      <span className="plb-sw-detail">
        {applied ? (
          <>
            <span className="plb-sw-d-on">On your board</span>
            <span className="plb-sw-d-back">Click to go back</span>
            <span className="plb-sw-d-tap">Tap again to go back</span>
          </>
        ) : detail}
      </span>
      <span className="plb-sw-meta">
        {locked ? <span className="plb-sw-pro"><IcoLockSm /> Pro</span> : applied ? <IcoUndoSm /> : meta}
      </span>
    </span>
  )
  if (variant === 'static') {
    return <li className="plb-sw-item"><div className={cls} aria-label={`${name}, Pro only`} role="group">{line}{strip}</div></li>
  }
  return (
    <li className="plb-sw-item">
      <button
        type="button"
        id={`plb-sw-${id}`}
        className={cls}
        aria-pressed={variant === 'press' ? applied : undefined}
        aria-label={ariaLabel}
        onClick={onPress}
      >
        {line}
        {strip}
      </button>
    </li>
  )
}

// Roving focus for the rows: one Tab stop for the whole list, Up and Down (and
// Home and End) move between rows, so 64 palettes do not take 64 Tab presses.
// The tabindex is written to the DOM after each render rather than through React,
// so a row that mounts later is folded in without state.
export function RovingRows({ className = '', children, ...rest }) {
  const ref = useRef(null)
  const stop = useRef(null)
  const rows = () => [...(ref.current?.querySelectorAll('button.plb-sw-row') || [])]
  useEffect(() => {
    const all = rows()
    if (!all.length) return
    const keep = stop.current?.isConnected ? stop.current : all[0]
    stop.current = keep
    all.forEach(el => { el.tabIndex = el === keep ? 0 : -1 })
  })
  const onFocus = (e) => {
    const row = e.target.closest?.('button.plb-sw-row')
    if (!row) return
    stop.current = row
    rows().forEach(el => { el.tabIndex = el === row ? 0 : -1 })
  }
  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const all = rows()
    const at = all.indexOf(document.activeElement)
    if (at < 0) return
    e.preventDefault()
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1
      : Math.min(all.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))
    all[to]?.focus()
    all[to]?.scrollIntoView?.({ block: 'nearest' })
  }
  return <div ref={ref} className={className} onFocus={onFocus} onKeyDown={onKeyDown} {...rest}>{children}</div>
}

// The pinned row: the user's palette from before the first apply. Not pressable.
// `detail` is Suggest's "Balance 92" (with its "?"), empty in Explore. `onCompare`
// shows once something is applied.
export function YourPaletteRow({ colors, detail, help, onCompare, compareLabel }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="plb-sw-pin">
      <div className="plb-sw-row plb-sw-row--pin">
        <span className="plb-sw-line">
          <span className="plb-sw-name">Your palette</span>
          <span className="plb-sw-detail">
            {detail}
            {help && (
              <button
                type="button"
                className="plb-sw-info"
                aria-label="What the balance score measures"
                aria-expanded={open}
                aria-describedby="plb-sw-help"
                onClick={() => setOpen(o => !o)}
              >
                <span aria-hidden="true">?</span>
              </button>
            )}
          </span>
          <span className="plb-sw-meta">
            {onCompare && (
              <button type="button" className="plb-sw-compare" aria-label={compareLabel} onClick={onCompare}>Compare</button>
            )}
          </span>
        </span>
        <span className="plb-sw-strip" aria-hidden="true"><Chips colors={colors} /></span>
      </div>
      {help && <p id="plb-sw-help" className="plb-sw-help" hidden={!open}>{help}</p>}
    </div>
  )
}

// The end-of-list Pro block: flat, hairline above, no card. `onOpen` runs for a
// gate that opens a modal; `to` makes it a link to the plans page instead.
export function ProBlock({ heading, body, gate, onOpen }) {
  return (
    <div className="plb-sw-problock">
      <p className="plb-sw-pro-head">{heading}</p>
      <p className="plb-sw-pro-body">{body}</p>
      {onOpen
        ? <button type="button" className="tl-btn" onClick={onOpen}>See Pro plans</button>
        : <Link className="tl-btn" to="/plans" onClick={() => { reportUpgradeGate(gate) }}>See Pro plans</Link>}
    </div>
  )
}

// Static placeholders while the Pro library loads: no shimmer.
export function RowSkeletons({ count = 3 }) {
  return (
    <ul className="plb-sw-list plb-sw-skel" aria-hidden="true" role="presentation">
      {Array.from({ length: count }, (_, k) => (
        <li key={k} className="plb-sw-item">
          <div className="plb-sw-row">
            <span className="plb-sw-line"><span className="plb-sw-skel-name" /></span>
            <span className="plb-sw-strip"><span className="plb-sw-skel-strip" /></span>
          </div>
        </li>
      ))}
    </ul>
  )
}
