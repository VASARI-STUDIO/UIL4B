// Shopfront: a hardware shop's street frontage, drawn from the palette.
// The fascia is the primary, the awning stripes are the secondary, the door
// is the deep and the street number on it sits on an accent plate. The subtle
// and the status colours have no job here, so the legend leaves them unlit.
//
// Plain data, no React. The awning stripe count is one number, so the markup
// and the picture's text alternative cannot disagree.

export const ROLES = ['primary', 'secondary', 'accent', 'deep', 'neutral']

// Every text colour the scene sets and what it reads against.
export const TEXT_RECIPE = [
  { el: 'fascia name', ink: 'fieldInks:--fi-ink', ground: 'primary' },
  { el: 'street number', ink: 'fieldInks:--fi-acc-ink', ground: 'accent' },
  { el: 'caption', ink: 'text', ground: 'canvas' },
]

export const COPY = {
  name: 'RENNIE’S HARDWARE',
  number: '44',
  caption: 'Open till 7 on Thursdays · 44 Lantern Street',
  imageLabel: 'A shopfront drawn from your palette: a primary fascia, a secondary awning and a deep door with the number 44 on an accent plate.',
}

export const AWNING_STRIPES = 8
export const STRIPES = Array.from({ length: AWNING_STRIPES }, (_, i) => i % 2 === 0)
