import assert from 'node:assert/strict'
import test from 'node:test'
import { detectCanvasFontRendered } from '../../src/utils/fontDetection.js'

function contextFor(mode) {
  return {
    font: '',
    measureText() {
      const generic = this.font.includes('monospace')
        ? 'monospace'
        : this.font.includes('sans-serif') ? 'sans-serif' : 'serif'
      const baseline = { monospace: 100, serif: 110, 'sans-serif': 120 }[generic]
      const target = this.font.includes('"Lora"')
      const differs = mode === 'loaded' || (mode === 'mixed' && generic === 'monospace')
      return { width: baseline + (target && differs ? 20 : 0) }
    },
  }
}

test('multi-baseline font evidence accepts only unanimous differences', () => {
  assert.equal(detectCanvasFontRendered(contextFor('loaded'), 'Lora'), true)
  assert.equal(detectCanvasFontRendered(contextFor('fallback'), 'Lora'), false)
  assert.equal(detectCanvasFontRendered(contextFor('mixed'), 'Lora'), null)
})

test('unavailable or invalid canvas evidence stays inconclusive', () => {
  assert.equal(detectCanvasFontRendered(null, 'Lora'), null)
  assert.equal(detectCanvasFontRendered({ measureText: () => ({ width: Number.NaN }) }, 'Lora'), null)
  assert.equal(detectCanvasFontRendered({ measureText: () => { throw new Error('canvas unavailable') } }, 'Lora'), null)
})
