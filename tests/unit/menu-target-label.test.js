// The heading of the right-click feedback menu is plain words, never the CSS
// selector the report carries. DOM-free, so it runs under node:test.

import test from 'node:test'
import assert from 'node:assert/strict'
import { describeTarget } from '../../src/utils/menuTargetLabel.js'

test('a named control is described by its accessible name', () => {
  assert.equal(describeTarget({ tag: 'BUTTON', name: 'Copy #3A5F2B' }), 'Button: Copy #3A5F2B')
})

test('an unnamed control gets a plain noun, not a selector', () => {
  assert.equal(describeTarget({ tag: 'BUTTON' }), 'This button')
  assert.equal(describeTarget({ tag: 'H2' }), 'This heading')
  assert.equal(describeTarget({ tag: 'DIV' }), 'This part of the page')
  assert.equal(describeTarget({}), 'This part of the page')
})

test('nothing that looks like a selector is ever produced', () => {
  for (const tag of ['BUTTON', 'SECTION', 'DIV', 'SPAN', '']) {
    const text = describeTarget({ tag })
    assert.ok(!/[.#[\]]/.test(text), `"${text}" reads like a selector`)
  }
})

test('a long name is cut and whitespace is tidied', () => {
  const text = describeTarget({ tag: 'BUTTON', name: `  ${'word '.repeat(30)}` })
  assert.ok(text.length <= 'Button: '.length + 40)
  assert.ok(text.endsWith('…'))
  assert.ok(!/\s{2,}/.test(text))
})
