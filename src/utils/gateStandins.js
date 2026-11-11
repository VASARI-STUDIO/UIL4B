// Stand-in rows for the faded cards behind a gallery's end gate.
//
// Where the next rows are Pro's, the gate cannot show them: a Pro palette's
// colours or a Pro gradient's stops must never reach the page. So the faded
// rows are drawn with the gallery's own card component over rows made here,
// which are the same shape as a real row (a name, a few colours, a type) and
// carry nothing of any real one.
//
// Every colour comes from one fixed neutral ramp, picked by the card's
// position alone. Nothing is read from the library, so no row of it can show
// through, and the ramp is grey on purpose: a stand-in reads as "more cards of
// this kind" without pretending to be one palette or gradient.

const RAMP = Object.freeze(['#E4E4E7', '#C9C9CE', '#A1A1AA', '#7B7B84', '#5B5B64', '#3F3F46', '#2A2A30'])

/** How many stand-ins are made: enough to fill two rows at the widest column count. */
export const STANDIN_COUNT = 12

const ANGLES = [135, 90, 45, 180, 120, 60]
const TYPES = ['Linear', 'Linear', 'Radial', 'Linear', 'Linear', 'Radial']

// `n` steps of the ramp, `step` apart, starting at a step that moves with the card.
const rampFrom = (i, n, step = 1) => Array.from({ length: n }, (_, k) => RAMP[(i + k * step) % RAMP.length])

/** Stand-in palettes: five neutral colours each, the shape of a curated palette. */
export function standinPalettes(count = STANDIN_COUNT) {
  return Array.from({ length: count }, (_, i) => ({
    id: `standin-palette-${i}`,
    name: 'Palette',
    kind: 'curated',
    colors: rampFrom(i, 5),
  }))
}

/** Stand-in gradients: two or three neutral stops each, mixing linear and radial. */
export function standinGradients(count = STANDIN_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const colors = rampFrom(i, i % 3 === 2 ? 3 : 2, 3)
    return {
      id: `standin-gradient-${i}`,
      name: 'Gradient',
      type: TYPES[i % TYPES.length],
      angle: ANGLES[i % ANGLES.length],
      tags: [],
      stops: colors.map((color, k) => ({ color, position: Math.round((k * 100) / (colors.length - 1)) })),
    }
  })
}

/** Every colour a stand-in can carry, for a test to compare against the real data. */
export const STANDIN_COLOURS = RAMP
