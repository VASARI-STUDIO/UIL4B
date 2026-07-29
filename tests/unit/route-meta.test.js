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
  // /fontgallery's tool + its group (`type`) both carry soon: true.
  assert.equal(isSoonRoute('/fontgallery'), true)
  // /typography is the `type` group's still-building category home.
  assert.equal(isSoonRoute('/typography'), true)
})

test('isSoonRoute is false for shipped Create tools and non-Create routes', () => {
  assert.equal(isSoonRoute('/color/palette'), false)
  assert.equal(isSoonRoute('/icons'), false)
  assert.equal(isSoonRoute('/settings'), false)
  assert.equal(isSoonRoute('/plans'), false)
  assert.equal(isSoonRoute('/'), false)
})
