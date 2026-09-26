// The UI kit export: a saved design → one self-contained HTML document built
// from src/templates/uiKit.html, plus the token, font and licence data that
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
// Free input is stripped of personal data before anything is rendered, so a
// free document cannot carry the project's name even in its embedded data.
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
// and its tint heading says so. Text falls back to black or white only
// when no stop clears 4.5:1. Colours past position 5 are not drawn as slots;
// they are in the CSS and JSON downloads.
// The shares (40 / 25 / 20 / 10 / 5) belong to the slot, not the colour: the
// app records no proportions, and the template presents them as a starting
// point for a page.

import { contrast, typeLadder } from './styleGuideExport.js'
import { readBook } from './designSystemBook.js'
import { generateTintScale, mixHex, T_LABELS } from './colors.js'
import { colorName } from './paletteNames.js'
import { buildTokensCss, buildTokensJson, HEADING_LINE_HEIGHT, paletteRole } from './designTokens.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../data/designDefaults.js'
import { semanticShades, SEMANTIC_STEPS } from '../data/semanticPresets.js'
import { SITE_ORIGIN } from './routeMeta.js'
import { SUBSET_RANGES } from './kitFonts.js'
import { readIdentity } from './kitIdentity.js'

export const KIT_TIERS = Object.freeze(['free', 'pro'])

/** A palette colour this light or lighter can be the canvas. */
export const CANVAS_MIN_LUM = 0.7

// ── Fixed template copy ─────────────────────────────────────────────────────
// Every string below is the template's own (its reference build input). They
// are the document's copy, not example data: none of them names a colour, a
// typeface or a person.

const FREE_IDENTITY = Object.freeze({
  name: 'UIL4B',
  slug: 'uil4b-ui-kit',
  edition: 'UI kit / Free edition',
})
const GUIDE_COPY = Object.freeze({
  tagline: 'From selections to a system.',
  guideTitle: 'Less guesswork. More consistency.',
  description: 'Your selected colours, typefaces, and interface foundations, brought together in one reference. A practical starting point for the next thing you build.',
  principles: ['Colour & semantic roles', 'Typography & spacing', 'Components & states'],
})
const WEBSITE_COPY = Object.freeze({
  headline: 'A place for your next idea.',
  description: 'Keep the important things clear. Give each action a purpose. Make every detail part of the same system.',
  button: 'Create a project',
  feature: 'Built on good foundations.',
  category: 'Interface specimen',
  caption: 'A layout specimen using the selected colours, fonts, and component tokens.',
})
const SLOT_COPY = Object.freeze({
  citron: { role: 'Signature accent', note: 'The spark. Use for moments that deserve attention.', share: 20 },
  pine: { role: 'Primary brand', note: 'The anchor. Ground expressive layouts and key actions.', share: 25 },
  lilac: { role: 'Supporting colour', note: 'The softer side. Give stories and quiet moments a home.', share: 10 },
  chalk: { role: 'Canvas', note: 'The breathing room. Let the content come forward.', share: 40 },
  ink: { role: 'Text and detail', note: 'The definition. Keep reading clear and details precise.', share: 5 },
})
// The template's slot order: it sets the swatch grid's column widths.
const SLOT_ORDER = ['citron', 'pine', 'lilac', 'chalk', 'ink']
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
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (hex) => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
// Python's `{:g}`: up to six significant digits, no trailing zeros.
const g = (n) => String(Number(Number(n).toPrecision(6)))

const slugify = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52)

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
 * The five palette slots, from the design. See the note at the top of the file.
 * Each slot: { id, name, hex, role, note, share, scale, source }.
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
  let ink
  if (colors[4] && contrast(colors[4], chalk.hex) >= 4.5) ink = fromPalette(4)
  else {
    const stop = ['950', '900'].find((s) => contrast(primaryScale[s], chalk.hex) >= 4.5)
    if (stop) ink = fromPrimary(stop)
    else {
      const black = contrast('#000000', chalk.hex) >= contrast('#FFFFFF', chalk.hex)
      ink = { hex: black ? '#000000' : '#FFFFFF', source: 'Set for contrast · generated scale', index: null }
    }
  }

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
    return { ...SEMANTIC_COPY[role], hex: up(at(role, step)), background: up(background) }
  })
}

const FALLBACKS = { serif: 'serif', monospace: 'monospace', handwriting: 'cursive' }

/**
 * Everything the template needs, as one record. `tier` must be verified by the
 * caller. A Pro kit's name and description are read from `design.identity`.
 */
export function kitSelections(design, { tier = 'free', logo = null } = {}) {
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

  const record = {
    tier,
    isExample: false,
    ...GUIDE_COPY,
    palette,
    semantic,
    fonts: { display, body },
    typeScale,
    spacing: [...SPACING],
    radius: { ...RADIUS },
    interface: iface,
    website: { ...WEBSITE_COPY },
    tintToken: slot.pine.token || '--color-primary',
  }
  if (free) return { ...record, ...FREE_IDENTITY }

  // Pro: the identity section appears only when the person has named the work.
  const { name, description } = readIdentity(design)
  const personalisation = name
    ? { name, ...(description ? { description } : {}), ...(logo?.src ? { logo: { src: logo.src } } : {}) }
    : null
  const slug = slugify(name) ? `${slugify(name)}-ui-kit` : 'ui-kit'
  return { ...record, name: name || 'UI kit', slug, edition: 'UI kit / Personal edition', personalisation }
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

const toBase64 = (text) => {
  if (globalThis.Buffer) return globalThis.Buffer.from(text, 'utf8').toString('base64')
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

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
 *   template       the text of src/templates/uiKit.html
 *   markSvg        the publisher mark's SVG source (public/favicon.svg)
 *   fonts          selected fonts by family, see embeddable()
 *   publisherFonts [{ family: 'Geist', axis: '300 700', faces: [{ subset, base64 }] }]
 *   publisherLicense  Geist's licence text
 *   logo           Pro only: readLogo(design)
 *   date           for the token file header; defaults to now
 * A Pro kit's name and description come from the design (see kitIdentity.js).
 * @returns { html, filename, selections, embedded, missing }
 */
export function renderUiKit(design, {
  tier = 'free', template, markSvg = '', fonts = {}, publisherFonts = [], publisherLicense = '',
  logo = null, date = new Date(),
} = {}) {
  if (typeof template !== 'string' || !template.includes('@@DATA@@')) throw new Error('The UI kit template is missing.')
  const safeDesign = withPalette(design)
  const sel = kitSelections(safeDesign, { tier, logo })
  const free = tier === 'free'
  const tokens = kitTemplateTokens(sel)
  const on = makeOn(sel.palette.find((p) => p.id === 'ink').hex)
  const slot = Object.fromEntries(sel.palette.map((p) => [p.id, p]))
  const notes = fontNotes(sel, fonts)

  const templateCss = `:root {\n${Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};\n`).join('')}}\n`

  // The files the document hands over: the app's own token formats, plus the
  // tokens only the kit documents.
  const extra = kitExtraTokens(sel)
  const tokenName = free ? 'UI kit' : sel.name
  const appCss = buildTokensCss(safeDesign, { projectName: tokenName, watermark: false, date, extra })
  // A free kit's JSON names its generator in the DTCG `$extensions` slot, under
  // a reverse-domain key; a Pro kit's JSON carries no metadata at all.
  const extensions = free ? { 'com.uil4b': { generator: 'UIL4B', edition: 'free', url: `${SITE_ORIGIN}/` } } : null
  const appJson = buildTokensJson(safeDesign, { projectName: tokenName, watermark: free, extra, extensions })

  // Selected faces first: the document's font download reads the first
  // stylesheet's @font-face rules and skips every "Publisher " family.
  let fontCss = ''
  let licenses = ''
  for (const family of notes.embedded) {
    for (const face of fonts[family].faces) fontCss += faceRule(family, face)
    licenses += `\n${family}\n${fonts[family].license.text}\n`
  }
  for (const pub of publisherFonts) {
    for (const face of pub.faces || []) {
      const range = SUBSET_RANGES[face.subset]
      const data = String(face.base64 || '').replace(/[^A-Za-z0-9+/=]/g, '')
      if (!range || !data) continue
      fontCss += `@font-face{font-family:"Publisher ${cssFamily(pub.family)}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${pub.axis};font-style:normal;font-display:swap;unicode-range:${range};}\n`
    }
  }
  if (publisherLicense) licenses += `\nGeist and Geist Mono (publisher interface)\n${publisherLicense}\n`

  const mark = `data:image/svg+xml;base64,${toBase64(markSvg)}`
  const lockup = `<span class="publisher-lockup"><img src="${mark}" alt="" width="26" height="26"><span>UIL4B</span></span>`
  const publisher = `<a class="publisher-link" href="${SITE_ORIGIN}/" target="_blank" rel="noopener noreferrer" aria-label="Visit UIL4B (opens in a new tab)">${lockup}</a>`
  const watermark = free ? `<span class="section-watermark">Made with ${publisher}</span>` : ''

  let identity = ''
  const personal = free ? null : sel.personalisation
  if (personal?.name) {
    identity = `<section class="chapter personal-identity" id="identity"><div class="section-head"><h2>Your identity.</h2><p>${esc(personal.description || 'Your supplied identity, paired with the selected interface system.')}</p></div><div class="identity-name">${esc(personal.name)}</div>`
    const src = personal.logo?.src
    if (typeof src === 'string' && /^data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)) {
      identity += `<div class="identity-logo"><img src="${src}" alt="${esc(personal.name)} logo"></div><p class="component-note">Logo shown as supplied. No colours or proportions have been changed.</p>`
    }
    identity += '</section>'
  }

  const tintRows = sel.palette.map((p) => {
    const chips = Object.entries(p.scale).map(([stop, value]) => `<button class="tint-chip" style="background:${value};color:${on(value)}" data-copy="${value}" aria-label="Copy ${esc(p.name)} ${stop}, ${value}"><span>${stop}${stop === '500' ? ' · Base' : ''}</span><code>${value}</code></button>`).join('')
    return `<article class="tint-row"><div class="tint-heading"><h4>${esc(p.name)}</h4><small>${esc(p.source)}</small></div><div class="tint-scale">${chips}</div></article>`
  }).join('')

  const roleRows = ROLES.map(([name, key, description]) => `<tr><th scope="row"><i style="background:${tokens[key]}"></i>${name}</th><td><button class="copy-text" data-copy="var(--${key})" aria-label="Copy ${name} CSS variable"><code>--${key}</code>${icon('copy')}</button></td><td><code>${tokens[key]}</code></td><td>${description}</td></tr>`).join('')

  const swatches = sel.palette.map((p) => `<article class="swatch"><button class="colour-chip" style="--swatch:${p.hex};--on-swatch:${on(p.hex)}" data-copy="${p.hex}" aria-label="Copy ${esc(p.name)} ${p.hex}"><span>${esc(p.name)}</span><span class="chip-bottom"><code>${p.hex}</code>${icon('copy')}</span></button><div class="swatch-details"><h3>${esc(p.role)}</h3><p>${esc(p.note)}</p><code>RGB ${rgb(p.hex).join(' / ')}</code></div></article>`).join('')

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
  const byShare = [...sel.palette].sort((a, b) => b.share - a.share)
  const proportions = byShare.map((p) => `<span style="flex:${p.share};background:${p.hex}" title="${esc(p.name)} ${p.share}%"></span>`).join('')
  const proportionLabels = byShare.map((p) => `<span><i style="background:${p.hex}"></i>${esc(p.name)} <b>${p.share}%</b></span>`).join('')
  const contrasts = [['ink', 'chalk'], ['chalk', 'pine'], ['pine', 'citron'], ['ink', 'lilac']].map(([a, b]) => {
    const ratio = contrast(slot[a].hex, slot[b].hex)
    return `<div class="contrast-pair"><span style="background:${slot[b].hex};color:${slot[a].hex}">Aa</span><div><strong>${esc(`${slot[a].name} on ${slot[b].name}`)}</strong><small>${ratio.toFixed(2)}:1 · ${ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Below AA'} text</small></div></div>`
  }).join('')

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
    SEMANTICS: semantics,
    TYPE_ROWS: typeRows,
    SPACING: spacing,
    PROPORTIONS: proportions,
    PROPORTION_LABELS: proportionLabels,
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

  // split/join rather than String.replace: a replacement string is never
  // interpreted, so a `$&` in someone's project name stays literal.
  let html = template
  for (const [key, value] of Object.entries(replacements)) html = html.split(`@@${key}@@`).join(value)
  const unresolved = /@@[A-Z_]+@@/.exec(html)
  if (unresolved) throw new Error(`Unresolved UI kit placeholder ${unresolved[0]}`)

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
