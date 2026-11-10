import { useEffect, useId, useRef, useState } from 'react'
import FontBrowseDialog from '../FontBrowseDialog'
import { fontStack } from '../../utils/googleFonts'
import { categoryLabel, weightCount } from '../../utils/fontGallery'

// Weights per row in the open tray; Up and Down move by this many.
const COLS = 5

// One family in the phone settings sheet: the label, the name in its own face
// with its category and weight count, then a chip that shows the weight and
// opens the family's weights as a tray, and a round button that opens the
// browser for another family. Only the weights the family has are offered.
export default function FamilyRow({ idBase, label, fonts, font, weight, onPickFont, onWeight, intent }) {
  const uid = useId()
  const slot = label.split(' ')[0]
  const [open, setOpen] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const chipRef = useRef(null)
  const trayRef = useRef(null)

  // Opening scrolls the sheet until the whole tray is in view (it opens below the
  // chip, where the sheet's foot would otherwise hide the second row), then moves
  // focus onto the current weight so the keyboard lands in the list.
  useEffect(() => {
    if (!open) return
    trayRef.current?.scrollIntoView({ block: 'nearest' })
    trayRef.current?.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true })
  }, [open])

  const close = () => {
    setOpen(false)
    chipRef.current?.focus({ preventScroll: true })
  }
  // Arrows travel the pills (Up and Down jump a row); Escape closes only the tray.
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
    const pills = [...trayRef.current.querySelectorAll('[role="option"]')]
    const at = pills.indexOf(document.activeElement)
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }[e.key]
    let next = null
    if (step !== undefined) next = Math.min(Math.max(at + step, 0), pills.length - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = pills.length - 1
    if (next === null) return
    e.preventDefault()
    pills[next].focus({ preventScroll: true })
  }

  return (
    <div id={idBase} className="tsc-fr" role="group" aria-labelledby={`${uid}-label`}>
      <span className="tsc-k" id={`${uid}-label`}>{label}</span>
      <div className="tsc-fr-row">
        <div className="tsc-fr-n">
          <span className="tsc-fr-name" style={{ fontFamily: fontStack(font), fontWeight: weight }}>{font.family}</span>
          <span className="tsc-fr-meta">{categoryLabel(font.category)} &middot; {weightCount(font.variants.length)}</span>
        </div>
        <button
          ref={chipRef}
          type="button"
          className="tsc-fr-chip"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${uid}-tray` : undefined}
          aria-label={`${slot} weight: ${weight}`}
          onClick={() => setOpen(o => !o)}
        >
          {weight}
        </button>
        <button
          type="button"
          className="tsc-fr-ib"
          aria-haspopup="dialog"
          aria-label={`Browse ${label.toLowerCase()}`}
          onClick={() => setBrowsing(true)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
        </button>
      </div>
      {open && (
        <div ref={trayRef} id={`${uid}-tray`} className="tsc-fr-tray" role="listbox" aria-label={`${slot} weight`} onKeyDown={onKey}>
          {font.variants.map(w => (
            <button
              key={w}
              type="button"
              role="option"
              className="tsc-fr-opt"
              aria-selected={w === weight}
              tabIndex={w === weight ? 0 : -1}
              onClick={() => { onWeight(w); close() }}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {browsing && (
        <FontBrowseDialog
          title={label}
          intent={intent}
          fonts={fonts}
          value={font}
          onPick={onPickFont}
          onClose={() => setBrowsing(false)}
        />
      )}
    </div>
  )
}
