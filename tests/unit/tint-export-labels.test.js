// A TINT RAMP IS LABELLED BY ITS OWN STEPS.
//
// exportBuilder.js labelled every tint swatch from one fixed list, 50 to 900,
// so a saved 13-step ramp (25 to 975) printed 50 under its lightest step, and
// an 11-step ramp's last step printed "1000". The Tint Generator saves 9, 11 or
// 13 stops; the style guide export has to name the stops it was handed.
//
// The expected names below are written out, not imported, so a table that was
// wrong in the source would not be agreed with by its own test.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStyleGuideHTML, buildCSSVars } from '../../src/utils/exportBuilder.js'
import { buildTokensCss, buildTokensJson } from '../../src/utils/designTokens.js'
import { tintLabelsFor, TINT_LABELS } from '../../src/utils/tintLabels.js'
import { TINT_LABELS as RAMP_LABELS } from '../../src/utils/tintRamp.js'

const EXPECTED = {
  9: ['50', '100', '200', '300', '400', '500', '600', '700', '800'],
  10: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
  11: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  13: ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '975'],
}

const ramp = (n) => Array.from({ length: n }, (_, i) => {
  const v = (20 + i * 10).toString(16).padStart(2, '0').toUpperCase()
  return `#${v}${v}${v}`
})

const cells = (html, cls) => [...html.matchAll(new RegExp(`class="${cls}"[^>]*><span>([^<]*)</span>`, 'g'))].map((m) => m[1])

for (const n of [9, 11, 13]) {
  test(`the style guide labels a ${n}-step tint ramp with its own step names`, () => {
    const html = buildStyleGuideHTML({ design: { palette: { colors: ['#2F6B5A'] }, tints: { scale: ramp(n) } } })
    assert.deepEqual(cells(html, 'sg-tint-cell'), EXPECTED[n])
  })
}

test('no ramp length prints a step that is not its own', () => {
  // The old table gave an 11-step ramp "1000" and a 13-step ramp "50" first.
  const eleven = cells(buildStyleGuideHTML({ design: { palette: { colors: ['#2F6B5A'] }, tints: { scale: ramp(11) } } }), 'sg-tint-cell')
  assert.ok(!eleven.includes('1000'), 'the 11th step was labelled 1000')
  assert.equal(eleven.at(-1), '950')
  const thirteen = cells(buildStyleGuideHTML({ design: { palette: { colors: ['#2F6B5A'] }, tints: { scale: ramp(13) } } }), 'sg-tint-cell')
  assert.equal(thirteen[0], '25', 'the 13-step ramp starts at 25')
  assert.equal(thirteen.at(-1), '975')
})

test('a ramp length with no table gets plain positions, never a made-up 50 to 900', () => {
  const html = buildStyleGuideHTML({ design: { palette: { colors: ['#2F6B5A'] }, tints: { scale: ramp(7) } } })
  assert.deepEqual(cells(html, 'sg-tint-cell'), ['1', '2', '3', '4', '5', '6', '7'])
  assert.deepEqual(tintLabelsFor(0), [])
})

test('the state colour packs keep their 10 steps, 50 to 900, in the page and in the CSS', () => {
  const pack = ramp(10)
  const html = buildStyleGuideHTML({
    design: { palette: { colors: ['#2F6B5A'] } },
    stateShades: { success: pack },
  })
  assert.deepEqual(cells(html, 'sg-state-cell'), EXPECTED[10])
  const css = buildCSSVars({ stateShades: { success: pack } })
  assert.match(css, /--success-50: #/)
  assert.match(css, /--success-900: #/)
  assert.ok(!/--success-1000/.test(css))
})

test('the label tables agree with the Tint Generator and with the written-out expectation', () => {
  for (const n of [9, 11, 13]) {
    assert.deepEqual(RAMP_LABELS[n], EXPECTED[n], `the Tint Generator's ${n}-step names moved`)
    assert.deepEqual(TINT_LABELS[n], EXPECTED[n])
    assert.equal(tintLabelsFor(n).length, n)
  }
})

// ── the live exports: the project's CSS variables and the token files ──────
// buildStyleGuideHTML is not called from the app; buildCSSVars is (the project
// page's "Copy CSS"), and it wrote --tint-1 ... --tint-11 by position.

const tintVars = (css) => [...css.matchAll(/--tint-([^:]+):/g)].map((m) => m[1])

for (const n of [9, 11, 13]) {
  test(`the project's CSS variables name a ${n}-step tint ramp by its own steps`, () => {
    const css = buildCSSVars({ tints: { scale: ramp(n) } })
    assert.deepEqual(tintVars(css), EXPECTED[n])
    assert.match(css, /--tint-50: #/)
  })
}

test('the project CSS has no positional tint names left, and a length with no table gets positions', () => {
  const css = buildCSSVars({ tints: { scale: ramp(11) } })
  assert.ok(!/--tint-(1|2|3|4|5|6|7|8|9|10|11):/.test(css), 'a tint was named by position')
  assert.deepEqual(tintVars(buildCSSVars({ tints: { scale: ramp(7) } })), ['1', '2', '3', '4', '5', '6', '7'])
  assert.deepEqual(tintVars(buildCSSVars({ tints: { scale: [] } })), [])
})

test('the token files name each colour\'s 11-step ramp 50 to 950', () => {
  const design = { palette: { base: '#2F6B5A', colors: ['#2F6B5A'] } }
  const css = buildTokensCss(design, { watermark: false })
  for (const step of EXPECTED[11]) assert.match(css, new RegExp(`--color-primary-${step}:`))
  assert.ok(!/--color-primary-1000:/.test(css))
  const json = JSON.parse(buildTokensJson(design, { watermark: false }))
  assert.deepEqual(Object.keys(json.color.primary).filter((k) => !k.startsWith('$')), EXPECTED[11])
})

test('the exported label tables cannot be changed by a caller', () => {
  assert.ok(Object.isFrozen(TINT_LABELS))
  for (const n of Object.keys(TINT_LABELS)) assert.ok(Object.isFrozen(TINT_LABELS[n]), `${n}-step names are not frozen`)
  assert.throws(() => { 'use strict'; TINT_LABELS[11].push('1000') }, TypeError)
})
