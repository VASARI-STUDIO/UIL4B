// pairRoles: the Contrast Checker's two colours as a roles object, and the
// `keep` option on inkOnField. The pair is under test, so nothing is corrected:
// text is the text colour, type on a field is the background, and no semantic
// state carries a colour of its own.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio } from '../../src/utils/colors.js'
import { inkOnField, pairRoles, pvVars, PAIR_ERROR } from '../../src/utils/palettePreviewRoles.js'

test('every text role is the text colour and every ink on a field is the background', () => {
  const r = pairRoles('#777777', '#888888')
  for (const k of ['text', 'muted', 'primary', 'deep', 'disabled']) assert.equal(r[k], '#777777', k)
  for (const k of ['canvas', 'surface', 'onPrimary', 'onDeep']) assert.equal(r[k], '#888888', k)
  assert.equal(r.pair, true)
  assert.deepEqual(r.fails, [])
})

test('the roles carry every custom property pvVars writes, as hex or a keyword', () => {
  const vars = pvVars(pairRoles('#1f2937', '#ffffff'))
  assert.ok(Object.keys(vars).length > 30)
  for (const [name, value] of Object.entries(vars)) {
    assert.match(String(value), /^(#[0-9a-f]{6}|transparent)$/i, `${name} = ${value}`)
  }
  assert.equal(vars['--pv-error'], PAIR_ERROR)
})

test('the tints stay between the background and the text colour', () => {
  const r = pairRoles('#101820', '#f4f1ea')
  const span = contrastRatio('#101820', '#f4f1ea')
  for (const k of ['raised', 'border', 'subtle', 'accent', 'secondary']) {
    assert.ok(contrastRatio(r[k], '#f4f1ea') <= span + 1e-9, k)
  }
  assert.ok(contrastRatio(r.subtle, r.canvas) < contrastRatio(r.accent, r.canvas))
  assert.ok(contrastRatio(r.accent, r.canvas) < contrastRatio(r.secondary, r.canvas))
})

test('the mode follows the background, whatever the text colour is', () => {
  assert.equal(pairRoles('#222222', '#fafafa').mode, 'light')
  assert.equal(pairRoles('#fafafa', '#222222').mode, 'dark')
})

test('inkOnField with keep returns the on-ink even where it fails, and without keep it corrects', () => {
  const inks = { on: '#888888', text: '#777777', canvas: '#888888' }
  const kept = inkOnField('#777777', inks, { keep: true })
  assert.equal(kept.hex, '#888888')
  assert.ok(kept.ratio < 3)
  const fixed = inkOnField('#777777', inks)
  assert.notEqual(fixed.hex, '#888888')
  assert.ok(fixed.ratio >= 4.5)
})
