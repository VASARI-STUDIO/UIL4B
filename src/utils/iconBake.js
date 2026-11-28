// The customiser's stroke edits and the frame they need, in one place.
//
// A wider stroke, a square end or a mitred corner paints OUTSIDE the path, and a rotation turns
// the box. The pack's viewBox only has room for its own stroke, so a heavy or sharp edit used to
// come out clipped at the edge of the file. `measureBake` works out how far the paint can reach
// and the viewBox that holds it; the exported SVG (copy, download, PNG, save, the size rail and
// the line-style tiles) and the Stage preview all read it, so none of them can disagree.
// The file's width and height are never touched: only the viewBox grows.
//
// Only elements that really draw a stroke are edited. A filled shape in a mixed glyph keeps
// its fill and gets no stroke.

import { canPinWithVectorEffect, parseViewBoxRect, roundAttr, strokeAttrForPx, transformScale } from './iconStroke.js'

/** Where a mitred corner is cut to a bevel. The SVG default is 4; 2 keeps spikes short. */
export const MITER_LIMIT = 2

export const SHAPE_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])

const NON_DRAWING = new Set(['defs', 'clippath', 'mask', 'symbol', 'pattern', 'marker', 'lineargradient', 'radialgradient', 'filter'])
const NO_PAINT = new Set(['none', 'transparent'])

// A presentation value from the attribute or an inline style, whichever the element sets.
function ownValue(el, name) {
  const style = el.getAttribute?.('style')
  if (style) {
    const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(style)
    if (m) return m[1].trim()
  }
  const attr = el.getAttribute?.(name)
  return attr != null && attr.trim() !== '' ? attr.trim() : null
}

// The value an element ends up with: its own, else its nearest ancestor's up to the root.
function inherited(el, name, root) {
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
    const v = ownValue(n, name)
    if (v !== null) return v
    if (n === root) break
  }
  return null
}

function inNonDrawing(el, root) {
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
    if (NON_DRAWING.has(String(n.localName).toLowerCase())) return true
    if (n === root) break
  }
  return false
}

/** How far a stroke of painted width `w` can reach from the path, for this end and corner. */
export function strokeReach(w, cap, join) {
  const f = Math.max(join === 'miter' ? MITER_LIMIT : 1, cap === 'square' ? Math.SQRT2 : 1)
  return (w / 2) * f
}

/**
 * The viewBox rectangle for a base box grown by `pad` on every side and turned by `rotate`
 * degrees about its centre (the bounds of the turned box).
 */
export function framedBox(base, pad, rotate = 0) {
  const hw = base.w / 2 + pad
  const hh = base.h / 2 + pad
  const rad = (Number(rotate) || 0) * Math.PI / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const rw = c * hw + s * hh
  const rh = s * hw + c * hh
  const cx = base.x + base.w / 2
  const cy = base.y + base.h / 2
  const r = (n) => Math.round(n * 10000) / 10000
  return { x: r(cx - rw), y: r(cy - rh), w: r(rw * 2), h: r(rh * 2) }
}

/**
 * What the edits do to this drawing, without changing it.
 *
 * `svg` is a parsed or live <svg> element. Returns the elements that draw a stroke with the
 * width to write for each, the viewBox that holds the result, and whether the file may pin
 * its width with `vector-effect`. `frame` is null when the viewBox can stay as it is.
 */
export function measureBake(svg, { size, stroke, absStroke = false, cap, join, rotate = 0 }) {
  const hasBox = !!svg.getAttribute('viewBox')
  const base = parseViewBoxRect(svg.getAttribute('viewBox'))
  const els = [svg, ...svg.querySelectorAll('*')].filter((el) => !inNonDrawing(el, svg))
  // An icon the pack lists as a stroke set but whose markup names no stroke at all is drawn
  // with the root stroke the bake gives it, so every shape in it is stroked.
  const explicit = els.some((el) => { const v = ownValue(el, 'stroke'); return v !== null && !NO_PAINT.has(v.toLowerCase()) })
  const scaleOf = (el) => {
    let k = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
      k *= transformScale(n.getAttribute('transform'))
      if (n === svg) break
    }
    return k
  }
  const rows = []
  let anyScaled = false
  for (const el of els) {
    const k = scaleOf(el)
    if (k !== 1) anyScaled = true
    const paint = inherited(el, 'stroke', svg)
    const stroked = paint === null ? !explicit : !NO_PAINT.has(paint.toLowerCase())
    if (!stroked) continue
    const own = inherited(el, 'stroke-width', svg)
    const w0 = own === null ? 1 : parseFloat(own)
    if (!Number.isFinite(w0) || w0 === 0) continue
    rows.push({ el, k, w0, attr: null })
  }
  const shapes = rows.filter((r) => SHAPE_TAGS.has(String(r.el.localName).toLowerCase()))
  const ceiling = Math.max(base.w, base.h)
  const frameFor = (pad) => framedBox(base, pad, rotate)
  let pad = 0
  // A Fixed stroke is pixels, so its width in units depends on the frame it is drawn in, which
  // depends on the width. A few passes settle it; Relative reads the pack's own box and settles at once.
  for (let pass = 0; pass < (absStroke ? 5 : 1); pass += 1) {
    const f = frameFor(pad)
    const box = absStroke ? { w: f.w, h: f.h } : { w: base.w, h: base.h }
    let need = 0
    for (const r of rows) {
      r.attr = strokeAttrForPx({ px: stroke, size, viewBox: box, absolute: absStroke, inside: r.k })
    }
    for (const r of shapes) {
      const painted = (r.attr ?? r.w0) * r.k
      need = Math.max(need, strokeReach(painted, cap, join) - (r.w0 * r.k) / 2)
    }
    need = Math.min(Math.max(0, need), ceiling)
    if (Math.abs(need - pad) < 1e-4) { pad = need; break }
    pad = need
  }
  const frame = frameFor(pad)
  const grown = Math.abs(frame.w - base.w) > 1e-6 || Math.abs(frame.h - base.h) > 1e-6
  const pin = !!absStroke && canPinWithVectorEffect({ size, viewBox: { w: frame.w, h: frame.h }, scaledGroups: anyScaled })
  return { rows, frame: hasBox && grown ? frame : null, pad, pin }
}

/** The viewBox attribute text for a frame. */
export function viewBoxText(f) {
  return `${roundAttr(f.x)} ${roundAttr(f.y)} ${roundAttr(f.w)} ${roundAttr(f.h)}`
}

/** Write a measured bake into `svg`: width, ends, corners and the miter limit, on stroked elements only. */
export function applyBake(svg, plan, { cap, join }) {
  for (const { el, attr } of plan.rows) {
    if (attr != null) el.setAttribute('stroke-width', String(attr))
    if (plan.pin && SHAPE_TAGS.has(String(el.localName).toLowerCase())) el.setAttribute('vector-effect', 'non-scaling-stroke')
    if (cap) el.setAttribute('stroke-linecap', cap)
    if (join) el.setAttribute('stroke-linejoin', join)
    if (join === 'miter') el.setAttribute('stroke-miterlimit', String(MITER_LIMIT))
  }
  if (plan.frame) svg.setAttribute('viewBox', viewBoxText(plan.frame))
}

/** Whether any drawn element names a stroke of its own (the bake then leaves the root's alone). */
export function namesAStroke(svg) {
  return [svg, ...svg.querySelectorAll('*')].some((el) => {
    if (inNonDrawing(el, svg)) return false
    const v = ownValue(el, 'stroke')
    return v !== null && !NO_PAINT.has(v.toLowerCase())
  })
}
