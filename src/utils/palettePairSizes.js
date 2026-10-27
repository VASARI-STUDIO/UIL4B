// The three WCAG tests a Contrast Checker example is read against, and how a
// piece of an example is sorted into one of them. Pure and DOM-free; the DOM
// walk that applies it is in components/palette/PairExample.jsx.

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

/** The class ids a pair of this ratio fails. Compares the unrounded ratio. */
export function failingSizes(ratio) {
  return SIZE_CLASSES.filter((c) => ratio < c.min).map((c) => c.id)
}

// The views a pair can fill, in the order the control lists them. `label` is
// what the control always shows; `more` is the part a narrow screen drops
// ("Product page" shortens to "Product"). `name` is the whole name.
export const PAIR_VIEWS = [
  { id: 'specimen', label: 'Specimen', name: 'Specimen' },
  { id: 'editorial', label: 'Editorial', name: 'Editorial' },
  { id: 'product', label: 'Product', more: ' page', name: 'Product page' },
  { id: 'card', label: 'Card', name: 'Card' },
]

// Per example: the parts that are not text but carry meaning (icons, lines,
// marks), as a selector. Only parts drawn in exactly one of the pair's two
// colours are listed, so the pair's ratio is what they are held to; a tint of
// the text colour (a land fill, a lighter segment) is decoration and is left out.
export const UI_PARTS = {
  editorial: '.sw-menu svg, .sw-routeline, .sw-wharf',
  product: '.or-menu svg, .or-save svg, .or-details svg',
  card: '.ty-nfc, .ty-act svg, .ty-seg--1, .ty-seg--4, .ty-key--1, .ty-key--4',
}
