// Design tokens: a saved design → a CSS custom-properties file and a JSON file
// in the W3C Design Tokens Community Group format (DTCG, Format Module 2025.10).
//
// ONE TOKEN LIST, THREE SERIALISATIONS. designTokens() builds the list; the CSS
// and JSON writers (here) and the Tailwind writer (tailwindTheme.js) only format
// it. A token's CSS name is its JSON path joined with hyphens, with the `$root`
// segment dropped, so the files always carry the same names and the same values
// (tests/unit/token-export.test.js checks the round trip).
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
//   color.<interface role>  background, surface, on-surface, on-surface.muted,
//                           border, primary.hover, on-primary, focus, disabled,
//                           on-disabled (systemRoles.js); an alias of the palette
//                           or semantic token with the same value when there is
//                           one, else a literal colour
//   font.*, type.ratio, line-height.*, letter-spacing.*
//                           families, weights, the type ladder, ratio, line
//                           heights and letter spacing
//   type.<step>             one typography composite per ladder step, aliasing the
//                           font, weight, size and line-height tokens (JSON only;
//                           the CSS has a .text-<step> class instead)
//   gradient.brand          the saved gradient, when its stops resolve to two
//                           distinct colours
//
// Token shape: { path, type, value, description?, alias?, refs?, extensions?,
// section? }. `value` is always the resolved value, so a writer with no use for
// references (Tailwind) reads it as is. `alias` is the path of the token an
// identical value comes from; `refs` maps a typography composite's members to the
// tokens they come from.
//
// Colours are lower-case hex. The design holds no dark-theme values, so the files
// have no dark-theme block.
//
// Pure functions over a plain design object — no React, no DOM.

import { generateTintScale } from './colors.js'
import { tintLabelsFor } from './tintLabels.js'
import { readBook } from './bookModel.js'
import { typeLadder } from './styleGuideExport.js'
import { SITE_ORIGIN } from './routeMeta.js'
import { paletteRole, kitPalette, kitSemantic, interfaceRoles, ROLE_TOKENS } from './systemRoles.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../data/designDefaults.js'
import { semanticShades, SEMANTIC_ROLES, SEMANTIC_STEPS, SEMANTIC_LABELS } from '../data/semanticPresets.js'
import { gradientCss } from '../data/gradientGallery.js'

const CREDIT = `Made with UIL4B: ${SITE_ORIGIN}`
export const HEADING_LINE_HEIGHT = 1.1

export { paletteRole }

/** A token path → its CSS custom property name. */
export function cssVarName(path) {
  return `--${path.filter((p) => p !== '$root').join('-')}`
}

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const lower = (hex) => String(hex).toLowerCase()
const round3 = (n) => Math.round(n * 1000) / 1000
const round4 = (n) => Math.round(n * 10000) / 10000

/** A size in px as rem against a 16px root, as the CSS and Tailwind files write it. */
export const remOf = (px) => `${Number((px / 16).toFixed(5))}rem`

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
 * Each token: { path: string[], type, value, ... } (see the note at the top).
 * `value` is kept in a neutral form (lower-case hex string, { value, unit },
 * number, string[], a composite object, or { stops, angle, type } for the
 * gradient); the writers format it.
 */
export function designTokens(design) {
  const d = readBook(design)
  const tokens = []
  const add = (path, type, value, extra = {}) => tokens.push({ path, type, value, ...extra })

  // Palette, each colour followed by its tint scale.
  const tint = tintSettings(design)
  const tintBase = tintConfigFor({ tints: tint, palette: { base: d.palette[0] || '#000000' } })
  d.palette.forEach((hex, i) => {
    const role = paletteRole(i)
    add(['color', role, '$root'], 'color', lower(hex))
    const ramp = generateTintScale({ ...tintBase, hex })
    const steps = tintLabelsFor(ramp.length)
    ramp.forEach((stop, k) => add(['color', role, steps[k]], 'color', lower(stop)))
  })

  // Semantic colours.
  const shades = semanticShades(design?.states)
  for (const role of SEMANTIC_ROLES) {
    shades[role].forEach((hex, k) => add(['color', role, SEMANTIC_STEPS[k]], 'color', lower(hex)))
  }

  // Interface roles. Each takes the path of an identical palette, semantic or
  // tint token when there is one: palette colours first, then semantic, then tints.
  if (d.palette.length) {
    const named = tokens.filter((t) => t.type === 'color')
    const rank = (t) => (t.path[t.path.length - 1] === '$root' ? 0 : SEMANTIC_ROLES.includes(t.path[1]) ? 1 : 2)
    const source = new Map()
    for (const t of [...named].sort((a, b) => rank(a) - rank(b))) if (!source.has(t.value)) source.set(t.value, t.path)
    const roles = interfaceRoles(kitPalette(design), kitSemantic(design))
    for (const [key, rest] of ROLE_TOKENS) {
      const hex = lower(roles[key])
      add(['color', ...rest], 'color', hex, { section: 'Colour roles', ...(source.has(hex) ? { alias: source.get(hex) } : {}) })
    }
  }

  // Type.
  const fonts = design?.fonts || {}
  const stacks = { heading: fontStack(d.heading, fonts.heading?.category), body: fontStack(d.body, fonts.body?.category) }
  const weights = { heading: Math.round(num(d.headingWeight, 700)), body: Math.round(num(d.bodyWeight, 400)) }
  const lineHeights = { heading: HEADING_LINE_HEIGHT, body: d.lineHeight }
  const spacings = { heading: d.headingSpacing, body: d.bodySpacing }
  add(['font', 'heading'], 'fontFamily', stacks.heading)
  add(['font', 'body'], 'fontFamily', stacks.body)
  add(['font', 'weight', 'heading'], 'fontWeight', weights.heading)
  add(['font', 'weight', 'body'], 'fontWeight', weights.body)
  add(['font', 'size', 'base'], 'dimension', { value: d.baseSize, unit: 'px' })
  const ladder = typeLadder(d)
  for (const step of ladder) {
    add(['font', 'size', ladderSlug(step.name)], 'dimension', { value: step.px, unit: 'px' })
  }
  add(['type', 'ratio'], 'number', d.ratio)
  add(['line-height', 'body'], 'number', d.lineHeight)
  add(['line-height', 'heading'], 'number', HEADING_LINE_HEIGHT)
  const em = { description: 'Letter spacing in em.', extensions: { 'com.uil4b': { unit: 'em' } } }
  add(['letter-spacing', 'heading'], 'number', d.headingSpacing, em)
  add(['letter-spacing', 'body'], 'number', d.bodySpacing, em)

  // One text style per ladder step. The DTCG composite takes a letter spacing in
  // px, so the em values above are multiplied by the step's size.
  for (const step of ladder) {
    const slug = ladderSlug(step.name)
    const kind = step.exp >= 1 ? 'heading' : 'body'
    add(['type', slug], 'typography', {
      fontFamily: stacks[kind],
      fontSize: { value: step.px, unit: 'px' },
      fontWeight: weights[kind],
      letterSpacing: { value: round3(spacings[kind] * step.px) || 0, unit: 'px' },
      lineHeight: lineHeights[kind],
    }, {
      refs: {
        fontFamily: ['font', kind],
        fontSize: ['font', 'size', slug],
        fontWeight: ['font', 'weight', kind],
        lineHeight: ['line-height', kind],
      },
      letterSpacingRef: ['letter-spacing', kind],
    })
  }

  // Gradient.
  if (d.gradient) {
    add(['gradient', 'brand'], 'gradient', {
      stops: d.gradient.stops.map((s) => ({ color: lower(s.color), position: s.position })),
      angle: d.gradient.angle,
      type: ['Linear', 'Radial', 'Conic'].includes(d.gradient.type) ? d.gradient.type : 'Linear',
    })
  }
  return tokens
}

/* ── CSS ──────────────────────────────────────────────────────────────────── */

const isFontSize = (t) => t.type === 'dimension' && t.path[0] === 'font' && t.path[1] === 'size'

/** A token's CSS value, and the note that follows it in a comment (or ''). */
function cssValue(token) {
  const v = token.value
  if (token.alias) return { value: `var(${cssVarName(token.alias)})`, note: '' }
  switch (token.type) {
    case 'color': return { value: v, note: '' }
    case 'dimension':
      return isFontSize(token) ? { value: remOf(v.value), note: `${v.value}px` } : { value: `${v.value}${v.unit}`, note: '' }
    case 'fontFamily': return { value: v.map((f, i) => (i === 0 ? `"${String(f).replace(/["\\]/g, '')}"` : f)).join(', '), note: '' }
    case 'gradient': return { value: gradientCss(v.type, v.angle, v.stops).replace(/#[0-9A-F]{6}/g, lower), note: '' }
    case 'duration': return { value: `${v.value}${v.unit}`, note: '' }
    case 'cubicBezier': return { value: `cubic-bezier(${v.join(', ')})`, note: '' }
    default:
      return { value: token.path[0] === 'letter-spacing' ? `${v}em` : String(v), note: '' }
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

/** The .text-<step> classes: each text style, built from the variables above. */
function textStyleRules(tokens) {
  const rules = tokens.filter((t) => t.type === 'typography').map((t) => {
    const name = t.path[t.path.length - 1]
    const r = t.refs
    return [
      `.text-${name} {`,
      `  font-family: var(${cssVarName(r.fontFamily)});`,
      `  font-size: var(${cssVarName(r.fontSize)});`,
      `  font-weight: var(${cssVarName(r.fontWeight)});`,
      `  line-height: var(${cssVarName(r.lineHeight)});`,
      `  letter-spacing: var(${cssVarName(t.letterSpacingRef)});`,
      '}',
    ].join('\n')
  })
  return rules.length ? ['', '/* Text styles, built from the variables above */', rules.join('\n\n')] : []
}

/**
 * The tokens as a stylesheet of custom properties on :root, then a .text-<step>
 * class per text style.
 * `watermark` adds the free-tier credit as the file's last line.
 * `extra` appends caller-built tokens of the same shape after the design's own
 * (the UI kit adds its spacing, radii and motion this way); a token may carry
 * `section` to head its group in the stylesheet.
 */
export function buildTokensCss(design, { projectName = 'Design System', watermark = true, date = new Date(), extra = [] } = {}) {
  const tokens = [...designTokens(design), ...extra]
  const semantic = SEMANTIC_ROLES.map((r) => (r === 'info' ? `info (${SEMANTIC_LABELS[r]})` : r)).join(', ')
  const header = [
    '/*',
    ` * ${commentSafe(projectName)}: design tokens`,
    ` * Generated ${date.toISOString().slice(0, 10)}.`,
    ' *',
    ' * Naming',
    ' *   --color-<role>               palette colour; roles: primary, secondary,',
    ' *                                accent, subtle, deep, alternative-<n>',
    ' *   --color-<role>-<step>        its tint scale, steps 50–950',
    ' *   --color-<state>-<step>       semantic colour, steps 50–900; states:',
    ` *                                ${semantic}`,
    ' *                                (e.g. --color-success-500)',
    ' *   --color-background, --color-surface, --color-on-surface,',
    ' *   --color-on-surface-muted, --color-border, --color-primary-hover,',
    ' *   --color-on-primary, --color-focus, --color-disabled, --color-on-disabled',
    ' *                                interface roles; "on-" is the ink that reads on',
    ' *                                the colour. A role that matches a palette, tint or',
    ' *                                semantic colour points to it with var().',
    ' *   --font-heading, --font-body  font stacks',
    ' *   --font-weight-heading, --font-weight-body',
    ' *   --font-size-base, --font-size-<step>  type scale in rem (16px root), with',
    ' *                                the px value beside it; steps: display,',
    ' *                                heading-1, heading-2, heading-3, lead, body,',
    ' *                                small, caption',
    ' *   --type-ratio, --line-height-body, --line-height-heading',
    ' *   --letter-spacing-heading, --letter-spacing-body  (em)',
    ' *   --gradient-brand',
    ' *   .text-<step>                 a text style: family, size, weight, line height',
    ' *                                and letter spacing from the variables above',
    ' *',
    ' * Colours are lower-case hex. The same tokens are in the JSON (DTCG) export: each',
    ' * name here is the JSON token path joined with hyphens.',
    ' */',
  ]
  const lines = [...header, ':root {']
  let section = null
  for (const t of tokens) {
    if (t.type === 'typography') continue
    const title = t.section || SECTION[t.path[0]]
    if (title && title !== section) {
      if (section) lines.push('')
      lines.push(`  /* ${title} */`)
      section = title
    }
    const { value, note } = cssValue(t)
    lines.push(`  ${cssVarName(t.path)}: ${value};${note ? ` /* ${note} */` : ''}`)
  }
  lines.push('}', ...textStyleRules(tokens))
  if (watermark) lines.push('', `/* ${CREDIT} */`)
  return `${lines.join('\n')}\n`
}

/* ── JSON (DTCG) ──────────────────────────────────────────────────────────── */

function dtcgColor(hex) {
  const h = lower(hex)
  return {
    colorSpace: 'srgb',
    components: [1, 3, 5].map((i) => round4(parseInt(h.slice(i, i + 2), 16) / 255)),
    hex: h,
  }
}

/** A token path → a DTCG reference: {color.primary.600}. */
const dtcgRef = (path) => `{${path.filter((p) => p !== '$root').join('.')}}`

function dtcgToken(token) {
  const v = token.value
  let value
  const out = { $type: token.type }
  const extensions = { ...(token.extensions || {}) }
  if (token.alias) value = dtcgRef(token.alias)
  else {
    switch (token.type) {
      case 'color': value = dtcgColor(v); break
      case 'gradient':
        value = v.stops.map((s) => ({ color: dtcgColor(s.color), position: round4(s.position / 100) }))
        extensions['com.uil4b'] = { ...(extensions['com.uil4b'] || {}), type: v.type, angle: v.angle }
        break
      case 'typography':
        value = { ...v }
        for (const [member, path] of Object.entries(token.refs)) value[member] = dtcgRef(path)
        break
      default: value = v
    }
  }
  out.$value = value
  if (token.description) out.$description = token.description
  if (Object.keys(extensions).length) out.$extensions = extensions
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
    $description: `${String(projectName ?? '')}: design tokens.${watermark ? ` ${CREDIT}` : ''}`,
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
