// The Figma variable files: one primitives file, one semantic file per mode.
// Figma makes a mode from each file, so the two semantic files must have the same
// names, and every alias must name a variable that the primitives file holds.
import test from 'node:test'
import assert from 'node:assert/strict'
import { figmaTokenFiles } from '../../src/utils/figmaTokens.js'

const DESIGN = {
  palette: { base: '#1F4B8E', harmony: 'analogous', activeIdx: 0, colors: ['#1f4b8e', '#2E7BB8', '#3FA9A0'] },
  states: { success: 1, warning: 0, error: 1, info: 2 },
  gradient: { stops: [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }], angle: 90, type: 'Linear' },
  fonts: { heading: { family: 'Space Grotesk', weight: 600, category: 'sans-serif' }, body: { family: 'Lora', weight: 400, category: 'serif' } },
}

const SEMANTIC_KEYS = [
  'background/default', 'surface/default', 'on-surface/default', 'on-surface/muted', 'border/default',
  'primary/default', 'primary/hover', 'on-primary/default', 'focus/default', 'disabled/default', 'on-disabled/default',
]

const parse = (design = DESIGN) => {
  const files = figmaTokenFiles(design)
  return {
    names: files.map((f) => f.name),
    prim: JSON.parse(files[0].text),
    light: JSON.parse(files[1].text),
    dark: JSON.parse(files[2].text),
    texts: files.map((f) => f.text),
  }
}

/** Every token in a document as [slash name, token]. */
function leaves(node, prefix = []) {
  if (Object.prototype.hasOwnProperty.call(node, '$value')) return [[prefix.join('/'), node]]
  return Object.entries(node).flatMap(([k, v]) => (k.startsWith('$') ? [] : leaves(v, [...prefix, k])))
}

const hexOf = (token) => token.$value.hex

test('three files, named for the Figma import order', () => {
  assert.deepEqual(parse().names, ['1-primitives.tokens.json', '2-semantic.light.tokens.json', '2-semantic.dark.tokens.json'])
})

test('every alias names a variable the primitives file holds, in the Primitives set, with the same colour', () => {
  const { prim, light, dark } = parse()
  const primitives = new Map(leaves(prim))
  let aliases = 0
  for (const doc of [light, dark]) {
    for (const [name, token] of leaves(doc)) {
      const alias = token.$extensions?.['com.figma.aliasData']
      if (!alias) continue
      aliases += 1
      assert.equal(alias.targetVariableSetName, 'Primitives', name)
      assert.deepEqual(Object.keys(alias).sort(), ['targetVariableName', 'targetVariableSetName'], 'names only, no ids')
      const target = primitives.get(alias.targetVariableName)
      assert.ok(target, `${name} points at ${alias.targetVariableName}, which is not in the primitives`)
      assert.equal(hexOf(target), hexOf(token), `${name}: the resolved value must be the target's colour`)
    }
  }
  assert.ok(aliases >= 10, `most roles should alias a primitive (found ${aliases})`)
})

test('light and dark have the same variables, with the same types', () => {
  const { light, dark } = parse()
  const a = leaves(light)
  const b = leaves(dark)
  assert.deepEqual(a.map(([n]) => n), b.map(([n]) => n))
  assert.deepEqual(a.map(([n]) => n).sort(), [...SEMANTIC_KEYS].sort())
  assert.deepEqual(a.map(([, t]) => t.$type), b.map(([, t]) => t.$type))
})

test('dark differs from light for the surfaces and the ink on them', () => {
  const { light, dark } = parse()
  const l = new Map(leaves(light))
  const d = new Map(leaves(dark))
  for (const name of ['background/default', 'surface/default', 'on-surface/default', 'on-surface/muted', 'border/default']) {
    assert.notEqual(hexOf(l.get(name)), hexOf(d.get(name)), name)
  }
})

test('primitives: tints nest as role/step, the brand colour is role/base, and white and black exist', () => {
  const { prim } = parse()
  const names = new Set(leaves(prim).map(([n]) => n))
  for (const role of ['primary', 'secondary', 'accent']) {
    assert.ok(names.has(`${role}/base`), `${role}/base`)
    for (const step of ['50', '100', '500', '900', '950']) assert.ok(names.has(`${role}/${step}`), `${role}/${step}`)
  }
  for (const state of ['success', 'warning', 'error', 'info']) assert.ok(names.has(`${state}/500`), `${state}/500`)
  assert.equal(hexOf(prim.primary.base), '#1f4b8e', 'base is the exact brand colour')
  assert.notEqual(hexOf(prim.primary.base), hexOf(prim.primary['500']), 'the brand colour is not the 500 stop')
  assert.equal(hexOf(prim.base.white), '#ffffff')
  assert.equal(hexOf(prim.base.black), '#000000')
})

test('primitives: type values are numbers and single-string families', () => {
  const { prim } = parse()
  assert.deepEqual(prim.font.family.heading, { $type: 'fontFamily', $value: 'Space Grotesk' })
  assert.deepEqual(prim.font.family.body, { $type: 'fontFamily', $value: 'Lora' })
  for (const [name, t] of leaves(prim.font.size).concat(leaves(prim.font.weight), leaves(prim['line-height']))) {
    assert.equal(t.$type, 'number', name)
    assert.equal(typeof t.$value, 'number', name)
  }
  assert.ok(prim.font.size.base && prim.font.size.display && prim.font.weight.heading && prim['line-height'].body)
})

test('nothing Figma drops or misreads: no $root, gradient, typography or array values', () => {
  const { texts, prim, light, dark } = parse()
  for (const text of texts) {
    assert.doesNotMatch(text, /\$root/)
    assert.doesNotMatch(text, /"\$type": "(gradient|typography|dimension|cubicBezier|shadow)"/)
  }
  assert.ok(!('gradient' in prim) && !('type' in prim))
  const allowed = new Set(['color', 'number', 'fontFamily'])
  for (const doc of [prim, light, dark]) {
    for (const [name, t] of leaves(doc)) {
      assert.ok(allowed.has(t.$type), `${name}: ${t.$type}`)
      assert.ok(!Array.isArray(t.$value), `${name}: arrays are rejected by Figma`)
    }
  }
})

test('colours use the DTCG colour object: srgb, three components, hex', () => {
  const { prim } = parse()
  for (const [name, t] of leaves(prim).filter(([, tok]) => tok.$type === 'color')) {
    assert.equal(t.$value.colorSpace, 'srgb', name)
    assert.equal(t.$value.components.length, 3, name)
    assert.match(t.$value.hex, /^#[0-9a-f]{6}$/, name)
  }
})

test('a design with no palette still gives three valid files', () => {
  for (const design of [undefined, {}, { palette: { colors: [] } }]) {
    const { texts } = parse(design)
    assert.equal(texts.length, 3)
    for (const text of texts) assert.doesNotThrow(() => JSON.parse(text))
    assert.doesNotMatch(texts.join(''), /undefined|NaN/)
  }
})
