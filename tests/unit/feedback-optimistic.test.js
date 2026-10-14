import test from 'node:test'
import assert from 'node:assert/strict'
import {
  requestIdFor, postSupportWithRetry, startSupportSend, recoverFeedbackDraft,
  guardSupportUnload, supportError, createSupportHolder,
} from '../../src/utils/supportRequest.js'

const PAYLOAD = { type: 'bug', subject: 'Export', message: 'The export did nothing.', email: '', source: 'inline' }
const makeDraft = () => {
  const attempt = { current: null }
  const body = { current: { ...PAYLOAD, requestId: requestIdFor(attempt, PAYLOAD) } }
  return { attempt, body }
}

function network(t, responses) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options, parsed: JSON.parse(options.body) })
    const response = responses.shift()
    if (response instanceof Error) throw response
    return response || { ok: false, status: 503 }
  })
  const realTimer = globalThis.setTimeout
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => realTimer(fn, ms === 1500 ? 0 : ms))
  return calls
}

test('one request per submit, including two submits before React can render', async t => {
  const calls = network(t, [{ ok: true, status: 200 }])
  const sending = { current: false }
  const { body } = makeDraft()
  const first = startSupportSend(sending, body.current)
  assert.equal(startSupportSend(sending, body.current), null)
  assert.equal((await first).ok, true)
  assert.equal(calls.length, 1)
  assert.equal(sending.current, false)
})

for (const failure of [{ ok: false, status: 503 }, new Error('offline')]) {
  test(`one auto-retry on ${failure instanceof Error ? 'network' : '5xx'} with the same requestId`, async t => {
    const calls = network(t, [failure, { ok: false, status: 503 }])
    const { body } = makeDraft()
    assert.equal((await postSupportWithRetry(body.current)).ok, false)
    assert.equal(calls.length, 2, 'only one automatic retry even if both attempts fail')
    assert.deepEqual(calls.map(call => call.parsed), [body.current, body.current])
  })
}

test('429 returns the rate-limit error immediately without a retry', async t => {
  const calls = network(t, [{ ok: false, status: 429 }, { ok: true, status: 200 }])
  const result = await postSupportWithRetry(makeDraft().body.current)
  assert.equal(result.status, 429)
  assert.equal(calls.length, 1)
  assert.equal(supportError(result.status), 'Too many messages just now. Try again in a minute.')
})

test('Try again sends exactly one request with the same requestId, even on 5xx', async t => {
  const calls = network(t, [{ ok: false, status: 400 }, { ok: false, status: 503 }])
  const { body } = makeDraft()
  const sending = { current: false }
  await startSupportSend(sending, body.current)
  const id = calls[0].parsed.requestId
  assert.equal((await startSupportSend(sending, body.current, { retry: false })).ok, false)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].parsed.requestId, id)
})

test('edit after failure and reopening retain the filled draft and requestId', () => {
  const { body, attempt } = makeDraft()
  const draft = { ...PAYLOAD }
  const id = body.current.requestId
  assert.equal(recoverFeedbackDraft(body, attempt), true)
  assert.equal(body.current, null, 'the failed frozen body must not block the editable form')
  assert.deepEqual(draft, PAYLOAD)
  assert.equal(requestIdFor(attempt, draft), id)
  assert.equal(recoverFeedbackDraft(body, attempt), true, 'closing after editing must still preserve the draft')
  assert.equal(requestIdFor(attempt, draft), id)
})

test('changing text after failure creates a new requestId', () => {
  const { body, attempt } = makeDraft()
  const id = body.current.requestId
  recoverFeedbackDraft(body, attempt)
  assert.notEqual(requestIdFor(attempt, { ...PAYLOAD, message: 'Export is still broken.' }), id)
})

test('a new seed replaces a failed draft and starts a new requestId', () => {
  const { body, attempt } = makeDraft()
  const id = body.current.requestId
  assert.equal(recoverFeedbackDraft(body, attempt, { typeId: 'bug', message: 'New report' }), false)
  assert.equal(body.current, null)
  assert.equal(attempt.current, null)
  assert.notEqual(requestIdFor(attempt, PAYLOAD), id)
})

test('keepalive uses UTF-8 bytes and is enabled only below 60 KB', async t => {
  const calls = network(t, Array.from({ length: 3 }, () => ({ ok: true, status: 200 })))
  await postSupportWithRetry({ message: 'Small draft' })
  await postSupportWithRetry({ message: 'x'.repeat(60 * 1024) })
  await postSupportWithRetry({ message: '😀'.repeat(16000) })
  assert.deepEqual(calls.map(call => call.keepalive), [true, false, false])
})

test('beforeunload guard is absent when inactive and removed when dismissed', () => {
  const handlers = new Map()
  const target = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: (name, handler) => { if (handlers.get(name) === handler) handlers.delete(name) },
  }
  assert.equal(guardSupportUnload(false, target), undefined)
  assert.equal(handlers.size, 0)
  const cleanup = guardSupportUnload(true, target)
  let prevented = false
  const event = { preventDefault: () => { prevented = true } }
  handlers.get('beforeunload')(event)
  assert.equal(prevented, true)
  assert.equal(event.returnValue, '')
  cleanup()
  assert.equal(handlers.size, 0)
})


test('holder keeps the failure and draft after unsubscribe and its toast retries the exact body once', async t => {
  const calls = network(t, [{ ok: false, status: 502 }, { ok: false, status: 502 }, { ok: true, status: 200 }])
  const holder = createSupportHolder()
  const { body, attempt } = makeDraft()
  const draft = { ...PAYLOAD, attempt: attempt.current }
  let visible = true
  let notified = null
  let updates = 0
  const unsubscribe = holder.subscribe(() => { updates++ })
  const pending = holder.send(body.current, draft, {
    visible: () => visible,
    notify: (status, retry) => { notified = { status, retry } },
  })
  assert.equal(holder.getSnapshot().status, 'sending')
  assert.equal(holder.send(body.current, draft), null, 'rapid submits share the holder lock')
  holder.reset()
  assert.equal(holder.getSnapshot().status, 'sending', 'reset cannot discard an active delivery')
  visible = false
  unsubscribe()
  await pending
  assert.equal(updates, 1, 'delivery finishes without a mounted subscriber')
  assert.equal(holder.getSnapshot().status, 'failed')
  assert.deepEqual(holder.getSnapshot().draft, draft)
  assert.equal(notified.status, 502)
  assert.equal(calls.length, 2)
  await notified.retry()
  assert.equal(calls.length, 3)
  assert.deepEqual(calls.map(call => call.parsed), [body.current, body.current, body.current])
  assert.equal(holder.getSnapshot().status, 'sent')
})

test('holder preserves visible failures on reopening and Edit message retains the draft', async t => {
  const calls = network(t, [{ ok: false, status: 429 }])
  const holder = createSupportHolder()
  const { body, attempt } = makeDraft()
  const draft = { ...PAYLOAD, attempt: attempt.current }
  let notifications = 0
  await holder.send(body.current, draft, { visible: () => true, notify: () => { notifications++ } })
  assert.equal(calls.length, 1)
  assert.equal(notifications, 0)
  let restored = null
  const unsubscribe = holder.subscribe(() => { restored = holder.getSnapshot() })
  assert.equal(holder.getSnapshot().status, 'failed')
  holder.edit()
  assert.equal(restored.status, 'editing')
  assert.equal(restored.draft, draft)
  assert.equal(restored.body.requestId, body.current.requestId)
  unsubscribe()
  holder.reset()
  assert.equal(holder.getSnapshot().status, 'idle')
  assert.equal(holder.getSnapshot().draft, null)
})
