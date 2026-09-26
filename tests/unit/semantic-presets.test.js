// src/data/semanticPresets.js holds the semantic ramps the token export
// resolves. The Semantic Colour tool (ColorStudio.jsx) resolves the same saved
// selections, so every ramp here must be one the tool offers, in the same
// order within its role — otherwise an exported file would carry colours the
// tool never showed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import {
  STATE_PRESETS, INFO_PURPLE, SEMANTIC_ROLES, resolveStateShades, readSemanticStates, semanticShades,
} from '../../src/data/semanticPresets.js'

const STUDIO = 'src/pages/ColorStudio.jsx'

test('the stripper works, so the source read below can be trusted', () => {
  assertStripperWorks(assert)
})

test('every ramp is one the Semantic Colour tool offers, in the same order', () => {
  const src = stripComments(read(STUDIO))
  if (/from ['"]\.\.\/data\/semanticPresets(\.js)?['"]/.test(src)) return
  const ramps = [...src.matchAll(/shades:\s*\[([^\]]*)\]/g)].map((m) => m[1].replace(/\s+/g, ''))
  assert.ok(ramps.length >= 24, `only ${ramps.length} ramps found in ${STUDIO}`)
  const lists = [...SEMANTIC_ROLES.map((r) => STATE_PRESETS[r]), INFO_PURPLE]
  for (const list of lists) {
    // Searched forward from the previous match: two presets in a role can share
    // a ramp (Tailwind's success is Green's), and order is part of the contract
    // because a saved selection is an index.
    let from = -1
    for (const p of list) {
      const i = ramps.indexOf(p.shades.map((h) => `'${h}'`).join(','), from + 1)
      assert.ok(i > from, `${p.name} (${p.shades[5]}) is not a ramp the tool offers at this position`)
      from = i
    }
  }
})

test('four roles, ten steps each; pending is not one of them', () => {
  assert.deepEqual([...SEMANTIC_ROLES], ['success', 'warning', 'error', 'info'])
  const all = semanticShades({ pending: 2 })
  assert.deepEqual(Object.keys(all), ['success', 'warning', 'error', 'info'])
  for (const r of SEMANTIC_ROLES) assert.equal(all[r].length, 10)
})

test('selections resolve: preset index, custom hue, purple Information, fallbacks', () => {
  assert.deepEqual(resolveStateShades('success', 2), STATE_PRESETS.success[2].shades)
  assert.deepEqual(resolveStateShades('info', 1, 'purple'), INFO_PURPLE[1].shades)
  assert.deepEqual(resolveStateShades('info', 1), STATE_PRESETS.info[1].shades)
  assert.deepEqual(resolveStateShades('warning', 99), STATE_PRESETS.warning[0].shades)
  assert.deepEqual(resolveStateShades('error', 'x'), STATE_PRESETS.error[0].shades)
  const custom = resolveStateShades('success', { custom: 150 })
  assert.equal(custom.length, 10)
  assert.ok(custom.every((h) => /^#[0-9a-f]{6}$/i.test(h)))
  assert.deepEqual(readSemanticStates({ info: 3, infoHue: 'purple', pending: 1 }),
    { roles: { success: 1, warning: 0, error: 0, info: 3 }, infoHue: 'purple' })
  assert.equal(readSemanticStates({ infoHue: 'green' }).infoHue, 'blue')
})
