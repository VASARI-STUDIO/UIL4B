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
  assert.deepEqual(VISION_MODES.map(m => m.id), ['normal', 'deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'])
  for (const m of VISION_MODES.filter(x => x.id !== 'normal')) {
    assert.notEqual(simCvd('#C83232', m.id), '#C83232', `${m.id} changes the colour`)
  }
  assert.deepEqual(Object.keys(VISION_HUES).sort(), ['deuteranopia', 'protanopia', 'tritanopia'])
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
