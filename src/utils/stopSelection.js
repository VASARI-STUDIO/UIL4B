// The rules for selecting several gradient stops at once. Pure, so they are
// asserted without a browser; GradientGenerator holds the state and the events.
//
// A selection is a list of stop indices (positions in the `stops` array, not
// positions on the rail). Fewer than two selected is just "the active stop".

import { rangeBetween } from '../hooks/useShiftSelect.js'

/** Stop indices in rail order, left to right; equal positions keep list order. */
export function railOrder(stops) {
  return stops
    .map((s, i) => ({ i, p: s.position }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((o) => o.i)
}

/** Shift+click: every stop from `anchor` to `target` along the rail, ends included. */
export function rangeOf(stops, anchor, target) {
  return rangeBetween(railOrder(stops), anchor, target)
}

/**
 * Ctrl/Cmd+click: add `target` to `current`, or take it out if it is there.
 * The result is in index order. It can come back empty (the last stop was
 * toggled off); the caller keeps the selection in that case.
 */
export function toggleIn(current, target) {
  const next = current.includes(target) ? current.filter((i) => i !== target) : [...current, target]
  return next.sort((a, b) => a - b)
}

/**
 * Move the stops in `idxs` by `delta` percent, together. The move is clamped as
 * a group, so the leftmost stop stops at 0 and the rightmost at 100 and the
 * spacing between them never changes. Returns a new stops array.
 */
export function shiftGroup(stops, idxs, delta) {
  if (!idxs.length) return stops
  const at = idxs.map((i) => Math.round(stops[i].position))
  const clamped = Math.max(-Math.min(...at), Math.min(100 - Math.max(...at), delta))
  if (!clamped) return stops
  return stops.map((s, i) => (idxs.includes(i) ? { ...s, position: Math.round(s.position) + clamped } : s))
}

/**
 * Which of `idxs` can go without leaving fewer than `min` stops. The first ones
 * in index order are removed; `blocked` says the selection was cut short.
 */
export function removable(total, idxs, min = 2) {
  const room = Math.max(0, total - min)
  const sorted = [...idxs].sort((a, b) => a - b)
  return { remove: sorted.slice(0, room), blocked: sorted.length > room }
}
