// Picking a palette from an image: the extraction, ranking and sampling maths
// in utils/imagePalette. Everything runs on synthetic RGBA arrays, so each
// image has a known right answer.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIN_DELTA,
  averageHex,
  clusterImage,
  colourDistance,
  colourShares,
  extractPalette,
  hexToRgb,
  nextCandidate,
  oklabToRgb,
  pickPalette,
  rankClusters,
  rgbToHex,
  rgbToOklab,
} from '../../src/utils/imagePalette.js'

// Build an image from a function (x, y) -> [r, g, b, a?].
function image(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = paint(x, y)
      const i = (y * width + x) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
    }
  }
  return { data, width, height }
}

const rgbAt = (img, x, y) => {
  const i = (y * img.width + x) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2]]
}
const hex = (h) => hexToRgb(h)
const RED = '#DC283C'
const BLUE = '#1E5AC8'
const GREY = '#8A8F96'
const ORANGE = '#F08030'

test('OKLab conversion round-trips an sRGB colour', () => {
  for (const h of ['#000000', '#FFFFFF', '#FF0000', '#12AB9C', '#F08030']) {
    const [r, g, b] = hex(h)
    assert.equal(rgbToHex(...oklabToRgb(...rgbToOklab(r, g, b))), h)
  }
})

test('a transparent logo gives the logo colours, not black', () => {
  const logo = image(40, 40, (x, y) => {
    if (y < 14) return [255, 215, 0, 255]
    if (y < 24) return [30, 90, 200, 255]
    return [0, 0, 0, 0]
  })
  const { status, colours } = extractPalette(logo, 5)
  assert.equal(status, 'ok')
  assert.deepEqual(colours.map((c) => c.hex).sort(), ['#1E5AC8', '#FFD700'])
  assert.ok(colours.every((c) => c.hex !== '#000000'))
})

test('semi-transparent pixels below half opacity are ignored', () => {
  const img = image(20, 20, (x) => (x < 10 ? [220, 40, 60, 255] : [0, 0, 0, 100]))
  const { colours } = extractPalette(img, 4)
  assert.deepEqual(colours.map((c) => c.hex), ['#DC283C'])
})

test('a fully transparent image reports it and offers no colours', () => {
  const { status, colours } = extractPalette(image(30, 30, () => [0, 0, 0, 0]), 5)
  assert.equal(status, 'transparent')
  assert.equal(colours.length, 0)
})

test('a single-colour image reports itself as flat with one colour', () => {
  const { status, colours } = extractPalette(image(30, 30, () => hex('#FFFFFF')), 5)
  assert.equal(status, 'flat')
  assert.deepEqual(colours.map((c) => c.hex), ['#FFFFFF'])
})

test('an empty image does not throw', () => {
  assert.equal(extractPalette({ data: new Uint8ClampedArray(0), width: 0, height: 0 }, 5).status, 'empty')
})

test('colours come back dominant first, with the right shares', () => {
  const img = image(50, 40, (x) => (x < 30 ? hex(RED) : x < 45 ? hex(BLUE) : hex(GREY)))
  const { colours } = extractPalette(img, 3)
  assert.deepEqual(colours.map((c) => c.hex), [RED, BLUE, GREY])
  assert.ok(Math.abs(colours[0].share - 0.6) < 0.01)
  assert.ok(colours[0].share > colours[1].share && colours[1].share > colours[2].share)
})

test('each colour carries the position of a pixel of that colour', () => {
  const img = image(60, 40, (x) => (x < 20 ? hex(RED) : x < 40 ? hex(BLUE) : hex(GREY)))
  const { colours } = extractPalette(img, 3)
  for (const c of colours) {
    assert.deepEqual(rgbAt(img, c.px, c.py), hex(c.hex))
    assert.ok(c.x > 0 && c.x < 1 && c.y > 0 && c.y < 1)
  }
  // Three vertical bands: the markers cannot share a spot.
  const spots = new Set(colours.map((c) => `${c.px},${c.py}`))
  assert.equal(spots.size, 3)
})

test('a ring of one colour puts its marker on the ring, not in the empty middle', () => {
  const img = image(61, 61, (x, y) => {
    const d = Math.hypot(x - 30, y - 30)
    return d > 20 && d < 28 ? hex(RED) : hex(BLUE)
  })
  const { colours } = extractPalette(img, 2)
  const red = colours.find((c) => c.hex === RED)
  assert.deepEqual(rgbAt(img, red.px, red.py), hex(RED))
})

test('a small vivid accent survives among large neutral areas', () => {
  const img = image(100, 100, (x, y) => {
    if (x < 14 && y < 14) return hex(ORANGE)               // about 2% of the picture
    return y < 50 ? hex('#5C6B80') : hex('#2A303A')
  })
  const { colours } = extractPalette(img, 3)
  assert.ok(colours.some((c) => colourDistance(c.hex, ORANGE) < 0.02), colours.map((c) => c.hex).join(' '))
})

test('no two colours are closer than the merge distance', () => {
  // A smooth gradient with grain: lots of near-identical shades.
  let seed = 7
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const img = image(80, 60, (x, y) => {
    const n = (rnd() - 0.5) * 8
    return [60 + x + n, 90 + y + n, 150 - x / 2 + n]
  })
  const { colours } = extractPalette(img, 8)
  for (let i = 0; i < colours.length; i++) {
    for (let j = i + 1; j < colours.length; j++) {
      assert.ok(colourDistance(colours[i].hex, colours[j].hex) >= MIN_DELTA - 0.005,
        `${colours[i].hex} and ${colours[j].hex} are too close`)
    }
  }
})

test('the same image always gives the same answer', () => {
  const img = image(70, 50, (x, y) => [(x * 5) % 256, (y * 7) % 256, ((x + y) * 3) % 256])
  assert.deepEqual(extractPalette(img, 6), extractPalette(img, 6))
  assert.deepEqual(extractPalette(img, 6, { seed: 5 }), extractPalette(img, 6, { seed: 5 }))
})

test('an image bigger than the sample cap is read on a grid and still finds its colours', () => {
  const img = image(900, 700, (x) => (x < 600 ? hex(RED) : hex(BLUE)))
  const { colours } = extractPalette(img, 2)
  assert.deepEqual(colours.map((c) => c.hex), [RED, BLUE])
  assert.ok(colours[0].x < 0.7 && colours[1].x > 0.6)
})

test('asking for fewer colours returns the same leaders', () => {
  const img = image(80, 40, (x) => [hex(RED), hex(BLUE), hex(GREY), hex(ORANGE)][Math.floor(x / 20)])
  const { clusters } = clusterImage(img, { count: 4 })
  const long = rankClusters(clusters, { limit: 4 }).map((c) => c.hex)
  const short = rankClusters(clusters, { limit: 2 }).map((c) => c.hex)
  assert.deepEqual(short, long.slice(0, 2))
})

test('mood changes which colour leads', () => {
  const img = image(40, 40, (x, y) => {
    if (y < 20) return x < 20 ? hex('#101A3A') : hex('#F4E04D')
    return x < 20 ? hex('#7A8088') : hex('#1F8A6B')
  })
  const { clusters } = clusterImage(img, { count: 4 })
  assert.equal(rankClusters(clusters, { mood: 'bright' })[0].hex, '#F4E04D')
  assert.equal(rankClusters(clusters, { mood: 'dark' })[0].hex, '#101A3A')
  assert.equal(rankClusters(clusters, { mood: 'muted' })[0].hex, '#7A8088')
})

test('nextCandidate skips colours already on the board and runs out honestly', () => {
  const img = image(60, 40, (x) => (x < 30 ? hex(RED) : x < 50 ? hex(BLUE) : hex(GREY)))
  const { ranked } = extractPalette(img, 3)
  assert.equal(nextCandidate(ranked, [RED, BLUE]).hex, GREY)
  assert.equal(nextCandidate(ranked, [RED, BLUE, GREY]), null)
  // A colour a hair off one already placed still counts as placed.
  assert.equal(nextCandidate(ranked, ['#DC283D', BLUE, GREY]), null)
})

test('pickPalette orders by share, not by ranking', () => {
  const ranked = [
    { hex: '#111111', share: 0.1, rank: 0 },
    { hex: '#222222', share: 0.6, rank: 1 },
    { hex: '#333333', share: 0.3, rank: 2 },
  ]
  assert.deepEqual(pickPalette(ranked, 3).map((c) => c.hex), ['#222222', '#333333', '#111111'])
  assert.deepEqual(pickPalette(ranked, 2).map((c) => c.hex), ['#222222', '#111111'])
})

test('colourShares gives each colour its nearest-pixel share', () => {
  const img = image(40, 10, (x) => (x < 30 ? hex(RED) : hex(BLUE)))
  const [red, blue] = colourShares(img, [RED, BLUE])
  assert.ok(Math.abs(red - 0.75) < 0.01 && Math.abs(blue - 0.25) < 0.01)
  // A marker moved onto a different colour is measured by where it is now.
  assert.deepEqual(colourShares(img, [BLUE, RED]).map((v) => Math.round(v * 100)), [25, 75])
})

test('averageHex reads a neighbourhood, skips transparent pixels, and clips at the edge', () => {
  const img = image(9, 9, (x, y) => ((x + y) % 2 ? [200, 0, 0] : [100, 0, 0]))
  assert.equal(averageHex(img.data, 9, 9, 4, 4, 2), '#940000')   // mean of 13 x 100 and 12 x 200 is 148
  const holes = image(5, 5, (x) => (x < 2 ? [0, 0, 0, 0] : [10, 20, 30, 255]))
  assert.equal(averageHex(holes.data, 5, 5, 2, 2, 2), '#0A141E')
  assert.equal(averageHex(holes.data, 5, 5, 0, 0, 1), null)
  assert.equal(averageHex(img.data, 9, 9, 0, 0, 2), '#900000')   // a 3x3 corner window
})
