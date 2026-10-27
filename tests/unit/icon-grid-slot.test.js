// Icon grid: the glyph slot is one fixed height, so every label in a row shares
// one baseline.
//
// A coloured glyph sits in a 36px chip that draws 24px, 28px or wide artwork.
// The chip only takes 24px of layout (a -6px block margin) so a coloured cell and
// a mono cell put their names at the same height. That margin used to apply only
// to cells that carried a pack line, so in a grid without one (a single pack, or
// Logo.dev alone) a chip cell's names sat 12px below a mono cell's. The rule must
// not depend on the pack line, and the loading slot must match it.
//
// Source-reading on purpose: the rendered row positions are measured in the
// user-sim run; this guards the rule from being narrowed again.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripCss } from '../helpers/strip-comments.js'

const css = stripCss(readFileSync(new URL('../../src/styles/deferred/library.css', import.meta.url), 'utf8'))
const rules = [...css.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')),
  body: m[2].replace(/\s+/g, ''),
}))
const declares = (selector, decl) => rules.filter((r) => r.selectors.includes(selector) && r.body.includes(decl))

test('a glyph chip takes 24px of layout in every grid cell, with or without a pack line', () => {
  assert.ok(declares('.lib-surface .ig .ic .ig-chip', 'margin-block:-6px').length > 0,
    'the chip no longer takes 24px of layout in every cell')
  const narrowed = rules.filter((r) => r.body.includes('margin-block:-6px')
    && r.selectors.some((s) => s.includes('.ig-chip') && (s.includes(':has(') || s.includes('--reserve-pack'))))
  assert.deepEqual(narrowed, [], 'the chip margin is conditional on a pack line again')
})

test('the loading slot is 24px tall in every skeleton cell', () => {
  assert.ok(declares('.lib-surface .ig .ig-skel .ig-skel-slot', 'height:24px').length > 0)
  const narrowed = rules.filter((r) => r.body.includes('height:24px')
    && r.selectors.some((s) => s.includes('.ig-skel-slot') && (s.includes(':has(') || s.includes('--reserve-pack'))))
  assert.deepEqual(narrowed, [], 'the skeleton slot height is conditional on a pack line again')
})

test('cells start glyphs and names from the top edge', () => {
  assert.ok(declares('.lib-surface .ig .ic', 'justify-content:flex-start').length > 0)
})
