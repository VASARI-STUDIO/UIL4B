// Coffee bag: a roaster's product page, with the bag drawn from the palette.
// The page behind the bag is the primary, the bag is the subtle, its label is
// the deep and the roast dots are the accent. The button is the primary; the
// secondary and the status colours have no job here, so the legend leaves them
// unlit.
//
// Plain data, no React. The roast level is one number, so the dots, the aria
// label and the copy cannot disagree.

export const ROLES = ['primary', 'subtle', 'deep', 'accent', 'neutral']

// Every text colour the scene sets and what it reads against.
export const TEXT_RECIPE = [
  { el: 'brand, name, notes, price', ink: 'text', ground: 'canvas' },
  { el: 'add button', ink: 'fieldInks:--fi-ink', ground: 'primary' },
  { el: 'bag label', ink: 'fieldInks:--fi-deep-ink', ground: 'deep' },
]

export const COPY = {
  brand: 'Low Light Roasters',
  name: 'Night Shift',
  notes: 'Washed Huila and natural Sidamo. Dark chocolate, plum, molasses.',
  price: '250 g · $24',
  cta: 'Add to cart',
  wordmark: ['Low Light', 'Roasters'],
  roasted: 'Roasted 3 Nov',
  imageLabel: 'A coffee bag drawn from your palette: a primary backdrop, a subtle bag and a deep label.',
}

export const ROAST = { level: 3, of: 5 }
export const roastLabel = `Roast level, ${ROAST.level} of ${ROAST.of}`
export const DOTS = Array.from({ length: ROAST.of }, (_, i) => i < ROAST.level)
