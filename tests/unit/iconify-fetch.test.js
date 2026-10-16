// src/utils/iconifyFetch.js: the one door to the Iconify API. It keeps answers
// across reloads (Cache Storage, with a TTL), shares one cool-down after a 429,
// and serves an old answer rather than none while the API refuses.
//
// Everything here is injected (fetch, Cache Storage, localStorage, the clock),
// so the rules are pinned without a browser. The browser half, a real reload
// counted at the fixture stub, is tests/user-sim/97-iconify-persistent-cache.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BASE_COOLDOWN, MAX_COOLDOWN, TTL_DEFAULT, TTL_SEARCH,
  createIconifyFetch, parseRetryAfter, ttlFor,
} from '../../src/utils/iconifyFetch.js'

const HOST = 'https://api.iconify.design'
const COLLECTION = `${HOST}/collection?prefix=lucide&info=1`
const OTHER = `${HOST}/collection?prefix=tabler&info=1`
const SEARCH = `${HOST}/search?query=arrow&limit=999`
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Cache Storage in a Map: open/match/put/keys/delete, the calls the module makes. */
function fakeCaches({ failPut = false } = {}) {
  const store = new Map()
  const cache = {
    match: async (key) => store.get(typeof key === 'string' ? key : key.url)?.clone(),
    put: async (key, res) => { if (failPut) throw new Error('QuotaExceededError'); store.set(key, res) },
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (key) => store.delete(typeof key === 'string' ? key : key.url),
  }
  return { caches: { open: async () => cache }, store }
}

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
    map,
  }
}

/** A fetch that answers from a script and counts every call. */
function scriptedFetch(answer) {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    return answer(url, calls.length)
  }
  return { calls, fetchImpl }
}

const ok = (body = '{"ok":true}') => new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
const limited = (retryAfter) => new Response('Too Many Requests', {
  status: 429, headers: retryAfter == null ? {} : { 'retry-after': String(retryAfter) },
})

function rig({ answer = () => ok(), caches = fakeCaches(), storage = fakeStorage(), maxParallel } = {}) {
  const clock = { t: 1_000_000 }
  const net = scriptedFetch(answer)
  const make = (over = {}) => createIconifyFetch({
    fetchImpl: net.fetchImpl, caches: caches.caches, storage, now: () => clock.t, maxParallel, ...over,
  })
  return { clock, net, caches, storage, make, api: make() }
}

test('the freshness window is a day, and an hour for a search', () => {
  assert.equal(ttlFor(COLLECTION), TTL_DEFAULT)
  assert.equal(ttlFor(`${HOST}/lucide.json?icons=a,b`), TTL_DEFAULT)
  assert.equal(ttlFor(`${HOST}/lucide/home.svg`), TTL_DEFAULT)
  assert.equal(ttlFor(SEARCH), TTL_SEARCH)
  assert.equal(TTL_SEARCH, 60 * 60 * 1000)
  assert.equal(TTL_DEFAULT, 24 * 60 * 60 * 1000)
})

test('Retry-After reads seconds and HTTP dates, and nothing else', () => {
  assert.equal(parseRetryAfter('3555'), 3_555_000)
  assert.equal(parseRetryAfter(' 10 '), 10_000)
  assert.equal(parseRetryAfter(new Date(5_000).toUTCString(), 1_000), 4_000)
  assert.equal(parseRetryAfter(new Date(0).toUTCString(), 1_000_000), 0, 'a date in the past is zero, not negative')
  for (const bad of [null, undefined, '', 'soon']) assert.equal(parseRetryAfter(bad), null)
})

test('a second request for the same URL is answered from Cache Storage, with no network', async () => {
  const { api, net, caches } = rig()
  const first = await api.get(COLLECTION)
  assert.equal(first.ok, true)
  assert.deepEqual(await first.json(), { ok: true })
  assert.equal(net.calls.length, 1)
  assert.equal(caches.store.size, 1, 'the answer was kept')

  const second = await api.get(COLLECTION)
  assert.deepEqual(await second.json(), { ok: true }, 'the cached body is a usable Response')
  assert.equal(net.calls.length, 1, 'a fresh entry costs no request')
})

test('the cache outlives the page: a new instance over the same storage asks nobody', async () => {
  const { make, net } = rig()
  await make().get(COLLECTION)
  const afterReload = make()
  assert.deepEqual(await (await afterReload.get(COLLECTION)).json(), { ok: true })
  assert.equal(net.calls.length, 1)
})

test('an entry past its TTL is fetched again; a search expires sooner than a pack', async () => {
  const { api, net, clock } = rig()
  await api.get(COLLECTION)
  await api.get(SEARCH)
  clock.t += TTL_SEARCH + 1
  await api.get(COLLECTION)
  assert.equal(net.calls.length, 2, 'the pack is still fresh after an hour')
  await api.get(SEARCH)
  assert.equal(net.calls.length, 3, 'the search is not')
  clock.t += TTL_DEFAULT
  await api.get(COLLECTION)
  assert.equal(net.calls.length, 4, 'and the pack goes stale after a day')
})

test('concurrent identical requests share one round trip', async () => {
  const { api, net } = rig()
  const all = await Promise.all([api.get(COLLECTION), api.get(COLLECTION), api.get(COLLECTION)])
  assert.equal(net.calls.length, 1)
  for (const r of all) assert.deepEqual(await r.json(), { ok: true }, 'each caller gets a body of its own')
})

test('a 429 starts a cool-down, honours Retry-After, and sends nothing more until it ends', async () => {
  const { api, net, clock } = rig({ answer: () => limited(3555) })
  const first = await api.get(COLLECTION)
  assert.equal(first.status, 429, 'with nothing cached the page sees the refusal')
  assert.equal(api.cooldownUntil(), clock.t + 3_555_000)

  const second = await api.get(OTHER)
  assert.equal(second.status, 429)
  assert.equal(net.calls.length, 1, 'no request left while cooling down')

  clock.t += 3_555_000
  assert.equal(api.cooldownUntil(), 0)
  await api.get(OTHER)
  assert.equal(net.calls.length, 2, 'asked again once it is over')
})

test('the cool-down survives a reload (it is in storage, not just memory)', async () => {
  const { make, net, storage } = rig({ answer: () => limited(600) })
  await make().get(COLLECTION)
  assert.ok(storage.map.size > 0, 'something was written to storage')
  const afterReload = make()
  await afterReload.get(OTHER)
  assert.equal(net.calls.length, 1, 'the new page load sent nothing')
})

test('Retry-After is capped at an hour', async () => {
  const { api, clock } = rig({ answer: () => limited(999_999) })
  await api.get(COLLECTION)
  assert.equal(api.cooldownUntil(), clock.t + MAX_COOLDOWN)
})

test('an unreadable Retry-After falls back to a default that doubles, and a success resets it', async () => {
  let refuse = true
  const { api, clock } = rig({ answer: () => (refuse ? limited(null) : ok()) })
  await api.get(COLLECTION)
  assert.equal(api.cooldownUntil() - clock.t, BASE_COOLDOWN)

  clock.t += BASE_COOLDOWN
  await api.get(OTHER)
  assert.equal(api.cooldownUntil() - clock.t, BASE_COOLDOWN * 2, 'refused again straight after: twice as long')

  clock.t += BASE_COOLDOWN * 2
  refuse = false
  await api.get(COLLECTION)
  refuse = true
  clock.t += TTL_DEFAULT
  await api.get(OTHER)
  assert.equal(api.cooldownUntil() - clock.t, BASE_COOLDOWN, 'a success in between starts the ladder again')
})

test('refusals from one burst count as one, not one each', async () => {
  const { api, clock } = rig({ answer: () => limited(null) })
  await Promise.all(['a', 'b', 'c', 'd', 'e'].map((p) => api.get(`${HOST}/collection?prefix=${p}`)))
  assert.equal(api.cooldownUntil() - clock.t, BASE_COOLDOWN)
})

test('the first 429 stops the requests still queued behind it', async () => {
  const { api, net } = rig({ answer: () => limited(null), maxParallel: 1 })
  const urls = ['a', 'b', 'c', 'd'].map((p) => `${HOST}/collection?prefix=${p}`)
  const all = await Promise.all(urls.map((u) => api.get(u)))
  assert.equal(net.calls.length, 1, 'one request left, the rest were held back and refused locally')
  for (const r of all) assert.equal(r.status, 429)
})

test('no more than maxParallel requests are in flight', async () => {
  let live = 0
  let peak = 0
  const { api } = rig({
    maxParallel: 3,
    answer: async () => {
      live += 1; peak = Math.max(peak, live)
      await new Promise((r) => setTimeout(r, 5))
      live -= 1
      return ok()
    },
  })
  await Promise.all(Array.from({ length: 12 }, (_, i) => api.get(`${HOST}/collection?prefix=p${i}`)))
  assert.equal(peak, 3)
})

test('while cooling down an expired answer is still served, so the page is not emptied', async () => {
  let refuse = false
  const { api, net, clock } = rig({ answer: () => (refuse ? limited(3555) : ok('{"v":1}')) })
  await api.get(COLLECTION)
  clock.t += TTL_DEFAULT + 1
  refuse = true
  const trigger = await api.get(OTHER)
  assert.equal(trigger.status, 429, 'something never fetched has nothing to fall back on')
  const before = net.calls.length

  const stale = await api.get(COLLECTION)
  assert.equal(stale.status, 200)
  assert.deepEqual(await stale.json(), { v: 1 })
  assert.equal(net.calls.length, before, 'and it cost no request')
})

test('an expired answer also covers a refused refresh, a server error and a dead network', async () => {
  for (const failure of [() => limited(null), () => new Response('boom', { status: 503 }), () => { throw new TypeError('Failed to fetch') }]) {
    let mode = 'ok'
    const { api, clock } = rig({ answer: () => (mode === 'ok' ? ok('{"v":2}') : failure()) })
    await api.get(COLLECTION)
    clock.t += TTL_DEFAULT + 1
    mode = 'fail'
    const r = await api.get(COLLECTION)
    assert.deepEqual(await r.json(), { v: 2 })
  }
})

test('nothing cached and nothing reachable is still a failure the caller can see', async () => {
  const dead = rig({ answer: () => { throw new TypeError('Failed to fetch') } })
  await assert.rejects(dead.api.get(COLLECTION), TypeError)
  const err = rig({ answer: () => new Response('boom', { status: 503 }) })
  assert.equal((await err.api.get(COLLECTION)).status, 503)
})

test('a 404 is an answer: returned as it came, and not kept', async () => {
  const { api, net, caches } = rig({ answer: () => new Response('{"error":"not found"}', { status: 404 }) })
  assert.equal((await api.get(COLLECTION)).status, 404)
  assert.equal(caches.store.size, 0)
  await api.get(COLLECTION)
  assert.equal(net.calls.length, 2)
})

test('persist: false keeps an answer out of Cache Storage', async () => {
  const { api, caches } = rig()
  await api.get(`${HOST}/lucide/home.svg?width=24`, { persist: false })
  assert.equal(caches.store.size, 0)
})

test('without Cache Storage or localStorage it is a plain fetch with an in-memory cool-down', async () => {
  let refuse = false
  const { api, net } = rig({ caches: { caches: null, store: new Map() }, storage: null, answer: () => (refuse ? limited(600) : ok()) })
  await api.get(COLLECTION)
  await api.get(COLLECTION)
  assert.equal(net.calls.length, 2, 'nothing is kept, so a settled request is asked again, as before')
  refuse = true
  await api.get(OTHER)
  await api.get(`${HOST}/collection?prefix=mdi&info=1`)
  assert.equal(net.calls.length, 3, 'the cool-down still holds, in memory')
})

test('a cache that cannot be written (quota) does not fail the request', async () => {
  const { api } = rig({ caches: fakeCaches({ failPut: true }) })
  const r = await api.get(COLLECTION)
  assert.deepEqual(await r.json(), { ok: true })
})

test('Try again can clear the cool-down', async () => {
  const { api, net } = rig({ answer: () => limited(3555) })
  await api.get(COLLECTION)
  assert.ok(api.cooldownUntil() > 0)
  api.clearCooldown()
  assert.equal(api.cooldownUntil(), 0)
  await api.get(OTHER)
  assert.equal(net.calls.length, 2)
})

test('every Iconify GET in the library goes through iconifyFetch', () => {
  // Comment-blind, so the note explaining the change cannot satisfy the rule.
  const code = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const rel of ['src/pages/IconLibrary.jsx', 'src/pages/IconEmojiLibrary.jsx', 'src/utils/iconGroupGlyphs.js']) {
    assert.doesNotMatch(code(rel), /\bfetch\(/, `${rel} calls fetch() directly: Iconify requests go through src/utils/iconifyFetch.js`)
  }
  assert.match(code('src/pages/IconLibrary.jsx'), /iconifyFetch\(/)
  assert.match(code('src/utils/iconGroupGlyphs.js'), /iconifyFetch\(/)
})
