// The Google Fonts css2 address for a set of families, and the weight set a pair
// of faces needs to render without the browser inventing any of it.
//
// Pure, with no `import.meta`, so node's test runner can load it (googleFonts.js
// cannot be loaded there).

const uniqueSorted = (list) => [...new Set((list || []).filter(Number.isFinite))].sort((a, b) => a - b)

/**
 * The axis part of one css2 `family=` parameter.
 *   upright only:        wght@400;700
 *   with italic cuts:    ital,wght@0,400;0,700;1,400
 * The axis tag appears once; css2 rejects a repeated one.
 */
export function familyAxis(weights = [400], italics = []) {
  const upright = uniqueSorted(weights)
  const slanted = uniqueSorted(italics)
  if (!upright.length && !slanted.length) return 'wght@400'
  if (!slanted.length) return `wght@${upright.join(';')}`
  const tuples = [...upright.map((w) => `0,${w}`), ...slanted.map((w) => `1,${w}`)]
  return `ital,wght@${tuples.join(';')}`
}

/** `families`: [{ family, weights?: number[], italics?: number[] }]. */
export function buildFontImportUrl(families) {
  const params = families
    .map(({ family, weights = [400], italics = [] }) => `family=${encodeURIComponent(family)}:${familyAxis(weights, italics)}`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

// What the specimen and preview draw, per role. The heading face is only ever
// set at the one heading weight. The body face is set at its regular weight,
// at 600 in the preview's buttons, and bold (<strong>) and italic (<em>) in the
// running text, so each of those has to be loaded or the browser fakes it.

const heavier = (variants, from) => variants.filter((w) => w > from).sort((a, b) => a - b)

/**
 * The weights to load for a heading face at `weight`: just that one.
 * `{ upright: number[], italic: number[] }`
 */
export function headingFaceWeights(font, weight) {
  return { upright: uniqueSorted([weight]), italic: [] }
}

/**
 * The weights to load for a body face at `regular`.
 *   upright: the regular weight, the button weight (600, else the nearest
 *            heavier the family ships) and the bold weight (700, else 600,
 *            else the heaviest above regular). A family with nothing at 600 or
 *            more above its regular weight gets only the regular one: there
 *            is no real bold to load.
 *   italic:  one italic cut, at 400 when the family ships it (else the regular
 *            weight), only when the catalogue says the family has italics.
 * `{ upright: number[], italic: number[], buttons: number, bold: number }`
 */
export function bodyFaceWeights(font, regular) {
  const variants = uniqueSorted(font?.variants)
  // Only a weight of 600 or more reads as bold; a 500 is no use for either.
  const heavy = heavier(variants, regular).filter((w) => w >= 600)
  const bold = variants.includes(700) && regular < 700 ? 700
    : variants.includes(600) && regular < 600 ? 600
      : (heavy.length ? heavy[heavy.length - 1] : regular)
  const buttons = regular >= 600 ? regular
    : variants.includes(600) ? 600
      : (heavy.length ? heavy[0] : regular)
  const italic = font?.italics === true
    ? [variants.includes(400) ? 400 : regular]
    : []
  return { upright: uniqueSorted([regular, buttons, bold]), italic, buttons, bold }
}

/**
 * The css2 families for a heading + body pair, one entry per family. A pair of
 * one family (it should not happen) merges into a single entry.
 */
export function pairImportFamilies(heading, headingW, body, bodyW) {
  const h = headingFaceWeights(heading, headingW)
  const b = bodyFaceWeights(body, bodyW)
  if (heading.family === body.family) {
    return [{
      family: heading.family,
      weights: uniqueSorted([...h.upright, ...b.upright]),
      italics: b.italic,
    }]
  }
  return [
    { family: heading.family, weights: h.upright, italics: h.italic },
    { family: body.family, weights: b.upright, italics: b.italic },
  ]
}

/** A short line naming what the import loads, e.g. "Inter 400, 600, 700 and 400 italic". */
export function describePairImport(families) {
  return families.map(({ family, weights = [], italics = [] }) => {
    const parts = [...weights.map(String), ...italics.map((w) => `${w} italic`)]
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
    return `${family} ${list}`
  }).join('; ')
}
