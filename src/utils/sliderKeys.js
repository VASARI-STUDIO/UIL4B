// The pure value maths behind SnapSlider: exact keyboard stepping
// (`stepFromKey`) and magnetic pointer snapping (`snapToTarget`). Both halves
// live here, DOM-free, so the two behaviours that have each shipped a bug can
// be unit-tested against the real track configurations.
//
// WHY THIS EXISTS (the bug it fixes): SnapSlider re-snapped on EVERY change
// event, including the ones the browser fires for arrow keys. From a snap
// point, ArrowRight emitted `snap + step`, which was inside the snap radius, so
// it was immediately pulled back to the snap — a keyboard user could not move
// the four Palette Builder adjust sliders off a snap at all, and the same trap
// applied to every other SnapSlider whose caller passes `snaps`.
//
// Magnetic snapping is deliberate for POINTER drags (see the ADJUST_FIELDS
// comment in PaletteBuilder.jsx for why the radii are tight), so the fix
// distinguishes the input MODALITY rather than weakening the snap: keyboard
// steps are computed here, exactly, and never pass through the snap function.
//
// Pure and DOM-free so the stepping contract is unit-testable.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.

// How many decimals a step implies — `0.05` → 2. Guards the float drift that
// makes 0.1 + 0.2 land on 0.30000000000000004 in a readout.
function decimalsOf(step) {
  const text = String(step)
  if (text.includes('e') || text.includes('E')) return 6
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Land on the step grid the native input would use — measured from `min`, the
// same origin the platform uses, so a snap point on the grid stays reachable.
function quantise(value, min, step) {
  if (!(step > 0)) return value
  const grid = min + Math.round((value - min) / step) * step
  return Number(grid.toFixed(decimalsOf(step)))
}

/**
 * Magnetic pointer snapping — the value a POINTER drag should produce.
 *
 * WHY THE SHAPE MATTERS (the bug this fixes): the original was a hard step —
 * return the snap inside `snapRadius`, return `raw` outside — so the output
 * jumped by a whole `snapRadius` the instant the pointer crossed the boundary.
 * On Temperature (±100 track, radius 6, ~136px wide at 1440) that was a ~7px
 * dead band mid-track followed by a 7-unit leap: the rendered value went
 * 7 → 0 → −7 and every value between was unreachable by pointer. #209 doubled
 * TEMP_MAX_PULL, so that leap started recolouring the whole board in one frame.
 *
 * The fix is a CONTINUOUS pull: the snap's influence is weighted `(1 - d/r)³`,
 * which is 1 at the snap (full magnetism) and reaches 0 — with zero slope — at
 * the radius. So `|raw - snap| == radius` returns exactly `raw` and there is no
 * boundary to jump across.
 *
 * The exponent is the whole design. Gain (output units per input unit) peaks at
 * ~1.25 and returns to exactly 1 at the radius, so the value can never outrun
 * the pointer by more than a quarter — that is what bounds how many values a
 * drag skips. A hard core followed by an eased ramp (the obvious alternative)
 * peaks at 2–3 instead and skips proportionally more. Squared holds the snap
 * harder but measurably skips more mid-radius values on the real 120px
 * Temperature track; anything flatter than cubed stops pulling at ±1, which is
 * the magnetism the affordance exists for.
 *
 * The result is quantised onto the same step grid the native input uses, so a
 * pointer parked within half a step of a snap yields the snap EXACTLY — the
 * lock-on that makes the affordance feel magnetic, and what keeps `defaultValue`
 * equality (the "edited" dot) honest.
 *
 * Keyboard input never comes here — see the modality note above.
 */
export function snapToTarget(raw, { snaps = [], snapRadius, min, max, step = 1 } = {}) {
  if (!snaps.length) return raw
  const radius = snapRadius ?? (max - min) * 0.06
  if (!(radius > 0)) return raw
  let best = null
  for (const s of snaps) {
    const d = Math.abs(raw - s)
    if (d <= radius && (best === null || d < Math.abs(raw - best))) best = s
  }
  if (best === null) return raw
  const fade = 1 - Math.abs(raw - best) / radius
  const weight = fade * fade * fade
  return quantise(raw + (best - raw) * weight, min, step > 0 ? step : 1)
}

/**
 * The PageUp/PageDown jump: a whole number of steps closest to a tenth of the
 * range, never smaller than one step. Hue (±180, step 1) → 36; the ±100 tracks
 * → 20.
 */
export function pageStepFor(min, max, step) {
  const span = max - min
  if (!(step > 0) || !(span > 0)) return step > 0 ? step : 1
  return Math.max(step, Math.round(span / 10 / step) * step)
}

/** Keys this module handles — anything else is left to the browser. */
export const SLIDER_KEYS = new Set([
  'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown',
  'PageUp', 'PageDown', 'Home', 'End',
])

/**
 * The exact value a slider key should produce, or `null` when the key isn't a
 * slider key (so the caller leaves the event alone).
 *
 * Arrow keys move by exactly one step and may land anywhere in the range —
 * including one step off a snap point, which is the whole point.
 */
export function stepFromKey(key, { value, min, max, step = 1 }) {
  if (!SLIDER_KEYS.has(key)) return null
  const unit = step > 0 ? step : 1
  const numeric = Number(value)
  const base = clamp(Number.isFinite(numeric) ? numeric : min, min, max)
  const move = (delta) => clamp(quantise(base + delta, min, unit), min, max)
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return move(unit)
    case 'ArrowLeft':
    case 'ArrowDown':
      return move(-unit)
    case 'PageUp':
      return move(pageStepFor(min, max, unit))
    case 'PageDown':
      return move(-pageStepFor(min, max, unit))
    case 'Home':
      return min
    case 'End':
      return max
    default:
      return null
  }
}
