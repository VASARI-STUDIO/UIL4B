import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  SUBMIT_INTENT_TTL_MS,
  consumeSubmitIntent,
  hasSubmitIntent,
  readSubmitIntent,
  resetSubmitIntent,
  setSubmitIntent,
  validateSubmitIntent,
} from '../../src/utils/submitIntent.js'

afterEach(() => resetSubmitIntent())

test('a known submission surface stages an in-memory intent', () => {
  const now = Date.now()
  assert.equal(setSubmitIntent('palette', now), true)
  assert.deepEqual(readSubmitIntent(), { version: 1, surface: 'palette', at: now })
  assert.equal(hasSubmitIntent('palette'), true)
  assert.equal(hasSubmitIntent('gradient'), false)
})

test('unknown submission surfaces are rejected instead of guessed', () => {
  assert.equal(setSubmitIntent('admin'), false)
  assert.equal(readSubmitIntent(), null)
})

test('a committed consumer receives the intent once', () => {
  setSubmitIntent('community')
  assert.equal(hasSubmitIntent('community'), true)
  consumeSubmitIntent()
  assert.equal(readSubmitIntent(), null)
})

test('stale and future intents never reopen a form', () => {
  const now = 2_000_000
  assert.equal(validateSubmitIntent({ version: 1, surface: 'prompt', at: now - SUBMIT_INTENT_TTL_MS - 1 }, now), null)
  assert.equal(validateSubmitIntent({ version: 1, surface: 'prompt', at: now + 1 }, now), null)
})
