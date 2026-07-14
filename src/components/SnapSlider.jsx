import { useEffect, useRef, useState } from 'react'

/*
 * SnapSlider — range input with magnetic snap points, double-click reset,
 * and a click-to-edit value readout for custom values beyond the snaps.
 *
 * - Dragging snaps to the nearest value in `snaps` when within `snapRadius`
 *   of it (radius defaults to 6% of the track range). Values between snaps
 *   stay free, so custom values are still reachable by dragging.
 * - Double-click the track resets to `defaultValue`.
 * - Clicking the value text swaps it for a number input clamped to
 *   [inputMin ?? min, inputMax ?? max] — this is how values beyond the
 *   track range (e.g. 1024px icon size on a 12–128 track) are entered.
 */
export default function SnapSlider({
  id,
  min,
  max,
  step = 1,
  value,
  defaultValue,
  snaps = [],
  unit = '',
  inputMin,
  inputMax,
  decimals = 0,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const loBound = inputMin ?? min
  const hiBound = inputMax ?? max

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const fmt = v => (decimals > 0 ? (+v).toFixed(decimals).replace(/\.?0+$/, '') : String(Math.round(+v)))

  const snapValue = raw => {
    if (!snaps.length) return raw
    const radius = (max - min) * 0.06
    let best = null
    for (const s of snaps) {
      const d = Math.abs(raw - s)
      if (d <= radius && (best === null || d < Math.abs(raw - best))) best = s
    }
    return best ?? raw
  }

  const commitDraft = () => {
    setEditing(false)
    const n = parseFloat(draft)
    if (Number.isNaN(n)) return
    onChange(Math.min(hiBound, Math.max(loBound, n)))
  }

  // Track values above the slider max (entered via the text input) still
  // render the thumb pinned at max rather than clamping the real value.
  const trackValue = Math.min(max, Math.max(min, value))

  return (
    <span className={`snapv${className ? ` ${className}` : ''}`}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={trackValue}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={e => onChange(snapValue(+e.target.value))}
        onDoubleClick={defaultValue == null ? undefined : () => onChange(defaultValue)}
        title={defaultValue == null ? undefined : `Double-click to reset to ${fmt(defaultValue)}${unit}`}
      />
      {editing ? (
        <input
          ref={inputRef}
          className="snapv-input"
          type="number"
          min={loBound}
          max={hiBound}
          step={step}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={e => {
            if (e.key === 'Enter') commitDraft()
            else if (e.key === 'Escape') setEditing(false)
          }}
          aria-label={`${ariaLabel || 'Value'} — custom value`}
        />
      ) : (
        <button
          type="button"
          className="snapv-value"
          disabled={disabled}
          title="Click to type a custom value"
          onClick={() => { setDraft(fmt(value)); setEditing(true) }}
        >
          {fmt(value)}{unit}
        </button>
      )}
    </span>
  )
}
