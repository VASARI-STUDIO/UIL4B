// The browser half of /api/support's idempotency (src/utils/supportRequest.js).
// The ids it makes must be ones the server accepts, and the per-content reuse
// rule must hold: identical content keeps its id, an edit gets a new one, and a
// cleared attempt starts fresh.
import test from 'node:test'
import assert from 'node:assert/strict'
import { newRequestId, requestIdFor, postSupport, SEND_TIMEOUT_MS } from '../../src/utils/supportRequest.js'
import { parseRequestId } from '../../api/support.js'

const PAYLOAD = { type: 'bug', subject: 'Export', message: 'It did nothing.', email: '', source: 'feedback-form' }

test('a generated id is one the server accepts, and each is different', () => {
  const ids = Array.from({ length: 50 }, newRequestId)
  for (const id of ids) assert.equal(parseRequestId(id), id, `${id} would be discarded by the server`)
  assert.equal(new Set(ids).size, ids.length)
})

test('the fallback id (no randomUUID) is also accepted by the server', () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: (b) => b.fill(171) }, configurable: true })
  try {
    const id = newRequestId()
    assert.equal(parseRequestId(id), id)
  } finally {
    Object.defineProperty(globalThis, 'crypto', real)
  }
})

test('identical content reuses the id; an edit renews it; a cleared attempt starts fresh', () => {
  const ref = { current: null }
  const first = requestIdFor(ref, PAYLOAD)
  assert.equal(requestIdFor(ref, { ...PAYLOAD }), first, 'a retry of the same content must keep the id')
  const edited = requestIdFor(ref, { ...PAYLOAD, message: 'It did nothing at all.' })
  assert.notEqual(edited, first, 'an edited message is a different message')
  ref.current = null
  assert.notEqual(requestIdFor(ref, { ...PAYLOAD, message: 'It did nothing at all.' }), edited,
    'after a message lands, the same words are a new message')
})

// The timeout makes a missing abort a failure rather than a test that never ends.
test('postSupport reports a rejection, a network error and a stall as false, and acceptance as true', { timeout: 5000 }, async () => {
  const realFetch = globalThis.fetch
  const realSetTimeout = globalThis.setTimeout
  try {
    globalThis.fetch = async () => ({ ok: true })
    assert.equal(await postSupport({ a: 1 }), true)
    globalThis.fetch = async () => ({ ok: false })
    assert.equal(await postSupport({ a: 1 }), false)
    globalThis.fetch = async () => { throw new Error('offline') }
    assert.equal(await postSupport({ a: 1 }), false)

    // A request that only ends when it is aborted, with the timer fired at once.
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')))
    })
    let delay = null
    globalThis.setTimeout = (fn, ms) => { delay = ms; return realSetTimeout(fn, 0) }
    assert.equal(await postSupport({ a: 1 }), false)
    assert.equal(delay, SEND_TIMEOUT_MS, 'the attempt must be bounded by the send timeout')
  } finally {
    globalThis.fetch = realFetch
    globalThis.setTimeout = realSetTimeout
  }
})
