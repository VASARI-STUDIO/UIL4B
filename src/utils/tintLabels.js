// Step names for a tint ramp, by how many steps it has. Pure and import-free so
// the Tint Generator's ramp (tintRamp.js) and every export that prints a ramp
// read one table: a 13-step ramp starts at 25 and ends at 975, so a fixed
// 50-900 list mislabels it.
//
// The 10-step row is the semantic state packs (50 to 900, no 950).

export const TINT_LABELS = Object.freeze({
  9: Object.freeze(['50', '100', '200', '300', '400', '500', '600', '700', '800']),
  10: Object.freeze(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']),
  11: Object.freeze(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']),
  13: Object.freeze(['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '975']),
})

/**
 * The step names for a ramp of `count` steps. A length with no table gets
 * plain positions (1, 2, 3 ...), never a made-up 50 to 900 name.
 */
export function tintLabelsFor(count) {
  const known = TINT_LABELS[count]
  if (known) return known
  return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, i) => String(i + 1))
}
