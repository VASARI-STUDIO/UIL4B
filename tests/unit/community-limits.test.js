// The client half of docs/design/queue-limits-rules.patch: the counter sums in
// utils/communityLimits.js and the batch communityQueueApi.js writes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import fs from 'node:fs'
import {
  COMMUNITY_LIMITS_ENABLED, POST_COOLDOWN_MS, POST_WINDOW_MS, PostLimitError, planCounter, queueOrderField,
} from '../../src/utils/communityLimits.js'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

const STAMP = { __serverTimestamp: true }
const ts = (ms) => ({ toMillis: () => ms })
const T0 = 1_800_000_000_000
const stored = (over = {}) => ({
  windowStart: ts(T0), lastAt: ts(T0), lastKind: 'prompt', lastId: 'p0', prompts: 1, submissions: 0, ...over,
})
const plan = (prev, over = {}) => planCounter(prev, { kind: 'submission', id: 's1', nowMs: T0 + 60_000, stamp: STAMP, ...over })

test('the flag ships off, so the client keeps working against the old rules', () => {
  assert.equal(COMMUNITY_LIMITS_ENABLED, false)
  assert.equal(queueOrderField(), 'createdAt')
  assert.equal(queueOrderField(true), 'submittedAt')
})

test('a first post starts a window with only its own kind counted', () => {
  const { mode, data } = plan(null)
  assert.equal(mode, 'start')
  assert.deepEqual(data, { lastAt: STAMP, lastKind: 'submission', lastId: 's1', windowStart: STAMP, submissions: 1, prompts: 0 })
})

test('a later post in the window keeps the window start and adds one to its own kind only', () => {
  const prev = stored()
  const { mode, data } = plan(prev)
  assert.equal(mode, 'keep')
  assert.equal(data.windowStart, prev.windowStart, 'the stored start is sent back unchanged')
  assert.equal(data.submissions, 1)
  assert.equal(data.prompts, 1)
  assert.equal(data.lastId, 's1')
})

test('a second post inside 30 seconds is refused, and one at 31 seconds is not', () => {
  assert.throws(() => plan(stored(), { nowMs: T0 + POST_COOLDOWN_MS - 1 }), (e) => e instanceof PostLimitError && e.reason === 'cooldown')
  assert.doesNotThrow(() => plan(stored(), { nowMs: T0 + POST_COOLDOWN_MS + 1_000 }))
})

test('the 11th of a kind in a window is refused, and the other kind is still allowed', () => {
  const full = stored({ prompts: 10, submissions: 10 })
  assert.throws(() => plan(full, { kind: 'prompt' }), (e) => e.reason === 'daily')
  const tenPrompts = stored({ prompts: 10, submissions: 3 })
  assert.equal(plan(tenPrompts, { kind: 'submission' }).data.submissions, 4)
})

test('after 24 hours the window restarts on the server stamp with one post', () => {
  const { mode, data } = plan(stored({ prompts: 10, submissions: 10 }), { nowMs: T0 + POST_WINDOW_MS })
  assert.equal(mode, 'restart')
  assert.equal(data.windowStart, STAMP)
  assert.deepEqual([data.submissions, data.prompts], [1, 0])
})

test('the retry takes the other branch and skips the client-side refusals', () => {
  assert.equal(plan(stored(), { flip: true }).mode, 'restart')
  assert.equal(plan(stored(), { nowMs: T0 + POST_WINDOW_MS, flip: true }).mode, 'keep')
})

test('postWithLimits writes the post and the counter in one batch, with a server stamp', async () => {
  register('./helpers/stub-loader.mjs', import.meta.url, { data: { queueApi: false } })
  const src = fs.readFileSync(new URL('../../src/utils/communityQueueApi.js', import.meta.url), 'utf8')
  assert.match(src, /batch\.set\(ref, \{ \.\.\.record, submittedAt: serverTimestamp\(\) \}\)/)
  assert.match(src, /batch\.set\(counterRef, data\)/)
  assert.match(src, /doc\(db, 'users', record\.authorUid, 'limits', 'community'\)/)
  assert.match(src, /orderBy\(queueOrderField\(\), 'desc'\)/)
  const panel = fs.readFileSync(new URL('../../src/components/prompt/SubmitPromptPanel.jsx', import.meta.url), 'utf8')
  assert.match(panel, /await publishPrompt\(doc\)/)
  assert.ok(!/addDoc/.test(panel), 'the prompt is written outside the counted batch again')
})

test('the client counter fields are the ones the rule checks', async () => {
  const rules = await fileTextThrough('queue-limits')
  for (const key of ['windowStart', 'lastAt', 'lastKind', 'lastId', 'prompts', 'submissions']) {
    assert.ok(rules.includes(`a.${key}`), `the counter rule no longer reads ${key}`)
  }
  assert.match(rules, /request\.resource\.data\.submittedAt == request\.time/)
  const keys = Object.keys(planCounter(null, { kind: 'prompt', id: 'x', nowMs: T0, stamp: STAMP }).data).sort()
  assert.deepEqual(keys, ['lastAt', 'lastId', 'lastKind', 'prompts', 'submissions', 'windowStart'])
})
