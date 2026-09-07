// CROSS-DEVICE PROJECT SYNC — the merge, the ceiling, the migration, and the
// two ways a sync used to fail without anybody being told.
//
// These exist because none of this could be tested at all until it moved out of
// ProjectContext.jsx: the rules were interleaved with React state, a router and
// the Firebase SDK, so the 2026-09-06 review found four data-integrity defects
// in code that a green suite had been running over for months.
//
// ── WHAT IS FAKED, AND WHAT IS NOT ──────────────────────────────────────────
//
// `fakeFirestore()` below is a Map with the six methods src/ actually calls on
// the broker (utils/firebaseAccess). It is NOT a Firestore emulator and does not
// pretend to be — the rules are proved against the real emulator in
// tests/rules/. What it gives that neither the emulator nor the browser suite
// can is a WRITE THAT FAILS ON DEMAND, at a named path, with a named error code.
// Every "the user is told" assertion in this file depends on that, and the
// signed-in browser double (tests/user-sim/fixtures) cannot express it: a write
// through the double always succeeds.
//
// ── POSITIVE CONTROLS ───────────────────────────────────────────────────────
//
// "No project was lost" is trivially true of a merge that was never given one,
// and "the write was refused" is trivially true of a writer that never wrote. So
// each of those assertions is paired with its opposite in the same test: the
// same call, one input changed, must produce the other answer.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newerSide, mergeProjects, mergeTombstones, pruneTombstones, projectListsEqual,
  normaliseTombstones, payloadBytes, syncFailureMessage, classifyError,
  readRemoteProjects, writeRemoteProjects, migrateToPerProject,
  DOC_BYTE_CEILING, DOC_BYTE_BUDGET, TOMBSTONE_TTL_MS,
  SYNC_SCHEMA_VERSION_SINGLE, SYNC_SCHEMA_VERSION_PER_PROJECT,
  PER_PROJECT_SYNC_ENABLED, shouldApplyRemote,
} from '../../src/utils/projectSync.js'

const UID = 'uid-alice'
const LEGACY = `users/${UID}/sync/projects`
const PER = `users/${UID}/projects`

/* ── A Firestore that can be made to fail ─────────────────────────────────── */

function fakeFirestore(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([k, v]) => [k, structuredClone(v)]))
  /** path substring -> error to throw. Set by a test to break one write. */
  const failures = new Map()
  const calls = { getDoc: 0, getDocs: 0, setDoc: 0 }

  const check = (path) => {
    for (const [pattern, error] of failures) {
      if (path.includes(pattern)) throw error
    }
  }
  const ref = (path) => ({ __path: path, id: path.slice(path.lastIndexOf('/') + 1) })

  const fs = {
    db: { __fake: true },
    doc: (_db, ...segments) => ref(segments.join('/')),
    collection: (_db, ...segments) => ref(segments.join('/')),
    async getDoc(r) {
      calls.getDoc += 1
      check(r.__path)
      const data = docs.get(r.__path)
      return {
        id: r.id,
        exists: () => data !== undefined,
        data: () => (data === undefined ? undefined : structuredClone(data)),
      }
    },
    async getDocs(r) {
      calls.getDocs += 1
      check(r.__path)
      const prefix = `${r.__path}/`
      const rows = []
      for (const [path, data] of docs) {
        if (!path.startsWith(prefix)) continue
        if (path.slice(prefix.length).includes('/')) continue
        rows.push({
          id: path.slice(prefix.length),
          data: () => structuredClone(data),
        })
      }
      return { docs: rows, size: rows.length, empty: rows.length === 0, forEach: (fn) => rows.forEach(fn) }
    },
    async setDoc(r, data, options) {
      calls.setDoc += 1
      check(r.__path)
      const prev = options?.merge ? docs.get(r.__path) || {} : {}
      docs.set(r.__path, structuredClone({ ...prev, ...data }))
    },
  }
  return { fs, docs, failures, calls, snapshot: () => JSON.stringify([...docs].sort()) }
}

function firebaseError(code) {
  const e = new Error(`Firebase: Error (${code}).`)
  e.code = code
  e.name = 'FirebaseError'
  return e
}

/* ── Project shapes ───────────────────────────────────────────────────────── */

function project(id, updatedAt, extra = {}) {
  return {
    id,
    name: `Project ${id}`,
    design: { palette: { colors: ['#000'] } },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    ...extra,
  }
}

/** A project carrying a brand logo at brandLogo.js's 32 KB cap — #392's field. */
function logoProject(id, updatedAt) {
  const p = project(id, updatedAt)
  p.design.brandLogo = `data:image/png;base64,${'A'.repeat(32 * 1024)}`
  return p
}

/* Three moments a few hours apart, anchored to the real clock rather than to a
 * literal date. The literals were the first draft and they were WRONG in a way
 * that mattered: pruneTombstones() drops anything past TOMBSTONE_TTL_MS, so a
 * hard-coded 2026-03-01 tombstone silently vanished six months later and the
 * delete-propagation tests started failing on a calendar rather than on a
 * change. A relative anchor keeps the tombstone tests testing tombstones. */
const NOW = Date.now()
const T = {
  early: new Date(NOW - 3 * 3600_000).toISOString(),
  mid: new Date(NOW - 2 * 3600_000).toISOString(),
  late: new Date(NOW - 1 * 3600_000).toISOString(),
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. WHICH SIDE IS NEWER
   ═══════════════════════════════════════════════════════════════════════════ */

test('newerSide names the newer of two timestamps, and refuses to guess', () => {
  assert.equal(newerSide(T.early, T.late), 'remote')
  assert.equal(newerSide(T.late, T.early), 'local')
  assert.equal(newerSide(T.mid, T.mid), 'equal')
  // An unparseable timestamp loses to a real one rather than winning by
  // accident — Date.parse('') is NaN, and NaN > anything is false, which is how
  // a corrupt record could otherwise have silently held its ground forever.
  assert.equal(newerSide('nonsense', T.mid), 'remote')
  assert.equal(newerSide(T.mid, undefined), 'local')
  // Two unknowns keep local. Never a coin toss.
  assert.equal(newerSide(undefined, null), 'equal')
})

/* ═══════════════════════════════════════════════════════════════════════════
   2. THE MERGE — nothing is lost, and every choice is reported
   ═══════════════════════════════════════════════════════════════════════════ */

test('a project that exists on only one device survives the merge', () => {
  const merged = mergeProjects([project('a', T.mid)], [project('b', T.mid)])
  assert.deepEqual(merged.list.map((p) => p.id).sort(), ['a', 'b'])
  // POSITIVE CONTROL for every "nothing was lost" claim below: the assertion
  // above is only meaningful because this merge really did carry two inputs.
  assert.equal(mergeProjects([], []).list.length, 0)
})

test('the newer copy of a project wins, and the swap is REPORTED', () => {
  const local = [project('a', T.early, { name: 'Yesterday' })]
  const remote = [project('a', T.late, { name: 'Today' })]

  const merged = mergeProjects(local, remote)
  assert.equal(merged.list.length, 1)
  assert.equal(merged.list[0].name, 'Today', 'the newer side must be the one kept')
  assert.deepEqual(merged.replaced.map((r) => r.id), ['a'],
    'and the user has to be told their screen changed under them')

  // The other direction, same call: local newer, remote discarded, NOT reported
  // as a change to the user, because nothing on their screen moved.
  const back = mergeProjects(remote, local)
  assert.equal(back.list[0].name, 'Today')
  assert.deepEqual(back.replaced, [])
})

test('equal timestamps keep the local copy and report no conflict', () => {
  const merged = mergeProjects(
    [project('a', T.mid, { name: 'Mine' })],
    [project('a', T.mid, { name: 'Theirs' })],
  )
  assert.equal(merged.list[0].name, 'Mine')
  assert.deepEqual(merged.replaced, [])
})

test('projectListsEqual sees a changed updatedAt, not just a changed length', () => {
  const a = [project('a', T.early)]
  assert.equal(projectListsEqual(a, [project('a', T.early)]), true)
  assert.equal(projectListsEqual(a, [project('a', T.late)]), false)
  assert.equal(projectListsEqual(a, []), false)
})

/* ═══════════════════════════════════════════════════════════════════════════
   3. DELETES PROPAGATE AS DELETES
   ═══════════════════════════════════════════════════════════════════════════ */

test('a project deleted on another device is removed here, and said so', () => {
  const local = [project('a', T.early), project('b', T.early)]

  // POSITIVE CONTROL FIRST: with no tombstone, the same merge keeps both. This
  // is the v1 behaviour the review recorded — deletes never propagated and the
  // next pull resurrected them.
  const without = mergeProjects(local, local)
  assert.deepEqual(without.list.map((p) => p.id).sort(), ['a', 'b'])
  assert.deepEqual(without.removed, [])

  const merged = mergeProjects(local, local, {
    remoteTombstones: { a: T.mid },
  })
  assert.deepEqual(merged.list.map((p) => p.id), ['b'], 'the delete must propagate')
  assert.deepEqual(merged.removed.map((r) => r.id), ['a'], 'and be reported')
  assert.equal(merged.tombstones.a, T.mid, 'and be remembered, or it un-deletes on the next pull')
})

test('a project edited AFTER it was deleted elsewhere survives, and its tombstone goes', () => {
  // Resurrecting work beats destroying it. The edit is a deliberate act on a
  // project the user still had in front of them.
  const merged = mergeProjects([project('a', T.late)], [], {
    remoteTombstones: { a: T.mid },
  })
  assert.deepEqual(merged.list.map((p) => p.id), ['a'])
  assert.equal(merged.tombstones.a, undefined,
    'the tombstone must go too, or the next device deletes it all over again')
  assert.deepEqual(merged.removed, [])
})

test('two devices deleting the same project agree on the later delete', () => {
  assert.deepEqual(mergeTombstones({ a: T.early }, { a: T.late }), { a: T.late })
  assert.deepEqual(mergeTombstones({ a: T.late }, { a: T.early }), { a: T.late })
  assert.deepEqual(mergeTombstones({ a: T.early }, { b: T.late }), { a: T.early, b: T.late })
})

test('a tombstone map only ever holds ids mapped to real timestamps', () => {
  assert.deepEqual(normaliseTombstones({ a: T.mid, b: 'not a date', c: 7, d: null }), { a: T.mid })
  assert.deepEqual(normaliseTombstones(['a']), {})
  assert.deepEqual(normaliseTombstones(null), {})
})

test('tombstones are pruned past their TTL so the map cannot grow forever', () => {
  const now = Date.parse('2026-09-07T00:00:00.000Z')
  const fresh = new Date(now - 1000).toISOString()
  const ancient = new Date(now - TOMBSTONE_TTL_MS - 1000).toISOString()
  const pruned = pruneTombstones({ keep: fresh, drop: ancient }, now)
  assert.deepEqual(Object.keys(pruned), ['keep'])
  // The cost, stated: a device offline longer than the TTL re-adds the project.
  // Re-adding a project beats deleting one, which is why the TTL is six months.
  const stillThere = pruneTombstones({ drop: ancient }, now - TOMBSTONE_TTL_MS)
  assert.deepEqual(Object.keys(stillThere), ['drop'])
})

/* ═══════════════════════════════════════════════════════════════════════════
   4. THE CEILING — the P1, and the arithmetic the review measured
   ═══════════════════════════════════════════════════════════════════════════ */

test('the review’s arithmetic holds: about thirty logo projects fill one document', () => {
  // The claim being checked is the review's own: "a project carrying a brand
  // logo is capped at 32 KB by brandLogo.js … so roughly thirty logo projects
  // fill the document". If that stops being true — because the ceiling moved,
  // or because a project grew a second large field — the P1 changes shape and
  // this test is where it is supposed to be noticed.
  const empty = payloadBytes(project('a', T.mid))
  assert.ok(empty < 1500,
    `an empty project is small (${empty} B for this synthetic one; the review measured 684 B for a real default project, which carries the whole DEFAULT_DESIGN)`)

  const withLogo = payloadBytes(logoProject('a', T.mid))
  assert.ok(withLogo > 32 * 1024, `a logo project carries its 32 KB (measured ${withLogo} B)`)

  const firstCountOver = (limit) => {
    for (let n = 1; n <= 200; n += 1) {
      const list = Array.from({ length: n }, (_, i) => logoProject(`p${i}`, T.mid))
      if (payloadBytes({ list }) > limit) return n
    }
    return Infinity
  }

  const ceilingAt = firstCountOver(DOC_BYTE_CEILING)
  assert.ok(ceilingAt >= 25 && ceilingAt <= 40,
    `the review said about thirty logo projects fill the 1 MiB document; measured ${ceilingAt}`)

  // POSITIVE CONTROL for the search itself: one project is nowhere near it, so
  // `ceilingAt` is a real crossing and not the loop's first iteration.
  assert.ok(payloadBytes({ list: [logoProject('a', T.mid)] }) < DOC_BYTE_CEILING)

  const budgetAt = firstCountOver(DOC_BYTE_BUDGET)
  assert.ok(budgetAt < ceilingAt,
    `we must refuse (at ${budgetAt}) BEFORE Firestore rejects (at ${ceilingAt}) — a refusal we can explain beats one we cannot see`)
})

test('a payload over budget is REFUSED, not sent and swallowed', async () => {
  const { fs, docs, calls } = fakeFirestore()
  const tooMany = Array.from({ length: 40 }, (_, i) => logoProject(`p${i}`, T.mid))

  const result = await writeRemoteProjects(fs, UID, { list: tooMany, perProject: false })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'too-large')
  assert.ok(result.bytes > DOC_BYTE_BUDGET)
  assert.equal(calls.setDoc, 0, 'nothing may be sent that we already know will be rejected')
  assert.equal(docs.size, 0)

  // POSITIVE CONTROL. The same call with a list that fits DOES write — so the
  // refusal above is the budget talking, not a writer that never worked.
  const ok = await writeRemoteProjects(fs, UID, { list: [project('a', T.mid)], perProject: false })
  assert.equal(ok.ok, true)
  assert.equal(calls.setDoc, 1)
  assert.equal(docs.get(LEGACY).list.length, 1)
})

test('one document per project puts the same forty logo projects safely away', async () => {
  const { fs, docs } = fakeFirestore()
  const forty = Array.from({ length: 40 }, (_, i) => logoProject(`p${i}`, T.mid))

  const result = await writeRemoteProjects(fs, UID, { list: forty, perProject: true, now: 1 })
  assert.equal(result.ok, true, 'the shape that fails at thirty must succeed at forty')
  assert.equal(result.written, 40)

  for (const p of forty) {
    const stored = docs.get(`${PER}/${p.id}`)
    assert.ok(stored, `${p.id} must have its own document`)
    assert.ok(payloadBytes(stored) < DOC_BYTE_CEILING, 'and each one is under the ceiling')
  }

  // The index is what replaces the list, and it is the thing that must stay
  // small no matter how large a logo gets.
  const index = docs.get(LEGACY)
  assert.equal(index.v, SYNC_SCHEMA_VERSION_PER_PROJECT)
  assert.equal(index.index.length, 40)
  const perProjectBytes = payloadBytes(index) / 40
  assert.ok(perProjectBytes < 60,
    `the index costs ~${Math.round(perProjectBytes)} B per project, so the ceiling stops being a function of logo size`)
})

/* ═══════════════════════════════════════════════════════════════════════════
   5. A FAILED SYNC SAYS SO
   ═══════════════════════════════════════════════════════════════════════════ */

test('a refused write comes back as a reason instead of an empty catch', async () => {
  const { fs, docs } = fakeFirestore()
  const broken = fakeFirestore()
  broken.failures.set('sync/projects', firebaseError('permission-denied'))

  const result = await writeRemoteProjects(broken.fs, UID, { list: [project('a', T.mid)], perProject: false })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'permission-denied')
  assert.ok(result.error, 'the original error is carried, so it can be logged')
  assert.equal(broken.docs.size, 0)

  // POSITIVE CONTROL: an unbroken writer on the same input reports success.
  const fine = await writeRemoteProjects(fs, UID, { list: [project('a', T.mid)], perProject: false })
  assert.equal(fine.ok, true)
  assert.equal(docs.size, 1)
})

test('every failure sentence tells the user their work is safe, and names the cause', () => {
  for (const reason of ['too-large', 'permission-denied', 'offline', 'unknown']) {
    const message = syncFailureMessage(reason, '940 KB of a 1 MB limit')
    assert.match(message, /saved on this device/i,
      `"${reason}" must say the work is not lost before anything else`)
    assert.ok(message.length > 40, 'and must be a sentence, not a code')
  }
  // The four are actually different sentences — a generic message for all of
  // them would be the same silence in a nicer font.
  const said = new Set(['too-large', 'permission-denied', 'offline', 'unknown']
    .map((r) => syncFailureMessage(r, 'x')))
  assert.equal(said.size, 4)
  assert.match(syncFailureMessage('too-large', '940 KB of a 1 MB limit'), /940 KB/)
})

test('Firebase error codes are classified into those four causes', () => {
  assert.equal(classifyError(firebaseError('permission-denied')), 'permission-denied')
  assert.equal(classifyError(firebaseError('unauthenticated')), 'permission-denied')
  assert.equal(classifyError(firebaseError('unavailable')), 'offline')
  assert.equal(classifyError(firebaseError('invalid-argument')), 'too-large')
  assert.equal(classifyError(new Error('boom')), 'unknown')
  assert.equal(classifyError(undefined), 'unknown')
})

/* ═══════════════════════════════════════════════════════════════════════════
   6. READING BOTH SHAPES
   ═══════════════════════════════════════════════════════════════════════════ */

test('the v1 document is read back as a list plus its deletes', async () => {
  const { fs } = fakeFirestore({
    [LEGACY]: { list: [project('a', T.mid)], deleted: { z: T.early }, v: 1 },
  })
  const read = await readRemoteProjects(fs, UID, { perProject: false })
  assert.equal(read.found, true)
  assert.deepEqual(read.list.map((p) => p.id), ['a'])
  assert.deepEqual(read.tombstones, { z: T.early })
  assert.equal(read.version, SYNC_SCHEMA_VERSION_SINGLE)
})

test('an account that has never synced reads as empty rather than as an error', async () => {
  const { fs } = fakeFirestore()
  const read = await readRemoteProjects(fs, UID, { perProject: false })
  assert.deepEqual(read.list, [])
  assert.equal(read.found, false)
})

test('during the rollout, a device on the old shape is not dropped on the floor', async () => {
  // The failure this guards: a v2 reader that only listed the collection would
  // lose every project pushed by a device that had not migrated yet.
  const { fs } = fakeFirestore({
    [LEGACY]: { list: [project('legacy-only', T.mid)], v: 1 },
    [`${PER}/migrated`]: { project: project('migrated', T.mid), updatedAt: T.mid, deletedAt: null },
  })
  const read = await readRemoteProjects(fs, UID, { perProject: true })
  assert.deepEqual(read.list.map((p) => p.id).sort(), ['legacy-only', 'migrated'])
})

test('a per-project tombstone document reads back as a delete, not as a project', async () => {
  const { fs } = fakeFirestore({
    [`${PER}/gone`]: { project: null, updatedAt: null, deletedAt: T.mid },
    [`${PER}/kept`]: { project: project('kept', T.mid), updatedAt: T.mid, deletedAt: null },
  })
  const read = await readRemoteProjects(fs, UID, { perProject: true })
  assert.deepEqual(read.list.map((p) => p.id), ['kept'])
  assert.equal(read.tombstones.gone, T.mid)
})

/* ═══════════════════════════════════════════════════════════════════════════
   7. THE MIGRATION, AND ITS IDEMPOTENCE
   ═══════════════════════════════════════════════════════════════════════════ */

test('migration writes one document per project and NEVER destroys the old one', async () => {
  const list = [project('a', T.early), project('b', T.mid)]
  const { fs, docs } = fakeFirestore({ [LEGACY]: { list, _updatedAt: 1, v: 1 } })

  const result = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(result.ok, true)
  assert.equal(result.migrated, 2)
  assert.deepEqual(docs.get(`${PER}/a`).project, list[0])
  assert.deepEqual(docs.get(`${PER}/b`).project, list[1])

  const head = docs.get(LEGACY)
  assert.equal(head.v, SYNC_SCHEMA_VERSION_PER_PROJECT)
  assert.equal(head.migratedAt, 1000)
  assert.deepEqual(head.list, list,
    'the pre-migration copy of everything the account had must survive untouched')
  assert.deepEqual(head.index.map((e) => e.id), ['a', 'b'])
})

test('migration is SAFE TO RUN TWICE — the second run changes nothing at all', async () => {
  const list = [project('a', T.early), project('b', T.mid), logoProject('c', T.late)]
  const { fs, docs, calls, snapshot } = fakeFirestore({ [LEGACY]: { list, _updatedAt: 1, v: 1 } })

  const first = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(first.migrated, 3)
  const afterFirst = snapshot()
  const writesAfterFirst = calls.setDoc

  const second = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(second.ok, true)
  assert.equal(second.migrated, 0, 'a second run must migrate nothing')
  assert.equal(second.skipped, 3, 'and must recognise all three as already there')
  assert.equal(snapshot(), afterFirst, 'the store must be byte-identical after the second run')
  assert.equal(calls.setDoc, writesAfterFirst + 1,
    'only the index is rewritten; not one project document is touched again')
  assert.equal(docs.size, 4, '3 projects + the index, still')

  // POSITIVE CONTROL for the comparison itself: a run that DOES have work to do
  // changes the snapshot, so "byte-identical" above is not vacuous.
  await fs.setDoc(fs.doc(fs.db, 'users', UID, 'sync', 'projects'),
    { list: [...list, project('d', T.mid)] }, { merge: true })
  const third = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(third.migrated, 1)
  assert.notEqual(snapshot(), afterFirst)
})

test('migration resumes from half-done without overwriting the newer half', async () => {
  const stale = project('a', T.early)
  const fresher = project('a', T.late)
  const { fs, docs } = fakeFirestore({
    [LEGACY]: { list: [stale, project('b', T.mid)], v: 1 },
    // A device already wrote a NEWER copy of `a` per-project. The migration must
    // not stamp the old list's copy over it.
    [`${PER}/a`]: { project: fresher, updatedAt: T.late, deletedAt: null },
  })

  const result = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(result.migrated, 1, 'only the missing one')
  assert.equal(result.skipped, 1)
  assert.equal(docs.get(`${PER}/a`).project.updatedAt, T.late,
    'the newer per-project copy must survive the migration')
  assert.ok(docs.get(`${PER}/b`))
})

test('migration does not resurrect a project the user had deleted', async () => {
  const { fs, docs } = fakeFirestore({
    [LEGACY]: { list: [project('a', T.mid), project('b', T.mid)], deleted: { a: T.late }, v: 1 },
  })
  const result = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(result.ok, true)
  assert.equal(docs.get(`${PER}/a`).project, null, 'it migrates as a tombstone …')
  assert.equal(docs.get(`${PER}/a`).deletedAt, T.late)
  assert.ok(docs.get(`${PER}/b`).project, '… and the one still there migrates as a project')

  const read = await readRemoteProjects(fs, UID, { perProject: true })
  assert.deepEqual(read.list.map((p) => p.id), ['b'])
})

test('an account with nothing to migrate is not an error', async () => {
  const { fs, calls } = fakeFirestore()
  const result = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(result.ok, true)
  assert.equal(result.migrated, 0)
  assert.equal(calls.setDoc, 0)
})

test('a migration refused halfway reports the refusal and how far it got', async () => {
  const list = [project('a', T.mid), project('b', T.mid)]
  const { fs, failures } = fakeFirestore({ [LEGACY]: { list, v: 1 } })
  failures.set(`${PER}/b`, firebaseError('permission-denied'))

  const result = await migrateToPerProject(fs, UID, { now: 1000 })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'permission-denied')
  assert.equal(result.migrated, 1, 'and says how far it got, so a retry can be reasoned about')
})

/* ═══════════════════════════════════════════════════════════════════════════
   8. THE GATE
   ═══════════════════════════════════════════════════════════════════════════ */

test('per-project sync is OFF until users/{uid}/projects/{id} has a rule', () => {
  // This is not a preference. Writing to that collection today is refused by
  // firestore.rules, and a refusal is precisely what this change exists to stop
  // hiding. The rule is in the PR body under FOUNDER APPROVAL NEEDED; when it
  // lands, this constant flips and the assertion below is what has to change
  // with it.
  assert.equal(PER_PROJECT_SYNC_ENABLED, false)
})

test('the live path defaults to the single document, rule or no rule', async () => {
  // The wiring, not the helper: ProjectContext calls these with no `perProject`
  // option at all, so what the default resolves to is what ships.
  const { fs, docs } = fakeFirestore()
  await writeRemoteProjects(fs, UID, { list: [project('a', T.mid)] })
  assert.ok(docs.get(LEGACY), 'the default write target is users/{uid}/sync/projects')
  assert.equal(docs.get(LEGACY).v, SYNC_SCHEMA_VERSION_SINGLE)
  assert.equal([...docs.keys()].some((k) => k.startsWith(`${PER}/`)), false,
    'and nothing is written to the ungoverned collection')
})

/* ═══════════════════════════════════════════════════════════════════════════
   9. firestore-sync-last-writer-wins — the exact sequence from the review
   ═══════════════════════════════════════════════════════════════════════════ */

test('the review’s three-step sequence is refused at step 2', () => {
  //  1. Device B edits at t=2000 and stamps its clock.
  //  2. Device A's OLDER push (t=1000) arrives as a snapshot inside B's debounce.
  //  3. B's debounce fires and pushes back whatever step 2 left behind.
  // Step 2 is where the edit died. It is now refused.
  const bEditedAt = 2000
  const aPushedAt = 1000
  const verdict = shouldApplyRemote(aPushedAt, bEditedAt)
  assert.equal(verdict.apply, false)
  assert.equal(verdict.reason, 'stale-remote')

  // POSITIVE CONTROL: a genuinely newer snapshot from A still applies, or this
  // would not be sync at all — it would be a device that ignores its account.
  assert.equal(shouldApplyRemote(3000, bEditedAt).apply, true)
  assert.equal(shouldApplyRemote(3000, bEditedAt).reason, 'newer')
})

test('a fresh device with no clock of its own still pulls its account', () => {
  const first = shouldApplyRemote(1000, 0)
  assert.equal(first.apply, true)
  assert.equal(first.reason, 'first-sync')
  // Equal stamps apply too — it is the same data, so applying is a no-op and
  // refusing would strand a device whose clock happened to match.
  assert.equal(shouldApplyRemote(1000, 1000).apply, true)
})

test('a remote document with no timestamp cannot overwrite a device that has one', () => {
  // pushToFirestore has always written _updatedAt, so a document without one is
  // new or corrupt. Neither is worth a known-newer local edit.
  assert.equal(shouldApplyRemote(undefined, 5000).apply, false)
  assert.equal(shouldApplyRemote(null, 5000).apply, false)
  // …but on a device with no clock, it is still the only copy there is.
  assert.equal(shouldApplyRemote(undefined, 0).apply, true)
})
