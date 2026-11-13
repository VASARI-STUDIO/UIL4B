import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import usePopover from '../../hooks/usePopover'
import GradientFx from './GradientFx'
import ToolIcon from './ToolIcon'

// How the Fill preview is drawn (Plain, Grain, Fluted glass, …). The trigger sits at the
// end of the preview switch while the place is Fill and names the current style; it opens
// a grid of small live tiles, a popover on desktop and a bottom sheet under 768px
// (gradient.css, "FILL STYLE PICKER"). It is not modal: picking a tile applies it at once
// and the picker stays open so styles can be compared on the canvas; Done, Esc, a press
// outside or tabbing out closes it and focus goes back to the trigger. Tiles are drawn
// only while it is open.
export default function FillStylePicker({ styles, value, onChange, stops, paint, oklch }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { triggerRef, popRef, closeToTrigger } = usePopover(open, close, { initialFocus: '[aria-pressed="true"]', arrowNav: true, portalled: true })
  const current = styles.find((s) => s.id === value) || styles[0]

  useLayoutEffect(() => {
    if (!open) return
    // Sit above whatever holds the trigger, as MenuSelect does.
    let layer = 130
    let above = 0
    for (let node = triggerRef.current; node; node = node.parentElement) {
      const z = Number.parseInt(getComputedStyle(node).zIndex, 10) || 0
      above = Math.max(above, z)
      layer = Math.max(layer, z + 1)
    }
    popRef.current?.style.setProperty('--select-layer', String(layer))
    const tabs = document.querySelector('.pnav-tabs')
    const tabsZ = tabs ? Number.parseInt(getComputedStyle(tabs).zIndex, 10) || 0 : Infinity
    popRef.current?.toggleAttribute('data-in-sheet', above > tabsZ)
  }, [open, popRef, triggerRef])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="grd-ctx-opt grd-fill-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Fill style: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="grd-fill-trigger-text">{current.label}</span>
        <ToolIcon name="caret-down" size={12} />
      </button>
      {open && createPortal(
        <div className="grd tl grd-fill-portal">
          <div ref={popRef} role="dialog" aria-label="Fill style" tabIndex={-1} className="pop grd-fill-pop" data-pop-fixed="true">
            <div className="grd-fill-head">
              <h2 className="grd-fill-title">Fill style</h2>
              <button type="button" className="grd-fill-done" onClick={closeToTrigger}>Done</button>
            </div>
            <div className="grd-fill-grid" data-arrow-grid="">
              {styles.map((s) => {
                const on = s.id === current.id
                return (
                  <button key={s.id} type="button" className={`grd-fill-tile${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange(s.id)}>
                    <span className="grd-fill-thumb" aria-hidden="true">
                      <span className="grd-canvas" style={{ background: paint }} />
                      {s.id !== 'plain' && <GradientFx id={s.id} stops={stops} paint={paint} oklch={oklch} />}
                      {on && <span className="grd-fill-check"><ToolIcon name="check" size={12} /></span>}
                    </span>
                    <span className="grd-fill-name">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
