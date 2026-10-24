import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  COLLECTION_TTL, COLLECTION_RETRY_DELAY, createCollectionLoader,
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

test('a failed first load with no stored data rejects, and a manual retry (chip click) within 60 seconds requests again', async () => {
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
