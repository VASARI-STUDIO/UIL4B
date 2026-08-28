// How the gradient randomiser weights its roll.
//
// Founder request (2026-08-08): a two-stop LINEAR gradient should come up
// slightly more often than the rest — "a weighting, not an exclusion". Every
// type and both stop counts still appear; one combination is simply favoured.
//
// Before, type was uniform over three and the stop count uniform over two, so
// a two-stop linear was 1/3 × 1/2 = 16.7% — tied with every other combination
// for least likely. The shape below makes it 30%:
//
//   type   Linear 50% · Radial 25% · Conic 25%
//   stops  2 at 60% · 3 at 40%
//
//   2-stop linear  30%   ← favoured
//   3-stop linear  20%
//   2-stop radial  15%     2-stop conic  15%
//   3-stop radial  10%     3-stop conic  10%
//
// Both pickers take the roll as an argument rather than calling Math.random
// themselves. That is the whole reason the distribution can be asserted in
// tests/unit/gradient-random.test.js without stubbing a global.

export const GRAD_TYPE_WEIGHTS = [
  ['Linear', 2],
  ['Radial', 1],
  ['Conic', 1],
]

/** Share of rolls that produce a two-stop gradient rather than a three-stop one. */
export const TWO_STOP_SHARE = 0.6

/**
 * Pick from `[value, weight]` pairs using a roll in [0, 1).
 *
 * The roll is clamped rather than trusted: `Math.random()` never returns 1, but
 * a caller that passes one — or a rounding error on the final band — would walk
 * off the end of the list and return undefined, which reaches the UI as a
 * gradient with no type at all.
 */
export function weightedPick(weights, roll) {
  const total = weights.reduce((sum, [, w]) => sum + w, 0)
  if (!total) return undefined
  let target = Math.min(Math.max(roll, 0), 0.999999) * total
  for (const [value, weight] of weights) {
    target -= weight
    if (target < 0) return value
  }
  return weights[weights.length - 1][0]
}

/** Gradient type for one roll in [0, 1). */
export function pickGradientType(roll) {
  return weightedPick(GRAD_TYPE_WEIGHTS, roll)
}

/** Stop count for one roll in [0, 1) — 2 or 3, never anything else. */
export function pickStopCount(roll) {
  return roll < TWO_STOP_SHARE ? 2 : 3
}
