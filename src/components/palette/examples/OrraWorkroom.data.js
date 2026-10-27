// Orra Workroom: a product page for one overshirt, the Marketing example.
//
// The garment is the brand field: its body is the primary, so the user sees
// their primary as a product colour and the other four slots as the range of
// colourways beside it. Seams, buttons and the label tab take deep, subtle and
// accent; the inside of the collar takes secondary.
//
// Pure and DOM-free, so tests read ROLES, TEXT_RECIPE and the per-palette colours
// without rendering anything.
import { contrastRatio, mixHex } from '../../../utils/colors.js'
import { fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral']

export const TEXT_RECIPE = [
  { el: 'title', ink: 'text', large: true },
  { el: 'body, price, sizes', ink: 'text', large: false },
  { el: 'maker line, help, breadcrumb', ink: 'muted', large: false },
  { el: 'stock line', ink: 'success-ink', large: false },
  { el: 'add to bag', ink: 'inkOnField:primary', large: false },
  { el: 'selected size', ink: 'canvas on text', large: false },
]

export const PRODUCT = {
  name: 'The Field Overshirt',
  price: 240,
  maker: 'Cut and sewn in Brunswick, VIC',
  terms: 'Includes GST · made to order in 3 weeks',
  body: 'Heavy Australian-grown linen, washed twice so it arrives soft. Two bellows pockets, horn buttons, and a back yoke cut on the bias so it moves when you reach.',
  sizes: [
    { id: 'XS' }, { id: 'S' }, { id: 'M', on: true }, { id: 'L' }, { id: 'XL' }, { id: 'XXL', off: true },
  ],
  sizeHelp: 'XXL is back in 4 weeks',
  stock: 'M and L ready to ship in 2 days',
  details: ['Fabric and care', 'Fit and measurements', 'Delivery and returns'],
  views: [
    { id: 'front', name: 'Front' },
    { id: 'back', name: 'Back' },
    { id: 'pocket', name: 'Pocket' },
  ],
}

export const SWATCH_ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep']

// Stitching is deep laid 60% over the body; when that is too close to the body
// to see (under 1.5:1), it takes the ink that reads on the body instead.
const SEAM_MIN = 1.5

/**
 * The colours this scene works out per palette and mode.
 * @param {object} r derivePaletteRoles() output
 */
export function orraVars(r) {
  // A Contrast Checker pair is never corrected: the type on the garment colour
  // is the pair's other colour, whatever its ratio.
  const keep = Boolean(r.pair)
  const inks = { on: r.onPrimary, text: r.text, canvas: r.canvas }
  let seam = mixHex(r.primary, r.deep, 0.6)
  if (contrastRatio(seam, r.primary) < SEAM_MIN) seam = inkOnField(r.primary, inks, { large: true, keep }).hex
  const cta = inkOnField(r.primary, inks, { keep })
  const swatchEdge = (fill) => fieldEdge(fill, r.canvas, r.borderStrong)
  return {
    '--or-seam': seam,
    '--or-cta-ink': cta.hex,
    '--or-cta-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
    // The garment sits on the raised stage, so its edge is measured there.
    '--or-body-edge': fieldEdge(r.primary, r.raised, r.borderStrong),
    '--or-sw-primary': swatchEdge(r.primary),
    '--or-sw-secondary': swatchEdge(r.secondary),
    '--or-sw-accent': swatchEdge(r.accent),
    '--or-sw-subtle': swatchEdge(r.subtle),
    '--or-sw-deep': swatchEdge(r.deep),
  }
}

// "PRIMARY" or "Primary" -> "Primary"; a label already in mixed case stands.
export function swatchName(label, i) {
  const s = typeof label === 'string' && label.trim() ? label.trim() : SWATCH_ROLES[i]
  return s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s
}
