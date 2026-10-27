// The usage notes of the brand guidelines: the short statements that sit beside each
// page of the document (what the page shows and how to read it). One source, read by
// the generator's own pages and handed to templates as `ctx.notes`, so the Presentation
// deck and the Grid sentences cannot drift apart. Plain data: no markup, no colour.

/**
 * @param {object} d      the guidelines reading (logo, heading, body, ratio, baseSize, lineHeight, ...)
 * @param {object[]} slots the colour slots (the first is the primary)
 * @returns {{
 *   mark: string[], grounds: string[], clearSpace: (xMm: number) => string[],
 *   palette: string[], inUse: string[],
 *   faces: { role: string, key: 'heading'|'body', notes: string[] }[],
 *   scale: string[], scope: string[],
 * }}
 */
export function guidelineNotes(d, slots = []) {
  const one = d.heading === d.body
  return {
    mark: d.logo ? [
      'This is the artwork as supplied, reproduced without alteration. Nothing on this page has been redrawn, recoloured or retraced.',
      d.logo.type === 'image/svg+xml'
        ? 'It is vector artwork, so it holds at any size, from a favicon to a building.'
        : 'It is a raster file, so there is a size past which it will soften. Supply vector artwork for anything printed large.',
    ] : [],
    grounds: [
      'The same artwork on paper, on ink and on each brand colour. Read it as a test: the mark is approved on a ground only where it still reads.',
      'No reversed or single-colour version has been generated. Where the mark fails a ground below, that variant needs drawing; this document has not invented one for you.',
    ],
    /** `xMm`: the clear-space unit as drawn on the page that prints it. */
    clearSpace: (xMm) => [
      `Keep a margin of X on every side of the mark, where X is half the height of the mark itself. At the size drawn here that is ${xMm.toFixed(0)}mm.`,
      'This is the default rule this document applies, not a decision already taken. Replace it if your mark asks for more room, but replace it deliberately.',
    ],
    palette: slots.length ? [
      `Every colour carries a name as well as a value. Say “${slots[0].name}” in a review and the decision survives; say the hex and it does not.`,
      'The ink noted on each card is the one measured to read on it, at the ratio printed beside it. Nothing here was estimated.',
    ] : [],
    inUse: [
      `The name set in ${d.heading} on each colour, in the ink that reads on it. This is the palette doing its actual job rather than sitting in a row of chips.`,
      'There is no photography in this document. A mock-up of a tote bag would be an illustration of a brand nobody has made yet; these tiles are the real system.',
    ],
    faces: one
      ? [{
        role: 'The typeface',
        key: 'heading',
        notes: [`${d.heading} carries the whole system, headings and reading alike: a single family held at different weights and sizes.`,
          'The full character set is printed so a substitution is obvious the moment one happens.'],
      }]
      : [{
        role: 'Headline face',
        key: 'heading',
        notes: [`${d.heading} sets the headings at ${d.headingWeight}. It is chosen to be recognised at a glance rather than read at length.`,
          'The full character set is printed so a substitution is obvious the moment one happens.'],
      }, {
        role: 'Body face',
        key: 'body',
        notes: [`${d.body} sets everything meant to be read at length, at ${d.bodyWeight} and ${d.lineHeight} leading.`,
          'Judge it by the lowercase: that is where reading actually happens, and it is the half a specimen of capitals hides.'],
      }],
    scale: [
      `Eight steps on a ${d.ratio} ratio from a ${d.baseSize}px base. Every row is set in the face and at the size it specifies.`,
      `Body copy sets at ${d.lineHeight} leading; headings tighten to 1.15, which is what stops a two-line heading reading as two separate lines.`,
    ],
    scope: [
      'Everything below was generated from the system you built. Nothing in it is illustrative, and nothing in it is a placeholder.',
      'The second column is as important as the first: a brand book that quietly omits what it cannot say is harder to trust than one that names it.',
    ],
  }
}
