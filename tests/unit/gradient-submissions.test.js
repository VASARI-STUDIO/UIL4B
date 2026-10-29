// The old browser-held gradient queue (`vs-gradient-submissions`), now a legacy
// key. Community submissions are account-connected: nothing writes this key any
// more, and what an earlier visit left in it moves to the signed-in account's
// review queue once. The contract these tests hold is that a person's work is
// never lost (the key goes only after every publish worked), never duplicated
// (ids already queued are skipped), and never changed by merely looking at it.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as mod from '../../src/utils/gradientSubmissions.js'
import { PostLimitError } from '../../src/utils/communityLimits.js'

const {
  GRADIENT_SUBMISSIONS_KEY,
  GRADIENT_SUBMISSIONS_MAX,
  migrateGradientSubmissions,
  readLegacyGradientSubmissions,
  sanitizeGradientSubmission,
} = mod

// A stand-in for localStorage that records every write and removal, so a test
// can say "the reader never wrote" rather than only "the value is the same".
function memoryStorage(seed) {
  const map = new Map()
  const calls = { set: 0, remove: 0 }
  if (seed !== undefined) map.set(GRADIENT_SUBMISSIONS_KEY, typeof seed === 'string' ? seed : JSON.stringify(seed))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { calls.set += 1; map.set(k, String(v)) },
    removeItem: (k) => { calls.remove += 1; map.delete(k) },
    calls,
    has: () => map.has(GRADIENT_SUBMISSIONS_KEY),
  }
}

const STOPS = [{ color: '#7C3AED', position: 0 }, { color: '#F59E0B', position: 100 }]
const draft = (over = {}) => ({ id: 'g1', name: 'Harbour Dusk', type: 'Linear', angle: 90, stops: STOPS, ...over })
const USER = { uid: 'u1', displayName: 'Dylan', email: 'd@example.com' }

/* ── the record itself ───────────────────────────────────────────────────── */

test('a valid legacy entry keeps its gradient and reads as pending', () => {
  const out = sanitizeGradientSubmission(draft())
  assert.equal(out.name, 'Harbour Dusk')
  assert.equal(out.type, 'Linear')
  assert.equal(out.angle, 90)
  assert.deepEqual(out.stops, STOPS)
  assert.equal(out.status, 'pending')
  assert.ok(out.submittedAt > 0)
})

test('a client can never mark its own submission approved', () => {
  // 'approved' is a reviewer's word and there is no reviewer on the client, so
  // it must be unreachable from here.
  for (const status of ['approved', 'published', 'live', 'PENDING', 42, null, undefined]) {
    assert.equal(sanitizeGradientSubmission(draft({ status })).status, 'pending',
      `status ${JSON.stringify(status)} must fall back to pending`)
  }
  assert.equal(sanitizeGradientSubmission(draft({ status: 'withdrawn' })).status, 'withdrawn')
})

test('anything that is not a gradient is dropped, never kept half-formed', () => {
  assert.equal(sanitizeGradientSubmission(null), null)
  assert.equal(sanitizeGradientSubmission('gradient'), null)
  assert.equal(sanitizeGradientSubmission([]), null)
  assert.equal(sanitizeGradientSubmission(draft({ stops: undefined })), null)
  assert.equal(sanitizeGradientSubmission(draft({ stops: [] })), null)
  assert.equal(sanitizeGradientSubmission(draft({ stops: [STOPS[0]] })), null, 'one stop is not a gradient')
  assert.equal(sanitizeGradientSubmission(draft({ stops: [{ color: 'red', position: 0 }, { color: 'blue', position: 100 }] })), null)
})

test('hostile or malformed fields are neutralised rather than rendered', () => {
  const out = sanitizeGradientSubmission(draft({
    name: '  <script>alert(1)</script>  ',
    author: 'x'.repeat(500),
    note: 'y'.repeat(500),
    type: 'Spiral',
    angle: 9999,
    stops: [{ color: '#7c3aed', position: -50 }, { color: '#F59E0B', position: 900 }],
  }))
  // Escaping is React's job; this layer's job is bounds and shape.
  assert.equal(out.name, '<script>alert(1)</script>', 'trimmed and length-capped, never executed as markup')
  assert.equal(out.author.length, 40)
  assert.equal(out.note.length, 200)
  assert.equal(out.type, 'Linear', 'an unknown gradient type falls back to a renderable one')
  assert.equal(out.angle, 360)
  assert.deepEqual(out.stops, [{ color: '#7C3AED', position: 0 }, { color: '#F59E0B', position: 100 }])
})

test('an entry with no name still reads as something', () => {
  const out = sanitizeGradientSubmission(draft({ name: '   ', author: '' }))
  assert.equal(out.name, 'Untitled gradient')
  assert.equal(out.author, 'Community member')
})

/* ── the surface: no writers left ───────────────────────────────────────── */

test('the browser-queue writers are gone', () => {
  for (const name of ['appendGradientSubmission', 'withdrawGradientSubmission', 'writeGradientSubmissions', 'readGradientSubmissions']) {
    assert.equal(name in mod, false, `${name} must not exist: nothing may write or re-write the legacy key`)
  }
})

/* ── the legacy reader ──────────────────────────────────────────────────── */

test('the reader returns the sanitised entries and never writes', () => {
  // The old reader wrote the cleaned list back on every read, so merely opening
  // the gallery could rewrite (and, on a quota error, lose) the key.
  const raw = [draft({ id: 'a', name: 'First', status: 'approved' }), 'rubbish', draft({ id: 'b', stops: [] })]
  const s = memoryStorage(raw)
  const before = JSON.stringify(raw)
  const list = readLegacyGradientSubmissions(s)
  assert.deepEqual(list.map(x => x.id), ['a'], 'the salvageable entry survives, the rubbish does not')
  assert.equal(list[0].status, 'pending', 'clamped on the way out')
  assert.equal(s.calls.set, 0, 'no setItem')
  assert.equal(s.calls.remove, 0, 'no removeItem')
  assert.equal(s.getItem(GRADIENT_SUBMISSIONS_KEY), before, 'the stored text is untouched')
})

test('a missing, corrupt or non-list key reads as empty without throwing', () => {
  assert.deepEqual(readLegacyGradientSubmissions(memoryStorage()), [])
  assert.deepEqual(readLegacyGradientSubmissions(memoryStorage('{not json')), [])
  assert.deepEqual(readLegacyGradientSubmissions(memoryStorage({ a: 1 })), [])
  assert.deepEqual(readLegacyGradientSubmissions(null), [], 'no storage at all')
  const throwing = { getItem: () => { throw new Error('SecurityError') } }
  assert.doesNotThrow(() => readLegacyGradientSubmissions(throwing))
})

test('the reader honours the old cap', () => {
  const many = Array.from({ length: GRADIENT_SUBMISSIONS_MAX + 15 }, (_, i) => draft({ id: `g${i}` }))
  assert.equal(readLegacyGradientSubmissions(memoryStorage(many)).length, GRADIENT_SUBMISSIONS_MAX)
})

/* ── the migration ──────────────────────────────────────────────────────── */

// publish() records what it was given and can be told to fail on certain names.
function fakeQueue({ existing = [], failOn = [], listFails = false } = {}) {
  const published = []
  let listed = 0
  return {
    published,
    get listed() { return listed },
    list: async (uid, kind) => {
      listed += 1
      if (listFails) throw new Error('permission-denied')
      assert.equal(uid, USER.uid)
      assert.equal(kind, 'gradient')
      return existing
    },
    publish: async (record) => {
      if (failOn.includes(record.name)) throw new Error('unavailable')
      published.push(record)
      return `doc${published.length}`
    },
  }
}

test('happy path: every entry is published to the account, then the key goes', async () => {
  const s = memoryStorage([draft({ id: 'b', name: 'Newer' }), draft({ id: 'a', name: 'Older' })])
  const q = fakeQueue()
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(out.published, 2)
  assert.equal(out.skipped, 0)
  assert.equal(out.failed, 0)
  assert.equal(s.has(), false, 'the key is removed once everything is safe')
  assert.deepEqual(q.published.map(r => r.name), ['Older', 'Newer'], 'oldest first, so the queue keeps the order they were made in')
})

test('a published record is a pending queue record carrying the local id', async () => {
  const s = memoryStorage([draft({ id: 'g77', name: 'Harbour Dusk', note: 'private note', author: 'Someone' })])
  const q = fakeQueue()
  await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  const [rec] = q.published
  assert.equal(rec.kind, 'gradient')
  assert.equal(rec.status, 'pending', 'a client can only ever queue pending')
  assert.equal(rec.localId, 'g77')
  assert.equal(rec.authorUid, USER.uid)
  assert.equal(rec.authorName, 'Dylan')
  assert.deepEqual(Object.keys(rec.payload).sort(), ['angle', 'stops', 'type'], 'only the gradient itself')
  assert.deepEqual(rec.payload.stops, STOPS)
  assert.ok(!JSON.stringify(rec).includes('d@example.com'), 'the email never goes to the queue')
  assert.ok(!('note' in rec) && !('note' in rec.payload), 'the old reviewer note is not carried over')
})

test('the listing runs first and a failure publishes nothing and keeps the key', async () => {
  const s = memoryStorage([draft({ id: 'a' }), draft({ id: 'b' })])
  const q = fakeQueue({ listFails: true })
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(q.listed, 1)
  assert.equal(q.published.length, 0, 'without the listing there is no telling what is already queued')
  assert.equal(out.published, 0)
  assert.equal(out.listFailed, true)
  assert.equal(s.has(), true, 'the key stays for the next run')
  assert.equal(s.calls.remove, 0)
})

test('a listing that is not a list is treated as a failed listing', async () => {
  const s = memoryStorage([draft()])
  const q = fakeQueue()
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: async () => undefined, publish: q.publish })
  assert.equal(out.listFailed, true)
  assert.equal(q.published.length, 0)
  assert.equal(s.has(), true)
})

test('a partial publish failure keeps the key and reports what failed', async () => {
  const s = memoryStorage([draft({ id: 'a', name: 'One' }), draft({ id: 'b', name: 'Two' }), draft({ id: 'c', name: 'Three' })])
  const q = fakeQueue({ failOn: ['Two'] })
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(out.published, 2)
  assert.equal(out.failed, 1)
  assert.equal(s.has(), true, 'one failure is enough to keep the whole key')
  assert.equal(s.calls.remove, 0)
})

test('a retry after a partial failure does not duplicate what already got through', async () => {
  const s = memoryStorage([draft({ id: 'a', name: 'One' }), draft({ id: 'b', name: 'Two' })])
  const first = fakeQueue({ failOn: ['Two'] })
  await migrateGradientSubmissions({ user: USER, storage: s, list: first.list, publish: first.publish })
  // The next session: the queue now holds the one that went through.
  const second = fakeQueue({ existing: first.published.map((r, i) => ({ id: `doc${i}`, ...r })) })
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: second.list, publish: second.publish })
  assert.deepEqual(second.published.map(r => r.localId), ['b'])
  assert.equal(out.published, 1)
  assert.equal(out.skipped, 1)
  assert.equal(s.has(), false)
})

test('entries already queued (same localId) are skipped, not published twice', async () => {
  // Old submissions were published with their local id, so they are already there.
  const s = memoryStorage([draft({ id: 'new1', name: 'New' }), draft({ id: 'old1', name: 'Old' })])
  const q = fakeQueue({ existing: [{ id: 'docX', localId: 'old1', status: 'approved' }] })
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.deepEqual(q.published.map(r => r.localId), ['new1'])
  assert.equal(out.published, 1)
  assert.equal(out.skipped, 1)
  assert.equal(out.failed, 0)
  assert.equal(s.has(), false, 'a skipped duplicate is not a failure, so the key still goes')
})

test('when everything is already queued, nothing is published and the key goes', async () => {
  const s = memoryStorage([draft({ id: 'a' }), draft({ id: 'b' })])
  const q = fakeQueue({ existing: [{ localId: 'a' }, { localId: 'b' }] })
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(q.published.length, 0)
  assert.equal(out.published, 0)
  assert.equal(out.skipped, 2)
  assert.equal(s.has(), false)
})

test('entries that sanitise to nothing are skipped, and do not block clearing the key', async () => {
  const s = memoryStorage([null, 'rubbish', draft({ id: 'x', stops: [] }), draft({ id: 'good', name: 'Good' })])
  const q = fakeQueue()
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.deepEqual(q.published.map(r => r.localId), ['good'])
  assert.equal(out.published, 1)
  assert.equal(out.skipped, 3)
  assert.equal(out.failed, 0)
  assert.equal(s.has(), false)
})

test('an entry the person had withdrawn is not published', async () => {
  const s = memoryStorage([draft({ id: 'w', status: 'withdrawn' }), draft({ id: 'p', name: 'Keep' })])
  const q = fakeQueue()
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.deepEqual(q.published.map(r => r.localId), ['p'])
  assert.equal(out.skipped, 1)
})

test('the same id twice in the key is published once', async () => {
  const s = memoryStorage([draft({ id: 'dup', name: 'A' }), draft({ id: 'dup', name: 'B' })])
  const q = fakeQueue()
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(q.published.length, 1)
  assert.equal(out.skipped, 1)
})

test('signed out, or with nothing readable, it touches nothing', async () => {
  const q = fakeQueue()
  const s = memoryStorage([draft()])
  const out = await migrateGradientSubmissions({ user: null, storage: s, list: q.list, publish: q.publish })
  assert.deepEqual([out.published, out.skipped, out.failed], [0, 0, 0])
  assert.equal(q.listed, 0, 'no listing without an account')
  assert.equal(s.has(), true)

  const corrupt = memoryStorage('{not json')
  await migrateGradientSubmissions({ user: USER, storage: corrupt, list: q.list, publish: q.publish })
  assert.equal(corrupt.has(), true, 'unreadable data is left alone, not destroyed')
  assert.equal(q.listed, 0)

  const none = memoryStorage()
  await migrateGradientSubmissions({ user: USER, storage: none, list: q.list, publish: q.publish })
  assert.equal(q.listed, 0, 'nothing stored, nothing to list')
})

test('an emptied list is cleared without a round trip', async () => {
  const s = memoryStorage([])
  const q = fakeQueue()
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(q.listed, 0)
  assert.equal(out.cleared, true)
  assert.equal(s.has(), false)
})

/* ── asked first, one document per entry, withdrawn stays withdrawn ─────── */

const { queueDocId, removeLegacyGradientSubmission, countLegacyGradientSubmissions,
  readMigrationDismissed, writeMigrationDismissed } = mod

// A stand-in for sessionStorage.
function sessionMemory() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), map }
}

test('an entry stored without an id gets the same id every time, from what the gradient is', () => {
  const a = sanitizeGradientSubmission(draft({ id: undefined }))
  const b = sanitizeGradientSubmission(draft({ id: undefined }))
  assert.equal(a.id, b.id, 'not a clock reading: two reads agree')
  assert.ok(!/^g\d{10,}$/.test(a.id), 'not Date.now()')
  const other = sanitizeGradientSubmission(draft({ id: undefined, angle: 91 }))
  assert.notEqual(a.id, other.id, 'a different gradient is a different entry')
  const renamed = sanitizeGradientSubmission(draft({ id: undefined, name: 'Other name' }))
  assert.notEqual(a.id, renamed.id)
})

test('the account document id is fixed by owner and entry, and is safe as an id', () => {
  assert.equal(queueDocId('u1', 'g77'), 'u1_g77')
  assert.equal(queueDocId('u1', 'g77'), queueDocId('u1', 'g77'))
  assert.notEqual(queueDocId('u1', 'g77'), queueDocId('u2', 'g77'))
  assert.ok(!queueDocId('u1', 'a/b c').includes('/'), 'Firestore ids may not hold a slash')
})

test('each entry is published at its fixed document id', async () => {
  const s = memoryStorage([draft({ id: 'g1', name: 'One' }), draft({ id: undefined, name: 'Two' })])
  const ids = []
  const q = fakeQueue()
  const publish = async (record, opts) => { ids.push(opts?.id); return q.publish(record) }
  await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish })
  const twoId = sanitizeGradientSubmission(draft({ id: undefined, name: 'Two' })).id
  assert.deepEqual(ids.sort(), [queueDocId('u1', 'g1'), queueDocId('u1', twoId)].sort())
})

test('a publish that finds the document already there counts as already published', async () => {
  // Two tabs, or a retry: the second write is refused by the rules, and the API
  // says created: false rather than throwing.
  const s = memoryStorage([draft({ id: 'a' }), draft({ id: 'b', name: 'Fresh' })])
  const out = await migrateGradientSubmissions({
    user: USER, storage: s,
    list: async () => [],
    publish: async (record) => (record.localId === 'a' ? { id: 'x', created: false } : { id: 'y', created: true }),
  })
  assert.equal(out.published, 1)
  assert.equal(out.skipped, 1)
  assert.equal(out.failed, 0)
  assert.equal(s.has(), false, 'already there is not a failure, so the key goes')
})

test('a document id already in the account listing is skipped without a write', async () => {
  const s = memoryStorage([draft({ id: 'a' })])
  const q = fakeQueue({ existing: [{ id: queueDocId('u1', 'a') }] })
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.equal(q.published.length, 0)
  assert.equal(out.skipped, 1)
})

test('withdrawing removes just that entry from the browser key, so it is never published again', async () => {
  const s = memoryStorage([draft({ id: 'keep', name: 'Keep' }), draft({ id: 'gone', name: 'Gone' })])
  assert.equal(removeLegacyGradientSubmission('gone', s), true)
  assert.deepEqual(readLegacyGradientSubmissions(s).map(x => x.id), ['keep'])
  const q = fakeQueue()
  await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: q.publish })
  assert.deepEqual(q.published.map(r => r.localId), ['keep'])
})

test('removing the last entry removes the key; an unknown id changes nothing', () => {
  const s = memoryStorage([draft({ id: 'only' })])
  assert.equal(removeLegacyGradientSubmission('nope', s), false)
  assert.equal(s.calls.set, 0)
  assert.equal(removeLegacyGradientSubmission('only', s), true)
  assert.equal(s.has(), false)
  assert.equal(removeLegacyGradientSubmission('only', s), false, 'nothing left to remove')
})

test('only waiting entries are counted for the question', () => {
  const s = memoryStorage([draft({ id: 'a' }), draft({ id: 'b', status: 'withdrawn' }), 'rubbish'])
  assert.equal(countLegacyGradientSubmissions(s), 1)
})

test('"Not mine" is remembered per account for the tab session', () => {
  const ss = sessionMemory()
  assert.equal(readMigrationDismissed('u1', ss), false)
  writeMigrationDismissed('u1', ss)
  assert.equal(readMigrationDismissed('u1', ss), true)
  assert.equal(readMigrationDismissed('u2', ss), false, 'another account on the same machine is still asked')
  assert.equal(readMigrationDismissed(null, ss), false)
})

test('the hook asks first: it counts and waits, and moves nothing on its own', async () => {
  const fs = await import('node:fs')
  const src = fs.readFileSync('src/hooks/useGradientSubmissionMigration.js', 'utf8')
  const effect = src.slice(src.indexOf('useEffect('), src.indexOf('const keep'))
  assert.ok(!effect.includes('migrateGradientSubmissions'), 'the mount effect never runs the migration')
  assert.match(src, /publish: publishToQueueOnce/)
})

/* ── the post limits ─────────────────────────────────────────────────────── */

test('a refusal by the post limits stops the run quietly: nothing failed, the key stays, and the next run carries on', async () => {
  const s = memoryStorage([draft({ id: 'a', name: 'One' }), draft({ id: 'b', name: 'Two' }), draft({ id: 'c', name: 'Three' })])
  const q = fakeQueue()
  let attempts = 0
  const limited = async (record, opts) => {
    attempts += 1
    if (attempts > 1) throw new PostLimitError('cooldown', 30_000)
    await q.publish(record)
    return { id: opts.id, created: true }
  }
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish: limited })
  assert.equal(out.published, 1, 'the first one got through')
  assert.equal(out.failed, 0, 'a limit is not a failure')
  assert.equal(out.limited, true)
  assert.equal(attempts, 2, 'it stops at the first refusal rather than asking for each of the rest')
  assert.equal(s.has(), true, 'the key stays for the next visit')
  assert.equal(s.calls.remove, 0)

  // The next visit, once the gap is over: the one that went through is not posted again.
  const next = fakeQueue({ existing: q.published.map((r, i) => ({ id: `doc${i}`, ...r })) })
  const again = await migrateGradientSubmissions({ user: USER, storage: s, list: next.list, publish: next.publish })
  assert.equal(again.limited, false)
  assert.equal(again.published, 2)
  assert.equal(again.skipped, 1)
  assert.equal(s.has(), false)
})

test('a refusal by the limits and a real failure in one run still reports the failure', async () => {
  const s = memoryStorage([draft({ id: 'a', name: 'One' }), draft({ id: 'b', name: 'Two' })])
  const q = fakeQueue()
  let attempts = 0
  const publish = async () => {
    attempts += 1
    if (attempts === 1) throw new Error('offline')
    throw new PostLimitError('daily', 3_600_000)
  }
  const out = await migrateGradientSubmissions({ user: USER, storage: s, list: q.list, publish })
  assert.equal(out.failed, 1)
  assert.equal(out.limited, true)
  assert.equal(s.has(), true)
})
