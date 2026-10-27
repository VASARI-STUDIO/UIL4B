// The roles the Palette Builder's preview paints, derived from the palette the
// user is about to export.
//
// derivePreviewRoles (colors.js) picks its primary and accent by chroma, so a
// palette whose PRIMARY slot is a deep navy still got its orange SUBTLE slot on
// every button. The CSS export writes the five slots by position, so this
// module paints the same five by position and then adds what an export does not
// carry: a neutral ramp and success, warning, error and info colours, all
// derived from the palette's own hue and lightness band and labelled
// "Suggested" wherever they are shown.
//
// Pure and DOM-free. Never throws: junk input falls back to the engine's brand
// blue the same way derivePreviewRoles does.
import {
  contrastRatio, derivePreviewRoles, hexToOklch, inkOnGrounds, inkOnSolid,
  mixHex, pvInkFromFill, pvWorstOn,
} from './colors.js'

// The five slots the CSS export writes, in order (PaletteBuilder's ROLES).
export const BRAND_ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep']
export const SEMANTIC_ROLES = ['success', 'warning', 'error', 'info']

// OKLCH hues the four semantic colours start from.
const SEMANTIC_HUE = { success: 150, warning: 75, error: 27, info: 250 }
// An error closer than this to the primary hue is moved so a red brand and an
// error state stay tellable apart.
const ERROR_MIN_HUE_GAP = 20

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function hueGap(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// OKLCH (L 0..1, C, H degrees) to #rrggbb. A colour outside sRGB loses chroma
// until it fits, so lightness and hue (the two things a role is chosen by)
// survive.
function oklchToLinear(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

export function oklchToHex(L, C, H) {
  const fits = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005)
  let c = Math.max(0, C)
  if (!fits(oklchToLinear(L, c, H))) {
    let lo = 0
    let hi = c
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      if (fits(oklchToLinear(L, mid, H))) lo = mid
      else hi = mid
    }
    c = lo
  }
  const enc = (v) => {
    const x = clamp(v, 0, 1)
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
    return Math.round(clamp(g, 0, 1) * 255).toString(16).padStart(2, '0')
  }
  return '#' + oklchToLinear(L, c, H).map(enc).join('')
}

// Walk lightness from `start` in steps of `step` until `hex(L)` clears
// `target` on every ground. Falls back to the shared pole walk, so the result
// always clears.
function walkInk(make, start, step, grounds, target) {
  let L = start
  for (let i = 0; i < 90; i++) {
    const hex = make(L)
    if (pvWorstOn(hex, grounds) >= target) return hex
    L += step
    if (L < 0.02 || L > 0.99) break
  }
  return inkOnGrounds(grounds, target)
}

function neutralRamp(mode, hue, chroma) {
  const t = mode === 'dark'
    ? { canvas: 0.17, surface: 0.215, raised: 0.26, border: 0.31, strong: 0.4 }
    : { canvas: 0.972, surface: 0.995, raised: 0.952, border: 0.905, strong: 0.8 }
  const ok = (L) => oklchToHex(L, chroma, hue)
  const canvas = ok(t.canvas)
  const surface = ok(t.surface)
  const raised = ok(t.raised)
  const grounds = [canvas, surface, raised]
  const dir = mode === 'dark' ? 0.01 : -0.01
  const text = walkInk(ok, mode === 'dark' ? 0.94 : 0.24, dir, grounds, 7)
  const muted = walkInk(ok, mode === 'dark' ? 0.74 : 0.5, dir, grounds, 4.5)
  return {
    canvas, surface, raised, grounds, text, muted,
    border: ok(t.border),
    borderStrong: ok(t.strong),
    disabled: ok(mode === 'dark' ? 0.46 : 0.72),
  }
}

function semanticRole(role, mode, primaryL, primaryC, primaryHue, neutrals) {
  let hue = SEMANTIC_HUE[role]
  let shifted = false
  if (role === 'error' && hueGap(primaryHue, hue) < ERROR_MIN_HUE_GAP) {
    // Toward magenta: lower hue, past the minimum gap from the primary by
    // enough that rounding to an 8-bit hex cannot pull the painted gap under it.
    hue = (primaryHue - (ERROR_MIN_HUE_GAP + 4) + 360) % 360
    shifted = true
  }
  const L0 = clamp(primaryL, 0.5, 0.72)
  const C = clamp(primaryC, 0.09, 0.16)
  const make = (L) => oklchToHex(L, C, hue)
  const dir = mode === 'dark' ? 0.01 : -0.01
  // The fill is a UI colour (dot, bar, border, icon): 3:1 on the surface.
  const fill = walkInk(make, L0, dir, [neutrals.surface], 3)
  const tint = mixHex(neutrals.surface, fill, 0.12)
  // The ink is text on the tint, the surface and the raised ground: 4.5:1.
  const inkGrounds = [neutrals.canvas, neutrals.surface, neutrals.raised, tint]
  const ink = walkInk(make, L0, dir, inkGrounds, 4.5)
  return { fill, ink, tint, hue, shifted }
}

/**
 * @param {string[]} colors the palette, in slot order
 * @param {{mode?: 'light'|'dark', harmony?: string}} opts
 */
export function derivePaletteRoles(colors, opts = {}) {
  const mode = opts.mode === 'dark' ? 'dark' : 'light'
  const palette = (Array.isArray(colors) ? colors : [])
    .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
  const empty = palette.length === 0
  const base = derivePreviewRoles(palette, { mode })

  // Brand roles by slot, as the export writes them. Under three slots there is
  // no slot order to honour, so the engine's chroma pick stands in.
  const hasSlots = palette.length >= 3
  const primary = hasSlots ? palette[0] : base.primary
  const secondary = hasSlots ? palette[1] : base.accent
  const accent = hasSlots ? palette[2] : base.accent
  const subtle = palette.length > 3 ? palette[3] : primary
  const deep = palette.length > 4 ? palette[4] : primary
  // Slots the export does not write for this palette; the legend names them.
  const unset = empty ? [] : BRAND_ROLES.slice(palette.length)

  const [pL, pC, pHue] = hexToOklch(primary)
  // A grey primary has no hue to lend, so its neutrals stay grey rather than
  // taking a cast from hue 0.
  const neutrals = neutralRamp(mode, pHue, pC === 0 ? 0 : clamp(pC * 0.1, 0.008, 0.02))
  const grounds = neutrals.grounds

  const semantics = {}
  for (const role of SEMANTIC_ROLES) {
    semantics[role] = semanticRole(role, mode, pL / 100, pC, pHue, neutrals)
  }

  const fails = []
  for (const role of ['primary', 'secondary', 'accent']) {
    const fill = { primary, secondary, accent }[role]
    const ratio = contrastRatio(fill, neutrals.surface)
    if (ratio < 3) fails.push({ role, ratio: Math.floor(ratio * 10) / 10, floor: 3, on: 'surface' })
  }

  return {
    mode,
    empty,
    lowChroma: base.lowChroma,
    canvas: neutrals.canvas,
    surface: neutrals.surface,
    raised: neutrals.raised,
    border: neutrals.border,
    borderStrong: neutrals.borderStrong,
    text: neutrals.text,
    muted: neutrals.muted,
    disabled: neutrals.disabled,
    primary, secondary, accent, subtle, deep,
    onPrimary: inkOnSolid(primary),
    onSecondary: inkOnSolid(secondary),
    onAccent: inkOnSolid(accent),
    onSubtle: inkOnSolid(subtle),
    onDeep: inkOnSolid(deep),
    primaryInk: pvInkFromFill(primary, grounds),
    accentInk: pvInkFromFill(accent, grounds),
    primaryBorder: contrastRatio(primary, neutrals.surface) < 3
      ? mixHex(primary, neutrals.text, 0.35) : 'transparent',
    success: semantics.success,
    warning: semantics.warning,
    error: semantics.error,
    info: semantics.info,
    errorShifted: semantics.error.shifted,
    unset,
    fails,
    inkGrounds: grounds,
  }
}

// The roles as the --pv-* custom properties the scenes read. One map, so the
// component that sets them and the test that checks the stylesheet against
// them cannot disagree.
export function pvVars(r) {
  return {
    '--pv-canvas': r.canvas,
    '--pv-surface': r.surface,
    '--pv-raised': r.raised,
    '--pv-border': r.border,
    '--pv-border-strong': r.borderStrong,
    '--pv-text': r.text,
    '--pv-muted': r.muted,
    '--pv-disabled': r.disabled,
    '--pv-primary': r.primary,
    '--pv-secondary': r.secondary,
    '--pv-accent': r.accent,
    '--pv-subtle': r.subtle,
    '--pv-deep': r.deep,
    '--pv-on-primary': r.onPrimary,
    '--pv-on-secondary': r.onSecondary,
    '--pv-on-accent': r.onAccent,
    '--pv-on-subtle': r.onSubtle,
    '--pv-on-deep': r.onDeep,
    '--pv-primary-ink': r.primaryInk,
    '--pv-accent-ink': r.accentInk,
    '--pv-pborder': r.primaryBorder,
    '--pv-success': r.success.fill,
    '--pv-success-ink': r.success.ink,
    '--pv-success-tint': r.success.tint,
    '--pv-warning': r.warning.fill,
    '--pv-warning-ink': r.warning.ink,
    '--pv-warning-tint': r.warning.tint,
    '--pv-error': r.error.fill,
    '--pv-error-ink': r.error.ink,
    '--pv-error-tint': r.error.tint,
    '--pv-info': r.info.fill,
    '--pv-info-ink': r.info.ink,
    '--pv-info-tint': r.info.tint,
  }
}

// ── Large brand fields ───────────────────────────────────────────────────────
// An example that spends the primary on a big area (water, a garment, a card)
// sets type and linework on that field, and the field can be any colour the
// user chose. These three helpers decide, per palette and mode, what reads on
// it. Pure, and every answer is a measured ratio, never an assumption.

// Type 24px and up, or 19px and up in bold, needs 3:1; everything else 4.5:1.
export const TEXT_FLOOR = 4.5
export const LARGE_TEXT_FLOOR = 3
// A field closer than this to the canvas gets an edge, or it melts into the page.
export const FIELD_EDGE_RATIO = 1.25

const isHex = (h) => typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h)

/**
 * The text colour for type set on a brand field.
 *
 * Tries, in order: the field's own on-ink; the neutral text or canvas,
 * whichever clears (the higher ratio wins if both do); then a pole walked
 * toward pure black or white by the smallest step that clears, which exists for
 * every colour.
 *
 * @param {string} fill the field, #rrggbb
 * @param {{on?: string, text?: string, canvas?: string}} inks candidates: the
 *   field's on-* ink, then the neutral text and canvas
 * @param {{large?: boolean}} opts large: the 3:1 floor instead of 4.5:1
 * @returns {{hex: string, ratio: number, step: 'on'|'neutral'|'pole'}}
 */
export function inkOnField(fill, inks = {}, opts = {}) {
  const floor = opts.large ? LARGE_TEXT_FLOOR : TEXT_FLOOR
  // No field to read against: the neutral text, or black, rather than a throw.
  if (!isHex(fill)) return { hex: isHex(inks.text) ? inks.text : '#000000', ratio: 1, step: 'pole' }
  if (isHex(inks.on) && contrastRatio(inks.on, fill) >= floor) {
    return { hex: inks.on, ratio: contrastRatio(inks.on, fill), step: 'on' }
  }
  let best = null
  for (const h of [inks.text, inks.canvas]) {
    if (!isHex(h)) continue
    const ratio = contrastRatio(h, fill)
    if (ratio >= floor && (!best || ratio > best.ratio)) best = { hex: h, ratio, step: 'neutral' }
  }
  if (best) return best
  const hex = inkOnSolid(fill, floor)
  return { hex, ratio: contrastRatio(hex, fill), step: 'pole' }
}

/**
 * The edge colour for a big field: `edge` (the neutral border-strong) when the
 * field is within FIELD_EDGE_RATIO of the canvas, else 'transparent'.
 */
export function fieldEdge(fill, canvas, edge) {
  return contrastRatio(fill, canvas) < FIELD_EDGE_RATIO ? edge : 'transparent'
}

/**
 * A brand colour set as TEXT (a link, a price, one highlighted word). The user's
 * own hex when it clears the floor on every ground; otherwise the same colour
 * walked toward black or white by the smallest step that does, flagged so the
 * legend can say it was shown a step darker.
 *
 * @param {string} fill
 * @param {string[]} grounds every ground the text sits on
 * @param {{large?: boolean}} opts
 * @returns {{hex: string, adjusted: boolean, ratio: number}}
 */
export function brandAsText(fill, grounds, opts = {}) {
  const floor = opts.large ? LARGE_TEXT_FLOOR : TEXT_FLOOR
  const own = pvWorstOn(fill, grounds)
  if (own >= floor) return { hex: fill, adjusted: false, ratio: own }
  const hex = pvInkFromFill(fill, grounds, floor)
  return { hex, adjusted: true, ratio: pvWorstOn(hex, grounds) }
}
