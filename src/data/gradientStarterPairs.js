// Six two-colour starting points for the gradient tool's Available colours, shown
// while there is no palette to draw from. One press sets the gradient's first and
// last stop (the stops between are blended in OKLCH). Chosen to cover the palette
// library's moods, so a first press lands on something that already looks finished.
// `left` becomes the first stop and `right` the last.
export const STARTER_PAIRS = [
  { id: 'harbour-night', name: 'Harbour night', left: '#0B1B3A', right: '#3D7BFF' },
  { id: 'ember', name: 'Ember', left: '#3A1238', right: '#F08A4B' },
  { id: 'sea-glass', name: 'Sea glass', left: '#CFEFE6', right: '#6FB7C9' },
  { id: 'citrus', name: 'Citrus', left: '#FFB23F', right: '#F0436A' },
  { id: 'fog', name: 'Fog', left: '#E9ECF2', right: '#7A8496' },
  { id: 'plum', name: 'Plum', left: '#2A0F3D', right: '#9C5BD9' },
]
