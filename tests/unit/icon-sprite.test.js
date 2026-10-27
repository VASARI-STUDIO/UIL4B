// THE ICON GRID SPRITE — src/utils/iconSprite.js (the DOM-free half).
//
// The grid draws pack icons as <svg><use href="#id"/></svg> from one hidden
// sprite. What must hold: an icon that goes in comes out looking the same, ids
// inside it cannot collide with another icon's, and anything the sanitiser would
// change stays OUT of the sprite (the grid then keeps drawing it as an image).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { symbolMarkup } from '../../src/utils/iconSprite.js'

const wrap = (body, box = '0 0 24 24') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="24" height="24">${body}</svg>`

test('a clean stroke icon becomes a symbol with its body untouched', () => {
  const body = '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path d="M5 12h14"/></g>'
  assert.equal(symbolMarkup(wrap(body), 'ics1'), `<symbol id="ics1" viewBox="0 0 24 24">${body}</symbol>`)
})

test('a non-square box keeps its own viewBox', () => {
  const body = '<path d="M0 0h32v24H0z"/>'
  assert.equal(symbolMarkup(wrap(body, '0 0 32 24'), 'ics2'), `<symbol id="ics2" viewBox="0 0 32 24">${body}</symbol>`)
})

test('ids and the references to them take the symbol id as a prefix', () => {
  const body = '<defs><linearGradient id="a"><stop offset="0" stop-color="#000"/></linearGradient></defs><path fill="url(#a)" d="M0 0h24v24H0z"/>'
  const out = symbolMarkup(wrap(body), 'ics3')
  assert.match(out, /id="ics3\.a"/)
  assert.match(out, /fill="url\(#ics3\.a\)"/)
  assert.doesNotMatch(out, /id="a"/)
})

test('two icons that both name a gradient "a" do not share an id', () => {
  const body = '<defs><clipPath id="a"><path d="M0 0h24v24H0z"/></clipPath></defs><path clip-path="url(#a)" d="M1 1h4v4H1z"/>'
  const one = symbolMarkup(wrap(body), 'ics4')
  const two = symbolMarkup(wrap(body), 'ics5')
  assert.notEqual(one.match(/id="ics\d\.a"/)[0], two.match(/id="ics\d\.a"/)[0])
})

test('an icon the sanitiser would change stays out of the sprite', () => {
  for (const body of [
    '<style>path{fill:red}</style><path d="M0 0h24v24H0z"/>',
    '<script>alert(1)</script><path d="M0 0h24v24H0z"/>',
    '<path d="M0 0h24v24H0z" onload="alert(1)"/>',
    '<path d="M0 0h24v24H0z"><animate attributeName="opacity" values="0;1" dur="1s"/></path>',
    '<filter id="f"><feGaussianBlur stdDeviation="1"/></filter><path filter="url(#f)" d="M0 0h24v24H0z"/>',
    '<image href="https://example.test/x.png"/>',
  ]) {
    assert.equal(symbolMarkup(wrap(body), 'ics6'), null, body)
  }
})

test('malformed, empty and oversized markup is refused', () => {
  assert.equal(symbolMarkup('', 'ics7'), null)
  assert.equal(symbolMarkup('not svg', 'ics7'), null)
  assert.equal(symbolMarkup(wrap(''), 'ics7'), null)
  assert.equal(symbolMarkup(wrap(`<path d="${'M0 0h1'.repeat(10000)}"/>`), 'ics7'), null)
})

test('a bad id is a caller bug, not a quiet null', () => {
  assert.throws(() => symbolMarkup(wrap('<path d="M0 0h24v24H0z"/>'), '1bad'), RangeError)
})
