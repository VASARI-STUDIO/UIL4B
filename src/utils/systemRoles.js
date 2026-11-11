// The design system's roles: which palette colour does which job, and the
// interface colours derived from them. The UI kit, the CSS, JSON and Tailwind
// exports all read the roles from here, so a role has one value in every file.
//
// THE FIVE PALETTE SLOTS (kitPalette). The kit draws exactly five colours with
// fixed jobs; the app's palette is an ordered list whose first five positions
// have stable token names (primary, secondary, accent, subtle, deep). The mapping
// is by that position, so each slot's colour is the one the downloaded tokens
// carry under the same name:
//   Primary brand     ← primary (position 1)
//   Supporting colour ← secondary (position 2)
//   Signature accent  ← accent (position 3)
//   Canvas            ← subtle (position 4), only when it is light enough to read
//                       as a page (relative luminance at least CANVAS_MIN_LUM)
//   Text and detail   ← deep (position 5), only when it clears 4.5:1 on the canvas
// A slot the palette cannot fill takes a stop from the primary's own tint
// scale (100 for supporting, 300 for accent, 50 for canvas, or the primary blended
// 95% toward white when that stop is too dark, 950 or 900 for text) and says so
// (DERIVED_NOTE). Text falls back to black or white only when no stop clears
// 4.5:1, and then the swatch says that instead (CONTRAST_NOTE).
//
// ROLE TOKEN NAMES (interfaceRoles, ROLE_TOKENS). A surface role is named for the
// surface, and the ink that reads on it is "on-<role>" (Material 3, and the
// Tailwind v4 colour namespace, where --color-on-surface makes text-on-surface):
//   --color-background           the page
//   --color-surface              raised content and form fields
//   --color-on-surface           body text
//   --color-on-surface-muted     supporting text
//   --color-border               hairlines and outlines
//   --color-primary-hover        the primary action under the pointer
//   --color-on-primary           text on the primary action
//   --color-focus                the keyboard focus ring
//   --color-disabled             a disabled control's fill
//   --color-on-disabled          a disabled control's label
//
// Pure functions over a plain design object. This file must not import
// designTokens.js or uiKitExport.js: both import it.

import { contrast } from './styleGuideExport.js'
import { readBook } from './bookModel.js'
import { generateTintScale, mixHex, T_LABELS } from './colors.js'
import { colorName } from './paletteNames.js'
import { roleLabels } from './paletteRoles.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../data/designDefaults.js'
import { semanticShades, SEMANTIC_STEPS } from '../data/semanticPresets.js'

/** A palette colour this light or lighter can be the canvas. */
export const CANVAS_MIN_LUM = 0.7

export const SLOT_COPY = Object.freeze({
  citron: { role: 'Signature accent', lands: 'highlights and moments that deserve attention' },
  pine: { role: 'Primary brand', lands: 'buttons, links and the focus ring' },
  lilac: { role: 'Supporting colour', lands: 'soft panels, notes and quiet highlights' },
  chalk: { role: 'Canvas', lands: 'the page behind the content' },
  ink: { role: 'Text and detail', lands: 'headings, labels and reading copy' },
})
// The template's slot order: it sets the swatch grid's column widths.
export const SLOT_ORDER = ['citron', 'pine', 'lilac', 'chalk', 'ink']
// Said on any slot the palette could not fill, so the kit's five colours are
// never mistaken for the same five the book and the deck show.
export const DERIVED_NOTE = 'Derived from your primary colour.'
// The text colour when no primary stop reads on the canvas: plain black or
// white. That is not taken from the primary, so DERIVED_NOTE would be false.
export const CONTRAST_NOTE = 'Set to black or white for contrast.'

const SEMANTIC_COPY = Object.freeze({
  success: { id: 'success', name: 'Success', message: 'Changes saved', guidance: 'Confirm a completed action.' },
  warning: { id: 'warning', name: 'Warning', message: 'Review before publishing', guidance: 'Highlight something that needs attention.' },
  error: { id: 'danger', name: 'Error', message: 'Add a valid email address', guidance: 'Name the issue and how to fix it.' },
  info: { id: 'info', name: 'Information', message: 'Your draft is private', guidance: 'Offer helpful context without urgency.' },
})

/**
 * The role tokens, in file order: [key in interfaceRoles(), path under `color`].
 * `on-surface` is a group with a `$root`, so its muted ink sits beside it.
 */
export const ROLE_TOKENS = Object.freeze([
  ['background', ['background']],
  ['surface', ['surface']],
  ['onSurface', ['on-surface', '$root']],
  ['onSurfaceMuted', ['on-surface', 'muted']],
  ['border', ['border']],
  ['primaryHover', ['primary', 'hover']],
  ['onPrimary', ['on-primary']],
  ['focus', ['focus']],
  ['disabled', ['disabled']],
  ['onDisabled', ['on-disabled']],
])

const up = (hex) => String(hex).toUpperCase()
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (hex) => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

// The fixed slot names, lower-cased: primary, secondary, accent, subtle, deep.
const SLOTS = roleLabels('auto').map((r) => r.toLowerCase())

/** The slot name for palette column `i`. */
export function paletteRole(i) {
  return i < SLOTS.length ? SLOTS[i] : `alternative-${i - SLOTS.length + 1}`
}

/** The project's tint settings, as the tint generator takes them. */
function tintBase(design) {
  const saved = design?.tints || {}
  const d = DEFAULT_DESIGN.tints
  const num = (v, f) => (Number.isFinite(Number(v)) ? Number(v) : f)
  return {
    tints: {
      lumBias: num(saved.lumBias, d.lumBias),
      satDecay: num(saved.satDecay, d.satDecay),
      oled: typeof saved.oled === 'boolean' ? saved.oled : d.oled,
    },
  }
}

/**
 * The eleven-stop scale for `hex`, from the app's own tint generator and the
 * project's saved tint settings. The 500 stop is the colour itself.
 */
export function kitScale(design, hex) {
  const cfg = tintConfigFor({ ...tintBase(design), palette: { base: hex } })
  const ramp = generateTintScale({ ...cfg, hex })
  const out = {}
  T_LABELS.forEach((stop, i) => { out[stop] = stop === '500' ? up(hex) : up(ramp[i]) })
  return out
}

/** The ink the template sets on a fill: the kit's text colour or white, else black. */
export function makeOn(ink) {
  return (value) => {
    const picked = contrast(value, ink) >= contrast(value, '#FFFFFF') ? ink : '#FFFFFF'
    return contrast(value, picked) >= 4.5 ? picked : '#000000'
  }
}

/** The quietest mix of `ink` toward `toward` that still clears 4.5:1 on every ground. */
export function quietInk(ink, toward, grounds) {
  for (let t = 0.6; t > 0; t -= 0.02) {
    const c = up(mixHex(ink, toward, t))
    if (grounds.every((gr) => contrast(c, gr) >= 4.5)) return c
  }
  return ink
}

/**
 * The kit's text colour on `canvas`: the palette's fifth colour when it reads,
 * else the primary's 950 or 900 stop, else plain black or white (`plain: true`).
 * A seam of its own because the last route needs a scale with no dark stop,
 * which the tint settings a project can save never produce.
 */
export function kitInk(colors, primaryScale, canvas) {
  if (colors[4] && contrast(colors[4], canvas) >= 4.5) return { hex: colors[4], source: 'Selected scale', index: 4 }
  const stop = ['950', '900'].find((s) => contrast(primaryScale[s], canvas) >= 4.5)
  if (stop) return { hex: primaryScale[stop], source: `Primary ${stop} · generated scale`, index: null }
  const black = contrast('#000000', canvas) >= contrast('#FFFFFF', canvas)
  return { hex: black ? '#000000' : '#FFFFFF', source: 'Set for contrast · generated scale', index: null, plain: true }
}

/** What a swatch says about where its colour came from; null for the palette's own. */
export function derivedNoteFor(picked) {
  if (picked.index !== null) return null
  return picked.plain ? CONTRAST_NOTE : DERIVED_NOTE
}

/**
 * The five palette slots, from the design. See the note at the top of the file.
 * Each slot: { id, name, hex, role, lands, scale, source, token, derived, derivedNote }.
 */
export function kitPalette(design) {
  const book = readBook(design)
  const colors = book.palette.length ? book.palette : [up(DEFAULT_DESIGN.palette.base)]
  const primary = colors[0]
  const primaryScale = kitScale(design, primary)
  const fromPalette = (i) => ({ hex: colors[i], source: 'Selected scale', index: i })
  const fromPrimary = (stop) => ({ hex: primaryScale[stop], source: `Primary ${stop} · generated scale`, index: null })

  const pine = { hex: primary, source: 'Selected scale', index: 0 }
  const lilac = colors[1] ? fromPalette(1) : fromPrimary('100')
  const citron = colors[2] ? fromPalette(2) : fromPrimary('300')
  // The primary's 50 stop is only as light as the project's tint settings make
  // it; when that is still too dark to read on, the canvas is the primary mixed
  // 95% toward white, the template's own generated 50 stop.
  const chalk = colors[3] && lum(colors[3]) >= CANVAS_MIN_LUM
    ? fromPalette(3)
    : lum(primaryScale['50']) >= CANVAS_MIN_LUM
      ? fromPrimary('50')
      : { hex: up(mixHex(primary, '#FFFFFF', 0.95)), source: 'Primary blended with white · generated scale', index: null }
  const ink = kitInk(colors, primaryScale, chalk.hex)

  const picked = { citron, pine, lilac, chalk, ink }
  return SLOT_ORDER.map((id) => {
    const p = picked[id]
    return {
      id,
      name: colorName(p.hex),
      hex: up(p.hex),
      ...SLOT_COPY[id],
      scale: kitScale(design, p.hex),
      source: p.source,
      token: p.index === null ? null : `--color-${paletteRole(p.index)}`,
      // Not one of the palette's own colours (the book and the deck show only those).
      derived: p.index === null,
      // What the swatch says about that; null for the palette's own colours.
      derivedNote: derivedNoteFor(p),
    }
  })
}

/** Success, warning, error and information, from the project's semantic colours. */
export function kitSemantic(design) {
  const shades = semanticShades(design?.states)
  const at = (role, step) => shades[role][SEMANTIC_STEPS.indexOf(step)]
  return ['success', 'warning', 'error', 'info'].map((role) => {
    const background = at(role, '50')
    const step = ['600', '700', '800', '900'].find((s) => contrast(at(role, s), background) >= 4.5) || '900'
    // `token` and `backgroundToken` are the names the CSS and JSON downloads give these two values.
    return { ...SEMANTIC_COPY[role], hex: up(at(role, step)), background: up(background), token: `color-${role}-${step}`, backgroundToken: `color-${role}-50` }
  })
}

/**
 * The interface colours, from the five slots and the semantic colours (as
 * kitPalette and kitSemantic return them). Keys are the ROLE_TOKENS keys; values
 * are upper-case hex.
 */
export function interfaceRoles(palette, semantic) {
  const slot = Object.fromEntries(palette.map((p) => [p.id, p]))
  const canvas = slot.chalk.hex
  const text = slot.ink.hex
  const surface = '#FFFFFF'
  const disabled = up(mixHex(canvas, text, 0.1))
  return {
    background: canvas,
    surface,
    onSurface: text,
    onSurfaceMuted: quietInk(text, canvas, [canvas, surface]),
    border: up(mixHex(text, canvas, 0.86)),
    primaryHover: slot.pine.scale['600'],
    onPrimary: makeOn(text)(slot.pine.hex),
    focus: semantic.find((s) => s.id === 'info').hex,
    disabled,
    onDisabled: quietInk(text, disabled, [disabled]),
  }
}
