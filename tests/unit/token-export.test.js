// The CSS and JSON design-token exports.
//
// Both files are built from one token list (designTokens), so the tests check
// three things: the list holds the project's real values, each file is valid in
// its own format (CSS parsed by postcss, JSON walked against the DTCG 2025.10
// format rules), and the two files carry the same names with the same values.
import test from 'node:test'
import assert from 'node:assert/strict'
import postcss from 'postcss'
import {
  designTokens, buildTokensCss, buildTokensJson, cssVarName, remOf,
} from '../../src/utils/designTokens.js'
import { tailwindVars } from '../../src/utils/tailwindTheme.js'
import { generateTintScale } from '../../src/utils/colors.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { STATE_PRESETS, INFO_PURPLE } from '../../src/data/semanticPresets.js'
import { gradientCss } from '../../src/data/gradientGallery.js'
import { EXPORT_FORMATS, freeFormats } from '../../src/config/exportFormats.js'

const AT = new Date('2026-09-24T00:00:00Z')

// A small fixture: three colours, a purple Information, a retired `pending`
// key, a serif body face and a non-default type scale.
const TINTS = { lumBias: 82, satDecay: 12, oled: true }
const DESIGN = {
  palette: {
    base: '#1F4B8E',
    harmony: 'analogous',
    activeIdx: 0,
    colors: ['#1f4b8e', '#2E7BB8', '#3FA9A0'],
  },
  states: { success: 1, warning: 0, error: { custom: 10 }, info: 2, infoHue: 'purple', pending: 3 },
  tints: {
    ...TINTS,
    scale: generateTintScale({ ...tintConfigFor({ ...DEFAULT_DESIGN, tints: TINTS, palette: { base: '#1F4B8E' } }) }),
  },
  gradient: {
    stops: [{ color: '#1F4B8E', position: 0 }, { color: null, position: 100 }],
    angle: 90,
    type: 'Linear',
  },
  fonts: {
    heading: { family: 'Space Grotesk', weight: 600, category: 'sans-serif' },
    body: { family: 'Lora', weight: 400, category: 'serif' },
  },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.6, headingSpacing: -0.02, bodySpacing: 0 },
}

const byName = (tokens) => Object.fromEntries(tokens.map((t) => [cssVarName(t.path), t]))

/* ── the formats are real, and free ─────────────────────────────────────── */

test('CSS and JSON tokens are live, on the same tier as the style guide', () => {
  const css = EXPORT_FORMATS.find((f) => f.id === 'css')
  const json = EXPORT_FORMATS.find((f) => f.id === 'json')
  const guide = EXPORT_FORMATS.find((f) => f.id === 'html')
  assert.equal(css?.live, true, 'css must be live')
  assert.equal(json?.live, true, 'json must be live')
  assert.equal(Boolean(css.pro), Boolean(guide.pro), 'css must share the style guide tier')
  assert.equal(Boolean(json.pro), Boolean(guide.pro), 'json must share the style guide tier')
  assert.ok(freeFormats().some((f) => f.id === 'css') && freeFormats().some((f) => f.id === 'json'))
})

/* ── the token list holds the project's values ──────────────────────────── */

test('palette colours use the stable slot names, lower-case hex', () => {
  const t = byName(designTokens(DESIGN))
  assert.equal(t['--color-primary'].value, '#1f4b8e')
  assert.equal(t['--color-secondary'].value, '#2e7bb8')
  assert.equal(t['--color-accent'].value, '#3fa9a0')
  assert.equal(t['--color-subtle'], undefined, 'a slot the palette does not fill is not invented')
  const six = byName(designTokens({ palette: { colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'] } }))
  assert.equal(six['--color-subtle'].value, '#444444')
  assert.equal(six['--color-deep'].value, '#555555')
  assert.equal(six['--color-alternative-1'].value, '#666666')
  assert.equal(six['--color-alternative-2'].value, '#777777')
})

test('every palette colour has a 50–950 tint scale from the project tint settings', () => {
  const t = byName(designTokens(DESIGN))
  const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
  for (const role of ['primary', 'secondary', 'accent']) {
    for (const s of steps) assert.match(t[`--color-${role}-${s}`]?.value || '', /^#[0-9a-f]{6}$/, `${role}-${s}`)
  }
  // The ramp of the project's active colour is the ramp the project saved.
  const primary = steps.map((s) => t[`--color-primary-${s}`].value)
  assert.deepEqual(primary, DESIGN.tints.scale.map((h) => h.toLowerCase()))
  // And it runs light to dark.
  const lum = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
  for (let i = 1; i < primary.length; i++) assert.ok(lum(primary[i]) <= lum(primary[i - 1]), `step ${steps[i]} is lighter than ${steps[i - 1]}`)
})

test('semantic colours: four roles, 50–900, purple Information, no pending', () => {
  const t = byName(designTokens(DESIGN))
  const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  steps.forEach((s, i) => {
    assert.equal(t[`--color-success-${s}`].value, STATE_PRESETS.success[1].shades[i].toLowerCase())
    assert.equal(t[`--color-warning-${s}`].value, STATE_PRESETS.warning[0].shades[i].toLowerCase())
    assert.equal(t[`--color-info-${s}`].value, INFO_PURPLE[2].shades[i].toLowerCase())
    assert.match(t[`--color-error-${s}`].value, /^#[0-9a-f]{6}$/)
  })
  assert.ok(!Object.keys(t).some((n) => /pending/.test(n)), 'pending is not a semantic state')
  // Blue is the default family.
  const blue = byName(designTokens({ ...DESIGN, states: { info: 2 } }))
  assert.equal(blue['--color-info-500'].value, STATE_PRESETS.info[2].shades[5].toLowerCase())
})

test('type: families, weights, the ladder, line heights and letter spacing', () => {
  const t = byName(designTokens(DESIGN))
  assert.deepEqual(t['--font-heading'].value, ['Space Grotesk', 'system-ui', 'sans-serif'])
  assert.deepEqual(t['--font-body'].value, ['Lora', 'serif'])
  assert.equal(t['--font-weight-heading'].value, 600)
  assert.equal(t['--font-weight-body'].value, 400)
  const px = (n) => t[n].value.value
  assert.equal(px('--font-size-base'), 16)
  assert.equal(px('--font-size-display'), 48.8)
  assert.equal(px('--font-size-heading-1'), 39.1)
  assert.equal(px('--font-size-heading-2'), 31.3)
  assert.equal(px('--font-size-heading-3'), 25)
  assert.equal(px('--font-size-lead'), 20)
  assert.equal(px('--font-size-body'), 16)
  assert.equal(px('--font-size-small'), 12.8)
  assert.equal(px('--font-size-caption'), 10.2)
  assert.equal(t['--type-ratio'].value, 1.25)
  assert.equal(t['--line-height-body'].value, 1.6)
  assert.equal(t['--line-height-heading'].value, 1.1)
  assert.equal(t['--letter-spacing-heading'].value, -0.02)
  assert.equal(t['--letter-spacing-body'].value, 0)
})

test('the gradient resolves a null stop against the palette', () => {
  const t = byName(designTokens(DESIGN))
  assert.deepEqual(t['--gradient-brand'].value.stops, [
    { color: '#1f4b8e', position: 0 },
    { color: '#2e7bb8', position: 100 },
  ])
  assert.equal(byName(designTokens({ palette: { colors: ['#111111'] } }))['--gradient-brand'], undefined,
    'no gradient is invented when the stops cannot resolve to two colours')
})

/* ── snapshot: a small palette and its type scale ───────────────────────── */

test('snapshot: one colour on the default design', () => {
  const css = buildTokensCss({ ...DEFAULT_DESIGN, palette: { ...DEFAULT_DESIGN.palette, colors: ['#0051FF'] } },
    { projectName: 'Snap', watermark: false, date: AT })
  const pick = (re) => css.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('--') && re.test(l))
  assert.deepEqual(pick(/^--color-primary(-\d+)?:/), [
    '--color-primary: #0051ff;',
    '--color-primary-50: #bac9e8;',
    '--color-primary-100: #85abff;',
    '--color-primary-200: #6193ff;',
    '--color-primary-300: #427eff;',
    '--color-primary-400: #2066fe;',
    '--color-primary-500: #0452fb;',
    '--color-primary-600: #0544cc;',
    '--color-primary-700: #063499;',
    '--color-primary-800: #04256c;',
    '--color-primary-900: #03153a;',
    '--color-primary-950: #04060b;',
  ])
  // The roles that match a palette colour point at it.
  assert.deepEqual(pick(/^--color-(on-surface|primary-hover):/), [
    '--color-on-surface: var(--color-primary-950);',
    '--color-primary-hover: var(--color-primary-600);',
  ])
  assert.deepEqual(pick(/--font-size-|--type-ratio|--line-height/), [
    '--font-size-base: 1rem; /* 16px */',
    '--font-size-display: 3.05rem; /* 48.8px */',
    '--font-size-heading-1: 2.44375rem; /* 39.1px */',
    '--font-size-heading-2: 1.95625rem; /* 31.3px */',
    '--font-size-heading-3: 1.5625rem; /* 25px */',
    '--font-size-lead: 1.25rem; /* 20px */',
    '--font-size-body: 1rem; /* 16px */',
    '--font-size-small: 0.8rem; /* 12.8px */',
    '--font-size-caption: 0.6375rem; /* 10.2px */',
    '--type-ratio: 1.25;',
    '--line-height-body: 1.5;',
    '--line-height-heading: 1.1;',
  ])
})

/* ── the CSS file ───────────────────────────────────────────────────────── */

test('the CSS parses, holds one :root rule of unique custom properties, then the text styles, and documents its naming', () => {
  const css = buildTokensCss(DESIGN, { projectName: 'Harbour', watermark: false, date: AT })
  const root = postcss.parse(css)
  const rules = []
  root.walkRules((r) => rules.push(r))
  assert.equal(rules[0].selector, ':root')
  assert.ok(rules.slice(1).every((r) => /^\.text-[a-z0-9-]+$/.test(r.selector)), 'every other rule is a text style')
  const props = []
  rules[0].walkDecls((d) => props.push(d.prop))
  assert.ok(props.length > 60, `only ${props.length} properties`)
  assert.ok(props.every((p) => /^--[a-z0-9-]+$/.test(p)), 'every declaration is a custom property')
  assert.equal(new Set(props).size, props.length, 'no property is declared twice')
  const header = root.first
  assert.equal(header.type, 'comment')
  assert.match(header.text, /Harbour/)
  assert.match(header.text, /--color-<role>-<step>/)
  assert.match(header.text, /--color-success/)
  assert.match(header.text, /--font-size-/)
  for (const name of ['--color-on-surface-muted', '--color-primary-hover', '--color-on-disabled', '.text-<step>', 'lower-case hex', 'rem']) {
    assert.ok(header.text.includes(name), `the legend names ${name}`)
  }
  assert.doesNotMatch(css, /undefined|NaN|\[object/)
})

test('the free file carries the credit line at its foot; the Pro file does not', () => {
  const free = buildTokensCss(DESIGN, { projectName: 'Harbour', watermark: true, date: AT })
  const pro = buildTokensCss(DESIGN, { projectName: 'Harbour', watermark: false, date: AT })
  assert.match(free.trim().split('\n').pop(), /Made with UIL4B/)
  assert.doesNotMatch(pro, /Made with UIL4B/)
  assert.match(buildTokensJson(DESIGN, { projectName: 'Harbour', watermark: true }), /Made with UIL4B/)
  assert.doesNotMatch(buildTokensJson(DESIGN, { projectName: 'Harbour', watermark: false }), /Made with UIL4B/)
})

test('a project name cannot close the header comment', () => {
  const css = buildTokensCss(DESIGN, { projectName: 'Evil */ :root{--x:1} /*', watermark: false, date: AT })
  const rules = []
  postcss.parse(css).walkRules((r) => rules.push(r.selector))
  assert.deepEqual(rules.filter((r) => !r.startsWith('.text-')), [':root'])
})

/* ── the JSON file: DTCG 2025.10 structure ──────────────────────────────── */

const TYPES = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'number', 'gradient', 'typography'])
const GROUP_KEYS = new Set(['$description', '$extensions', '$type'])

function checkColor(v, where) {
  assert.equal(typeof v, 'object', `${where}: colour value is an object`)
  assert.equal(v.colorSpace, 'srgb', `${where}: colorSpace`)
  assert.ok(Array.isArray(v.components) && v.components.length === 3, `${where}: three components`)
  v.components.forEach((c) => assert.ok(typeof c === 'number' && c >= 0 && c <= 1, `${where}: component ${c}`))
  assert.match(v.hex, /^#[0-9a-f]{6}$/, `${where}: hex is lower case`)
  const back = v.components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
  assert.equal(`#${back}`, v.hex, `${where}: components and hex agree`)
}

const isAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v)

/** The token a DTCG reference points at (a group with a $root resolves to it). */
function resolveRef(doc, ref) {
  let node = doc
  for (const seg of ref.slice(1, -1).split('.')) node = node?.[seg]
  if (node && !Object.prototype.hasOwnProperty.call(node, '$value') && node.$root) node = node.$root
  return node
}

/** A token's value with every reference followed, a composite's members included. */
function resolveValue(doc, node) {
  let v = node.$value
  while (isAlias(v)) v = resolveRef(doc, v).$value
  if (node.$type === 'typography') {
    v = Object.fromEntries(Object.entries(v).map(([k, m]) => [k, isAlias(m) ? resolveValue(doc, resolveRef(doc, m)) : m]))
  }
  return v
}

function checkToken(node, where, doc) {
  assert.ok(TYPES.has(node.$type), `${where}: $type ${node.$type}`)
  for (const k of Object.keys(node)) {
    assert.ok(['$value', '$type', '$description', '$extensions'].includes(k), `${where}: a token holds no child "${k}"`)
  }
  if (isAlias(node.$value)) {
    const target = resolveRef(doc, node.$value)
    assert.ok(target && Object.prototype.hasOwnProperty.call(target, '$value'), `${where}: ${node.$value} points at a token`)
    assert.equal(target.$type, node.$type, `${where}: an alias keeps its target's type`)
    return
  }
  const v = node.$value
  switch (node.$type) {
    case 'color': checkColor(v, where); break
    case 'dimension':
      assert.equal(typeof v.value, 'number', `${where}: dimension value`)
      assert.ok(['px', 'rem'].includes(v.unit), `${where}: dimension unit ${v.unit}`)
      break
    case 'fontFamily':
      assert.ok(typeof v === 'string' || (Array.isArray(v) && v.every((f) => typeof f === 'string')), where)
      break
    case 'fontWeight': assert.ok(Number.isInteger(v) && v >= 1 && v <= 1000, where); break
    case 'number': assert.equal(typeof v, 'number', where); break
    case 'typography':
      assert.deepEqual(Object.keys(v).sort(), ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'], where)
      break
    case 'gradient':
      assert.ok(Array.isArray(v) && v.length >= 2, where)
      v.forEach((s) => { checkColor(s.color, where); assert.ok(s.position >= 0 && s.position <= 1, where) })
      break
    default: assert.fail(where)
  }
}

function walk(node, where, visit) {
  if (Object.prototype.hasOwnProperty.call(node, '$value')) { visit(node, where); return }
  for (const [key, child] of Object.entries(node)) {
    if (GROUP_KEYS.has(key)) continue
    if (key !== '$root') {
      assert.ok(!key.startsWith('$'), `${where}.${key}: names may not start with $`)
      assert.ok(!/[.{}]/.test(key), `${where}.${key}: names may not contain . { }`)
    }
    assert.equal(typeof child, 'object', `${where}.${key}`)
    if (key === '$root') assert.ok(Object.prototype.hasOwnProperty.call(child, '$value'), `${where}.$root is a token`)
    walk(child, `${where}.${key}`, visit)
  }
}

test('the JSON is DTCG: every node a group or a typed token, values in the spec shapes', () => {
  const doc = JSON.parse(buildTokensJson(DESIGN, { projectName: 'Harbour', watermark: false }))
  assert.match(doc.$description, /Harbour/)
  let count = 0
  walk(doc, 'root', (node, where) => { checkToken(node, where, doc); count += 1 })
  assert.ok(count > 60, `only ${count} tokens`)
  assert.ok(doc.color.primary.$root, 'the palette colour is the root token of its tint group')
  assert.ok(doc.color.primary['500'], 'and its tints sit beside it')
})

/* ── the two files agree ────────────────────────────────────────────────── */

/** The CSS declarations and a flat map of the JSON's tokens, both by CSS name. */
function bothFiles(design) {
  const css = buildTokensCss(design, { projectName: 'Harbour', watermark: false, date: AT })
  const decls = {}
  postcss.parse(css).walkDecls((d) => { if (d.prop.startsWith('--')) decls[d.prop] = d.value })
  const doc = JSON.parse(buildTokensJson(design, { projectName: 'Harbour', watermark: false }))
  const tokens = {}
  const flatten = (node, path) => {
    if (Object.prototype.hasOwnProperty.call(node, '$value')) {
      tokens[`--${path.filter((p) => p !== '$root').join('-')}`] = node
      return
    }
    for (const [k, child] of Object.entries(node)) if (!GROUP_KEYS.has(k)) flatten(child, [...path, k])
  }
  flatten(doc, [])
  return { css, decls, doc, tokens }
}

/** What the CSS holds for a JSON token, references followed: the value as CSS writes it. */
function expectedCss(doc, name, node) {
  const v = resolveValue(doc, node)
  switch (node.$type) {
    case 'color': return v.hex
    case 'dimension': return name.startsWith('--font-size-') ? remOf(v.value) : `${v.value}${v.unit}`
    case 'fontFamily': return (Array.isArray(v) ? v : [v]).map((f, i) => (i === 0 ? `"${f}"` : f)).join(', ')
    default: return name.startsWith('--letter-spacing') ? `${v}em` : String(v)
  }
}

test('round trip: the CSS names are the JSON paths, and the values match', () => {
  const { decls, doc, tokens } = bothFiles(DESIGN)
  // The typography composites are the JSON's own: the CSS carries them as .text-<step> classes.
  const flat = Object.fromEntries(Object.entries(tokens).filter(([, n]) => n.$type !== 'typography'))
  assert.deepEqual(Object.keys(decls).sort(), Object.keys(flat).sort(), 'the same token set in both files')
  for (const [name, token] of Object.entries(flat)) {
    if (token.$type === 'gradient') {
      const stops = token.$value.map((s) => ({ color: s.color.hex, position: Math.round(s.position * 100) }))
      const ext = token.$extensions['com.uil4b']
      assert.equal(decls[name], gradientCss(ext.type, ext.angle, stops).replace(/#[0-9A-F]{6}/g, (m) => m.toLowerCase()))
    } else if (isAlias(token.$value)) {
      assert.equal(decls[name], `var(--${token.$value.slice(1, -1).replace(/\./g, '-')})`, `${name} aliases the same token in both files`)
    } else {
      assert.equal(decls[name], expectedCss(doc, name, token), name)
    }
  }
})

test('the CSS, JSON and Tailwind files expose the same colours, fonts and sizes', () => {
  const { decls, doc, tokens } = bothFiles(DESIGN)
  const tw = Object.fromEntries(tailwindVars(DESIGN))
  // A CSS value with var() followed, the way a browser resolves it.
  const resolved = (name) => {
    let v = decls[name]
    while (/^var\(--[\w-]+\)$/.test(v)) v = decls[v.slice(4, -1)]
    return v
  }
  const colours = Object.keys(decls).filter((n) => n.startsWith('--color-'))
  assert.ok(colours.length > 50)
  assert.deepEqual(Object.keys(tw).filter((n) => n.startsWith('--color-')), colours, 'Tailwind has every colour the CSS has, in the same order')
  for (const n of colours) {
    assert.equal(tw[n], resolved(n), `${n}: Tailwind holds the value the CSS resolves to`)
    assert.equal(resolveValue(doc, tokens[n]).hex, resolved(n), `${n}: JSON holds the value the CSS resolves to`)
  }
  for (const face of ['heading', 'body']) assert.equal(tw[`--font-${face}`], decls[`--font-${face}`], `--font-${face}`)
  const sizes = Object.entries(tokens).filter(([n]) => n.startsWith('--font-size-') && n !== '--font-size-base')
  assert.equal(sizes.length, 8)
  for (const [name, node] of sizes) {
    const step = name.slice('--font-size-'.length)
    assert.equal(tw[`--text-${step}`], decls[name], `${step}: the same rem in Tailwind and CSS`)
    assert.equal(remOf(node.$value.value), decls[name], `${step}: and in JSON`)
  }
  for (const kind of ['heading', 'body']) {
    assert.equal(tw[`--leading-${kind}`], decls[`--line-height-${kind}`])
    assert.equal(tw[`--tracking-${kind}`], decls[`--letter-spacing-${kind}`])
  }
})

/* ── interface roles ─────────────────────────────────────────────────────── */

// Five colours, so the canvas and the ink are the palette's own (subtle and deep).
const FIVE = { ...DESIGN, palette: { colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#F4F1EA', '#1B2433'] } }
const ROLES = [
  '--color-background', '--color-surface', '--color-on-surface', '--color-on-surface-muted', '--color-border',
  '--color-primary-hover', '--color-on-primary', '--color-focus', '--color-disabled', '--color-on-disabled',
]

test('role tokens: the ten names, lower-case hex, and none of the old kit names', () => {
  const t = byName(designTokens(FIVE))
  for (const n of ROLES) {
    assert.equal(t[n]?.type, 'color', n)
    assert.match(t[n].value, /^#[0-9a-f]{6}$/, n)
  }
  for (const old of ['--color-text', '--color-text-muted', '--color-disabled-background', '--color-disabled-text']) {
    assert.equal(t[old], undefined, `${old} was renamed`)
  }
  assert.equal(t['--color-surface'].value, '#ffffff')
})

test('a role is an alias exactly when a palette, semantic or tint token has the same value', () => {
  const tokens = designTokens(FIVE)
  const t = byName(tokens)
  const roleSet = new Set(ROLES)
  const others = new Map()
  for (const k of tokens) if (k.type === 'color' && !roleSet.has(cssVarName(k.path))) others.set(k.value, k.path)
  for (const n of ROLES) {
    const role = t[n]
    if (role.alias) {
      assert.equal(byName(tokens)[cssVarName(role.alias)].value, role.value, `${n} takes its target's value`)
      assert.ok(!roleSet.has(cssVarName(role.alias)), `${n} points at a palette, semantic or tint token`)
    } else {
      assert.equal(others.has(role.value), false, `${n} is a literal, so no token holds ${role.value}`)
    }
  }
  // The five-colour palette gives the canvas and the ink; the primary's own 600 is the hover.
  assert.deepEqual(t['--color-background'].alias, ['color', 'subtle', '$root'])
  assert.deepEqual(t['--color-on-surface'].alias, ['color', 'deep', '$root'])
  assert.deepEqual(t['--color-primary-hover'].alias, ['color', 'primary', '600'])
  assert.deepEqual(t['--color-focus'].alias?.slice(0, 2), ['color', 'info'])
  assert.equal(t['--color-surface'].alias, undefined)
  assert.equal(t['--color-border'].alias, undefined)
})

test('roles are var() aliases in the CSS and {color.…} references in the JSON', () => {
  const { decls, doc } = bothFiles(FIVE)
  assert.equal(decls['--color-background'], 'var(--color-subtle)')
  assert.equal(decls['--color-on-surface'], 'var(--color-deep)')
  assert.equal(decls['--color-primary-hover'], 'var(--color-primary-600)')
  assert.match(decls['--color-surface'], /^#[0-9a-f]{6}$/)
  assert.equal(doc.color.background.$value, '{color.subtle}')
  assert.equal(doc.color['on-surface'].$root.$value, '{color.deep}')
  assert.equal(doc.color.primary.hover.$value, '{color.primary.600}')
  assert.equal(doc.color.surface.$value.hex, '#ffffff')
  assert.equal(typeof doc.color['on-surface'].muted.$value, 'object', 'a muted ink that matches no token is a literal colour')
  for (const n of ROLES) {
    const node = n === '--color-on-surface' ? doc.color['on-surface'].$root
      : n === '--color-on-surface-muted' ? doc.color['on-surface'].muted
        : n === '--color-primary-hover' ? doc.color.primary.hover : doc.color[n.slice('--color-'.length)]
    assert.equal(node.$type, 'color', n)
  }
})

test('a palette of one colour still gets every role, and a design with no palette gets none', () => {
  const one = byName(designTokens({ palette: { colors: ['#0051FF'] } }))
  for (const n of ROLES) assert.ok(one[n], n)
  const none = designTokens({ palette: { colors: [] } })
  assert.ok(!none.some((k) => ROLES.includes(cssVarName(k.path))), 'no colour is invented without a palette')
})

/* ── DTCG 2025.10 shapes, against the examples in the hand-off spec ──────── */

// design-2026-10-30-export-outputs-premium.md, section 10.1: "Minimal valid example".
const SPEC = {
  color: { components: [0, 0.4, 0.8], hex: '#0066cc' },
  typography: {
    fontFamily: 'Roboto', fontSize: { value: 42, unit: 'px' }, fontWeight: 700,
    letterSpacing: { value: 0, unit: 'px' }, lineHeight: 1.2,
  },
}

test('DTCG: a colour is { colorSpace, components, hex }, as in the spec example', () => {
  const doc = JSON.parse(buildTokensJson({ palette: { colors: ['#0066CC'] } }, { watermark: false }))
  assert.deepEqual(doc.color.primary.$root.$value, { colorSpace: 'srgb', ...SPEC.color })
  assert.deepEqual(Object.keys(doc.color.primary.$root.$value), ['colorSpace', 'components', 'hex'])
})

test('DTCG: a dimension is { value, unit } in px, as in the spec example', () => {
  const doc = JSON.parse(buildTokensJson(DESIGN, { watermark: false }))
  assert.deepEqual(doc.font.size.base.$value, { value: 16, unit: 'px' })
  assert.deepEqual(Object.keys(SPEC.typography.fontSize), Object.keys(doc.font.size['heading-1'].$value))
  assert.equal(doc.font.size['heading-1'].$type, 'dimension')
})

test('DTCG: each type step is a typography composite with the spec example\'s members and shapes', () => {
  const doc = JSON.parse(buildTokensJson(DESIGN, { watermark: false }))
  const steps = ['display', 'heading-1', 'heading-2', 'heading-3', 'lead', 'body', 'small', 'caption']
  assert.deepEqual(Object.keys(doc.type).filter((k) => k !== 'ratio'), steps)
  for (const step of steps) {
    const node = doc.type[step]
    assert.equal(node.$type, 'typography', step)
    assert.deepEqual(Object.keys(node.$value).sort(), Object.keys(SPEC.typography).sort(), `${step}: the example's members`)
    const v = resolveValue(doc, node)
    const family = Array.isArray(v.fontFamily) ? v.fontFamily : [v.fontFamily]
    assert.ok(family.length >= 1 && family.every((f) => typeof f === 'string'), `${step}: fontFamily`)
    assert.deepEqual(Object.keys(v.fontSize), Object.keys(SPEC.typography.fontSize), `${step}: fontSize is a dimension`)
    assert.equal(v.fontSize.unit, 'px')
    assert.ok(Number.isInteger(v.fontWeight) && v.fontWeight >= 1 && v.fontWeight <= 1000, `${step}: fontWeight`)
    assert.deepEqual(Object.keys(v.letterSpacing), Object.keys(SPEC.typography.letterSpacing), `${step}: letterSpacing is a dimension`)
    assert.equal(v.letterSpacing.unit, 'px')
    assert.equal(typeof v.lineHeight, 'number', `${step}: lineHeight is a multiplier`)
  }
})

test('DTCG: composites alias the font, weight, size and line-height tokens; letter spacing is px = em x size', () => {
  const doc = JSON.parse(buildTokensJson(DESIGN, { watermark: false }))
  assert.equal(doc.type['heading-1'].$value.fontFamily, '{font.heading}')
  assert.equal(doc.type['heading-1'].$value.fontWeight, '{font.weight.heading}')
  assert.equal(doc.type['heading-1'].$value.fontSize, '{font.size.heading-1}')
  assert.equal(doc.type['heading-1'].$value.lineHeight, '{line-height.heading}')
  assert.equal(doc.type.body.$value.fontFamily, '{font.body}')
  assert.equal(doc.type.body.$value.fontWeight, '{font.weight.body}')
  assert.equal(doc.type.body.$value.lineHeight, '{line-height.body}')
  // Heading spacing is -0.02em in DESIGN; the body's is 0.
  assert.deepEqual(doc.type.display.$value.letterSpacing, { value: -0.976, unit: 'px' })
  assert.deepEqual(doc.type['heading-1'].$value.letterSpacing, { value: -0.782, unit: 'px' })
  assert.deepEqual(doc.type.body.$value.letterSpacing, { value: 0, unit: 'px' })
  assert.equal(Object.is(doc.type.body.$value.letterSpacing.value, -0), false)
})

test('DTCG: a standalone letter spacing is a number token that records its em unit', () => {
  const doc = JSON.parse(buildTokensJson(DESIGN, { watermark: false }))
  assert.equal(doc['letter-spacing'].heading.$type, 'number')
  assert.equal(doc['letter-spacing'].heading.$value, -0.02)
  assert.deepEqual(doc['letter-spacing'].heading.$extensions, { 'com.uil4b': { unit: 'em' } })
  assert.equal(doc['letter-spacing'].body.$extensions['com.uil4b'].unit, 'em')
})

/* ── CSS: rem sizes and text styles ──────────────────────────────────────── */

test('CSS: type sizes are rem with the px value in a comment', () => {
  const css = buildTokensCss(DESIGN, { watermark: false, date: AT })
  assert.match(css, /--font-size-base: 1rem; \/\* 16px \*\//)
  assert.match(css, /--font-size-heading-1: 2\.44375rem; \/\* 39\.1px \*\//)
  assert.match(css, /--font-size-caption: 0\.6375rem; \/\* 10\.2px \*\//)
  assert.doesNotMatch(css, /--font-size-[\w-]+: [\d.]+px/)
  assert.doesNotMatch(css, /^\s*--[\w-]+: #[0-9a-f]*[A-F]/m, 'hex is lower case in every declaration')
})

test('CSS: a .text-<step> class per type step, built from variables the file declares', () => {
  const css = buildTokensCss(DESIGN, { watermark: false, date: AT })
  const root = postcss.parse(css)
  const declared = new Set()
  const classes = {}
  root.walkRules((r) => {
    if (r.selector === ':root') r.walkDecls((d) => declared.add(d.prop))
    else {
      classes[r.selector] = {}
      r.walkDecls((d) => { classes[r.selector][d.prop] = d.value })
    }
  })
  assert.deepEqual(Object.keys(classes), ['display', 'heading-1', 'heading-2', 'heading-3', 'lead', 'body', 'small', 'caption'].map((n) => `.text-${n}`))
  for (const [sel, decls] of Object.entries(classes)) {
    assert.deepEqual(Object.keys(decls), ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'], sel)
    for (const [prop, value] of Object.entries(decls)) {
      const m = /^var\((--[\w-]+)\)$/.exec(value)
      assert.ok(m && declared.has(m[1]), `${sel} ${prop}: ${value} is a variable the file declares`)
    }
  }
  assert.equal(classes['.text-heading-1']['font-size'], 'var(--font-size-heading-1)')
  assert.equal(classes['.text-heading-1']['font-family'], 'var(--font-heading)')
  assert.equal(classes['.text-body']['font-family'], 'var(--font-body)')
  assert.equal(classes['.text-body']['letter-spacing'], 'var(--letter-spacing-body)')
})

/* ── robustness ─────────────────────────────────────────────────────────── */

test('an empty or broken design still produces valid files', () => {
  for (const d of [undefined, {}, { palette: { colors: ['nope', null] }, typeScale: { base: 'x', ratio: 0 }, states: { success: 99, info: { custom: 'blue' } } }]) {
    const css = buildTokensCss(d, { projectName: 'Empty', watermark: true, date: AT })
    assert.doesNotThrow(() => postcss.parse(css))
    assert.doesNotMatch(css, /undefined|NaN|null|\[object/)
    const json = buildTokensJson(d, { projectName: 'Empty', watermark: true })
    const parsed = JSON.parse(json)
    walk(parsed, 'root', (node, where) => checkToken(node, where, parsed))
    assert.doesNotMatch(json, /undefined|NaN|\[object/)
  }
})
