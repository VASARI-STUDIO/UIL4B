// A CONTROL CALLED "MAX" HAS TO BE A MAXIMUM.
//
// The File Converter offered a resolution ceiling and a render scale and
// MULTIPLIED them, so a 4000px image with the ceiling at 1920 and the scale at
// @2x came out at 3840px — twice the stated maximum. The encoder's own error
// string had already noticed: "Too large to export at @Nx — reduce Max
// Dimension" is an admission that the maximum could be exceeded.
//
// Founder, 2026-09-15: "export scale should allow smaller and max dimensions
// should be resolution scales, such as 4k, 2k, 1k, 720p."
//
// The order is scale, then cap. The scale says what you want; the ceiling says
// what you will accept.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPORT_SCALES, SIZE_PRESETS, MAX_CANVAS_DIM, outputDimensions, exceedsCanvasLimit,
} from '../../src/utils/imageResize.js'

test('THE ONE THAT MATTERS: the size limit is a ceiling, not a factor', () => {
  // The exact case that was wrong. Before the fix this returned 3840x2880.
  const out = outputDimensions(4000, 3000, { maxDim: 1920, renderScale: 2 })
  assert.equal(Math.max(out.w, out.h), 1920, `@2x under a 1920 ceiling produced ${out.w}x${out.h}`)
  assert.equal(out.h, 1440, 'the aspect ratio moved')
  assert.equal(out.capped, true)

  // And it holds for every scale the control offers, which is the general form
  // of the bug: no combination may exceed the stated ceiling.
  const over = []
  for (const { id: renderScale } of EXPORT_SCALES) {
    for (const { id: maxDim } of SIZE_PRESETS.filter(s => s.id > 0)) {
      const r = outputDimensions(4000, 3000, { maxDim, renderScale })
      if (Math.max(r.w, r.h) > maxDim) over.push(`@${renderScale}x under ${maxDim} gave ${r.w}x${r.h}`)
    }
  }
  assert.deepEqual(over, [])
})

test('the scale can now make an image smaller', () => {
  // The control offered @1x and @2x only: it could enlarge and could not shrink.
  assert.ok(EXPORT_SCALES.some(s => s.id < 1), 'no sub-1x scale is offered')
  assert.deepEqual(outputDimensions(512, 512, { renderScale: 0.25 }), { w: 128, h: 128, scale: 0.25, capped: false })
  assert.equal(outputDimensions(1000, 800, { renderScale: 0.5 }).w, 500)
})

test('a ceiling only ever reduces — it never enlarges a small image', () => {
  // A 200px image with the ceiling at 4K must stay 200px. A ceiling that
  // scaled UP would be the same category of bug in the other direction.
  const out = outputDimensions(200, 100, { maxDim: 3840, renderScale: 1 })
  assert.deepEqual([out.w, out.h], [200, 100])
  assert.equal(out.capped, false)
})

test('the sizes offered are the named resolutions, each with its pixel count', () => {
  // Founder asked for 4k, 2k, 1k and 720p by name. The label carries BOTH the
  // name and the number because the conventions genuinely disagree — "2K" is
  // 2048 in DCI and 2560 in consumer use, and 1K at 1024 is SMALLER than 720p
  // at 1280, so a name alone cannot be ordered.
  const byId = Object.fromEntries(SIZE_PRESETS.map(s => [s.id, s.label]))
  assert.match(byId[3840], /4K/)
  assert.match(byId[2560], /2K/)
  assert.match(byId[1024], /1K/)
  assert.match(byId[1280], /720p/)
  for (const s of SIZE_PRESETS.filter(p => p.id > 0)) {
    assert.ok(s.label.includes(String(s.id)), `"${s.label}" does not state its pixel count`)
  }
  // Ordered by pixels descending, so the menu reads as a ladder.
  const ids = SIZE_PRESETS.filter(s => s.id > 0).map(s => s.id)
  assert.deepEqual(ids, [...ids].sort((a, b) => b - a))
  assert.equal(SIZE_PRESETS[0].id, 0, 'the first entry must be the no-op')
})

test('the canvas ceiling is still enforced', () => {
  assert.equal(exceedsCanvasLimit(MAX_CANVAS_DIM, 10), false)
  assert.equal(exceedsCanvasLimit(MAX_CANVAS_DIM + 1, 10), true)
  // @3x on a large source is the realistic way to reach it.
  const huge = outputDimensions(8000, 8000, { maxDim: 0, renderScale: 3 })
  assert.equal(exceedsCanvasLimit(huge.w, huge.h), true)
})

test('nonsense in does not produce nonsense out', () => {
  // The page feeds this whatever an <img> reported, and an SVG with no
  // intrinsic size reports 0. A zero or a NaN must not become a 0-pixel canvas.
  for (const [w, h] of [[0, 0], [NaN, 100], [-5, -5], [undefined, undefined]]) {
    const out = outputDimensions(w, h, { maxDim: 1920, renderScale: 2 })
    assert.ok(out.w >= 1 && out.h >= 1, `${w}x${h} produced ${out.w}x${out.h}`)
    assert.ok(Number.isFinite(out.w) && Number.isFinite(out.h))
  }
  assert.ok(outputDimensions(100, 100, {}).w === 100, 'missing options must mean no change')
  assert.ok(outputDimensions(100, 100, { renderScale: 0 }).w === 100, 'a zero scale must not erase the image')
})

test('this guard is not toothless — the tables are real and the ratio is kept', () => {
  // POSITIVE CONTROL. Several assertions above are "nothing exceeded the
  // ceiling", which an outputDimensions that always returned 1x1 would satisfy.
  assert.ok(SIZE_PRESETS.length >= 5, `only ${SIZE_PRESETS.length} sizes offered`)
  assert.ok(EXPORT_SCALES.length >= 5, `only ${EXPORT_SCALES.length} scales offered`)
  const r = outputDimensions(1600, 900, { maxDim: 1280, renderScale: 1 })
  assert.equal(r.w, 1280)
  assert.equal(r.h, 720, '16:9 did not survive the cap')
})
