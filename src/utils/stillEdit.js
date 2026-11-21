// The Image tab's still editor: crop, turn, flip, an exact output size and
// rounded corners. DOM-free apart from drawStill, which takes any 2D context,
// so the geometry can be unit-tested as numbers.
//
// Order of operations, always: the picture is turned, then flipped, then the
// crop box (which lives in that turned picture) cuts it, then the cut is placed
// into the output size by the fit mode, then the corners are rounded.
import { outputDimensions } from './imageResize.js'

export const STILL_FITS = [
  { id: 'fit', label: 'Fit' },
  { id: 'fill', label: 'Fill' },
  { id: 'stretch', label: 'Stretch' },
]

export const STILL_TURNS = [
  { id: 0, label: 'None' },
  { id: 90, label: '90° right' },
  { id: 180, label: '180°' },
  { id: 270, label: '90° left' },
]

/** Longest side of a typed output size; the canvas limit is checked separately. */
export const OUT_SIDE_MAX = 16384
export const RADIUS_MAX = 4096

export const STILL_DEFAULTS = Object.freeze({
  box: null,
  turn: 0,
  flipH: false,
  flipV: false,
  outW: 0,
  outH: 0,
  fit: 'fill',
  radius: 0,
})

// ── Turn and flip ────────────────────────────────────────────────────────────

/** Size of the picture after a turn of 0, 90, 180 or 270 degrees. */
export function orientedSize(w, h, turn) {
  return turn === 90 || turn === 270 ? { w: h, h: w } : { w, h }
}

/**
 * The affine map from the source picture (w x h) to the turned and flipped one,
 * as [a, b, c, d, e, f]: u = a*x + c*y + e, v = b*x + d*y + f.
 */
export function orientMatrix(w, h, turn = 0, flipH = false, flipV = false) {
  let m
  if (turn === 90) m = [0, 1, -1, 0, h, 0]
  else if (turn === 180) m = [-1, 0, 0, -1, w, h]
  else if (turn === 270) m = [0, -1, 1, 0, 0, w]
  else m = [1, 0, 0, 1, 0, 0]
  const o = orientedSize(w, h, turn)
  if (flipH) m = [-m[0], m[1], -m[2], m[3], o.w - m[4], m[5]]
  if (flipV) m = [m[0], -m[1], m[2], -m[3], m[4], o.h - m[5]]
  return m
}

export function applyMatrix(m, x, y) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }
}

function invertMatrix(m) {
  const det = m[0] * m[3] - m[1] * m[2]
  const a = m[3] / det
  const b = -m[1] / det
  const c = -m[2] / det
  const d = m[0] / det
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]
}

/**
 * Carries a crop box from one orientation of a source (w x h) to another, so
 * turning the picture turns the box with it.
 */
export function reorientBox(box, srcW, srcH, from, to) {
  if (!box) return null
  const back = invertMatrix(orientMatrix(srcW, srcH, from.turn, from.flipH, from.flipV))
  const fwd = orientMatrix(srcW, srcH, to.turn, to.flipH, to.flipV)
  const through = (x, y) => {
    const s = applyMatrix(back, x, y)
    return applyMatrix(fwd, s.x, s.y)
  }
  const p = through(box.x, box.y)
  const q = through(box.x + box.w, box.y + box.h)
  return {
    x: Math.round(Math.min(p.x, q.x)),
    y: Math.round(Math.min(p.y, q.y)),
    w: Math.round(Math.abs(q.x - p.x)),
    h: Math.round(Math.abs(q.y - p.y)),
  }
}

// ── Crop and output size ─────────────────────────────────────────────────────

/**
 * The crop box (pixels of a preview picture `pw` x `ph`) as a rectangle of an
 * oriented picture `w` x `h`. The same relative area is cut from every image in
 * a batch. No box is the whole picture.
 */
export function cropRect(box, pw, ph, w, h) {
  if (!box || !(pw > 0) || !(ph > 0)) return { x: 0, y: 0, w, h }
  const x = Math.max(0, Math.min(w - 1, Math.round((box.x / pw) * w)))
  const y = Math.max(0, Math.min(h - 1, Math.round((box.y / ph) * h)))
  return {
    x,
    y,
    w: Math.max(1, Math.min(w - x, Math.round((box.w / pw) * w))),
    h: Math.max(1, Math.min(h - y, Math.round((box.h / ph) * h))),
  }
}

/** A typed side: a whole number from 1 up, or 0 for "work it out". */
export const cleanSide = (v) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? Math.min(OUT_SIDE_MAX, n) : 0
}

/**
 * Where the cut goes in the output.
 *
 * With both sides typed the fit mode decides: Fit keeps the whole cut and leaves
 * bars, Fill covers the size and trims the overflow evenly, Stretch distorts.
 * With one side typed the other follows the cut's proportions; with none, the
 * size limit and export scale (utils/imageResize.js) apply as before.
 *
 * @returns {{w, h, src: {x, y, w, h}, dest: {x, y, w, h}, exact: boolean, capped: boolean}}
 *   `src` is a rectangle of the oriented picture, `dest` a rectangle of the output.
 */
export function planStill({ srcW, srcH, turn = 0, crop, outW = 0, outH = 0, fit = 'fill', maxDim = 0, renderScale = 1 }) {
  const o = orientedSize(srcW, srcH, turn)
  const src = crop || { x: 0, y: 0, w: o.w, h: o.h }
  const wantW = cleanSide(outW)
  const wantH = cleanSide(outH)
  if (!wantW && !wantH) {
    const d = outputDimensions(src.w, src.h, { maxDim, renderScale })
    return { w: d.w, h: d.h, src, dest: { x: 0, y: 0, w: d.w, h: d.h }, exact: false, capped: d.capped }
  }
  const w = wantW || Math.max(1, Math.round((wantH * src.w) / src.h))
  const h = wantH || Math.max(1, Math.round((wantW * src.h) / src.w))
  const plan = { w, h, src, dest: { x: 0, y: 0, w, h }, exact: true, capped: false }
  if (!(wantW && wantH) || fit === 'stretch') return plan
  if (fit === 'fit') {
    const s = Math.min(w / src.w, h / src.h)
    const dw = Math.max(1, Math.round(src.w * s))
    const dh = Math.max(1, Math.round(src.h * s))
    plan.dest = { x: Math.floor((w - dw) / 2), y: Math.floor((h - dh) / 2), w: dw, h: dh }
    return plan
  }
  const s = Math.max(w / src.w, h / src.h)
  const sw = w / s
  const sh = h / s
  plan.src = { x: src.x + (src.w - sw) / 2, y: src.y + (src.h - sh) / 2, w: sw, h: sh }
  return plan
}

/** The same plan at a fraction of its size (the Fit under KB search shrinks a PNG this way). */
export function scalePlan(plan, factor) {
  if (!(factor > 0) || factor === 1) return plan
  const side = (v) => Math.max(1, Math.round(v * factor))
  return {
    ...plan,
    w: side(plan.w),
    h: side(plan.h),
    dest: { x: Math.round(plan.dest.x * factor), y: Math.round(plan.dest.y * factor), w: side(plan.dest.w), h: side(plan.dest.h) },
  }
}

// ── Rounded corners ──────────────────────────────────────────────────────────

/** The radius actually used: a whole number, never more than half the shorter side. */
export function clampRadius(radius, w, h) {
  const r = Math.round(Number(radius))
  if (!Number.isFinite(r) || r <= 0) return 0
  return Math.min(r, RADIUS_MAX, Math.floor(Math.min(w, h) / 2))
}

/** Whether the centre of pixel (px, py) is inside a w x h rectangle with corner radius r. */
export function insideRounded(px, py, w, h, r) {
  const x = px + 0.5
  const y = py + 0.5
  if (x < 0 || y < 0 || x > w || y > h) return false
  if (!(r > 0)) return true
  const cx = x < r ? r : x > w - r ? w - r : x
  const cy = y < r ? r : y > h - r ? h - r : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** Traces a rounded rectangle on a 2D context (arcTo, so no roundRect needed). */
export function roundedRectPath(ctx, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(w, 0, w, h, r)
  ctx.arcTo(w, h, 0, h, r)
  ctx.arcTo(0, h, 0, 0, r)
  ctx.arcTo(0, 0, w, 0, r)
  ctx.closePath()
}

/**
 * Draws one image into a 2D context as the plan says: turned and flipped, cut,
 * placed, and clipped to rounded corners. Pixels outside the corners are left
 * untouched (transparent on a fresh canvas); `background` fills the whole canvas
 * first, for formats with no alpha.
 */
export function drawStill(ctx, image, imgW, imgH, plan, { turn = 0, flipH = false, flipV = false, radius = 0, background = null } = {}) {
  const { w, h, src, dest } = plan
  ctx.save()
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, w, h)
  }
  const r = clampRadius(radius, w, h)
  if (r > 0) {
    roundedRectPath(ctx, w, h, r)
    ctx.clip()
  }
  ctx.beginPath()
  ctx.rect(dest.x, dest.y, dest.w, dest.h)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const [a, b, c, d, e, f] = orientMatrix(imgW, imgH, turn, flipH, flipV)
  const sx = dest.w / src.w
  const sy = dest.h / src.h
  ctx.setTransform(sx * a, sy * b, sx * c, sy * d, dest.x + sx * (e - src.x), dest.y + sy * (f - src.y))
  ctx.drawImage(image, 0, 0, imgW, imgH)
  ctx.restore()
}

// ── The edit list's words ────────────────────────────────────────────────────
// The same shape as the Video tab's (utils/editHistory.js): the keys that make
// a recipe, the phrases for them and the keys a drag merges into one step.

const GROUPS = [
  {
    name: 'turn',
    keys: ['turn'],
    say: r => {
      if (!r.turn) return null
      return `Turned ${STILL_TURNS.find(t => t.id === r.turn)?.label || `${r.turn}°`}`
    },
  },
  {
    name: 'flip',
    keys: ['flipH', 'flipV'],
    say: r => (r.flipH && r.flipV ? 'Flipped both ways' : r.flipH ? 'Flipped horizontally' : r.flipV ? 'Flipped vertically' : null),
  },
  { name: 'crop', keys: ['box'], say: r => (r.box ? 'Cropped' : null) },
  {
    name: 'size',
    keys: ['outW', 'outH', 'fit'],
    say: r => {
      if (!r.outW && !r.outH) return null
      const size = r.outW && r.outH ? `${r.outW}×${r.outH}` : r.outW ? `${r.outW} px wide` : `${r.outH} px tall`
      const how = r.outW && r.outH ? { fit: ', fitted', fill: ', filled', stretch: ', stretched' }[r.fit] || '' : ''
      return `Sized to ${size}${how}`
    },
  },
  { name: 'corners', keys: ['radius'], say: r => (r.radius > 0 ? `Corners rounded ${r.radius} px` : null) },
]

export const STILL_SPEC = Object.freeze({
  keys: Object.keys(STILL_DEFAULTS),
  groups: GROUPS,
  gestureKeys: ['box', 'radius'],
})
