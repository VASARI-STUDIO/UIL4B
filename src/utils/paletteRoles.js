// What each palette slot actually IS, per colour system.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG
// ─────────────────────────────────────────────────────────────────────────────
// PaletteBuilder labelled its five columns from one fixed array:
//
//   ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']
//
// applied left-to-right regardless of the system. Those names are CORRECT for
// the `auto` tonal engine — autoTonalFromSeed's own comments name its five
// outputs exactly that — and wrong for almost everything else, because
// generateHarmony emits a different shape per system:
//
//   complement    seed, +180°, seed lighter, +180° lighter, seed darker
//   analogous     seed, −30°, +30°, −15° lighter, +15° lighter
//   triadic       seed, +120°, +240°, seed lighter, +120° lighter
//   split         seed, +150°, +210°, seed lighter, +180° darker
//   tetradic      seed, +90°, +180°, +270°, seed darker
//   monochromatic seed, lighter, lightest, darker, darkest
//   custom        seed, +60°, +180°, seed lighter, seed darker
//
// So on an analogous palette, column 4 was labelled SUBTLE when it is a
// softened −15° analogous, and column 2 read SECONDARY when it is a distinct
// hue 30° away. The founder's report: "all systems say the same from left to
// right… the subtle colour of the primary should be called subtle, or the
// colour shown in the slot should be the subtle colour."
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS ONLY CHANGES THE LABEL
// ─────────────────────────────────────────────────────────────────────────────
// `ROLES[i]` is not only a caption — PaletteBuilder also lowercases it into the
// EXPORT TOKEN NAMES (`--color-primary`, `--color-subtle`, …), and the tint
// panel and UI preview key off the same slot identity. Making those vary by
// system would rename a user's CSS variables every time they tried a different
// harmony, and break any stylesheet already consuming them.
//
// So the slot identity stays fixed and stable, and this supplies the DISPLAY
// label only. That is also the distinction PaletteBuilder's own comment already
// drew; the display side simply never got built.
//
// DOM-free and React-free.

import { TINT_LABELS, tintLabelsFor } from './tintLabels.js'
import { activeColour, tintsCurrent } from './projectTints.js'

// The tonal engine's five outputs, which the original array was written for and
// which are accurate for it.
const AUTO = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']

// Each entry mirrors its generateHarmony branch in order. Where a slot is a
// lightened or darkened version of another slot, the label says which — that is
// the specific thing the founder asked for.
export const HARMONY_ROLE_LABELS = Object.freeze({
  auto: AUTO,
  complement: ['PRIMARY', 'COMPLEMENT', 'PRIMARY SOFT', 'COMPLEMENT SOFT', 'PRIMARY DEEP'],
  analogous: ['PRIMARY', 'ANALOGOUS −30°', 'ANALOGOUS +30°', 'SOFT −15°', 'SOFT +15°'],
  triadic: ['PRIMARY', 'TRIAD 2', 'TRIAD 3', 'PRIMARY SOFT', 'TRIAD 2 SOFT'],
  split: ['PRIMARY', 'SPLIT 1', 'SPLIT 2', 'PRIMARY SOFT', 'COMPLEMENT DEEP'],
  tetradic: ['PRIMARY', 'TETRAD 2', 'TETRAD 3', 'TETRAD 4', 'PRIMARY DEEP'],
  monochromatic: ['BASE', 'LIGHT', 'LIGHTER', 'DARK', 'DARKER'],
  custom: ['PRIMARY', 'ACCENT +60°', 'COMPLEMENT', 'PRIMARY SOFT', 'PRIMARY DEEP'],
})

/**
 * The display label for slot `index` under `harmony`.
 *
 * Columns past the generated five are user-added, so they belong to no system
 * and are numbered rather than given a role they do not have.
 */
export function roleLabel(harmony, index) {
  const set = HARMONY_ROLE_LABELS[harmony] || AUTO
  if (index < set.length) return set[index]
  return `ALTERNATIVE ${index - set.length + 1}`
}

// Where each of the five slots paints in the Palette Builder's preview (the
// elements that carry its data-role in components/palette/PalettePreview.jsx),
// by slot position, the same identity the CSS export uses. A template prints this
// as the `lands` line under a swatch; it never works the places out itself.
export const SLOT_LANDS = Object.freeze([
  'Buttons, links, selected tabs and toggles',
  'Progress bars and logged-time dots',
  'Today markers and the accent circle',
  'Hero panels and soft backgrounds',
  'The deepest band and its dots',
])

/** The places slot `index` paints. A colour added past the five has no place yet. */
export function slotLands(index) {
  return Number.isInteger(index) && index >= 0 && index < SLOT_LANDS.length
    ? SLOT_LANDS[index]
    : 'Not given a place in the preview'
}

/** True when slot `index` has a place in SLOT_LANDS (the first five slots). */
export const slotPlaced = (index) => Number.isInteger(index) && index >= 0 && index < SLOT_LANDS.length

/** The same line for a printed document, whose reader never saw the Palette Builder's preview. */
export function slotLandsBook(index) {
  return slotPlaced(index) ? SLOT_LANDS[index] : 'Not assigned to a part of the interface'
}

/** Every label for a system — used by the tests and by any summary view. */
export function roleLabels(harmony) {
  return HARMONY_ROLE_LABELS[harmony] || AUTO
}

// ── Role and shade names for a colour in the project's palette ──────────────
// "Primary 500", "Secondary 300": the stable slot identity (the same names the
// exports print), not the per-system display label above. What the project
// holds decides what can be named. `design.palette.colors` is a list of hexes,
// and a colour's role is its place in it. `design.tints.scale` is ONE ramp
// (50 to 950) of the active colour only; other steps exist for the active
// colour alone. A colour that matches neither is "Custom".
//
// The ramp's own 500 is only close to the palette colour (the tint engine
// re-derives it), and a very dark or light colour repeats hexes down the ramp.
// So the shades the tool offers are `activeShades`: the 500 step IS the palette
// colour, and a hex that is already offered (the palette colour, another palette
// colour, an earlier step) is not offered again. One hex then has one name: the
// palette colour first, then the lowest step that offers it.

const HEX_RE = /^#[0-9a-f]{6}$/i

/** Role names by palette position. From the seventh colour on, "Colour 7". */
export const PALETTE_LABELS = Object.freeze(['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface', 'Highlight'])

/** The eleven steps of a project's tint ramp. */
export const SHADE_LABELS = TINT_LABELS[11]

/** The step a palette colour itself sits at in the ramp. */
export const BASE_SHADE = SHADE_LABELS[5]

/** The role name for the palette colour at position `i` (zero-based). */
export const roleName = (i) => PALETTE_LABELS[i] || `Colour ${i + 1}`

const norm = (hex) => String(hex || '').toUpperCase()
const paletteColours = (design) => (Array.isArray(design?.palette?.colors) ? design.palette.colors : [])

// The palette position of the active colour (the one the ramp was made from), or
// -1 when the palette does not hold it (a project with only a base colour).
// It is the FIRST place that hex holds in the raw palette list, the same place
// labelFor and paletteChips name it from, so a repeated colour has one name
// everywhere. `activeIdx` is deliberately not used: `activeColour` counts it
// against the hex-only list, so it is not a position in this raw list, and when
// the palette repeats the active colour it would name the later copy.
function activeRoleIndex(design) {
  const hex = norm(activeColour(design))
  if (!HEX_RE.test(hex)) return -1
  return paletteColours(design).findIndex((c) => norm(c) === hex)
}

const named = (role, shade) => ({ role, shade, label: `${role} ${shade}`, custom: false })

/**
 * The active colour's shades as the tool offers them: `{ role, items }`, each
 * item `{ hex, role, shade, label }`. Null when there is nothing honest to
 * offer: no ramp made from the active colour (a stale ramp would name steps of
 * some other colour), or an active colour the palette does not hold (its shades
 * would sit under a role that has no chip).
 */
export function activeShades(design) {
  if (!tintsCurrent(design)) return null
  const at = activeRoleIndex(design)
  if (at < 0) return null
  const role = roleName(at)
  const base = norm(activeColour(design))
  const scale = design.tints.scale
  const steps = tintLabelsFor(scale.length)
  const baseStep = steps.indexOf(BASE_SHADE)
  const inPalette = new Set(paletteColours(design).map(norm))
  const seen = new Set([base])
  const items = []
  scale.forEach((c, k) => {
    const isBase = k === baseStep
    const hex = isBase ? base : norm(c)
    if (!HEX_RE.test(hex)) return
    if (!isBase && (inPalette.has(hex) || seen.has(hex))) return
    seen.add(hex)
    items.push({ hex, ...named(role, steps[k]) })
  })
  return { role, items }
}

/**
 * What to call `hex` in this project: `{ role, shade, label, custom }`.
 * A palette colour is "<role> 500" (its first place, if repeated). Otherwise,
 * while the project's ramp is current, a shade the tool offers for the active
 * colour is "<role> <step>". Anything else is "Custom"; a colour close to a
 * palette colour is not rounded to it.
 */
export function labelFor(hex, design) {
  const key = norm(hex)
  if (HEX_RE.test(key)) {
    const i = paletteColours(design).findIndex((c) => norm(c) === key)
    if (i >= 0) return named(roleName(i), BASE_SHADE)
    const hit = activeShades(design)?.items.find((s) => s.hex === key)
    if (hit) return named(hit.role, hit.shade)
  }
  return { role: null, shade: null, label: 'Custom', custom: true }
}

/**
 * The palette's colours as chips: valid six-digit hexes, de-duplicated without
 * regard to case, in palette order, each with the role it holds in the palette.
 */
export function paletteChips(design) {
  const seen = new Set()
  const out = []
  paletteColours(design).forEach((c, i) => {
    const hex = norm(c)
    if (!HEX_RE.test(hex) || seen.has(hex)) return
    seen.add(hex)
    out.push({ hex, index: i, ...named(roleName(i), BASE_SHADE) })
  })
  return out
}
