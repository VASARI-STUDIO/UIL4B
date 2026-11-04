// The custom properties a design system book documents, as {name, value} pairs.
//
// Split out of designSystemBook.js so the PNG book (utils/bookRaster.js) can list
// the same tokens without importing the HTML generator: that generator is built on
// the server and must stay out of the client bundle (see the note at the top of
// bookModel.js). Pure: no React, no DOM.

import { typeLadder } from './styleGuideExport.js'
import { roleLabel } from './paletteRoles.js'

/**
 * The CSS custom properties the book documents, as {name, value} pairs.
 *
 * Deliberately generated here rather than imported from exportBuilder.js: that
 * module emits a formatted stylesheet string, and the book needs the tokens as
 * DATA so it can set the name and the value in different columns and paginate
 * them. Same values, one presentation each.
 */
export function bookTokens(d) {
  const rows = []
  // A belt-and-braces guard behind slugRole's sign handling: a custom harmony
  // added later could collide again, and a duplicate property is invisible in
  // the printed book but silently drops a colour in the stylesheet.
  const used = new Set()
  const unique = (name) => {
    if (!used.has(name)) { used.add(name); return name }
    let n = 2
    while (used.has(`${name}-${n}`)) n += 1
    used.add(`${name}-${n}`)
    return `${name}-${n}`
  }
  d.palette.forEach((hex, i) => {
    rows.push({ name: unique(`--color-${slugRole(d.harmony, i)}`), value: hex })
  })
  rows.push({ name: '--font-heading', value: `"${d.heading}", system-ui, sans-serif` })
  rows.push({ name: '--font-body', value: `"${d.body}", system-ui, sans-serif` })
  rows.push({ name: '--font-weight-heading', value: String(d.headingWeight) })
  rows.push({ name: '--font-weight-body', value: String(d.bodyWeight) })
  rows.push({ name: '--font-size-base', value: `${d.baseSize}px` })
  rows.push({ name: '--type-ratio', value: String(d.ratio) })
  rows.push({ name: '--line-height-body', value: String(d.lineHeight) })
  if (d.headingSpacing) rows.push({ name: '--letter-spacing-heading', value: `${d.headingSpacing}em` })
  if (d.bodySpacing) rows.push({ name: '--letter-spacing-body', value: `${d.bodySpacing}em` })
  typeLadder(d).forEach((s) => {
    rows.push({ name: `--font-size-${s.name.toLowerCase().replace(/\s+/g, '-')}`, value: `${s.px}px` })
  })
  if (d.gradient) {
    const stops = d.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')
    rows.push({
      name: '--gradient-brand',
      value: `linear-gradient(${d.gradient.angle}deg, ${stops})`,
    })
  }
  return rows
}

/**
 * A role label reduced to a CSS-safe token segment.
 *
 * THE SIGN IS SPELLED OUT, and that is a bug fix rather than a style choice.
 * Stripping non-alphanumerics turned both "ANALOGOUS −30°" and "ANALOGOUS +30°"
 * into `analogous-30`, and the same for the two SOFT slots — so an analogous
 * palette emitted two pairs of DUPLICATE custom properties and the second of
 * each silently overrode the first. A token file that quietly loses two of its
 * colours is worse than no token file.
 *
 * Note the minus is U+2212, not a hyphen: paletteRoles.js sets the labels with
 * a real minus sign, so matching only ASCII "-" would miss it.
 */
function slugRole(harmony, index) {
  const slug = roleLabel(harmony, index)
    .toLowerCase()
    .replace(/[−-]\s*(?=\d)/g, 'minus-')
    .replace(/\+\s*(?=\d)/g, 'plus-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || `colour-${index + 1}`
}
