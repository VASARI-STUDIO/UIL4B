// The animated icon grid's pure half (src/utils/animatedFrame.js): the still an animated glyph shows when it
// may not move, and the check for whether it loops for ever.
//
// MUTATIONS (each turns the named test red):
//   - make stripSmil return its input unchanged                         -> 'a still carries no animation elements'
//   - drop `set` from the SMIL element list                             -> 'a still carries no animation elements'
//   - return `stripped` instead of the peak frame in staticFrame        -> 'a pulse that starts from nothing still draws a dot'
//   - drop the opacity entry from PEAK                                  -> 'a fade-in still shows the path at full opacity'
//   - drop the `begin=` chain branch from FOREVER                       -> 'a chained begin loops for ever'
//   - drop the repeatCount branch from FOREVER                          -> 'repeatCount indefinite loops for ever'
//   - make FOREVER match any `begin=`                                  -> 'a single delayed start does not loop'
import test from 'node:test'
import assert from 'node:assert/strict'
import { staticFrame, loopsForever, hasAnimation, frameInfo } from '../../src/utils/animatedFrame.js'

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${inner}</svg>`
const uri = (markup) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`

test('a still carries no animation elements, in their self-closing, paired and set forms', () => {
  const markup = svg(
    '<circle cx="12" cy="12" r="4"><animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite"/></circle>' +
    '<path d="M2 2h20"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s"></animateTransform></path>' +
    '<rect x="1" y="1" width="3" height="3"><set attributeName="fill" to="red" begin="1s"/></rect>')
  assert.equal(hasAnimation(markup), true, 'POSITIVE CONTROL: the input does animate')
  const still = staticFrame(markup)
  assert.equal(/<(animate|animateTransform|animateMotion|set)\b/i.test(still), false)
  assert.equal(hasAnimation(still), false)
  // The shapes themselves stay, at their authored values.
  assert.match(still, /<circle cx="12" cy="12" r="4"><\/circle>/)
  assert.match(still, /<path d="M2 2h20"><\/path>/)
  assert.match(still, /<rect x="1" y="1" width="3" height="3"><\/rect>/)
})

test('a pulse that starts from nothing still draws a dot', () => {
  // The dot is authored at r="0" and grown by the animation, so removing the animation alone leaves a blank tile.
  const markup = svg('<circle cx="12" cy="12" r="0"><animate attributeName="r" values="0;8;0" dur="1s" repeatCount="indefinite"/></circle>')
  const still = staticFrame(markup)
  assert.match(still, /<circle[^>]* r="8"/, 'the dot is written at its largest value')
  assert.equal(/\sr="0"/.test(still), false, 'and is no longer the empty one')
  assert.equal(hasAnimation(still), false)
  // Control: the blank the fallback exists to avoid is what plain stripping gives.
  assert.match(markup.replace(/<animate[^>]*\/>/, ''), /r="0"/)
})

test('a fade-in still shows the path at full opacity', () => {
  const markup = svg('<path d="M4 12h16" stroke="#000" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="1s"/></path>')
  const still = staticFrame(markup)
  assert.match(still, /<path[^>]* opacity="1"/)
  assert.equal(/opacity="0"/.test(still), false)
})

test('an icon that already draws something at rest is not rewritten by the fallback', () => {
  // A spinner's rotation is left alone: stripping its animation leaves a drawn path, so the peak pass never runs.
  const markup = svg('<path d="M12 2a10 10 0 1 0 10 10" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s" repeatCount="indefinite"/></path>')
  const still = staticFrame(markup)
  assert.match(still, /opacity="0.5"/, 'the authored opacity survives')
  assert.equal(/transform=/.test(still), false, 'no rotation written onto the path')
})

test('markup that is not a string gives an empty still', () => {
  assert.equal(staticFrame(null), '')
  assert.equal(staticFrame(undefined), '')
  assert.equal(staticFrame(42), '')
})

test('repeatCount indefinite loops for ever', () => {
  assert.equal(loopsForever(svg('<circle r="3"><animate attributeName="r" dur="1s" repeatCount="indefinite"/></circle>')), true)
  assert.equal(loopsForever(svg("<circle r='3'><animate attributeName='r' dur='1s' repeatCount = 'indefinite'/></circle>")), true, 'single quotes and spaces')
})

test('a chained begin loops for ever', () => {
  // The Spinners set restarts each animation off the end of another, with no repeatCount at all.
  const chained = svg('<circle r="3"><animate id="a" attributeName="r" dur="1s" begin="0;b.end"/><animate id="b" attributeName="cy" dur="1s" begin="a.end"/></circle>')
  assert.equal(/repeatCount/.test(chained), false, 'POSITIVE CONTROL: the loop has no repeatCount')
  assert.equal(loopsForever(chained), true)
})

test('a single delayed start does not loop', () => {
  assert.equal(loopsForever(svg('<circle r="3"><animate attributeName="r" dur="1s" begin="0.5s" fill="freeze"/></circle>')), false)
  assert.equal(loopsForever(svg('<circle r="3"><animate attributeName="r" dur="1s" repeatCount="3"/></circle>')), false)
  assert.equal(loopsForever(svg('<circle r="3"/>')), false)
  assert.equal(loopsForever(null), false)
})

test('frameInfo reads a data URI once and gives a still as a data URI', () => {
  const markup = svg('<circle cx="12" cy="12" r="0"><animate attributeName="r" values="0;8;0" dur="1s" repeatCount="indefinite"/></circle>')
  const src = uri(markup)
  const info = frameInfo(src)
  assert.equal(info.animated, true)
  assert.equal(info.looping, true)
  assert.equal(frameInfo(src), info, 'the second read is the remembered object')
  assert.match(decodeURIComponent(info.still.slice('data:image/svg+xml;utf8,'.length)), /r="8"/)
  // An icon that does not move says so.
  const flat = frameInfo(uri(svg('<circle r="3"/>')))
  assert.equal(flat.animated, false)
  assert.equal(flat.looping, false)
  // A source it cannot read is null, so the caller draws it as it is.
  assert.equal(frameInfo('https://example.com/a.svg'), null)
  assert.equal(frameInfo('data:image/svg+xml;utf8,%E0%A4%A'), null, 'a broken escape does not throw')
})
