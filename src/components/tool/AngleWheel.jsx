import { useRef, useState } from 'react'
import { angleFromPoint, normaliseAngle, parseAngleInput, snapAngle, stepAngle } from '../../utils/angleWheel'

// A rotary angle control: drag round the dial, press an arrow key, or type the
// number. The dial is the slider (role="slider", 0-359, spoken as degrees); the
// number field beside it is the exact way in (360 wraps to 0). Both write through `onChange`, so
// a caller that gates editing gates every path at the one place.
//
// `locked` is the Pro lock: the controls stay in the page and look locked, and a
// press on either calls `onLockedPress` (the caller raises its upgrade modal)
// instead of changing the angle.
//
// Styles live in pages/gradient.css under `.grd`, so this is used inside that
// page's scope.

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30)

export default function AngleWheel({
  value,
  onChange,
  label = 'Angle',
  ariaLabel = 'Angle',
  numberLabel = 'Angle in degrees',
  locked = false,
  onLockedPress,
}) {
  const angle = normaliseAngle(value)
  const wheelRef = useRef(null)
  const dragging = useRef(false)
  // The text being typed, or null when the field just shows the live angle. A
  // draft only exists while the person is typing, so the field never needs an
  // effect to catch up with the wheel.
  const [draft, setDraft] = useState(null)

  const fromPointer = (e) => {
    const box = wheelRef.current?.getBoundingClientRect()
    if (!box) return null
    const next = angleFromPoint(box.left + box.width / 2, box.top + box.height / 2, e.clientX, e.clientY)
    if (next === null) return null
    return e.shiftKey ? snapAngle(next) : next
  }

  const onPointerDown = (e) => {
    if (e.button != null && e.button > 0) return
    if (locked) { onLockedPress?.(); return }
    const next = fromPointer(e)
    dragging.current = true
    e.currentTarget.focus({ preventScroll: true })
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a synthetic event has no active pointer */ }
    if (next !== null && next !== angle) onChange?.(next)
  }

  const onPointerMove = (e) => {
    if (!dragging.current) return
    const next = fromPointer(e)
    if (next !== null && next !== angle) onChange?.(next)
  }

  const endDrag = (e) => {
    if (!dragging.current) return
    dragging.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
  }

  const onKeyDown = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const next = stepAngle(angle, e.key, e.shiftKey)
    if (next === null) return
    e.preventDefault()
    if (locked) { onLockedPress?.(); return }
    onChange?.(next)
  }

  const shown = draft ?? String(angle)

  return (
    <div className={`grd-angle${locked ? ' is-locked' : ''}`}>
      <span className="grd-angle-k" aria-hidden="true">{label}</span>
      <div
        ref={wheelRef}
        className="grd-wheel"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={angle}
        aria-valuetext={`${angle} degrees`}
        aria-disabled={locked || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => { dragging.current = false }}
        onKeyDown={onKeyDown}
      >
        <span className="grd-wheel-ticks" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} className={`grd-wheel-tick${t % 90 === 0 ? ' is-major' : ''}`} style={{ '--grd-tick': `${t}deg` }} />
          ))}
        </span>
        <span className="grd-wheel-hand" style={{ '--grd-wheel-angle': `${angle}deg` }} aria-hidden="true">
          <span className="grd-wheel-knob" />
        </span>
      </div>
      <label className="grd-angle-num">
        <input
          type="number"
          className="grd-angle-input"
          min={0}
          max={359}
          step={1}
          inputMode="numeric"
          value={shown}
          aria-label={numberLabel}
          readOnly={locked || undefined}
          aria-disabled={locked || undefined}
          onClick={locked ? () => onLockedPress?.() : undefined}
          onChange={(e) => {
            if (locked) return
            setDraft(e.target.value)
            const next = parseAngleInput(e.target.value)
            if (next !== null) onChange?.(next)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); return }
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            if (e.altKey || e.ctrlKey || e.metaKey) return
            // The native step would stop at 0 and 360; the wheel wraps, and Shift
            // moves 15, so the field takes the same steps as the dial.
            e.preventDefault()
            if (locked) { onLockedPress?.(); return }
            setDraft(null)
            onChange?.(stepAngle(angle, e.key, e.shiftKey))
          }}
          onBlur={() => setDraft(null)}
        />
        <span className="grd-angle-unit" aria-hidden="true">°</span>
      </label>
    </div>
  )
}
