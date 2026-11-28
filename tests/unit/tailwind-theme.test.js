// The Tailwind v4 theme: same names and values as the CSS tokens, in Tailwind's namespaces.
import test from 'node:test'
import assert from 'node:assert/strict'
import postcss from 'postcss'
import { buildTailwindCss, tailwindVars, utilityFor } from '../../src/utils/tailwindTheme.js'
import { designTokens, buildTokensCss } from '../../src/utils/designTokens.js'

const AT = new Date('2026-10-30T00:00:00Z')
const DESIGN = {
  palette: { colors: ['#1f4b8e', '#2E7BB8', '#F4F1EA'] },
  fonts: { heading: { family: 'Space Grotesk', weight: 600 }, body: { family: 'Lora', category: 'serif' } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.6 },
}

test('the file is one @theme block that parses, with no custom property declared twice', () => {
  const css = buildTailwindCss(DESIGN, { projectName: 'Lumen', watermark: false, date: AT })
  const root = postcss.parse(css)
  const atRules = []
  root.walkAtRules((r) => atRules.push(r.name))
  assert.deepEqual(atRules, ['theme'])
  const props = []
  root.walkDecls((d) => props.push(d.prop))
  assert.equal(new Set(props).size, props.length)
  assert.ok(props.every((p) => /^--[a-z0-9-]+$/.test(p)))
  assert.doesNotMatch(css, /Made with UIL4B/)
  assert.match(buildTailwindCss(DESIGN, { watermark: true, date: AT }), /Made with UIL4B/)
})

test('colour names are the CSS tokens names, values the same hex (lower case)', () => {
  const css = {}
  postcss.parse(buildTokensCss(DESIGN, { watermark: false, date: AT })).walkDecls((d) => { css[d.prop] = d.value })
  const vars = Object.fromEntries(tailwindVars(DESIGN))
  const colours = Object.keys(vars).filter((n) => n.startsWith('--color-'))
  assert.ok(colours.length > 30)
  // A role the CSS writes as var(--x) is the hex of x in the standalone Tailwind file.
  const resolved = (n) => (/^var\(--[\w-]+\)$/.test(css[n]) ? resolved(css[n].slice(4, -1)) : css[n])
  for (const n of colours) assert.equal(vars[n], resolved(n).toLowerCase(), n)
  assert.equal(colours.length, designTokens(DESIGN).filter((t) => t.path[0] === 'color').length)
})

test('type: each ladder step is a text size in rem with its line height, tracking and weight', () => {
  const vars = Object.fromEntries(tailwindVars(DESIGN))
  assert.equal(vars['--text-heading-1'], '2.44375rem')
  assert.equal(vars['--text-heading-1--line-height'], '1.1')
  assert.equal(vars['--text-heading-1--font-weight'], '600')
  assert.equal(vars['--text-body'], '1rem')
  assert.equal(vars['--text-body--line-height'], '1.6')
  assert.equal(vars['--text-body--font-weight'], '400')
  assert.equal(vars['--text-base'], undefined, 'Tailwind text-base is left alone')
  assert.equal(vars['--font-heading'], '"Space Grotesk", system-ui, sans-serif')
  assert.equal(vars['--leading-heading'], '1.1')
  assert.equal(vars['--font-weight-heading'], undefined, 'weights would make a second font-heading utility')
})

test('utility names: colours, sizes and families read as Tailwind utilities', () => {
  assert.equal(utilityFor('--color-primary'), 'bg-primary')
  assert.equal(utilityFor('--color-on-surface'), 'bg-on-surface')
  assert.equal(utilityFor('--text-heading-1'), 'text-heading-1')
  assert.equal(utilityFor('--text-heading-1--line-height'), null)
  assert.equal(utilityFor('--font-body'), 'font-body')
  assert.equal(utilityFor('--leading-body'), 'leading-body')
})

test('the interface roles are colours, so bg-surface, text-on-surface, border-border and ring-focus exist', () => {
  const vars = Object.fromEntries(tailwindVars(DESIGN))
  for (const n of ['background', 'surface', 'on-surface', 'on-surface-muted', 'border', 'primary-hover', 'on-primary', 'focus', 'disabled', 'on-disabled']) {
    assert.match(vars[`--color-${n}`] || '', /^#[0-9a-f]{6}$/, `--color-${n} is a literal hex in the standalone file`)
  }
  assert.equal(vars['--color-surface'], '#ffffff')
  // Same values as the CSS roles, once var() is followed.
  const css = {}
  postcss.parse(buildTokensCss(DESIGN, { watermark: false, date: AT })).walkDecls((d) => { css[d.prop] = d.value })
  const final = (v) => (/^var\(--[\w-]+\)$/.test(v) ? final(css[v.slice(4, -1)]) : v)
  for (const n of ['background', 'on-surface', 'primary-hover', 'focus']) assert.equal(vars[`--color-${n}`], final(css[`--color-${n}`]), n)
})
