// Orra Workroom: a product page for one overshirt, the Product page example.
//
// The garment is the one coloured object: a recolourable render in the selected
// colourway (primary, secondary, deep, or the fixed undyed Natural). The primary
// also paints Add to bag and the selected swatch's ring, the accent is the "New"
// text, and everything else is neutral. The success role appears only on the
// "Added to bag" sheet.
//
// Pure and DOM-free, so tests read ROLES, TEXT_RECIPE, the colourway names and
// the per-palette colours without rendering anything.
import { contrastRatio, hexToOklch, mixHex } from '../../../utils/colors.js'
import { fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'deep', 'success', 'neutral']

export const TEXT_RECIPE = [
  { el: 'title, price', ink: 'text', large: true },
  { el: 'nav, sizes, swatch names, details, disclosure labels, bag sheet', ink: 'text', large: false },
  { el: 'breadcrumb, terms, size note, caption, disclosure text, sold out size', ink: 'muted', large: false },
  { el: 'New', ink: 'accent-ink', large: false },
  { el: 'added line', ink: 'success-ink', large: false },
  { el: 'add to bag', ink: 'on-primary', large: false },
  { el: 'selected size', ink: 'canvas on text', large: false },
]

export const PRODUCT = {
  name: 'The Field Overshirt',
  price: 240,
  terms: 'or 4 payments of $60',
  views: [
    { id: 'front', asset: 'overshirt-front', name: 'Front' },
    { id: 'back', asset: 'overshirt-back', name: 'Back' },
    { id: 'pocket', asset: 'overshirt-pocket', name: 'Pocket detail' },
  ],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  soldOut: 'XXL',
  defaultSize: 'M',
  details: ['Australian-grown linen, 210 gsm', 'Corozo buttons', 'Relaxed fit', 'Model is 183 cm and wears M'],
  disclosures: [
    { id: 'delivery', label: 'Delivery', text: 'Free over $150 within Australia. Standard takes 3 to 5 working days, express is $14. Made to order pieces ship in 3 weeks.' },
    { id: 'returns', label: 'Returns', text: 'Return it unworn within 30 days for a refund. Exchange for another size at no cost.' },
  ],
  nav: ['Shirts', 'Trousers', 'Workroom'],
}

// The fixed colourway: undyed linen, the same in every palette.
export const NATURAL = { name: 'Natural', color: '#d9cdb4', role: 'neutral' }

// OKLCH hue buckets, lower bound inclusive.
const HUES = [[0, 'Brick'], [20, 'Rust'], [50, 'Wattle'], [90, 'Saltbush'], [150, 'Lagoon'], [200, 'Harbour'], [260, 'Jacaranda'], [320, 'Musk']]

/** The name of a colour by its OKLCH hue; a colour with chroma under 0.03 is Natural, whatever its hue. */
export function hueName(hex) {
  const [, c, h] = hexToOklch(hex)
  if (c < 0.03) return 'Natural'
  let name = HUES[0][1]
  for (const [from, n] of HUES) if (h >= from) name = n
  return name
}

/**
 * Names for the palette-made colourways, in order. L above 80 with chroma under 0.1 adds "Pale"
 * (a light tint, not a vivid mid colour) and L under 35 adds "Dark".
 * A name that is already taken (by an earlier colourway, or by the fixed Natural) takes "Light" or
 * "Dark", whichever fits its lightness first, then the other, then a numeral, so no two colourways share a name.
 * @param {string[]} hexes
 * @param {string[]} [taken] names that are spoken for
 */
export function colourwayNames(hexes, taken = [NATURAL.name]) {
  const used = new Set(taken)
  return hexes.map((hex) => {
    const [l, c] = hexToOklch(hex)
    const base = hueName(hex)
    const mod = l > 80 && c < 0.1 ? 'Pale ' : l < 35 ? 'Dark ' : ''
    const fits = l >= 50 ? ['Light ', 'Dark '] : ['Dark ', 'Light ']
    const tries = [mod + base, ...fits.map((m) => m + base)]
    let name = tries.find((t) => !used.has(t))
    for (let n = 2; !name; n++) if (!used.has(`${base} ${n}`)) name = `${base} ${n}`
    used.add(name)
    return name
  })
}

// The primary button's hover and pressed fills: toward the deep, or toward the ink
// furthest from the label when the deep would cost the label its contrast.
function primaryFills(r) {
  const floor = Math.min(4.5, contrastRatio(r.onPrimary, r.primary))
  const away = contrastRatio(r.onPrimary, r.canvas) >= contrastRatio(r.onPrimary, r.text) ? r.canvas : r.text
  const reads = (c) => contrastRatio(r.onPrimary, c) >= floor
  const [h, p] = [0.3, 0.6].map((t) => mixHex(r.primary, r.deep, t))
  if (reads(h) && reads(p) && contrastRatio(h, r.primary) >= 1.1 && contrastRatio(p, h) >= 1.1) return { hover: h, press: p }
  return { hover: mixHex(r.primary, away, 0.2), press: mixHex(r.primary, away, 0.38) }
}

/**
 * The colourways of a palette: primary, secondary, deep, then the fixed Natural.
 * @param {object} r derivePaletteRoles() output
 */
export function colourways(r) {
  const names = colourwayNames([r.primary, r.secondary, r.deep])
  return [
    { name: names[0], color: r.primary, role: 'primary' },
    { name: names[1], color: r.secondary, role: 'secondary' },
    { name: names[2], color: r.deep, role: 'deep' },
    NATURAL,
  ]
}

/**
 * The colours this scene works out per palette and mode: the ink on the button, its
 * hover and pressed fills, and the focus ring (the primary, or its border tone when
 * the primary is under 3:1 on the page).
 * @param {object} r derivePaletteRoles() output
 */
export function orraVars(r) {
  const keep = Boolean(r.pair)
  const fills = primaryFills(r)
  return {
    '--or-cta-ink': inkOnField(r.primary, { on: r.onPrimary, text: r.text, canvas: r.canvas }, { keep }).hex,
    '--or-cta-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
    '--or-primary-hover': fills.hover,
    '--or-primary-press': fills.press,
    '--or-ring': contrastRatio(r.primary, r.canvas) < 3 && r.primaryBorder !== 'transparent' ? r.primaryBorder : r.primary,
  }
}
