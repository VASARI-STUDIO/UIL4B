// The Palette Builder's CSS export: the five slot lines first, then the
// neutrals and status colours the preview derives, for light on :root and for
// dark in a prefers-color-scheme block. The values must be the same ones the
// preview paints, so the legend's "also in your CSS" stays true.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SEMANTIC_ROLES, derivePaletteRoles, derivedCssVars, paletteCss,
} from '../../src/utils/palettePreviewRoles.js'

const PALETTE = ['#1f3a5f', '#4a7fb0', '#e8833a', '#f2efe9', '#0e1a2b']
const SLOTS = PALETTE.map((c, i) => `  --color-slot-${i}: ${c};`)

test('slot lines come first, then the derived light vars, then a dark block', () => {
  const css = paletteCss(SLOTS, PALETTE)
  const lines = css.split('\n')
  assert.equal(lines[0], ':root {')
  assert.deepEqual(lines.slice(1, 6), SLOTS)
  const dark = css.indexOf('@media (prefers-color-scheme: dark)')
  assert.ok(dark > css.indexOf('--color-canvas:'), 'light vars sit before the dark block')
  assert.ok(css.slice(dark).includes('--color-canvas:'), 'dark block sets the neutrals too')
  assert.ok(!css.includes('\\n'), 'no escaped newlines leak into the output')
})

test('every neutral and status var is written for both modes', () => {
  const css = paletteCss(SLOTS, PALETTE)
  const [light, dark] = css.split('@media (prefers-color-scheme: dark)')
  const names = ['canvas', 'surface', 'surface-2', 'border', 'border-strong', 'text', 'text-muted', 'text-disabled']
  for (const role of SEMANTIC_ROLES) names.push(role, `${role}-ink`, `${role}-tint`)
  for (const n of names) {
    assert.match(light, new RegExp(`--color-${n}: #[0-9a-f]{6};`, 'i'), `light --color-${n}`)
    assert.match(dark, new RegExp(`--color-${n}: #[0-9a-f]{6};`, 'i'), `dark --color-${n}`)
  }
})

test('the exported values are the ones the preview paints', () => {
  for (const mode of ['light', 'dark']) {
    const r = derivePaletteRoles(PALETTE, { mode })
    const vars = Object.fromEntries(derivedCssVars(PALETTE, mode))
    assert.equal(vars['--color-canvas'], r.canvas)
    assert.equal(vars['--color-surface-2'], r.raised)
    assert.equal(vars['--color-text-muted'], r.muted)
    for (const role of SEMANTIC_ROLES) {
      assert.equal(vars[`--color-${role}`], r[role].fill)
      assert.equal(vars[`--color-${role}-ink`], r[role].ink)
      assert.equal(vars[`--color-${role}-tint`], r[role].tint)
    }
  }
})

test('an empty palette exports only the slot lines', () => {
  assert.deepEqual(derivedCssVars([], 'light'), [])
  assert.equal(paletteCss([], []), ':root {\n}')
  assert.equal(paletteCss(['  --color-primary: #123456;'], []), ':root {\n  --color-primary: #123456;\n}')
})
