// src/data/proPreviewIds.js is a copy of "which previewed prompts are locked":
// the community rows with no text that have a built preview.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRO_PREVIEW_IDS, isProPreview } from '../../src/data/proPreviewIds.js'
import { COMMUNITY_PROMPT_ROWS } from '../../src/data/communityPrompts.js'
import { hasPromptPreview } from '../../src/data/promptPreviewAssets.js'

test('PRO_PREVIEW_IDS is the previewed rows that carry no text', () => {
  const locked = COMMUNITY_PROMPT_ROWS
    .filter((r) => typeof r.text !== 'string' && hasPromptPreview(r.id))
    .map((r) => r.id)
  assert.deepEqual([...PRO_PREVIEW_IDS].sort(), locked.sort())
})

test('isProPreview answers for the list only', () => {
  assert.equal(isProPreview('c-4'), true)
  assert.equal(isProPreview('c-1'), false)
  assert.equal(isProPreview('constructor'), false)
})
