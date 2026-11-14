// The Gradient Generator's preview styles draw only the person's stops. This pins the
// string building: which colours each style is handed, and in what order.
//
// MUTATIONS (each turns the tests named red):
//   stopList not sorting by position            -> "stopList reads stops in position order"
//   linearThrough dropping `in oklch`           -> "linearThrough blends in OKLCH only when asked"
//   glowColours returning the first stop thrice -> "glowColours takes the heart, the middle and the end from the stops"
//   styleVars('streak') using a fixed colour    -> "every style's variables carry the stops' colours"
//   PREVIEW_STYLES losing an entry              -> "the styles are named plainly and in order"
//   meshPoints using noise or another table     -> "the Mesh puts one point per stop on the fixed table"
//   meshPoints ignoring the five-point cap      -> "with more than five stops the Mesh samples the ramp ..."
//   meshPoints depending on other stops         -> "changing one stop moves only that point's colour"
//   meshGround taking the highest L / first stop -> "the Mesh's ground is the darkest stop ..."
//   waveBands sampling at k/7 or in sRGB always -> "the Waves' seven bands are the ramp at k/6 ..."
//   wavePath drawing a stroke or fewer bands    -> "each wave band is a closed fill"
//   phoneButton taking the lightest / last tie  -> "the Phone's button is the most chromatic stop ..."
//   previewId ignoring the place                -> "a fill style shows only on Fill"
//   splitPreview dropping old flat ids          -> "an old stored style id comes back as Fill with that style"
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PREVIEW_STYLES, isPreviewStyle, stopList, linearThrough, glowColours, styleVars,
  FILL_STYLES, PREVIEW_PLACES, FIXED_SHAPE_STYLES, previewId, splitPreview,
  MESH_TABLE, meshPoints, meshGround, meshBackground, waveBands, wavePath, WAVE_COUNT, phoneButton,
} from '../../src/utils/gradientPreviewStyles.js'
import { colourAt } from '../../src/utils/gradientScore.js'
import { hexToOklchRaw } from '../../src/components/tool/oklch.js'

const STOPS = [{ color: '#2b59ff', position: 100 }, { color: '#ff7a1a', position: 0 }, { color: '#ffffff', position: 50 }]

test('the styles are named plainly and in order', () => {
  assert.deepEqual(
    PREVIEW_STYLES.map((s) => s.label),
    ['Grain', 'Fluted glass', 'Glow ring', 'Streak', 'Soft glow', 'Fade', 'Poster', 'Spec card', 'Mesh', 'Waves', 'App icon', 'Phone'],
  )
  assert.equal(new Set(PREVIEW_STYLES.map((s) => s.id)).size, 12)
  assert.ok(isPreviewStyle('mesh') && isPreviewStyle('waves') && isPreviewStyle('icon') && isPreviewStyle('phone'))
  assert.ok(isPreviewStyle('fluted'))
  assert.ok(!isPreviewStyle('hero'))
})

test('stopList reads stops in position order', () => {
  assert.equal(stopList(STOPS), '#FF7A1A 0%, #FFFFFF 50%, #2B59FF 100%')
})

test('linearThrough blends in OKLCH only when asked', () => {
  assert.equal(linearThrough(90, STOPS, false), 'linear-gradient(90deg, #FF7A1A 0%, #FFFFFF 50%, #2B59FF 100%)')
  assert.match(linearThrough(180, STOPS, true), /^linear-gradient\(180deg in oklch, /)
})

test('glowColours takes the heart, the middle and the end from the stops', () => {
  assert.deepEqual(glowColours(STOPS), { heart: '#FF7A1A', low: '#FFFFFF', high: '#2B59FF' })
  assert.deepEqual(glowColours(STOPS.slice(0, 2)), { heart: '#FF7A1A', low: '#2B59FF', high: '#2B59FF' })
})

test("every style's variables carry the stops' colours", () => {
  const ctx = { stops: STOPS, paint: 'linear-gradient(90deg, #FF7A1A 0%, #2B59FF 100%)', oklch: false }
  const text = (id) => JSON.stringify(styleVars(id, ctx))
  for (const id of ['streak', 'fade']) {
    for (const hex of ['#FF7A1A', '#FFFFFF', '#2B59FF']) assert.ok(text(id).includes(hex), `${id} carries ${hex}`)
  }
  for (const hex of ['#FF7A1A', '#FFFFFF', '#2B59FF']) assert.ok(text('glow').includes(hex), `glow carries ${hex}`)
  for (const id of ['grain', 'fluted', 'ring']) assert.ok(text(id).includes(ctx.paint), `${id} carries the canvas paint`)
  assert.match(text('streak'), /90deg/)
  assert.match(text('fade'), /180deg/)
})

const FOUR = [
  { color: '#ffd84d', position: 0 }, { color: '#f0436a', position: 33 },
  { color: '#6c2bd9', position: 66 }, { color: '#101830', position: 100 },
]
const SEVEN = ['#FFD84D', '#F0436A', '#6C2BD9', '#101830', '#2BD9A1', '#FF7A1A', '#2B59FF'].map((color, i) => ({ color, position: i * (100 / 6) }))
const hexOf = (s) => s.color.toUpperCase()

test('the Mesh puts one point per stop on the fixed table', () => {
  assert.deepEqual(MESH_TABLE, [[20, 24], [80, 20], [52, 56], [18, 84], [84, 80]])
  for (const n of [2, 3, 4]) {
    const points = meshPoints(FOUR.slice(0, n), true)
    assert.equal(points.length, n, `${n} stops give ${n} points`)
    points.forEach((p, i) => assert.deepEqual([p.x, p.y, p.color], [...MESH_TABLE[i], hexOf(FOUR[i])]))
  }
  assert.deepEqual(meshPoints([...FOUR].reverse(), true), meshPoints(FOUR, true), 'stop order in the list does not matter')
  assert.deepEqual(meshPoints(FOUR, true), meshPoints(FOUR, true), 'the same stops give the same points')
  assert.deepEqual(meshPoints(FOUR, false), meshPoints(FOUR, true), 'up to five stops, no blending happens')
})

test('with more than five stops the Mesh samples the ramp at 0, 25, 50, 75 and 100%, as the canvas blends', () => {
  for (const oklch of [true, false]) {
    const points = meshPoints(SEVEN, oklch)
    assert.equal(points.length, 5)
    assert.deepEqual(points.map((p) => p.color), [0, 25, 50, 75, 100].map((pos) => colourAt(SEVEN, pos, oklch ? 'oklch' : 'srgb')))
    assert.deepEqual(points.map((p) => [p.x, p.y]), MESH_TABLE)
  }
  assert.notDeepEqual(meshPoints(SEVEN, true).map((p) => p.color), meshPoints(SEVEN, false).map((p) => p.color))
  assert.equal(meshPoints([...SEVEN, { color: '#123456', position: 99 }]).length, 5)
})

test("changing one stop moves only that point's colour", () => {
  const before = meshPoints(FOUR, true)
  const changed = FOUR.map((s, i) => (i === 1 ? { ...s, color: '#00ff00' } : s))
  const after = meshPoints(changed, true)
  after.forEach((p, i) => {
    if (i === 1) assert.equal(p.color, '#00FF00')
    else assert.deepEqual(p, before[i], `point ${i + 1} is where and what it was`)
    assert.deepEqual([p.x, p.y], [before[i].x, before[i].y], 'no point moves')
  })
})

test("the Mesh's ground is the darkest stop by OKLCH lightness, and the points are soft circles of the stops", () => {
  assert.equal(meshGround(FOUR), '#101830')
  assert.equal(meshGround([...FOUR].reverse()), '#101830')
  assert.equal(meshGround(SEVEN), '#101830')
  const light = Math.min(...FOUR.map((s) => hexToOklchRaw(s.color)[0]))
  assert.equal(hexToOklchRaw(meshGround(FOUR))[0], light)
  const vars = styleVars('mesh', { stops: FOUR, paint: 'x', oklch: true })
  assert.equal(vars['--fx-ground'], '#101830')
  assert.equal(vars['--fx-mesh'].match(/radial-gradient\(/g).length, 4)
  for (const s of FOUR) assert.ok(vars['--fx-mesh'].includes(`${hexOf(s)} 0`), `the mesh carries ${hexOf(s)}`)
  assert.equal(
    meshBackground([{ x: 20, y: 24, color: '#AAAAAA' }]),
    'radial-gradient(circle at 20% 24%, #AAAAAA 0, transparent 58cqmax)',
  )
})

test("the Waves' seven bands are the ramp at k/6, as the canvas blends", () => {
  assert.equal(WAVE_COUNT, 7)
  for (const oklch of [true, false]) {
    const bands = waveBands(FOUR, oklch)
    assert.equal(bands.length, 7)
    bands.forEach((c, k) => assert.equal(c, colourAt([...FOUR].sort((a, b) => a.position - b.position), (k / 6) * 100, oklch ? 'oklch' : 'srgb'), `band ${k}`))
  }
  assert.equal(waveBands(FOUR, true)[0], '#FFD84D')
  assert.equal(waveBands(FOUR, true)[6], '#101830')
  assert.notDeepEqual(waveBands(FOUR, true), waveBands(FOUR, false))
  assert.deepEqual(waveBands([...FOUR].reverse(), true), waveBands(FOUR, true))
})

test('each wave band is a closed fill whose top edge steps down the stage', () => {
  assert.equal(wavePath(0), 'M0 0H100V100H0Z')
  const top = (k) => Math.min(...[...wavePath(k).matchAll(/(?:M|L)[\d.]+ ([\d.]+)/g)].map((m) => Number(m[1])))
  for (let k = 1; k < WAVE_COUNT; k++) {
    assert.match(wavePath(k), /^M0 [\d.]+L.*V100H0Z$/, `band ${k} is closed to the bottom`)
    assert.ok(Math.abs(top(k) - (k / 7) * 100) < 4.1, `band ${k} crests within 4% of k/7`)
  }
})

test("the Phone's button is the most chromatic stop, whatever the list order", () => {
  assert.equal(phoneButton(FOUR), '#6C2BD9')
  assert.equal(phoneButton([...FOUR].reverse()), '#6C2BD9')
  // Two distinct hexes never share a chroma to the last bit, so the tie rule shows only as a stable answer for a repeated colour.
  const twice = [{ color: '#6c2bd9', position: 90 }, { color: '#6c2bd9', position: 20 }, { color: '#ffd84d', position: 50 }]
  assert.equal(phoneButton(twice), '#6C2BD9')
  assert.equal(phoneButton([{ color: '#000000', position: 0 }, { color: '#000000', position: 100 }]), '#000000')
  const best = Math.max(...FOUR.map((s) => hexToOklchRaw(s.color)[1]))
  assert.equal(hexToOklchRaw(phoneButton(FOUR))[1], best)
})

test('the places and fill styles split the old list with nothing lost or doubled', () => {
  assert.deepEqual(PREVIEW_PLACES.map((p) => p.id), ['fill', 'hero', 'card', 'button', 'poster', 'spec', 'icon', 'phone'])
  assert.deepEqual(FILL_STYLES.map((s) => s.id), ['plain', 'grain', 'fluted', 'ring', 'streak', 'glow', 'fade', 'mesh', 'waves'])
  const styleIds = new Set([...PREVIEW_PLACES, ...FILL_STYLES].map((x) => x.id))
  for (const s of PREVIEW_STYLES) assert.ok(styleIds.has(s.id), s.id)
  for (const id of FIXED_SHAPE_STYLES) assert.ok(FILL_STYLES.some((s) => s.id === id), id)
})

test('a fill style shows only on Fill', () => {
  assert.equal(previewId('fill', 'plain'), 'fill')
  assert.equal(previewId('fill', 'grain'), 'grain')
  assert.equal(previewId('button', 'grain'), 'button')
  assert.equal(previewId('poster', 'mesh'), 'poster')
  assert.equal(previewId('fill', 'nonsense'), 'fill')
})

test('an old stored style id comes back as Fill with that style', () => {
  assert.deepEqual(splitPreview('grain'), { place: 'fill', fill: 'grain' })
  assert.deepEqual(splitPreview('waves', 'glow'), { place: 'fill', fill: 'waves' })
  assert.deepEqual(splitPreview('button', 'glow'), { place: 'button', fill: 'glow' })
  assert.deepEqual(splitPreview('spec'), { place: 'spec', fill: 'plain' })
  assert.deepEqual(splitPreview(null, null), { place: 'fill', fill: 'plain' })
  assert.deepEqual(splitPreview('gone', 'gone'), { place: 'fill', fill: 'plain' })
})
