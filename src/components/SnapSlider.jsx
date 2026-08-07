import { useCallback, useEffect, useRef, useState } from 'react'
import { stepFromKey } from '../utils/sliderKeys'

/*
 * SnapSlider — range input with magnetic snap points, double-click reset,
 * and a click-to-edit value readout for custom values beyond the snaps.
 *
 * - POINTER drags snap to the nearest value in `snaps` when within `snapRadius`
 *   of it (radius defaults to 6% of the track range; pass `snapRadius` in
 *   track units to override — wide ranges like ±180° need a small absolute
 *   radius or values near a snap become unreachable). Values between snaps
 *   stay free, so custom values are still reachable by dragging.
 * - KEYBOARD stepping is exact and never snaps. Snapping used to run on every
 *   change event, so from a snap point ArrowRight produced `snap + step`, which
 *   was inside the snap radius and was pulled straight back — the slider was a
 *   keyboard trap for every caller that passes `snaps`. Keys are handled here
 *   (see utils/sliderKeys.js) and `preventDefault`ed, so the native change
 *   never fires and the value the user asked for is the value they get: arrows
 *   move one step, PageUp/PageDown a tenth of the range, Home/End the ends.
 *   The snap function only ever sees values produced with a pointer down on
 *   the track, which is the affordance it exists for.
 * - Double-click the track resets to `defaultValue`.
 * - Clicking the value text swaps it for a number input clamped to
 *   [inputMin ?? min, inputMax ?? max] — this is how values beyond the
 *   track range (e.g. 1024px icon size on a 12–128 track) are entered.
 * - `trackGradient` paints a CSS gradient along the track so it previews what
 *   the slider does (see PaletteBuilder's adjust bar). Purely additive: with
 *   no gradient supplied the input keeps the plain platform track every other
 *   caller already renders — the gradient styling hangs off `.snapv--grad`,
 *   which is only applied when a gradient is present. Snap ticks are drawn on
 *   top of the gradient from `snaps`, so the reference marks survive whatever
 *   colour lands underneath them.
 * - `handleColor` makes the CENTRE of the thumb a window onto the track colour
 *   at the thumb's own position, so the dot reads as a lens on the bar rather
 *   than a white disc covering it. The caller must derive it from the SAME
 *   stops it built `trackGradient` from (see colors.js adjustTrackStops /
 *   sampleAdjustTrack) — that is what makes disagreement impossible. Ignored
 *   without a gradient: a plain platform slider has no track colour to show.
 */

// Snap ticks as a background layer: a dark-light-dark 3px mark, which stays
// visible against any track colour in either theme without relying on a token
// that flips with the theme (the track underneath is palette colour, not
// surface colour, so a theme-aware tick would vanish half the time).
function tickLayers(snaps, min, max) {
  if (!snaps.length || !(max > min)) return ''
  return snaps
    .filter(s => s > min && s < max)
    .map(s => {
      const p = ((s - min) / (max - min)) * 100
      return 'linear-gradient(90deg,'
        + `transparent calc(${p}% - 2px),rgba(0,0,0,.45) calc(${p}% - 2px),`
        + `rgba(0,0,0,.45) calc(${p}% - 1px),rgba(255,255,255,.92) calc(${p}% - 1px),`
        + `rgba(255,255,255,.92) calc(${p}% + 1px),rgba(0,0,0,.45) calc(${p}% + 1px),`
        + `rgba(0,0,0,.45) calc(${p}% + 2px),transparent calc(${p}% + 2px))`
    })
    .join(',')
}

export default function SnapSlider({
  id,
  min,
  max,
  step = 1,
  value,
  defaultValue,
  snaps = [],
  snapRadius,
  unit = '',
  inputMin,
  inputMax,
  decimals = 0,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
  trackGradient = null,
  handleColor = null,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  // True only while a pointer is down on the track. Magnetism is a pointer
  // affordance — it exists so a drag can find a snap without pixel precision —
  // so this flag is what gates it. A stale `true` (pointer released off the
  // element) is harmless: it can only affect the next pointer interaction,
  // which would snap anyway, and every keyboard step clears it.
  const pointerRef = useRef(false)
  const endPointer = () => { pointerRef.current = false }

  const loBound = inputMin ?? min
  const hiBound = inputMax ?? max
  const edited = defaultValue != null && Number(value) !== Number(defaultValue)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const fmt = v => (decimals > 0 ? (+v).toFixed(decimals).replace(/\.?0+$/, '') : String(Math.round(+v)))

  const snapValue = raw => {
    if (!snaps.length) return raw
    const radius = snapRadius ?? (max - min) * 0.06
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

  // The caller memoises the gradient, so `track` is stable across value-only
  // drag frames. `lens` deliberately is NOT — it tracks the handle, so it moves
  // every frame of a drag. Re-running the ref costs two function calls and no
  // DOM churn; the custom properties are written on the element rather than as
  // an inline `style` attribute, per the CSS conventions.
  const track = trackGradient
    ? [tickLayers(snaps, min, max), trackGradient].filter(Boolean).join(',')
    : null
  // The lens colour only means anything on a painted track, so it is tied to
  // the gradient: no gradient, no custom thumb, and every other consumer of
  // SnapSlider keeps the platform thumb it has today.
  const lens = trackGradient && typeof handleColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(handleColor)
    ? handleColor
    : null
  const trackRef = useCallback((el) => {
    if (!el) return
    if (track) el.style.setProperty('--snapv-track', track)
    else el.style.removeProperty('--snapv-track')
    if (lens) el.style.setProperty('--snapv-handle', lens)
    else el.style.removeProperty('--snapv-handle')
  }, [track, lens])

  return (
    <span
      className={`snapv${trackGradient ? ' snapv--grad' : ''}${edited ? ' snapv--edited' : ''}${className ? ` ${className}` : ''}`}
      data-edited={edited || undefined}
      ref={trackRef}
    >
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={trackValue}
        disabled={disabled}
        aria-label={ariaLabel}
        onPointerDown={() => { pointerRef.current = true }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onBlur={endPointer}
        onChange={e => onChange(pointerRef.current ? snapValue(+e.target.value) : +e.target.value)}
        onKeyDown={e => {
          // Modified presses stay with the browser / assistive tech, and never
          // step twice.
          if (e.altKey || e.ctrlKey || e.metaKey) return
          const next = stepFromKey(e.key, { value: trackValue, min, max, step })
          if (next === null) return
          // Stop the native handler: it would emit the same move through
          // onChange, where the snap would eat it. This is the fix.
          e.preventDefault()
          pointerRef.current = false
          if (next !== trackValue) onChange(next)
        }}
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
