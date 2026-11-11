import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  COLLECTION_TTL, COLLECTION_RETRY_DELAY, COLLECTION_REFUSAL_MAX, CHIP_RETRY_FLOOR, collectionToNames, createCollectionLoader, createLimiter,
  readCollectionCache, writeCollectionCache,
} from '../../src/utils/iconifyCollectionCache.js'

const PREFIX = 'lucide'
const KEY = `uil4b:iconify:collection:${PREFIX}`
const DATA = { names: ['house', 'arrow-right'], title: 'Lucide', credit: { name: 'Lucide', spdx: 'ISC' } }
const NOW = 10 * COLLECTION_TTL
function memoryStorage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('stores only names, title and attribution in a versioned, timestamped entry', () => {
  const store = memoryStorage()
  const data = { ...DATA, names: [...DATA.names, 'house'], categories: { unused: ['house'] }, info: { unused: true }, credit: { ...DATA.credit, unused: 'extra' } }
  writeCollectionCache(PREFIX, data, { storage: () => store, now: NOW })
  assert.deepEqual(JSON.parse(store.getItem(KEY)), { v: 1, at: NOW, data: DATA })
  assert.deepEqual(readCollectionCache(PREFIX, { storage: () => store, now: NOW }), { data: DATA, fresh: true })
})

test('seven-day TTL expires at the boundary but retains stale data of any age', () => {
  const store = memoryStorage()
  writeCollectionCache(PREFIX, DATA, { storage: () => store, now: NOW })
  assert.equal(readCollectionCache(PREFIX, { storage: () => store, now: NOW + COLLECTION_TTL - 1 }).fresh, true)
  for (const age of [COLLECTION_TTL, 100 * COLLECTION_TTL]) {
    assert.deepEqual(readCollectionCache(PREFIX, { storage: () => store, now: NOW + age }), { data: DATA, fresh: false })
  }
})

test('missing, malformed, incompatible and future-dated entries are ignored', () => {
  const store = memoryStorage()
  const read = () => readCollectionCache(PREFIX, { storage: () => store, now: NOW })
  assert.equal(read(), null)
  for (const value of ['{', 'null', JSON.stringify({ v: 2, at: NOW, data: DATA }),
    JSON.stringify({ v: 1, at: NOW + 1, data: DATA }), JSON.stringify({ v: 1, at: 'bad', data: DATA }),
    JSON.stringify({ v: 1, at: NOW, data: { names: [42], title: 'Lucide' } })]) {
    store.setItem(KEY, value)
    assert.equal(read(), null)
  }
})

test('storage getter, read and quota failures do not escape', () => {
  for (const storage of [() => { throw Error('private mode') },
    () => ({ getItem: () => { throw Error('read denied') }, setItem: () => { throw Error('quota') } })]) {
    assert.equal(readCollectionCache(PREFIX, { storage, now: NOW }), null)
    assert.doesNotThrow(() => writeCollectionCache(PREFIX, DATA, { storage, now: NOW }))
  }
})

test('a new loader uses persisted data without fetching and populates memory', async () => {
  const store = memoryStorage()
  let calls = 0
  const options = { storage: () => store, now: () => NOW, fetchEntry: async () => { calls++; return DATA } }
  const first = createCollectionLoader({ ...options, cache: new Map() })
  assert.deepEqual(await first(PREFIX), DATA)
  const cache = new Map()
  const reloaded = createCollectionLoader({ ...options, cache })
  assert.deepEqual(await reloaded(PREFIX), DATA)
  assert.deepEqual(cache.get(PREFIX), DATA)
  assert.equal(calls, 1)
})

test('stale data is refreshed on success and persisted with a new timestamp', async () => {
  const store = memoryStorage()
  const cache = new Map()
  writeCollectionCache(PREFIX, DATA, { storage: () => store, now: NOW - 2 * COLLECTION_TTL })
  let calls = 0
  const updated = { ...DATA, names: ['new-icon'] }
  const load = createCollectionLoader({ cache, storage: () => store, now: () => NOW,
    fetchEntry: async () => { calls++; return updated } })
  assert.deepEqual(await load(PREFIX), updated)
  assert.equal(JSON.parse(store.getItem(KEY)).at, NOW)
  assert.deepEqual(cache.get(PREFIX), updated)
  assert.deepEqual(await load(PREFIX), updated)
  assert.equal(calls, 1)
  assert.equal(load.failed(PREFIX), false)
})

// A failed refresh of a stale list: visitors keep their icons, but nothing is pinned in memory.
function staleFailureLoader({ fetchEntry }) {
  const store = memoryStorage()
  const cache = new Map()
  const oldAt = NOW - 2 * COLLECTION_TTL
  writeCollectionCache(PREFIX, DATA, { storage: () => store, now: oldAt })
  const clock = { now: NOW }
  const load = createCollectionLoader({ cache, storage: () => store, now: () => clock.now, fetchEntry })
  return { load, cache, store, clock, oldAt }
}

test('a failed refresh of stale data returns the stale list without pinning it or renewing its timestamp', async () => {
  let calls = 0
  const { load, cache, store, oldAt } = staleFailureLoader({
    fetchEntry: async () => { calls++; throw TypeError('Failed to fetch') } })
  assert.deepEqual(await load(PREFIX), DATA)
  assert.equal(calls, 1)
  assert.equal(cache.has(PREFIX), false)
  assert.equal(JSON.parse(store.getItem(KEY)).at, oldAt)
})

test('the failed-with-stale state is visible to the UI through failed(prefix)', async () => {
  const { load } = staleFailureLoader({ fetchEntry: async () => { throw TypeError('Failed to fetch') } })
  assert.equal(load.failed(PREFIX), false)
  await load(PREFIX)
  assert.equal(load.failed(PREFIX), true)
  assert.equal(load.failed('tabler'), false)
})

test('within 60 seconds of a failed stale refresh, automatic calls return the stale list without a request', async () => {
  let calls = 0
  const { load, clock } = staleFailureLoader({ fetchEntry: async () => { calls++; throw TypeError('Failed to fetch') } })
  await load(PREFIX)
  clock.now += COLLECTION_RETRY_DELAY - 1
  assert.deepEqual(await load(PREFIX), DATA)
  assert.equal(calls, 1)
  assert.equal(load.failed(PREFIX), true)
})

test('after 60 seconds, a failed stale refresh is requested again', async () => {
  let calls = 0
  let fails = true
  const updated = { ...DATA, names: ['new-icon'] }
  const { load, cache, clock } = staleFailureLoader({
    fetchEntry: async () => { calls++; if (fails) throw TypeError('Failed to fetch'); return updated } })
  await load(PREFIX)
  clock.now += COLLECTION_RETRY_DELAY
  assert.deepEqual(await load(PREFIX), DATA)
  assert.equal(calls, 2)
  assert.equal(cache.has(PREFIX), false)
  clock.now += COLLECTION_RETRY_DELAY
  fails = false
  assert.deepEqual(await load(PREFIX), updated)
  assert.equal(calls, 3)
})

test('a manual retry requests a failed stale refresh at once and shares one request', async () => {
  let calls = 0
  const { load } = staleFailureLoader({ fetchEntry: async () => { calls++; throw TypeError('Failed to fetch') } })
  await load(PREFIX)
  const manual = load(PREFIX, { manualRetry: true })
  assert.equal(load(PREFIX, { manualRetry: true }), manual)
  assert.deepEqual(await manual, DATA)
  assert.equal(calls, 2)
})

test('a success after a failed stale refresh caches, persists and clears the failed state', async () => {
  let fails = true
  const updated = { ...DATA, names: ['new-icon'] }
  const { load, cache, store, clock } = staleFailureLoader({
    fetchEntry: async () => { if (fails) throw TypeError('Failed to fetch'); return updated } })
  await load(PREFIX)
  assert.equal(load.failed(PREFIX), true)
  fails = false
  assert.deepEqual(await load(PREFIX, { manualRetry: true }), updated)
  assert.deepEqual(cache.get(PREFIX), updated)
  assert.equal(JSON.parse(store.getItem(KEY)).at, clock.now)
  assert.equal(load.failed(PREFIX), false)
})

test('a failed first load with no stored data rejects, and Try again within 60 seconds requests again', async () => {
  let calls = 0
  let fails = true
  const error = TypeError('Failed to fetch')
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async () => { calls++; if (fails) throw error; return DATA } })
  await assert.rejects(load(PREFIX), error)
  assert.equal(load.failed(PREFIX), true)
  await assert.rejects(load(PREFIX), error)
  assert.equal(calls, 1)
  fails = false
  assert.deepEqual(await load(PREFIX, { manualRetry: true }), DATA)
  assert.equal(calls, 2)
  assert.equal(load.failed(PREFIX), false)
})

const CHIP = { manualRetry: true, chipRetry: true }

test('two chip retries 1 second apart after a failure make one request and return the stale list', async () => {
  let calls = 0
  const { load, clock } = staleFailureLoader({ fetchEntry: async () => { calls++; throw TypeError('Failed to fetch') } })
  await load(PREFIX)
  clock.now += 1000
  assert.deepEqual(await load(PREFIX, CHIP), DATA)
  clock.now += 1000
  assert.deepEqual(await load(PREFIX, CHIP), DATA)
  assert.equal(calls, 1)
  assert.equal(load.failed(PREFIX), true)
})

test('two chip retries 1 second apart after a failure with nothing stored make one request and reject', async () => {
  let calls = 0
  const error = TypeError('Failed to fetch')
  const clock = { now: NOW }
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => clock.now,
    fetchEntry: async () => { calls++; throw error } })
  await assert.rejects(load(PREFIX), error)
  clock.now += 1000
  await assert.rejects(load(PREFIX, CHIP), error)
  clock.now += 1000
  await assert.rejects(load(PREFIX, CHIP), error)
  assert.equal(calls, 1)
})

test('a chip retry after the 3 second floor requests at once, and the floor restarts from that failure', async () => {
  let calls = 0
  let fails = true
  const { load, clock } = staleFailureLoader({ fetchEntry: async () => { calls++; if (fails) throw TypeError('Failed to fetch'); return DATA } })
  await load(PREFIX)
  clock.now += CHIP_RETRY_FLOOR
  await load(PREFIX, CHIP)
  assert.equal(calls, 2)
  clock.now += CHIP_RETRY_FLOOR - 1
  await load(PREFIX, CHIP)
  assert.equal(calls, 2)
  fails = false
  clock.now += 1
  await load(PREFIX, CHIP)
  assert.equal(calls, 3)
  assert.equal(load.failed(PREFIX), false)
})

test('a chip retry with no earlier failure requests at once', async () => {
  let calls = 0
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async () => { calls++; return DATA } })
  assert.deepEqual(await load(PREFIX, CHIP), DATA)
  assert.equal(calls, 1)
})

test('Try again (manualRetry without the chip option) requests at once even within the chip floor', async () => {
  let calls = 0
  const { load, clock } = staleFailureLoader({ fetchEntry: async () => { calls++; throw TypeError('Failed to fetch') } })
  await load(PREFIX)
  clock.now += 100
  await load(PREFIX, { manualRetry: true })
  assert.equal(calls, 2)
  clock.now += 100
  await load(PREFIX, { manualRetry: true })
  assert.equal(calls, 3)
})

test('failures suppress automatic calls for 60 seconds, while a manual retry allows one shared request', async () => {
  let calls = 0
  let clock = NOW
  let fails = true
  const error = TypeError('Failed to fetch')
  const load = createCollectionLoader({ cache: new Map(), storage: () => null, now: () => clock,
    fetchEntry: async () => { calls++; if (fails) throw error; return DATA } })
  const first = load(PREFIX)
  assert.equal(load(PREFIX), first)
  await assert.rejects(first, error)
  clock += COLLECTION_RETRY_DELAY - 1
  await assert.rejects(load(PREFIX), error)
  assert.equal(calls, 1)
  const manual = load(PREFIX, { manualRetry: true })
  assert.equal(load(PREFIX, { manualRetry: true }), manual)
  assert.equal(load(PREFIX), manual)
  await assert.rejects(manual, error)
  assert.equal(calls, 2)
  await assert.rejects(load(PREFIX), error)
  assert.equal(calls, 2)
  clock += COLLECTION_RETRY_DELAY
  fails = false
  assert.deepEqual(await load(PREFIX), DATA)
  assert.equal(calls, 3)
})

test('unavailable storage still leaves successful responses in memory', async () => {
  let calls = 0
  const load = createCollectionLoader({ cache: new Map(), storage: () => { throw Error('private mode') },
    fetchEntry: async () => { calls++; return DATA } })
  await load(PREFIX)
  await load(PREFIX)
  assert.equal(calls, 1)
})

test('credit links that are not https are dropped when read back from storage', () => {
  const store = memoryStorage()
  const credit = {
    name: 'Lucide', author: 'Lucide Contributors', spdx: 'ISC',
    url: 'javascript:alert(1)', licenceUrl: 'http://example.com/LICENSE',
  }
  store.setItem(KEY, JSON.stringify({ v: 1, at: NOW, data: { ...DATA, credit } }))
  const { data } = readCollectionCache(PREFIX, { storage: () => store, now: NOW })
  assert.equal('url' in data.credit, false)
  assert.equal('licenceUrl' in data.credit, false)
  assert.deepEqual(data.credit, { name: 'Lucide', author: 'Lucide Contributors', spdx: 'ISC' })
})

test('https credit links survive a round trip through storage', () => {
  const store = memoryStorage()
  const credit = { name: 'Lucide', url: 'https://lucide.dev', licenceUrl: 'https://example.com/LICENSE' }
  writeCollectionCache(PREFIX, { ...DATA, credit }, { storage: () => store, now: NOW })
  assert.deepEqual(readCollectionCache(PREFIX, { storage: () => store, now: NOW }).data.credit, credit)
})

// ── A refused /collection: wait it out, and show something saved or partial meanwhile ──

const SAMPLE = { names: ['house'], title: 'Lucide', credit: null, sample: true }
const refusal = (retryAfter) => Object.assign(new Error('All API hosts failed'), { retryAfter })

test('a Retry-After refusal holds back every prefix, Try again included, until it passes', async () => {
  const clock = { now: NOW }
  const asked = []
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => clock.now,
    fetchEntry: async (prefix) => { asked.push(prefix); throw refusal(120) } })
  await assert.rejects(load('lucide'))
  // The limit is on the endpoint: another prefix, and a manual retry, wait too.
  await assert.rejects(load('tabler'))
  await assert.rejects(load('lucide', { manualRetry: true }))
  assert.deepEqual(asked, ['lucide'])
  assert.equal(load.failed('tabler'), true)
  clock.now += 120 * 1000
  await assert.rejects(load('tabler'))
  assert.deepEqual(asked, ['lucide', 'tabler'])
})

test('a request already queued when a refusal arrives does not go out when its turn comes', async () => {
  // Two requests start together, as behind a limiter; the first is refused with a
  // Retry-After before the second reaches the network.
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const sent = []
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async (prefix, { refused }) => {
      if (prefix === 'tabler') await gate
      const stop = refused()
      if (stop) throw stop
      sent.push(prefix)
      throw refusal(120)
    } })
  const first = load('lucide')
  const second = load('tabler')
  await assert.rejects(first)
  release()
  await assert.rejects(second)
  assert.deepEqual(sent, ['lucide'], 'the queued request went out against a refusing endpoint')
})

test('without a Retry-After, Try again still bypasses the 60 second cooldown', async () => {
  let calls = 0
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async () => { calls++; throw refusal(null) } })
  await assert.rejects(load('lucide'))
  await assert.rejects(load('lucide', { manualRetry: true }))
  assert.equal(calls, 2)
})

test('a Retry-After beyond an hour is held for an hour, not longer', async () => {
  const clock = { now: NOW }
  let calls = 0
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => clock.now,
    fetchEntry: async () => { calls++; throw refusal(10 * 24 * 3600) } })
  await assert.rejects(load('lucide'))
  clock.now += COLLECTION_REFUSAL_MAX - 1
  await assert.rejects(load('lucide', { manualRetry: true }))
  assert.equal(calls, 1)
  clock.now += 1
  await assert.rejects(load('lucide', { manualRetry: true }))
  assert.equal(calls, 2)
})

test('the last resort stands in when a request fails and nothing is stored, and is never cached', async () => {
  const cache = new Map()
  const load = createCollectionLoader({ cache, storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async () => { throw refusal(null) }, lastResort: async () => SAMPLE })
  assert.deepEqual(await load(PREFIX), SAMPLE)
  assert.equal(cache.has(PREFIX), false)
  assert.equal(load.failed(PREFIX), true)
})

test('stale stored data wins over the last resort', async () => {
  const store = memoryStorage()
  writeCollectionCache(PREFIX, DATA, { storage: () => store, now: NOW - 2 * COLLECTION_TTL })
  const load = createCollectionLoader({ cache: new Map(), storage: () => store, now: () => NOW,
    fetchEntry: async () => { throw refusal(null) }, lastResort: async () => SAMPLE })
  assert.deepEqual(await load(PREFIX), DATA)
})

test('allowSample: false, a missing last resort and a failing one all surface the original failure', async () => {
  const error = refusal(null)
  const make = (extra) => createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async () => { throw error }, ...extra })
  await assert.rejects(make({ lastResort: async () => SAMPLE })(PREFIX, { allowSample: false }), (e) => e === error)
  await assert.rejects(make({})(PREFIX), (e) => e === error)
  await assert.rejects(make({ lastResort: async () => { throw Error('chunk failed') } })(PREFIX), (e) => e === error)
  await assert.rejects(make({ lastResort: async () => null })(PREFIX), (e) => e === error)
})

test('the last resort also answers inside the cooldown, without a request', async () => {
  let calls = 0
  const load = createCollectionLoader({ cache: new Map(), storage: () => memoryStorage(), now: () => NOW,
    fetchEntry: async () => { calls++; throw refusal(null) }, lastResort: async () => SAMPLE })
  await load(PREFIX)
  assert.deepEqual(await load(PREFIX), SAMPLE)
  assert.equal(calls, 1)
})

test('a limiter runs at most `max` at once and keeps order', async () => {
  const limit = createLimiter(2)
  let active = 0
  let peak = 0
  const started = []
  const job = (i) => limit(async () => {
    started.push(i); active++; peak = Math.max(peak, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active--
    return i
  })
  assert.deepEqual(await Promise.all([0, 1, 2, 3, 4].map(job)), [0, 1, 2, 3, 4])
  assert.equal(peak, 2)
  assert.deepEqual(started, [0, 1, 2, 3, 4])
})

test('a limiter keeps going after a failed job', async () => {
  const limit = createLimiter(1)
  const bad = limit(async () => { throw Error('no') })
  const good = limit(async () => 'ok')
  await assert.rejects(bad)
  assert.equal(await good, 'ok')
})

test('collectionToNames lists uncategorised names first, then categories, without repeats', () => {
  assert.deepEqual(collectionToNames({ uncategorized: ['b', 'a', 'b'], categories: { X: ['c', 'a'], Y: ['d'] } }), ['b', 'a', 'c', 'd'])
  assert.deepEqual(collectionToNames({}), [])
})
