// Icon stroke width — the control means PIXELS.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (founder bug report, 2026-09-02)
// ─────────────────────────────────────────────────────────────────────────────
// "I tried exporting a 2px stroke width and it exported at 4px."
//
// SVG `stroke-width` is measured in viewBox USER UNITS, not pixels. Our icons
// carry a 24-unit viewBox and the export writes width/height = `size`, whose
// default is 48. The renderer therefore scales the whole drawing by size/24 —
// 2x at the default — and a stroke-width of 2 lands on screen as 4px. At
// size 64 it is worse and fractional: 2 becomes 5.33px.
//
// Nothing in the serializer was wrong; it wrote the number it was given. The
// CONTROL was lying. A slider labelled "Stroke" with stops at 1 / 1.5 / 2 /
// 2.5 / 3 reads as pixels to every human being who has ever seen one.
//
// THE DECISION: the number the user sets is the number they measure in the
// exported file — at any size, and for any viewBox. This module owns that one
// conversion so the Stage preview and the exported markup cannot drift apart:
// both call `strokeAttrForPx`, so they are the same arithmetic by construction.
//
// DOM-free on purpose — it is pure arithmetic plus one regex, so the contract
// is testable without a browser.

/** Every pack we ship draws on a 24-unit grid; the fallback when none is given. */
export const DEFAULT_VIEWBOX = 24

/**
 * The stroke slider's range, in pixels.
 *
 * The old range was 1–3 viewBox units, which at the default size 48 spanned
 * 2–6 rendered px. Reading those same numbers as pixels would have capped every
 * icon at a 3px stroke and halved the maximum weight available at large sizes,
 * so the range moves into pixel space rather than being reinterpreted in place:
 * 0.5–8px covers hairline through heavy for the sizes the editor offers, and
 * `inputMax` lets a 128px icon be typed up to a genuinely heavy stroke.
 *
 * `default: 4` is deliberate. 4px is exactly what the old default (2 units at
 * size 48) already rendered, so this fix changes no icon's appearance — it only
 * makes the label true. A user who wants 2px now types 2 and gets 2px.
 */
export const STROKE_PX = Object.freeze({
  min: 0.5,
  max: 8,
  step: 0.25,
  snaps: Object.freeze([1, 2, 3, 4, 6]),
  default: 4,
  inputMin: 0.25,
  inputMax: 64,
})

/** Marker on a saved custom-icon record: its `stroke` field is already pixels. */
export const STROKE_UNIT_PX = 'px'

/**
 * The size the editor opens at when nothing else seeds it. Used to recover the
 * pixel weight behind a legacy sticky preference, which was stored as a bare
 * user-unit number with no size beside it.
 */
export const DEFAULT_ICON_SIZE = 48

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
 * uniform scale is the SMALLER of the two ratios. Square viewBoxes — every pack
 * we ship — collapse to the familiar size / 24.
 */
export function renderScale(size, viewBox = DEFAULT_VIEWBOX) {
  const s = Number(size)
  if (!Number.isFinite(s) || s <= 0) return 1
  const { w, h } = boxOf(viewBox)
  return Math.min(s / w, s / h)
}

/**
 * The `stroke-width` value to write so the stroke MEASURES `px` pixels.
 *
 * This is the whole fix. `null` for an unusable input, so callers can skip the
 * attribute rather than writing "NaN" into someone's file.
 */
export function strokeAttrForPx({ px, size, viewBox, absolute = false }) {
  // Zero and below are rejected along with NaN: a zero-width stroke is an
  // invisible icon, and leaving the pack's own attribute in place is the less
  // destructive answer to input we cannot honour. (`Number(null)` and
  // `Number('')` are both 0, which is how empty state arrives here.)
  const wanted = Number(px)
  if (!Number.isFinite(wanted) || wanted <= 0) return null
  // `vector-effect: non-scaling-stroke` already resolves stroke-width in the
  // FINAL rendered space, so the pixel value passes through untouched — which
  // is also why a legacy record with Absolute on needed no migration below.
  if (absolute) return roundAttr(wanted)
  const scale = renderScale(size, viewBox)
  return roundAttr(scale > 0 ? wanted / scale : wanted)
}

/** Keep a pixel width inside what the control can hold; never return NaN. */
export function clampStrokePx(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return STROKE_PX.default
  return Math.min(STROKE_PX.inputMax, Math.max(STROKE_PX.inputMin, v))
}

/**
 * The pixel stroke a SAVED custom icon should re-open at.
 *
 * Records written before this fix stored `stroke` in viewBox user units, so
 * reading them as pixels would silently halve (or worse) a weight the user
 * already chose and saved. They carry their own `size` and their own baked
 * `svg`, so the viewBox is right there and the original pixel weight is exactly
 * recoverable: units x that record's own scale. New records stamp
 * `strokeUnit: 'px'` so they are never converted twice.
 *
 * The round trip is lossless — a legacy record (size 48, viewBox 24, stroke 2)
 * migrates to 4px and re-serialises to stroke-width="2", byte-identical to the
 * markup already frozen in `record.svg`.
 */
export function customIconStrokePx(record) {
  if (!record) return null
  const stored = Number(record.stroke)
  if (!Number.isFinite(stored) || stored <= 0) return null
  if (record.strokeUnit === STROKE_UNIT_PX) return clampStrokePx(stored)
  // Absolute was already resolved in rendered space, so it was already pixels.
  if (record.absStroke) return clampStrokePx(stored)
  return clampStrokePx(stored * renderScale(record.size || DEFAULT_ICON_SIZE, viewBoxOf(record.svg)))
}

/**
 * The pixel stroke the sticky preference should seed.
 *
 * `raw` is the new pixel key, `legacyRaw` the old user-unit one. The legacy key
 * was written with no size beside it, but the editor has always OPENED at
 * size 48 on a 24-unit grid, which is the state that value was set and last
 * seen in — so converting at that scale reproduces the weight the user chose.
 * Its whole stated purpose is "the next icon starts at the same weight", and
 * preserving the weight serves that better than preserving the digit.
 */
export function stickyStrokePx(raw, legacyRaw) {
  const px = Number(raw)
  if (Number.isFinite(px) && px > 0) return clampStrokePx(px)
  const legacy = Number(legacyRaw)
  // The old key's own validity window; anything outside it was never written
  // by us and is not worth reinterpreting.
  if (Number.isFinite(legacy) && legacy >= 1 && legacy <= 3) {
    return clampStrokePx(legacy * renderScale(DEFAULT_ICON_SIZE, DEFAULT_VIEWBOX))
  }
  return STROKE_PX.default
}

/**
 * The pixel stroke a homepage hand-off draft should open at. The homepage
 * preview draws a bare 24-viewBox Lucide path at `size`, so its user-unit
 * number converts the same way — which keeps the icon the exact weight the
 * visitor saw before they clicked through.
 */
export function draftStrokePx(draftStroke, draftSize) {
  const units = Number(draftStroke)
  if (!Number.isFinite(units) || units <= 0) return null
  return clampStrokePx(units * renderScale(draftSize || DEFAULT_ICON_SIZE, DEFAULT_VIEWBOX))
}
