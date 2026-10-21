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
  BASE_COOLDOWN, HELD_HEADER, MAX_COOLDOWN, NET_COOLDOWN, NET_FAIL_WINDOW, STRIKE_MEMORY, TTL_DEFAULT, TTL_SEARCH,
  createIconifyFetch, fitsUrl, parseRetryAfter, scopeFor, ttlFor,
} from '../../src/utils/iconifyFetch.js'
// Loaded here, by its real specifier, so a missing ".js" in its own import of
// iconifyFetch fails this whole file under Node ESM, not just the groups tests.
import { GLYPH_CHUNK, glyphChunkPlan } from '../../src/utils/iconGroupGlyphs.js'

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

function rig({ answer = () => ok(), caches = fakeCaches(), storage = fakeStorage(), maxParallel, opts = {} } = {}) {
  const clock = { t: 1_000_000 }
  const net = scriptedFetch(answer)
  const make = (over = {}) => createIconifyFetch({
    fetchImpl: net.fetchImpl, caches: caches.caches, storage, now: () => clock.t, maxParallel, ...opts, ...over,
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

const SVG_OK = () => new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>', { status: 200, headers: { 'content-type': 'image/svg+xml' } })

test('persist: false keeps an answer out of Cache Storage', async () => {
  const kept = rig({ answer: SVG_OK })
  await kept.api.get(`${HOST}/lucide/home.svg?width=24`)
  assert.equal(kept.caches.store.size, 1, 'positive control: the same good answer is stored by default')
  const { api, caches } = rig({ answer: SVG_OK })
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

// ── an answer that is not what was asked for is never kept ───────────────────
const reply = (body, type) => new Response(body, { status: 200, headers: { 'content-type': type } })
const STAMP = 'x-uil4b-stored-at'

test('fitsUrl: JSON must parse for the catalogue, search and glyph files; SVG for an icon file', () => {
  const json = 'application/json; charset=utf-8'
  assert.equal(fitsUrl(COLLECTION, json, '{"a":1}'), true)
  assert.equal(fitsUrl(COLLECTION, 'text/html', '<html></html>'), false)
  assert.equal(fitsUrl(COLLECTION, json, '{"a":'), false, 'cut off')
  assert.equal(fitsUrl(SEARCH, 'text/plain', '{"a":1}'), false)
  assert.equal(fitsUrl(`${HOST}/lucide.json?icons=a`, json, 'Too Many Requests'), false)
  assert.equal(fitsUrl(`${HOST}/lucide/home.svg`, 'image/svg+xml', '<svg></svg>'), true)
  assert.equal(fitsUrl(`${HOST}/lucide/home.svg`, 'text/plain', '<?xml version="1.0"?><svg viewBox="0 0 1 1"/>'), true, 'an svg body is enough')
  assert.equal(fitsUrl(`${HOST}/lucide/home.svg`, 'text/html', '<html><svg></svg></html>'), false)
  assert.equal(fitsUrl(`${HOST}/lucide/home.svg`, json, '{"a":1}'), false)
})

test('a 200 that is not what was asked for reaches the caller but is not stored', async () => {
  const cases = [
    [COLLECTION, 'text/html', '<html>Sign in to the wifi</html>'],
    [COLLECTION, 'application/json', '{"prefix":"luc'],
    [`${HOST}/lucide.json?icons=a,b`, 'text/html', '<html></html>'],
    [SEARCH, 'text/plain', '{"icons":[]}'],
    [`${HOST}/lucide/home.svg`, 'text/html', '<html><body>nope</body></html>'],
    [`${HOST}/lucide/home.svg`, 'application/json', '{"a":1}'],
  ]
  for (const [url, type, body] of cases) {
    const { api, net, caches } = rig({ answer: () => reply(body, type) })
    const r = await api.get(url)
    assert.equal(r.status, 200, `${url}: the caller still gets what came back`)
    assert.equal(caches.store.size, 0, `${url} (${type}) was kept`)
    await api.get(url)
    assert.equal(net.calls.length, 2, `${url}: nothing was cached, so it is asked again`)
  }
  const svg = rig({ answer: () => reply('<svg xmlns="http://www.w3.org/2000/svg"/>', 'text/plain') })
  await svg.api.get(`${HOST}/lucide/home.svg`)
  assert.equal(svg.caches.store.size, 1, 'positive control: an svg body is kept')
})

test('a refresh that comes back as the wrong thing does not replace a good old answer', async () => {
  let bad = false
  const { api, clock } = rig({ answer: () => (bad ? reply('<html>portal</html>', 'text/html') : ok('{"v":3}')) })
  await api.get(COLLECTION)
  clock.t += TTL_DEFAULT + 1
  bad = true
  assert.deepEqual(await (await api.get(COLLECTION)).json(), { v: 3 })
})

test('an entry that no longer fits its URL is dropped on read, so Try again reaches the network', async () => {
  const r = rig()
  r.caches.store.set(COLLECTION, new Response('<html>portal</html>', {
    status: 200, headers: { 'content-type': 'text/html', [STAMP]: String(r.clock.t) },
  }))
  const res = await r.api.get(COLLECTION)
  assert.deepEqual(await res.json(), { ok: true }, 'the bad body was not served')
  assert.equal(r.net.calls.length, 1, 'fresh by the clock, but it went to the network')
  assert.equal(await r.caches.store.get(COLLECTION).clone().text(), '{"ok":true}', 'and the good answer replaced it')
})

// ── a refusal the browser will not let us read ───────────────────────────────
const boom = () => { throw new TypeError('Failed to fetch') }
const collectionOf = (p) => `${HOST}/collection?prefix=${p}`

test('three network rejections in a row start a short pause, not the 429 cool-down', async () => {
  const { api, net, clock, storage } = rig({ answer: boom })
  for (const p of ['a', 'b']) await assert.rejects(api.get(collectionOf(p)), TypeError)
  assert.equal(api.cooldownUntil(), 0, 'two are just a bad connection')
  await assert.rejects(api.get(collectionOf('c')), TypeError)
  assert.equal(api.cooldownUntil() - clock.t, NET_COOLDOWN, 'the third starts the short pause')
  assert.ok(NET_COOLDOWN <= 30_000 && NET_COOLDOWN < BASE_COOLDOWN, 'short, nothing like the 429 wait')
  assert.equal(storage.map.size, 0, 'and it is not saved, so a reload does not inherit it')
  const held = await api.get(collectionOf('d'))
  assert.equal(held.status, 429)
  assert.equal(net.calls.length, 3, 'nothing more is sent during the pause')
  clock.t += NET_COOLDOWN + 1
  assert.equal(api.cooldownUntil(), 0, 'it lapses on its own within seconds')
  await assert.rejects(api.get(collectionOf('e')), TypeError)
  assert.equal(net.calls.length, 4, 'and requests go out again')
})

test('the browser coming back online ends the pause at once', async () => {
  let back = () => {}
  const { api, net, clock } = rig({ answer: boom, opts: { listenOnline: (cb) => { back = cb } } })
  for (const p of ['a', 'b', 'c']) await assert.rejects(api.get(collectionOf(p)), TypeError)
  assert.ok(api.cooldownUntil() > clock.t, 'positive control: the pause is running')
  back()
  assert.equal(api.cooldownUntil(), 0)
  await assert.rejects(api.get(collectionOf('d')), TypeError)
  assert.equal(net.calls.length, 4, 'the next request is sent, not answered with a synthetic 429')
})

test('a real 429 still starts the long cool-down, and the online event does not end it', async () => {
  let back = () => {}
  const { api, clock } = rig({ answer: () => limited(null), opts: { listenOnline: (cb) => { back = cb } } })
  await api.get(COLLECTION)
  assert.equal(api.cooldownUntil() - clock.t, BASE_COOLDOWN)
  back()
  assert.equal(api.cooldownUntil() - clock.t, BASE_COOLDOWN, 'only the pause from rejections clears on online')
})

test('one good answer clears the run of rejections', async () => {
  let down = true
  const { api } = rig({ answer: () => (down ? boom() : ok()) })
  for (const p of ['a', 'b']) await assert.rejects(api.get(collectionOf(p)), TypeError)
  down = false
  await api.get(collectionOf('c'))
  down = true
  for (const p of ['d', 'e']) await assert.rejects(api.get(collectionOf(p)), TypeError)
  assert.equal(api.cooldownUntil(), 0, 'two and two, with a success between, is not three in a row')
})

test('rejections spread out over time, timeouts and an offline browser do not start a cool-down', async () => {
  const slow = rig({ answer: boom })
  for (const p of ['a', 'b', 'c', 'd']) {
    await assert.rejects(slow.api.get(collectionOf(p)), TypeError)
    slow.clock.t += NET_FAIL_WINDOW + 1
  }
  assert.equal(slow.api.cooldownUntil(), 0, 'not within the window')

  const timeout = () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }) }
  const slowNet = rig({ answer: timeout })
  for (const p of ['a', 'b', 'c', 'd']) await assert.rejects(slowNet.api.get(collectionOf(p)))
  assert.equal(slowNet.api.cooldownUntil(), 0, 'a timeout is a slow network, not a refusal')

  const offline = rig({ answer: boom, opts: { isOnline: () => false } })
  for (const p of ['a', 'b', 'c', 'd']) await assert.rejects(offline.api.get(collectionOf(p)), TypeError)
  assert.equal(offline.api.cooldownUntil(), 0, 'offline is not rate limiting')
})

test('rejections with an old answer to fall back on do not start a cool-down', async () => {
  let down = false
  const { api, clock } = rig({ answer: () => (down ? boom() : ok()) })
  const urls = ['a', 'b', 'c'].map(collectionOf)
  for (const u of urls) await api.get(u)
  clock.t += TTL_DEFAULT + 1
  down = true
  for (const u of urls) assert.equal((await api.get(u)).status, 200)
  assert.equal(api.cooldownUntil(), 0)
})

test('a back-off count from long ago, or one the visitor cleared, starts again at the base', async () => {
  const old = rig({ answer: () => limited(null) })
  await old.api.get(COLLECTION)
  old.clock.t += BASE_COOLDOWN
  await old.api.get(OTHER)
  assert.equal(old.api.cooldownUntil() - old.clock.t, BASE_COOLDOWN * 2, 'positive control: the ladder had climbed')
  old.clock.t += BASE_COOLDOWN * 2 + STRIKE_MEMORY + 1
  await old.api.get(COLLECTION)
  assert.equal(old.api.cooldownUntil() - old.clock.t, BASE_COOLDOWN, 'the count was forgotten once the cool-down was long over')

  const cleared = rig({ answer: () => limited(null) })
  await cleared.api.get(COLLECTION)
  cleared.clock.t += BASE_COOLDOWN
  await cleared.api.get(OTHER)
  cleared.api.clearCooldown()
  await cleared.api.get(COLLECTION)
  assert.equal(cleared.api.cooldownUntil() - cleared.clock.t, BASE_COOLDOWN, 'Try again starts the ladder over')
})

// ── the cool-down is kept per kind of request ────────────────────────────────
const GLYPH = `${HOST}/lucide.json?icons=a,b,c`
const GLYPH_2 = `${HOST}/tabler.json?icons=a,b,c`
const ICON_SVG = `${HOST}/lucide/home.svg?width=24`
const COOLDOWN_STORE = 'uil4b-iconify-cooldown'
const IS_LIST = /\/collection\?/
const IS_GLYPH = /\.json\?icons=/
/** Refuse (429) one kind of request, answer every other kind. */
const refuseOnly = (re, retryAfter = 600) => (url) => (re.test(url) ? limited(retryAfter) : ok())

test('scopeFor sorts a URL into pack list, search, icon file or glyph file', () => {
  assert.equal(scopeFor(COLLECTION), 'collection')
  assert.equal(scopeFor(SEARCH), 'search')
  assert.equal(scopeFor(ICON_SVG), 'svg')
  assert.equal(scopeFor(GLYPH), 'glyph')
  assert.equal(scopeFor(`${HOST}/collections`), 'glyph', 'anything else is treated as a glyph file')
  assert.equal(scopeFor('not a url'), 'glyph', 'an odd URL does not throw')
})

test('a refused pack list does not hold glyph files, icon files or searches', async () => {
  const { api, net } = rig({ answer: refuseOnly(IS_LIST) })
  assert.equal((await api.get(COLLECTION)).status, 429)
  assert.equal(net.calls.length, 1)
  assert.equal((await api.get(OTHER)).status, 429, 'positive control: the pack lists are held')
  assert.equal(net.calls.length, 1)

  for (const url of [GLYPH, ICON_SVG, SEARCH]) {
    const r = await api.get(url)
    assert.equal(r.status, 200, `${url} should still be sent`)
    assert.equal(r.headers.get(HELD_HEADER), null)
  }
  assert.equal(net.calls.length, 4, 'one pack list, then the three other kinds')
})

test('a refused glyph file holds glyph files only, and the pack lists still go out', async () => {
  const { api, net, clock } = rig({ answer: refuseOnly(IS_GLYPH, 900) })
  assert.equal((await api.get(GLYPH)).status, 429)
  assert.equal(api.cooldownUntil(GLYPH_2), clock.t + 900_000, 'another pack\'s glyph file is held for the same time')
  assert.equal(api.cooldownUntil(COLLECTION), 0)
  assert.equal(api.cooldownUntil(SEARCH), 0)
  assert.equal((await api.get(COLLECTION)).status, 200)
  assert.equal(net.calls.length, 2)
})

test('a request held by a cool-down says so; a refusal Iconify sent does not', async () => {
  const { api } = rig({ answer: () => limited(600) })
  const real = await api.get(COLLECTION)
  assert.equal(real.status, 429)
  assert.equal(real.headers.get(HELD_HEADER), null, 'this one was sent and refused by Iconify')
  const held = await api.get(OTHER)
  assert.equal(held.status, 429)
  assert.equal(held.headers.get(HELD_HEADER), '1', 'this one never left the page')
})

test('cooldownUntil(url) reports that kind; with no url it reports the latest of any', async () => {
  const { api, clock } = rig({ answer: refuseOnly(IS_LIST, 600) })
  await api.get(COLLECTION)
  assert.equal(api.cooldownUntil(COLLECTION), clock.t + 600_000)
  assert.equal(api.cooldownUntil(OTHER), clock.t + 600_000, 'any pack list')
  assert.equal(api.cooldownUntil(GLYPH), 0)
  assert.equal(api.cooldownUntil(SEARCH), 0)
  assert.equal(api.cooldownUntil(), clock.t + 600_000)

  const both = rig({ answer: (url) => (IS_LIST.test(url) ? limited(600) : IS_GLYPH.test(url) ? limited(1800) : ok()) })
  await both.api.get(COLLECTION)
  await both.api.get(GLYPH)
  assert.equal(both.api.cooldownUntil(COLLECTION), both.clock.t + 600_000)
  assert.equal(both.api.cooldownUntil(GLYPH), both.clock.t + 1_800_000)
  assert.equal(both.api.cooldownUntil(), both.clock.t + 1_800_000, 'no url: the longest')
})

test('each kind climbs its own back-off ladder', async () => {
  const { api, clock } = rig({ answer: (url) => (IS_LIST.test(url) || IS_GLYPH.test(url) ? limited(null) : ok()) })
  await api.get(COLLECTION)
  clock.t += BASE_COOLDOWN
  await api.get(OTHER)
  assert.equal(api.cooldownUntil(COLLECTION) - clock.t, BASE_COOLDOWN * 2, 'positive control: pack lists climbed to the second rung')
  await api.get(GLYPH)
  assert.equal(api.cooldownUntil(GLYPH) - clock.t, BASE_COOLDOWN, 'the first glyph refusal starts at the base, not at the pack lists\' rung')
})

test('a glyph success does not reset the pack lists\' back-off count', async () => {
  const { api, clock } = rig({ answer: (url) => (IS_GLYPH.test(url) ? ok() : limited(null)) })
  await api.get(COLLECTION)
  clock.t += BASE_COOLDOWN
  await api.get(OTHER)
  assert.equal(api.cooldownUntil(COLLECTION) - clock.t, BASE_COOLDOWN * 2, 'positive control: second rung')
  clock.t += BASE_COOLDOWN * 2
  await api.get(GLYPH)
  await api.get(COLLECTION)
  assert.equal(api.cooldownUntil(COLLECTION) - clock.t, BASE_COOLDOWN * 4, 'still climbing: the third rung is 4x the base')
})

test('the cool-down is saved per kind in storage', async () => {
  const { api, storage, clock } = rig({ answer: refuseOnly(IS_LIST, 600) })
  await api.get(COLLECTION)
  const saved = JSON.parse(storage.map.get(COOLDOWN_STORE))
  assert.deepEqual(Object.keys(saved), ['scopes'])
  assert.deepEqual(saved.scopes, { collection: { until: clock.t + 600_000, strikes: 1 } })
})

test('after a reload the pack lists are still held but glyph files are sent', async () => {
  const { make, net } = rig({ answer: refuseOnly(IS_LIST, 600) })
  await make().get(COLLECTION)
  const afterReload = make()
  const held = await afterReload.get(OTHER)
  assert.equal(held.headers.get(HELD_HEADER), '1')
  assert.equal(net.calls.length, 1, 'the reloaded page sent no pack list')
  assert.equal((await afterReload.get(GLYPH)).status, 200)
  assert.equal(net.calls.length, 2, 'but its glyph file went out')
})

test('a cool-down saved in the old single-value shape holds nothing', async () => {
  const { make, net, storage, clock } = rig()
  storage.setItem(COOLDOWN_STORE, JSON.stringify({ until: clock.t + 600_000, strikes: 2 }))
  const api = make()
  assert.equal(api.cooldownUntil(), 0)
  assert.equal((await api.get(COLLECTION)).status, 200)
  assert.equal(net.calls.length, 1)
})

test('a cool-down saved by another tab is picked up for that kind only', async () => {
  const { make, net, storage, clock } = rig()
  const api = make()
  storage.setItem(COOLDOWN_STORE, JSON.stringify({ scopes: { glyph: { until: clock.t + 600_000, strikes: 1 } } }))
  assert.equal(api.cooldownUntil(GLYPH), clock.t + 600_000)
  assert.equal((await api.get(GLYPH)).headers.get(HELD_HEADER), '1')
  assert.equal(net.calls.length, 0)
  assert.equal((await api.get(COLLECTION)).status, 200)
})

test('Try again clears every kind\'s cool-down and the saved copy', async () => {
  const { api, storage } = rig({ answer: (url) => (IS_LIST.test(url) || IS_GLYPH.test(url) ? limited(600) : ok()) })
  await api.get(COLLECTION)
  await api.get(GLYPH)
  assert.ok(api.cooldownUntil(COLLECTION) > 0 && api.cooldownUntil(GLYPH) > 0, 'positive control: both are held')
  api.clearCooldown()
  assert.equal(api.cooldownUntil(COLLECTION), 0)
  assert.equal(api.cooldownUntil(GLYPH), 0)
  assert.equal(api.cooldownUntil(), 0)
  assert.equal(storage.map.has(COOLDOWN_STORE), false)
})

test('the short pause after rejected fetches holds every kind, and says it was held', async () => {
  const { api, net } = rig({ answer: boom })
  for (const p of ['a', 'b', 'c']) await assert.rejects(api.get(collectionOf(p)), TypeError)
  for (const url of [GLYPH, ICON_SVG, SEARCH]) {
    const r = await api.get(url)
    assert.equal(r.status, 429, url)
    assert.equal(r.headers.get(HELD_HEADER), '1', url)
  }
  assert.equal(net.calls.length, 3)
})

// ── glyph tranches: one icon, one URL ────────────────────────────────────────
const nm = (n) => Array.from({ length: n }, (_, i) => `n${i}`)
const refsOf = (pack, names) => names.map((name) => ({ pack, name }))

test('glyph tranches are cut by position in the pack, so an icon always lands in the same request', () => {
  const lists = new Map([['solar', nm(250)], ['lucide', nm(40)]])
  const alone = glyphChunkPlan(lists, refsOf('solar', ['n3']))
  const crowd = glyphChunkPlan(lists, [...refsOf('solar', nm(19)), ...refsOf('lucide', ['n0'])])
  assert.equal(alone.length, 1)
  assert.deepEqual(alone[0].names, nm(GLYPH_CHUNK), 'the whole first chunk, not just the visible name')
  assert.deepEqual(crowd.find((c) => c.pack === 'solar'), alone[0], 'the same request whatever else is on screen')

  const [second] = glyphChunkPlan(lists, refsOf('solar', ['n150']))
  assert.deepEqual(second.names, nm(200).slice(100), 'n150 is in the second chunk')
  const [last] = glyphChunkPlan(lists, refsOf('solar', ['n249']))
  assert.deepEqual(last.names, nm(250).slice(200), 'the last chunk is the remainder')

  assert.equal(glyphChunkPlan(lists, refsOf('solar', ['n99', 'n100'])).length, 2, 'either side of a boundary')
  assert.equal(glyphChunkPlan(lists, refsOf('solar', ['n1', 'n2', 'n1'])).length, 1, 'a chunk is asked once')
  assert.deepEqual(glyphChunkPlan(lists, refsOf('solar', ['n5']), 2)[0].names, ['n4', 'n5'], 'the size is a parameter')
})

test('icons outside the pack listing are sorted and chunked on their own, so the same set gives the same request', () => {
  const lists = new Map([['a', nm(5)]])
  const one = glyphChunkPlan(lists, refsOf('a', ['zz', 'bb', 'n1']))
  const two = glyphChunkPlan(lists, refsOf('a', ['n1', 'bb', 'zz']))
  assert.deepEqual(one, two)
  assert.deepEqual(one.map((c) => c.names), [nm(5), ['bb', 'zz']])
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

test('the grid cuts its glyph tranches with glyphChunkPlan, not from the visible names', () => {
  const lib = fs.readFileSync(path.join(ROOT, 'src/pages/IconLibrary.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.match(lib, /glyphChunkPlan\(/)
  assert.doesNotMatch(lib, /names\.slice\(i, i \+ GLYPH_BATCH\)/)
})
