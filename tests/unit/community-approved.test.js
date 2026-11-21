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

test('a community row is not added when the library already has that id', () => {
  const library = [{ id: 'c-g1' }, { id: 'static' }]
  const community = communityGradientRows([doc({ id: 'g1' }), doc({ id: 'g2' })])
  assert.deepEqual(newCommunityRows(library, community).map((r) => r.id), ['c-g2'])
  assert.equal(library.length, 2, 'library rows are not changed')
  assert.deepEqual(newCommunityRows(library, []), [])
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
  assert.doesNotMatch(fn.slice(0, fn.indexOf('\n}\n')), /where\('kind'/, 'kind is filtered client-side: no new index')
})

test('the approved-submissions hook reads only for a signed-in viewer', () => {
  const src = read('src/hooks/useApprovedSubmissions.js')
  assert.match(src, /useAuth/)
  assert.match(src, /listApproved\(/)
  assert.match(src, /if \(!uid\)/)
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

test('Your submissions drops approved items and keeps pending and rejected ones', () => {
  const grad = read('src/pages/GradientGallery.jsx')
  assert.match(grad, /s\.status !== 'withdrawn' && s\.status !== 'approved'/)
  const hub = read('src/components/community/useCommunityHub.js')
  assert.match(hub, /s\.status !== 'approved'/)
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
