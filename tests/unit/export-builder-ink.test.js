// The ink the exported style guide paints on each swatch.
//
// utils/exportBuilder.js chose it with `lum(bg) > 0.5 ? dark : light`. 0.5 is
// not the crossover — black and white are equally readable at relative
// luminance 0.179 — so on every ground between 0.179 and 0.5 the export chose
// the WORSE ink, and this is the document a client is handed and keeps. Found
// on the 2026-09-06 engineering review by the same sweep that had already
// caught the fault in the Contrast Checker and HomeWorkbench.
import test from 'node:test'
import assert from 'node:assert/strict'

import { contrastText, buildStyleGuideHTML, EXPORT_DARK_INK, EXPORT_LIGHT_INK } from '../../src/utils/exportBuilder.js'
import { contrastRatio } from '../../src/utils/colors.js'

const AA = 4.5
const LEVELS = [0x00, 0x33, 0x66, 0x99, 0xCC, 0xFF]
const hex2 = (n) => n.toString(16).padStart(2, '0').toUpperCase()
const GRID = []
for (const r of LEVELS) for (const g of LEVELS) for (const b of LEVELS) GRID.push(`#${hex2(r)}${hex2(g)}${hex2(b)}`)

test('THE SWEEP: on every ground the export picks the pole that measures higher', () => {
  const wrong = []
  for (const bg of GRID) {
    const ink = contrastText(bg)
    const other = ink === EXPORT_DARK_INK ? EXPORT_LIGHT_INK : EXPORT_DARK_INK
    if (contrastRatio(ink, bg) < contrastRatio(other, bg)) wrong.push(bg)
  }
  assert.deepEqual(wrong, [],
    `${wrong.length} of ${GRID.length} grounds get the lower-contrast ink (the old rule got 80 wrong): ${wrong.slice(0, 8).join(' ')}`)
})

test('THE SWEEP, the half that matters: the export never fails AA where the other pole passes', () => {
  const failing = []
  for (const bg of GRID) {
    const ink = contrastText(bg)
    const other = ink === EXPORT_DARK_INK ? EXPORT_LIGHT_INK : EXPORT_DARK_INK
    if (contrastRatio(ink, bg) < AA && contrastRatio(other, bg) >= AA) failing.push(bg)
  }
  assert.deepEqual(failing, [],
    `${failing.length} grounds fail AA with a passing ink available (the old rule: 75 of 216)`)
})

test('the recorded case: #009900 gets dark ink at 4.72:1, not light ink at 3.61:1', () => {
  // Relative luminance 0.228 — above the crossover, below the old threshold.
  assert.equal(contrastText('#009900'), EXPORT_DARK_INK)
  assert.ok(contrastRatio(contrastText('#009900'), '#009900') >= AA)
})

test('the poles themselves still get the obvious answer', () => {
  // Positive control: a rule that returned one ink for everything would pass
  // neither this nor the sweep, but the sweep alone would not say which way.
  assert.equal(contrastText('#FFFFFF'), EXPORT_DARK_INK)
  assert.equal(contrastText('#000000'), EXPORT_LIGHT_INK)
})

test('the ink reaches the document — the swatch, not just the helper', () => {
  // Reverting the helper at its call site must fail this file, not only the
  // helper tests above. A bare `color:` on the palette swatch is the thing a
  // client actually sees.
  const html = buildStyleGuideHTML({
    design: { palette: { colors: ['#009900', '#FFFFFF'] }, fonts: {}, typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5 } },
    projectName: 'Ink test',
  })
  assert.match(html, /background:#009900;color:#0F172A/, 'the #009900 swatch is painted with light ink again')
  assert.match(html, /background:#FFFFFF;color:#0F172A/, 'white gets dark ink')
  assert.doesNotMatch(html, /background:#009900;color:#F8FAFC/)
})

test('a malformed hex does not throw out of the export', () => {
  assert.doesNotThrow(() => contrastText('nonsense'))
  assert.doesNotThrow(() => contrastText(undefined))
})
