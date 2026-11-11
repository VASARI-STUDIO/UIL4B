// inkOnField, fieldEdge and brandAsText: the three helpers an example uses when
// it spends a brand colour on a big area, measured as numbers over many
// generated palettes in both modes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, hslToHex } from '../../src/utils/colors.js'
import {
  brandAsText, derivePaletteRoles, fieldEdge, FIELD_EDGE_RATIO, inkOnField,
} from '../../src/utils/palettePreviewRoles.js'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const palette = (rnd) => {
  const h = Math.floor(rnd() * 360)
  return Array.from({ length: 5 }, (_, i) => hslToHex((h + i * 37) % 360, 10 + rnd() * 85, 6 + rnd() * 88))
}

test('inkOnField clears its floor for 8,000 palettes x 2 modes, body and large', () => {
  const rnd = mulberry32(27102026)
  const misses = []
  for (let i = 0; i < 8000; i++) {
    const pal = palette(rnd)
    for (const mode of ['light', 'dark']) {
      const r = derivePaletteRoles(pal, { mode })
      for (const large of [false, true]) {
        const floor = large ? 3 : 4.5
        // The derived inks nearly always pass at the first step, which would leave the
        // neutral and pole steps unrun. So each palette is also tried with the on-ink
        // set to the fill itself (forces neutral) and with every ink set to the fill
        // (forces the pole), the cases a hand-picked brand colour can produce.
        const inkSets = [
          { on: r.onPrimary, text: r.text, canvas: r.canvas },
          { on: r.primary, text: r.text, canvas: r.canvas },
          { on: r.primary, text: r.primary, canvas: r.primary },
        ]
        for (const inks of inkSets) {
          const got = inkOnField(r.primary, inks, { large })
          const real = contrastRatio(got.hex, r.primary)
          if (real < floor - 1e-9) misses.push(`${pal[0]} ${mode} large=${large} ${got.hex} ${real.toFixed(3)}`)
          assert.ok(['on', 'neutral', 'pole'].includes(got.step))
        }
      }
    }
  }
  assert.deepEqual(misses.slice(0, 5), [])
})

test('inkOnField takes the on-ink first, then neutrals, then a pole', () => {
  assert.equal(inkOnField('#202020', { on: '#ffffff', text: '#111111', canvas: '#fafafa' }).step, 'on')
  assert.equal(inkOnField('#202020', { on: '#222222', text: '#111111', canvas: '#fafafa' }).step, 'neutral')
  const pole = inkOnField('#777777', { on: '#808080', text: '#707070', canvas: '#7a7a7a' })
  assert.equal(pole.step, 'pole')
  assert.ok(pole.ratio >= 4.5)
})

test('fieldEdge is the edge colour exactly when the field is within 1.25:1 of the canvas', () => {
  const rnd = mulberry32(5)
  for (let i = 0; i < 4000; i++) {
    const pal = palette(rnd)
    for (const mode of ['light', 'dark']) {
      const r = derivePaletteRoles(pal, { mode })
      const edge = fieldEdge(r.primary, r.canvas, r.borderStrong)
      const close = contrastRatio(r.primary, r.canvas) < FIELD_EDGE_RATIO
      assert.equal(edge, close ? r.borderStrong : 'transparent', `${pal[0]} ${mode}`)
    }
  }
  assert.equal(fieldEdge('#f4f4f4', '#f7f7f7', '#cccccc'), '#cccccc')
  assert.equal(fieldEdge('#101010', '#f7f7f7', '#cccccc'), 'transparent')
})

test('brandAsText keeps the user hex where it reads and flags the step darker where it does not', () => {
  const grounds = ['#ffffff', '#f6f6f6']
  const keep = brandAsText('#1a3a8a', grounds)
  assert.equal(keep.hex, '#1a3a8a')
  assert.equal(keep.adjusted, false)
  const moved = brandAsText('#ffd23f', grounds)
  assert.equal(moved.adjusted, true)
  assert.notEqual(moved.hex, '#ffd23f')
  assert.ok(moved.ratio >= 4.5)
  for (const g of grounds) assert.ok(contrastRatio(moved.hex, g) >= 4.5 - 1e-9)
  assert.equal(brandAsText('#ffd23f', grounds, { large: true }).adjusted, true)
})
