// The phone sheet of a styled dropdown counts the home-indicator inset once.
// A test browser reports env(safe-area-inset-bottom) as 0, so the rendered gap
// cannot be measured there; this reads the rules instead.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

// Line endings are normalised so the line-based read works on a CRLF checkout.
const css = fs.readFileSync('src/styles/global.css', 'utf8').replace(/\r\n/g, '\n')
const rule = (selector) => {
  const start = css.indexOf(selector + '{')
  assert.notEqual(start, -1, `${selector} rule exists`)
  return css.slice(start + selector.length + 1, css.indexOf('}', start))
}

test('lifted above the tab bar, the sheet lifts by the inset and pads only 16px', () => {
  const lifted = rule('html.has-tabbar .pop.menu-select-list')
  assert.match(lifted, /bottom:calc\(var\(--tabbar-h\) \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(lifted, /padding-bottom:16px(;|$)/)
  assert.doesNotMatch(lifted, /padding-bottom:[^;]*env\(/)
})

test('opened from a sheet that covers the tab bar, it sits on the edge: inset in the padding, no tab bar reserved', () => {
  const inSheet = rule('html.has-tabbar .pop.menu-select-list[data-in-sheet]')
  assert.match(inSheet, /bottom:0(;|$)/)
  assert.match(inSheet, /padding-bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)/)
  assert.doesNotMatch(inSheet, /--tabbar-h/)
})

test('without a tab bar the base sheet does not reserve one', () => {
  const base = css.slice(css.indexOf('@media(max-width:767px){\n  .menu-select-scrim'))
  const line = base.split('\n').find((l) => l.includes('.pop.menu-select-list,.pop.menu-select-list[data-pop-side="top"]'))
  assert.ok(line, 'base phone rule found')
  assert.doesNotMatch(line, /max-height:[^;]*--tabbar-h/)
  assert.match(line, /padding:14px [^;]*calc\(16px \+ env\(safe-area-inset-bottom\)\)/)
})
