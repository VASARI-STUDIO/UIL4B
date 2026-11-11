import test from 'node:test'
import assert from 'node:assert/strict'
import {
  requestIdFor, postSupportWithRetry, startSupportSend, recoverFeedbackDraft,
  guardSupportUnload, supportError, createSupportHolder, staleDelivery, forgetSupportSenders,
  modalFeedbackSend, pageFeedbackSend,
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
  const id = body.current.requestId
  assert.equal(recoverFeedbackDraft(body, attempt), true)
  assert.equal(body.current, null, 'the failed frozen body must not block the editable form')
  assert.equal(requestIdFor(attempt, PAYLOAD), id, 'unchanged content keeps its id')
  assert.equal(recoverFeedbackDraft(body, attempt), true, 'closing after editing must still preserve the draft')
  assert.equal(requestIdFor(attempt, PAYLOAD), id)
  assert.notEqual(requestIdFor(attempt, { ...PAYLOAD, message: 'Changed after the failure.' }), id, 'an edit gets a new id')
  attempt.current = null
  assert.equal(recoverFeedbackDraft(body, attempt), false, 'nothing to preserve once the attempt is cleared')
  assert.notEqual(requestIdFor(attempt, PAYLOAD), id)
})

test('changing text after failure creates a new requestId', () => {
  const { body, attempt } = makeDraft()
  const id = body.current.requestId
  recoverFeedbackDraft(body, attempt)
  assert.notEqual(requestIdFor(attempt, { ...PAYLOAD, message: 'Export is still broken.' }), id)
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

test('a landed message is dropped by settle, with the address it carried', async t => {
  network(t, [{ ok: true, status: 200 }])
  const holder = createSupportHolder()
  const { body } = makeDraft()
  const withEmail = { ...body.current, email: 'someone@example.com' }
  await holder.send(withEmail, { ...PAYLOAD })
  assert.equal(holder.getSnapshot().status, 'sent')
  assert.equal(holder.getSnapshot().body.email, 'someone@example.com')
  holder.settle()
  assert.deepEqual(holder.getSnapshot(), { status: 'idle', body: null, draft: null, result: null })
})

test('settle keeps what is not finished: a send in flight and a failed draft', async t => {
  const calls = network(t, [{ ok: false, status: 400 }])
  const holder = createSupportHolder()
  const { body, attempt } = makeDraft()
  const draft = { ...PAYLOAD, attempt: attempt.current }
  const pending = holder.send(body.current, draft, { retry: false })
  holder.settle()
  assert.equal(holder.getSnapshot().status, 'sending', 'an in-flight send is never dropped')
  await pending
  holder.settle()
  assert.equal(holder.getSnapshot().status, 'failed', 'a failed draft survives for retry')
  assert.equal(holder.getSnapshot().draft, draft)
  assert.equal(calls.length, 1)
})

test('after a landed message the next send is a fresh request, not a duplicate', async t => {
  const calls = network(t, [{ ok: true, status: 200 }, { ok: true, status: 200 }])
  const holder = createSupportHolder()
  const attempt = { current: null }
  await holder.send({ ...PAYLOAD, requestId: requestIdFor(attempt, PAYLOAD) }, {})
  holder.settle()
  attempt.current = null
  assert.notEqual(holder.send({ ...PAYLOAD, requestId: requestIdFor(attempt, PAYLOAD) }, {}), null, 'the holder accepts a new send')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.length, 2)
  assert.notEqual(calls[1].parsed.requestId, calls[0].parsed.requestId)
})

test('an opening discards a landed message, and a seed also discards an old failure', () => {
  assert.equal(staleDelivery('sent', false), true)
  assert.equal(staleDelivery('sent', { subject: 'Crash' }), true)
  assert.equal(staleDelivery('failed', false), false, 'a failed draft may persist for a plain opening')
  assert.equal(staleDelivery('editing', false), false)
  assert.equal(staleDelivery('failed', { subject: 'Crash' }), true)
  assert.equal(staleDelivery('editing', { subject: 'Crash' }), true)
  assert.equal(staleDelivery('sending', { subject: 'Crash' }), false, 'an in-flight send is never discarded')
  assert.equal(staleDelivery('idle', { subject: 'Crash' }), false)
})

test('signing out clears a landed message and its address from both holders', async t => {
  network(t, [{ ok: true, status: 200 }])
  const { body } = makeDraft()
  const withEmail = { ...body.current, email: 'someone@example.com' }
  await pageFeedbackSend.send(withEmail, {})
  assert.equal(pageFeedbackSend.getSnapshot().body.email, 'someone@example.com')
  forgetSupportSenders()
  assert.equal(pageFeedbackSend.getSnapshot().body, null)
  assert.equal(modalFeedbackSend.getSnapshot().status, 'idle')
})

// A fetch that answers only when told, so a test can change account while a send is in flight.
function heldNetwork(t, status) {
  const calls = []
  const gates = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(JSON.parse(options.body))
    await new Promise(resolve => gates.push(resolve))
    return { ok: false, status }
  })
  const realTimer = globalThis.setTimeout
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => realTimer(fn, ms === 1500 ? 0 : ms))
  return { calls, release: (count = gates.length) => gates.splice(0, count).forEach(resolve => resolve()) }
}

test('a retry offered before sign-out sends nothing after it', async t => {
  const calls = network(t, [{ ok: false, status: 400 }])
  const holder = createSupportHolder()
  const { body } = makeDraft()
  let offered = null
  await holder.send(body.current, {}, { visible: () => false, notify: (status, retry) => { offered = retry } })
  assert.equal(calls.length, 1)
  assert.equal(typeof offered, 'function', 'the failure offered a retry')
  holder.invalidate()
  offered()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.length, 1, 'the stale retry made no request')
  assert.deepEqual(holder.getSnapshot(), { status: 'idle', body: null, draft: null, result: null })
})

test('forgetSupportSenders makes both holders drop an offered retry', async t => {
  const calls = network(t, [{ ok: false, status: 400 }, { ok: false, status: 400 }])
  const offered = {}
  for (const [name, holder] of [['modal', modalFeedbackSend], ['page', pageFeedbackSend]]) {
    await holder.send(makeDraft().body.current, {}, { visible: () => false, notify: (status, retry) => { offered[name] = retry } })
  }
  assert.equal(calls.length, 2)
  forgetSupportSenders()
  offered.modal()
  offered.page()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.length, 2, 'neither stale retry made a request')
})

test('a send in flight at sign-out gets no automatic retry and is not reported', async t => {
  const net = heldNetwork(t, 503)
  const holder = createSupportHolder()
  const { body } = makeDraft()
  let notified = false
  const pending = holder.send(body.current, {}, { visible: () => false, notify: () => { notified = true } })
  assert.equal(net.calls.length, 1)
  holder.invalidate()
  net.release()
  await pending
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(net.calls.length, 1, 'a 503 would have been retried had the account not changed')
  assert.equal(notified, false, 'the old account is not told its message failed')
  assert.equal(holder.getSnapshot().status, 'idle', 'its outcome does not reach the next account')
})

test('control: without a sign-out the same 503 is retried once', async t => {
  const net = heldNetwork(t, 503)
  const holder = createSupportHolder()
  const { body } = makeDraft()
  const pending = holder.send(body.current, {}, { visible: () => false })
  net.release()
  while (net.calls.length < 2) await new Promise(resolve => setTimeout(resolve, 1))
  net.release()
  await pending
  assert.equal(net.calls.length, 2)
})

test('an abandoned send does not block, or get cleared by, the send of the next account', async t => {
  const net = heldNetwork(t, 200)
  const holder = createSupportHolder()
  const oldBody = makeDraft().body.current
  const newBody = makeDraft().body.current
  const abandoned = holder.send(oldBody, {}, { retry: false })
  holder.invalidate()
  const next = holder.send(newBody, {}, { retry: false })
  assert.notEqual(next, null, 'the new account can send at once')
  net.release(1)
  await abandoned
  assert.equal(holder.send(makeDraft().body.current, {}), null, 'the old send finishing leaves the new send marked as in flight')
  net.release(1)
  await next
})

test('invalidate takes down a toast whose action is the offered retry, and only that one', async t => {
  network(t, [{ ok: false, status: 400 }])
  const seen = []
  const realWindow = globalThis.window
  const target = new EventTarget()
  globalThis.window = target
  t.after(() => { if (realWindow === undefined) delete globalThis.window; else globalThis.window = realWindow })
  target.addEventListener('uil4b:toast-dismiss', event => seen.push(event.detail.onAction))
  const holder = createSupportHolder()
  holder.invalidate()
  assert.equal(seen.length, 0, 'nothing on offer, nothing to take down')
  let offered = null
  await holder.send(makeDraft().body.current, {}, { visible: () => false, notify: (status, retry) => { offered = retry } })
  holder.invalidate()
  assert.deepEqual(seen, [offered])
  holder.invalidate()
  assert.equal(seen.length, 1, 'a retry is taken down once')
})
