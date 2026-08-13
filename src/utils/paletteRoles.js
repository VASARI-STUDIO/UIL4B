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

/** Every label for a system — used by the tests and by any summary view. */
export function roleLabels(harmony) {
  return HARMONY_ROLE_LABELS[harmony] || AUTO
}
