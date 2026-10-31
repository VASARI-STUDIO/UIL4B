// Which ink to set over a gradient. The candidates are near-black and near-white (not
// pure); the winner is the one with the higher worst-case contrast against the colours
// the text can sit over. With no region that is every stop and the midpoint between each
// neighbouring pair. With a region (the box the text occupies on the painted area) it is
// only the part of the gradient that box covers, so a dark-left hero is not judged by the
// bright stop on the far side.
import { contrastRatio, mixHex } from './colors.js'

export const INK_DARK = { hex: '#181818', css: 'oklch(0.2 0 0)' }
export const INK_LIGHT = { hex: '#FAFAFA', css: 'oklch(0.98 0 0)' }
export const BODY_TEXT_RATIO = 4.5

const channel = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
const midpoint = (a, b) => `#${[0, 1, 2].map((i) => Math.round((channel(a, i) + channel(b, i)) / 2).toString(16).padStart(2, '0')).join('')}`

/** The colours text can sit on: each stop and the middle of each neighbouring pair, in position order. */
export function inkSamples(stops) {
  const sorted = [...stops].sort((a, b) => a.position - b.position).map((s) => s.color)
  const out = []
  sorted.forEach((c, i) => {
    out.push(c)
    if (sorted[i + 1]) out.push(midpoint(c, sorted[i + 1]))
  })
  return out
}

const clamp01 = (n) => Math.min(1, Math.max(0, n))
const TURN = 360

/**
 * Which part of the gradient a box covers, as [from, to] runs of the gradient's own 0..1
 * position (two runs when a conic seam passes through the box).
 * `box` is { x, y, w, h } as fractions of the painted area, `aspect` its width over height.
 * Geometry follows CSS: a linear gradient runs along `angle` with its length fitted to the
 * area, a radial one is the default farthest-corner ellipse, a conic one starts at `angle`
 * and turns clockwise; radial and conic are centred.
 */
export function gradientSpan(type, angle, box, aspect = 1) {
  const W = aspect
  const H = 1
  const x0 = box.x * W
  const x1 = (box.x + box.w) * W
  const y0 = box.y * H
  const y1 = (box.y + box.h) * H
  if (type === 'Radial') {
    const rx = (W / 2) * Math.SQRT2
    const ry = (H / 2) * Math.SQRT2
    const [u0, u1] = [(x0 - W / 2) / rx, (x1 - W / 2) / rx]
    const [v0, v1] = [(y0 - H / 2) / ry, (y1 - H / 2) / ry]
    const near = (a, b) => (a <= 0 && b >= 0 ? 0 : Math.min(Math.abs(a), Math.abs(b)))
    const far = (a, b) => Math.max(Math.abs(a), Math.abs(b))
    return [[clamp01(Math.hypot(near(u0, u1), near(v0, v1))), clamp01(Math.hypot(far(u0, u1), far(v0, v1)))]]
  }
  if (type === 'Conic') {
    const cx = W / 2
    const cy = H / 2
    if (x0 <= cx && x1 >= cx && y0 <= cy && y1 >= cy) return [[0, 1]]
    const from = ((angle % TURN) + TURN) % TURN
    const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]
      .map(([x, y]) => ((((Math.atan2(x - cx, cy - y) * 180) / Math.PI - from) % TURN) + TURN) % TURN)
      .sort((a, b) => a - b)
    // The box is on one side of the centre, so its corners span under half a turn:
    // the run is everything outside the widest gap between neighbouring corners.
    let gap = corners[0] + TURN - corners[3]
    let start = corners[0]
    for (let i = 1; i < 4; i++) {
      if (corners[i] - corners[i - 1] > gap) { gap = corners[i] - corners[i - 1]; start = corners[i] }
    }
    const end = start + (TURN - gap)
    return end <= TURN ? [[start / TURN, end / TURN]] : [[start / TURN, 1], [0, (end - TURN) / TURN]]
  }
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const length = Math.abs(W * dx) + Math.abs(H * dy)
  if (length === 0) return [[0, 1]]
  const at = (x, y) => 0.5 + ((x - W / 2) * dx + (y - H / 2) * dy) / length
  const ts = [at(x0, y0), at(x1, y0), at(x0, y1), at(x1, y1)]
  return [[clamp01(Math.min(...ts)), clamp01(Math.max(...ts))]]
}

// The colour at position t (0..1): the end stop's colour outside the stops, a blend of the neighbours inside.
function colourAt(sorted, t) {
  const pct = t * 100
  if (pct <= sorted[0].position) return sorted[0].color
  const last = sorted[sorted.length - 1]
  if (pct >= last.position) return last.color
  const i = sorted.findIndex((s) => s.position >= pct)
  const a = sorted[i - 1]
  const b = sorted[i]
  return b.position === a.position ? b.color : mixHex(a.color, b.color, (pct - a.position) / (b.position - a.position))
}

/** The colours text can sit on inside `spans`: both ends of each run, each stop inside it, and the points a quarter, half and three quarters between neighbours. */
export function regionSamples(stops, spans) {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const out = []
  for (const [from, to] of spans) {
    const ts = [from, ...sorted.map((s) => s.position / 100).filter((p) => p > from && p < to), to]
    ts.forEach((t, i) => {
      out.push(colourAt(sorted, t))
      if (i < ts.length - 1) for (const q of [0.25, 0.5, 0.75]) out.push(colourAt(sorted, t + (ts[i + 1] - t) * q))
    })
  }
  return out
}

const worst = (ink, samples) => Math.min(...samples.map((c) => contrastRatio(ink.hex, c)))

/**
 * { css, hex, ratio, low }: the ink to use, its worst-case ratio to one decimal place, and
 * whether it misses 4.5:1. `over` ({ type, angle, box, aspect }) limits the check to the
 * part of the gradient that box covers; leave it out to cover the whole gradient.
 */
export function pickInk(stops, over) {
  const samples = over ? regionSamples(stops, gradientSpan(over.type, over.angle, over.box, over.aspect)) : inkSamples(stops)
  const dark = worst(INK_DARK, samples)
  const light = worst(INK_LIGHT, samples)
  const ink = dark >= light ? INK_DARK : INK_LIGHT
  const ratio = Math.floor(Math.max(dark, light) * 10) / 10
  return { css: ink.css, hex: ink.hex, ratio, low: ratio < BODY_TEXT_RATIO }
}
