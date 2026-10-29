// The customiser's export size: the five free presets, the custom range, and what
// counts as a Pro setting. DOM-free so the rules are testable on their own.

/** The sizes the rail draws, and the only ones a free viewer can export. */
export const ICON_SIZE_PRESETS = Object.freeze([16, 20, 24, 32, 48])

/** What a fresh open exports at: the grid size of every outline pack here. */
export const DEFAULT_EXPORT_SIZE = 24

/** The custom field's range, in pixels. */
export const CUSTOM_SIZE_MIN = 8
export const CUSTOM_SIZE_MAX = 1024

/** Below this viewport width the rail drops the 20 cell (it stays reachable as a custom size). */
export const NARROW_RAIL_BELOW = 360

/** The size the stage draws the icon at, whatever the export size. */
export const INSPECT_PX = 112
export const INSPECT_PX_SHEET = 88

export const isPresetSize = (n) => ICON_SIZE_PRESETS.includes(Number(n))

/** The presets the rail shows: all five, or four when the row is too narrow for six cells. */
export const railPresets = (narrow) => (narrow ? ICON_SIZE_PRESETS.filter((n) => n !== 20) : ICON_SIZE_PRESETS)

/**
 * Read what was typed into the custom field.
 *   null                          empty or not a number: the caller reverts to the last size
 *   { value, clamped, typed }     an integer inside 8 to 1024; `clamped` when it was moved there
 * Digits only, so "4e2" and "12.5" are not read as sizes.
 */
export function parseCustomSize(raw) {
  const text = String(raw ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const typed = Number(text)
  const value = Math.min(CUSTOM_SIZE_MAX, Math.max(CUSTOM_SIZE_MIN, typed))
  return { value, clamped: value !== typed, typed }
}

/**
 * Whether the viewer's current settings include something only Pro can export.
 * A committed size that is not one of the five presets is a Pro setting for a
 * viewer who is not Pro; a preset never is, and Pro viewers have none. The line
 * style joins this check in the Pro preview slice.
 */
export function isProSetting({ size, isPro }) {
  if (isPro) return false
  return !isPresetSize(size)
}
