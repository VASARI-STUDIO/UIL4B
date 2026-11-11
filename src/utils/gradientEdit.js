// Pure rules for editing a gradient's stops, kept out of the page module so a
// unit test can reach them without React: hex text from the stop field, the
// colour a new stop starts with, and whether a preset still matches the look.
import { colourAt } from './gradientScore.js'

const HEX_TEXT = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** '2f6bff', ' #26F ' or '#2F6BFF' becomes '#RRGGBB' in capitals; anything else is null. */
export function normaliseHex(raw) {
  const m = HEX_TEXT.exec(String(raw ?? '').trim())
  if (!m) return null
  const digits = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]
  return `#${digits.toUpperCase()}`
}

/** The colour a stop added at `pct` takes: the ramp's own colour there, blended in `space` ('oklch' or 'srgb'), so the gradient looks the same after the add. */
export function newStopColour(stops, pct, space) {
  const ramp = [...stops].sort((a, b) => a.position - b.position)
  return colourAt(ramp, pct, space)
}

const same = (a, b) => a.color.toUpperCase() === b.color.toUpperCase() && Math.round(a.position) === Math.round(b.position)

/** True while the gradient in the editor is still `preset`: type, stops, interpolation and, for Linear and Conic, angle. */
export function presetMatches(preset, look) {
  if (preset.type !== look.type) return false
  if (preset.space && preset.space !== look.space) return false
  if (preset.type !== 'Radial' && Math.round(preset.angle) !== Math.round(look.angle)) return false
  if (preset.stops.length !== look.stops.length) return false
  const byPosition = (list) => [...list].sort((a, b) => a.position - b.position)
  const want = byPosition(preset.stops)
  const have = byPosition(look.stops)
  return want.every((s, i) => same(s, have[i]))
}
