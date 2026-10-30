// The roadmap's pure rules (which tools are listed, the 90-day Shipped window, the
// order) and the vote writes, run against an in-memory stand-in for the Firestore
// namespace that toolVotesApi.js takes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTools } from '../../src/data/toolTree.js'
import { formatShipped, isRecentlyShipped, listTools, orderIds, stageOf } from '../../src/utils/roadmapItems.js'
import { VoteClosedError, classifyFailure, readCounts, readVoted, setVote } from '../../src/utils/toolVotesApi.js'

// ── isRecentlyShipped ───────────────────────────────────────────────────────
// 2026-08-01 -> 2026-10-30 is 31 + 30 + 29 = 90 days; the day before is 91.
const NOON_SYDNEY = new Date('2026-10-30T02:00:00Z') // 13:00 AEDT on 30 Oct

test('a tool shipped exactly 90 days ago is still on the Shipped list', () => {
  assert.equal(isRecentlyShipped('2026-08-01', NOON_SYDNEY), true)
})

test('a tool shipped 91 days ago has dropped off', () => {
  assert.equal(isRecentlyShipped('2026-07-31', NOON_SYDNEY), false)
})

test('a tool shipped today and one shipped yesterday are both inside the window', () => {
  assert.equal(isRecentlyShipped('2026-10-30', NOON_SYDNEY), true)
  assert.equal(isRecentlyShipped('2026-10-29', NOON_SYDNEY), true)
})

test('the day is counted in Sydney, not UTC: 91 days have passed in Sydney while UTC is still on day 90', () => {
  const sydneyAlreadyNextDay = new Date('2026-10-30T14:00:00Z') // 01:00 on 31 Oct in Sydney
  assert.equal(isRecentlyShipped('2026-08-01', sydneyAlreadyNextDay), false)
  const sydneyStillSameDay = new Date('2026-10-30T12:00:00Z') // 23:00 on 30 Oct in Sydney
  assert.equal(isRecentlyShipped('2026-08-01', sydneyStillSameDay), true)
})

test('a missing or malformed ship date is never recent', () => {
  for (const bad of [undefined, null, '', 'soon', '2026-8-1', '01/08/2026', 20260801]) {
    assert.equal(isRecentlyShipped(bad, NOON_SYDNEY), false, String(bad))
  }
})

// ── listTools / stageOf / formatShipped ─────────────────────────────────────

test('the open list is exactly the soon and beta tools createTools() returns, in tree order', () => {
  const tools = createTools()
  const expected = tools.filter((t) => t.soon || t.beta).map((t) => t.id)
  assert.ok(expected.length >= 2, 'no soon or beta tools: this would pass vacuously')
  assert.deepEqual(listTools(tools).open.map((t) => t.id), expected)
})

test('the roadmap list built from createTools() never includes a hidden tool', () => {
  const listed = new Set(createTools().map((t) => t.id))
  const hiddenIds = createTools({ includeHidden: true }).map((t) => t.id).filter((id) => !listed.has(id))
  assert.ok(hiddenIds.length > 0, 'no hidden tool in the tree: this would pass vacuously')
  const { open, shipped } = listTools(createTools(), { shipped: true, now: NOON_SYDNEY })
  for (const id of hiddenIds) assert.ok(![...open, ...shipped].some((t) => t.id === id), id)
})

const T = (id, flags = {}, extra = {}) => ({ id, label: id.toUpperCase(), route: `/create/${id}`, soon: false, beta: false, ...flags, ...extra })

test('Shipped lists only live tools inside the 90-day window, and only when asked for', () => {
  const tools = [
    T('workshop-one', { soon: true }),
    T('beta-one', { beta: true }),
    T('fresh', {}, { shipped: '2026-08-01' }),
    T('stale', {}, { shipped: '2026-07-31' }),
    T('old-live'),
  ]
  const wanted = listTools(tools, { shipped: true, now: NOON_SYDNEY })
  assert.deepEqual(wanted.shipped.map((t) => t.id), ['fresh'])
  assert.deepEqual(wanted.open.map((t) => t.id), ['workshop-one', 'beta-one'])
  assert.deepEqual(listTools(tools, { now: NOON_SYDNEY }).shipped, [], 'the /tools foot must not list Shipped')
})

test('a tool that is both flagged soon and given a ship date is still open, not shipped', () => {
  const { open, shipped } = listTools([T('odd', { soon: true }, { shipped: '2026-10-01' })], { shipped: true, now: NOON_SYDNEY })
  assert.deepEqual(open.map((t) => t.id), ['odd'])
  assert.deepEqual(shipped, [])
})

test('stages: soon is the workshop, beta is beta, anything else is live', () => {
  assert.equal(stageOf({ soon: true, beta: true }), 'workshop')
  assert.equal(stageOf({ beta: true }), 'beta')
  assert.equal(stageOf({}), 'live')
})

test('formatShipped writes the ship date as day, short month and year', () => {
  assert.equal(formatShipped('2026-10-20'), '20 Oct 2026')
  assert.equal(formatShipped('2027-01-05'), '5 Jan 2027')
})

// ── orderIds ────────────────────────────────────────────────────────────────
const row = (id, stage, tree) => ({ id, stage, tree })

test('rows sort by vote count, highest first', () => {
  const open = [row('a', 'beta', 0), row('b', 'beta', 1), row('c', 'beta', 2)]
  assert.deepEqual(orderIds(open, { a: 1, b: 9, c: 4 }), ['b', 'c', 'a'])
})

test('on equal counts a beta tool comes before a workshop tool, whatever their tree order', () => {
  const open = [row('w', 'workshop', 0), row('b', 'beta', 1)]
  assert.deepEqual(orderIds(open, { w: 3, b: 3 }), ['b', 'w'])
})

test('on equal counts and stage, tree order decides', () => {
  const open = [row('late', 'workshop', 5), row('early', 'workshop', 1), row('mid', 'workshop', 3)]
  assert.deepEqual(orderIds(open, { late: 2, early: 2, mid: 2 }), ['early', 'mid', 'late'])
})

test('a tool nobody has voted on counts as zero, so it sits below any voted tool', () => {
  const open = [row('none', 'beta', 0), row('one', 'workshop', 1)]
  assert.deepEqual(orderIds(open, { one: 1 }), ['one', 'none'])
  assert.deepEqual(orderIds(open, {}), ['none', 'one'], 'with no counts at all the stage and tree order apply')
})

test('count outranks stage: a workshop tool with more votes beats a beta tool with fewer', () => {
  const open = [row('b', 'beta', 0), row('w', 'workshop', 1)]
  assert.deepEqual(orderIds(open, { b: 1, w: 2 }), ['w', 'b'])
})

test('ordering does not reorder the caller\'s list, so an order kept at load stays valid', () => {
  const open = [row('a', 'beta', 0), row('b', 'beta', 1)]
  const before = open.map((t) => t.id)
  const first = orderIds(open, { a: 0, b: 5 })
  assert.deepEqual(open.map((t) => t.id), before)
  // A later count change only matters if the caller asks again; the first answer is a plain array it can keep.
  orderIds(open, { a: 9, b: 5 })
  assert.deepEqual(first, ['b', 'a'])
})

// ── toolVotesApi against a fake Firestore namespace ─────────────────────────
const SERVER_TS = { __serverTimestamp: true }

/** In-memory fs namespace with the calls toolVotesApi.js makes. `seed` maps 'a/b/c' paths to data. */
function fakeFs(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([k, v]) => [k, { ...v }]))
  const writes = []
  const snap = (path) => ({ id: path.split('/').pop(), exists: () => docs.has(path), data: () => ({ ...docs.get(path) }) })
  const fs = {
    db: { fake: true },
    doc: (_db, ...segments) => ({ path: segments.join('/') }),
    collection: (_db, name) => ({ path: name }),
    serverTimestamp: () => SERVER_TS,
    getDoc: async (ref) => snap(ref.path),
    getDocs: async (col) => {
      const ids = [...docs.keys()].filter((p) => p.startsWith(`${col.path}/`) && p.split('/').length === 2)
      return { forEach: (cb) => ids.forEach((p) => cb(snap(p))) }
    },
    runTransaction: async (_db, fn) => {
      const queued = []
      const tx = {
        get: async (ref) => snap(ref.path),
        set: (ref, data) => queued.push({ op: 'set', path: ref.path, data }),
        update: (ref, data) => queued.push({ op: 'update', path: ref.path, data }),
        delete: (ref) => queued.push({ op: 'delete', path: ref.path }),
      }
      const result = await fn(tx)
      for (const w of queued) {
        if (w.op === 'set') docs.set(w.path, { ...w.data })
        else if (w.op === 'update') docs.set(w.path, { ...docs.get(w.path), ...w.data })
        else docs.delete(w.path)
        writes.push(w)
      }
      return result
    },
  }
  return { fs, docs, writes }
}

test('the first vote on a tool creates its counter at 1, open, and the voter document stamped by the server', async () => {
  const { fs, docs, writes } = fakeFs()
  const next = await setVote(fs, 'u1', 'box-shadow', true)
  assert.equal(next, 1)
  assert.deepEqual(writes, [
    { op: 'set', path: 'toolVotes/box-shadow', data: { count: 1, open: true } },
    { op: 'set', path: 'toolVotes/box-shadow/voters/u1', data: { at: SERVER_TS } },
  ])
  assert.deepEqual(docs.get('toolVotes/box-shadow'), { count: 1, open: true })
})

test('a later vote updates the counter to n+1 and adds the voter document', async () => {
  const { fs, docs, writes } = fakeFs({ 'toolVotes/box-shadow': { count: 4, open: true } })
  const next = await setVote(fs, 'u2', 'box-shadow', true)
  assert.equal(next, 5)
  assert.deepEqual(writes, [
    { op: 'update', path: 'toolVotes/box-shadow', data: { count: 5 } },
    { op: 'set', path: 'toolVotes/box-shadow/voters/u2', data: { at: SERVER_TS } },
  ])
  assert.ok(docs.has('toolVotes/box-shadow/voters/u2'))
})

test('taking a vote back updates the counter to n-1 and deletes the voter document', async () => {
  const { fs, docs, writes } = fakeFs({
    'toolVotes/box-shadow': { count: 4, open: true },
    'toolVotes/box-shadow/voters/u1': { at: 'x' },
  })
  const next = await setVote(fs, 'u1', 'box-shadow', false)
  assert.equal(next, 3)
  assert.deepEqual(writes, [
    { op: 'update', path: 'toolVotes/box-shadow', data: { count: 3 } },
    { op: 'delete', path: 'toolVotes/box-shadow/voters/u1' },
  ])
  assert.ok(!docs.has('toolVotes/box-shadow/voters/u1'))
})

test('voting twice writes nothing the second time and returns the current count', async () => {
  const { fs, writes } = fakeFs({
    'toolVotes/box-shadow': { count: 4, open: true },
    'toolVotes/box-shadow/voters/u1': { at: 'x' },
  })
  assert.equal(await setVote(fs, 'u1', 'box-shadow', true), 4)
  assert.deepEqual(writes, [])
})

test('taking back a vote that is not there writes nothing, and never takes the count below zero', async () => {
  const none = fakeFs({ 'toolVotes/box-shadow': { count: 4, open: true } })
  assert.equal(await setVote(none.fs, 'u1', 'box-shadow', false), 4)
  assert.deepEqual(none.writes, [])
  const zero = fakeFs({ 'toolVotes/box-shadow': { count: 0, open: true }, 'toolVotes/box-shadow/voters/u1': { at: 'x' } })
  assert.equal(await setVote(zero.fs, 'u1', 'box-shadow', false), 0)
  assert.deepEqual(zero.writes, [])
  const missing = fakeFs()
  assert.equal(await setVote(missing.fs, 'u1', 'box-shadow', false), 0)
  assert.deepEqual(missing.writes, [])
})

test('a closed tool refuses both a vote and a take-back, and writes nothing', async () => {
  for (const want of [true, false]) {
    const { fs, writes } = fakeFs({
      'toolVotes/box-shadow': { count: 4, open: false },
      'toolVotes/box-shadow/voters/u1': { at: 'x' },
    })
    await assert.rejects(setVote(fs, 'u1', 'box-shadow', want), (err) => err instanceof VoteClosedError && err.code === 'closed')
    assert.deepEqual(writes, [], `want=${want}`)
  }
})

test('two accounts voting on one tool each add one', async () => {
  const { fs, docs } = fakeFs({ 'toolVotes/box-shadow': { count: 0, open: true } })
  await setVote(fs, 'u1', 'box-shadow', true)
  await setVote(fs, 'u2', 'box-shadow', true)
  assert.equal(docs.get('toolVotes/box-shadow').count, 2)
  assert.ok(docs.has('toolVotes/box-shadow/voters/u1') && docs.has('toolVotes/box-shadow/voters/u2'))
})

test('readCounts returns each counter, treats a missing open flag as open, and ignores voter documents', async () => {
  const { fs } = fakeFs({
    'toolVotes/a': { count: 3, open: true },
    'toolVotes/b': { count: 'junk' },
    'toolVotes/c': { count: 7, open: false },
    'toolVotes/a/voters/u1': { at: 'x' },
  })
  assert.deepEqual(await readCounts(fs), {
    a: { count: 3, open: true },
    b: { count: 0, open: true },
    c: { count: 7, open: false },
  })
})

test('readVoted says yes only for tools where this account has a voter document', async () => {
  const { fs } = fakeFs({ 'toolVotes/a/voters/u1': { at: 'x' }, 'toolVotes/b/voters/u2': { at: 'x' } })
  assert.deepEqual(await readVoted(fs, 'u1', ['a', 'b', 'c']), { a: true, b: false, c: false })
})

test('classifyFailure names a closed tool, an offline write, a refused write on a closed tool, and anything else as failed', async () => {
  const { fs } = fakeFs({ 'toolVotes/shut': { count: 1, open: false }, 'toolVotes/live': { count: 1, open: true } })
  assert.equal(await classifyFailure(fs, 'live', new VoteClosedError()), 'closed')
  assert.equal(await classifyFailure(fs, 'live', { code: 'unavailable' }), 'offline')
  assert.equal(await classifyFailure(fs, 'live', new Error('Client is offline')), 'offline')
  assert.equal(await classifyFailure(fs, 'shut', { code: 'permission-denied' }), 'closed')
  assert.equal(await classifyFailure(fs, 'live', { code: 'permission-denied' }), 'failed')
  assert.equal(await classifyFailure(fs, 'live', new Error('boom')), 'failed')
})
