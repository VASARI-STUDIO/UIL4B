// THE UIL4B MARK, as geometry. The single definition every icon is drawn from.
//
// ── Why this file exists ────────────────────────────────────────────────────
//
// The mark is not new. It is the founder's own logo, the one standing in the
// corner of the homepage share card since July: a broken ring, a dot at its
// centre, and a satellite dot sitting in the break. Nothing here invents a
// symbol for the company — the geometry below was MEASURED off that artwork
// (connected-component analysis of public/previews/og-image.png, at the time
// 1200x630) and rebuilt on a grid that survives a browser tab:
//
//     ring     centre (99.5, 131.5)  outer r 34  stroke 6   → r/stroke 5.67
//     dot      centre (99.5, 131.5)  r 15.5                 → 0.456 of outer r
//     satellite centre (117.6, 107.0) r 7.75                → 0.228 of outer r
//     satellite sits at radius 30.5 — i.e. ON the ring's centre line (31)
//     satellite bearing 36.5° clockwise from twelve o'clock
//     ring broken from 14° to 57°, so ~8° of clear air each side of the dot
//
// ── What changed in the rebuild, and why ───────────────────────────────────
//
// The ring had to get heavier, and that forced one interior proportion to move.
//
// The original ring is outer-r/stroke 5.67. Scaled to fit a 16px tab it is a
// 1.1px hairline, and a stroke thinner than a device pixel is antialiased into
// a grey smudge rather than a ring. So the stroke is 4 units on a 32 grid — 2px
// at 16px, landing on the pixel grid.
//
// That thickening has to come out of something. Holding the original's
// dot/outer ratio of 0.456 as well would need an outer radius of ~14.7 to keep
// a readable moat, which leaves 0.65px of margin and jams the ring into the
// tile's rounded corners. Rendered and compared at 16px, the version that
// actually reads is the one where the DOT gives way instead: dot 4, moat 4,
// stroke 4, margin 4, so the bands across the middle of a 16px render measure
// 2px ring, 2px moat, 4px dot, 2px moat, 2px ring, 2px margin. Nothing is
// thinner than a whole device pixel, which is the entire reason it holds.
//
// So dot/outer is 0.333 here against the artwork's 0.456. The identity does not
// live in that ratio — it lives in the silhouette, "broken ring, dot at the
// centre, satellite sitting in the break", and that is intact at every size.
// Designing for 16px and letting it scale up is the point; the favicon this
// replaces did the reverse and was unreadable at the only size it was used.
//
// ── Colour ─────────────────────────────────────────────────────────────────
//
// The founder's artwork sampled #045FFD. That is NOT a token — it predates the
// #331 sweep. The live accent is --accent in src/styles/global.css, and it is
// read from there by scripts/brand-icons.mjs rather than restated, so a brand
// move takes the icons with it. The mark is ONE colour in every context: an
// icon that changes hue between light and dark chrome stops being recognisable,
// which is the opposite of a favicon's job.
//
// Consumed by scripts/brand-icons.mjs (favicon.svg, favicon.ico,
// apple-touch-icon.png, icon-512.png) and scripts/og-cards.mjs (the homepage
// share card). This module imports nothing, so tests can read it freely.

/**
 * The mark on a 32x32 grid, centred at (16, 16).
 *
 * 32 is chosen so that a 16px render puts every edge on a half-unit and every
 * band on a whole pixel. The numbers are exact rather than rounded because the
 * arc endpoints are trigonometric and rounding them visibly shortens the ring.
 */
export const MARK = Object.freeze({
  grid: 32,
  cx: 16,
  cy: 16,
  ring: Object.freeze({
    r: 10, // centre-line radius; outer 12, inner 8, so 4 units of margin
    stroke: 4,
    // The break, in degrees clockwise from twelve o'clock. The satellite spans
    // 36.5 +/- atan(3/10) = 16.7 degrees, so this leaves ~8 degrees of clear air
    // on each side of it — the same proportion of clearance the artwork has.
    gapFrom: 12,
    gapTo: 61,
  }),
  dot: Object.freeze({ r: 4 }),
  satellite: Object.freeze({ r: 3, bearing: 36.5 }),
  /** Tile corner radius as a fraction of the tile: 0.219, near the old 116/512. */
  tileRadius: 7 / 32,
})

/** A point on a circle, by bearing in degrees clockwise from twelve o'clock. */
export function pointAt(cx, cy, r, bearingDeg) {
  const a = ((bearingDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

const n = (v) => Number(v.toFixed(4))

/**
 * The three elements of the mark, as SVG markup in the 32 grid.
 *
 * Paths and circles only — NEVER <text>. The favicon this replaces set the
 * letters "L4B" in `font-family: Inter, system-ui, …`, and Inter is not one of
 * the faces this project ships (it self-hosts Manrope and JetBrains Mono), so
 * the mark fell back to whatever the visitor's OS happened to supply and drew a
 * different shape on every machine. A logo whose outline depends on the
 * viewer's font stack is not a logo.
 */
export function markMarkup(colour) {
  const { cx, cy, ring, dot, satellite } = MARK
  const start = pointAt(cx, cy, ring.r, ring.gapTo)
  const end = pointAt(cx, cy, ring.r, ring.gapFrom)
  const sat = pointAt(cx, cy, ring.r, satellite.bearing)
  // The arc runs the LONG way round (311°), from the trailing edge of the gap
  // clockwise back to its leading edge: large-arc-flag 1, sweep-flag 1.
  // Butt caps, not round: a round cap extends the arc by half the stroke along
  // the tangent, which at this radius is ~11° — more than the ~8° of clear air
  // the satellite needs, so round caps would collide with it.
  return [
    `<path d="M${n(start.x)} ${n(start.y)}A${ring.r} ${ring.r} 0 1 1 ${n(end.x)} ${n(end.y)}"`
      + ` fill="none" stroke="${colour}" stroke-width="${ring.stroke}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${dot.r}" fill="${colour}"/>`,
    `<circle cx="${n(sat.x)}" cy="${n(sat.y)}" r="${satellite.r}" fill="${colour}"/>`,
  ].join('')
}

/**
 * The mark on its own, no tile — how it stands beside the wordmark on the
 * homepage share card, which is where the founder's artwork puts it.
 */
export function markSvg({ size, colour }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"`
    + ` viewBox="0 0 ${MARK.grid} ${MARK.grid}">${markMarkup(colour)}</svg>`
}

/**
 * A complete icon: the mark knocked out of a solid tile.
 *
 * `scale` shrinks the mark within the tile without moving its centre, which is
 * what a maskable icon needs — Android crops icons to a shape of its choosing
 * and only guarantees the middle 80%, so the manifest icon draws the mark
 * smaller while the tile, being flat colour, loses nothing to the crop.
 *
 * `radius` is a fraction of the tile. iOS applies its OWN corner mask to
 * apple-touch-icon, so that one is generated square (radius 0) — pre-rounding
 * it would round it twice and leave pale wedges in the corners.
 */
export function iconSvg({ size, tile, mark, radius = MARK.tileRadius, scale = 1 }) {
  const g = MARK.grid
  const rx = radius * g
  const inner = scale === 1
    ? markMarkup(mark)
    : `<g transform="translate(${n(MARK.cx * (1 - scale))} ${n(MARK.cy * (1 - scale))})`
      + ` scale(${n(scale)})">${markMarkup(mark)}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"`
    + ` viewBox="0 0 ${g} ${g}">`
    + `<rect width="${g}" height="${g}"${rx ? ` rx="${n(rx)}"` : ''} fill="${tile}"/>`
    + `${inner}</svg>`
}
