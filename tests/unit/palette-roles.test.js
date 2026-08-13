// What each palette slot is CALLED must match what the generator actually put
// there.
//
// PaletteBuilder labelled its five columns from one fixed array —
// ['PRIMARY','SECONDARY','ACCENT','SUBTLE','DEEP'] — left to right, regardless
// of the system. Those names are right for the `auto` tonal engine
// (autoTonalFromSeed's own comments name its outputs exactly that) and wrong
// for every hue-based harmony, because generateHarmony emits a different shape
// per system.
//
// Founder report: "all systems say the same from left to right… the subtle
// colour of the primary should be called subtle, or the colour shown in the
// slot should be the subtle colour."
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { roleLabel, roleLabels, HARMONY_ROLE_LABELS } from '../../src/utils/paletteRoles.js'
import { generateHarmony, hexToHsl } from '../../src/utils/colors.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const SEED = '#2563EB'
const hue = (hex) => hexToHsl(hex)[0]
const light = (hex) => hexToHsl(hex)[2]
// Shortest distance between two hues on the wheel.
const hueGap = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d) }

// ── Every system gets its own vocabulary ───────────────────────────────────

test('no two hue-based systems share the same label set', () => {
  // The whole bug: one array for all of them.
  const sets = Object.entries(HARMONY_ROLE_LABELS)
    .filter(([id]) => id !== 'auto')
    .map(([id, labels]) => [id, labels.join('|')])
  for (const [id, joined] of sets) {
    assert.notEqual(joined, HARMONY_ROLE_LABELS.auto.join('|'),
      `${id} still uses the tonal engine's labels`)
  }
})

test('auto keeps the labels that are genuinely accurate for it', () => {
  // Not everything was wrong. autoTonalFromSeed really does emit primary,
  // sibling-hue secondary, accent, subtle and deep — changing these would
  // introduce an error rather than fix one.
  assert.deepEqual(roleLabels('auto'), ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP'])
})

test('an unknown system falls back rather than rendering blanks', () => {
  assert.deepEqual(roleLabels('not-a-system'), roleLabels('auto'))
  assert.equal(roleLabel(undefined, 0), 'PRIMARY')
})

// ── The labels describe what the generator actually produced ───────────────

test('a label claiming a hue offset matches the colour in that slot', () => {
  // The claims are checkable, so check them rather than trusting the comment.
  const cases = [
    ['complement', 1, 180],
    ['analogous', 1, 30],
    ['analogous', 2, 30],
    ['triadic', 1, 120],
    ['triadic', 2, 120],
    ['tetradic', 1, 90],
    ['tetradic', 2, 180],
    ['tetradic', 3, 90],
  ]
  for (const [harmony, index, expectedGap] of cases) {
    const colors = generateHarmony(SEED, harmony)
    const gap = hueGap(hue(colors[index]), hue(colors[0]))
    assert.ok(Math.abs(gap - expectedGap) <= 2,
      `${harmony} slot ${index} ("${roleLabel(harmony, index)}") sits ${gap.toFixed(0)}° from the seed, not ${expectedGap}°`)
  }
})

test('a slot labelled SOFT or LIGHT is genuinely lighter than the seed', () => {
  for (const [harmony, index] of [['complement', 2], ['analogous', 3], ['triadic', 3], ['split', 3], ['monochromatic', 1]]) {
    const colors = generateHarmony(SEED, harmony)
    assert.ok(light(colors[index]) > light(colors[0]),
      `${harmony} slot ${index} is labelled "${roleLabel(harmony, index)}" but is not lighter than the seed`)
  }
})

test('a slot labelled DEEP or DARK is genuinely darker than the seed', () => {
  for (const [harmony, index] of [['complement', 4], ['tetradic', 4], ['monochromatic', 3], ['custom', 4]]) {
    const colors = generateHarmony(SEED, harmony)
    assert.ok(light(colors[index]) < light(colors[0]),
      `${harmony} slot ${index} is labelled "${roleLabel(harmony, index)}" but is not darker than the seed`)
  }
})

test('monochromatic never claims a second hue', () => {
  // Every output is the same hue at a different tone, so SECONDARY and ACCENT
  // were the most misleading labels of all here.
  const colors = generateHarmony(SEED, 'monochromatic')
  for (const c of colors) {
    assert.ok(hueGap(hue(c), hue(colors[0])) <= 2, 'monochromatic drifted hue')
  }
  for (const label of roleLabels('monochromatic')) {
    assert.ok(!/SECONDARY|ACCENT|COMPLEMENT|TRIAD/.test(label),
      `monochromatic must not claim a distinct hue: "${label}"`)
  }
})

test('every system labels exactly the five slots its generator emits', () => {
  for (const harmony of ['complement', 'analogous', 'triadic', 'split', 'tetradic', 'monochromatic', 'custom']) {
    assert.equal(generateHarmony(SEED, harmony).length, 5, `${harmony} emits 5`)
    assert.equal(roleLabels(harmony).length, 5, `${harmony} labels 5`)
  }
})

test('user-added columns are numbered, not given a role they do not have', () => {
  assert.equal(roleLabel('analogous', 5), 'ALTERNATIVE 1')
  assert.equal(roleLabel('analogous', 6), 'ALTERNATIVE 2')
})

// ── The export tokens must NOT move ────────────────────────────────────────

test('export token names stay fixed while the caption varies', () => {
  // ROLES[i] is lowercased into --color-primary, --color-subtle and friends,
  // and the tint panel and UI preview key off the same slot identity. Varying
  // those by system would rename a user's CSS variables every time they tried
  // a different harmony, and break any stylesheet already consuming them.
  const src = read('src/pages/PaletteBuilder.jsx')
  assert.match(src, /const role = ROLES\[i\]\.toLowerCase\(\)|ROLES\[i\]\.toLowerCase\(\)/,
    'the export path must still use the stable ROLES array')
  assert.match(src, /const role = roleLabel\(harmony, i\)/,
    'the displayed caption must come from the per-system map')
  assert.match(src, /const ROLES = \['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP'\]/,
    'the stable slot identity must not have been redefined')
})
