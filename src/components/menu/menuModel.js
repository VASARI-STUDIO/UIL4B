// Pure rules for the shared menu: which rows can be reached, where a key goes,
// and where the panel sits. No DOM, so each is testable without a browser.
import { typeaheadTarget } from '../../utils/listboxKeys.js'

export const MENU_GAP = 8
export const MENU_EDGE = 16
export const POINTER_NUDGE = 2
export const LONG_PRESS_MS = 450

// Only `item` entries take focus. A row that is aria-disabled still does: it
// shows why it is off, and a keyboard user has to be able to land on it to read
// that. Separators, section labels, notes and the head are skipped.
export function reachableRows(items) {
  return items.filter((entry) => entry && typeof entry === 'object' && !entry.type)
}

// For a trigger's onKeyDown: Down and Up open the menu (first or last row), by
// keyboard. Enter and Space already open it through the button's own click.
// Returns 'first', 'last' or null; the caller opens with viaKeyboard.
export function menuOpenKey(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return null
  if (event.key === 'ArrowDown') return 'first'
  if (event.key === 'ArrowUp') return 'last'
  return null
}

// Menu key or Shift+F10 on a focused element: where a context menu should open.
export function keyboardPoint(el) {
  const box = el.getBoundingClientRect()
  return { x: box.left, y: box.bottom }
}

// Where a key sends the roving focus. `index` is the row now focused (-1 when
// focus is on the panel itself). Arrows wrap; Home and End jump. Returns the
// index to focus, or -1 to leave the key alone.
export function menuKeyTarget(key, index, count) {
  if (!count) return -1
  switch (key) {
    case 'ArrowDown': return index < 0 ? 0 : (index + 1) % count
    case 'ArrowUp': return index < 0 ? count - 1 : (index - 1 + count) % count
    case 'Home': return 0
    case 'End': return count - 1
    default: return -1
  }
}

// A printable key jumps to the next row whose label starts with what was typed
// in the last 500ms; a repeated letter cycles through the rows that share it.
// Returns { index, text, time }; index stays put when nothing matches.
export function menuTypeahead(key, index, rows, buffer, time) {
  const options = rows.map((row) => ({ label: row.label, disabled: false }))
  return typeaheadTarget(key, index, options, buffer, time)
}

// Placement. All rects are in viewport coordinates. `band` is the strip the
// page is visible in between fixed bars: { vw, minTop, maxBottom }.
//
// Anchored: below the trigger with an 8px gap, left edges together; right edges
// together when the trigger's centre is in the right half of the viewport. It
// flips above when the room below is less than the menu plus 16 and there is
// more room above. 16px stay between the panel and the viewport's sides. The
// height cap is the room on the chosen side less 16, and the panel scrolls
// inside it.
//
// Pointer: top-left at the pointer plus 2, flipping left and up at the edges.
export function placeMenu({ anchor, point, width, height, band }) {
  const { vw, minTop, maxBottom } = band
  const clampX = (x) => Math.max(MENU_EDGE, Math.min(x, vw - width - MENU_EDGE))
  if (anchor) {
    const roomBelow = Math.max(0, maxBottom - anchor.bottom - MENU_GAP)
    const roomAbove = Math.max(0, anchor.top - MENU_GAP - minTop)
    const above = roomBelow < height + MENU_EDGE && roomAbove > roomBelow
    const room = above ? roomAbove : roomBelow
    const maxHeight = Math.max(120, room - MENU_EDGE)
    const shown = Math.min(height, maxHeight)
    const end = anchor.left + anchor.width / 2 > vw / 2
    const left = clampX(end ? anchor.right - width : anchor.left)
    const top = above ? anchor.top - MENU_GAP - shown : anchor.bottom + MENU_GAP
    const originX = Math.max(0, Math.min(width, anchor.left + anchor.width / 2 - left))
    return { left, top, maxHeight, side: above ? 'top' : 'bottom', originX, originY: above ? shown : 0 }
  }
  const px = point.x + POINTER_NUDGE
  const py = point.y + POINTER_NUDGE
  const flipLeft = px + width > vw - MENU_EDGE && point.x - POINTER_NUDGE - width >= MENU_EDGE
  const maxHeight = Math.max(120, maxBottom - minTop - MENU_EDGE)
  const shown = Math.min(height, maxHeight)
  const flipUp = py + shown > maxBottom - MENU_EDGE && point.y - POINTER_NUDGE - shown >= minTop
  const left = clampX(flipLeft ? point.x - POINTER_NUDGE - width : px)
  const top = flipUp ? point.y - POINTER_NUDGE - shown : Math.max(minTop, Math.min(py, maxBottom - MENU_EDGE - shown))
  return { left, top, maxHeight, side: flipUp ? 'top' : 'bottom', originX: flipLeft ? width : 0, originY: flipUp ? shown : 0 }
}
