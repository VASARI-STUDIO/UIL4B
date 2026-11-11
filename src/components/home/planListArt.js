// The drawing and the colour of each plan-list icon. planFacts.js hands out
// icon KEYS (a row's `icon`); this file turns a key into a path and a position
// in the colour band into a hue. DOM-free, so a test can read it.

// The colour band the outline button's ring uses (global.css), in order. Each
// list steps down it so no two neighbours share a hue. Every hue clears 3:1
// on the card it sits on (lowest 3.95:1).
export const BAND_HUES = Object.freeze([
  'hsl(8 58% 56%)', 'hsl(22 60% 57%)', 'hsl(36 62% 58%)', 'hsl(48 58% 56%)',
  'hsl(62 44% 52%)', 'hsl(84 34% 48%)', 'hsl(104 30% 45%)', 'hsl(134 28% 44%)',
  'hsl(160 30% 44%)', 'hsl(182 32% 45%)', 'hsl(200 38% 50%)', 'hsl(216 40% 55%)',
  'hsl(238 32% 56%)', 'hsl(262 28% 54%)', 'hsl(288 26% 52%)', 'hsl(312 32% 54%)',
  'hsl(332 40% 56%)', 'hsl(350 48% 56%)',
])

// Hand-picked steps for the two lists as drawn. A list of any other length
// spreads evenly over the band instead.
const FREE_STEPS = Object.freeze([0, 2, 5, 7, 10, 12, 15, 17])
const PRO_STEPS = Object.freeze([0, 2, 4, 6, 8, 9, 11, 13, 15, 17])

/** The hue for item `index` of a list of `count` items. */
export function bandHue(kind, index, count) {
  const steps = kind === 'free' ? FREE_STEPS : PRO_STEPS
  if (steps.length === count) return BAND_HUES[steps[index]]
  const last = BAND_HUES.length - 1
  return BAND_HUES[count < 2 ? 0 : Math.round((index * last) / (count - 1))]
}

/** A Pro row's icon key (planFacts.js proRows) to a 24-unit path. */
export const PLAN_ICON_PATHS = Object.freeze({
  'shield-check': 'M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z M9 12l2 2 4-4',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z M5 19.5A1.5 1.5 0 0 0 6.5 21H19 M9 7h6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  pencil: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  'colour-wheel': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M15.5 8.5l-2 5-5 2 2-5z',
  infinity: 'M7 9a3 3 0 1 0 0 6c2 0 3-1.5 5-3s3-3 5-3a3 3 0 1 1 0 6c-2 0-3-1.5-5-3S9 9 7 9z',
})
