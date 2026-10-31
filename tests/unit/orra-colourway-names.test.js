// Orra Workroom names its colourways by the OKLCH hue of the colour: a lookup table in
// OrraWorkroom.data.js (hueName), a "Pale" or "Dark" for the extremes of lightness, and a
// rule that no two colourways in one palette share a name. The names are what a shopper
// reads, so they are held here with fixed, hand-picked inputs and fixed expected words,
// not by working out the bucket the way the code does.
//
// Inputs are made with oklchToHex (L 0 to 1) and read back by hexToOklch (L 0 to 100), so a
// hex that rounds to the 8-bit grid is what the code really sees. Boundaries are tested a
// couple of degrees either side of the edge, because the hex grid moves a hue by up to a
// degree and a test that sat on the exact edge would be testing the rounding.
import test from 'node:test'
import assert from 'node:assert/strict'
import { hexToOklch } from '../../src/utils/colors.js'
import { derivePaletteRoles, oklchToHex } from '../../src/utils/palettePreviewRoles.js'
import { NATURAL, colourwayNames, colourways, hueName } from '../../src/components/palette/examples/OrraWorkroom.data.js'

/** A mid-lightness, clearly coloured hex at a hue. */
const at = (h, L = 0.6, C = 0.09) => oklchToHex(L, C, h)

// Hand-written from the table in the spec: the middle of each bucket and the word it must give.
const BUCKETS = [
  [10, 'Brick'], [35, 'Rust'], [70, 'Wattle'], [120, 'Saltbush'],
  [175, 'Lagoon'], [230, 'Harbour'], [290, 'Jacaranda'], [340, 'Musk'],
]

test('the middle of every hue bucket gets its name', () => {
  for (const [h, name] of BUCKETS) assert.equal(hueName(at(h)), name, `hue ${h}`)
})

test('the hex we build lands on the hue we asked for (so the bucket tests mean something)', () => {
  for (const [h] of BUCKETS) {
    const [, c, got] = hexToOklch(at(h))
    assert.ok(c >= 0.05, `hue ${h}: chroma ${c} is too low to name`)
    assert.ok(Math.abs(got - h) < 2, `hue ${h} came back as ${got}`)
  }
})

// The edges, lower bound inclusive: a colour just under an edge is the bucket below it,
// just over is the bucket above. 0 and 360 are the same edge.
const EDGES = [
  [20, 'Brick', 'Rust'], [50, 'Rust', 'Wattle'], [90, 'Wattle', 'Saltbush'], [150, 'Saltbush', 'Lagoon'],
  [200, 'Lagoon', 'Harbour'], [260, 'Harbour', 'Jacaranda'], [320, 'Jacaranda', 'Musk'], [360, 'Musk', 'Brick'],
]
for (const [edge, below, above] of EDGES) {
  test(`at ${edge} degrees ${below} turns into ${above}`, () => {
    assert.equal(hueName(at(edge - 3)), below, `${edge - 3} degrees`)
    assert.equal(hueName(at((edge + 3) % 360)), above, `${(edge + 3) % 360} degrees`)
  })
}

test('a colour with chroma under 0.03 is Natural at any hue, and one over 0.03 is not', () => {
  for (const h of [10, 70, 175, 230, 340]) {
    assert.equal(hueName(at(h, 0.6, 0.02)), 'Natural', `chroma 0.02 at ${h}`)
    assert.notEqual(hueName(at(h, 0.6, 0.045)), 'Natural', `chroma 0.045 at ${h}`)
  }
  assert.equal(hueName('#808080'), 'Natural', 'grey')
  assert.equal(hueName('#ffffff'), 'Natural', 'white')
  assert.equal(hueName('#000000'), 'Natural', 'black')
})

test('lightness over 80 adds Pale and under 35 adds Dark, and between them adds nothing', () => {
  const one = (L) => colourwayNames([at(230, L, 0.06)], [])[0]
  assert.equal(one(0.6), 'Harbour')
  assert.equal(one(0.85), 'Pale Harbour')
  assert.equal(one(0.25), 'Dark Harbour')
  // Either side of each limit.
  assert.equal(one(0.78), 'Harbour', 'L 78 is not pale')
  assert.equal(one(0.83), 'Pale Harbour', 'L 83 is pale')
  assert.equal(one(0.37), 'Harbour', 'L 37 is not dark')
  assert.equal(one(0.32), 'Dark Harbour', 'L 32 is dark')
})

test('the lightness test reads the colour on the 0 to 100 scale hexToOklch uses', () => {
  const pale = at(230, 0.85, 0.06)
  const dark = at(230, 0.25, 0.06)
  assert.ok(hexToOklch(pale)[0] > 80 && hexToOklch(pale)[0] < 90, `pale L ${hexToOklch(pale)[0]}`)
  assert.ok(hexToOklch(dark)[0] > 20 && hexToOklch(dark)[0] < 30, `dark L ${hexToOklch(dark)[0]}`)
})

test('two colours of one hue in a palette get different names, not the same word twice', () => {
  const names = colourwayNames([at(230, 0.6), at(230, 0.62), at(230, 0.58)])
  assert.equal(new Set(names).size, 3, names.join(', '))
  assert.equal(names[0], 'Harbour', 'the first keeps the plain name')
  assert.ok(!names.includes('Natural'))
})

test('a name already taken by an earlier colourway takes the modifier that fits its lightness', () => {
  assert.deepEqual(colourwayNames([at(230, 0.6), at(230, 0.62)], []), ['Harbour', 'Pale Harbour'], 'light-ish second one goes Pale')
  assert.deepEqual(colourwayNames([at(230, 0.6), at(230, 0.4)], []), ['Harbour', 'Dark Harbour'], 'dark-ish second one goes Dark')
})

test('names run out of words and fall back to a numeral, and stay unique', () => {
  const same = Array.from({ length: 5 }, () => at(230, 0.6))
  const names = colourwayNames(same, [])
  assert.equal(new Set(names).size, 5, names.join(', '))
  assert.ok(names.some((n) => /\b2\b/.test(n)), `a numeral was used: ${names.join(', ')}`)
})

test('the fixed Natural is spoken for: a grey palette colour is never called plain Natural', () => {
  assert.equal(NATURAL.name, 'Natural')
  const names = colourwayNames(['#808080', '#999999', '#555555'])
  assert.ok(!names.includes('Natural'), names.join(', '))
  assert.equal(new Set(names).size, 3, names.join(', '))
})

// The palettes the previews are tested with, plus a grey one and one that is one hue throughout.
const PALETTES = {
  mid: ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6'],
  pale: ['#f3e9d2', '#f7dcd0', '#e4efe0', '#dfe9f5', '#f2e4f0'],
  dark: ['#0d1b2a', '#1b263b', '#2b3a55', '#3a2e5a', '#16100f'],
  red: ['#c8321e', '#e8a33d', '#2f6b4f', '#f1d9c4', '#4a1d1d'],
  grey: ['#333333', '#666666', '#999999', '#cccccc', '#eeeeee'],
  mono: ['#1e50c8', '#2a5fd6', '#3a6ee0', '#5b89d7', '#8aaaf0'],
}

for (const [name, colors] of Object.entries(PALETTES)) {
  for (const mode of ['light', 'dark']) {
    test(`${name} palette, ${mode}: four colourways, the last one Natural, no name twice, and the palette ones never plain Natural`, () => {
      const ways = colourways(derivePaletteRoles(colors, { mode }))
      assert.equal(ways.length, 4)
      assert.deepEqual(ways[3], NATURAL)
      assert.deepEqual(ways.slice(0, 3).map((w) => w.role), ['primary', 'secondary', 'deep'])
      const names = ways.map((w) => w.name)
      assert.equal(new Set(names).size, 4, names.join(', '))
      for (const w of ways.slice(0, 3)) {
        assert.notEqual(w.name, 'Natural', `${w.role} is called Natural`)
        assert.match(w.color, /^#[0-9a-f]{6}$/i)
      }
    })
  }
}
