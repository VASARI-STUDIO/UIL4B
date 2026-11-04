// The dark-mode values of the interface colours (systemRoles.js gives the light
// ones). Each role is chosen the way the light role is, from the same five slots,
// so a design that reads well in light reads well in dark without a second
// palette to maintain.
//
// HOW THE DARK ROLES ARE CHOSEN
//   background   the palette's deep colour when it is dark enough to be a page,
//                else the primary's 900 or 950 stop: the light page and the light
//                ink swap places
//   on-surface   the light page colour
//   surface      the page, mixed a little toward the ink so it sits above it
//   primary      the primary tint nearest 300 that reads (4.5:1) against the dark
//                page, found the way the light fill is found in uiSystem.js
//                (accentRoles: dark fills start at 300 and the ink on them is the
//                page colour)
//   primary.hover  the stop one step lighter than the fill
//   focus        the information colour's 400 stop, or the nearest that holds 3:1
//
// WHY THESE ARE NOT THE uiSystem.js SCHEMES. uiSystem.js builds light and dark
// schemes for a seed colour from its own neutral ramp. A saved design holds no
// neutral ramp: its neutrals are the palette's own colours, and its tints follow
// the project's tint settings (the 100 stop of a saturated primary is vivid, so
// using it as text would set body copy in a bright blue). The step rules are the
// same; the ramps they run over are the design's.
//
// Pure functions over the slots systemRoles.js builds. No React, no DOM.

import { contrast } from './styleGuideExport.js'
import { mixHex } from './colors.js'
import { makeOn, quietInk } from './systemRoles.js'
import { semanticShades, SEMANTIC_STEPS } from '../data/semanticPresets.js'

/** The tint steps, lightest first. */
export const TINT_STEPS = Object.freeze(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'])

// A page this dark or darker can sit behind light text.
const DARK_PAGE_MAX_LUM = 0.06
// Used only when no palette colour or tint is dark enough: a near-black, never #000.
const FALLBACK_PAGE = '#111214'

const up = (hex) => String(hex).toUpperCase()
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (hex) => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** The step of `scale` nearest `preferred` whose colour holds `minimum` against `ground`, or null. */
function nearestStep(scale, preferred, ground, minimum) {
  const at = TINT_STEPS.indexOf(preferred)
  const ranked = TINT_STEPS
    .map((step, i) => ({ step, i }))
    .sort((a, b) => Math.abs(a.i - at) - Math.abs(b.i - at) || a.i - b.i)
  return ranked.find(({ step }) => contrast(scale[step], ground) >= minimum)?.step ?? null
}

/**
 * The dark interface colours, upper-case hex, keyed like interfaceRoles() plus
 * `primary` (the action fill). `palette` is kitPalette(design); `states` is
 * design.states (the information colour sets the focus ring).
 */
export function darkInterfaceRoles(palette, states) {
  const slot = Object.fromEntries(palette.map((p) => [p.id, p]))
  const scale = slot.pine.scale
  const text = slot.chalk.hex

  const page = [slot.ink.hex, scale['900'], scale['950']]
    .find((hex) => lum(hex) <= DARK_PAGE_MAX_LUM && contrast(text, hex) >= 7) || FALLBACK_PAGE
  const background = up(page)
  const surface = up(mixHex(background, text, 0.07))
  const onSurface = up(text)

  const fillStep = nearestStep(scale, '300', background, 4.5) || '300'
  const fill = up(scale[fillStep])
  const hoverStep = TINT_STEPS[Math.max(0, TINT_STEPS.indexOf(fillStep) - 1)]

  const info = semanticShades(states).info
  const infoAt = (step) => info[SEMANTIC_STEPS.indexOf(step)]
  const focusStep = ['400', '300', '500', '200', '600'].find((s) => contrast(infoAt(s), background) >= 3) || '400'

  const disabled = up(mixHex(background, onSurface, 0.14))
  return {
    background,
    surface,
    onSurface,
    onSurfaceMuted: quietInk(onSurface, background, [background, surface]),
    border: up(mixHex(onSurface, background, 0.82)),
    primary: fill,
    primaryHover: up(scale[hoverStep]),
    onPrimary: makeOn(background)(fill),
    focus: up(infoAt(focusStep)),
    disabled,
    onDisabled: quietInk(onSurface, disabled, [disabled]),
  }
}
