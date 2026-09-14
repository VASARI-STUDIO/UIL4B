// A PIXEL DIMENSION IS AN INTEGER, AND THIS PAGE USED THE 2-DECIMAL ROUNDER ON
// ONE.
//
// Found by the 2026-09-14 Create-tools audit and reproduced by hand: on
// /create/aspect-ratio, ratio 9:16 with a known width of 1920 rendered a height
// of 3413.33.
//
// It was not only a display problem. `out` feeds three things that each break
// on a fraction:
//   - the copy buttons, which hand "3413.33" to whoever asked for a dimension;
//   - `sizeOptions.find(o => o.w === out.width && o.h === out.height)`, which
//     can never match a named preset once either side is fractional;
//   - the swap and lock handlers, which write out.width/out.height back into
//     the ratio inputs and carry the fraction into the next calculation.
//
// This test pins the ARITHMETIC rather than the component, because the
// arithmetic is the part that was wrong. It mirrors what RatioCalculator.jsx's
// `out` useMemo now does.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const solve = (k, side, ratioW, ratioH) => (side === 'height'
  ? { width: Math.round(k * ratioW / ratioH), height: k }
  : { width: k, height: Math.round(k * ratioH / ratioW) })

test('the reported case: 9:16 at a known width of 1920 is whole', () => {
  const out = solve(1920, 'width', 9, 16)
  assert.equal(out.height, 3413, 'the exact value is 3413.333…; it must not surface as 3413.33')
  assert.ok(Number.isInteger(out.width) && Number.isInteger(out.height))
})

test('no ratio against a plausible width produces a fractional pixel', () => {
  // Every ratio the page offers as a preset, plus the awkward ones, against a
  // spread of real widths. A single fraction anywhere fails this.
  const ratios = [[16, 9], [9, 16], [4, 3], [3, 4], [21, 9], [1, 1], [3, 2], [2, 3], [5, 4], [7, 5]]
  const widths = [320, 375, 390, 768, 1080, 1280, 1366, 1440, 1920, 2560, 3440, 3840]
  const bad = []
  for (const [rw, rh] of ratios) {
    for (const w of widths) {
      for (const side of ['width', 'height']) {
        const out = solve(w, side, rw, rh)
        if (!Number.isInteger(out.width) || !Number.isInteger(out.height)) {
          bad.push(`${rw}:${rh} @ ${w} (${side}) -> ${out.width}x${out.height}`)
        }
      }
    }
  }
  assert.deepEqual(bad, [])
})

test('this test is not toothless — the OLD rounder really did produce fractions', () => {
  // POSITIVE CONTROL. Both assertions above are "everything is an integer",
  // which a solver that returned constants would also satisfy. This reproduces
  // the previous behaviour and proves the case it was failing on was real, so
  // the guard above is guarding something that actually happened.
  const round2 = (n) => Math.round(n * 100) / 100
  const oldHeight = round2(1920 * 16 / 9)
  assert.equal(oldHeight, 3413.33)
  assert.ok(!Number.isInteger(oldHeight), 'the old rounder must be shown to produce a fraction')
})

test('the component uses Math.round for both pixel branches, not the 2dp helper', () => {
  // SOURCE ASSERTION, because the arithmetic above lives in the component and a
  // test that only re-implements it would keep passing if the component
  // regressed. Reading the file is what ties the two together.
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/RatioCalculator.jsx'), 'utf8')
  const memo = src.slice(src.indexOf('const out = useMemo'), src.indexOf('const simplified = useMemo'))
  assert.match(memo, /width: Math\.round\(k \* ratioW \/ ratioH\)/)
  assert.match(memo, /height: Math\.round\(k \* ratioH \/ ratioW\)/)
  // The lookbehind matters: `\bround\(` also matches inside `Math.round(`,
  // because `.` is a word boundary — without it this assertion fails against
  // the very code it is meant to approve.
  assert.doesNotMatch(memo, /(?<!Math\.)\bround\(k \*/, 'the 2-decimal round() is back on a pixel dimension')
})
