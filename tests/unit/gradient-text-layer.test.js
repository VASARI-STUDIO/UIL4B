// The text layer's shared maths (utils/gradientText.js) and the Poster and Spec card's
// plain parts (utils/gradientPreviewStyles.js): which ink each box of text gets, the one
// badge a scene shows, and the colours, lines and counts the Spec card prints.
//
// MUTATIONS (each turns the tests named red):
//   boxWithin dividing by the wrong side                       -> "boxWithin gives fractions ..."
//   lowestInk returning the highest ratio                      -> "the badge is the lowest ratio ..."
//   sceneBadge not saying "low" under 4.5                      -> "the badge says low exactly when ..."
//   sceneInks using one ink for every box                      -> "each box of text gets the ink for the part of the gradient it covers"
//   specStrip sampling at other positions                      -> "specStrip samples ..."
//   specStrip ignoring the space                               -> "specStrip blends ..."
//   specSampledNote shown at five stops                        -> "the Sampled at line ..."
//   fitHexes dropping the +N                                   -> "fitHexes keeps ..."
//   specTypeLine writing an angle for Radial                   -> "specTypeLine ..."
//   PREVIEW_STYLES not ending poster ... phone / a label changed -> "Poster and Spec card sit before ..."
//   TEXT_STYLES missing icon or phone                          -> "Poster and Spec card sit before ..."
//   the icon's ink box not the centre half                     -> "the App icon's ink is chosen over the centre of a square"
//   PHONE_COPY or ICON_GLYPH changed                           -> "the Phone sets Offcut's own words and the icon is Tenner's T"
import test from 'node:test'
import assert from 'node:assert/strict'
import { boxWithin, inkFor, sceneInks, lowestInk, sceneBadge, badgeText } from '../../src/utils/gradientText.js'
import { INK_DARK, INK_LIGHT } from '../../src/utils/gradientInk.js'
import { contrastRatio } from '../../src/utils/colors.js'
import {
  PREVIEW_STYLES, POSTER_COPY, PHONE_COPY, ICON_GLYPH, ICON_INK_BOX, TEXT_STYLES, isTextStyle, styleVars, specStrip, specHexes, fitHexes, specTypeLine, specSampledNote, specName,
} from '../../src/utils/gradientPreviewStyles.js'

const BW = [{ color: '#000000', position: 0 }, { color: '#FFFFFF', position: 100 }]
const PAINT = 'linear-gradient(180deg, #000000 0%, #FFFFFF 100%)'

test('boxWithin gives fractions of the outer box and its shape', () => {
  const out = { left: 100, top: 50, width: 400, height: 200 }
  const spot = boxWithin(out, { left: 140, top: 70, width: 100, height: 40 })
  assert.deepEqual(spot, { aspect: 2, box: { x: 0.1, y: 0.1, w: 0.25, h: 0.2 } })
  assert.equal(boxWithin({ left: 0, top: 0, width: 0, height: 10 }, out), null)
})

test('each box of text gets the ink for the part of the gradient it covers', () => {
  const at = (y) => boxWithin({ left: 0, top: 0, width: 400, height: 500 }, { left: 20, top: y, width: 100, height: 20 })
  const inks = sceneInks(BW, 'Linear', 180, { top: at(10), foot: at(470) }, ['top', 'foot'])
  assert.equal(inks.top.hex, INK_LIGHT.hex, 'light ink over the dark top')
  assert.equal(inks.foot.hex, INK_DARK.hex, 'dark ink over the light foot')
  assert.ok(inks.top.ratio > 10 && inks.foot.ratio > 10)
  const unknown = sceneInks(BW, 'Linear', 180, null, ['top', 'foot'])
  assert.deepEqual(unknown.top, inkFor(BW, 'Linear', 180, undefined), 'before the first measure the whole gradient decides')
})

test("the badge is the lowest ratio of the scene's text boxes", () => {
  const inks = [{ ratio: 12.4, low: false }, { ratio: 5.1, low: false }, { ratio: 7, low: false }]
  assert.equal(lowestInk(inks).ratio, 5.1)
  assert.equal(sceneBadge(inks).text, 'Text 5.1:1')
  assert.equal(lowestInk([]), null)
  assert.equal(sceneBadge([]), null, 'no text on the paint, no badge')
})

test('the badge says low exactly when the lowest ratio is under 4.5', () => {
  const mid = [{ ratio: 4.4, low: true }, { ratio: 9, low: false }]
  assert.deepEqual(sceneBadge(mid), { text: 'Text 4.4:1 · low', low: true })
  assert.deepEqual(sceneBadge([{ ratio: 4.5, low: false }]), { text: 'Text 4.5:1', low: false })
  assert.equal(badgeText({ ratio: 3, low: true }), 'Text 3.0:1 · low')
})

test('the real inks keep the ratio they report, and the lowest of them is the badge', () => {
  const mid = [{ color: '#7C7C7C', position: 0 }, { color: '#7C7C7C', position: 100 }]
  const ink = inkFor(mid, 'Linear', 180)
  const true1dp = Math.floor(Math.max(contrastRatio(INK_DARK.hex, '#7C7C7C'), contrastRatio(INK_LIGHT.hex, '#7C7C7C')) * 10) / 10
  assert.equal(ink.ratio, true1dp)
  assert.equal(ink.low, true)
  assert.match(sceneBadge([ink, inkFor(BW, 'Linear', 180, undefined)]).text, / · low$/)
})

test('Poster and Spec card sit before Mesh, Waves, App icon and Phone, named and spoken as written', () => {
  const six = PREVIEW_STYLES.slice(-6)
  assert.deepEqual(six.map((s) => s.id), ['poster', 'spec', 'mesh', 'waves', 'icon', 'phone'])
  assert.deepEqual(six.map((s) => s.label), ['Poster', 'Spec card', 'Mesh', 'Waves', 'App icon', 'Phone'])
  assert.deepEqual(six.map((s) => s.as), [
    ', shown as a poster', ', shown as a spec card', ', shown as a mesh', ', shown as waves', ', shown as an app icon', ', shown as a phone screen',
  ])
  assert.deepEqual(TEXT_STYLES, ['poster', 'spec', 'icon', 'phone'])
  assert.ok(isTextStyle('poster') && isTextStyle('icon') && isTextStyle('phone'))
  assert.ok(!isTextStyle('fade') && !isTextStyle('mesh') && !isTextStyle('waves'))
})

test("the Poster sets Shallow End's own words", () => {
  assert.deepEqual(POSTER_COPY, { brand: 'Shallow End', display: 'Lessons that fit after school.', footer: 'Pool 2, Sandy Bay. Tuesdays at 4:15.' })
})

test("Poster and Spec card paint the canvas's own gradient and invent no colour", () => {
  for (const id of ['poster', 'spec']) assert.deepEqual(styleVars(id, { stops: BW, paint: PAINT, oklch: true }), { '--fx-paint': PAINT })
})

test('specStrip samples the ramp at 0, 25, 50, 75 and 100%', () => {
  const strip = specStrip(BW, false)
  assert.equal(strip.length, 5)
  assert.deepEqual(strip, ['#000000', '#404040', '#808080', '#BFBFBF', '#FFFFFF'])
  assert.deepEqual(specStrip([BW[1], BW[0]], false), strip, 'stop order in the list does not matter')
})

test("specStrip blends in the canvas's space", () => {
  const red = [{ color: '#FF0000', position: 0 }, { color: '#0000FF', position: 100 }]
  assert.notEqual(specStrip(red, true)[2], specStrip(red, false)[2])
  assert.equal(specStrip(red, true)[0], '#FF0000')
  assert.equal(specStrip(red, true)[4], '#0000FF')
  assert.equal(specStrip(red)[2], specStrip(red, true)[2], 'OKLCH is the default')
})

test('the hex list is the stops in position order, upper-case', () => {
  assert.deepEqual(specHexes([{ color: '#2b59ff', position: 100 }, { color: '#ff7a1a', position: 0 }, { color: '#ffffff', position: 50 }]), ['#FF7A1A', '#FFFFFF', '#2B59FF'])
})

test('fitHexes keeps what fits and counts the rest as +N', () => {
  const six = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006']
  assert.deepEqual(fitHexes(six.slice(0, 4)), six.slice(0, 4))
  assert.deepEqual(fitHexes(six), ['#000001', '#000002', '#000003', '+3'])
  assert.deepEqual(fitHexes(six.slice(0, 5)), ['#000001', '#000002', '#000003', '+2'])
})

test('specTypeLine says the type, its angle where it has one, and the space', () => {
  assert.equal(specTypeLine('Linear', 135, true), 'Linear 135° · OKLCH')
  assert.equal(specTypeLine('Radial', 135, false), 'Radial · sRGB')
  assert.equal(specTypeLine('Conic', 90.4, true), 'Conic 90° · OKLCH')
})

test('the Sampled at line is there when there are fewer than five stops, and only then', () => {
  const some = (n) => Array.from({ length: n }, (_, i) => ({ color: '#112233', position: i }))
  assert.equal(specSampledNote(some(2)), 'Sampled at 0, 25, 50, 75 and 100%')
  assert.equal(specSampledNote(some(4)), 'Sampled at 0, 25, 50, 75 and 100%')
  assert.equal(specSampledNote(some(5)), null)
  assert.equal(specSampledNote(some(12)), null)
})

test("the Phone sets Offcut's own words and the icon is Tenner's T", () => {
  assert.deepEqual(PHONE_COPY, {
    line: 'Quote on site. Paid by Friday.', heading: 'Sign in to Offcut', label: 'Email', button: 'Continue', link: 'Create an account',
  })
  assert.equal(ICON_GLYPH, 'T')
})

test("the App icon's ink is chosen over the centre of a square", () => {
  assert.deepEqual(ICON_INK_BOX, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 })
  const white = (position) => ({ color: '#FFFFFF', position })
  const edges = [{ color: '#000000', position: 0 }, white(25), white(75), { color: '#000000', position: 100 }]
  const centre = inkFor(edges, 'Linear', 180, { aspect: 1, box: ICON_INK_BOX })
  assert.equal(centre.hex, INK_DARK.hex, 'dark ink over the white middle, whatever the black edges say')
  assert.ok(centre.ratio > 10)
})

test("Poster, Spec card, App icon and Phone paint the canvas's own gradient and invent no colour", () => {
  for (const id of ['icon', 'phone']) assert.deepEqual(styleVars(id, { stops: BW, paint: PAINT, oklch: true }), { '--fx-paint': PAINT })
})

test('the card is named for the saved project, else the type', () => {
  assert.equal(specName('  Summer sale ', 'Linear'), 'Summer sale')
  assert.equal(specName('', 'Radial'), 'Radial gradient')
  assert.equal(specName(undefined, 'Conic'), 'Conic gradient')
})
