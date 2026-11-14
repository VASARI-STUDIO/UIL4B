// Stationery: a swim school's logo, business card and letterhead, drawn from
// the palette. The logo tile is the primary, the card is the deep with an
// accent rule, and the letterhead carries a secondary band. The subtle and the
// status colours have no job here, so the legend leaves them unlit.
//
// Plain data, no React.

export const ROLES = ['primary', 'secondary', 'accent', 'deep', 'neutral']

// Every text colour the scene sets and what it reads against.
export const TEXT_RECIPE = [
  { el: 'logo name', ink: 'fieldInks:--fi-ink', ground: 'primary' },
  { el: 'card name and title', ink: 'fieldInks:--fi-deep-ink', ground: 'deep' },
  { el: 'letterhead name', ink: 'fieldInks:--fi-deep-text', ground: 'surface' },
  { el: 'letter body, address', ink: 'text', ground: 'surface' },
]

export const COPY = {
  logo: 'Shallow End',
  cardName: 'Mel Arcari',
  cardTitle: 'Head coach',
  school: 'Shallow End Swim School',
  address: '14 Pool Lane, Lantern Bay NSW 2999',
  phone: '(02) 5550 0142',
  letter: 'Term 1 lessons start Monday 2 February. Your child’s group is Turtles, Tuesdays at 4:15 pm.',
  imageLabel: 'Stationery drawn from your palette: a primary logo tile, a deep business card with an accent rule and a letterhead with a secondary band.',
}
