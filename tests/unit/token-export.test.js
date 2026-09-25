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
  designTokens, buildTokensCss, buildTokensJson, cssVarName,
} from '../../src/utils/designTokens.js'
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

test('palette colours use the stable slot names, upper-case hex', () => {
  const t = byName(designTokens(DESIGN))
  assert.equal(t['--color-primary'].value, '#1F4B8E')
  assert.equal(t['--color-secondary'].value, '#2E7BB8')
  assert.equal(t['--color-accent'].value, '#3FA9A0')
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
    for (const s of steps) assert.match(t[`--color-${role}-${s}`]?.value || '', /^#[0-9A-F]{6}$/, `${role}-${s}`)
  }
  // The ramp of the project's active colour is the ramp the project saved.
  const primary = steps.map((s) => t[`--color-primary-${s}`].value)
  assert.deepEqual(primary, DESIGN.tints.scale.map((h) => h.toUpperCase()))
  // And it runs light to dark.
  const lum = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
  for (let i = 1; i < primary.length; i++) assert.ok(lum(primary[i]) <= lum(primary[i - 1]), `step ${steps[i]} is lighter than ${steps[i - 1]}`)
})

test('semantic colours: four roles, 50–900, purple Information, no pending', () => {
  const t = byName(designTokens(DESIGN))
  const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  steps.forEach((s, i) => {
    assert.equal(t[`--color-success-${s}`].value, STATE_PRESETS.success[1].shades[i].toUpperCase())
    assert.equal(t[`--color-warning-${s}`].value, STATE_PRESETS.warning[0].shades[i].toUpperCase())
    assert.equal(t[`--color-info-${s}`].value, INFO_PURPLE[2].shades[i].toUpperCase())
    assert.match(t[`--color-error-${s}`].value, /^#[0-9A-F]{6}$/)
  })
  assert.ok(!Object.keys(t).some((n) => /pending/.test(n)), 'pending is not a semantic state')
  // Blue is the default family.
  const blue = byName(designTokens({ ...DESIGN, states: { info: 2 } }))
  assert.equal(blue['--color-info-500'].value, STATE_PRESETS.info[2].shades[5].toUpperCase())
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
    { color: '#1F4B8E', position: 0 },
    { color: '#2E7BB8', position: 100 },
  ])
  assert.equal(byName(designTokens({ palette: { colors: ['#111111'] } }))['--gradient-brand'], undefined,
    'no gradient is invented when the stops cannot resolve to two colours')
})

/* ── snapshot: a small palette and its type scale ───────────────────────── */

test('snapshot: one colour on the default design', () => {
  const css = buildTokensCss({ ...DEFAULT_DESIGN, palette: { ...DEFAULT_DESIGN.palette, colors: ['#0051FF'] } },
    { projectName: 'Snap', watermark: false, date: AT })
  const pick = (re) => css.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('--') && re.test(l))
  assert.deepEqual(pick(/--color-primary/), [
    '--color-primary: #0051FF;',
    '--color-primary-50: #BAC9E8;',
    '--color-primary-100: #85ABFF;',
    '--color-primary-200: #6193FF;',
    '--color-primary-300: #427EFF;',
    '--color-primary-400: #2066FE;',
    '--color-primary-500: #0452FB;',
    '--color-primary-600: #0544CC;',
    '--color-primary-700: #063499;',
    '--color-primary-800: #04256C;',
    '--color-primary-900: #03153A;',
    '--color-primary-950: #04060B;',
  ])
  assert.deepEqual(pick(/--font-size-|--type-ratio|--line-height/), [
    '--font-size-base: 16px;',
    '--font-size-display: 48.8px;',
    '--font-size-heading-1: 39.1px;',
    '--font-size-heading-2: 31.3px;',
    '--font-size-heading-3: 25px;',
    '--font-size-lead: 20px;',
    '--font-size-body: 16px;',
    '--font-size-small: 12.8px;',
    '--font-size-caption: 10.2px;',
    '--type-ratio: 1.25;',
    '--line-height-body: 1.5;',
    '--line-height-heading: 1.1;',
  ])
})

/* ── the CSS file ───────────────────────────────────────────────────────── */

test('the CSS parses, holds one :root rule of unique custom properties, and documents its naming', () => {
  const css = buildTokensCss(DESIGN, { projectName: 'Harbour', watermark: false, date: AT })
  const root = postcss.parse(css)
  const rules = []
  root.walkRules((r) => rules.push(r))
  assert.equal(rules.length, 1)
  assert.equal(rules[0].selector, ':root')
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
  assert.deepEqual(rules, [':root'])
})

/* ── the JSON file: DTCG 2025.10 structure ──────────────────────────────── */

const TYPES = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'number', 'gradient'])
const GROUP_KEYS = new Set(['$description', '$extensions', '$type'])

function checkColor(v, where) {
  assert.equal(typeof v, 'object', `${where}: colour value is an object`)
  assert.equal(v.colorSpace, 'srgb', `${where}: colorSpace`)
  assert.ok(Array.isArray(v.components) && v.components.length === 3, `${where}: three components`)
  v.components.forEach((c) => assert.ok(typeof c === 'number' && c >= 0 && c <= 1, `${where}: component ${c}`))
  assert.match(v.hex, /^#[0-9A-Fa-f]{6}$/, `${where}: hex`)
  const back = v.components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
  assert.equal(`#${back}`.toUpperCase(), v.hex.toUpperCase(), `${where}: components and hex agree`)
}

function checkToken(node, where) {
  assert.ok(TYPES.has(node.$type), `${where}: $type ${node.$type}`)
  for (const k of Object.keys(node)) {
    assert.ok(['$value', '$type', '$description', '$extensions'].includes(k), `${where}: a token holds no child "${k}"`)
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
  walk(doc, 'root', (node, where) => { checkToken(node, where); count += 1 })
  assert.ok(count > 60, `only ${count} tokens`)
  assert.ok(doc.color.primary.$root, 'the palette colour is the root token of its tint group')
  assert.ok(doc.color.primary['500'], 'and its tints sit beside it')
})

/* ── the two files agree ────────────────────────────────────────────────── */

const cssValueOf = (type, v) => {
  switch (type) {
    case 'color': return v.hex
    case 'dimension': return `${v.value}${v.unit}`
    case 'fontFamily': return (Array.isArray(v) ? v : [v]).map((f, i) => (i === 0 ? `"${f}"` : f)).join(', ')
    case 'gradient': return null
    default: return String(v)
  }
}

test('round trip: the CSS names are the JSON paths, and the values match', () => {
  const css = buildTokensCss(DESIGN, { projectName: 'Harbour', watermark: false, date: AT })
  const decls = {}
  postcss.parse(css).walkDecls((d) => { decls[d.prop] = d.value })

  const doc = JSON.parse(buildTokensJson(DESIGN, { projectName: 'Harbour', watermark: false }))
  const fromJson = {}
  const flatten = (node, path) => {
    if (Object.prototype.hasOwnProperty.call(node, '$value')) {
      fromJson[`--${path.filter((p) => p !== '$root').join('-')}`] = node
      return
    }
    for (const [k, child] of Object.entries(node)) if (!GROUP_KEYS.has(k)) flatten(child, [...path, k])
  }
  flatten(doc, [])

  assert.deepEqual(Object.keys(decls).sort(), Object.keys(fromJson).sort(), 'the same token set in both files')
  for (const [name, token] of Object.entries(fromJson)) {
    const expected = cssValueOf(token.$type, token.$value)
    if (token.$type === 'gradient') {
      const stops = token.$value.map((s) => ({ color: s.color.hex, position: Math.round(s.position * 100) }))
      assert.equal(decls[name], gradientCss(token.$extensions['com.uil4b'].type, token.$extensions['com.uil4b'].angle, stops))
    } else if (name.startsWith('--letter-spacing')) {
      assert.equal(decls[name], `${token.$value}em`, name)
    } else {
      assert.equal(decls[name], expected, name)
    }
  }
})

/* ── robustness ─────────────────────────────────────────────────────────── */

test('an empty or broken design still produces valid files', () => {
  for (const d of [undefined, {}, { palette: { colors: ['nope', null] }, typeScale: { base: 'x', ratio: 0 }, states: { success: 99, info: { custom: 'blue' } } }]) {
    const css = buildTokensCss(d, { projectName: 'Empty', watermark: true, date: AT })
    assert.doesNotThrow(() => postcss.parse(css))
    assert.doesNotMatch(css, /undefined|NaN|null|\[object/)
    const json = buildTokensJson(d, { projectName: 'Empty', watermark: true })
    walk(JSON.parse(json), 'root', checkToken)
    assert.doesNotMatch(json, /undefined|NaN|\[object/)
  }
})
