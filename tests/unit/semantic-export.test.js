// The Semantic Colour files: the :root block and the swatch sheet read one list of
// roles, so what is copied, downloaded as CSS and downloaded as HTML cannot differ.
//
// MUTATION: drop a role's ramp from semanticTokensCSS, or skip escaping in
// semanticSwatchHTML, and the matching case fails.
import test from 'node:test'
import assert from 'node:assert/strict'
import { semanticTokensCSS, semanticSwatchHTML } from '../../src/utils/semanticExport.js'

const STEPS = ['50', '500', '900']
const ROLES = [
  { id: 'success', label: 'Success', intent: 'Completed', base: '#22c55e', shades: ['#f0fdf4', '#22c55e', '#14532d'] },
  { id: 'info', label: 'Information <b>', intent: 'Context & more', base: '#3b82f6', shades: ['#eff6ff', '#3b82f6', '#1e3a8a'] },
]

test('the tokens block has an alias per role and every step of every role', () => {
  const css = semanticTokensCSS(ROLES, STEPS)
  assert.ok(css.startsWith(':root {\n'))
  assert.ok(css.endsWith('\n}'))
  assert.match(css, /^ {2}--color-success: #22c55e;$/m)
  assert.match(css, /^ {2}--color-info: #3b82f6;$/m)
  for (const r of ROLES) STEPS.forEach((s, i) => assert.ok(css.includes(`  --color-${r.id}-${s}: ${r.shades[i]};`), `${r.id}-${s}`))
})

test('the swatch sheet names every step, hex and variable, and is self-contained', () => {
  const html = semanticSwatchHTML(ROLES, STEPS, 1)
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(!/<script|<link|https?:\/\//.test(html))
  for (const r of ROLES) {
    STEPS.forEach((s, i) => {
      assert.ok(html.includes(`<code>--color-${r.id}-${s}</code>`), `${r.id}-${s} variable`)
      assert.ok(html.includes(r.shades[i].toUpperCase()), `${r.id}-${s} hex`)
    })
  }
  assert.ok(html.includes('<code>--color-success</code> is step 500, #22C55E'))
})

test('role text is escaped', () => {
  const html = semanticSwatchHTML(ROLES, STEPS, 1)
  assert.ok(html.includes('Information &lt;b&gt;'))
  assert.ok(html.includes('Context &amp; more'))
  assert.ok(!html.includes('<b>'))
})
