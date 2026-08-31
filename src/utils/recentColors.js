// Colours the user has recently committed from a ColorPickerPop, anywhere in
// the app. One list, shared across every picker — the Palette Builder swatch
// editor, the gradient stops and the icon colour — because a colour you just
// mixed is a colour you are likely to want again in the next tool, and picking
// it a second time by eye is the tedious part of building a system.
//
// Local only, like `recentIcons`. No account, no sync: this is a convenience,
// and a convenience that needs a network round trip is not one.
const KEY = 'vs-recent-colors'
const MAX = 12

const HEX = /^#[0-9a-f]{6}$/

/**
 * The stored list, newest first.
 *
 * Shape-checked rather than trusted. `JSON.parse(...) || fallback` only catches
 * null — a stale schema or a hand-restored data export can hand back a valid
 * JSON *object* where an array was expected, which then throws on the next
 * write. That exact fault white-screened the whole app once already, from
 * `vs-analytics`; the fix is the same one.
 */
export function getRecentColors() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c) => typeof c === 'string' && HEX.test(c)).slice(0, MAX)
  } catch {
    return []
  }
}

/**
 * Record a colour as most-recently-used. Returns the new list so a caller can
 * render it without a second read.
 *
 * Case is normalised because the app is inconsistent about it — the gradient
 * stops uppercase their hex, the picker emits lowercase — and two spellings of
 * one colour would take two slots in a twelve-slot list.
 */
export function addRecentColor(hex) {
  const value = typeof hex === 'string' ? hex.trim().toLowerCase() : ''
  if (!HEX.test(value)) return getRecentColors()
  const next = [value, ...getRecentColors().filter((c) => c !== value)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // A full or blocked store must never break picking a colour.
  }
  return next
}
