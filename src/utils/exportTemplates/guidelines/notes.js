// The usage notes of the brand guidelines: the short statements that sit beside each
// page of the document (what the page shows and how to read it). One source, read by
// the generator's own pages and handed to templates as `ctx.notes`, so the Presentation
// deck and the Grid sentences cannot drift apart. Plain data: no markup, no colour.

/**
 * The clear-space unit as printed: whole millimetres from 1 mm up, one decimal below, and '' when
 * it would print as 0 (an extreme proportion), so a caption never says X is "0mm".
 * @param {number} xMm
 */
export function unitMm(xMm) {
  if (!(xMm >= 0.05)) return ''
  return `${xMm >= 1 ? xMm.toFixed(0) : xMm.toFixed(1)}mm`
}

/**
 * @param {object} d      the guidelines reading (logo, heading, body, ratio, baseSize, lineHeight, ...)
 * @param {object[]} slots the colour slots (the first is the primary)
 * @param {object} words  where a sentence points, for a layout that gathers the notes away from their pages:
 *   { mark: 'this page', ground: 'below', drawn: 'here', swatch: 'card' } is the page-by-page wording
 * @param {number} steps  how many steps the type scale has
 * @returns {{
 *   mark: string[], grounds: string[], clearSpace: (xMm: number) => string[],
 *   palette: string[], inUse: string[],
 *   faces: { role: string, key: 'heading'|'body', notes: string[] }[],
 *   scale: string[], scope: string[],
 * }}
 */
export function guidelineNotes(d, slots = [], words = {}, steps = 0) {
  const w = { mark: 'this page', ground: 'below', drawn: 'here', swatch: 'card', ...words }
  const one = d.heading === d.body
  return {
    mark: d.logo ? [
      'The artwork as supplied, reproduced without alteration.',
      d.logo.type === 'image/svg+xml'
        ? 'Vector artwork: it holds at any size.'
        : 'Raster file: it softens past its native size. Supply vector artwork for large print.',
    ] : [],
    grounds: [
      'The artwork on paper, on ink and on each brand colour.',
      `No reversed or single-colour version has been generated. Where the mark fails a ground ${w.ground}, that variant needs drawing.`,
    ],
    /** `xMm`: the clear-space unit as drawn on the page that prints it. */
    clearSpace: (xMm) => [
      `Keep a margin of X on every side of the mark, where X is half the height of the mark. ${unitMm(xMm) ? `At the size drawn ${w.drawn} that is ${unitMm(xMm)}.` : ''}`.trim(),
      'This is the default rule, not a decision already taken. Increase it if the mark needs more room.',
    ],
    palette: slots.length ? [
      `Each colour has a name and a value: “${slots[0].name}” is ${slots[0].hex}.`,
      `The ink on each ${w.swatch} is the one that reads on it, with its contrast ratio.${d.palette?.length > slots.length ? ` The first ${slots.length} of ${d.palette.length} colours are shown.` : ''}`,
    ] : [],
    inUse: [
      `The name set in ${d.heading} on each colour, in the ink that reads on it.`,
      'No photography or mock-ups are included.',
    ],
    faces: one
      ? [{
        role: 'The typeface',
        key: 'heading',
        notes: [`${d.heading} is used for headings and body text, at different weights and sizes.`,
          'The full character set is shown.'],
      }]
      : [{
        role: 'Headline face',
        key: 'heading',
        notes: [`${d.heading} sets headings at ${d.headingWeight}.`,
          'The full character set is shown.'],
      }, {
        role: 'Body face',
        key: 'body',
        notes: [`${d.body} sets body text at ${d.bodyWeight}, with ${d.lineHeight} leading.`,
          'The full character set is shown.'],
      }],
    scale: [
      `${steps ? `${steps} steps on a` : 'A'} ${d.ratio} ratio from a ${d.baseSize}px base.`,
      `Body leading ${d.lineHeight}. Headings 1.15.`,
    ],
    scope: [
      'Logo (when supplied), colour and typography, taken from the system.',
    ],
  }
}
