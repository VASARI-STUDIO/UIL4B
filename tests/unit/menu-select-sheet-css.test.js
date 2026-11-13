// The phone sheet of a styled dropdown sits on the screen edge, over the tab bar,
// and counts the home-indicator inset once. A test browser reports
// env(safe-area-inset-bottom) as 0, so the rendered gap cannot be measured there;
// this reads the rules instead.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

// Line endings are normalised so the line-based read works on a CRLF checkout.
const css = fs.readFileSync('src/styles/global.css', 'utf8').replace(/\r\n/g, '\n')
const phoneBlock = css.slice(css.indexOf('@media(max-width:767px){\n  .menu-select-scrim'))
const baseLine = phoneBlock.split('\n').find((l) => l.includes('.pop.menu-select-list,.pop.menu-select-list[data-pop-side="top"]'))

test('the base phone rule is found', () => {
  assert.ok(baseLine, 'base phone rule found')
})

test('the sheet is not lifted above the tab bar: no rule moves it by the bar or reserves the bar in its height', () => {
  assert.doesNotMatch(phoneBlock.slice(0, phoneBlock.indexOf('@keyframes menu-select-sheet-in')), /html\.has-tabbar \.pop\.menu-select-list/)
  assert.doesNotMatch(baseLine, /--tabbar-h/)
  assert.match(baseLine, /bottom:0(;|$)/)
})

test('the inset is counted once, in the sheet padding', () => {
  assert.match(baseLine, /padding:14px [^;]*calc\(16px \+ env\(safe-area-inset-bottom\)\)/)
})

test('the height cap leaves room for the longest dropdown (Scale ratio, 11 rows) on a tall phone', () => {
  const cap = /max-height:min\(76dvh,(\d+)px,/.exec(baseLine)
  assert.ok(cap, 'cap found')
  assert.ok(Number(cap[1]) >= 640, `cap ${cap[1]}px is at least 640px`)
})
