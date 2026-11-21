// The browser half of the live page previews (src/components/export/exportPreviewClient.js).
//
// What is pinned here, and the change that makes each fail:
//  1. A 403 is "upgrade", not "missing": the page is remembered as refused, and the next page is still asked for.
//     Break: set `missing = true` for a 403.
//  2. THE CACHE BELONGS TO ONE ACCOUNT AND PLAN: a sign-out, another account or a change of plan empties it; the same owner keeps it.
//     Break: make syncPreviewOwner return before clearPreviewCache().
//  3. A request that began for the previous account is never stored for the next.
//     Break: drop the `current` check before remember().
//  4. THE KEY A SCREEN HOLDS ITS OWN ANSWER UNDER CARRIES THE OWNER (useLivePage), so it never shows the last account's page.
//     Break: build ownedPreviewKey without the uid or plan, or switch useLivePage back to previewKey.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  EXPORT_PREVIEW_URL, brandHash, cachedPreview, clearPreviewCache, fetchPagePreview, ownedPreviewKey, syncPreviewOwner,
} from '../../src/components/export/exportPreviewClient.js'

const BRAND = { name: 'Tide & Co.', design: { palette: { colors: ['#2F6F5E'] } } }
const asUser = (uid) => async () => ({ auth: { currentUser: uid ? { uid, getIdToken: async () => `tok-${uid}` } : null } })
const reply = (status, html = '<p>page</p>') => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => 'application/json' },
  json: async () => ({ ok: true, html }),
})
const reset = () => { clearPreviewCache(); syncPreviewOwner(null, false) }

test('1. a 403 is "upgrade", is remembered, and does not stop the next page being asked for', async () => {
  reset()
  const calls = []
  const fetchImpl = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return reply(403) }
  const first = await fetchPagePreview({ theme: '01-presentation', page: 'guideCover', brand: BRAND }, { loadAuth: asUser('a'), fetchImpl })
  assert.deepEqual(first, { status: 'upgrade' })
  assert.equal(calls[0].url, EXPORT_PREVIEW_URL)
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['brand', 'page', 'theme'])

  const again = await fetchPagePreview({ theme: '01-presentation', page: 'guideCover', brand: BRAND }, { loadAuth: asUser('a'), fetchImpl })
  assert.deepEqual(again, { status: 'upgrade' })
  assert.equal(calls.length, 1, 'a refused page was asked for again')

  const other = await fetchPagePreview({ theme: '01-presentation', page: 'guidePalette', brand: BRAND }, { loadAuth: asUser('a'), fetchImpl })
  assert.deepEqual(other, { status: 'upgrade' })
  assert.equal(calls.length, 2, 'a 403 was treated as a missing endpoint')
})

test('2. the cache empties on a sign-out, another account or a change of plan, and not for the same owner', async () => {
  reset()
  const fetchImpl = async () => reply(200)
  const ask = () => fetchPagePreview({ theme: '04-standards', page: 'kitScreen', brand: BRAND }, { loadAuth: asUser('a'), fetchImpl })
  const has = () => cachedPreview('04-standards', 'kitScreen', BRAND) !== null

  syncPreviewOwner('a', false)
  assert.equal((await ask()).status, 'ok')
  assert.ok(has())
  syncPreviewOwner('a', false)
  assert.ok(has(), 'the same owner lost the cache')

  syncPreviewOwner('a', true)
  assert.ok(!has(), 'a change of plan kept the cache')

  assert.equal((await ask()).status, 'ok')
  assert.ok(has())
  syncPreviewOwner('b', true)
  assert.ok(!has(), 'another account kept the cache')

  assert.equal((await fetchPagePreview({ theme: '04-standards', page: 'kitScreen', brand: BRAND }, { loadAuth: asUser('b'), fetchImpl })).status, 'ok')
  assert.ok(has())
  syncPreviewOwner(null)
  assert.ok(!has(), 'a sign-out kept the cache')
})

test('3. a request begun for the previous account is not stored for the next', async () => {
  reset()
  let release
  const gate = new Promise((r) => { release = r })
  let reached
  const arrived = new Promise((r) => { reached = r })
  const fetchImpl = async () => { reached(); await gate; return reply(200, '<p>for a</p>') }
  const pending = fetchPagePreview({ theme: '04-standards', page: 'kitScreen', brand: BRAND }, { loadAuth: asUser('a'), fetchImpl })
  await arrived
  syncPreviewOwner('b', false)
  release()
  await pending
  assert.equal(cachedPreview('04-standards', 'kitScreen', BRAND), null, 'the old account\'s page was stored for the new one')
})

test('4. the key a screen holds its own answer under follows the owner, so a copy kept for one account is never read for another', () => {
  reset()
  const hash = brandHash(BRAND)
  syncPreviewOwner('a', true)
  const asA = ownedPreviewKey('04-standards', 'kitScreen', hash)
  syncPreviewOwner('a', true)
  assert.equal(ownedPreviewKey('04-standards', 'kitScreen', hash), asA, 'the same owner keeps its key')
  syncPreviewOwner('b', true)
  assert.notEqual(ownedPreviewKey('04-standards', 'kitScreen', hash), asA, 'another account')
  syncPreviewOwner('b', false)
  const asBFree = ownedPreviewKey('04-standards', 'kitScreen', hash)
  assert.notEqual(asBFree, ownedPreviewKey('04-standards', 'kitScreen', brandHash({ ...BRAND, name: 'Other' })), 'a new brand is a new key')
  syncPreviewOwner('a', true)
  assert.notEqual(asBFree, ownedPreviewKey('04-standards', 'kitScreen', hash))
  syncPreviewOwner(null, false)
  assert.notEqual(ownedPreviewKey('04-standards', 'kitScreen', hash), asA, 'a sign-out')
})

test('useLivePage holds its answer under that owner key', () => {
  const source = fs.readFileSync('src/components/export/useLivePage.js', 'utf8')
  assert.match(source, /ownedPreviewKey\(/, 'the hook must key its state on the owner')
  assert.doesNotMatch(source, /\bpreviewKey\(/, 'the bare key ignores who is signed in')
})

test('a signed-out viewer asks for nothing', async () => {
  reset()
  let called = false
  const answer = await fetchPagePreview({ theme: '04-standards', page: 'kitScreen', brand: BRAND }, {
    loadAuth: asUser(null), fetchImpl: async () => { called = true; return reply(200) },
  })
  assert.deepEqual(answer, { status: 'unavailable' })
  assert.equal(called, false)
})
