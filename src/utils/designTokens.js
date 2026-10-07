// Design tokens: a saved design → a CSS custom-properties file and a JSON file
// in the W3C Design Tokens Community Group format (DTCG, Format Module 2025.10).
//
// ONE TOKEN LIST, TWO SERIALISATIONS. designTokens() builds the list; the CSS
// and JSON writers only format it. A token's CSS name is its JSON path joined
// with hyphens, with the `$root` segment dropped, so the two files always carry
// the same names and the same values (tests/unit/token-export.test.js checks
// the round trip).
//
// WHAT IS IN IT, and where each value comes from:
//   color.<role>            the palette as saved (design.palette.colors), named
//                           by stable slot: primary, secondary, accent, subtle,
//                           deep, then alternative-1, -2 … — the same names the
//                           Palette Builder's Copy CSS uses, so they do not change
//                           when the colour system does
//   color.<role>.<step>     that colour's tint scale, steps 50–950, built with the
//                           project's saved tint settings (design.tints) by the
//                           same generator that writes design.tints.scale
//   color.<state>.<step>    semantic colours — success, warning, error, info —
//                           steps 50–900, resolved from design.states
//   font.*, type.*, line-height.*, letter-spacing.*
//                           families, weights, the type ladder, ratio, line
//                           heights and letter spacing
//   gradient.brand          the saved gradient, when its stops resolve to two
//                           distinct colours
//
// Colours are hex. The design holds no dark-theme values, so the files have no
// dark-theme block.
//
// Pure functions over a plain design object — no React, no DOM.

import { generateTintScale, T_LABELS } from './colors.js'
import { readBook } from './designSystemBook.js'
import { typeLadder } from './styleGuideExport.js'
import { roleLabels } from './paletteRoles.js'
import { SITE_ORIGIN } from './routeMeta.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../data/designDefaults.js'
import { semanticShades, SEMANTIC_ROLES, SEMANTIC_STEPS, SEMANTIC_LABELS } from '../data/semanticPresets.js'
import { gradientCss } from '../data/gradientGallery.js'

const CREDIT = `Made with UIL4B — ${SITE_ORIGIN}`
export const HEADING_LINE_HEIGHT = 1.1

// The fixed slot names, lower-cased: primary, secondary, accent, subtle, deep.
const SLOTS = roleLabels('auto').map((r) => r.toLowerCase())

/** The slot name for palette column `i`. */
export function paletteRole(i) {
  return i < SLOTS.length ? SLOTS[i] : `alternative-${i - SLOTS.length + 1}`
}

/** A token path → its CSS custom property name. */
export function cssVarName(path) {
  return `--${path.filter((p) => p !== '$root').join('-')}`
}

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback)

/** The project's tint settings, each field checked, defaults filled in. */
function tintSettings(design) {
  const saved = design?.tints || {}
  const d = DEFAULT_DESIGN.tints
  return {
    lumBias: num(saved.lumBias, d.lumBias),
    satDecay: num(saved.satDecay, d.satDecay),
    oled: typeof saved.oled === 'boolean' ? saved.oled : d.oled,
  }
}

/** A font stack: the family, then the generic fallback for its category. */
function fontStack(family, category) {
  if (category === 'serif') return [family, 'serif']
  if (category === 'monospace') return [family, 'monospace']
  if (category === 'handwriting') return [family, 'cursive']
  return [family, 'system-ui', 'sans-serif']
}

const ladderSlug = (name) => name.toLowerCase().replace(/\s+/g, '-')

/**
 * The complete token list, in file order.
 * Each token: { path: string[], type, value, description? }.
 * `value` is kept in a neutral form (hex string, { value, unit }, number,
 * string[], or { stops, angle, type } for the gradient); the writers format it.
 */
export function designTokens(design) {
  const d = readBook(design)
  const tokens = []
  const add = (path, type, value, description) => tokens.push(description ? { path, type, value, description } : { path, type, value })

  // Palette, each colour followed by its tint scale.
  const tint = tintSettings(design)
  const tintBase = tintConfigFor({ tints: tint, palette: { base: d.palette[0] || '#000000' } })
  d.palette.forEach((hex, i) => {
    const role = paletteRole(i)
    add(['color', role, '$root'], 'color', hex)
    const ramp = generateTintScale({ ...tintBase, hex })
    ramp.forEach((stop, k) => add(['color', role, T_LABELS[k]], 'color', stop.toUpperCase()))
  })

  // Semantic colours.
  const shades = semanticShades(design?.states)
  for (const role of SEMANTIC_ROLES) {
    shades[role].forEach((hex, k) => add(['color', role, SEMANTIC_STEPS[k]], 'color', hex))
  }

  // Type.
  const fonts = design?.fonts || {}
  add(['font', 'heading'], 'fontFamily', fontStack(d.heading, fonts.heading?.category))
  add(['font', 'body'], 'fontFamily', fontStack(d.body, fonts.body?.category))
  add(['font', 'weight', 'heading'], 'fontWeight', Math.round(num(d.headingWeight, 700)))
  add(['font', 'weight', 'body'], 'fontWeight', Math.round(num(d.bodyWeight, 400)))
  add(['font', 'size', 'base'], 'dimension', { value: d.baseSize, unit: 'px' })
  for (const step of typeLadder(d)) {
    add(['font', 'size', ladderSlug(step.name)], 'dimension', { value: step.px, unit: 'px' })
  }
  add(['type', 'ratio'], 'number', d.ratio)
  add(['line-height', 'body'], 'number', d.lineHeight)
  add(['line-height', 'heading'], 'number', HEADING_LINE_HEIGHT)
  add(['letter-spacing', 'heading'], 'number', d.headingSpacing, 'Letter spacing in em.')
  add(['letter-spacing', 'body'], 'number', d.bodySpacing, 'Letter spacing in em.')

  // Gradient.
  if (d.gradient) {
    add(['gradient', 'brand'], 'gradient', {
      stops: d.gradient.stops.map((s) => ({ color: s.color, position: s.position })),
      angle: d.gradient.angle,
      type: ['Linear', 'Radial', 'Conic'].includes(d.gradient.type) ? d.gradient.type : 'Linear',
    })
  }
  return tokens
}

/* ── CSS ──────────────────────────────────────────────────────────────────── */

function cssValue(token) {
  const v = token.value
  switch (token.type) {
    case 'color': return v
    case 'dimension': return `${v.value}${v.unit}`
    case 'fontFamily': return v.map((f, i) => (i === 0 ? `"${String(f).replace(/["\\]/g, '')}"` : f)).join(', ')
    case 'gradient': return gradientCss(v.type, v.angle, v.stops)
    case 'duration': return `${v.value}${v.unit}`
    case 'cubicBezier': return `cubic-bezier(${v.join(', ')})`
    default:
      return token.path[0] === 'letter-spacing' ? `${v}em` : String(v)
  }
}

// Text placed inside a CSS comment must not be able to close it.
const commentSafe = (s) => String(s ?? '').replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ')

const SECTION = {
  color: 'Colour',
  font: 'Type',
  type: null,
  'line-height': null,
  'letter-spacing': null,
  gradient: 'Gradient',
  space: 'Space',
  radius: 'Radius',
  duration: 'Motion',
  ease: null,
}

/**
 * The tokens as a stylesheet of custom properties on :root.
 * `watermark` adds the free-tier credit as the file's last line.
 * `extra` appends caller-built tokens of the same shape after the design's own
 * (the UI kit adds its interface roles, spacing, radii and motion this way); a
 * token may carry `section` to head its group in the stylesheet.
 */
export function buildTokensCss(design, { projectName = 'Design System', watermark = true, date = new Date(), extra = [] } = {}) {
  const tokens = [...designTokens(design), ...extra]
  const semantic = SEMANTIC_ROLES.map((r) => (r === 'info' ? `info (${SEMANTIC_LABELS[r]})` : r)).join(', ')
  const header = [
    '/*',
    ` * ${commentSafe(projectName)} — design tokens`,
    ` * Generated ${date.toISOString().slice(0, 10)}.`,
    ' *',
    ' * Naming',
    ' *   --color-<role>               palette colour; roles: primary, secondary,',
    ' *                                accent, subtle, deep, alternative-<n>',
    ' *   --color-<role>-<step>        its tint scale, steps 50–950',
    ' *   --color-<state>-<step>       semantic colour, steps 50–900; states:',
    ` *                                ${semantic}`,
    ' *                                (e.g. --color-success-500)',
    ' *   --font-heading, --font-body  font stacks',
    ' *   --font-weight-heading, --font-weight-body',
    ' *   --font-size-base, --font-size-<step>  type scale; steps: display,',
    ' *                                heading-1, heading-2, heading-3, lead, body,',
    ' *                                small, caption',
    ' *   --type-ratio, --line-height-body, --line-height-heading',
    ' *   --letter-spacing-heading, --letter-spacing-body  (em)',
    ' *   --gradient-brand',
    ' *',
    ' * Colours are hex. The same tokens are in the JSON (DTCG) export: each name',
    ' * here is the JSON token path joined with hyphens.',
    ' */',
  ]
  const lines = [...header, ':root {']
  let section = null
  for (const t of tokens) {
    const title = t.section || SECTION[t.path[0]]
    if (title && title !== section) {
      if (section) lines.push('')
      lines.push(`  /* ${title} */`)
      section = title
    }
    lines.push(`  ${cssVarName(t.path)}: ${cssValue(t)};`)
  }
  lines.push('}')
  if (watermark) lines.push('', `/* ${CREDIT} */`)
  return `${lines.join('\n')}\n`
}

/* ── JSON (DTCG) ──────────────────────────────────────────────────────────── */

const round4 = (n) => Math.round(n * 10000) / 10000

function dtcgColor(hex) {
  const h = hex.toUpperCase()
  return {
    colorSpace: 'srgb',
    components: [1, 3, 5].map((i) => round4(parseInt(h.slice(i, i + 2), 16) / 255)),
    hex: h,
  }
}

function dtcgToken(token) {
  const v = token.value
  let value
  const out = { $type: token.type }
  switch (token.type) {
    case 'color': value = dtcgColor(v); break
    case 'gradient':
      value = v.stops.map((s) => ({ color: dtcgColor(s.color), position: round4(s.position / 100) }))
      out.$extensions = { 'com.uil4b': { type: v.type, angle: v.angle } }
      break
    default: value = v
  }
  out.$value = value
  if (token.description) out.$description = token.description
  return out
}

/**
 * The tokens as a DTCG JSON document (a string, two-space indented).
 * `watermark` puts the free-tier credit in the root description.
 * `extra` appends caller-built tokens, as in buildTokensCss.
 * `extensions`, when given, becomes the root group's DTCG `$extensions` object.
 */
export function buildTokensJson(design, { projectName = 'Design System', watermark = true, extra = [], extensions = null } = {}) {
  const doc = {
    $description: `${String(projectName ?? '')} — design tokens.${watermark ? ` ${CREDIT}` : ''}`,
  }
  if (extensions && typeof extensions === 'object') doc.$extensions = extensions
  for (const t of [...designTokens(design), ...extra]) {
    let node = doc
    t.path.slice(0, -1).forEach((seg) => {
      if (!node[seg]) node[seg] = {}
      node = node[seg]
    })
    node[t.path[t.path.length - 1]] = dtcgToken(t)
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}
