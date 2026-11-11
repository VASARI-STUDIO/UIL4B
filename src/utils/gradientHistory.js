// The gradient generator's Back and Redo history (spec gradient-overhaul §10, §11).
//
// Pure functions over arrays, newest last, at most HISTORY_DEPTH long. The page keeps
// a { past, future } pair in a ref: it records the look it is about to replace (before
// an edit, a Random roll, a preset or Reset), Back moves the newest past look onto the
// screen and the one it replaced onto `future`, and Redo moves it back. Any new edit
// empties `future`. Nothing here touches React, so the rules can be asserted without
// a page.

/** How many earlier looks Back can return to, and how many Redo can restore. */
export const HISTORY_DEPTH = 50

/**
 * Edits that arrive in a run (a held arrow key, the angle number being typed, a
 * colour picker drag) count as one step while they follow each other within this
 * many milliseconds, or while the pointer is still down.
 */
export const BURST_MS = 500

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

/** An empty history: nothing to go back to, nothing to redo. */
export const emptyHistory = () => ({ past: [], future: [] })

/** The history with `look` recorded as the newest past step. A new edit empties Redo. */
export const recordLook = (history, look) => ({ past: pushLook(history.past, look), future: [] })

/**
 * Back from `current`. Entries equal to `current` are dropped first, so a step that
 * changed nothing never makes Back a silent no-op. Returns the look to show (null when
 * there is none) and the new history, with `current` pushed onto Redo.
 */
export function undoLook(history, current) {
  let past = history.past
  while (past.length && sameLook(past[past.length - 1], current)) past = past.slice(0, -1)
  const { look, history: rest } = popLook(past)
  if (!look) return { look: null, history: { past, future: history.future } }
  return { look, history: { past: rest, future: pushLook(history.future, current) } }
}

/** Redo from `current`: the mirror of undoLook. */
export function redoLook(history, current) {
  let future = history.future
  while (future.length && sameLook(future[future.length - 1], current)) future = future.slice(0, -1)
  const { look, history: rest } = popLook(future)
  if (!look) return { look: null, history: { past: history.past, future } }
  return { look, history: { past: pushLook(history.past, current), future: rest } }
}

export const canUndo = (history) => canGoBack(history.past)
export const canRedo = (history) => canGoBack(history.future)

/**
 * Whether an edit under `key` at time `now` opens a new history step. `burst` is
 * { key, at, held }: the key and time of the last edit, and whether a pointer is down.
 * The same key continues the step while the pointer is held or the gap is short.
 */
export function startsBurst(burst, key, now, gap = BURST_MS) {
  if (burst.key !== key) return true
  return !burst.held && now - burst.at > gap
}

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'password', 'number'])

/** Whether an element takes typed text, where Ctrl or Cmd+Z belongs to the field. */
export function isTextEntry(el) {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = String(el.tagName || '').toUpperCase()
  if (tag === 'TEXTAREA') return true
  return tag === 'INPUT' && TEXT_INPUT_TYPES.has(String(el.type || '').toLowerCase())
}

/**
 * 'undo' for Ctrl or Cmd+Z, 'redo' for Shift+Ctrl or Cmd+Z and for Ctrl+Y, otherwise
 * null. Takes the fields of a KeyboardEvent.
 */
export function historyShortcut({ key, ctrlKey, metaKey, shiftKey, altKey }) {
  if (altKey || !(ctrlKey || metaKey)) return null
  const k = String(key).toLowerCase()
  if (k === 'z') return shiftKey ? 'redo' : 'undo'
  if (k === 'y' && ctrlKey && !metaKey && !shiftKey) return 'redo'
  return null
}
