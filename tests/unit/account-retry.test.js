// A failed read of the signed-in account's data is retried without waiting for
// the browser to report "offline": on a bounded backoff, and when the person
// returns to the tab. These tests drive the retry controller with fake timers
// and a stubbed loader; the wiring into AuthContext is checked at the end.
import test, { mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  createAccountRetry, retryDelay, RETRY_BASE_MS, RETRY_CAP_MS, RETRY_MAX_RETRIES,
} from '../../src/utils/accountRetry.js'
import { stripJs } from '../helpers/strip-comments.js'

const flush = () => new Promise((resolve) => setImmediate(resolve))

// Minimal EventTarget stand-ins that count live listeners.
function fakeTarget(extra = {}) {
  const listeners = new Map()
  return Object.assign({
    addEventListener(type, fn) { (listeners.get(type) || listeners.set(type, new Set()).get(type)).add(fn) },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn) },
    fire(type) { for (const fn of [...(listeners.get(type) || [])]) fn({ type }) },
    count(type) { return listeners.get(type)?.size || 0 },
    total() { return [...listeners.values()].reduce((n, s) => n + s.size, 0) },
  }, extra)
}

function rig(loadImpl, options = {}) {
  mock.timers.enable({ apis: ['setTimeout'] })
  let clock = 1_000_000
  const win = fakeTarget()
  const doc = fakeTarget({ visibilityState: 'visible' })
  const calls = []
  const load = () => { calls.push(clock); return loadImpl(calls.length) }
  const retry = createAccountRetry({ load, now: () => clock, win, doc, ...options })
  const advance = async (ms) => {
    clock += ms
    mock.timers.tick(ms)
    await flush()
  }
  return { retry, win, doc, calls, advance, bump: (ms) => { clock += ms } }
}

afterEach(() => mock.timers.reset())

test('the backoff doubles from two seconds and is capped', () => {
  assert.equal(RETRY_BASE_MS, 2000)
  assert.deepEqual([1, 2, 3, 4].map((n) => retryDelay(n)), [2000, 4000, 8000, 16000])
  assert.equal(retryDelay(5), RETRY_CAP_MS)
  assert.equal(retryDelay(40), RETRY_CAP_MS)
})

test('a failed read is retried without any online event', async () => {
  const { retry, calls, advance } = rig((n) => Promise.resolve(n >= 2))
  retry.start()
  await flush()
  assert.equal(calls.length, 1)
  await advance(1999)
  assert.equal(calls.length, 1, 'retried before the first backoff elapsed')
  await advance(1)
  assert.equal(calls.length, 2, 'no retry after the first backoff with no online event')
})

test('retries come back when the person returns to the tab', async () => {
  const { retry, win, doc, calls, advance } = rig((n) => Promise.resolve(n >= 3))
  retry.start()
  await flush()
  await advance(1500)
  doc.fire('visibilitychange')
  await flush()
  assert.equal(calls.length, 2, 'becoming visible did not retry')
  await advance(1500)
  win.fire('focus')
  await flush()
  assert.equal(calls.length, 3, 'window focus did not retry')
})

test('the online event still retries', async () => {
  const { retry, win, calls, advance } = rig((n) => Promise.resolve(n >= 2))
  retry.start()
  await flush()
  await advance(1500)
  win.fire('online')
  await flush()
  assert.equal(calls.length, 2)
})

test('a hidden tab does not retry on a visibility change', async () => {
  const { retry, doc, calls, advance } = rig(() => Promise.resolve(false))
  retry.start()
  await flush()
  await advance(1500)
  doc.visibilityState = 'hidden'
  doc.fire('visibilitychange')
  await flush()
  assert.equal(calls.length, 1)
})

test('focus and visibility firing together make one attempt', async () => {
  const { retry, win, doc, calls, advance } = rig(() => Promise.resolve(false))
  retry.start()
  await flush()
  await advance(1500)
  doc.fire('visibilitychange')
  win.fire('focus')
  await flush()
  assert.equal(calls.length, 2)
})

test('only one load is in flight at a time', async () => {
  let release
  let concurrent = 0
  let maxConcurrent = 0
  const { retry, win, doc, calls, advance } = rig(() => {
    concurrent += 1
    maxConcurrent = Math.max(maxConcurrent, concurrent)
    return new Promise((resolve) => { release = (v) => { concurrent -= 1; resolve(v) } })
  })
  retry.start()
  retry.start()
  await flush()
  await advance(10_000)
  win.fire('online')
  win.fire('focus')
  doc.fire('visibilitychange')
  await advance(10_000)
  assert.equal(calls.length, 1, 'a second load started while the first had not answered')
  assert.equal(maxConcurrent, 1)
  release(false)
  await flush()
  assert.equal(concurrent, 0)
})

test('a successful read stops the retries and removes every listener', async () => {
  const { retry, win, doc, calls, advance } = rig((n) => Promise.resolve(n >= 2))
  retry.start()
  await flush()
  assert.ok(win.total() + doc.total() > 0, 'listeners were not armed after a failure')
  await advance(2000)
  assert.equal(calls.length, 2)
  assert.equal(win.total(), 0, 'window listeners left behind after success')
  assert.equal(doc.total(), 0, 'document listeners left behind after success')
  await advance(120_000)
  win.fire('focus')
  await flush()
  assert.equal(calls.length, 2, 'kept retrying after success')
})

test('a first read that succeeds never arms a listener or timer', async () => {
  const { retry, win, doc, calls, advance } = rig(() => Promise.resolve(true))
  retry.start()
  await flush()
  assert.equal(win.total() + doc.total(), 0)
  await advance(120_000)
  assert.equal(calls.length, 1)
})

test('cancelling stops the pending retry and removes every listener', async () => {
  const { retry, win, doc, calls, advance } = rig(() => Promise.resolve(false))
  retry.start()
  await flush()
  retry.cancel()
  assert.equal(win.total(), 0)
  assert.equal(doc.total(), 0)
  await advance(120_000)
  win.fire('online')
  doc.fire('visibilitychange')
  await flush()
  assert.equal(calls.length, 1, 'retried after cancel')
})

test('cancelling while a load is in flight stops everything when it answers', async () => {
  let resolveLoad
  const { retry, win, doc, calls, advance } = rig(() => new Promise((resolve) => { resolveLoad = resolve }))
  retry.start()
  await flush()
  retry.cancel()
  resolveLoad(false)
  await flush()
  assert.equal(win.total() + doc.total(), 0, 'a late failure re-armed listeners after cancel')
  await advance(120_000)
  assert.equal(calls.length, 1, 'a late failure scheduled a retry after cancel')
})

test('a user switch is a new controller and the old one stays stopped', async () => {
  const { retry: first, win, doc, calls, advance } = rig(() => Promise.resolve(false))
  first.start()
  await flush()
  first.cancel()
  const secondCalls = []
  const second = createAccountRetry({
    load: () => { secondCalls.push(1); return Promise.resolve(false) },
    now: () => 1_000_000, win, doc,
  })
  second.start()
  await flush()
  await advance(2000)
  assert.equal(calls.length, 1, 'the cancelled session kept retrying')
  assert.equal(secondCalls.length, 2)
  second.cancel()
  assert.equal(win.total() + doc.total(), 0)
})

test('scheduled retries are capped and then stop on their own', async () => {
  const { retry, calls, advance } = rig(() => Promise.resolve(false))
  retry.start()
  await flush()
  const waits = []
  for (let i = 1; i <= RETRY_MAX_RETRIES; i += 1) waits.push(retryDelay(i))
  for (const wait of waits) await advance(wait)
  assert.equal(calls.length, 1 + RETRY_MAX_RETRIES)
  await advance(600_000)
  assert.equal(calls.length, 1 + RETRY_MAX_RETRIES, 'kept scheduling retries past the cap')
})

test('the attempts follow the backoff schedule', async () => {
  const { retry, calls, advance } = rig(() => Promise.resolve(false))
  retry.start()
  await flush()
  await advance(2000)
  await advance(3999)
  assert.equal(calls.length, 2, 'second retry came before four seconds')
  await advance(1)
  assert.equal(calls.length, 3)
  await advance(8000)
  assert.equal(calls.length, 4)
})

test('returning to the tab after the cap is spent still tries once', async () => {
  const { retry, win, calls, advance } = rig(() => Promise.resolve(false))
  retry.start()
  await flush()
  for (let i = 1; i <= RETRY_MAX_RETRIES; i += 1) await advance(retryDelay(i))
  const spent = calls.length
  await advance(1500)
  win.fire('focus')
  await flush()
  assert.equal(calls.length, spent + 1)
  await advance(600_000)
  assert.equal(calls.length, spent + 1, 'a trigger after the cap started a new backoff run')
})

test('a loader that throws or rejects counts as a failed read', async () => {
  const { retry, calls, advance } = rig((n) => {
    if (n === 1) throw new Error('sync')
    if (n === 2) return Promise.reject(new Error('async'))
    return Promise.resolve(true)
  })
  retry.start()
  await flush()
  await advance(2000)
  await advance(4000)
  assert.equal(calls.length, 3)
})

// ── Wiring ──────────────────────────────────────────────────────────────────

const ROOT = process.cwd()
const authSource = () => stripJs(fs.readFileSync(path.join(ROOT, 'src/contexts/AuthContext.jsx'), 'utf8'))

test('AuthContext retries through the controller, not a single online listener', () => {
  const src = authSource()
  assert.match(src, /createAccountRetry\(\{ load: hydrate \}\)/)
  assert.match(src, /accountRetry\.start\(\)/)
  assert.doesNotMatch(src, /addEventListener\('online'/, 'a one-shot online listener is back')
})

test('AuthContext cancels the retry on every session change and on unmount', () => {
  const src = authSource()
  const handler = src.slice(src.indexOf('const onAuthUser'), src.indexOf('const authEpoch = ++authEpochRef.current'))
  assert.match(handler, /accountRetry\.cancel\(\)/, 'a new session does not cancel the previous retry before it starts')
  assert.match(src, /return \(\) => \{\s*cancelled = true[\s\S]{0,120}accountRetry\.cancel\(\)/, 'unmount leaves the retry running')
})

test('a read that has not answered reports not-settled, and a stale session reports settled', () => {
  const src = authSource()
  const hydrate = src.slice(src.indexOf('const hydrate'), src.indexOf('accountRetry = createAccountRetry'))
  assert.match(hydrate, /isCurrentAuthSession\([\s\S]*?\)\) return true/)
  assert.match(hydrate, /plan\.action === 'wait'\) \{\s*return false/)
  assert.match(hydrate, /\.catch\(\(\) => false/)
})
