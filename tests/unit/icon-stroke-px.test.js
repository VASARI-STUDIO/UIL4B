// Icon stroke model: Relative keeps the stroke a share of the icon, Fixed keeps its pixels.
//
// The browser's scale is recomputed here on purpose rather than imported: if it came from the
// module under test, a broken `renderScale` would break both sides of every assertion alike.
//
// HOW TO SEE EACH FAIL (src/utils/iconStroke.js):
//   strokeAttrForPx divides Relative by renderScale(size) again     -> "Relative ... same share"
//   strokeAttrForPx stops dividing Fixed by renderScale(size)       -> "Fixed ... same pixels"
//   customIconStroke drops the px x reference/size conversion       -> "a saved Relative icon"
//   markupHasStroke goes back to a pack list or counts <defs>       -> "strokeable"
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  STROKE_PX, STROKE_REFERENCE_SIZE, STROKE_UNIT_REF, canPinWithVectorEffect, clampStrokePx, customIconStroke,
  draftStrokePx, markupHasStroke, parseViewBoxRect, stickyStrokePx, stickyStrokeToken, strokeAttrForPx,
  strokeScaleCaption, transformScale, zoomedStroke,
} from '../../src/utils/iconStroke.js'

const SIZES = [16, 20, 24, 32, 48, 64, 128, 256, 512]
const SCALES = [1, 2, 4]
// width, height of the viewBox: the 24 grid, a 256 grid, and two that are not square.
const BOXES = [[24, 24], [256, 256], [32, 24], [20, 40]]

/** What a browser paints for `<svg width=px height=px viewBox="0 0 w h">`: the smaller ratio wins. */
const painted = (attr, px, w, h) => attr * Math.min(px / w, px / h)

test('Relative: the stroke is the same share of the icon at every Size and PNG scale', () => {
  for (const [w, h] of BOXES) {
    for (const size of SIZES) {
      for (const scale of SCALES) {
        const px = size * scale
        const attr = strokeAttrForPx({ px: 2, size: px, viewBox: { w, h }, absolute: false })
        // 2px on a 24px icon is 1/12 of the icon at every size.
        assert.ok(Math.abs(painted(attr, px, w, h) / px - 2 / 24) < 1e-5, `${w}x${h} at ${px}px`)
        // And the number written never depends on the size.
        assert.equal(attr, strokeAttrForPx({ px: 2, size: 24, viewBox: { w, h } }))
      }
    }
  }
})

test('Fixed: the stroke paints the same pixels at every Size and PNG scale', () => {
  for (const [w, h] of BOXES) {
    for (const size of SIZES) {
      for (const scale of SCALES) {
        const px = size * scale
        const attr = strokeAttrForPx({ px: 2, size: px, viewBox: { w, h }, absolute: true })
        assert.ok(Math.abs(painted(attr, px, w, h) - 2) < 1e-3, `${w}x${h} at ${px}px paints ${painted(attr, px, w, h)}`)
      }
    }
  }
})

test('the modes agree at the reference size, and the viewBox origin plays no part', () => {
  for (const [w, h] of BOXES) {
    const fixed = strokeAttrForPx({ px: 3, size: STROKE_REFERENCE_SIZE, viewBox: { w, h }, absolute: true })
    const relative = strokeAttrForPx({ px: 3, size: STROKE_REFERENCE_SIZE, viewBox: { w, h }, absolute: false })
    assert.equal(fixed, relative, `${w}x${h} at 24px`)
  }
  assert.equal(strokeAttrForPx({ px: 2, size: 24, viewBox: 24, absolute: true }), 2)
  assert.equal(strokeAttrForPx({ px: 2, size: 24, viewBox: 24, absolute: false }), 2)
  assert.deepEqual(parseViewBoxRect('10,10,24,24'), { x: 10, y: 10, w: 24, h: 24 })
  assert.deepEqual(parseViewBoxRect('nonsense'), { x: 0, y: 0, w: 24, h: 24 })
})

test('an unusable stroke writes nothing; a scaled group divides its own scale back out', () => {
  for (const bad of [0, -1, NaN, null, '']) assert.equal(strokeAttrForPx({ px: bad, size: 24, viewBox: 24 }), null)
  assert.equal(strokeAttrForPx({ px: 2, size: 24, viewBox: 24, inside: 2 }), 1)
  assert.equal(transformScale('translate(2 3) rotate(45)'), 1)
  assert.equal(transformScale('scale(2)'), 2)
  assert.equal(transformScale('matrix(0.5 0 0 0.5 1 1)'), 0.5)
  assert.equal(transformScale('scale(-1 1)'), 1)
  assert.equal(transformScale('scale(abc)'), 1)
})

test('the stage is a zoomed view: a Fixed stroke is magnified with the picture, a Relative one already is', () => {
  assert.equal(zoomedStroke({ px: 2, absolute: true, drawSize: 112, exportSize: 24 }), 2 * 112 / 24)
  assert.equal(zoomedStroke({ px: 2, absolute: false, drawSize: 112, exportSize: 24 }), 2)
})

test('vector-effect is pinned only where one user unit is one pixel', () => {
  assert.equal(canPinWithVectorEffect({ size: 24, viewBox: 24 }), true)
  assert.equal(canPinWithVectorEffect({ size: 48, viewBox: 24 }), false)
  assert.equal(canPinWithVectorEffect({ size: 256, viewBox: 256 }), true)
  assert.equal(canPinWithVectorEffect({ size: 24, viewBox: 24, scaledGroups: true }), false)
})

test('the caption says what each mode does', () => {
  const rel = strokeScaleCaption({ size: 48, stroke: 2, absolute: false })
  assert.match(`${rel.prefix}${rel.effect}${rel.suffix}`, /Relative.*2px at 24px, 4px at 48px.*looks the same/)
  const fixed = strokeScaleCaption({ size: 48, stroke: 2, absolute: true })
  assert.match(`${fixed.prefix}${fixed.effect}${fixed.suffix}`, /Fixed.*2px at every size and PNG scale/)
})

test('a saved Relative icon re-opens with the same stroke-width attribute it was saved with', () => {
  const svg = '<svg viewBox="0 0 24 24"/>'
  // Older record: pixels at its own size 48, drawn as 4 / (48/24) = 2 units. Same 2 units now.
  const old = customIconStroke({ stroke: 4, size: 48, strokeUnit: 'px', svg })
  assert.equal(strokeAttrForPx({ px: old.px, size: 48, viewBox: 24, absolute: old.absStroke }), 2)
  // Pre-unit record: user units.
  const units = customIconStroke({ stroke: 1.5, size: 64, svg })
  assert.equal(strokeAttrForPx({ px: units.px, size: 64, viewBox: 24, absolute: units.absStroke }), 1.5)
  // A 256 grid keeps its own units too.
  const big = customIconStroke({ stroke: 8, size: 24, strokeUnit: 'px', svg: '<svg viewBox="0 0 256 256"/>' })
  assert.ok(Math.abs(strokeAttrForPx({ px: big.px, size: 24, viewBox: 256 }) - 8 * 256 / 24) < 1e-3)
  // Written today: carried over untouched.
  assert.deepEqual(customIconStroke({ stroke: 3, size: 16, strokeUnit: STROKE_UNIT_REF, svg }), { px: 3, absStroke: false })
  assert.equal(customIconStroke({ stroke: 0, svg }), null)
})

test('a saved Fixed icon keeps its pixels', () => {
  const r = customIconStroke({ stroke: 2, size: 128, absStroke: true, strokeUnit: 'px', svg: '<svg viewBox="0 0 24 24"/>' })
  assert.deepEqual(r, { px: 2, absStroke: true })
  assert.ok(Math.abs(painted(strokeAttrForPx({ px: r.px, size: 128, viewBox: 24, absolute: true }), 128, 24, 24) - 2) < 1e-3)
})

test('the sticky key and the homepage hand-off carry the weight over', () => {
  assert.equal(stickyStrokeToken(2), '2u')
  assert.equal(stickyStrokePx('2u', null), 2)
  assert.equal(stickyStrokePx('4', null), 2)
  assert.equal(stickyStrokePx(null, '2'), 2)
  assert.equal(draftStrokePx(2), 2)
  assert.equal(draftStrokePx(0), null)
})

test('the range holds a 2px stroke saved at the largest custom size', () => {
  const v = customIconStroke({ stroke: 2, size: 1024, strokeUnit: 'px', svg: '<svg viewBox="0 0 24 24"/>' }).px
  assert.equal(v, clampStrokePx(v))
  assert.ok(v >= STROKE_PX.inputMin)
})

test('strokeable is decided from the artwork', () => {
  const lucide = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1"/></svg>'
  const solarLinear = '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1"/></g></svg>'
  const phosphor = '<svg viewBox="0 0 256 256"><path fill="currentColor" d="M1 1"/></svg>'
  const solarBold = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 1" opacity=".5"/></svg>'
  const pastedLoose = '<svg viewBox="0 0 24 24"><path stroke="#000" d="M1 1"/></svg>'
  const maskOnly = '<svg viewBox="0 0 24 24"><defs><mask id="m"><path stroke="#fff" d="M1 1"/></mask></defs><path fill="currentColor" d="M2 2"/></svg>'
  assert.equal(markupHasStroke(lucide), true)
  assert.equal(markupHasStroke(solarLinear), true)
  assert.equal(markupHasStroke(pastedLoose), true)
  assert.equal(markupHasStroke(phosphor), false)
  assert.equal(markupHasStroke(solarBold), false)
  assert.equal(markupHasStroke(maskOnly), false)
  assert.equal(markupHasStroke('<svg><path stroke="none" fill="#000"/></svg>'), false)
  assert.equal(markupHasStroke(''), false)
})

test('the library does not list Phosphor as a stroke pack, and wires the new model', () => {
  const page = readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /STROKE_PACKS = new Set\([^)]*'ph'/)
  assert.match(page, /strokeUnit: STROKE_UNIT_REF/)
  assert.match(page, /markupHasStroke\(rawBaseSvgText\)/)
})
