import test from 'node:test'
import assert from 'node:assert/strict'
import { listPaints, remapPaints, isMulticolourSvg } from '../../src/utils/iconPaint.js'

const TWO = '<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M0 0"/><path fill="#00f" d="M1 1"/><path fill="#ff0000" d="M2 2"/></svg>'

test('listPaints: one entry per distinct colour, first-appearance order, case and short hex folded', () => {
  assert.deepEqual(listPaints(TWO), ['#ff0000', '#0000ff'])
})

test('listPaints: black, white and rgb() fold to hex; gradients and none are not listed', () => {
  const svg = '<svg><path fill="black"/><path fill="white"/><path fill="rgb(255, 0, 0)"/><path fill="url(#g)"/><path fill="none" stroke="#FFF"/></svg>'
  assert.deepEqual(listPaints(svg), ['#000000', '#ffffff', '#ff0000'])
})

test('listPaints: shapes with no paint count as black', () => {
  assert.deepEqual(listPaints('<svg><path d="M0 0"/><path fill="#f00"/></svg>'), ['#f00'.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3'), '#000000'])
})

test('listPaints: empty input', () => {
  assert.deepEqual(listPaints(''), [])
  assert.deepEqual(listPaints(null), [])
})

test('remapPaints: changes one colour in every place it is used and leaves the others', () => {
  const out = remapPaints(TWO, { '#ff0000': '#123456' })
  assert.equal(out.match(/#123456/g).length, 2)
  assert.ok(out.includes('fill="#00f"'))
  assert.ok(!/#ff0000/i.test(out))
})

test('remapPaints: reaches inline style declarations and strokes, keeping !important', () => {
  const svg = '<svg><path style="fill:#f00 !important;stroke:#0000ff"/></svg>'
  const out = remapPaints(svg, { '#ff0000': '#111111', '#0000ff': '#222222' })
  assert.ok(out.includes('fill:#111111 !important'))
  assert.ok(out.includes('stroke:#222222'))
})

test('remapPaints: default black (unpainted shapes) is recoloured through the root fill', () => {
  const out = remapPaints('<svg viewBox="0 0 24 24"><path d="M0 0"/><path fill="#f00" d="M1 1"/></svg>', { '#000000': '#abcdef' })
  assert.match(out, /<svg[^>]*fill="#abcdef"/)
  assert.ok(out.includes('fill="#f00"'))
})

test('remapPaints: an empty map or an unchanged colour returns the artwork as it was', () => {
  assert.equal(remapPaints(TWO, {}), TWO)
  assert.equal(remapPaints(TWO, { '#ff0000': '#ff0000' }), TWO)
})

test('remapPaints: result is still multicolour art and lists the new colour', () => {
  const out = remapPaints(TWO, { '#ff0000': '#123456' })
  assert.equal(isMulticolourSvg(out), true)
  assert.deepEqual(listPaints(out), ['#123456', '#0000ff'])
})
