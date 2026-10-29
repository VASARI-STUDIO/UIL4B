// The customiser's line style: three named styles that pair a stroke end with a corner,
// and the two rows that set them apart. DOM-free so the rules are testable on their own.

/** Stroke ends, in the order the "Ends" row shows them. `v` is the SVG stroke-linecap value. */
export const LINE_ENDS = Object.freeze([
  Object.freeze({ v: 'round', name: 'Round' }),
  Object.freeze({ v: 'square', name: 'Square' }),
  Object.freeze({ v: 'butt', name: 'Flat' }),
])

/** Stroke corners, in the order the "Corners" row shows them. `v` is the SVG stroke-linejoin value. */
export const LINE_CORNERS = Object.freeze([
  Object.freeze({ v: 'round', name: 'Round' }),
  Object.freeze({ v: 'miter', name: 'Mitre' }),
  Object.freeze({ v: 'bevel', name: 'Bevel' }),
])

/** The three tiles. Round is the default and the only free style. */
export const LINE_STYLES = Object.freeze([
  Object.freeze({ id: 'round', name: 'Round', cap: 'round', join: 'round', pro: false, note: 'Rounded all over' }),
  Object.freeze({ id: 'sharp', name: 'Sharp', cap: 'square', join: 'miter', pro: true, note: 'Square and mitred' }),
  Object.freeze({ id: 'crisp', name: 'Crisp', cap: 'butt', join: 'bevel', pro: true, note: 'Flat and bevelled' }),
])

export const DEFAULT_LINE_CAP = 'round'
export const DEFAULT_LINE_JOIN = 'round'

/** The tile an ends and corners pair matches, or null when it is a mix no tile draws. */
export function lineStyleOf(cap, join) {
  return LINE_STYLES.find((s) => s.cap === cap && s.join === join) || null
}

/**
 * Whether an ends and corners pair is a Pro line style. Anything other than round ends with
 * round corners is, including a mix no tile draws. Missing values read as the default.
 */
export function isProLineStyle(cap = DEFAULT_LINE_CAP, join = DEFAULT_LINE_JOIN) {
  return cap !== DEFAULT_LINE_CAP || join !== DEFAULT_LINE_JOIN
}
