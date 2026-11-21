// The Tint Generator's Preview paints a sample page from the ramp. Which step
// plays which part is keyed by step label (src/utils/tintPreview.js), so a
// 13-step ramp cannot shift the roles, and a 9-step ramp, which has no 900 or
// 950, uses 800 for both the headings and the dark footer. The contrast text
// in the legend floors to one decimal, so a pair just under 4.5 never reads as
// passing.
import test from 'node:test'
import assert from 'node:assert/strict'

import { PREVIEW_ROLES, previewColours, ratioText, ratioSpoken } from '../../src/utils/tintPreview.js'
import { tintRampForHex } from '../../src/utils/tintRamp.js'

test('the roles are keyed by step label for each count', () => {
  assert.equal(PREVIEW_ROLES[9].head, '800')
  assert.equal(PREVIEW_ROLES[9].dark, '800')
  for (const n of [11, 13]) {
    assert.equal(PREVIEW_ROLES[n].head, '900')
    assert.equal(PREVIEW_ROLES[n].dark, '950')
  }
  for (const n of [9, 11, 13]) {
    assert.equal(PREVIEW_ROLES[n].page, '50')
    assert.equal(PREVIEW_ROLES[n].card, '100')
    assert.equal(PREVIEW_ROLES[n].button, '600')
  }
})

test('previewColours takes each role from the ramp step it names', () => {
  for (const count of [9, 11, 13]) {
    const ramp = tintRampForHex('#249EAF', count)
    const byLabel = new Map(ramp.map((t) => [t.label, t.hex]))
    const { steps, hex } = previewColours(ramp, count)
    for (const [role, label] of Object.entries(steps)) {
      assert.equal(hex[role], byLabel.get(label), `${count} steps: ${role} is step ${label}`)
    }
    assert.match(hex.buttonInk, /^#(?:fff|ffffff|000|000000)$/i, 'the button ink is white or black')
  }
})

test('a role whose step is missing from the ramp is left out', () => {
  const ramp = [{ label: '50', hex: '#F5F5F5' }, { label: '600', hex: '#2563EB' }]
  const { hex } = previewColours(ramp, 11)
  assert.equal(hex.page, '#F5F5F5')
  assert.equal(hex.button, '#2563EB')
  assert.equal(hex.head, undefined)
  assert.equal(hex.dark, undefined)
  assert.ok(hex.buttonInk)
})

test('ratioText and ratioSpoken agree, and a failing pair says so', () => {
  assert.equal(ratioText('#000000', '#FFFFFF'), '21.0:1')
  assert.equal(ratioSpoken('#000000', '#FFFFFF'), '21.0 to 1')
  // #999 on white is about 2.85:1.
  assert.equal(ratioText('#999999', '#FFFFFF'), '2.8:1, below 4.5')
  assert.equal(ratioSpoken('#999999', '#FFFFFF'), '2.8 to 1, below 4.5')
  // #767676 on white is 4.54:1: it passes and floors to 4.5.
  assert.equal(ratioText('#767676', '#FFFFFF'), '4.5:1')
  // #777777 on white is 4.47:1: it fails, and flooring keeps it at 4.4.
  assert.equal(ratioText('#777777', '#FFFFFF'), '4.4:1, below 4.5')
})
