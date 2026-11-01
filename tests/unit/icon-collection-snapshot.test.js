// PACK LISTS SERVED FROM OUR OWN SITE.
//
// A first visit to /create/icons used to ask api.iconify.design for one
// /collection per pack, which is what got an office IP rate limited. The pack
// lists are now committed under public/iconify/collections/ and read same-origin;
// a pack with no usable snapshot still falls back to the live request.
//
// Three things are pinned here: every Iconify pack the library offers has a
// committed, readable snapshot; the reader returns null (never throws) for
// anything it cannot use, which is what sends the page to Iconify; and the page
// asks the snapshot before it asks Iconify.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { stripJs as strip } from '../helpers/strip-comments.js'
import { ICON_PACK_TIERS } from '../../src/data/iconPackTiers.js'
import { iconifyCredit } from '../../src/data/iconPackCredits.js'
import {
  COLLECTION_SNAPSHOT_PATH, collectionSnapshotUrl, fetchCollectionSnapshot, isCollectionAnswer,
} from '../../src/utils/iconCollectionSnapshot.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = path.join(ROOT, 'public', ...COLLECTION_SNAPSHOT_PATH.split('/').filter(Boolean))
// fluent-emoji is too large for the snapshot route and stays a live request.
const LIVE_ONLY = ['fluent-emoji']
// The animated sets are Pro only and listed through the server check, so their lists must
// never sit in public/ where anyone can read them.
const ANIMATED = Object.keys(ICON_PACK_TIERS).filter((p) => ICON_PACK_TIERS[p].animated)
const ICONIFY_PACKS = Object.keys(ICON_PACK_TIERS).filter((p) => p !== 'logodev' && !LIVE_ONLY.includes(p) && !ANIMATED.includes(p))

const answer = (body, init = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
  status: 200, headers: { 'content-type': 'application/json' }, ...init,
})

test('every Iconify pack the library offers has a committed snapshot the page can read', () => {
  assert.ok(ICONIFY_PACKS.length >= 20, `expected many packs; got ${ICONIFY_PACKS.length}`)
  for (const pack of ICONIFY_PACKS) {
    const file = path.join(DIR, `${pack}.json`)
    assert.ok(fs.existsSync(file), `${pack} has no snapshot at public${COLLECTION_SNAPSHOT_PATH}/${pack}.json: run node scripts/snapshot-icon-collections.mjs`)
    const d = JSON.parse(fs.readFileSync(file, 'utf8'))
    assert.equal(d.prefix, pack, `${pack}.json holds another pack's list`)
    assert.ok(isCollectionAnswer(d), `${pack}.json has neither uncategorized nor categories`)
    const names = [...(d.uncategorized || []), ...Object.values(d.categories || {}).flat()]
    assert.ok(names.length > 0, `${pack}.json lists no icons`)
    assert.ok(typeof d.title === 'string' && d.title, `${pack}.json has no title`)
  }
})

test('the live-only packs are still offered, and have no snapshot to go stale', () => {
  for (const pack of LIVE_ONLY) {
    assert.ok(pack in ICON_PACK_TIERS, `${pack} is no longer offered: drop it from LIVE_ONLY here and in the script`)
    assert.ok(!fs.existsSync(path.join(DIR, `${pack}.json`)), `${pack} has a snapshot: drop it from LIVE_ONLY here and in the script`)
  }
})

test('a Pro-only animated set has no public snapshot', () => {
  assert.ok(ANIMATED.length >= 3, `expected the animated sets to be flagged in ICON_PACK_TIERS; found ${ANIMATED.length}`)
  for (const pack of ANIMATED) {
    assert.ok(!fs.existsSync(path.join(DIR, `${pack}.json`)), `${pack} is Pro only: its list must not be served from public/`)
  }
})

test('no snapshot is left behind for a pack the library no longer offers', () => {
  const onDisk = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
  assert.deepEqual(onDisk, [...ICONIFY_PACKS].sort())
})

test('a snapshot still carries the licence the credit under the grid reads', () => {
  const lucide = JSON.parse(fs.readFileSync(path.join(DIR, 'lucide.json'), 'utf8'))
  const credit = iconifyCredit(lucide)
  assert.ok(credit?.spdx, 'iconifyCredit found no licence in the lucide snapshot')
})

test('the snapshot is requested same-origin, one file per pack', async () => {
  const seen = []
  const d = await fetchCollectionSnapshot('fa6-solid', {
    fetchImpl: async (url) => { seen.push(url); return answer({ prefix: 'fa6-solid', uncategorized: ['a'] }) },
  })
  assert.deepEqual(seen, ['/iconify/collections/fa6-solid.json'])
  assert.deepEqual(d.uncategorized, ['a'])
  assert.equal(collectionSnapshotUrl('a b'), '/iconify/collections/a%20b.json')
})

test('anything unusable returns null so the page asks Iconify instead', async () => {
  const cases = {
    'a pack added after the snapshot (404)': async () => answer({}, { status: 404 }),
    'the host answering an unknown path with the app page': async () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    'JSON that is not a pack list': async () => answer({ error: 'nope' }),
    'a list of the wrong shape': async () => answer([1, 2, 3]),
    'a network failure': async () => { throw new TypeError('Failed to fetch') },
    'a body cut off mid-way': async () => new Response('{"prefix":"x","uncateg', { status: 200 }),
  }
  for (const [label, fetchImpl] of Object.entries(cases)) {
    assert.equal(await fetchCollectionSnapshot('x', { fetchImpl }), null, label)
  }
})

test('a pack list with only categories is usable', () => {
  assert.equal(isCollectionAnswer({ categories: { A: ['a'] } }), true)
  assert.equal(isCollectionAnswer({ uncategorized: [] }), true)
  assert.equal(isCollectionAnswer(null), false)
  assert.equal(isCollectionAnswer({}), false)
})

test('the page asks the snapshot before Iconify, and still falls back to Iconify', () => {
  const src = strip(fs.readFileSync(path.join(ROOT, 'src/pages/IconLibrary.jsx'), 'utf8'))
  // The page builds its pack-list loaders with createCollectionLoader; the part
  // that decides where a list comes from is each one's fetchEntry. The public
  // loader is the one that reads the snapshot (the animated sets' loader asks the
  // server's Pro check instead), found by what it passes in, not by the name of
  // the constant it is assigned to, so a rename cannot make this vacuous or red.
  const loaders = [...src.matchAll(/createCollectionLoader\(\{[\s\S]*?\n\}\)/g)].map((m) => m[0])
  const publicLoaders = loaders.filter((l) => /fetchCollectionSnapshot\(/.test(l))
  assert.equal(publicLoaders.length, 1, `IconLibrary.jsx should build exactly one pack-list loader that reads the snapshot; found ${publicLoaders.length} of ${loaders.length}`)
  const body = publicLoaders[0]
  assert.match(body, /fetchEntry:/, 'the loader needs a fetchEntry: that is where a list comes from')
  const snap = body.indexOf('fetchCollectionSnapshot(pack)')
  const live = body.indexOf('fetchWithFallback(`/collection?prefix=')
  assert.ok(snap >= 0, 'the pack-list loader no longer reads the snapshot')
  assert.ok(live > snap, 'the live /collection request must come after the snapshot, as the fallback')
})
