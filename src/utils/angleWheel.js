// The value maths behind the Gradient Generator's angle wheel, kept DOM-free so
// the pointer geometry and the keyboard steps can be unit-tested directly.
//
// Angles follow CSS: 0deg points up, 90deg points right, and the value grows
// clockwise. The wheel stores whole degrees in 0-359, so 360 and 0 are the same
// stop and a step past either end wraps round instead of sticking.

export const ANGLE_STEP = 1
export const ANGLE_STEP_BIG = 15

/** A whole-degree angle in 0-359. Non-numbers read as 0. */
export function normaliseAngle(deg) {
  const n = Math.round(Number(deg))
  if (!Number.isFinite(n)) return 0
  return ((n % 360) + 360) % 360
}

/**
 * The angle of a pointer position around a centre, clockwise from straight up.
 * Returns null when the pointer is exactly on the centre, where no direction
 * exists and the wheel should keep its current value.
 */
export function angleFromPoint(cx, cy, x, y) {
  const dx = x - cx
  const dy = y - cy
  if (dx === 0 && dy === 0) return null
  return normaliseAngle((Math.atan2(dx, -dy) * 180) / Math.PI)
}

/** Snap an angle to the nearest multiple of `step` (Shift while dragging). */
export function snapAngle(deg, step = ANGLE_STEP_BIG) {
  if (!(step > 0)) return normaliseAngle(deg)
  return normaliseAngle(Math.round(Number(deg) / step) * step)
}

/**
 * The next angle for a key press, or null when the key is not one the wheel
 * handles. Arrows move 1 degree (15 with Shift), Right/Up clockwise and
 * Left/Down anticlockwise; PageUp/PageDown move 15; Home is 0 and End is 359.
 */
export function stepAngle(value, key, shiftKey = false) {
  const current = normaliseAngle(value)
  const size = shiftKey ? ANGLE_STEP_BIG : ANGLE_STEP
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return normaliseAngle(current + size)
    case 'ArrowLeft':
    case 'ArrowDown':
      return normaliseAngle(current - size)
    case 'PageUp':
      return normaliseAngle(current + ANGLE_STEP_BIG)
    case 'PageDown':
      return normaliseAngle(current - ANGLE_STEP_BIG)
    case 'Home':
      return 0
    case 'End':
      return 359
    default:
      return null
  }
}

/**
 * Read a typed angle. Accepts whole or decimal numbers with an optional trailing
 * degree sign, and wraps them into 0-359 (370 reads as 10, -10 as 350). Returns
 * null for anything that is not a number, so a half-typed value changes nothing.
 */
export function parseAngleInput(text) {
  const raw = String(text ?? '').trim().replace(/°$/, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null
  return normaliseAngle(Number(raw))
}
