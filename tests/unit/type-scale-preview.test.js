import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fitTypePreviewSize,
  TYPE_PREVIEW_MAX_PX,
  TYPE_PREVIEW_MIN_PX,
  typePreviewNeedsFitting,
} from '../../src/utils/typeScalePreview.js'

test('extreme type-scale tokens are fitted only for rendering', () => {
  const exact = Array.from({ length: 10 }, (_, index) => ({
    px: 40 * Math.pow(3, 9 - index),
  }))

  assert.equal(exact[0].px, 787320)
  assert.equal(fitTypePreviewSize(exact[0].px), TYPE_PREVIEW_MAX_PX)
  assert.equal(fitTypePreviewSize(0.16), TYPE_PREVIEW_MIN_PX)
  assert.equal(fitTypePreviewSize(40), 40)
  assert.equal(typePreviewNeedsFitting(exact), true)
  assert.equal(exact[0].px, 787320, 'the exact token value is never mutated')
})
