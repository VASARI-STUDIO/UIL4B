// Punctuated, multi-word queries find their tool. The index is split on every
// non-letter ("Alt Text" -> alt, text); the query used to split on spaces only,
// so "tint, generator" asked for a word that no token starts with.
import test from 'node:test'
import assert from 'node:assert/strict'
import { TOOL_ENTRIES, queryCommandIndex } from '../../src/data/toolIndex.js'

const find = (query) => queryCommandIndex(query, { tools: TOOL_ENTRIES.filter((t) => !t.soon) }).tools.map((t) => t.id)

test('punctuation in a multi-word query does not hide the tool', () => {
  assert.ok(find('tint, generator').includes('tint'), '"tint, generator" finds the Tint tool')
  assert.ok(find('tint generator.').includes('tint'), '"tint generator." finds the Tint tool')
  assert.ok(find('alt-text generator').includes('alt-text'), '"alt-text generator" finds Alt Text')
})

test('a hyphenated or trailing-punctuation single word still matches', () => {
  assert.ok(find('alt-text').includes('alt-text'))
  assert.ok(find('tint,').includes('tint'))
})

test('the plain queries and nonsense behave as before', () => {
  assert.ok(find('tint generator').includes('tint'))
  assert.deepEqual(find('...'), [])
  assert.deepEqual(find('zzzq, qqqz'), [])
})

test('Learn guides are flagged as guides, and Create tools are not', () => {
  const guides = TOOL_ENTRIES.filter((t) => t.guide).map((t) => t.id)
  assert.ok(guides.includes('docs-brand'), 'Brand Colour Guide is a guide')
  assert.ok(!TOOL_ENTRIES.find((t) => t.id === 'tint').guide)
})
