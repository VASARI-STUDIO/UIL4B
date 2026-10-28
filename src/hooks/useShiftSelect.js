import { useCallback } from 'react'

// Multi-select with the modifier keys a pointer has, and a plain tap where it
// has none.
//
//   fine pointer   click = only this value · Shift/Ctrl/Cmd+click = add or remove
//   coarse pointer tap = add or remove (there is no Shift on a phone)
//   keyboard       Space/Enter = only this · Shift+Space/Enter = add or remove
//
// The selection logic is pure and exported, so it is asserted without a browser.
// `any` is the exclusive "no restriction" value: picking it clears the rest, and
// adding another value clears it. An empty set cannot exist; it falls back to
// `fallback` (the `any` value, or Plain for a group that has no Any).

/** The next selection after `value` is pressed. `mode` is 'only' or 'toggle'. */
export function nextSelection(current, value, { mode = 'only', any = null, fallback = any } = {}) {
  if (value === any && any != null) return [any]
  if (mode === 'only') return [value]
  const without = current.filter((v) => v !== any)
  const next = without.includes(value) ? without.filter((v) => v !== value) : [...without, value]
  return next.length ? next : (fallback == null ? [] : [fallback])
}

/** The stops between two positions in position order, both ends included. */
export function rangeBetween(order, a, b) {
  const i = order.indexOf(a)
  const j = order.indexOf(b)
  if (i < 0 || j < 0) return b == null || j < 0 ? [] : [b]
  const [lo, hi] = i <= j ? [i, j] : [j, i]
  return order.slice(lo, hi + 1)
}

/** Which mode a press means: from the event's modifiers, or always 'toggle' on touch. */
export function modeFor(event, coarse) {
  if (coarse) return 'toggle'
  return event && (event.shiftKey || event.ctrlKey || event.metaKey) ? 'toggle' : 'only'
}

/**
 * A group of toggle buttons that can hold more than one value.
 * `select(value, event)` applies a press; `isOn(value)` is the pressed state.
 */
export default function useShiftSelect({ value, onChange, any = null, fallback = any, coarse = false }) {
  const select = useCallback((v, event) => {
    onChange(nextSelection(value, v, { mode: modeFor(event, coarse), any, fallback }))
  }, [value, onChange, any, fallback, coarse])
  const isOn = useCallback((v) => value.includes(v), [value])
  return { select, isOn }
}
