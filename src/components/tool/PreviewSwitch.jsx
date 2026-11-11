import { useLayoutEffect, useRef, useState } from 'react'
import MenuSelect from './MenuSelect'
import ToolIcon from './ToolIcon'

// The row of preview choices on the canvas. It never wraps and never scrolls sideways: it
// shows as many choices as fit the canvas's width and the rest go behind a "More" menu
// (MenuSelect: a popover on desktop, a bottom sheet under 768px). Fit is measured, not
// guessed, from a hidden copy of the row set in the same classes, so a late font or a
// larger touch target moves the cut by itself.
//
// `options` is [{ id, label, lead }]; `lead` marks the first choice of a second group,
// which gets a hairline before it. Order is kept: the choices that overflow are the tail.
export default function PreviewSwitch({ options, value, onChange, label, moreLabel }) {
  const barRef = useRef(null)
  const rowRef = useRef(null)
  const [shown, setShown] = useState(options.length)

  useLayoutEffect(() => {
    const bar = barRef.current
    const row = rowRef.current
    const stage = bar?.parentElement
    if (!bar || !row || !stage) return undefined
    const fit = () => {
      const widths = [...row.children].map((el) => el.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).marginLeft) || 0))
      const moreWidth = widths.pop()
      const style = getComputedStyle(bar)
      const gap = parseFloat(style.columnGap) || 0
      const room = stage.clientWidth - 2 * (parseFloat(style.left) || 0) - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
      const used = (count) => widths.slice(0, count).reduce((a, b) => a + b, 0) + gap * Math.max(count - 1, 0)
      let count = options.length
      if (used(count) > room) {
        count -= 1
        while (count > 1 && used(count) + gap + moreWidth > room) count -= 1
      }
      setShown(count)
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const watcher = new ResizeObserver(fit)
    watcher.observe(stage)
    watcher.observe(row)
    return () => watcher.disconnect()
  }, [options])

  const inline = options.slice(0, shown)
  const rest = options.slice(shown)
  const restOn = rest.some((o) => o.id === value)
  return (
    <div className="grd-ctx" role="group" aria-label={label} ref={barRef}>
      {inline.map((o) => (
        <button key={o.id} type="button" className={`grd-ctx-opt${o.lead ? ' grd-ctx-opt--lead' : ''}${value === o.id ? ' is-on' : ''}`} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
      {rest.length > 0 && (
        <MenuSelect
          className={`grd-ctx-opt grd-ctx-more${restOn ? ' is-on' : ''}`}
          ariaLabel={moreLabel}
          placeholder="More"
          triggerLabel="More"
          value={restOn ? value : ''}
          options={rest.map((o) => ({ value: o.id, label: o.label }))}
          onChange={onChange}
        />
      )}
      <div className="grd-ctx-gauge" aria-hidden="true">
        <div className="grd-ctx-gauge-row" ref={rowRef}>
          {options.map((o) => <span key={o.id} className={`grd-ctx-opt${o.lead ? ' grd-ctx-opt--lead' : ''}`}>{o.label}</span>)}
          <span className="grd-ctx-opt grd-ctx-more">More<ToolIcon name="caret-up-down" size={13} className="menu-select-caret" /></span>
        </div>
      </div>
    </div>
  )
}
