// The tint ramp a project carries, and how it is derived from its colour.
//
// A project's "Tints" part is `design.tints.scale`: eleven hexes, 50 to 950, of
// the project's active colour. `tintsFor` is the one derivation every writer
// uses: the Colour Studio's generator (`generateTintScale`) with the project's
// three tint settings, so the Colour Studio, the Tint tool and a project
// finished without either open keep the same ramp for the same colour. The Tint
// tool's on-screen curves are a separate, display-only scale and are never what
// the project keeps.
//
// `tints.from` records the colour a ramp was made from, so a ramp left behind
// by a palette that has since changed can be told from a current one. DOM-free
// and React-free so a unit test can pin it.

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
 * The tints block (settings and the eleven-stop ramp) of `hex`, made with the
 * project's three tint settings (`saved`, falling back to the defaults).
 */
export function tintsFor(hex, saved) {
  const s = saved || {}
  const d = DEFAULT_DESIGN.tints
  const lumBias = Number.isFinite(Number(s.lumBias)) ? Number(s.lumBias) : d.lumBias
  const satDecay = Number.isFinite(Number(s.satDecay)) ? Number(s.satDecay) : d.satDecay
  const oled = typeof s.oled === 'boolean' ? s.oled : d.oled
  const scale = generateTintScale({
    hex, anchor: 5, hueShift: 0,
    satMin: -satDecay, satMax: satDecay / 2,
    lMin: oled ? 3 : 5, lMax: lumBias, mode: 'perceived',
  })
  return { lumBias, satDecay, oled, scale, from: hex }
}

/**
 * The tints block for this design's active colour, or null when it has no
 * colour to make one from.
 */
export function deriveTints(design) {
  const hex = activeColour(design)
  return hex ? tintsFor(hex, design?.tints) : null
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

/**
 * Should opening a page write a ramp for `hex`? Only when the project has none,
 * or its ramp was made from another colour; a current ramp, and a legacy one
 * with no record of its colour, are left as they are.
 */
export const tintsNeedWrite = (tints, hex) => !(Array.isArray(tints?.scale) && tints.scale.length > 0) || tintsStale(tints, hex)

/** Is the ramp recorded as made from the project's active colour? */
export function tintsCurrent(design) {
  const hex = activeColour(design)
  const from = design?.tints?.from
  return hasTints(design) && !!hex && typeof from === 'string' && HEX_RE.test(from) && sameHex(from, hex)
}
