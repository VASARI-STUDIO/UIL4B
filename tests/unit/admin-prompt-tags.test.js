// Admin → Prompts crashed the first time a prompt with tags was submitted.
//
// Community prompts store `tags` as ONE STRING: buildCommunityPromptRecord
// writes `tags.trim()` and firestore.rules requires `tags is string`. The
// admin card called `(prompt.tags || []).join(', ')` and `prompt.tags.map(...)`
// on it — a string has neither, so the first tagged submission threw inside
// the Admin page. Saving an edit
// then wrote an ARRAY back, which the Prompt Library's search reads with
// `.toLowerCase()`, so an edited prompt would have crashed that page next.
import test from 'node:test'
import assert from 'node:assert/strict'
import { promptTagList, promptTagString } from '../../src/utils/promptStore.js'
import { read, stripComments } from './helpers/source-text.js'

test('tags stored as the string the rules require become a list', () => {
  assert.deepEqual(promptTagList('landing-page, hero ,, Modern'), ['landing-page', 'hero', 'Modern'])
  assert.deepEqual(promptTagList(''), [])
  assert.deepEqual(promptTagList(undefined), [])
  assert.deepEqual(promptTagList(null), [])
})

test('a document an earlier admin edit saved as an array still reads', () => {
  assert.deepEqual(promptTagList(['hero', ' modern ', '']), ['hero', 'modern'])
})

test('an edit is written back as the string shape, never an array', () => {
  assert.equal(promptTagString('hero,  modern ,,landing'), 'hero, modern, landing')
  assert.equal(typeof promptTagString(['a', 'b']), 'string')
})

test('the admin card reads tags only through the helper', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.ok(!/prompt\.tags\s*\|\|\s*\[\]/.test(src), 'Admin.jsx treats prompt.tags as an array again')
  assert.ok(!/prompt\.tags\.map\(/.test(src), 'Admin.jsx maps over prompt.tags directly again')
  assert.ok(!/tags:\s*tags\.split\(/.test(src), 'Admin.jsx saves tags as an array again')
  assert.ok((src.match(/promptTagList\(prompt\.tags\)/g) || []).length >= 2)
})
