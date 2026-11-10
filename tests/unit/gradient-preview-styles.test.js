// The Gradient Generator's preview styles draw only the person's stops. This pins the
// string building: which colours each style is handed, and in what order.
//
// MUTATIONS (each turns the tests named red):
//   stopList not sorting by position            -> "stopList reads stops in position order"
//   linearThrough dropping `in oklch`           -> "linearThrough blends in OKLCH only when asked"
//   glowColours returning the first stop thrice -> "glowColours takes the heart, the middle and the end from the stops"
//   styleVars('streak') using a fixed colour    -> "every style's variables carry the stops' colours"
//   PREVIEW_STYLES losing an entry              -> "the six styles are named plainly and in order"
import test from 'node:test'
import assert from 'node:assert/strict'
import { PREVIEW_STYLES, isPreviewStyle, stopList, linearThrough, glowColours, styleVars } from '../../src/utils/gradientPreviewStyles.js'

const STOPS = [{ color: '#2b59ff', position: 100 }, { color: '#ff7a1a', position: 0 }, { color: '#ffffff', position: 50 }]

test('the six styles are named plainly and in order', () => {
  assert.deepEqual(PREVIEW_STYLES.map((s) => s.label), ['Grain', 'Fluted glass', 'Glow ring', 'Streak', 'Soft glow', 'Fade'])
  assert.equal(new Set(PREVIEW_STYLES.map((s) => s.id)).size, 6)
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
