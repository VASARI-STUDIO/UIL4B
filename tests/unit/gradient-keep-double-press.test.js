// A double press on Keep (useGradientSubmissionMigration). The real hook and the
// real migration run; only the account and the two queue calls are stand-ins.
// The hook is rendered once on the server renderer to get its `keep` function
// (state updates are no-ops there, which is fine: the guard under test is the
// module-level one-run-per-account map, not React state).
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

register('./helpers/stub-loader.mjs', import.meta.url, { data: { queueApi: true } })

const { default: useGradientSubmissionMigration } = await import('../../src/hooks/useGradientSubmissionMigration.js')
const { GRADIENT_SUBMISSIONS_KEY } = await import('../../src/utils/gradientSubmissions.js')

const STOPS = [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }]
const entry = (id) => ({ id, name: `Gradient ${id}`, type: 'Linear', angle: 90, stops: STOPS })

// A browser: localStorage and sessionStorage the code under test reads as globals.
function installBrowser(list) {
  const mem = () => {
    const m = new Map()
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), has: (k) => m.has(k) }
  }
  globalThis.localStorage = mem()
  globalThis.sessionStorage = mem()
  globalThis.localStorage.setItem(GRADIENT_SUBMISSIONS_KEY, JSON.stringify(list))
}

// The account's queue, as the rules behave: a write at a new id creates it, a
// second write at the same id is refused, and publishToQueueOnce reads that as "already there".
function fakeQueue({ delayMs = 5 } = {}) {
  const docs = new Map()
  const calls = { list: 0, publish: [] }
  globalThis.__QUEUE_API__ = {
    listMySubmissions: async () => { calls.list += 1; await new Promise((r) => setTimeout(r, delayMs)); return [...docs.values()] },
    publishToQueueOnce: async (record, { id }) => {
      calls.publish.push(id)
      await new Promise((r) => setTimeout(r, delayMs))
      if (docs.has(id)) return { id, created: false }
      docs.set(id, { id, ...record })
      return { id, created: true }
    },
  }
  return { docs, calls }
}

function mountHook(uid, { toast, onMigrated } = {}) {
  globalThis.__AUTH__ = { user: { uid, displayName: 'Dee', email: 'dee@uil4b.test' } }
  let api
  const Probe = () => { api = useGradientSubmissionMigration({ toast, onMigrated }); return null }
  renderToString(createElement(Probe))
  return api
}

test('two presses of Keep in the same tick run one migration and write each gradient once', async () => {
  installBrowser([entry('a'), entry('b')])
  const q = fakeQueue()
  const toasts = []
  let settled = 0
  const hook = mountHook('u-double', { toast: (m) => toasts.push(m), onMigrated: () => { settled += 1 } })
  assert.equal(hook.waiting, 2)

  await Promise.all([hook.keep(), hook.keep()])

  assert.equal(q.calls.list, 1, 'one listing, so one run')
  assert.deepEqual([...q.calls.publish].sort(), ['u-double_a', 'u-double_b'], 'each gradient written once, at its fixed id')
  assert.equal(q.docs.size, 2)
  assert.equal(settled, 1, 'the page hears about one run')
  assert.deepEqual(toasts, ['Kept 2 gradients from this browser with your account'])
  assert.equal(globalThis.localStorage.has(GRADIENT_SUBMISSIONS_KEY), false, 'the browser key is gone after a clean run')
})

test('a press while a run is still going is ignored, and a press after it settled starts a new run', async () => {
  installBrowser([entry('a')])
  const q = fakeQueue()
  const hook = mountHook('u-later')

  const first = hook.keep()
  await hook.keep()                       // returns at once: the first run still holds the account
  assert.equal(q.calls.publish.length, 0, 'the second press did nothing while the first was listing')
  await first
  assert.equal(q.calls.publish.length, 1)

  // A new entry arrived in the browser meanwhile: a fresh press is allowed to run again.
  installBrowser([entry('c')])
  await hook.keep()
  assert.deepEqual(q.calls.publish, ['u-later_a', 'u-later_c'])
})

test('a run that failed does not block a retry, and the retry skips what already went through', async () => {
  installBrowser([entry('a'), entry('b')])
  const q = fakeQueue()
  const real = globalThis.__QUEUE_API__.publishToQueueOnce
  let failB = true
  globalThis.__QUEUE_API__.publishToQueueOnce = async (record, opts) => {
    if (failB && opts.id.endsWith('_b')) throw new Error('offline')
    return real(record, opts)
  }
  const toasts = []
  const hook = mountHook('u-retry', { toast: (m, kind) => toasts.push([m, kind]) })

  await hook.keep()
  assert.deepEqual(toasts, [['Couldn’t keep all of them. Try again.', 'error']])
  assert.equal(globalThis.localStorage.has(GRADIENT_SUBMISSIONS_KEY), true, 'the key stays after a failed run')
  assert.deepEqual([...q.docs.keys()], ['u-retry_a'])

  failB = false
  await hook.keep()
  assert.deepEqual([...q.docs.keys()].sort(), ['u-retry_a', 'u-retry_b'], 'the retry wrote only the missing one')
  assert.equal(globalThis.localStorage.has(GRADIENT_SUBMISSIONS_KEY), false)
})

test('two different accounts pressing Keep do not block each other', async () => {
  installBrowser([entry('a')])
  const q = fakeQueue()
  const one = mountHook('u-one')
  const two = mountHook('u-two')
  await Promise.all([one.keep(), two.keep()])
  assert.equal(q.calls.list, 2)
})

/* ── the migration itself, with two tabs pressing Keep at once ───────────── */

const { migrateGradientSubmissions } = await import('../../src/utils/gradientSubmissions.js')

test('two tabs migrating the same key at once leave one document per gradient', async () => {
  // Each tab has its own hook (so its own in-flight map) but they share the browser key and the queue.
  installBrowser([entry('a'), entry('b')])
  const q = fakeQueue()
  const user = { uid: 'u-tabs', displayName: 'Dee' }
  const run = () => migrateGradientSubmissions({
    user,
    list: globalThis.__QUEUE_API__.listMySubmissions,
    publish: globalThis.__QUEUE_API__.publishToQueueOnce,
  })
  const [one, two] = await Promise.all([run(), run()])

  assert.equal(q.docs.size, 2, 'the queue holds one document per gradient')
  assert.deepEqual([...q.docs.keys()].sort(), ['u-tabs_a', 'u-tabs_b'])
  assert.equal(one.published + two.published, 2, 'between them, each gradient was created once')
  assert.equal(one.skipped + two.skipped, 2, 'and the other tab was told it was already there')
  assert.equal(one.failed + two.failed, 0)
})

test('a key the other tab removed outright during the listing publishes nothing and does not throw', async () => {
  installBrowser([entry('a')])
  const published = []
  const out = await migrateGradientSubmissions({
    user: { uid: 'u-gone', displayName: 'Dee' },
    list: async () => { globalThis.localStorage.removeItem(GRADIENT_SUBMISSIONS_KEY); return [] },
    publish: async (r, { id }) => { published.push(id); return { id, created: true } },
  })
  assert.deepEqual(published, [])
  assert.equal(out.published, 0)
  assert.equal(out.failed, 0)
})

/* ── the post limits ─────────────────────────────────────────────────────── */

const { PostLimitError, POST_LIMIT_RULE } = await import('../../src/utils/communityLimits.js')

test('with the post limits on, Keep posts one gradient and stops without an error toast, then a later press carries on', async () => {
  installBrowser([entry('a'), entry('b'), entry('c')])
  const q = fakeQueue()
  const real = globalThis.__QUEUE_API__.publishToQueueOnce
  let gapOpen = false
  let attempts = 0
  globalThis.__QUEUE_API__.publishToQueueOnce = async (record, opts) => {
    attempts += 1
    if (!gapOpen && q.docs.size >= 1) throw new PostLimitError('cooldown', 30_000)
    return real(record, opts)
  }
  const toasts = []
  const settled = []
  const hook = mountHook('u-limits', { toast: (m, kind) => toasts.push([m, kind]), onMigrated: (r) => settled.push(r) })

  await hook.keep()
  assert.equal(q.docs.size, 1, 'one gradient got through')
  assert.equal(attempts, 2, 'the run stopped at the first refusal')
  assert.equal(toasts.length, 1)
  assert.equal(toasts[0][1], undefined, 'not an error toast')
  assert.ok(toasts[0][0].includes(POST_LIMIT_RULE), toasts[0][0])
  assert.ok(!/try again/i.test(toasts[0][0]), 'a limit is not offered as something to retry now')
  assert.equal(settled[0].limited, true)
  assert.equal(globalThis.localStorage.has(GRADIENT_SUBMISSIONS_KEY), true, 'the rest stay in this browser')

  gapOpen = true
  await hook.keep()
  assert.equal(q.docs.size, 3, 'the later press posted the rest, once each')
  assert.equal(globalThis.localStorage.has(GRADIENT_SUBMISSIONS_KEY), false)
})
