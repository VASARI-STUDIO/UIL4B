// The three WCAG tests a Contrast Checker example is read against, and how a
// piece of an example is sorted into one of them. Pure and DOM-free; the DOM
// walk that applies it is in components/palette/PairExample.jsx.
import { contrastRatio } from './colors.js'

// Text at 24px, or 18.66px (14pt) in bold, is "large" and needs 3:1; smaller
// text needs 4.5:1. Icons, lines and chart marks that carry meaning need 3:1.
export const LARGE_PX = 24
export const LARGE_BOLD_PX = 18.66
export const BOLD_WEIGHT = 700

export const SIZE_CLASSES = [
  { id: 'body', label: 'Body text', min: 4.5 },
  { id: 'large', label: 'Large text', min: 3 },
  { id: 'ui', label: 'UI parts', min: 3 },
]

/** 'large' or 'body' for text of this computed size (px) and weight. */
export function textSizeClass(px, weight) {
  if (px >= LARGE_PX || (px >= LARGE_BOLD_PX && weight >= BOLD_WEIGHT)) return 'large'
  return 'body'
}

/** The legend's help line for two brand colours side by side (a chart line, a
 *  tag), where UI parts is the test the pair is chosen for. */
export const BESIDE_NOTE = 'Two brand colours: shown as chart lines and a tag. Text on this pair needs 4.5:1.'

/** The help line under the legend chips, for this unrounded ratio. The three
 *  tests are the AA ones, so a pair that clears them but not AAA (7:1) says
 *  "Every AA test passes", not "Every test". `beside` swaps in BESIDE_NOTE. */
export const legendLede = (ratio, beside = false) => {
  if (beside) return BESIDE_NOTE
  if (failingSizes(ratio).length) return 'The largest part that misses its test is outlined. Pick a test to outline every part.'
  return `Every ${ratio >= 7 ? '' : 'AA '}test passes. Pick a test to outline every part.`
}

/** The class ids a pair of this ratio fails. Compares the unrounded ratio. */
export function failingSizes(ratio) {
  return SIZE_CLASSES.filter((c) => ratio < c.min).map((c) => c.id)
}

// The outline an example draws round a part is a fixed colour, never one of the
// pair's, because the pair's own colours can be the field it sits on. No single
// fixed colour shows on every field though (a blue outline vanishes on a mid
// blue), so the example picks one of these per pair.
export const OUTLINE_CANDIDATES = ['#1d63d1', '#c8260e', '#ffffff', '#111111']

/**
 * The candidate that reads best against both colours of a pair: the one whose
 * weaker contrast (against the background or the text colour) is highest. A tie
 * goes to the earlier candidate, so the usual blue holds wherever it is fine.
 * @param {string} bg #rrggbb background
 * @param {string} fg #rrggbb text colour
 * @param {string[]} [candidates] #rrggbb colours, in order of preference
 * @param {string[]} [grounds] #rrggbb colours the outline also sits on besides
 *   the pair (the palette's own canvas, when parts are painted round the pair)
 * @returns {string} one of candidates
 */
export function pickOutlineColour(bg, fg, candidates = OUTLINE_CANDIDATES, grounds = []) {
  const on = [bg, fg, ...grounds]
  let best = candidates[0]
  let bestMin = -1
  for (const c of candidates) {
    const m = Math.min(...on.map((g) => contrastRatio(c, g)))
    if (m > bestMin + 1e-9) { best = c; bestMin = m }
  }
  return best
}

// The views a pair can fill, in the order the control lists them. `label` is
// what the control always shows; `more` is the part a narrow screen drops
// ("Landing page" shortens to "Landing"). `name` is the whole name. Interface is
// the first view and Specimen the last.
export const PAIR_VIEWS = [
  { id: 'interface', label: 'Interface', name: 'Interface' },
  { id: 'article', label: 'Article', name: 'Article' },
  { id: 'landing', label: 'Landing', more: ' page', name: 'Landing page' },
  { id: 'specimen', label: 'Specimen', name: 'Specimen' },
]

// Per view: the parts that are not text but carry meaning (icons, lines, fills,
// borders), as a selector. A view is painted in the pair's two colours only, so
// every part listed is held to the pair's own ratio. A border or fill sits on a
// wrapper and the words in a span inside it: the marking skips a box that has
// text of its own, so a labelled button is measured as a UI part and as text.
export const UI_PARTS = {
  interface: '.ro-navico, .ro-navbar, .ro-menuico, .ro-card, .ro-toggle, .ro-select, .ro-chev, .ro-focus, .ro-input, .ro-check, .ro-shift, .ro-btn--outline, .ro-btn--fill, .ro-tag',
  article: '.bs-sub, .bs-quote-rule, .bs-link-u, .bs-chart-axis, .bs-chart-line',
  landing: '.tw-btn--fill, .tw-btn--outline, .tw-link-u, .tw-card, .tw-check, .tw-receipt, .tw-torn, .tw-badge',
  specimen: '.sp-btn, .sp-btn svg',
}
