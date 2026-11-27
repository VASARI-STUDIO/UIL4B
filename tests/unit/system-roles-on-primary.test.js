import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeOn } from '../../src/utils/systemRoles.js'
import { luminance } from '../../src/utils/styleGuideExport.js'

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// White on these fills is 4.49:1, which rounds to 4.50 at 2dp.
for (const [fill, ink] of [['#D74201', '#0A0506'], ['#E32652', '#0A0506'], ['#D74201', '#111111']]) {
  test(`makeOn picks a label that clears 4.5:1 unrounded on ${fill}`, () => {
    const on = makeOn(ink)(fill)
    assert.ok(ratio(fill, on) >= 4.5, `${on} on ${fill} is ${ratio(fill, on).toFixed(4)}:1`)
  })
}

test('makeOn keeps white where white clearly passes', () => {
  assert.equal(makeOn('#111111')('#1A3A5C'), '#FFFFFF')
})
