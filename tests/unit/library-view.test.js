// The full-screen view flag (`?view=full`) of a library page.
//
// Three things must hold or the feature quietly breaks:
//   - only the exact flag turns the view on (`?view=compact`, `?view=` and a
//     missing flag leave the normal page alone);
//   - the address handed to the new window keeps the list the visitor is reading
//     (the hash) and every other query parameter;
//   - the address the way back goes to loses the flag and keeps the rest.
// And the view exists only on pages that have one: a flag on any other path is
// ignored, so no other page can lose its nav to a stray query.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isFullView, fullViewHref, normalViewHref, hasFullView, wantsFullView } from '../../src/utils/libraryView.js'

test('only ?view=full turns the full-screen view on', () => {
  assert.equal(isFullView('?view=full'), true)
  assert.equal(isFullView('?a=1&view=full'), true)
  assert.equal(isFullView(''), false)
  assert.equal(isFullView(undefined), false)
  assert.equal(isFullView('?view='), false)
  assert.equal(isFullView('?view=compact'), false)
  assert.equal(isFullView('?view=FULL'), false)
  assert.equal(isFullView('?fullview=full'), false)
})

test('the new window gets the same page, list and other query kept', () => {
  assert.equal(fullViewHref('/discover/prompts', '', ''), '/discover/prompts?view=full')
  assert.equal(fullViewHref('/discover/prompts', '', '#website'), '/discover/prompts?view=full#website')
  assert.equal(fullViewHref('/discover/prompts', '?q=logo', '#all'), '/discover/prompts?q=logo&view=full#all')
  // Already full: still one flag, not two.
  assert.equal(fullViewHref('/discover/prompts', '?view=full', ''), '/discover/prompts?view=full')
})

test('the way back drops the flag and keeps everything else', () => {
  assert.equal(normalViewHref('/discover/prompts', '?view=full', ''), '/discover/prompts')
  assert.equal(normalViewHref('/discover/prompts', '?view=full', '#website'), '/discover/prompts#website')
  assert.equal(normalViewHref('/discover/prompts', '?q=logo&view=full', '#all'), '/discover/prompts?q=logo#all')
  assert.equal(normalViewHref('/discover/prompts', '', ''), '/discover/prompts')
})

test('open and back are inverses for the page, the list and the other query', () => {
  const there = fullViewHref('/discover/prompts', '?q=logo', '#ui-components')
  const url = new URL(there, 'https://example.test')
  assert.equal(normalViewHref(url.pathname, url.search, url.hash), '/discover/prompts?q=logo#ui-components')
})

test('only the Prompt Library has a full-screen view, matched like the app shell matches paths', () => {
  assert.equal(hasFullView('/discover/prompts'), true)
  assert.equal(hasFullView('/Discover/Prompts/'), true)
  assert.equal(hasFullView('/discover/palettes'), false)
  assert.equal(hasFullView('/discover'), false)
  assert.equal(hasFullView('/'), false)
  assert.equal(hasFullView(''), false)
})

test('a flag on a page with no full-screen view is ignored', () => {
  assert.equal(wantsFullView('/discover/prompts', '?view=full'), true)
  assert.equal(wantsFullView('/discover/prompts', ''), false)
  assert.equal(wantsFullView('/discover/palettes', '?view=full'), false)
  assert.equal(wantsFullView('/projects', '?view=full'), false)
})
