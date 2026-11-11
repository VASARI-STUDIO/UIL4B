// The text layer's shared maths, for every preview that sets words over the gradient
// (Hero, Button, Poster). Plain functions, so the contrast of text over a gradient can be
// checked without a browser.
//
// Text is never faded with opacity: a scene picks a solid ink for each box of text from
// the part of the gradient the box covers (pickInk), and says one number for the scene,
// the lowest ratio of any of those boxes.
import { pickInk } from './gradientInk.js'

const round3 = (n) => Math.round(n * 1000) / 1000

/**
 * `inner` as fractions of `outer`'s rectangle, with the outer's shape (width over height).
 * Both are { left, top, width, height }, as getBoundingClientRect gives them. Null while
 * the outer has no size.
 */
export function boxWithin(outer, inner) {
  if (!outer.width || !outer.height) return null
  return {
    aspect: round3(outer.width / outer.height),
    box: { x: round3((inner.left - outer.left) / outer.width), y: round3((inner.top - outer.top) / outer.height), w: round3(inner.width / outer.width), h: round3(inner.height / outer.height) },
  }
}

/** The ink for a measured box, or for the whole gradient until the box is known. */
export const inkFor = (stops, type, angle, spot) => pickInk(stops, spot ? { type, angle, ...spot } : undefined)

/** The ink for each named box of a scene: `spots` is { name: measured box } or null before the first measure. */
export function sceneInks(stops, type, angle, spots, names) {
  return Object.fromEntries(names.map((name) => [name, inkFor(stops, type, angle, spots?.[name])]))
}

/** "Text 4.8:1", with " · low" when the ratio misses 4.5:1. */
export const badgeText = (ink) => `Text ${ink.ratio.toFixed(1)}:1${ink.low ? ' · low' : ''}`

/** The ink with the lowest ratio, or null when there are none. */
export function lowestInk(inks) {
  return inks.reduce((low, ink) => (low === null || ink.ratio < low.ratio ? ink : low), null)
}

/** The scene's one badge: { text, low } for the lowest ratio of its text-on-paint boxes, or null when no text sits on the paint. */
export function sceneBadge(inks) {
  const low = lowestInk(inks)
  return low ? { text: badgeText(low), low: low.low } : null
}
