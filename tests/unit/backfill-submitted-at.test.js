// scripts/backfill-submitted-at.mjs: the one-off that gives items queued before
// the community limits a `submittedAt`, so the queue ordered on it still shows
// them. These run the real function against an in-memory Firestore; nothing
// here touches Firebase.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { backfillSubmittedAt, parseCreatedAt } from '../../scripts/backfill-submitted-at.mjs'

const NOW = Date.parse('2026-10-29T00:00:00.000Z')

/** The slice of the Admin Firestore the script uses: where, orderBy, limit, startAfter, get, update. */
function fakeDb(collections, { failUpdate = [] } = {}) {
  const updates = []
  const store = new Map(Object.entries(collections).map(([name, docs]) => [name, new Map(Object.entries(docs))]))
  const snapshot = (name, id, data) => ({
    id,
    data: () => data,
    updateTime: `t:${name}/${id}`,
    ref: {
      update: async (patch, precondition) => {
        if (failUpdate.includes(id)) throw new Error(`update failed for ${id}`)
        updates.push({ collection: name, id, patch, precondition })
        Object.assign(data, patch)
      },
    },
  })
  const query = (name, state = {}) => ({
    where: (field, op, value) => query(name, { ...state, filter: { field, op, value } }),
    orderBy: () => query(name, state),
    limit: (n) => query(name, { ...state, max: n }),
    startAfter: (snap) => query(name, { ...state, after: snap.id }),
    get: async () => {
      let ids = [...(store.get(name) || new Map()).keys()].sort()
      const f = state.filter
      if (f) ids = ids.filter((id) => store.get(name).get(id)[f.field] === f.value)
      if (state.after) ids = ids.filter((id) => id > state.after)
      if (state.max) ids = ids.slice(0, state.max)
      return { docs: ids.map((id) => snapshot(name, id, store.get(name).get(id))) }
    },
  })
  return { collection: (name) => query(name), updates, store }
}

const stamp = (date) => ({ stamp: date.toISOString() })
const run = (db, opts = {}) => backfillSubmittedAt(db, { toStamp: stamp, now: () => NOW, ...opts })

const sample = () => ({
  'community-submissions': {
    a: { status: 'pending', createdAt: '2026-10-01T10:00:00.000Z' },
    b: { status: 'pending', createdAt: '2026-10-02T10:00:00.000Z', submittedAt: { stamp: 'already' } },
    c: { status: 'approved', createdAt: '2026-09-01T10:00:00.000Z' },
  },
  'community-prompts': {
    p: { status: 'pending', createdAt: '2026-10-03T10:00:00.000Z' },
  },
})

test('a dry run lists what it would set and writes nothing', async () => {
  const db = fakeDb(sample())
  const lines = []
  const out = await run(db, { log: (l) => lines.push(l) })
  assert.equal(out.missing, 2)
  assert.equal(out.updated, 0)
  assert.deepEqual(db.updates, [])
  assert.equal(lines.length, 2)
  assert.match(lines[0], /would set: community-submissions\/a/)
})

test('--write sets submittedAt from createdAt on pending items that lack it, and only those', async () => {
  const db = fakeDb(sample())
  const out = await run(db, { write: true })
  assert.equal(out.updated, 2)
  assert.deepEqual(db.updates.map((u) => `${u.collection}/${u.id}`), ['community-submissions/a', 'community-prompts/p'])
  assert.deepEqual(db.updates[0].patch, { submittedAt: { stamp: '2026-10-01T10:00:00.000Z' } })
  assert.deepEqual(db.updates[1].patch, { submittedAt: { stamp: '2026-10-03T10:00:00.000Z' } })
  assert.equal(db.store.get('community-submissions').get('b').submittedAt.stamp, 'already', 'an item that has one is left alone')
  assert.equal(db.store.get('community-submissions').get('c').submittedAt, undefined, 'an approved item is left alone by default')
})

test('--all-statuses also covers the items that were decided', async () => {
  const db = fakeDb(sample())
  const out = await run(db, { write: true, allStatuses: true })
  assert.equal(out.updated, 3)
  assert.equal(db.store.get('community-submissions').get('c').submittedAt.stamp, '2026-09-01T10:00:00.000Z')
})

test('a second run finds nothing left to do', async () => {
  const db = fakeDb(sample())
  await run(db, { write: true })
  const again = await run(db, { write: true })
  assert.equal(again.missing, 0)
  assert.equal(again.updated, 0)
})

test('each write only goes through if the document is unchanged since it was read', async () => {
  const db = fakeDb(sample())
  await run(db, { write: true })
  assert.deepEqual(db.updates[0].precondition, { lastUpdateTime: 't:community-submissions/a' })
})

test('a createdAt that does not parse is skipped and reported, and the run carries on', async () => {
  const db = fakeDb({
    'community-submissions': {
      bad: { status: 'pending', createdAt: 'yesterday-ish' },
      none: { status: 'pending' },
      empty: { status: 'pending', createdAt: '   ' },
      good: { status: 'pending', createdAt: '2026-10-01T10:00:00.000Z' },
    },
    'community-prompts': {},
  })
  const out = await run(db, { write: true })
  assert.deepEqual(out.skipped.map((s) => s.id).sort(), ['bad', 'empty', 'none'])
  assert.equal(out.skipped.find((s) => s.id === 'none').reason, 'no createdAt')
  assert.equal(out.skipped.find((s) => s.id === 'bad').reason, 'createdAt does not parse')
  assert.deepEqual(db.updates.map((u) => u.id), ['good'])
  assert.deepEqual(out.failed, [])
})

test('a createdAt in the future is capped at the time of the run', async () => {
  const db = fakeDb({
    'community-submissions': { spam: { status: 'pending', createdAt: '9999-12-31T00:00:00.000Z' } },
    'community-prompts': {},
  })
  const out = await run(db, { write: true })
  assert.equal(out.clamped, 1)
  assert.deepEqual(db.updates[0].patch, { submittedAt: { stamp: '2026-10-29T00:00:00.000Z' } })
})

test('one write failing does not stop the run, and it is reported for a retry', async () => {
  const db = fakeDb({
    'community-submissions': {
      a: { status: 'pending', createdAt: '2026-10-01T00:00:00.000Z' },
      b: { status: 'pending', createdAt: '2026-10-02T00:00:00.000Z' },
      c: { status: 'pending', createdAt: '2026-10-03T00:00:00.000Z' },
    },
    'community-prompts': {},
  }, { failUpdate: ['b'] })
  const out = await run(db, { write: true })
  assert.deepEqual(out.failed.map((f) => f.id), ['b'])
  assert.match(out.failed[0].error, /update failed for b/)
  assert.equal(out.updated, 2)
  assert.equal(db.store.get('community-submissions').get('b').submittedAt, undefined, 'the failed item is still missing it, so a second run finds it')
})

test('every page is walked, not just the first', async () => {
  const many = {}
  for (let i = 0; i < 650; i++) many[`d${String(i).padStart(4, '0')}`] = { status: 'pending', createdAt: '2026-10-01T00:00:00.000Z' }
  const db = fakeDb({ 'community-submissions': many, 'community-prompts': {} })
  const out = await run(db, { write: true })
  assert.equal(out.scanned, 650)
  assert.equal(out.updated, 650)
})

test('parseCreatedAt reads the client string and a stored timestamp, and nothing else', () => {
  assert.equal(parseCreatedAt('2026-10-01T10:00:00.000Z').toISOString(), '2026-10-01T10:00:00.000Z')
  assert.equal(parseCreatedAt({ toDate: () => new Date('2026-10-01T10:00:00.000Z') }).toISOString(), '2026-10-01T10:00:00.000Z')
  for (const bad of [undefined, null, '', 'nope', 12345, {}, { toDate: () => new Date('x') }]) {
    assert.equal(parseCreatedAt(bad), null, String(bad))
  }
})

test('the script writes nothing without --write, prints the project id before it acts, and exits non-zero on failures', () => {
  const src = stripComments(read('scripts/backfill-submitted-at.mjs'))
  assert.match(src, /process\.argv\.includes\('--write'\)/)
  assert.ok(!/process\.argv\.includes\('--apply'\)/.test(src))
  const projectAt = src.indexOf('Firebase project:')
  assert.ok(projectAt > 0, 'the project id must be printed')
  assert.ok(projectAt < src.indexOf('await backfillSubmittedAt(adminDb()'), 'before the backfill starts')
  assert.match(src, /process\.exitCode = 1/)
})
