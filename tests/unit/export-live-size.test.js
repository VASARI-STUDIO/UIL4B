// The size a live page is drawn at (src/components/export/exportLiveSize.js).
//   1. A PAGE IS DRAWN AT THE SIZE ITS DOCUMENT SAYS, not the stock picture's.  Break: return { w: page.w, h: page.h } always.
//   2. A BOOK IS A TALLER WINDOW than the 606px stock picture, so the cover
//      headline is not cut.                                                      Break: BOOK_LIVE.h = 606.
//   3. THE RESET is in the head and wins over the document's own rules, so the
//      stack padding and the page gap go.                                        Break: leave `.pg` margin out of RESET.
import test from 'node:test'
import assert from 'node:assert/strict'
import { BOOK_LIVE, liveHtml, liveSize } from '../../src/components/export/exportLiveSize.js'

const stock = { kind: 'guidelines', w: 840, h: 472 }
const doc = (size) => `<html><head><style>@page{size:${size};margin:0}</style></head><body class="stack"><div class="pg"></div></body></html>`

test("a page is drawn at its document's own size", () => {
  assert.deepEqual(liveSize(doc('1123px 794px'), stock), { w: 1123, h: 794 })
  assert.deepEqual(liveSize(doc('1920px 1080px'), stock), { w: 1920, h: 1080 })
})

test("a document with no size, or a silly one, falls back to the stock page's", () => {
  assert.deepEqual(liveSize('<html></html>', stock), { w: 840, h: 472 })
  assert.deepEqual(liveSize(doc('4px 4px'), stock), { w: 840, h: 472 })
  assert.deepEqual(liveSize(doc('99999px 800px'), stock), { w: 840, h: 472 })
  assert.deepEqual(liveSize('', stock), { w: 840, h: 472 })
})

test('a book is a window taller than the stock picture, whatever the document says', () => {
  const size = liveSize('<html></html>', { kind: 'book', w: 1424, h: 606 })
  assert.deepEqual(size, BOOK_LIVE)
  assert.ok(size.h > 622, 'tall enough for the Presentation cover headline, which ends at 622px')
})

test('the reset goes into the head, last', () => {
  const out = liveHtml(doc('1000px 800px'))
  assert.match(out, /<style>html,body\{overflow:hidden!important\}[^<]*body\.stack \.pg\{margin:0!important\}<\/style><\/head>/)
  assert.ok(out.indexOf('@page') < out.indexOf('overflow:hidden'), 'after the document\'s own rules')
  assert.match(liveHtml('<p>x</p>'), /^<style>/)
})
