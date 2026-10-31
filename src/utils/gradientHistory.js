// The gradient generator's Back history (spec gradient-overhaul §10, §11).
//
// Pure functions over an array, newest last, at most HISTORY_DEPTH long. The page
// keeps the array in a ref: it pushes the look it is about to replace (before a
// Random roll, a preset or Reset) and pops on Back. Nothing here touches React, so
// the rules can be asserted without a page.

/** How many earlier looks Back can return to. */
export const HISTORY_DEPTH = 10

/**
 * A look as the history keeps it: the stops (colour, position and the lock flags they
 * carry), type, angle and interpolation. The stops are copied, so a later edit to the
 * page's stops cannot reach back into the history.
 */
export function snapshotLook({ stops, type, angle, space }) {
  return { stops: stops.map((s) => ({ ...s })), type, angle, space }
}

/** Whether two looks are the same gradient, lock flags included. */
export function sameLook(a, b) {
  if (!a || !b) return false
  if (a.type !== b.type || a.angle !== b.angle || a.space !== b.space) return false
  if (a.stops.length !== b.stops.length) return false
  return a.stops.every((s, i) => JSON.stringify(s) === JSON.stringify(b.stops[i]))
}

/**
 * The history with `look` added as the newest entry. A look equal to the newest one
 * is not added (pressing Reset twice leaves one step back, not two), and the oldest
 * falls off once there are more than HISTORY_DEPTH. Returns a new array.
 */
export function pushLook(history, look) {
  const entry = snapshotLook(look)
  if (history.length && sameLook(history[history.length - 1], entry)) return history
  return [...history, entry].slice(-HISTORY_DEPTH)
}

/**
 * Step back: `look` is the newest entry (null when the history is empty, which is when
 * Back is disabled) and `history` is what remains. Returns a new array.
 */
export function popLook(history) {
  if (!history.length) return { look: null, history }
  return { look: history[history.length - 1], history: history.slice(0, -1) }
}

/** Whether Back has anywhere to go. */
export const canGoBack = (history) => history.length > 0
