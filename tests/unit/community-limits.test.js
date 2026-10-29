// The client half of docs/design/queue-limits-rules.patch: the counter sums in
// utils/communityLimits.js and the batch communityQueueApi.js writes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import fs from 'node:fs'
import {
  COMMUNITY_LIMITS_ENABLED, POST_COOLDOWN_MS, POST_LIMIT_RULE, mergeUnstamped, POST_WINDOW_MS, PostLimitError, isPostLimit, planCounter, queueOrderField,
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

test('a refusal says the limits in plain words, with the wait when there is one', () => {
  assert.equal(POST_LIMIT_RULE, 'You can share one item every 30 seconds, and 10 prompts and 10 other items a day.')
  const wait = new PostLimitError('cooldown', 12_400)
  assert.equal(wait.message, `${POST_LIMIT_RULE} Try again in 13 seconds.`)
  assert.equal(new PostLimitError('cooldown', 1).message, `${POST_LIMIT_RULE} Try again in 1 second.`)
  const day = new PostLimitError('daily', 3_600_000)
  assert.ok(day.message.startsWith(POST_LIMIT_RULE))
  assert.match(day.message, /try again tomorrow/)
  for (const e of [wait, day]) assert.ok(!/post(ed|s)?\b/i.test(e.message), `"${e.message}" should say share, not post`)
})

test('isPostLimit tells a limit from any other failure', () => {
  assert.equal(isPostLimit(new PostLimitError('cooldown', 5000)), true)
  assert.equal(isPostLimit(Object.assign(new Error('x'), { code: 'permission-denied' })), false)
  assert.equal(isPostLimit(new Error('offline')), false)
  assert.equal(isPostLimit(null), false)
  assert.equal(isPostLimit(undefined), false)
})

test('every place that posts to the community shows the limit message instead of the generic failure', () => {
  const read = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')
  const GENERIC = /we could not reach the review queue|Failed to submit/
  for (const file of ['src/pages/Community.jsx', 'src/pages/PaletteBuilder.jsx', 'src/components/prompt/SubmitPromptPanel.jsx']) {
    const src = read(file)
    assert.match(src, /import \{ isPostLimit \} from '[./]+\/utils\/communityLimits'/, `${file} imports isPostLimit`)
    const catches = [...src.matchAll(/toast\??\.?\(\s*isPostLimit\(err\)\s*\?\s*(?:`\$\{err\.message\}[^`]*`|err\.message)\s*:\s*'([^']+)'/g)]
    assert.ok(catches.length >= 1, `${file}: a limit refusal is shown as itself`)
    for (const c of catches) assert.match(c[1], GENERIC, `${file}: the generic failure stays for every other error`)
  }
  assert.equal([...read('src/pages/Community.jsx').matchAll(/isPostLimit\(err\)/g)].length, 2, 'the design and the icon flows')
})

test('items with no submittedAt are merged into the queue by createdAt, once, and the cap holds', () => {
  const stamp = (iso) => ({ toMillis: () => Date.parse(iso) })
  const stamped = [
    { id: 'a', submittedAt: stamp('2026-10-29T10:00:00Z'), createdAt: '2026-10-29T10:00:00Z' },
    { id: 'b', submittedAt: stamp('2026-10-27T10:00:00Z'), createdAt: '2026-10-27T10:00:00Z' },
  ]
  const byCreated = [
    stamped[0],
    { id: 'old', createdAt: '2026-10-28T10:00:00Z' },
    { id: 'older', submittedAt: null, createdAt: '2026-10-01T10:00:00Z' },
  ]
  const merged = mergeUnstamped(stamped, byCreated, 3)
  assert.deepEqual(merged.map((i) => i.id), ['a', 'old', 'b'], 'ordered newest first, stamped item not repeated, capped at 3')
  assert.equal(mergeUnstamped(stamped, [stamped[1]], 3), stamped, 'nothing unstamped: the list is returned as it was')
})
