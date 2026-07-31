import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, hexToHct, hexToRgb } from '../../src/utils/colors.js'
import {
  createUiSystem,
  UI_SYSTEM_GROUPS,
  UI_SYSTEM_SHADES,
  uiSystemExports,
} from '../../src/utils/uiSystem.js'

const SEED = '#4338E0'
const system = createUiSystem(SEED)
const byId = Object.fromEntries(system.groups.map(group => [group.id, group]))
const circularDistance = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

test('1 · the UI system exposes the six approved colour groups', () => {
  assert.deepEqual(system.groups.map(group => group.id), UI_SYSTEM_GROUPS.map(group => group.id))
})

test('2 · every group has the exact 100 through 900 scale', () => {
  for (const group of system.groups) {
    assert.deepEqual(group.shades.map(shade => shade.step), UI_SYSTEM_SHADES)
  }
})

test('3 · Brand 500 preserves the user seed byte-for-byte', () => {
  assert.equal(byId.brand.shades[4].hex, SEED)
})

test('4 · achieved perceived tone progresses strictly from 100 to 900', () => {
  for (const group of system.groups) {
    const tones = group.shades.map(shade => shade.achieved.t)
    for (let index = 1; index < tones.length; index++) {
      assert.ok(tones[index - 1] > tones[index], `${group.id} ${index} progresses`)
    }
  }
})

test('5 · status hues remain semantically recognisable', () => {
  const targets = { success: 145, warning: 75, error: 25, information: 250 }
  for (const [id, target] of Object.entries(targets)) {
    assert.ok(circularDistance(byId[id].shades[4].achieved.h, target) < 18, `${id} stays near ${target}°`)
  }
})

test('6 · neutral can be brand-tinted or true grey without changing other scales', () => {
  const grey = createUiSystem(SEED, { neutralTinted: false })
  assert.ok(byId.neutral.shades[4].achieved.c > 1)
  for (const item of grey.groups.find(group => group.id === 'neutral').shades) {
    const [r, g, b] = hexToRgb(item.hex)
    assert.equal(r, g)
    assert.equal(g, b)
  }
  assert.deepEqual(grey.groups.find(group => group.id === 'brand'), byId.brand)
})

test('7 · generation is deterministic and local', () => {
  assert.deepEqual(createUiSystem(SEED), createUiSystem(SEED))
})

test('8 · an endpoint seed is preserved and reports its limited tone range', () => {
  const limited = createUiSystem('#000000')
  assert.equal(limited.groups[0].shades[4].hex, '#000000')
  assert.match(limited.warnings.join(' '), /limited separation/i)
})

test('9 · every swatch reports measured black and white contrast', () => {
  for (const group of system.groups) {
    for (const shade of group.shades) {
      assert.equal(shade.contrast.black, Math.round(contrastRatio(shade.hex, '#000000') * 100) / 100)
      assert.equal(shade.contrast.white, Math.round(contrastRatio(shade.hex, '#FFFFFF') * 100) / 100)
    }
  }
})

test('10 · every swatch recommends its higher-contrast ink with textual pass states', () => {
  for (const group of system.groups) {
    for (const shade of group.shades) {
      const evidence = shade.contrast
      assert.equal(evidence.recommended, evidence.black >= evidence.white ? '#000000' : '#FFFFFF')
      assert.equal(evidence.aaNormal, evidence.ratio >= 4.5)
      assert.equal(evidence.aaLarge, evidence.ratio >= 3)
      assert.equal(evidence.aaUi, evidence.ratio >= 3)
      assert.equal(evidence.aaa, evidence.ratio >= 7)
    }
  }
})

test('11 · light and dark schemes expose the same deterministic role aliases', () => {
  assert.deepEqual(Object.keys(system.schemes.light.roles), Object.keys(system.schemes.dark.roles))
  assert.ok(system.schemes.light.roles.primary)
  assert.ok(system.schemes.dark.roles['on-primary'])
})

test('12 · every mapped fill has a passing paired foreground', () => {
  for (const scheme of Object.values(system.schemes)) {
    for (const pair of scheme.pairs) {
      assert.ok(pair.ratio >= 4.5, `${scheme.theme} ${pair.name} passes AA`)
    }
  }
})

test('13 · primary mappings state the actual nearest passing brand shade', () => {
  assert.match(system.schemes.light.roles.primary.source, /^brand-\d00$/)
  assert.match(system.schemes.dark.roles.primary.source, /^brand-\d00$/)
  assert.ok(contrastRatio(
    system.schemes.light.roles.primary.hex,
    system.schemes.light.roles['on-primary'].hex,
  ) >= 4.5)
})

test('14 · CSS export contains all 54 shades and both semantic themes', () => {
  const { css } = uiSystemExports(system)
  for (const group of UI_SYSTEM_GROUPS) {
    for (const step of UI_SYSTEM_SHADES) assert.match(css, new RegExp(`--ui-${group.id}-${step}:`))
  }
  assert.match(css, /\[data-ui-theme="light"\]/)
  assert.match(css, /\[data-ui-theme="dark"\]/)
  assert.match(css, /--ui-on-primary:/)
})

test('15 · DTCG-shaped export retains typed scales and semantic aliases', () => {
  const parsed = JSON.parse(uiSystemExports(system).dtcg)
  assert.deepEqual(parsed.color.brand['500'], { $type: 'color', $value: SEED })
  assert.equal(parsed.semantic.light.primary.$type, 'color')
  assert.match(parsed.semantic.light.primary.$value, /^\{color\.brand\.\d00\}$/)
})

test('16 · Tailwind-ready export contains every named scale', () => {
  const { tailwind } = uiSystemExports(system)
  assert.match(tailwind, /export default/)
  for (const group of UI_SYSTEM_GROUPS) assert.match(tailwind, new RegExp(`"${group.id}"`))
})

test('17 · invalid generation fails explicitly instead of replacing the last system', () => {
  assert.throws(() => createUiSystem('not-a-colour'), /valid six-digit HEX/)
})

test('18 · individual overrides are exact and progression failures are warned', () => {
  const overridden = createUiSystem(SEED, { overrides: { 'brand-100': '#000000' } })
  assert.equal(overridden.groups[0].shades[0].hex, '#000000')
  assert.equal(overridden.hasOverrides, true)
  assert.match(overridden.warnings.join(' '), /overrides need review/i)
  assert.deepEqual(roundHct(overridden.groups[0].shades[0].hex), overridden.groups[0].shades[0].achieved)
})

test('19 · Brand 500 remains the exact seed through overrides and every export', () => {
  const guarded = createUiSystem(SEED, {
    overrides: {
      'brand-100': '#111111',
      'brand-500': '#FF0000',
      'brand-900': '#EEEEEE',
      'success-500': '#00FF00',
    },
  })
  const brand500 = guarded.groups.find(group => group.id === 'brand').shades.find(shade => shade.step === 500)
  assert.equal(guarded.seed, SEED)
  assert.equal(brand500.hex, SEED)
  assert.equal(brand500.override, false)

  const { css, dtcg, tailwind } = uiSystemExports(guarded)
  assert.match(css, new RegExp(`--ui-brand-500: ${SEED}`))
  assert.equal(JSON.parse(dtcg).color.brand['500'].$value, SEED)
  assert.match(tailwind, new RegExp(`"500": "${SEED}"`))
  assert.doesNotMatch(css, /--ui-brand-500: #FF0000/)
})

function roundHct(hex) {
  const [h, c, t] = hexToHct(hex)
  return {
    h: Math.round(h * 10) / 10,
    c: Math.round(c * 10) / 10,
    t: Math.round(t * 10) / 10,
  }
}
