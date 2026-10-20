// Reading a saved palette into the Colour Studio's model, without losing any of it.
//
// The studio describes a palette as a base colour and a harmony (which makes the
// role colours), per-slot overrides, and extra colours beyond the roles. The
// Palette Builder saves the finished list in `colors` instead. The two agree
// only for harmonies that make a full set: `generateHarmony(hex, 'auto')`
// returns the base colour alone, so rebuilding a five-colour Auto palette from
// base + harmony gave one colour, and the studio then wrote that one colour
// back over the project's palette.
//
// So the saved list is authoritative. Every slot the generator would not
// reproduce is pinned as an override (or kept as an extra), and the result is
// the same list, colour for colour. DOM-free so a unit test can pin it.

import { generateHarmony } from './colors.js'
import { readSavedPalette } from './paletteAdjust.js'

const up = (c) => String(c).toUpperCase()

/**
 * { overrides, extraColors, globalAdjust, roles } that make the studio's
 * base + harmony + overrides + extras equal the saved colours, or null when the
 * palette has fewer than two colours (nothing to preserve beyond the base).
 */
export function reconcileStudioPalette(palette, max = 10) {
  const saved = readSavedPalette(palette, max)
  if (!saved) return null
  const gen = generateHarmony(palette?.base || '#2563EB', palette?.harmony || 'auto')
  const extraCount = Array.isArray(palette?.extraColors) ? palette.extraColors.length : 0
  const roles = Math.max(1, saved.colors.length - extraCount)
  const overrides = {}
  for (let i = 0; i < roles; i++) {
    if (!gen[i] || up(gen[i]) !== up(saved.colors[i])) overrides[i] = saved.colors[i]
  }
  return { overrides, extraColors: saved.colors.slice(roles), globalAdjust: saved.adjust, roles }
}

/** The same colours in the same order, ignoring case. */
export function sameColours(a, b) {
  const x = Array.isArray(a) ? a : []
  const y = Array.isArray(b) ? b : []
  return x.length === y.length && x.every((c, i) => up(c) === up(y[i]))
}

/**
 * How many role slots the studio shows. A saved palette decides it: the slots
 * are exactly the saved colours that are not extras, so the generator never pads
 * a palette out to its own set (a four-colour palette whose stored harmony makes
 * five must stay four). With no saved palette the generator's set is the count.
 */
export const studioRoleCount = (generated, reconciled) =>
  reconciled ? reconciled.roles : (Array.isArray(generated) ? generated.length : 0)

/** The role colours: a pinned override where there is one, else the generator's. */
export const resolveStudioRoles = (generated, overrides, roleCount) =>
  Array.from({ length: roleCount }, (_, i) => (overrides || {})[i] || (generated || [])[i]).filter(Boolean)

/**
 * The studio's raw palette for a saved one: the role slots, then the extras.
 * This is the list the studio shows (before the global lens) and writes back.
 */
export function studioBaseColours(palette, max = 10) {
  const reconciled = reconcileStudioPalette(palette, max)
  const generated = generateHarmony(palette?.base || '#2563EB', palette?.harmony || 'auto')
  const overrides = reconciled ? reconciled.overrides : (palette?.overrides || {})
  const extras = reconciled ? reconciled.extraColors : (palette?.extraColors || [])
  return [...resolveStudioRoles(generated, overrides, studioRoleCount(generated, reconciled)), ...extras]
}
