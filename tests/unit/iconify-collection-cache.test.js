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

test('stale data is refreshed on success, or used without renewing its timestamp on failure', async () => {
  for (const fails of [false, true]) {
    const store = memoryStorage()
    const oldAt = NOW - 2 * COLLECTION_TTL
    writeCollectionCache(PREFIX, DATA, { storage: () => store, now: oldAt })
    let calls = 0
    const updated = { ...DATA, names: ['new-icon'] }
    const load = createCollectionLoader({ cache: new Map(), storage: () => store, now: () => NOW,
      fetchEntry: async () => { calls++; if (fails) throw TypeError('Failed to fetch'); return updated } })
    assert.deepEqual(await load(PREFIX), fails ? DATA : updated)
    assert.equal(calls, 1)
    assert.equal(JSON.parse(store.getItem(KEY)).at, fails ? oldAt : NOW)
    assert.deepEqual(await load(PREFIX), fails ? DATA : updated)
    assert.equal(calls, 1)
  }
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
