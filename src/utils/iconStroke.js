// Icon stroke width: the control means PIXELS, and a mode says how they behave when the
// icon's size changes.
//
// SVG `stroke-width` is measured in viewBox USER UNITS, not pixels. A file whose viewBox is
// 24 units wide and whose width/height is 48 is drawn at 2x, so `stroke-width="2"` lands
// as 4px. This module owns the one conversion from the slider's pixels to the number
// written into the file, so the stage, the size rail, the SVG code and the PNG all call
// the same functions and cannot drift apart.
//
// The slider value S has two meanings, one per mode:
//
//   Relative  S is the stroke in pixels on a 24px icon. The stroke is a share of the icon
//             (S/24 of its width), so every Size, and every PNG at 1x, 2x or 4x, is the
//             same picture drawn larger or smaller. The attribute written never depends on
//             the Size.
//   Fixed     S is the stroke in pixels, full stop. It is the same weight at every Size and
//             every PNG scale, so a larger icon looks lighter. The attribute written is
//             S divided by the scale the file is drawn at.
//
// At Size 24 (the reference size) and 1x the two modes draw the same pixels.
//
// DOM-free on purpose: it is arithmetic plus a few regexes, so the contract is testable
// without a browser.

import { DEFAULT_EXPORT_SIZE } from './iconSize.js'

/** Every pack we ship draws on a 24-unit grid; the fallback when none is given. */
export const DEFAULT_VIEWBOX = 24

/** The size at which a Relative stroke reads as pixels, and where the two modes agree. */
export const STROKE_REFERENCE_SIZE = 24

/**
 * The stroke slider's range, in pixels.
 *
 * 0.5 to 8 covers hairline through heavy on the sizes the editor offers. `inputMin` is low
 * enough to hold a 2px stroke drawn at the largest custom size as a Relative value
 * (2px at 1024 is 0.047px on the 24px reference), and `inputMax` lets a typed value go
 * genuinely heavy.
 *
 * `default: 2` is the pack's own weight on the 24 grid.
 */
export const STROKE_PX = Object.freeze({
  min: 0.5,
  max: 8,
  step: 0.25,
  snaps: Object.freeze([1, 2, 3, 4, 6]),
  default: 2,
  inputMin: 0.04,
  inputMax: 64,
})

/**
 * Marker on a saved custom-icon record: its `stroke` is the slider value as it means
 * today (pixels on the 24px reference when Relative, pixels when Fixed).
 */
export const STROKE_UNIT_REF = 'px24'

/** Marker on a record that stored pixels at its own export size (the older meaning). */
export const STROKE_UNIT_PX = 'px'

/**
 * The size an older editor opened at, kept for saved records and homepage drafts that
 * carry no size.
 */
export const DEFAULT_ICON_SIZE = 48

const fmtPx = (n) => String(Math.round(n * 100) / 100)

/**
 * The line under the stroke control, in the slider's pixels, saying what the chosen mode
 * does. `effect` is the part shown in bold.
 */
export function strokeScaleCaption({ size, stroke, absolute }) {
  if (absolute) {
    return {
      prefix: 'Fixed: the stroke is ',
      effect: `${fmtPx(stroke)}px`,
      suffix: ' at every size and PNG scale, so bigger icons look lighter.',
    }
  }
  const here = Number(size) === STROKE_REFERENCE_SIZE
    ? `${fmtPx(stroke)}px at ${STROKE_REFERENCE_SIZE}px`
    : `${fmtPx(stroke)}px at ${STROKE_REFERENCE_SIZE}px, ${fmtPx(stroke * size / STROKE_REFERENCE_SIZE)}px at ${fmtPx(size)}px`
  return {
    prefix: 'Relative: the stroke grows with the icon, ',
    effect: here,
    suffix: '. Every size and PNG scale looks the same.',
  }
}

// Five decimals keeps an irrational conversion (a 20-unit viewBox at size 48
// gives 0.83333) inside a thousandth of a pixel once the renderer scales it
// back up, while leaving the common cases exact: 1, 0.75, 0.375.
const ATTR_DECIMALS = 5

/** Round a stroke-width attribute to a value that serialises cleanly. */
export function roundAttr(n) {
  return Number(Number(n).toFixed(ATTR_DECIMALS))
}

/**
 * Parse a `viewBox` attribute into its width and height. Anything missing,
 * malformed, zero or negative falls back to the 24-unit grid rather than
 * producing a NaN that would silently poison the stroke.
 */
export function parseViewBox(attr) {
  const parts = String(attr ?? '').trim().split(/[\s,]+/).map(Number)
  const ok = (n) => Number.isFinite(n) && n > 0
  return {
    w: parts.length === 4 && ok(parts[2]) ? parts[2] : DEFAULT_VIEWBOX,
    h: parts.length === 4 && ok(parts[3]) ? parts[3] : DEFAULT_VIEWBOX,
  }
}

/**
 * The viewBox attribute's four numbers: origin and size. Missing or malformed gives the
 * 24 grid at the origin. Commas and spaces both separate, as the browser allows.
 */
export function parseViewBoxRect(attr) {
  const parts = String(attr ?? '').trim().split(/[\s,]+/).map(Number)
  if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
  }
  return { x: 0, y: 0, w: DEFAULT_VIEWBOX, h: DEFAULT_VIEWBOX }
}

/** Pull the viewBox out of raw SVG markup. Pasted and custom icons are not 24. */
export function viewBoxOf(svgText) {
  const m = /<svg\b[^>]*?\sviewBox\s*=\s*(["'])([^"']*)\1/i.exec(String(svgText ?? ''))
  return parseViewBox(m ? m[2] : null)
}

/** Accept a `{w,h}`, a bare number (square), or a raw viewBox attribute string. */
function boxOf(viewBox) {
  if (typeof viewBox === 'number') {
    return viewBox > 0 ? { w: viewBox, h: viewBox } : { w: DEFAULT_VIEWBOX, h: DEFAULT_VIEWBOX }
  }
  if (viewBox && typeof viewBox === 'object') {
    const { w, h } = viewBox
    return parseViewBox(`0 0 ${w} ${h}`)
  }
  return parseViewBox(viewBox)
}

/**
 * How many rendered pixels one viewBox user unit becomes.
 *
 * Both width and height are set to `size`, so a NON-SQUARE viewBox is
 * letterboxed by the default `preserveAspectRatio` ("xMidYMid meet") and the
 * uniform scale is the SMALLER of the two ratios. Square viewBoxes collapse to the
 * familiar size / 24. The viewBox origin does not matter: only its size scales.
 */
export function renderScale(size, viewBox = DEFAULT_VIEWBOX) {
  const s = Number(size)
  if (!Number.isFinite(s) || s <= 0) return 1
  const { w, h } = boxOf(viewBox)
  return Math.min(s / w, s / h)
}

/**
 * The `stroke-width` value to write for a drawing `size` pixels wide.
 *
 *   Relative  `px` is pixels on the 24px reference: the number depends on the icon's
 *             viewBox only, never on `size`.
 *   Fixed     `px` is pixels in this drawing: the number is `px` over the scale the
 *             drawing is rendered at, so it measures `px` at `size`.
 *
 * `inside` is the factor an ancestor `transform` scales this element by (see
 * `transformScale`); the attribute is divided by it so the painted stroke is unchanged.
 * `null` for an unusable input, so callers can skip the attribute rather than writing
 * "NaN" into someone's file.
 */
export function strokeAttrForPx({ px, size, viewBox, absolute = false, inside = 1 }) {
  // Zero and below are rejected along with NaN: a zero-width stroke is an
  // invisible icon, and leaving the pack's own attribute in place is the less
  // destructive answer to input we cannot honour. (`Number(null)` and
  // `Number('')` are both 0, which is how empty state arrives here.)
  const wanted = Number(px)
  if (!Number.isFinite(wanted) || wanted <= 0) return null
  const scale = renderScale(absolute ? size : STROKE_REFERENCE_SIZE, viewBox)
  const k = Number.isFinite(inside) && inside > 0 ? inside : 1
  return roundAttr(scale > 0 ? wanted / scale / k : wanted / k)
}

/**
 * The slider value to hand to a drawing that is a zoomed view of the export. The stage
 * draws the icon `drawSize` wide to inspect it, but it stands for a file `exportSize`
 * wide: a Fixed stroke is magnified with the picture, a Relative one already is.
 */
export function zoomedStroke({ px, absolute, drawSize, exportSize }) {
  const e = Number(exportSize)
  return absolute && e > 0 ? Number(px) * drawSize / e : Number(px)
}

/**
 * Whether a Fixed file may also carry `vector-effect="non-scaling-stroke"`. That property
 * reads the width as screen pixels, so it only agrees with the width written for the
 * export size when one user unit is one pixel; at any other scale it would paint the
 * wrong weight, and a consumer that ignores it would paint another. Elements inside a
 * scaled group are left to the plain attribute too.
 */
export function canPinWithVectorEffect({ size, viewBox, scaledGroups = false }) {
  if (scaledGroups) return false
  return Math.abs(renderScale(size, viewBox) - 1) < 1e-9
}

/**
 * How much a `transform` attribute scales lengths, as one number: the geometric mean of
 * its linear stretch. Translate, rotate and skew leave lengths alone; scale and matrix
 * change them. A stroke inside a scaled group is scaled with it, so the width written for
 * the element is divided by this. Unparseable or degenerate transforms count as 1.
 */
export function transformScale(transform) {
  const text = String(transform ?? '')
  if (!text.trim()) return 1
  let total = 1
  const call = /([a-zA-Z]+)\s*\(([^)]*)\)/g
  let m
  while ((m = call.exec(text))) {
    const args = m[2].split(/[\s,]+/).filter(Boolean).map(Number)
    if (args.some(n => !Number.isFinite(n))) return 1
    const name = m[1].toLowerCase()
    if (name === 'scale' && args.length >= 1) {
      const sx = args[0]
      const sy = args.length > 1 ? args[1] : sx
      total *= Math.sqrt(Math.abs(sx * sy))
    } else if (name === 'matrix' && args.length === 6) {
      total *= Math.sqrt(Math.abs(args[0] * args[3] - args[1] * args[2]))
    }
  }
  return Number.isFinite(total) && total > 0 ? total : 1
}

/** Keep a pixel width inside what the control can hold; never return NaN. */
export function clampStrokePx(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return STROKE_PX.default
  return Math.min(STROKE_PX.inputMax, Math.max(STROKE_PX.inputMin, v))
}

/**
 * The slider value and mode a SAVED custom icon should re-open with.
 *
 * Three eras of record, each mapped so the icon draws exactly as it did when saved:
 *   strokeUnit 'px24'  written today: the value is already the slider value
 *   strokeUnit 'px'    pixels at the record's own size, Relative: it was drawn with
 *                      stroke-width = px / scale(size). Today's Relative writes the value
 *                      over scale(24), so the same attribute needs px x scale(24)/scale(size)
 *   no stamp           viewBox user units: stroke-width = the stored number, so the value
 *                      is units x scale(24)
 * A record saved as absolute (Fixed) held pixels in every era, and Fixed still means
 * pixels, so it is carried over untouched.
 *
 * `null` when the record has no usable stroke, so the caller seeds its default instead.
 */
export function customIconStroke(record) {
  if (!record) return null
  const stored = Number(record.stroke)
  if (!Number.isFinite(stored) || stored <= 0) return null
  const absStroke = !!record.absStroke
  if (record.strokeUnit === STROKE_UNIT_REF || absStroke) return { px: clampStrokePx(stored), absStroke }
  const box = viewBoxOf(record.svg)
  const reference = renderScale(STROKE_REFERENCE_SIZE, box)
  if (record.strokeUnit === STROKE_UNIT_PX) {
    return { px: clampStrokePx(stored * reference / renderScale(record.size || DEFAULT_ICON_SIZE, box)), absStroke }
  }
  return { px: clampStrokePx(stored * reference), absStroke }
}

/** The slider value of a saved record (see `customIconStroke`), or null. */
export function customIconStrokePx(record) {
  return customIconStroke(record)?.px ?? null
}

// A sticky stroke is "<viewBox units>u" on the 24 grid. Units do not depend on the export
// size, so the weight survives the editor's opening size changing.
const STICKY_UNITS = /^(\d*\.?\d+)u$/

/**
 * The text the sticky key stores for slider value `px`. The slider value is already on
 * the 24px reference, so on the 24 grid the token is the number itself; `size` and
 * `viewBox` stay as optional inputs for a value that was measured at another size.
 */
export function stickyStrokeToken(px, size = STROKE_REFERENCE_SIZE, viewBox = DEFAULT_VIEWBOX) {
  return `${roundAttr(Number(px) / renderScale(size, viewBox) * renderScale(STROKE_REFERENCE_SIZE, viewBox))}u`
}

/**
 * The slider value the sticky preference should seed.
 *
 * `raw` is the pixel key and `legacyRaw` the older user-unit one. Three shapes:
 *   "2u"      units on the 24 grid, written now: the same number is the slider value
 *   "4"       a bare pixel number, written while the editor opened at size 48 with the
 *             stroke measured at that size, so it carries half the weight on the 24 grid
 *   legacy    a bare user-unit number (1 to 3), already a weight on the 24 grid
 * The aim is "the next icon starts at the same weight", so the weight survives, not the digit.
 */
export function stickyStrokePx(raw, legacyRaw) {
  const open = renderScale(DEFAULT_EXPORT_SIZE, DEFAULT_VIEWBOX)
  const units = STICKY_UNITS.exec(String(raw ?? '').trim())
  if (units && Number(units[1]) > 0) return clampStrokePx(Number(units[1]) * open)
  const px = Number(raw)
  if (Number.isFinite(px) && px > 0) return clampStrokePx(px * open / renderScale(DEFAULT_ICON_SIZE, DEFAULT_VIEWBOX))
  const legacy = Number(legacyRaw)
  // The old key's own validity window; anything outside it was never written
  // by us and is not worth reinterpreting.
  if (Number.isFinite(legacy) && legacy >= 1 && legacy <= 3) return clampStrokePx(legacy * open)
  return STROKE_PX.default
}

/**
 * The slider value a homepage hand-off draft should open at. The homepage preview draws
 * a bare 24-viewBox glyph with its stroke in user units, which is the same share of the
 * icon as a Relative stroke of that many pixels on the 24px reference.
 */
export function draftStrokePx(draftStroke) {
  const units = Number(draftStroke)
  if (!Number.isFinite(units) || units <= 0) return null
  return clampStrokePx(units)
}

// ── Does the artwork draw with a stroke? ─────────────────────────────────────

const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
const NON_DRAWING = new Set(['defs', 'clippath', 'mask', 'symbol', 'pattern', 'marker', 'lineargradient', 'radialgradient', 'filter'])
const NO_PAINT = new Set(['', 'none', 'transparent'])

/**
 * Whether the markup draws with a stroke that the Stroke control can change: some element
 * outside defs, masks and clip paths sets a `stroke` other than `none` (a colour or
 * `currentColor`) and does not turn the width off. Filled glyphs (Phosphor, Material,
 * Solar bold) set none, outline sets (Lucide, Tabler, Solar linear, Iconoir) do.
 * Read once per loaded SVG; it is one pass over the tags.
 */
export function markupHasStroke(svg) {
  const text = String(svg ?? '')
  if (!text) return false
  const hidden = []
  let match
  // A flat scan of the tags with a depth counter for the non-drawing containers.
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g
  while ((match = tagRe.exec(text))) {
    const [, closing, rawName, attrText, selfClosing] = match
    const name = rawName.toLowerCase()
    if (closing) {
      const at = hidden.lastIndexOf(name)
      if (at >= 0) hidden.length = at
      continue
    }
    if (NON_DRAWING.has(name)) {
      if (!selfClosing) hidden.push(name)
      continue
    }
    if (hidden.length) continue
    let stroke = null
    let width = null
    ATTR.lastIndex = 0
    let a
    while ((a = ATTR.exec(attrText))) {
      const key = a[1].toLowerCase()
      const value = (a[2] ?? a[3] ?? a[4] ?? '').trim().toLowerCase()
      if (key === 'stroke') stroke = value
      else if (key === 'stroke-width') width = value
    }
    if (stroke !== null && !NO_PAINT.has(stroke) && !(width !== null && Number(width) === 0 && width !== '')) return true
  }
  return false
}
