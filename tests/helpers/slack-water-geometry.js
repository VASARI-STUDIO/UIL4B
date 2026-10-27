// Geometry for the Slack Water chart: where each wharf label's plate lands, in
// chart units, and what it would touch. Used by tests/unit/slack-water-chart.test.js.
//
// A label is HTML, 12px, so its size in px is fixed while the drawing scales.
// To compare them the plate's px box is divided by the layout's scale (px per
// chart unit) and put around the wharf's dot. Text width is an estimate, kept
// on the wide side: 6.4px a character for Schibsted Grotesk 12px, plus the
// plate's 6px side padding. Height is the 15px line plus 2px top and bottom.

const NUM = /-?\d+(?:\.\d+)?/g

/** Flatten an absolute M/H/V/L/C/Z path to one polygon (an array of [x, y]). */
const memo = new Map()
export function flatten(d, steps = 24) {
  const key = `${steps}|${d}`
  if (memo.has(key)) return memo.get(key)
  const pts = []
  let x = 0
  let y = 0
  for (const [, cmd, args] of d.matchAll(/([MHVLCZ])([^MHVLCZ]*)/g)) {
    const n = (args.match(NUM) || []).map(Number)
    if (cmd === 'M' || cmd === 'L') { [x, y] = n; pts.push([x, y]) }
    else if (cmd === 'H') { [x] = n; pts.push([x, y]) }
    else if (cmd === 'V') { [y] = n; pts.push([x, y]) }
    else if (cmd === 'C') {
      for (let i = 0; i < n.length; i += 6) {
        const [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6)
        for (let k = 1; k <= steps; k++) {
          const t = k / steps
          const u = 1 - t
          pts.push([
            u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          ])
        }
        x = x3
        y = y3
      }
    }
  }
  memo.set(key, pts)
  return pts
}

/** Even-odd point-in-polygon. */
export function inside(poly, px, py) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

export const LABEL = { charPx: 6.4, padX: 6, h: 19, off: 8, dotPx: 5 }
// The caption sits 16px in from the field's bottom-left corner, on one line.
export const CAPTION = { inset: 16, w: 262, h: 19 }

/** The plate's box in chart units, for a wharf at scale `s` (px per unit). */
export function plate(w, s) {
  const width = w.name.length * LABEL.charPx + LABEL.padX * 2
  const g = LABEL.off + (w.gap || 0)
  const { h } = LABEL
  const px = {
    below: [-width / 2, g, width / 2, g + h],
    above: [-width / 2, -g - h, width / 2, -g],
    left: [-g - width, -h / 2, -g, h / 2],
    right: [g, -h / 2, g + width, h / 2],
  }[w.side]
  return { x0: w.x + px[0] / s, y0: w.y + px[1] / s, x1: w.x + px[2] / s, y1: w.y + px[3] / s }
}

const grow = (b, m) => ({ x0: b.x0 - m, y0: b.y0 - m, x1: b.x1 + m, y1: b.y1 + m })
const meets = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const within = (b, o) => b.x0 >= o.x0 && b.x1 <= o.x1 && b.y0 >= o.y0 && b.y1 <= o.y1

/** Points around and across a box, to test against a polygon. */
function samples(b, step) {
  const out = []
  for (let x = b.x0; x <= b.x1 + 1e-9; x += step) for (let y = b.y0; y <= b.y1 + 1e-9; y += step) out.push([x, y])
  out.push([b.x1, b.y1])
  return out
}

/**
 * The window a layout shows, in chart units, at field width `field` (px).
 * Height: the 4:3 narrow field shows w x 0.75w; the others are at least 480px
 * tall, so they show at least 480 / s units.
 */
export function windowAt(name, win, field) {
  const s = field / win.w
  const hUnits = name === 'narrow' ? win.w * 0.75 : 480 / s
  return { s, x0: win.x0, x1: win.x0 + win.w, y0: win.yc - hUnits / 2, y1: win.yc + hUnits / 2 }
}

/**
 * Everything wrong with `wharves` in one layout at one field width: a list of
 * short strings, empty when the layout is clean.
 */
export function problems({ wharves, land, route, ferry, name, win, field }) {
  const out = []
  const view = windowAt(name, win, field)
  const { s } = view
  const polys = land.map((d) => flatten(d))
  const line = flatten(route, 60)
  const plates = wharves.map((w) => plate(w, s))
  const dotR = LABEL.dotPx / s
  // The caption's plate, in chart units, in the view's bottom-left corner.
  const cap = {
    x0: view.x0 + CAPTION.inset / s,
    x1: view.x0 + (CAPTION.inset + CAPTION.w) / s,
    y0: view.y1 - (CAPTION.inset + CAPTION.h) / s,
    y1: view.y1 - CAPTION.inset / s,
  }
  wharves.forEach((w, i) => {
    const p = plates[i]
    const tag = `${w.name} (${name} ${field}px)`
    const tight = grow(p, 2 / s)
    if (meets(tight, cap)) out.push(`${tag}: plate meets the caption`)
    if (meets(grow(cap, 2 / s), { x0: w.x - dotR, y0: w.y - dotR, x1: w.x + dotR, y1: w.y + dotR })) out.push(`${tag}: dot under the caption`)
    for (const [x, y] of samples(tight, 2 / s)) {
      if (polys.some((poly) => inside(poly, x, y))) { out.push(`${tag}: plate sits on land`); break }
    }
    if (line.some(([x, y]) => x > tight.x0 && x < tight.x1 && y > tight.y0 && y < tight.y1)) out.push(`${tag}: plate covers the route`)
    const f = { x0: ferry.x - 10 / s, y0: ferry.y - 10 / s, x1: ferry.x + 10 / s, y1: ferry.y + 10 / s }
    if (meets(tight, f)) out.push(`${tag}: plate covers the ferry`)
    wharves.forEach((o, j) => {
      if (j === i) return
      if (j > i && meets(tight, plates[j])) out.push(`${tag}: plate meets ${o.name}'s plate`)
      const dot = { x0: o.x - dotR, y0: o.y - dotR, x1: o.x + dotR, y1: o.y + dotR }
      if (meets(p, dot)) out.push(`${tag}: plate covers ${o.name}'s dot`)
    })
    // Cropping: a wharf is in the window with its whole label, or out of it
    // with none of it. A label cut in half would read as a bug.
    const dotIn = within({ x0: w.x - dotR, y0: w.y - dotR, x1: w.x + dotR, y1: w.y + dotR }, view)
    const m = grow(p, 2 / s)
    if (dotIn && !within(m, view)) out.push(`${tag}: dot in view, label cut by the edge`)
    if (!dotIn && meets(m, view)) out.push(`${tag}: dot out of view, label still in it`)
  })
  return out
}
