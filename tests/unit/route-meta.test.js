// Per-route canonical + soon-route robots directive (B3). These are the pure,
// DOM-free parts of routeMeta.js — the DOM-mutating half (updateRouteMeta)
// needs `document` and is covered by the manual Playwright walk documented in
// the PR, not here.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalUrl, isSoonRoute } from '../../src/utils/routeMeta.js'

test('canonicalUrl never falls back to the homepage for a real route', () => {
  assert.equal(canonicalUrl('/create/palette'), 'https://uil4b.com/create/palette')
  assert.equal(canonicalUrl('/create/icons'), 'https://uil4b.com/create/icons')
})

test('canonicalUrl strips query, hash and trailing slash, keeps the bare root', () => {
  assert.equal(canonicalUrl('/create/aspect-ratio?foo=bar'), 'https://uil4b.com/create/aspect-ratio')
  assert.equal(canonicalUrl('/create/emoji#recent'), 'https://uil4b.com/create/emoji')
  assert.equal(canonicalUrl('/create/icons/'), 'https://uil4b.com/create/icons')
  assert.equal(canonicalUrl('/'), 'https://uil4b.com/')
  assert.equal(canonicalUrl(''), 'https://uil4b.com/')
})

test('isSoonRoute is true only for a Create tool/category still in the workshop', () => {
  // /create/box-shadow's tool + its group (`component`) both carry soon: true.
  assert.equal(isSoonRoute('/create/box-shadow'), true)
  // /create/components is the `component` group's still-building category home.
  assert.equal(isSoonRoute('/create/components'), true)
})

test('isSoonRoute is false for shipped Create tools and non-Create routes', () => {
  assert.equal(isSoonRoute('/create/palette'), false)
  assert.equal(isSoonRoute('/create/icons'), false)
  // The three typography tools went live together — the group and all three
  // tools flipped to soon: false, so none of them may be marked noindex.
  assert.equal(isSoonRoute('/create/type-scale'), false)
  assert.equal(isSoonRoute('/create/font-pair'), false)
  assert.equal(isSoonRoute('/create/font-gallery'), false)
  assert.equal(isSoonRoute('/create/typography'), false)
  assert.equal(isSoonRoute('/settings'), false)
  assert.equal(isSoonRoute('/plans'), false)
  assert.equal(isSoonRoute('/'), false)
})
