// Keyboard stepping for range inputs — the exact-value half of SnapSlider.
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
