// The tint ramp a project carries, and how it is derived from its colour.
//
// A project's "Tints" part is `design.tints.scale`: eleven hexes, 50 to 950, of
// the project's active colour. The Colour Studio has always written it (from the
// active palette colour and the project's three tint settings), but a project
// can reach "finished" without that page ever opening, and the Tint tool did not
// write it at all, so the part stayed empty however the system was built.
//
// This is the one derivation both ends use: the same generator and the same
// settings the Colour Studio uses, so a ramp made here and a ramp made there for
// the same colour are the same ramp. `tints.from` records the colour a ramp was
// made from, so a ramp left behind by a palette that has since changed can be told
// from a current one. DOM-free and React-free so a unit test can
// pin it.

import { generateTintScale } from './colors.js'
import { DEFAULT_DESIGN } from '../data/designDefaults.js'

const HEX_RE = /^#[0-9a-f]{6}$/i

/** The colour a project's tints are made from: its active palette colour, else its base. */
export function activeColour(design) {
  const palette = design?.palette || {}
  const colors = Array.isArray(palette.colors) ? palette.colors.filter((c) => HEX_RE.test(String(c))) : []
  const idx = Number.isInteger(palette.activeIdx) ? palette.activeIdx : 0
  return colors[idx] || colors[0] || (HEX_RE.test(String(palette.base)) ? palette.base : null)
}

/**
 * The tints block (settings and the eleven-stop ramp) for this design, or null
 * when it has no colour to make one from.
 */
export function deriveTints(design) {
  const hex = activeColour(design)
  if (!hex) return null
  const saved = design?.tints || {}
  const d = DEFAULT_DESIGN.tints
  const lumBias = Number.isFinite(Number(saved.lumBias)) ? Number(saved.lumBias) : d.lumBias
  const satDecay = Number.isFinite(Number(saved.satDecay)) ? Number(saved.satDecay) : d.satDecay
  const oled = typeof saved.oled === 'boolean' ? saved.oled : d.oled
  const scale = generateTintScale({
    hex, anchor: 5, hueShift: 0,
    satMin: -satDecay, satMax: satDecay / 2,
    lMin: oled ? 3 : 5, lMax: lumBias, mode: 'perceived',
  })
  return { lumBias, satDecay, oled, scale, from: hex }
}

/** Does this design already carry a ramp? */
export const hasTints = (design) => Array.isArray(design?.tints?.scale) && design.tints.scale.length > 0

const sameHex = (a, b) => String(a).toUpperCase() === String(b).toUpperCase()

/**
 * Was this ramp made from some other colour than `hex`? True only when the ramp
 * records the colour it was made from (`from`) and that colour differs. A ramp
 * with no record (made before `from` was kept) is not called stale: nothing says
 * which colour it came from, so opening a page leaves it alone.
 */
export function tintsStale(tints, hex) {
  if (!Array.isArray(tints?.scale) || tints.scale.length === 0) return false
  if (typeof tints.from !== 'string' || !HEX_RE.test(tints.from) || !hex) return false
  return !sameHex(tints.from, hex)
}

/** Is the ramp recorded as made from the project's active colour? */
export function tintsCurrent(design) {
  const hex = activeColour(design)
  const from = design?.tints?.from
  return hasTints(design) && !!hex && typeof from === 'string' && HEX_RE.test(from) && sameHex(from, hex)
}
