// One submission is one stored record and one notification, however many times
// the request arrives, and a slow notification does not queue behind another.
//
// Runs the real handler (`handleSupport`) against a fake Firestore that
// implements the one property that matters here: create() on an existing id
// fails, atomically, with ALREADY_EXISTS.
import test from 'node:test'
import assert from 'node:assert/strict'
import { handleSupport, parseRequestId } from '../../api/support.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** Fake Firestore: documents in a Map, rate-limit transactions, create-if-absent. */
function fakeDb({ failFeedbackWrites = false } = {}) {
  const docs = new Map()
  const feedback = () => [...docs.keys()].filter(k => k.startsWith('feedback/'))
  const db = {
    docs,
    feedbackIds: () => feedback().map(k => k.slice('feedback/'.length)),
    collection: (name) => ({
      doc: (id) => ({
        id,
        create: async (value) => {
          if (failFeedbackWrites) throw new Error('firestore unavailable')
          // Yield first so two concurrent creates genuinely interleave.
          await sleep(1)
          const key = `${name}/${id}`
          if (docs.has(key)) {
            const err = new Error('6 ALREADY_EXISTS: Document already exists')
            err.code = 6
            throw err
          }
          docs.set(key, value)
        },
      }),
      add: async (value) => {
        if (failFeedbackWrites) throw new Error('firestore unavailable')
        await sleep(1)
        docs.set(`${name}/auto-${docs.size}`, value)
      },
    }),
    runTransaction: async (fn) => fn({
      get: async ({ id }) => ({ exists: docs.has(`rl/${id}`), data: () => docs.get(`rl/${id}`) }),
      set: ({ id }, value) => docs.set(`rl/${id}`, value),
    }),
  }
  return db
}

/** Replace global fetch with a recorder; resolves after `delayMs`. */
function stubFetch(t, { delayMs = 0 } = {}) {
  const calls = []
  let inFlight = 0
  let maxInFlight = 0
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init })
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await sleep(delayMs)
    inFlight--
    return { ok: true }
  })
  return { calls, maxInFlight: () => maxInFlight }
}

function withNotifications(t) {
  const keys = ['GOOGLE_SHEETS_WEBHOOK_URL', 'RESEND_API' + '_KEY', 'SUPPORT_NOTIFY_EMAIL']
  const saved = keys.map(k => process.env[k])
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://sheets.example.test/hook'
  process.env[keys[1]] = 'fake'
  process.env.SUPPORT_NOTIFY_EMAIL = 'notify@example.test'
  t.after(() => keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i] }))
}

let ipCounter = 0
function post(db, body) {
  const res = {
    code: 0,
    body: null,
    setHeader() {},
    status(c) { res.code = c; return res },
    json(b) { res.body = b; return res },
    end() { return res },
  }
  // A distinct address per call, so the per-IP rate limit is not what is being tested.
  const req = { method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${(ipCounter++ % 250) + 1}` }, body }
  return handleSupport(req, res, { getDb: () => db }).then(() => res)
}

const MESSAGE = { type: 'bug', subject: 'Export', message: 'The export button does nothing.', email: '', source: 'inline' }
const ID = 'fb-0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0'

test('the same request id sent again is stored, mirrored and emailed once', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const { calls } = stubFetch(t)
  const db = fakeDb()

  const first = await post(db, { ...MESSAGE, requestId: ID })
  const second = await post(db, { ...MESSAGE, requestId: ID })
  const third = await post(db, { ...MESSAGE, requestId: ID })

  assert.deepEqual([first.code, second.code, third.code], [200, 200, 200], 'a retry must still be confirmed')
  assert.equal(first.body.duplicate, undefined)
  assert.equal(second.body.duplicate, true)
  assert.equal(third.body.duplicate, true)
  assert.deepEqual(db.feedbackIds(), [ID], 'one record, stored under the request id')
  assert.equal(calls.filter(c => c.url.includes('resend')).length, 1, 'one email')
  assert.equal(calls.filter(c => c.url.includes('sheets')).length, 1, 'one sheet row')
})

test('two attempts in flight at the same moment still store one record', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const { calls } = stubFetch(t)
  const db = fakeDb()

  const [a, b] = await Promise.all([
    post(db, { ...MESSAGE, requestId: ID }),
    post(db, { ...MESSAGE, requestId: ID }),
  ])

  assert.deepEqual([a.code, b.code], [200, 200])
  assert.equal([a, b].filter(r => r.body.duplicate).length, 1, 'exactly one of the two is the duplicate')
  assert.deepEqual(db.feedbackIds(), [ID])
  assert.equal(calls.filter(c => c.url.includes('resend')).length, 1)
})

test('different messages with different ids are all kept', async (t) => {
  t.mock.method(console, 'error', () => {})
  const db = fakeDb()
  await post(db, { ...MESSAGE, requestId: ID })
  await post(db, { ...MESSAGE, message: 'A second, different report.', requestId: 'fb-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  assert.equal(db.feedbackIds().length, 2)
})

test('a request without an id is still accepted and gets an automatic id', async (t) => {
  t.mock.method(console, 'error', () => {})
  const db = fakeDb()
  const a = await post(db, MESSAGE)
  const b = await post(db, MESSAGE)
  assert.deepEqual([a.code, b.code], [200, 200])
  assert.equal(db.feedbackIds().length, 2, 'older clients send no id and keep their old behaviour')
})

test('only a well-formed id is used as a document id', () => {
  assert.equal(parseRequestId(ID), ID)
  for (const bad of [undefined, null, 42, {}, [], '', 'short', 'has/slash/in/it/aaaaaaaa', 'x'.repeat(65), 'spaces are not allowed here', '__proto__aaaaaaaaaaaaaaaa/x']) {
    assert.equal(parseRequestId(bad), null, `${JSON.stringify(bad)} must not become a document id`)
  }
})

test('a malformed id does not break the request or name the document', async (t) => {
  t.mock.method(console, 'error', () => {})
  const db = fakeDb()
  const res = await post(db, { ...MESSAGE, requestId: 'a/b/c' })
  assert.equal(res.code, 200)
  assert.deepEqual(db.feedbackIds().filter(id => id.includes('/')), [])
  assert.equal(db.feedbackIds().length, 1)
})

test('the sheet mirror and the email go out together, not one after the other', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const probe = stubFetch(t, { delayMs: 40 })
  const db = fakeDb()

  const res = await post(db, { ...MESSAGE, requestId: ID })

  assert.equal(res.code, 200)
  assert.equal(probe.calls.length, 2)
  assert.equal(probe.maxInFlight(), 2, 'the second call waited for the first to finish')
})

test('each outbound call carries a timeout signal', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const { calls } = stubFetch(t)
  await post(fakeDb(), { ...MESSAGE, requestId: ID })
  assert.equal(calls.length, 2)
  for (const c of calls) {
    assert.ok(c.init.signal instanceof AbortSignal, `${c.url} has no timeout, so one slow service holds the response`)
  }
})

test('a failed notification does not fail a stored message; nothing delivered is a 502', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })
  const stored = await post(fakeDb(), { ...MESSAGE, requestId: ID })
  assert.equal(stored.code, 200)

  const lost = await post(fakeDb({ failFeedbackWrites: true }), { ...MESSAGE, requestId: ID })
  assert.equal(lost.code, 502, 'neither the record nor the email landed')
})
