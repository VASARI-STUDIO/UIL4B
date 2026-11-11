// SAVED CUSTOM ICONS — src/utils/customIcons.js.
//
// `vs-custom-icons` is localStorage, so what the page reads from it is not trusted:
// every record goes through the allow-list sanitiser on load. A record that
// carries script, an on* handler, a javascript: href or a foreignObject comes out
// clean (or is dropped when nothing drawable is left); a normal one survives
// unchanged. Fixed fixtures, no DOM.
//
// MUTATION: make cleanCustomIcon return `{ ...record }` without calling sanitiseSvgInline
//   -> the script, on*, href and foreignObject tests fail.
// MUTATION: drop the DRAWS_RE check -> "nothing drawable left ... is dropped" fails.
// MUTATION: drop `root` handling in symbolMarkup -> "keeps its root look on the symbol" fails.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanCustomIcon, cleanCustomIcons, customSymbolKey } from '../../src/utils/customIcons.js'
import { symbolMarkup } from '../../src/utils/iconSprite.js'

const SVG = (body, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attrs}>${body}</svg>`
const record = (key, svg, extra = {}) => ({ key, name: `Custom (${key})`, base: key, svg, colored: false, ...extra })

const CLEAN = record('vs-custom-icons:1:aaaaa', SVG('<path d="M5 12h14"/>', 'fill="none" stroke="currentColor" stroke-width="2"'))

test('a normal saved icon survives with its markup and fields unchanged', () => {
  const out = cleanCustomIcon(CLEAN)
  assert.ok(out)
  assert.equal(out.key, CLEAN.key)
  assert.equal(out.name, CLEAN.name)
  assert.match(out.svg, /<path d="M5 12h14"\/>/)
  assert.match(out.svg, /stroke="currentColor"/)
})

test('a <script> element is removed and the drawing stays', () => {
  const out = cleanCustomIcon(record('s', SVG('<script>window.__pwned=1</script><path d="M0 0h24v24H0z"/>')))
  assert.ok(out)
  assert.doesNotMatch(out.svg, /script|__pwned/i)
  assert.match(out.svg, /<path d="M0 0h24v24H0z"\/>/)
})

test('an on* attribute is removed from the element that carried it', () => {
  const out = cleanCustomIcon(record('o', SVG('<path onclick="window.__pwned=1" onmouseover="alert(1)" d="M0 0h24v24H0z"/>', 'onload="window.__pwned=1"')))
  assert.ok(out)
  assert.doesNotMatch(out.svg, /\bon\w+\s*=/i)
  assert.doesNotMatch(out.svg, /__pwned|alert/)
})

test('a javascript: href (also as xlink:href, and cloaked) does not survive', () => {
  for (const href of ['javascript:alert(1)', 'java\tscript:alert(1)', '&#106;avascript:alert(1)']) {
    const out = cleanCustomIcon(record('h', SVG(`<use xlink:href="${href}"/><path d="M0 0h24v24H0z"/>`, 'xmlns:xlink="http://www.w3.org/1999/xlink"')))
    assert.ok(out, href)
    assert.doesNotMatch(out.svg, /javascript|java\s*script|alert/i, href)
    assert.doesNotMatch(out.svg, /<use/, `${href}: an external <use> is removed`)
  }
})

test('a foreignObject is removed with everything inside it', () => {
  const out = cleanCustomIcon(record('f', SVG('<foreignObject width="24" height="24"><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="window.__pwned=1"/></div></foreignObject><circle cx="12" cy="12" r="8"/>')))
  assert.ok(out)
  assert.doesNotMatch(out.svg, /foreignObject|<div|<img|onerror|__pwned/i)
  assert.match(out.svg, /<circle cx="12" cy="12" r="8"\/>/)
})

test('a record with nothing drawable left, or no markup at all, is dropped', () => {
  assert.equal(cleanCustomIcon(record('e1', SVG('<script>window.__pwned=1</script>'))), null)
  assert.equal(cleanCustomIcon(record('e2', SVG('<foreignObject><p>hi</p></foreignObject>'))), null)
  assert.equal(cleanCustomIcon(record('e3', '<div onclick="x"></div>')), null, 'not an <svg>')
  assert.equal(cleanCustomIcon(record('e4', '<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')), null, 'a DOCTYPE rejects the file')
  assert.equal(cleanCustomIcon({ key: 'e5' }), null, 'no svg field')
  assert.equal(cleanCustomIcon({ key: 'e6', svg: 42 }), null, 'svg is not a string')
  assert.equal(cleanCustomIcon(null), null)
  assert.equal(cleanCustomIcon('<svg/>'), null)
  assert.equal(cleanCustomIcon([]), null)
})

test('a stored list keeps the clean ones, in order, and drops only the broken ones', () => {
  const hostile = record('x', SVG('<script>window.__pwned=1</script>'))
  const dirty = record('d', SVG('<path onclick="window.__pwned=1" d="M1 1h22"/>'))
  const second = record('c2', SVG('<rect x="2" y="2" width="20" height="20"/>'))
  const out = cleanCustomIcons([CLEAN, hostile, 'not a record', null, dirty, second])
  assert.deepEqual(out.map((r) => r.key), [CLEAN.key, 'd', 'c2'])
  assert.doesNotMatch(out.map((r) => r.svg).join(''), /onclick|__pwned/)
})

test('a list that is not an array reads as empty', () => {
  assert.deepEqual(cleanCustomIcons(null), [])
  assert.deepEqual(cleanCustomIcons({ 0: CLEAN }), [])
  assert.deepEqual(cleanCustomIcons('[]'), [])
})

test('the sprite key is namespaced, so a saved icon can never be the key of a pack glyph', () => {
  assert.equal(customSymbolKey(CLEAN), `custom:${CLEAN.key}`)
  // A pack glyph's key is `${pack}:${name}` (utils/animatedIconCache.js glyphKey); no pack is called `custom`.
  assert.ok(customSymbolKey({ key: 'lucide:arrow-right' }).startsWith('custom:'))
  assert.notEqual(customSymbolKey({ key: 'lucide:arrow-right' }), 'lucide:arrow-right')
})

test('a saved icon keeps its root look on the symbol, a pack glyph does not need it', () => {
  const svg = SVG('<path d="M5 12h14"/>', 'width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" color="#ff0000"')
  const kept = symbolMarkup(svg, 'ics1', { root: true })
  assert.match(kept, /^<symbol id="ics1" viewBox="0 0 24 24"><g /)
  assert.match(kept, /fill="none"/)
  assert.match(kept, /stroke="currentColor"/)
  assert.match(kept, /stroke-width="2"/)
  assert.match(kept, /stroke-linecap="round"/)
  assert.match(kept, /color="#ff0000"/)
  assert.doesNotMatch(kept, /width="48"|height="48"|xmlns/, 'size and namespace stay off the group')
  // Without `root` the symbol is the body alone: the pack glyphs' shape is unchanged.
  assert.equal(symbolMarkup(svg, 'ics2'), '<symbol id="ics2" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>')
})

test('two saved icons that both define id="a" cannot meet in the sprite', () => {
  const body = '<defs><linearGradient id="a"><stop offset="0" stop-color="#000"/></linearGradient></defs><path fill="url(#a)" d="M0 0h24v24H0z"/>'
  const one = symbolMarkup(SVG(body), 'ics10', { root: true })
  const two = symbolMarkup(SVG(body), 'ics11', { root: true })
  assert.match(one, /id="ics10\.a"/)
  assert.match(two, /id="ics11\.a"/)
  assert.doesNotMatch(one + two, /id="a"/)
})
