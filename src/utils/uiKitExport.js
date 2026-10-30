// The UI kit export: a saved design → one self-contained HTML document built
// from src/templates/kit/<template>.html, plus the token, font and licence data that
// document offers as downloads.
//
// THE TEMPLATE IS THE DESIGN. This module only fills its @@PLACEHOLDERS@@. It
// never adds or restyles a section: structure, copy, specimens and the print
// layout all live in the template. What this module owns is the mapping from
// the app's design model into the template's input shape, the tier rules, and
// escaping.
//
// PURE. No React, no DOM, no network: the template text, the publisher mark and
// every font file arrive as arguments (src/utils/uiKitAssets.js fetches them in
// the browser), so the whole document is unit-testable as a string.
//
// TIERS. `tier` is 'free' or 'pro' and is decided by the caller from the
// account's verified entitlement. There is no plan switch in the document.
//   free — publisher mark and links, a mark at the end of every section, the
//          print margin credit, CSS and JSON credits, and no personal identity.
//   pro  — none of those, plus the identity section when a name is supplied.
// A free kit is titled with the project's name (`projectName`) and keeps the publisher
// mark and credit lines. Its description and logo are Pro: a free kit reads neither.
//
// THE FIVE PALETTE SLOTS. The template draws exactly five colours with fixed
// jobs; the app's palette is an ordered list whose first five positions have
// stable token names (primary, secondary, accent, subtle, deep). The mapping is
// by that position, so each slot's colour is the one the downloaded tokens
// carry under the same name:
//   Primary brand     ← primary (position 1)
//   Supporting colour ← secondary (position 2)
//   Signature accent  ← accent (position 3)
//   Canvas            ← subtle (position 4), only when it is light enough to read
//                       as a page (relative luminance at least CANVAS_MIN_LUM)
//   Text and detail   ← deep (position 5), only when it clears 4.5:1 on the canvas
// A slot the palette cannot fill takes a stop from the primary's own tint
// scale — 100 for supporting, 300 for accent, 50 for canvas (or the primary
// blended 95% toward white when that stop is too dark), 950 or 900 for text —
// and its tint heading says so; the swatch says it too (DERIVED_NOTE), because
// the book and the deck show only the palette's own colours. Text falls back to black or white only
// when no stop clears 4.5:1, and then the swatch says that instead (CONTRAST_NOTE).
// Colours past position 5 are not drawn as slots; they are in the CSS and JSON downloads.
// The app records no colour proportions, so the kit shows none.

import { contrast, typeLadder } from './styleGuideExport.js'
import { readBook } from './bookModel.js'
import { generateTintScale, mixHex, T_LABELS } from './colors.js'
import { colorName } from './paletteNames.js'
import { buildTokensCss, buildTokensJson, designTokens, HEADING_LINE_HEIGHT, paletteRole } from './designTokens.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../data/designDefaults.js'
import { semanticShades, SEMANTIC_STEPS } from '../data/semanticPresets.js'
import { SITE_ORIGIN } from './routeMeta.js'
import { SUBSET_RANGES } from './kitFonts.js'
import { readIdentity, IDENTITY_NAME_MAX } from './kitIdentity.js'
import { logoSvg, LOCKUP_WIDTH, LOGO_HEIGHT } from '../config/brandLogo.js'
import { hexToOklch } from './exportTemplates/roles.js'
import { MAX_SLOTS, fitTitle, clampTitle, plural } from './exportTemplates/shared.js'
import { roleLabel } from './paletteRoles.js'
import { manualParts } from './kitManual.js'
import { showcaseParts } from './kitShowcase.js'

export const KIT_TIERS = Object.freeze(['free', 'pro'])

/** A palette colour this light or lighter can be the canvas. */
export const CANVAS_MIN_LUM = 0.7

// ── Fixed template copy ─────────────────────────────────────────────────────
// Every string below is the template's own (its reference build input). They
// are the document's copy, not example data: none of them names a colour, a
// typeface or a person.

const FREE_EDITION = 'UI kit / Free edition'
// What the kit is called when no project name is given.
const UNNAMED = 'UI kit'
const GUIDE_COPY = Object.freeze({
  guideTitle: 'Overview',
  description: 'Your selected colours, typefaces, and interface foundations, brought together in one reference. A practical starting point for the next thing you build.',
  principles: ['Colour & semantic roles', 'Typography & spacing', 'Components & states'],
})
// The cover names the project, in whole words. The sizes and measures are the
// template's: 745 px is the cover block's text width at 1440, and 287 pt is its
// text width on A4, so each title is fitted for the page it is drawn on.
const COVER_SCREEN = Object.freeze({ maxLines: 2, steps: [80, 62, 46], measure: 745 })
// On a phone the title scales with its box. It stops at half its fitted size when the
// words still make two whole lines at COVER_PHONE (a 390 px screen's text width), and
// otherwise follows the box down to COVER_FLOOR, so a long name never grows a third line.
const COVER_PHONE = 300
const COVER_FLOOR = 16
const COVER_PRINT = Object.freeze({ maxLines: 3, steps: [44, 34, 26], measure: 287 })
// The "In use" specimen's own words are labels only. Its headline, description and
// feature line are facts about the project (see kitSelections).
const WEBSITE_COPY = Object.freeze({
  button: 'Primary action',
  category: 'Interface specimen',
  caption: 'A layout specimen using the selected colours, fonts, and component tokens.',
})
export const SLOT_COPY = Object.freeze({
  citron: { role: 'Signature accent', lands: 'highlights and moments that deserve attention' },
  pine: { role: 'Primary brand', lands: 'buttons, links and the focus ring' },
  lilac: { role: 'Supporting colour', lands: 'soft panels, notes and quiet highlights' },
  chalk: { role: 'Canvas', lands: 'the page behind the content' },
  ink: { role: 'Text and detail', lands: 'headings, labels and reading copy' },
})
// A palette colour that is not one of the five slots paints nothing in the kit.
export const UNPLACED_LANDS = 'not assigned to a part of the interface'

// The publisher's own faces for each layout, loaded by uiKitAssets and embedded
// as "Publisher <family>". Each must be a key of SELF_HOSTED in kitFonts.js.
export const KIT_CHROME = Object.freeze({
  studio: Object.freeze(['Geist', 'Geist Mono']),
  manual: Object.freeze(['Hanken Grotesk', 'Martian Mono']),
  showcase: Object.freeze(['Instrument Sans']),
})
// Said on any slot the palette could not fill, so the kit's five colours are
// never mistaken for the same five the book and the deck show.
export const DERIVED_NOTE = 'Derived from your primary colour.'
// The text colour when no primary stop reads on the canvas: plain black or
// white. That is not taken from the primary, so DERIVED_NOTE would be false.
export const CONTRAST_NOTE = 'Set to black or white for contrast.'
// The template's slot order: it sets the swatch grid's column widths.
export const SLOT_ORDER = ['citron', 'pine', 'lilac', 'chalk', 'ink']
const SEMANTIC_COPY = Object.freeze({
  success: { id: 'success', name: 'Success', message: 'Changes saved', guidance: 'Confirm a completed action.' },
  warning: { id: 'warning', name: 'Warning', message: 'Review before publishing', guidance: 'Highlight something that needs attention.' },
  error: { id: 'danger', name: 'Error', message: 'Add a valid email address', guidance: 'Name the issue and how to fix it.' },
  info: { id: 'info', name: 'Information', message: 'Your draft is private', guidance: 'Offer helpful context without urgency.' },
})
const TYPE_SAMPLES = Object.freeze({
  Display: 'A fresh perspective.',
  'Heading 1': 'Make room for good.',
  'Heading 2': 'Thoughtful by nature.',
  'Heading 3': 'Details make the difference.',
  Body: 'Simple ideas, made to be part of your everyday.',
  Caption: 'The small things deserve care, too.',
})
// The design model holds no spacing or radius choices, so the kit documents
// the template's starter foundations. The spacing ladder is also the app's own.
const SPACING = Object.freeze([4, 8, 12, 16, 24, 32, 48, 64, 96])
const RADIUS = Object.freeze({ control: 6, card: 16 })
const MOTION = Object.freeze({ fast: 180, ease: [0.16, 1, 0.3, 1] })

// A swatch at least this light gets a hairline, so it holds its edge on the page.
const PALE_LUM = 0.75

const PRINT_META_FONT = '"Publisher Geist Mono",Arial,sans-serif'
const PRINT_META_INK = '#5A5D64'

// ── Small helpers ───────────────────────────────────────────────────────────

/** HTML text and attribute escaping. */
export const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

/** A family name as it may appear inside a quoted CSS string. */
export const cssFamily = (name) => String(name ?? '').replace(/[^A-Za-z0-9 ._-]/g, '').trim() || 'sans-serif'

const up = (hex) => String(hex).toUpperCase()
/** The WCAG text grade of a contrast ratio, as a word so colour is never the only cue. */
export const gradeOf = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fails AA')
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (hex) => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
// Python's `{:g}`: up to six significant digits, no trailing zeros.
const g = (n) => String(Number(Number(n).toPrecision(6)))

const slugify = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52)

/** A project name as the kit sets it: a string with its whitespace collapsed and its length capped. */
const cleanName = (value) => (typeof value === 'string'
  ? value.replace(/\s+/g, ' ').trim().slice(0, IDENTITY_NAME_MAX)
  : '')

/** The typefaces as a sentence of facts: "Set in Inter." or "Headings in A, body in B." */
const typeLine = (display, body) => (display.name === body.name
  ? `Set in ${display.name}.`
  : `Headings in ${display.name}, body in ${body.name}.`)

// ── The design → the template's input shape ─────────────────────────────────

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
function makeOn(ink) {
  return (value) => {
    const picked = contrast(value, ink) >= contrast(value, '#FFFFFF') ? ink : '#FFFFFF'
    return contrast(value, picked) >= 4.5 ? picked : '#000000'
  }
}

/** The quietest mix of `ink` toward `toward` that still clears 4.5:1 on every ground. */
function quietInk(ink, toward, grounds) {
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

const FALLBACKS = { serif: 'serif', monospace: 'monospace', handwriting: 'cursive' }

/**
 * Everything the template needs, as one record. `tier` must be verified by the
 * caller. A kit is named for `projectName`; a Pro kit's own name and description,
 * when the person wrote them, are read from `design.identity` and take its place.
 */
export function kitSelections(design, { tier = 'free', logo = null, projectName = '' } = {}) {
  if (!KIT_TIERS.includes(tier)) throw new Error('tier must be free or pro')
  const free = tier === 'free'
  const book = readBook(design)
  const palette = kitPalette(design)
  const slot = Object.fromEntries(palette.map((p) => [p.id, p]))
  const semantic = kitSemantic(design)
  const fonts = design?.fonts || {}
  const display = { name: book.heading, weight: Math.round(Number(book.headingWeight) || 700), fallback: FALLBACKS[fonts.heading?.category] || 'sans-serif' }
  const body = { name: book.body, weight: Math.round(Number(book.bodyWeight) || 400), fallback: FALLBACKS[fonts.body?.category] || 'sans-serif' }

  const typeScale = typeLadder(book)
    .filter((s) => TYPE_SAMPLES[s.name])
    .map((s) => {
      const heading = s.exp >= 1
      return {
        name: s.name,
        size: s.px,
        line: heading ? HEADING_LINE_HEIGHT : book.lineHeight,
        weight: heading ? display.weight : body.weight,
        sample: TYPE_SAMPLES[s.name],
        font: heading ? 'display' : 'body',
      }
    })

  const canvas = slot.chalk.hex
  const text = slot.ink.hex
  const surface = '#FFFFFF'
  const disabledBackground = up(mixHex(canvas, text, 0.1))
  const iface = {
    surface,
    textMuted: quietInk(text, canvas, [canvas, surface]),
    border: up(mixHex(text, canvas, 0.86)),
    primaryHover: slot.pine.scale['600'],
    focus: semantic.find((s) => s.id === 'info').hex,
    disabledBackground,
    disabledText: quietInk(text, disabledBackground, [disabledBackground]),
  }

  // Every palette colour (up to MAX_SLOTS), for the layouts that tabulate them. A
  // colour that is one of the five slots says where it lands; any other says so.
  const colours = book.palette.slice(0, MAX_SLOTS).map((hex, i) => {
    const owner = palette.find((p) => p.token === `--color-${paletteRole(i)}`)
    const ok = hexToOklch(hex)
    return {
      i,
      hex: up(hex),
      name: colorName(hex),
      role: roleLabel(book.harmony, i),
      token: `--color-${paletteRole(i)}`,
      oklch: `oklch(${(ok.l * 100).toFixed(1)}% ${ok.c.toFixed(3)} ${Math.round(ok.h)})`,
      scale: kitScale(design, hex),
      lands: owner ? owner.lands : UNPLACED_LANDS,
      placed: Boolean(owner),
      onCanvas: contrast(up(hex), canvas),
      onText: contrast(up(hex), text),
    }
  })

  const projectTitle = cleanName(projectName)
  const { name, description } = readIdentity(design)
  const title = (free ? '' : name) || projectTitle || UNNAMED
  const faces = [...new Set([display.name, body.name])]
  const colourCount = book.palette.length
  const record = {
    tier,
    isExample: false,
    ...GUIDE_COPY,
    // Facts about the project, for the band under the "In use" specimen.
    tagline: plural(colourCount, 'colour'),
    palette,
    colours,
    // How many colours the design holds, so a layout that shows only 13 can say so.
    colourCount,
    semantic,
    fonts: { display, body },
    typeScale,
    spacing: [...SPACING],
    radius: { ...RADIUS },
    interface: iface,
    website: {
      ...WEBSITE_COPY,
      headline: title,
      description: `${plural(colourCount, 'colour')}. ${typeLine(display, body)}`,
      feature: faces.join(' and '),
    },
    tintToken: slot.pine.token || '--color-primary',
    name: title,
    title,
    slug: slugify(title) && title !== UNNAMED ? `${slugify(title)}-ui-kit` : 'ui-kit',
  }
  if (free) return { ...record, edition: FREE_EDITION }

  // Pro: the identity section appears only when the person has named the work.
  const personalisation = name
    ? { name, ...(description ? { description } : {}), ...(logo?.src ? { logo: { src: logo.src } } : {}) }
    : null
  return { ...record, edition: 'UI kit / Personal edition', personalisation }
}

// ── Tokens ──────────────────────────────────────────────────────────────────

/** The template's own token map: the names its stylesheet reads. */
export function kitTemplateTokens(sel) {
  const on = makeOn(sel.palette.find((p) => p.id === 'ink').hex)
  const slot = Object.fromEntries(sel.palette.map((p) => [p.id, p]))
  const tokens = {}
  for (const p of sel.palette) tokens[`color-${p.id}`] = p.hex
  for (const p of sel.palette) for (const [stop, value] of Object.entries(p.scale)) tokens[`color-${p.id}-${stop}`] = value
  for (const p of sel.palette) tokens[`on-${p.id}`] = on(p.hex)
  Object.assign(tokens, {
    'color-background': slot.chalk.hex,
    'color-text': slot.ink.hex,
    'color-primary': slot.pine.hex,
    'color-on-primary': on(slot.pine.hex),
    'color-accent': slot.citron.hex,
    'color-on-accent': on(slot.citron.hex),
    'color-focus': slot.pine.hex,
  })
  for (const s of sel.semantic) {
    tokens[`color-${s.id}`] = s.hex
    tokens[`color-${s.id}-subtle`] = s.background
  }
  for (const [role, f] of Object.entries(sel.fonts)) {
    tokens[`font-${role}`] = `"${cssFamily(f.name)}", ${f.fallback}`
    tokens[`weight-${role}`] = String(f.weight)
  }
  for (const s of sel.spacing) tokens[`space-${s}`] = `${s}px`
  for (const [r, v] of Object.entries(sel.radius)) tokens[`radius-${r}`] = `${v}px`
  for (const t of sel.typeScale) {
    const key = t.name.toLowerCase().replace(/ /g, '-')
    tokens[`text-${key}`] = `${g(t.size / 16)}rem`
    tokens[`leading-${key}`] = String(t.line)
    tokens[`weight-${key}`] = String(t.weight)
  }
  tokens['duration-fast'] = `${MOTION.fast}ms`
  tokens['ease-out'] = `cubic-bezier(${MOTION.ease.join(', ')})`
  for (const [key, value] of Object.entries(sel.interface)) {
    tokens[`color-${key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)}`] = value
  }
  return tokens
}

/**
 * The tokens the kit documents that the app's token export does not already
 * carry, in the token list shape designTokens.js serialises. The role table's
 * variable names are exactly these, so every name the document shows is in the
 * CSS and JSON the document hands over.
 */
export function kitExtraTokens(sel) {
  const t = kitTemplateTokens(sel)
  const color = (path, key) => ({ path: ['color', ...path], type: 'color', value: t[key], section: 'Interface' })
  return [
    color(['background'], 'color-background'),
    color(['surface'], 'color-surface'),
    color(['text', '$root'], 'color-text'),
    color(['text', 'muted'], 'color-text-muted'),
    color(['border'], 'color-border'),
    color(['primary', 'hover'], 'color-primary-hover'),
    color(['on-primary'], 'color-on-primary'),
    color(['focus'], 'color-focus'),
    color(['disabled', 'background'], 'color-disabled-background'),
    color(['disabled', 'text'], 'color-disabled-text'),
    ...sel.spacing.map((s) => ({ path: ['space', String(s)], type: 'dimension', value: { value: s, unit: 'px' } })),
    ...Object.entries(sel.radius).map(([r, v]) => ({ path: ['radius', r], type: 'dimension', value: { value: v, unit: 'px' } })),
    { path: ['duration', 'fast'], type: 'duration', value: { value: MOTION.fast, unit: 'ms' } },
    { path: ['ease', 'out'], type: 'cubicBezier', value: [...MOTION.ease] },
  ]
}

/** A copy of the design whose palette is never empty, so the tokens and the kit agree. */
function withPalette(design) {
  const colors = readBook(design).palette
  if (colors.length) return design
  return { ...(design || {}), palette: { ...(design?.palette || {}), colors: [up(DEFAULT_DESIGN.palette.base)] } }
}

// ── Fonts ───────────────────────────────────────────────────────────────────

/**
 * `fonts` maps a family name to { faces, license } as src/utils/uiKitAssets.js
 * returns it:
 *   faces   [{ base64, format: 'woff2' | 'truetype', weight: '400' | '100 900',
 *             unicodeRange? }]
 *   license { name: 'SIL Open Font License', text }
 * A family is embedded only when it has at least one face AND its licence text:
 * the licence has to travel with the file.
 */
function embeddable(fonts, family) {
  const f = fonts?.[family]
  return Boolean(f && Array.isArray(f.faces) && f.faces.length && f.license?.text && f.license?.name)
}

const faceRule = (family, face) => {
  const mime = face.format === 'truetype' ? 'font/ttf' : 'font/woff2'
  const weight = /^\d{3}( \d{3})?$/.test(String(face.weight)) ? face.weight : '100 900'
  const range = face.unicodeRange && /^[U+0-9A-Fa-f?, -]+$/.test(face.unicodeRange) ? `unicode-range:${face.unicodeRange};` : ''
  const data = String(face.base64 || '').replace(/[^A-Za-z0-9+/=]/g, '')
  return `@font-face{font-family:"${cssFamily(family)}";src:url(data:${mime};base64,${data}) format("${face.format === 'truetype' ? 'truetype' : 'woff2'}");font-weight:${weight};font-style:normal;font-display:swap;${range}}\n`
}

function fontNotes(sel, fonts) {
  const families = [...new Set([sel.fonts.display.name, sel.fonts.body.name])]
  const fallbackOf = (name) => (sel.fonts.display.name === name ? sel.fonts.display : sel.fonts.body).fallback
  const embedded = families.filter((f) => embeddable(fonts, f))
  const missing = families.filter((f) => !embeddable(fonts, f))
  let embedNote
  if (!missing.length) embedNote = families.length === 2 ? 'Both selected fonts are embedded in this HTML.' : 'The selected font is embedded in this HTML.'
  else {
    embedNote = [
      ...embedded.map((f) => `${f} is embedded in this HTML.`),
      ...missing.map((f) => `${f} could not be embedded, so it is shown in the reader’s ${fallbackOf(f)} font.`),
    ].join(' ')
  }
  const ofl = embedded.every((f) => fonts[f].license.name === 'SIL Open Font License')
  let licenseNote
  if (families.length === 2 && !missing.length && ofl) {
    licenseNote = `${families[0]} and ${families[1]} are distributed under the SIL Open Font License. Both are included in this file.`
  } else {
    licenseNote = [
      ...embedded.map((f) => `${f} is distributed under the ${fonts[f].license.name}. It is included in this file.`),
      ...missing.map((f) => `${f} is not included in this file.`),
    ].join(' ')
  }
  return { families, embedded, missing, embedNote, licenseNote }
}

// ── Markup pieces ───────────────────────────────────────────────────────────

const ICONS = {
  copy: '<rect x="8" y="8" width="11" height="11" rx="1.5"/><path d="M15 5H5v10"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  down: '<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  warning: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.5"/>',
  danger: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
}
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`

/** JSON that is safe inside a <script> element. */
const scriptJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

const ROLES = [
  ['Canvas', 'color-background', 'The page behind the content.'],
  ['Surface', 'color-surface', 'Raised content and form fields.'],
  ['Primary text', 'color-text', 'Headings, labels, and reading copy.'],
  ['Secondary text', 'color-text-muted', 'Supporting information.'],
  ['Border', 'color-border', 'Separate surfaces and outline fields.'],
  ['Primary action', 'color-primary', 'The main action in a context.'],
  ['Action hover', 'color-primary-hover', 'Feedback for the primary action.'],
  ['Focus ring', 'color-focus', 'A visible keyboard focus indicator.'],
]

/**
 * Render the kit.
 *
 * @param design    the saved design (ProjectContext's `design`)
 * @param options
 *   tier           'free' | 'pro' — from verified entitlement, never from a UI toggle
 *   template       the text of src/templates/kit/<template>.html
 *   fonts          selected fonts by family, see embeddable()
 *   publisherFonts [{ family: 'Geist', axis: '300 700', faces: [{ subset, base64 }] }]
 *   publisherLicense  Geist's licence text
 *   logo           Pro only: readLogo(design)
 *   date           for the token file header; defaults to now
 *   projectName    the kit's title and file name, free or Pro; blank gives "UI kit"
 * A Pro kit's own name and description come from the design (see kitIdentity.js)
 * and take the title's place.
 * @returns { html, filename, selections, embedded, missing }
 */
export function renderUiKit(design, {
  tier = 'free', template, fonts = {}, publisherFonts = [], publisherLicense = '',
  logo = null, date = new Date(), projectName = '',
} = {}) {
  if (typeof template !== 'string' || !template.includes('@@DATA@@')) throw new Error('The UI kit template is missing.')
  const safeDesign = withPalette(design)
  const sel = kitSelections(safeDesign, { tier, logo, projectName })
  const free = tier === 'free'
  const tokens = kitTemplateTokens(sel)
  const on = makeOn(sel.palette.find((p) => p.id === 'ink').hex)
  const slot = Object.fromEntries(sel.palette.map((p) => [p.id, p]))
  const notes = fontNotes(sel, fonts)

  const templateCss = `:root {\n${Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};\n`).join('')}}\n`

  // The files the document hands over: the app's own token formats, plus the
  // tokens only the kit documents.
  const extra = kitExtraTokens(sel)
  const tokenName = sel.name
  const appCss = buildTokensCss(safeDesign, { projectName: tokenName, watermark: false, date, extra })
  // A free kit's JSON names its generator in the DTCG `$extensions` slot, under
  // a reverse-domain key; a Pro kit's JSON carries no metadata at all.
  const extensions = free ? { 'com.uil4b': { generator: 'UIL4B', edition: 'free', url: `${SITE_ORIGIN}/` } } : null
  // Every custom property the CSS download declares, by name, so a layout can show the downloads' own names and values.
  const download = new Map([...appCss.matchAll(/^\s*--([\w-]+):\s*(.*?);\s*$/gm)].map((m) => [m[1], m[2]]))
  const appJson = buildTokensJson(safeDesign, { projectName: tokenName, watermark: free, extra, extensions })

  // Selected faces first: the document's font download reads the first
  // stylesheet's @font-face rules and skips every "Publisher " family.
  let fontCss = ''
  let licenses = ''
  for (const family of notes.embedded) {
    for (const face of fonts[family].faces) fontCss += faceRule(family, face)
    licenses += `\n${family}\n${fonts[family].license.text}\n`
  }
  // A face counts only with a known subset and a payload; a family with none is not in the file.
  const usableFaces = (pub) => (pub.faces || []).flatMap((face) => {
    const range = SUBSET_RANGES[face.subset]
    const data = String(face.base64 || '').replace(/[^A-Za-z0-9+/=]/g, '')
    return range && data ? [{ range, data }] : []
  })
  for (const pub of publisherFonts) {
    for (const { range, data } of usableFaces(pub)) {
      fontCss += `@font-face{font-family:"Publisher ${cssFamily(pub.family)}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${pub.axis};font-style:normal;font-display:swap;unicode-range:${range};}\n`
    }
  }
  // The document's own faces named in the licence rows: those embedded here, and only with a licence text to show.
  const chrome = publisherLicense ? publisherFonts.filter((pub) => usableFaces(pub).length).map((pub) => pub.family) : []
  if (publisherLicense) licenses += `\n${chrome.join(' and ') || 'Geist and Geist Mono'} (publisher interface)\n${publisherLicense}\n`

  // The lockup is drawn from the shared logo geometry, sized in em, so the
  // template's existing font-size rules size it wherever it appears.
  const lockup = `<span class="publisher-lockup">${logoSvg({ attrs: `style="height:1.1em;width:${(1.1 * LOCKUP_WIDTH / LOGO_HEIGHT).toFixed(3)}em" aria-hidden="true"` })}<span class="sr-only">UIL4B</span></span>`
  const publisher = `<a class="publisher-link" href="${SITE_ORIGIN}/" target="_blank" rel="noopener noreferrer" aria-label="Visit UIL4B (opens in a new tab)">${lockup}</a>`
  const watermark = free ? `<span class="section-watermark">Made with ${publisher}</span>` : ''

  let identity = ''
  const personal = free ? null : sel.personalisation
  if (personal?.name) {
    identity = `<section class="chapter personal-identity" id="identity"><div class="section-head"><h2>Identity</h2><p>${esc(personal.description || 'Your supplied identity, paired with the selected interface system.')}</p></div><div class="identity-name">${esc(personal.name)}</div>`
    const src = personal.logo?.src
    if (typeof src === 'string' && /^data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)) {
      identity += `<div class="identity-logo"><img src="${src}" alt="${esc(personal.name)} logo"></div><p class="component-note">Logo shown as supplied. No colours or proportions have been changed.</p>`
    }
    identity += '</section>'
  }

  const tintRows = sel.palette.map((p) => {
    const chips = Object.entries(p.scale).map(([stop, value]) => `<button class="tint-chip" style="background:${value};color:${on(value)}" data-copy="${value}" aria-label="Copy ${esc(p.name)} ${stop}, ${value}"><span>${stop}${stop === '500' ? '<span class="tint-base"><span class="tint-sep"> · </span>Base</span>' : ''}</span><code>${value}</code></button>`).join('')
    return `<article class="tint-row"><div class="tint-heading"><h4>${esc(p.name)}</h4><small>${esc(p.source)}</small></div><div class="tint-scale">${chips}</div></article>`
  }).join('')

  const roleRows = ROLES.map(([name, key, description]) => `<tr><th scope="row"><i style="background:${tokens[key]}"></i>${name}</th><td><button class="copy-text" data-copy="var(--${key})" aria-label="Copy ${name} CSS variable"><code>--${key}</code>${icon('copy')}</button></td><td><code>${tokens[key]}</code></td><td>${description}</td></tr>`).join('')

  // One swatch: the chip, the colour's role, and where it lands. The chip's big
  // text is how the colour reads as text on the canvas (for the canvas itself,
  // how ink reads on it), graded in words so colour is never the only cue.
  const swatchCell = ({ hex, name, title, note, lands, ratio, basis, primary = false }) => {
    const grade = gradeOf(ratio)
    const fails = grade === 'Fails AA'
    const pale = lum(hex) >= PALE_LUM ? ' pale' : ''
    // A colour with no job says so once, over its block, so its card carries only the colour.
    const details = lands
      ? `<h3>${esc(title)}</h3>${note ? `<p>${esc(note)}</p>` : ''}<p class="lands"><small>Where it lands</small>${esc(lands.charAt(0).toUpperCase() + lands.slice(1))}</p>`
      : ''
    return `<article class="swatch${primary ? ' is-primary' : ''}"><button class="colour-chip${pale}" style="--swatch:${hex};--on-swatch:${on(hex)}" data-copy="${hex}" aria-label="Copy ${esc(name)} ${hex}"><span>${esc(name)}</span><span class="chip-result"><b class="chip-grade${fails ? ' fails' : ''}">${grade}</b><small>${ratio.toFixed(2)}:1 ${basis}</small></span><span class="chip-bottom"><code>${hex}</code>${icon('copy')}</span></button><div class="swatch-details">${details}<p class="sr-only">Contrast ${ratio.toFixed(2)} to 1 ${basis}: ${grade}.</p><code>RGB ${rgb(hex).join(' / ')}</code></div></article>`
  }
  const canvasHex = slot.chalk.hex
  // The primary leads: it is the largest cell in every layout of the palette.
  const railOrder = [...sel.palette].sort((a, b) => (b.id === 'pine') - (a.id === 'pine'))
  const swatches = railOrder.map((p) => swatchCell({
    primary: p.id === 'pine',
    hex: p.hex,
    name: p.name,
    title: p.role,
    note: p.derivedNote || '',
    lands: p.lands,
    ratio: p.id === 'chalk' ? contrast(slot.ink.hex, p.hex) : contrast(p.hex, canvasHex),
    basis: p.id === 'chalk' ? 'for text on it' : 'as text on the canvas',
  })).join('')

  // The palette's other colours, which the kit paints nothing with, and a note
  // when the design holds more colours than a kit lists.
  const unplaced = sel.colours.filter((c) => c.lands === UNPLACED_LANDS)
  const colourCut = sel.colourCount > sel.colours.length
  const moreList = unplaced.map((c) => swatchCell({ hex: c.hex, name: c.name, lands: '', ratio: c.onCanvas, basis: 'as text on the canvas' })).join('')
  const moreHead = '<div class="subhead"><h3>The rest of your palette</h3><p>These colours are in the CSS and JSON downloads. This kit does not assign them to a part of the interface.</p></div>'
  const cutNote = `<p class="contrast-note">The first ${sel.colours.length} of ${sel.colourCount} colours are shown. All ${sel.colourCount} are in the CSS and JSON downloads.</p>`
  const moreSwatches = unplaced.length || colourCut
    ? `<div class="more-colours">${unplaced.length ? `${moreHead}<div class="palette more">${moreList}</div>` : ''}${colourCut ? cutNote : ''}</div>`
    : ''

  const semantics = sel.semantic.map((s) => {
    const ratio = contrast(s.hex, s.background)
    return `<article class="semantic"><div class="semantic-sample" style="color:${s.hex};background:${s.background}">${icon(s.id === 'success' ? 'check' : s.id)}<span>${esc(s.message)}</span></div><div class="semantic-label"><h4>${esc(s.name)}</h4><button class="copy-text" data-copy="${s.hex}" aria-label="Copy ${esc(s.name)} colour"><code>${s.hex}</code>${icon('copy')}</button></div><p>${esc(s.guidance)}</p><small>${ratio.toFixed(2)}:1 · ${ratio >= 4.5 ? 'AA text' : 'Below AA text'}</small></article>`
  }).join('')

  // The specimen is drawn at the scale's size, held between the template's
  // own bounds (10–96px) so an extreme ratio cannot break the row; the label
  // always states the real value.
  const typeRows = sel.typeScale.map((t) => {
    const drawn = Math.min(96, Math.max(10, t.size))
    return `<div class="type-row"><div class="type-meta"><strong>${esc(t.name)}</strong><code>${t.size} / ${g(Math.round(t.size * t.line * 10) / 10)} px · ${t.weight}</code></div><p style="--spec-size:${g(drawn / 16)}rem;font-family:var(--font-${t.font});font-weight:${t.weight};line-height:${t.line}">${esc(t.sample)}</p></div>`
  }).join('')

  const spacing = sel.spacing.map((s) => `<div class="space-item"><span style="height:${s}px"></span><code>${s}</code></div>`).join('')
  // The pairs the kit itself sets: its text on the canvas, and the label that reads on
  // each coloured slot (the same ink the swatches and buttons use).
  const contrasts = [['chalk', 'Canvas'], ['pine', 'Primary'], ['citron', 'Accent'], ['lilac', 'Supporting']].map(([id, label]) => {
    const bg = slot[id].hex
    const fg = id === 'chalk' ? slot.ink.hex : on(bg)
    const ratio = contrast(fg, bg)
    return `<div class="contrast-pair"><span style="background:${bg};color:${fg}">Aa</span><div><strong>${esc(`Text on ${label.toLowerCase()}`)}</strong><small>${ratio.toFixed(2)}:1 · ${gradeOf(ratio)}</small></div></div>`
  }).join('')

  const coverText = (opts) => {
    const fit = fitTitle(sel.title, opts)
    return { size: fit.size, text: fit.clamp ? clampTitle(sel.title, fit.size, opts) : sel.title }
  }
  const onScreen = coverText(COVER_SCREEN)
  const halfFit = fitTitle(onScreen.text, { ...COVER_SCREEN, steps: [onScreen.size / 2], measure: COVER_PHONE })
  const coverFloor = halfFit.clamp || halfFit.broken ? COVER_FLOOR : onScreen.size / 2
  const onPaper = coverText(COVER_PRINT)
  const coverTitle = onScreen.text === onPaper.text
    ? `<span class="ct">${esc(onScreen.text)}</span>`
    : `<span class="ct ct-screen">${esc(onScreen.text)}</span><span class="ct ct-print">${esc(onPaper.text)}</span>`
  const faces = [...new Set([sel.fonts.display.name, sel.fonts.body.name])]
  const coverFacts = `${plural(sel.colourCount, 'colour')} · ${plural(faces.length, 'typeface')}`
  // The side note is the description when the person wrote one; otherwise the faces, as a fact.
  const identityText = free ? '' : sel.personalisation?.description || ''
  const coverNote = identityText || typeLine(sel.fonts.display, sel.fonts.body)

  const arrow = icon('arrow')
  const siteLinks = free ? `<aside class="site-links"><div><h3>Keep building with UIL4B.</h3><p>Explore more tools, refine your selections, and build your next kit.</p></div><nav aria-label="UIL4B website links"><a href="${SITE_ORIGIN}/" target="_blank" rel="noopener noreferrer">Visit uil4b.com${arrow}</a><a href="${SITE_ORIGIN}/create/palette" target="_blank" rel="noopener noreferrer">Build a colour palette${arrow}</a><a href="${SITE_ORIGIN}/create/font-pair" target="_blank" rel="noopener noreferrer">Explore font pairings${arrow}</a></nav><small>Website links open in a new tab and require an internet connection.</small></aside>` : ''

  const pageNumber = `@bottom-right { content:counter(page); font-family:${PRINT_META_FONT}; font-size:8pt; color:${PRINT_META_INK}; }`
  const attributionMargin = free ? `@bottom-left { content:"Made with UIL4B / Free UI kit"; font-family:${PRINT_META_FONT}; font-size:8pt; color:${PRINT_META_INK}; } ` : ''

  const data = {
    brand: { slug: sel.slug, tier },
    // The free credit line the CSS download opens with. Carried as data so a
    // Pro document holds no credit text at all.
    cssCredit: free ? `/* Made with UIL4B · Free UI kit · ${SITE_ORIGIN}/ */\n` : '',
    css: appCss,
    json: appJson,
    licenses,
  }

  const replacements = {
    FONT_CSS: fontCss,
    TOKEN_CSS: templateCss,
    SWATCHES: swatches,
    MORE_SWATCHES: moreSwatches,
    SEMANTICS: semantics,
    TYPE_ROWS: typeRows,
    SPACING: spacing,
    CONTRASTS: contrasts,
    PRINCIPLES: sel.principles.map((v) => `<span>${esc(v)}</span>`).join(''),
    EXAMPLE_NOTICE: sel.isExample ? 'Example selections · Fixed UI kit export' : 'Your selections · Fixed UI kit export',
    COPY_ICON: icon('copy'),
    ARROW_ICON: arrow,
    DOWN_ICON: icon('down'),
    PUBLISHER: free ? publisher : `<span class="pro-title">${esc(sel.name)}</span>`,
    WATERMARK: watermark,
    FREE_NOTICE: free ? `<div class="free-notice">${publisher}<span>Free UI kit</span></div>` : '',
    TIER: free ? 'Free edition' : 'Personal edition',
    IDENTITY: identity,
    INTERFACE_ROLES: roleRows,
    DATA: scriptJson(data),
    NAME: esc(sel.name),
    TAGLINE: esc(sel.tagline),
    COVER_TITLE: coverTitle,
    COVER_SIZE: String(onScreen.size),
    COVER_FLOOR: String(coverFloor),
    COVER_PRINT: String(onPaper.size),
    COVER_MEASURE: String(COVER_SCREEN.measure),
    COVER_FACTS: esc(coverFacts),
    COVER_NOTE: esc(coverNote),
    DESCRIPTION: esc(sel.description),
    GUIDETITLE: esc(sel.guideTitle),
    EDITION: esc(sel.edition),
    TINT_ROWS: tintRows,
    TINT_TOKEN: esc(sel.tintToken),
    SITE_LINKS: siteLinks,
    FONT_DISPLAY: esc(sel.fonts.display.name),
    FONT_BODY: esc(sel.fonts.body.name),
    WEIGHT_DISPLAY: String(sel.fonts.display.weight),
    WEIGHT_BODY: String(sel.fonts.body.weight),
    FONT_EMBED_NOTE: esc(notes.embedNote),
    LICENSE_NOTE: esc(notes.licenseNote),
    PRINT_WATERMARK: `@page { ${attributionMargin}${pageNumber} }`,
    RADIUS_CONTROL: String(sel.radius.control),
    RADIUS_CARD: String(sel.radius.card),
  }
  for (const [k, v] of Object.entries(sel.website)) replacements[`WEBSITE_${k.toUpperCase()}`] = esc(v)
  // Only a layout that tabulates every value asks for these.
  if (template.includes('@@COLOUR_TABLE@@')) {
    Object.assign(replacements, manualParts(sel, {
      tokens, esc, on, g, contrast, grade: gradeOf, roles: ROLES, date,
      tokenCount: designTokens(safeDesign).length + extra.length,
      embedded: Object.fromEntries(notes.embedded.map((f) => [f, fonts[f].license.name])),
      chrome,
      download,
    }))
  }

  if (template.includes('@@STRIPES@@')) {
    Object.assign(replacements, showcaseParts(sel, {
      tokens, esc, on, g, contrast, grade: gradeOf, roles: ROLES, date,
      tokenCount: designTokens(safeDesign).length + extra.length,
      embedded: Object.fromEntries(notes.embedded.map((f) => [f, fonts[f].license.name])),
      chrome,
      download,
    }))
  }

  // One pass over the template: each placeholder is looked up in the map. The
  // function form means a replacement is never interpreted (a `$&` in a project
  // name stays literal) and never re-scanned (a name holding a placeholder stays text).
  const html = template.replace(/@@([A-Z][A-Z0-9_]*)@@/g, (whole, key) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, key)) throw new Error(`Unresolved UI kit placeholder ${whole}`)
    return replacements[key]
  })

  return {
    html,
    filename: `${sel.slug}.html`,
    selections: sel,
    embedded: notes.embedded,
    missing: notes.missing,
  }
}

/** The weights the document sets in each selected family, for the font fetcher. */
export function kitFontRequests(design) {
  const sel = kitSelections(withPalette(design), { tier: 'free' })
  const want = new Map()
  const add = (family, weights) => {
    const set = want.get(family) || new Set()
    weights.forEach((w) => set.add(w))
    want.set(family, set)
  }
  // Fixed weights are the ones the template's stylesheet sets on selected faces.
  add(sel.fonts.display.name, [sel.fonts.display.weight, 500, 600, 700])
  add(sel.fonts.body.name, [sel.fonts.body.weight, 500, 600])
  return [...want].map(([family, set]) => ({ family, weights: [...set].sort((a, b) => a - b) }))
}
