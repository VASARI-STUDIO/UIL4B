// E5, "Hale & Okoro Architects": a practice's portfolio, the Marketing example in
// the Pro set. Display type over an axonometric drawing of a house on a slope,
// then a project index set as a typographic table. Plain data, no React, so
// tests read the roles, the text recipe and the drawing without a DOM.
//
// The drawing is computed, not traced: every face is a polygon in one
// axonometric projection of a handful of boxes, so a dimension can be changed
// below and the roofs, walls, posts and ground all follow.
import { brandAsText, fieldEdge } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'neutral']

export const TEXT_RECIPE = [
  { el: 'headline', ink: 'text', large: true },
  { el: 'headline, last line', ink: 'muted', large: true },
  { el: 'studio name, nav, project names', ink: 'text', large: false },
  { el: 'lede, labels, suburb, type, year, footer, dimensions', ink: 'muted', large: false },
  { el: 'email link', ink: 'brandAsText:primary', grounds: ['canvas'], large: false },
]

export const COPY = {
  studio: 'Hale & Okoro',
  nav: ['Work', 'Studio', 'Contact'],
  email: 'hello@haleokoro.example',
  lines: ['Houses for', 'steep', 'blocks'],
  lede: 'Nine people designing for slope, wind and one very long stair. Every project here falls at least one in four.',
  head: ['Project', 'Suburb', 'Year', 'Type'],
  projects: [
    ['Gully House', 'Katoomba', '2025', 'New house'],
    ['Cutting House', 'Mt Lofty', '2024', 'Alteration'],
    ['Stair House', 'Paddington QLD', '2023', 'New house'],
    ['Ledge Studio', 'Hobart', '2022', 'Studio'],
    ['Spur House', 'Warburton', '2021', 'New house'],
  ],
  footer: 'Practice registered in NSW and VIC. Sample content.',
}

// ── The drawing ─────────────────────────────────────────────────────────────
// Axonometric: x runs right and down, y runs left and down, z is up. Units are
// metres; S scales them to the drawing's own coordinates.
const S = 26
const C30 = Math.cos(Math.PI / 6)
const FALL = 0.25 // metres of drop for each metre downhill: "1 in 4"
const GROUND = (y) => 3.2 - FALL * y // ground level at distance y downhill
const SLAB = 10 // the plot is 10 m by 10 m
const DEPTH = 0.9 // the slab's thickness, as drawn

const fmt = (v) => v.toFixed(1)
const bounds = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }
// Projects a point and records it, so the viewBox is fitted to what is drawn.
function at(x, y, z) {
  const X = (x - y) * C30 * S
  const Y = (x + y) * 0.5 * S - z * S
  bounds.x0 = Math.min(bounds.x0, X)
  bounds.x1 = Math.max(bounds.x1, X)
  bounds.y0 = Math.min(bounds.y0, Y)
  bounds.y1 = Math.max(bounds.y1, Y)
  return [X, Y]
}
const poly = (pts) => `M${pts.map(([X, Y]) => `${fmt(X)} ${fmt(Y)}`).join('L')}Z`
const seg = (a, b) => `M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}`

// One volume with a mono-pitch roof that rises toward the hill: its footprint,
// its floor level, and the roof's height at the uphill (y0) and downhill (y1) edges.
function volume({ x0, x1, y0, y1, floor, roofUp, roofDown }) {
  const over = 0.35 // the roof overhangs the walls
  return {
    lit: poly([at(x0, y1, floor), at(x1, y1, floor), at(x1, y1, roofDown), at(x0, y1, roofDown)]),
    shade: poly([at(x1, y0, floor), at(x1, y1, floor), at(x1, y1, roofDown), at(x1, y0, roofUp)]),
    roof: poly([at(x0 - over, y0 - over, roofUp), at(x1 + over, y0 - over, roofUp), at(x1 + over, y1 + over, roofDown), at(x0 - over, y1 + over, roofDown)]),
    // A band of glass across the downhill face, divided by mullions.
    glass: (xa, xb, za, zb) => poly([at(xa, y1, za), at(xb, y1, za), at(xb, y1, zb), at(xa, y1, zb)]),
    mullions: (xa, xb, za, zb, n) => Array.from({ length: n - 1 }, (_, i) => {
      const x = xa + ((xb - xa) * (i + 1)) / n
      return seg(at(x, y1, za), at(x, y1, zb))
    }).join(''),
    y1,
  }
}

// The upper volume is a studio cut into the slope; the lower is the house on posts.
const STUDIO = volume({ x0: 2, x1: 6.2, y0: 0.4, y1: 3.4, floor: 3.2, roofUp: 6.9, roofDown: 6.3 })
const HOUSE = volume({ x0: 1, x1: 8.4, y0: 3.4, y1: 7, floor: 2.3, roofUp: 4.9, roofDown: 4.3 })

// The posts under the house: down from the floor to the ground at the downhill edge.
const POST_Y = 6.6
const POSTS = [1.5, 3.2, 4.9, 6.6, 7.9]
  .map((x) => seg(at(x, POST_Y, 2.3), at(x, POST_Y, GROUND(POST_Y))))
  .join('')

// 45-degree-ish hatching on the sloping ground, along the fall line.
const HATCH = Array.from({ length: 19 }, (_, i) => {
  const x = ((i + 1) * SLAB) / 20
  return seg(at(x, 0, GROUND(0)), at(x, SLAB, GROUND(SLAB)))
}).join('')

const slabTop = poly([at(0, 0, GROUND(0)), at(SLAB, 0, GROUND(0)), at(SLAB, SLAB, GROUND(SLAB)), at(0, SLAB, GROUND(SLAB))])
const slabRight = poly([at(SLAB, 0, GROUND(0)), at(SLAB, SLAB, GROUND(SLAB)), at(SLAB, SLAB, GROUND(SLAB) - DEPTH), at(SLAB, 0, GROUND(0) - DEPTH)])
const slabFront = poly([at(0, SLAB, GROUND(SLAB)), at(SLAB, SLAB, GROUND(SLAB)), at(SLAB, SLAB, GROUND(SLAB) - DEPTH), at(0, SLAB, GROUND(SLAB) - DEPTH)])
const slope = seg(at(SLAB, 0, GROUND(0)), at(SLAB, SLAB, GROUND(SLAB)))

// Two dimension callouts: the level at the top of the plot, the fall along its edge.
const TOP = at(SLAB, 0, GROUND(0))
const MID = at(SLAB, SLAB / 2, GROUND(SLAB / 2))
const LEAD = 22
const leaders = seg(TOP, [TOP[0], TOP[1] - LEAD]) + seg(MID, [MID[0] + LEAD, MID[1]])
// Room in the box for the two labels, which are laid over the drawing as text.
bounds.y0 = Math.min(bounds.y0, TOP[1] - LEAD - 24)
bounds.x1 = Math.max(bounds.x1, MID[0] + LEAD + 120)

// The glass: one long window across the house. The studio sits behind its roof.
const houseGlass = HOUSE.glass(1.9, 7.5, 2.8, 3.9)
const mullions = HOUSE.mullions(1.9, 7.5, 2.8, 3.9, 5)

const PAD = 28
const vx = bounds.x0 - PAD
const vy = bounds.y0 - PAD
const vw = bounds.x1 - bounds.x0 + PAD * 2
const vh = bounds.y1 - bounds.y0 + PAD * 2
// A point as a share of the viewBox, for the labels laid over the drawing.
const share = ([X, Y]) => [Math.round(((X - vx) / vw) * 1000) / 10, Math.round(((Y - vy) / vh) * 1000) / 10]

export const DRAWING = {
  viewBox: `${fmt(vx)} ${fmt(vy)} ${fmt(vw)} ${fmt(vh)}`,
  ratio: vw / vh,
  slabTop, slabRight, slabFront, hatch: HATCH, slope, posts: POSTS, leaders, mullions,
  studio: { lit: STUDIO.lit, shade: STUDIO.shade, roof: STUDIO.roof },
  house: { lit: HOUSE.lit, shade: HOUSE.shade, roof: HOUSE.roof, glass: houseGlass },
  callouts: [
    { text: 'RL 112.40', at: share([TOP[0], TOP[1] - LEAD]), anchor: 'top' },
    { text: 'Fall 1 in 4', at: share([MID[0] + LEAD, MID[1]]), anchor: 'side' },
  ],
}

/**
 * The colours this scene works out per palette and mode: the email link (the
 * primary as text), and a seam colour for each brand fill in the drawing. A seam
 * is the canvas, which keeps neighbouring planes apart, or the strong border
 * when the fill is too close to the canvas to read against it.
 * @param {object} r derivePaletteRoles() output
 */
export function haleOkoroVars(r) {
  const keep = Boolean(r.pair)
  const link = keep ? { hex: r.text, adjusted: false } : brandAsText(r.primary, [r.canvas])
  const seam = (fill) => {
    const e = fieldEdge(fill, r.canvas, r.borderStrong)
    return e === 'transparent' ? r.canvas : e
  }
  return {
    vars: {
      '--ho-link': link.hex,
      '--ho-seam-primary': seam(r.primary),
      '--ho-seam-secondary': seam(r.secondary),
      '--ho-seam-accent': seam(r.accent),
      '--ho-seam-subtle': seam(r.subtle),
      '--ho-seam-deep': seam(r.deep),
      // Ground hatching holds at the dark canvas only one step stronger.
      '--ho-line': r.mode === 'dark' ? r.borderStrong : r.border,
    },
    linkAdjusted: link.adjusted,
  }
}
