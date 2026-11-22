// Approved community gradients and palettes reach the galleries.
//
// A reviewer approving a submission in Admin only flipped `status` on the queue
// document; nothing read approved documents back, so an approved gradient or
// palette never appeared in either library. These tests pin the read path: the
// pure rules (approvedSubmissions.js) by running them, and the Firestore query,
// the page wiring and the hub's palette handling by reading the source (the
// Firebase SDK cannot load under `node --test`).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  filterApproved, communityGradientRows, communityPaletteRows,
  newCommunityRows, withCommunityOpen, COMMUNITY_ID_PREFIX,
  createApprovedLoader, visibleRows, waitingRows, approvedRows,
} from '../../src/utils/approvedSubmissions.js'
import { filterNoun } from '../../src/utils/galleryFilterNoun.js'
import { paletteHaystack } from '../../src/utils/paletteSearch.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n')

const doc = (over) => ({
  id: 'd1', kind: 'gradient', status: 'approved', name: 'Dusk', authorName: 'Sam',
  createdAt: '2026-11-01T00:00:00.000Z',
  payload: { type: 'Linear', angle: 90, stops: [{ color: '#112233', position: 0 }, { color: '#ffeedd', position: 100 }] },
  ...over,
})
const pal = (over) => doc({
  id: 'p1', kind: 'palette', name: 'Harbour', payload: { colors: ['#102030', '#a0b0c0', '#ffffff'], url: 'https://example.com/x' }, ...over,
})

test('filterApproved keeps only approved documents of the asked kind, newest first', () => {
  const docs = [
    doc({ id: 'a', createdAt: '2026-11-01T00:00:00.000Z' }),
    doc({ id: 'b', createdAt: '2026-11-03T00:00:00.000Z' }),
    doc({ id: 'c', status: 'pending' }),
    doc({ id: 'd', status: 'rejected' }),
    pal({ id: 'e' }),
    null,
    'junk',
  ]
  assert.deepEqual(filterApproved(docs, { kind: 'gradient' }).map((d) => d.id), ['b', 'a'])
  assert.deepEqual(filterApproved(docs, { kind: 'palette' }).map((d) => d.id), ['e'])
  assert.equal(filterApproved(docs).length, 3, 'no kind means every approved document')
  assert.deepEqual(filterApproved(docs, { kind: 'gradient', max: 1 }).map((d) => d.id), ['b'])
  assert.deepEqual(filterApproved(undefined, { kind: 'gradient' }), [])
})

test('filterApproved returns plain copies, not the stored objects', () => {
  const src = doc({ id: 'a' })
  const [out] = filterApproved([src])
  assert.notEqual(out, src)
  assert.deepEqual(out, src)
})

test('an approved gradient becomes a library-shaped, open row', () => {
  const [row] = communityGradientRows([doc({ id: 'g1' })])
  assert.equal(row.id, `${COMMUNITY_ID_PREFIX}g1`)
  assert.equal(row.name, 'Dusk')
  assert.equal(row.type, 'Linear')
  assert.equal(row.angle, 90)
  assert.deepEqual(row.stops, [{ color: '#112233', position: 0 }, { color: '#FFEEDD', position: 100 }])
  assert.ok(Array.isArray(row.tags))
  assert.equal(row.community, true)
  assert.equal(row.locked, undefined, 'never tier-locked')
})

test('gradient rows skip pending documents, other kinds and malformed stops', () => {
  const rows = communityGradientRows([
    doc({ id: 'ok' }),
    doc({ id: 'pending', status: 'pending' }),
    pal({ id: 'pal' }),
    doc({ id: 'bad', payload: { type: 'Linear', angle: 0, stops: [{ color: 'red', position: 0 }] } }),
    doc({ id: 'ok' }),
  ])
  assert.deepEqual(rows.map((r) => r.id), ['c-ok'])
})

test('an approved palette becomes a library-shaped community row', () => {
  const [row] = communityPaletteRows([pal()])
  assert.equal(row.id, 'c-p1')
  assert.equal(row.kind, 'community')
  assert.deepEqual(row.colors, ['#102030', '#A0B0C0', '#FFFFFF'])
  assert.equal(row.url, 'https://example.com/x')
  assert.equal(row.community, true)
})

test('palette rows skip pending documents, gradients and palettes with under two colours', () => {
  const rows = communityPaletteRows([
    pal({ id: 'ok' }),
    pal({ id: 'pending', status: 'pending' }),
    doc({ id: 'grad' }),
    pal({ id: 'one', payload: { colors: ['#102030'] } }),
    pal({ id: 'pair', payload: { c1: '#102030', c2: '#ffffff' } }),
  ])
  assert.deepEqual(rows.map((r) => r.id), ['c-ok', 'c-pair'])
})

test('a community row is not added when the library already holds that content', () => {
  // Static rows have slug ids, never c-<docId>, so the match is on name plus stops.
  const community = communityGradientRows([doc({ id: 'g1', name: 'Dusk' }), doc({ id: 'g2', name: 'Other' })])
  const library = [
    { id: 'dusk', name: '  dusk ', stops: [{ color: '#112233', position: 0 }, { color: '#ffeedd', position: 100 }] },
    { id: 'static' },
  ]
  assert.deepEqual(newCommunityRows(library, community).map((r) => r.id), ['c-g2'])
  assert.equal(library.length, 2, 'library rows are not changed')
  assert.deepEqual(newCommunityRows(library, []), [])
})

test('a community palette matches a library palette by name and colours, not by name alone', () => {
  const community = communityPaletteRows([pal({ id: 'p1', name: 'Harbour' })])
  const same = [{ id: 'harbour', name: 'harbour', colors: ['#102030', '#a0b0c0', '#ffffff'] }]
  const otherColours = [{ id: 'harbour', name: 'Harbour', colors: ['#000000', '#a0b0c0', '#ffffff'] }]
  const stub = [{ id: 'harbour', name: 'Harbour' }]
  assert.deepEqual(newCommunityRows(same, community), [])
  assert.equal(newCommunityRows(otherColours, community).length, 1)
  assert.equal(newCommunityRows(stub, community).length, 1, 'a name-only stub is not a match')
  assert.equal(newCommunityRows([{ id: 'c-p1' }], community).length, 0, 'an equal id still counts')
})

test('community rows join the open list after the cap and leave the library counts alone', () => {
  const split = { open: [{ id: 'a' }], locked: [{ id: 'z' }], eligible: 1, remaining: 1 }
  const extra = [{ id: 'c-1', community: true }]
  const out = withCommunityOpen(split, extra)
  assert.deepEqual(out.open.map((r) => r.id), ['a', 'c-1'])
  assert.deepEqual(out.locked, split.locked)
  assert.equal(out.eligible, 1)
  assert.equal(out.remaining, 1)
  assert.equal(withCommunityOpen(split, []), split)
})

test('community palettes are searchable and named as their own group', () => {
  const [row] = communityPaletteRows([pal()])
  assert.match(paletteHaystack(row), /community/)
  assert.equal(filterNoun('palettes', { collection: 'community' }, 2), 'community palettes')
  assert.equal(filterNoun('palettes', { collection: 'community' }, 1), 'community palette')
})

test('listApproved reads approved documents newest first and keeps permission errors quiet', () => {
  const src = read('src/utils/communityQueueApi.js')
  const fn = src.slice(src.indexOf('export async function listApproved'))
  assert.match(fn, /where\('status', '==', 'approved'\)/)
  assert.match(fn, /orderBy\('createdAt', 'desc'\)/)
  assert.match(fn, /filterApproved\(/)
  assert.match(fn, /permission-denied/)
  assert.match(fn, /return \[\]/)
  assert.doesNotMatch(fn.slice(0, fn.indexOf('\n}\n')), /console\./, 'no console noise')
  assert.match(fn.slice(0, fn.indexOf('\n}\n')), /if \(k\) parts\.push\(where\('kind', '==', k\)\)/, 'each kind is its own query, with its own limit')
})

test('firestore.indexes.json has the (status, kind, createdAt) index the per-kind read needs', () => {
  const { indexes } = JSON.parse(read('firestore.indexes.json'))
  const want = ['status:ASCENDING', 'kind:ASCENDING', 'createdAt:DESCENDING']
  assert.ok(indexes.some((i) => i.collectionGroup === 'community-submissions'
    && i.fields.map((f) => `${f.fieldPath}:${f.order}`).join() === want.join()))
})

// The hook's loader is createApprovedLoader; the hook adds only React state around it.
const clock = () => { const c = { t: 0, now: () => c.t }; return c }

test('the loader reads for a signed-out visitor too', async () => {
  let reads = 0
  const load = createApprovedLoader({ list: async () => { reads += 1; return [doc({ id: 'a' })] } })
  assert.deepEqual((await load(null)).map((d) => d.id), ['a'])
  assert.equal(reads, 1)
})

test('a read the rules refuse arrives as [] and the loader passes it on', async () => {
  // listApproved answers permission-denied with [] (see the source check above).
  const load = createApprovedLoader({ list: async () => [] })
  assert.deepEqual(await load(null), [])
})

test('the loader turns any failed read into [] and does not keep the failure', async () => {
  let reads = 0
  const load = createApprovedLoader({ list: async () => { reads += 1; if (reads === 1) throw new Error('offline'); return [doc({ id: 'a' })] } })
  assert.deepEqual(await load('u1'), [])
  assert.deepEqual((await load('u1')).map((d) => d.id), ['a'], 'the next call reads again')
  assert.equal(reads, 2)
})

test('the loader serves the same account from its cache, then re-reads after the keep time', async () => {
  const c = clock()
  let reads = 0
  const load = createApprovedLoader({ list: async () => { reads += 1; return [] }, keepMs: 1000, now: c.now })
  await load('u1'); await load('u1')
  assert.equal(reads, 1, 'second call is a cache hit')
  c.t = 999
  await load('u1')
  assert.equal(reads, 1)
  c.t = 1000
  await load('u1')
  assert.equal(reads, 2, 'kept only for keepMs')
})

test('the loader re-reads on a sign-in, a sign-out or an account switch', async () => {
  let reads = 0
  const load = createApprovedLoader({ list: async () => { reads += 1; return [] } })
  await load(null)
  await load('u1')
  assert.equal(reads, 2, 'sign-in')
  await load('u2')
  assert.equal(reads, 3, 'switch account')
  await load(null)
  assert.equal(reads, 4, 'sign-out')
  await load(null)
  assert.equal(reads, 4, 'same key again is a hit')
})

test('the hook is wired to the loader and skips the read when signed out', () => {
  const src = read('src/hooks/useApprovedSubmissions.js')
  assert.match(src, /createApprovedLoader\(/)
  assert.match(src, /kinds: \['gradient', 'palette'\]/)
  assert.match(src, /if \(key === 'signed-out'\) return undefined/)
  assert.match(src, /load\(key\)/)
})

test('both galleries merge the approved rows, de-duplicated, outside the cap', () => {
  const grad = read('src/pages/GradientGallery.jsx')
  assert.match(grad, /useApprovedSubmissions\('gradient'\)/)
  assert.match(grad, /newCommunityRows\(rows, communityGradientRows\(approved\)\)/)
  assert.match(grad, /withCommunityOpen\(splitLockedLibrary\(/)

  const pals = read('src/pages/PaletteGallery.jsx')
  assert.match(pals, /useApprovedSubmissions\('palette'\)/)
  assert.match(pals, /newCommunityRows\(rows, communityPaletteRows\(approved\)\)/)
  assert.match(pals, /withCommunityOpen\(splitLockedLibrary\(/)
  assert.match(pals, /kind === 'community'/)
})

test('the hub keeps approved work out of Your submissions and lists it under Made', () => {
  const grad = read('src/pages/GradientGallery.jsx')
  assert.match(grad, /s\.status !== 'withdrawn' && s\.status !== 'approved'/)
  const hub = read('src/components/community/useCommunityHub.js')
  assert.match(hub, /waitingRows\(\[/)
  assert.match(hub, /approvedRows\(\[/)
})

test('the hub filters: visibleRows drops only hidden, approvedRows keeps only approved and not hidden', () => {
  const rows = [
    { id: 'a', status: 'approved' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'rejected' },
    { id: 'd', status: 'approved' }, null,
  ]
  const hidden = new Set(['d'])
  assert.deepEqual(visibleRows(rows, hidden).map((r) => r.id), ['a', 'b', 'c'])
  assert.deepEqual(approvedRows(rows, hidden).map((r) => r.id), ['a'])
  assert.deepEqual(visibleRows(rows).map((r) => r.id), ['a', 'b', 'c', 'd'], 'no hidden set')
  assert.deepEqual(approvedRows(undefined, hidden), [])
})

test('the hub filters: waitingRows drops hidden and approved rows, keeps pending, rejected and local', () => {
  const rows = [
    { id: 'a', status: 'approved' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'rejected' },
    { id: 'd', status: 'pending' }, { id: 'e', synced: false }, null,
  ]
  assert.deepEqual(waitingRows(rows, new Set(['d'])).map((r) => r.id), ['b', 'c', 'e'])
  assert.deepEqual(waitingRows(rows).map((r) => r.id), ['b', 'c', 'd', 'e'], 'no hidden set')
  assert.deepEqual(waitingRows(undefined), [])
})

test('the hub lists palette submissions so a sent palette no longer reads Not sent', () => {
  const hub = read('src/components/community/useCommunityHub.js')
  assert.match(hub, /listMySubmissions\(uid, 'palette'\)/)
  assert.match(hub, /listsRead\.palette/)
  assert.match(hub, /mergeSubmissions\(\[\.\.\.designServer, \.\.\.paletteServer\], designLocal\)/)
})

test('withdrawing a palette deletes its server document when it has one', () => {
  const hub = read('src/components/community/useCommunityHub.js')
  assert.match(hub, /if \(row\.docId\) await deleteSubmission\(row\.docId\)/)
  assert.match(hub, /setPaletteServer\(\(prev\) => prev\.filter\(\(s\) => s\.id !== row\.id\)\)/)
})

test('the profile draws a palette row as a colour strip and names its kind', () => {
  const src = read('src/pages/CommunityProfile.jsx')
  assert.match(src, /palette: 'Palette'/)
  assert.match(src, /row\.kind === 'design' \|\| row\.kind === 'palette'/)
})

test('a community tile names its maker in the meta line; a library tile does not', async () => {
  const { gradientMeta, paletteMeta, communityBy } = await import('../../src/utils/galleryMeta.js')
  const [g] = communityGradientRows([{
    id: 'g1', kind: 'gradient', status: 'approved', name: 'Harbour Dusk', authorName: 'Freya Free',
    payload: { type: 'linear', angle: 135, stops: [{ color: '#1E3A8A', position: 0 }, { color: '#F97316', position: 100 }] },
  }])
  assert.equal(gradientMeta(g), 'By Freya Free · 2 stops')
  assert.equal(gradientMeta({ type: 'Linear', angle: 135, stops: [{}, {}] }), 'Linear 135° · 2 stops')
  const [p] = communityPaletteRows([{ id: 'p1', kind: 'palette', status: 'approved', name: 'Tidepool', authorName: '', payload: { colors: ['#0F766E', '#14B8A6'] } }])
  assert.equal(paletteMeta(p.colors.length, communityBy(p)), 'By Community member · 2 colours')
  assert.equal(communityBy({ id: 'x' }), null)
})
