// The colour-vision modes: their ids, their copy and the dot hues.
//
// Each test names the code to break to see it fail (MUTATION lines).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { contrastRatio, simCvd } from '../../src/utils/colors.js'
import { VISION_HUES, VISION_MODES, VISION_NOTE, visionAnnouncement } from '../../src/utils/visionModes.js'

// MUTATION: misspell `deuteranopia` in visionModes.js (the id or its hue key).
test('the modes are in the menu order and every one but normal changes a colour', () => {
  assert.deepEqual(VISION_MODES.map(m => m.id), ['normal', 'deuteranomaly', 'deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'])
  for (const m of VISION_MODES.filter(x => x.id !== 'normal')) {
    assert.notEqual(simCvd('#C83232', m.id), '#C83232', `${m.id} changes the colour`)
  }
  assert.deepEqual(Object.keys(VISION_HUES).sort(), ['deuteranomaly', 'deuteranopia', 'protanopia', 'tritanopia'])
})

const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const dist = (a, b) => Math.hypot(...channels(a).map((v, i) => v - channels(b)[i]))

// MUTATION: delete the `deuteranomaly` row from MACHADO_2009 in colors.js (simCvd then returns the input), or swap it for the deuteranopia row (the mild colour then equals the full one).
test('the mild red-green mode lands between the normal colour and green-blind', () => {
  for (const hex of ['#FF0000', '#00C800']) {
    const mild = simCvd(hex, 'deuteranomaly')
    const full = simCvd(hex, 'deuteranopia')
    assert.notEqual(mild, hex, `${hex} changes under the mild mode`)
    assert.notEqual(mild, full, `${hex} is milder than green-blind`)
    const d = dist(hex, mild), dFull = dist(hex, full), toFull = dist(mild, full)
    assert.ok(d < dFull, `${hex}: ${mild} is closer to the original than green-blind ${full}`)
    assert.ok(toFull < dFull, `${hex}: ${mild} is closer to green-blind than the original is`)
  }
})

// MUTATION: change one number in the deuteranomaly row of MACHADO_2009.
test('the mild mode is the paper\'s deuteranomaly matrix at severity 0.6', () => {
  // Pure red and pure green pick out the first and second matrix columns, in linear
  // sRGB: red -> (0.498864, 0.205199, -0.011131), green -> (0.674741, 0.754872, 0.030969).
  const enc = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)
  const near = (hex, linear) => channels(hex).every((v, i) => Math.abs(v - enc(Math.max(0, linear[i]))) <= 1.5)
  assert.ok(near(simCvd('#FF0000', 'deuteranomaly'), [0.498864, 0.205199, 0]), simCvd('#FF0000', 'deuteranomaly'))
  assert.ok(near(simCvd('#00FF00', 'deuteranomaly'), [0.674741, 0.754872, 0.030969]), simCvd('#00FF00', 'deuteranomaly'))
})

// MUTATION: change a number in the third column of the deuteranomaly row of MACHADO_2009 (the red, green or blue-channel entry).
test('the mild mode keeps the matrix\'s blue column', () => {
  const enc = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)
  const near = (hex, linear) => channels(hex).every((v, i) => Math.abs(v - enc(Math.max(0, linear[i]))) <= 1.5)
  // Pure blue picks the third column, (-0.173604, 0.039929, 0.980162); the negative red is clamped to 0.
  assert.ok(near(simCvd('#0000FF', 'deuteranomaly'), [0, 0.039929, 0.980162]), simCvd('#0000FF', 'deuteranomaly'))
  // Magenta (red plus blue) lets the negative entry show in red: 0.498864 - 0.173604 = 0.32526;
  // green 0.205199 + 0.039929 = 0.245128; blue -0.011131 + 0.980162 = 0.969031.
  assert.ok(near(simCvd('#FF00FF', 'deuteranomaly'), [0.32526, 0.245128, 0.969031]), simCvd('#FF00FF', 'deuteranomaly'))
})

// MUTATION: put an em dash in any hint in visionModes.js.
test('hints fit the row and follow the copy rules', () => {
  for (const m of VISION_MODES) {
    for (const text of [m.name, m.short, m.hint, VISION_NOTE]) assert.ok(!/[—–]/.test(text), `no dash in "${text}"`)
    assert.ok(m.hint.length <= 44, `${m.id} hint is ${m.hint.length} characters`)
    assert.match(m.hint, /^[A-Z]/, `${m.id} hint starts with a capital`)
    if (m.id === 'normal') continue
    assert.match(m.hint, /\d/, `${m.id} hint carries its figure`)
    assert.ok(m.name.endsWith(`(${m.id})`), `${m.id} name carries the medical term`)
  }
  assert.equal(VISION_MODES[0].name, 'Normal vision')
})

// MUTATION: change "colour blindness" back to "type" in VISION_NOTE in visionModes.js.
test('the note under the list says what the 1 in 12 figure counts', () => {
  assert.match(VISION_NOTE, /About 1 in 12 men and 1 in 200 women have some form of red-green colour blindness\.$/)
})

// MUTATION: drop the case or the sentence from the "on" message in visionAnnouncement.
test('the live message names the mode, and turning it off says so', () => {
  assert.equal(visionAnnouncement('normal'), 'Colour vision check off.')
  assert.equal(visionAnnouncement('deuteranopia'), 'Colour vision check on: green-blind (deuteranopia). The bottom half of each colour shows how it looks.')
})

// The two card colours are read from the stylesheet, not copied here.
const css = fs.readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8')
const card = theme => {
  const block = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\{[^}]*?--card:(#[0-9A-Fa-f]{6})`))
  assert.ok(block, `found --card for ${theme}`)
  return block[1]
}

// MUTATION: set protanopia to #F08080 in VISION_HUES.
test('every dot hue clears 3:1 against the light and dark card', () => {
  for (const theme of ['light', 'dark']) {
    for (const [id, hex] of Object.entries(VISION_HUES)) {
      const ratio = contrastRatio(hex, card(theme))
      assert.ok(ratio >= 3, `${id} ${hex} is ${ratio.toFixed(2)}:1 on the ${theme} card`)
    }
  }
})
