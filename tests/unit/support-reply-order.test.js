// When the support endpoint answers, relative to the Sheets mirror and the
// email.
//
//   stored      -> 200 goes out while the notifications are still in flight; they
//                  finish afterwards, inside the promise handed to `defer`.
//   not stored  -> the email is the only copy, so the reply waits for it:
//                  200 if it lands, 502 if it does not.
//   duplicate   -> 200 with `duplicate: true`, nothing scheduled, nothing sent.
//
// Runs the real handler (`handleSupport`). Only what is outside our code is
// replaced: the database, `fetch`, and the after-response scheduler. The two
// outbound calls are held open by the test and released by hand, so the order
// of events is decided by the test rather than by timers.
import test from 'node:test'
import assert from 'node:assert/strict'
import { handleSupport } from '../../api/support.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** A promise with its resolve and reject handles exposed. */
function gate() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

/** Resolves once `cond()` is true; fails the test after `ms` instead of hanging. */
async function until(cond, what, ms = 1000) {
  const start = Date.now()
  while (!cond()) {
    if (Date.now() - start > ms) assert.fail(`timed out waiting for ${what}`)
    await sleep(2)
  }
}

/** Wait for the handler to return, but fail with a message rather than hang if it never does. */
async function finish(handled, ms = 1000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`the handler had not returned after ${ms} ms`)), ms)
  })
  try {
    await Promise.race([handled, timeout])
  } finally {
    clearTimeout(timer)
  }
}

/** Fake Firestore: rate-limit transactions, create-if-absent, optional write failure. */
function fakeDb({ failFeedbackWrites = false } = {}) {
  const docs = new Map()
  return {
    docs,
    collection: (name) => ({
      doc: (id) => ({
        id,
        create: async (value) => {
          if (failFeedbackWrites) throw new Error('firestore unavailable')
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
        docs.set(`${name}/auto-${docs.size}`, value)
      },
    }),
    runTransaction: async (fn) => fn({
      get: async ({ id }) => ({ exists: docs.has(`rl/${id}`), data: () => docs.get(`rl/${id}`) }),
      set: ({ id }, value) => docs.set(`rl/${id}`, value),
    }),
  }
}

/**
 * Replace global fetch. Each outbound call parks on its own gate until the test
 * releases it; `events` gets `<name>-finished` at the moment it completes.
 */
function gatedFetch(t, events) {
  const gates = { sheets: gate(), resend: gate() }
  const started = []
  t.mock.method(globalThis, 'fetch', async (url) => {
    const name = String(url).includes('resend') ? 'resend' : 'sheets'
    started.push(name)
    try {
      return await gates[name].promise
    } finally {
      events.push(`${name}-finished`)
    }
  })
  return { gates, started }
}

/** Turn the notification env vars on for one test and put them back afterwards. */
function withNotifications(t, { sheets = true, email = true } = {}) {
  const keys = ['GOOGLE_SHEETS_WEBHOOK_URL', 'RESEND_API' + '_KEY', 'SUPPORT_NOTIFY_EMAIL']
  const saved = keys.map(k => process.env[k])
  for (const k of keys) delete process.env[k]
  if (sheets) process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://sheets.example.test/hook'
  if (email) {
    process.env[keys[1]] = 'fake'
    process.env.SUPPORT_NOTIFY_EMAIL = 'notify@example.test'
  }
  t.after(() => keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i] }))
}

let ipCounter = 0

/**
 * Start one POST. Returns at once with handles on the response and the handler,
 * so the test can look at the world while the handler is still running.
 */
function startPost(db, body, events, { defer } = {}) {
  const replied = gate()
  const res = {
    code: 0,
    body: null,
    setHeader() {},
    status(c) { res.code = c; return res },
    json(b) { res.body = b; events.push('reply'); replied.resolve(); return res },
    end() { return res },
  }
  // A distinct address per call, so the per-IP rate limit is not what is being tested.
  const req = { method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${(ipCounter++ % 250) + 1}` }, body }
  const handled = handleSupport(req, res, { getDb: () => db, defer })
  return { res, replied: replied.promise, handled }
}

/** A `defer` that records the promise it is given and logs when that promise settles. */
function recordingDefer(events) {
  const promises = []
  const defer = (p) => {
    promises.push(p)
    p.then(() => events.push('notifications-settled'), () => events.push('notifications-rejected'))
  }
  return { defer, promises }
}

const MESSAGE = { type: 'bug', subject: 'Export', message: 'The export button does nothing.', email: '', source: 'inline' }
const ID = 'fb-0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0'
const NOT_YET_MS = 30

test('a stored message is answered while the sheet row and the email are still in flight', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  const { gates, started } = gatedFetch(t, events)
  const { defer, promises } = recordingDefer(events)

  const { res, replied, handled } = startPost(fakeDb(), { ...MESSAGE, requestId: ID }, events, { defer })

  const outcome = await Promise.race([replied.then(() => 'replied'), sleep(1000).then(() => 'still waiting')])
  assert.equal(outcome, 'replied', 'the reply was held back until the slow notifications finished')
  assert.deepEqual(events, ['reply'], 'nothing else had finished when the reply went out')
  assert.equal(res.code, 200)
  assert.deepEqual(res.body, { ok: true })
  await finish(handled)

  // Both notifications were started (not skipped), and are still parked.
  assert.deepEqual([...started].sort(), ['resend', 'sheets'])
  assert.equal(promises.length, 1, 'the notifications were handed to defer exactly once')

  gates.sheets.resolve({ ok: true })
  gates.resend.resolve({ ok: true })
  await promises[0]

  assert.equal(events[0], 'reply')
  assert.equal(events.at(-1), 'notifications-settled', 'the deferred promise settles only after both calls are done')
  assert.deepEqual(events.slice(1, -1).sort(), ['resend-finished', 'sheets-finished'])
})

test('the promise given to defer waits for the slower of the two notifications', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  const { gates } = gatedFetch(t, events)
  const { defer, promises } = recordingDefer(events)

  await finish(startPost(fakeDb(), { ...MESSAGE, requestId: ID }, events, { defer }).handled)

  gates.sheets.resolve({ ok: true })
  await until(() => events.includes('sheets-finished'), 'the sheet call to finish')
  await sleep(NOT_YET_MS)
  assert.ok(!events.includes('notifications-settled'), 'settled while the email was still outstanding')

  gates.resend.resolve({ ok: true })
  await promises[0]
  assert.equal(events.at(-1), 'notifications-settled')
})

test('a stored message is confirmed with nothing configured, and defer still gets a promise', async (t) => {
  withNotifications(t, { sheets: false, email: false })
  const events = []
  const { started } = gatedFetch(t, events)
  const { defer, promises } = recordingDefer(events)

  const { res, handled } = startPost(fakeDb(), { ...MESSAGE, requestId: ID }, events, { defer })
  await finish(handled)
  await promises[0]

  assert.equal(res.code, 200)
  assert.deepEqual(started, [], 'no outbound call without configuration')
  assert.equal(typeof promises[0].then, 'function')
})

test('a stored message is confirmed and the deferred work does not reject when both notifications fail', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })
  const events = []
  const { defer, promises } = recordingDefer(events)

  const { res, handled } = startPost(fakeDb(), { ...MESSAGE, requestId: ID }, events, { defer })
  await finish(handled)
  await promises[0]

  assert.equal(res.code, 200, 'the record is safe, so a dead notification does not fail the request')
  assert.ok(events.includes('notifications-settled'))
  assert.ok(!events.includes('notifications-rejected'), 'a rejected promise handed to the platform becomes an unhandled rejection')
})

test('a message that could not be stored waits for the email before answering', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  const { gates, started } = gatedFetch(t, events)
  const { defer } = recordingDefer(events)

  const { res, replied, handled } = startPost(fakeDb({ failFeedbackWrites: true }), { ...MESSAGE, requestId: ID }, events, { defer })

  await until(() => started.includes('resend'), 'the email call to start')
  await sleep(NOT_YET_MS)
  assert.deepEqual(events, [], 'answered before the email had a result')

  gates.sheets.resolve({ ok: true })
  gates.resend.resolve({ ok: true })
  await replied
  await finish(handled)

  assert.equal(res.code, 200)
  assert.deepEqual(res.body, { ok: true })
  assert.equal(events.indexOf('reply'), events.length - 1, 'the reply came after both calls finished')
})

test('a message that could not be stored is a 502 when the email is refused', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  t.mock.method(globalThis, 'fetch', async (url) => (String(url).includes('resend') ? { ok: false, status: 500 } : { ok: true }))

  const { res, handled } = startPost(fakeDb({ failFeedbackWrites: true }), { ...MESSAGE, requestId: ID }, events)
  await finish(handled)

  assert.equal(res.code, 502)
  assert.match(res.body.error, /could not record/i)
})

test('a message that could not be stored is a 502 when the email call throws', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })

  const { res, handled } = startPost(fakeDb({ failFeedbackWrites: true }), { ...MESSAGE }, events)
  await finish(handled)

  assert.equal(res.code, 502)
})

test('a message that could not be stored is a 502 when only the sheet row landed', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('resend')) throw new Error('network down')
    return { ok: true }
  })

  const { res, handled } = startPost(fakeDb({ failFeedbackWrites: true }), { ...MESSAGE, requestId: ID }, events)
  await finish(handled)

  assert.equal(res.code, 502, 'a sheet row alone is not a delivered message')
})

test('a message that could not be stored and has no email configured is a 502', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t, { sheets: false, email: false })
  const events = []

  const { res, handled } = startPost(fakeDb({ failFeedbackWrites: true }), { ...MESSAGE, requestId: ID }, events)
  await finish(handled)

  assert.equal(res.code, 502)
})

test('a repeated request id is confirmed as a duplicate, with nothing scheduled and nothing sent', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const db = fakeDb()

  // First attempt stores the record; let its notifications finish.
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true }))
  const first = recordingDefer([])
  const firstPost = startPost(db, { ...MESSAGE, requestId: ID }, [], { defer: first.defer })
  await finish(firstPost.handled)
  await first.promises[0]
  assert.equal(firstPost.res.code, 200)
  assert.equal(firstPost.res.body.duplicate, undefined)

  // The retry.
  const fetchMock = globalThis.fetch.mock
  const callsBefore = fetchMock.callCount()
  const second = recordingDefer([])
  const retry = startPost(db, { ...MESSAGE, requestId: ID }, [], { defer: second.defer })
  await finish(retry.handled)

  assert.equal(retry.res.code, 200)
  assert.deepEqual(retry.res.body, { ok: true, duplicate: true })
  assert.equal(second.promises.length, 0, 'defer must not be called for a duplicate')
  assert.equal(fetchMock.callCount(), callsBefore, 'a duplicate must not mirror or email again')
})

test('a validation failure answers 400 without scheduling or sending anything', async (t) => {
  t.mock.method(console, 'error', () => {})
  withNotifications(t)
  const events = []
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true }))
  const { defer, promises } = recordingDefer(events)

  const { res, handled } = startPost(fakeDb(), { ...MESSAGE, message: '   ', requestId: ID }, events, { defer })
  await finish(handled)

  assert.equal(res.code, 400)
  assert.equal(promises.length, 0)
  assert.equal(fetchMock.mock.callCount(), 0)
})
