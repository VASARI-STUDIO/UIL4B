// Per-route canonical + soon-route robots directive (B3). These are the pure,
// DOM-free parts of routeMeta.js — the DOM-mutating half (updateRouteMeta)
// needs `document` and is covered by the manual Playwright walk documented in
// the PR, not here.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalUrl, isSoonRoute } from '../../src/utils/routeMeta.js'

test('canonicalUrl never falls back to the homepage for a real route', () => {
  assert.equal(canonicalUrl('/color/palette'), 'https://www.uil4b.com/color/palette')
  assert.equal(canonicalUrl('/icons'), 'https://www.uil4b.com/icons')
})

test('canonicalUrl strips query, hash and trailing slash, keeps the bare root', () => {
  assert.equal(canonicalUrl('/ratio?foo=bar'), 'https://www.uil4b.com/ratio')
  assert.equal(canonicalUrl('/emoji#recent'), 'https://www.uil4b.com/emoji')
  assert.equal(canonicalUrl('/icons/'), 'https://www.uil4b.com/icons')
  assert.equal(canonicalUrl('/'), 'https://www.uil4b.com/')
  assert.equal(canonicalUrl(''), 'https://www.uil4b.com/')
})

test('isSoonRoute is true only for a Create tool/category still in the workshop', () => {
  // /box-shadow's tool + its group (`component`) both carry soon: true.
  assert.equal(isSoonRoute('/box-shadow'), true)
  // /ui-builder-cat is the `component` group's still-building category home.
  assert.equal(isSoonRoute('/ui-builder-cat'), true)
})

test('isSoonRoute is false for shipped Create tools and non-Create routes', () => {
  assert.equal(isSoonRoute('/color/palette'), false)
  assert.equal(isSoonRoute('/icons'), false)
  // The three typography tools went live together — the group and all three
  // tools flipped to soon: false, so none of them may be marked noindex.
  assert.equal(isSoonRoute('/typescale'), false)
  assert.equal(isSoonRoute('/fontpairs'), false)
  assert.equal(isSoonRoute('/fontgallery'), false)
  assert.equal(isSoonRoute('/typography'), false)
  assert.equal(isSoonRoute('/settings'), false)
  assert.equal(isSoonRoute('/plans'), false)
  assert.equal(isSoonRoute('/'), false)
})
