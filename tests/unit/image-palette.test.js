// Picking a palette from an image: the extraction, ranking and sampling maths
// in utils/imagePalette. Everything runs on synthetic RGBA arrays, so each
// image has a known right answer.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIN_DELTA,
  appendPicks,
  averageHex,
  clusterImage,
  colourDistance,
  colourShares,
  extractPalette,
  hexToRgb,
  isTruncatedPng,
  nextCandidate,
  oklabToRgb,
  pickPalette,
  placePicks,
  rankClusters,
  rgbToHex,
  rgbToOklab,
  sampleRadius,
  visibleShare,
} from '../../src/utils/imagePalette.js'
import * as palette from '../../src/utils/imagePalette.js'

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

test('a flat page with a tiny accent keeps the accent', () => {
  // 0.33% of the picture: a 40px square on 800x600, scaled down to 200x150.
  const img = image(200, 150, (x, y) => (x >= 150 && x < 160 && y >= 105 && y < 115 ? hex('#FF5A1F') : hex('#FFFFFF')))
  const { colours } = extractPalette(img, 5)
  assert.ok(colours.some((c) => colourDistance(c.hex, '#FF5A1F') < 0.02), colours.map((c) => c.hex).join(' '))
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

// ── Flat art, small images and damaged files ─────────────────────────────────

const deltaE = (a, b) => colourDistance(a, b) * 100        // OKLab x 100: about 1 is barely visible
const TEAL = [42, 157, 143]
const YELLOW = [233, 196, 106]
const CORAL = [231, 111, 81]
const mix = (a, b) => a.map((v, i) => Math.round((v + b[i]) / 2))

// Three flat colours side by side on a transparent page, with the two things a
// real logo has: a one-pixel blend where two colours meet, and a rim of partly
// transparent pixels round the outside.
function logo() {
  return image(64, 64, (x, y) => {
    if (x < 5 || x > 58 || y < 5 || y > 58) return [0, 0, 0, 0]
    if (x === 5 || x === 58 || y === 5 || y === 58) return [...(x < 23 ? TEAL : x < 42 ? YELLOW : CORAL), 150]
    if (x === 22) return [...mix(TEAL, YELLOW), 255]
    if (x === 41) return [...mix(YELLOW, CORAL), 255]
    return [...(x < 22 ? TEAL : x < 41 ? YELLOW : CORAL), 255]
  })
}

test('a logo with anti-aliased edges and a transparent page gives exactly its three colours', () => {
  const { status, colours } = extractPalette(logo(), 5)
  assert.equal(status, 'ok')
  assert.equal(colours.length, 3, colours.map((c) => c.hex).join(' '))
  for (const want of [TEAL, YELLOW, CORAL]) {
    const hexWant = rgbToHex(...want)
    assert.ok(colours.some((c) => deltaE(c.hex, hexWant) <= 2), `${hexWant} is missing from ${colours.map((c) => c.hex).join(' ')}`)
  }
})

test('every marker of a logo stands inside a flat area, so the readout is the colour', () => {
  const img = logo()
  const { colours } = extractPalette(img, 5)
  for (const c of colours) {
    // The 5x5 window round the marker is one colour all the way.
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        assert.deepEqual(rgbAt(img, c.px + dx, c.py + dy), hex(c.hex), `${c.hex} marker at ${c.px},${c.py}`)
      }
    }
  }
})

test('a faded image with no fully opaque area still gives its colours', () => {
  const img = image(30, 30, (x) => (x < 15 ? [...hex(RED), 200] : [...hex(BLUE), 200]))
  const { colours } = extractPalette(img, 4)
  assert.deepEqual(colours.map((c) => c.hex).sort(), [BLUE, RED].sort())
})

test('an 8x8 image of four blocks gives its four colours exactly', () => {
  const blocks = [hex('#E63946'), hex('#2A9D8F'), hex('#E9C46A'), hex('#264653')]
  const img = image(8, 8, (x, y) => blocks[(y < 4 ? 0 : 2) + (x < 4 ? 0 : 1)])
  const { colours } = extractPalette(img, 5)
  assert.deepEqual(colours.map((c) => c.hex).sort(), ['#264653', '#2A9D8F', '#E63946', '#E9C46A'])
})

test('on a tiny image a marker reads the one pixel it stands on, not its neighbours', () => {
  const blocks = [hex('#E63946'), hex('#2A9D8F'), hex('#E9C46A'), hex('#264653')]
  const img = image(8, 8, (x, y) => blocks[(y < 4 ? 0 : 2) + (x < 4 ? 0 : 1)])
  assert.equal(sampleRadius(8, 8), 0)
  const r = sampleRadius(img.width, img.height)
  assert.equal(averageHex(img.data, 8, 8, 1, 1, r), '#E63946')
  assert.equal(averageHex(img.data, 8, 8, 6, 6, r), '#264653')
  // The old fixed 5x5 window crossed into the next block here.
  assert.notEqual(averageHex(img.data, 8, 8, 3, 3, 2), '#E63946')
})

test('the sample radius grows with the image and tops out at 2', () => {
  assert.equal(sampleRadius(8, 8), 0)
  assert.equal(sampleRadius(500, 31), 0)       // the short side decides
  assert.equal(sampleRadius(32, 32), 1)
  assert.equal(sampleRadius(63, 400), 1)
  assert.equal(sampleRadius(64, 64), 2)
  assert.equal(sampleRadius(4000, 3000), 2)
})

test('a flat single-colour image returns that one colour, exactly', () => {
  const { status, colours } = extractPalette(image(40, 40, () => hex('#336699')), 5)
  assert.equal(status, 'flat')
  assert.equal(colours.length, 1)
  assert.equal(colours[0].hex, '#336699')
})

test('a five-band flag with a little noise stays within a barely visible step of each band', () => {
  // Channel values sit mid-bucket (3 mod 8) so +-2 of noise never changes bucket.
  const bands = [[227, 59, 67], [243, 251, 235], [171, 219, 227], [67, 123, 163], [27, 51, 91]]
  let seed = 11
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const img = image(100, 100, (x, y) => bands[Math.floor(y / 20)].map((v) => v + Math.round((rnd() - 0.5) * 4)))
  const { colours } = extractPalette(img, 5)
  assert.equal(colours.length, 5, colours.map((c) => c.hex).join(' '))
  for (const band of bands) {
    const want = rgbToHex(...band)
    assert.ok(colours.some((c) => deltaE(c.hex, want) <= 1), `${want} is missing from ${colours.map((c) => c.hex).join(' ')}`)
  }
})

test('visibleShare tells an empty image from one with something in it', () => {
  assert.equal(visibleShare(image(20, 20, () => [0, 0, 0, 0])), 0)
  assert.equal(visibleShare(image(20, 20, () => [9, 9, 9, 255])), 1)
  assert.equal(visibleShare(image(20, 20, (x) => (x < 5 ? [9, 9, 9, 255] : [9, 9, 9, 60]))), 0.25)
  assert.equal(visibleShare({ data: new Uint8ClampedArray(0), width: 0, height: 0 }), 0)
})

test('averageHex prefers fully opaque pixels over the soft rim beside them', () => {
  const img = image(5, 5, (x) => (x < 2 ? [...hex(RED), 255] : [...hex(BLUE), 180]))
  assert.equal(averageHex(img.data, 5, 5, 2, 2, 2), RED)
  const soft = image(5, 5, () => [...hex(BLUE), 180])
  assert.equal(averageHex(soft.data, 5, 5, 2, 2, 2), BLUE)
})

// ── Flat art must not swallow what is not flat ───────────────────────────────

const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)))
const noise = (seed0) => {
  let seed = seed0
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}
const has = (colours, want, within = 2) => colours.some((c) => deltaE(c.hex, want) <= within)
const list = (colours) => colours.map((c) => c.hex).join(' ')

test('a grainy photo on a plain white page is not flat art, and the photo keeps its colours', () => {
  // The photo covers 30% of the picture, +-6 of grain; no 3x3 patch of it is flat.
  const rnd = noise(7)
  const W = 384, H = 256
  const bw = Math.sqrt(0.3) * W, bh = Math.sqrt(0.3) * H
  const x0 = (W - bw) / 2, y0 = (H - bh) / 2
  const img = image(W, H, (x, y) => {
    if (x < x0 || x >= x0 + bw || y < y0 || y >= y0 + bh) return [255, 255, 255]
    const t = (x - x0) / bw
    return [clamp8(200 - 100 * t + 12 * (rnd() - 0.5)), clamp8(120 + 60 * Math.sin(y / 20) + 12 * (rnd() - 0.5)), clamp8(60 + 100 * t + 12 * (rnd() - 0.5))]
  })
  const { status, colours } = extractPalette(img, 5)
  assert.notEqual(status, 'flat')
  assert.ok(colours.length > 2, list(colours))
  assert.ok(colours.some((c) => c.hex !== '#FFFFFF' && colourDistance(c.hex, '#FFFFFF') > 0.1), list(colours))
})

test('a screenshot with a photo thumbnail keeps a colour of the thumbnail', () => {
  const rnd = noise(3)
  const thumb = [150, 100, 70]
  const img = image(384, 256, (x, y) => {
    if (x < 60) return [30, 30, 40]                                   // dark sidebar
    if (x >= 100 && x < 240 && y >= 60 && y < 142) {                  // 11% photo
      return [clamp8(thumb[0] + 20 * Math.sin(x / 15) + 30 * (rnd() - 0.5)), clamp8(thumb[1] + 20 * Math.cos(y / 12) + 30 * (rnd() - 0.5)), clamp8(thumb[2] + 30 * (rnd() - 0.5))]
    }
    return [250, 250, 250]
  })
  const { colours } = extractPalette(img, 6)
  assert.ok(has(colours, rgbToHex(...thumb), 8), list(colours))
})

test('a one-pixel line on a white page is a colour of the picture', () => {
  const img = image(384, 256, (x, y) => (y === 128 ? hex('#DC1E1E') : hex('#FFFFFF')))
  const { colours } = extractPalette(img, 5)
  assert.ok(has(colours, '#DC1E1E'), list(colours))
  assert.ok(has(colours, '#FFFFFF'), list(colours))
})

test('a line chart of three two-pixel lines gives all three line colours', () => {
  const lines = [[220, 40, 40], [40, 160, 60], [40, 60, 220]]
  const img = image(384, 256, (x, y) => {
    const at = [x * 0.3 + 20, 200 - x * 0.2, 128 + 30 * Math.sin(x / 20)]
    for (let k = 0; k < 3; k++) if (Math.abs(y - at[k]) < 1) return lines[k]
    return [255, 255, 255]
  })
  const { colours } = extractPalette(img, 5)
  for (const line of lines) assert.ok(has(colours, rgbToHex(...line)), `${rgbToHex(...line)} missing from ${list(colours)}`)
})

test('a button with one-pixel black text keeps the black', () => {
  const img = image(384, 256, (x, y) => {
    if (x < 100 || x >= 260 || y < 100 || y >= 140) return [255, 255, 255]
    return x % 6 === 0 && y >= 110 && y < 130 ? [0, 0, 0] : [30, 90, 220]
  })
  const { colours } = extractPalette(img, 5)
  assert.ok(has(colours, '#000000'), list(colours))
  assert.ok(has(colours, '#1E5ADC'), list(colours))
})

test('a 12px red accent on a 384x288 page is kept', () => {
  // 0.13% of the picture, and only 100 of its 144 pixels have a flat 3x3 around them.
  const img = image(384, 288, (x, y) => (x >= 20 && y >= 20 && x < 32 && y < 32 ? hex('#FF0000') : hex('#F0F0F0')))
  const { colours } = extractPalette(img, 5)
  assert.ok(has(colours, '#FF0000'), list(colours))
})

test('a mostly translucent area beside a smaller solid one keeps both colours', () => {
  // 70% blue at alpha 180, 30% solid white: the white must not cancel the blue.
  const img = image(200, 200, (x) => (x < 140 ? [40, 80, 220, 180] : [255, 255, 255, 255]))
  const { colours } = extractPalette(img, 5)
  assert.ok(has(colours, '#2850DC'), list(colours))
  assert.ok(has(colours, '#FFFFFF'), list(colours))
  assert.equal(colours.length, 2, list(colours))
})

test('a one-pixel line over an anti-aliased edge does not turn the blends into colours', () => {
  // A red disc with a soft edge on white, plus a 1px black line: three colours, no pinks.
  const img = image(300, 200, (x, y) => {
    if (y === 20) return [0, 0, 0]
    const t = Math.max(0, Math.min(1, 70 - Math.hypot(x - 150, y - 110) + 0.5))
    return [255, 255, 255].map((v, k) => Math.round(v * (1 - t) + [220, 40, 40][k] * t))
  })
  const { colours } = extractPalette(img, 8)
  assert.equal(colours.length, 3, list(colours))
})

test('a PNG with no IEND chunk is cut short; a complete one, or a non-PNG, is not', () => {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const iend = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]
  assert.equal(isTruncatedPng(signature, new Array(64).fill(0xab)), true)
  assert.equal(isTruncatedPng(signature, [...new Array(52).fill(7), ...iend]), false)
  assert.equal(isTruncatedPng([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0], new Array(64).fill(0xab)), false)
  assert.equal(isTruncatedPng([1, 2, 3], []), false)
})

// A tiny PNG-shaped byte string: the signature, some data, an IEND chunk and
// `after` more bytes (a valid file can carry metadata or padding after IEND).
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const pngBytes = ({ after = 0, cut = false } = {}) => {
  const iend = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]
  return Uint8Array.from([...PNG_SIGNATURE, ...new Array(200).fill(7), ...(cut ? [] : iend), ...new Array(after).fill(0)])
}

test('a PNG with 100 bytes after IEND is not called damaged, and one cut before IEND is', async () => {
  // The picker reads the whole file, so the check sees what follows IEND.
  assert.equal(await palette.isCutShort(new Blob([pngBytes({ after: 100 })])), false)
  assert.equal(await palette.isCutShort(new Blob([pngBytes({ after: 5000 })])), false)
  assert.equal(await palette.isCutShort(new Blob([pngBytes({ cut: true })])), true)
  assert.equal(await palette.isCutShort(new Blob([new Uint8Array(500).fill(0xab)])), false)   // not a PNG
  assert.equal(await palette.isCutShort(new Blob([])), false)
  const rest = (bytes) => bytes.slice(PNG_SIGNATURE.length)
  assert.equal(isTruncatedPng(PNG_SIGNATURE, rest(pngBytes({ after: 100 }))), false)
  assert.equal(isTruncatedPng(PNG_SIGNATURE, rest(pngBytes({ cut: true }))), true)
})

// ── Putting picks on a board ─────────────────────────────────────────────────

const BOARD = ['#111111', '#222222', '#333333', '#444444']
const PICKS = ['#AA0001', '#AA0002', '#AA0003']

test('placePicks keeps each locked colour in its own slot and fills the rest in order', () => {
  const plan = placePicks(BOARD, [1, 3], PICKS, 8)
  assert.deepEqual(plan.colours, ['#AA0001', '#222222', '#AA0002', '#444444', '#AA0003'])
  assert.deepEqual([...plan.locked].sort(), [1, 3])
  assert.equal(plan.used, 3)
  assert.equal(plan.trimmed, 0)
})

test('placePicks with no locks gives exactly the picks, with no old colours left over', () => {
  const plan = placePicks(BOARD, [], PICKS, 8)
  assert.deepEqual(plan.colours, PICKS)
  assert.equal(plan.locked.size, 0)
})

test('placePicks trims the picks to what the cap leaves after the locks, and counts the cut', () => {
  const picks = ['#B00001', '#B00002', '#B00003', '#B00004', '#B00005', '#B00006', '#B00007']
  const plan = placePicks(BOARD, [0, 2], picks, 8)
  assert.equal(plan.colours.length, 8)
  assert.equal(plan.used, 6)
  assert.equal(plan.trimmed, 1)
  assert.equal(plan.colours[0], '#111111')
  assert.equal(plan.colours[2], '#333333')
  assert.deepEqual(plan.colours.filter((_, i) => i !== 0 && i !== 2), picks.slice(0, 6))
  assert.ok(!plan.colours.includes('#B00007'))
})

test('placePicks moves a lock that is past the end of the new board to a free slot', () => {
  const six = ['#010101', '#020202', '#030303', '#040404', '#050505', '#060606']
  const one = placePicks(six, [5], ['#C00001', '#C00002'], 8)
  assert.deepEqual(one.colours, ['#C00001', '#C00002', '#060606'])
  assert.deepEqual([...one.locked], [2])
  // Two such locks keep their order among themselves.
  const two = placePicks(six, [4, 5], ['#C00001'], 8)
  assert.deepEqual(two.colours, ['#C00001', '#050505', '#060606'])
  assert.deepEqual([...two.locked].sort(), [1, 2])
})

test('placePicks ignores a repeated, negative or missing lock index', () => {
  const plan = placePicks(BOARD, [1, 1, -1, 9], PICKS, 8)
  assert.deepEqual(plan.colours, ['#AA0001', '#222222', '#AA0002', '#AA0003'])
  assert.deepEqual([...plan.locked], [1])
})

test('appendPicks adds the first picks that fit and stops at the cap', () => {
  const six = ['#010101', '#020202', '#030303', '#040404', '#050505', '#060606']
  const picks = ['#D00001', '#D00002', '#D00003', '#D00004', '#D00005']
  const add = appendPicks(six, picks, 8)
  assert.deepEqual(add.colours, [...six, '#D00001', '#D00002'])
  assert.equal(add.used, 2)
  assert.equal(add.room, 2)
})

test('appendPicks on a full board leaves it unchanged', () => {
  const full = ['#010101', '#020202', '#030303', '#040404', '#050505', '#060606', '#070707', '#080808']
  const copy = [...full]
  const add = appendPicks(full, PICKS, 8)
  assert.deepEqual(add.colours, copy)
  assert.equal(add.used, 0)
  assert.equal(add.room, 0)
  assert.deepEqual(full, copy)
  // A board already past the cap (the cap fell) does not shrink or grow either.
  assert.equal(appendPicks([...full, '#090909'], PICKS, 8).used, 0)
})

test('a thin line with a little noise keeps its colour', () => {
  // A lightly compressed chart: a red line about 2px tall on near-white, every
  // pixel off by up to 1 per channel. Its colour straddles two buckets, and
  // the two halves must not reject each other as blends.
  for (const amp of [2, 4, 6]) {
    let seed = 3
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    const cl = (v) => Math.max(0, Math.min(255, v))
    const img = image(384, 256, (x, y) => {
      const n = amp * (rnd() - 0.5)
      return Math.abs(y - (x * 0.3 + 20)) < 1.2 ? [cl(220 + n), cl(40 + n), cl(40 + n)] : [cl(250 + n), cl(250 + n), cl(250 + n)]
    })
    const { colours } = extractPalette(img, 5)
    assert.ok(colours.some((c) => colourDistance(c.hex, '#DC2828') < 0.05), `noise ${amp}: ${colours.map((c) => c.hex).join(' ')}`)
  }
})
