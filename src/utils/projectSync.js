// CROSS-DEVICE PROJECT SYNC — the merge rules, the document shape, and the
// migration between the two shapes, with no React and no Firebase in sight.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ═══════════════════════════════════════════════════════════════════════════
// All of this lived inside ProjectContext.jsx, which means none of it could be
// tested without a DOM, a router and the Firebase SDK — so none of it was. The
// 2026-09-06 review found four defects in it and every one of them is the kind a
// unit test catches in a line:
//
//   · project-sync-single-document (P1) — every project the account owns was
//     pushed into ONE Firestore document. Measured: 684 bytes for an empty
//     project, but brandLogo.js caps a logo at 32 KB, so roughly THIRTY logo
//     projects reach Firestore's 1 MiB per-document ceiling. Pro has no project
//     cap, so nothing stops a user getting there.
//   · the write was wrapped in `catch {}`. Past the ceiling every push failed
//     in silence: local editing kept working, nothing said sync had stopped,
//     and a second device pulled the last list that fit.
//   · `merge: true` does not merge INSIDE an array, so two devices replaced
//     each other's whole list.
//   · deletes never propagated — the next pull resurrected them.
//
// ═══════════════════════════════════════════════════════════════════════════
// THE DOCUMENT SHAPE, BEFORE AND AFTER
// ═══════════════════════════════════════════════════════════════════════════
// TODAY (v1, and still the live path — see PER_PROJECT_SYNC_ENABLED):
//
//     users/{uid}/sync/projects = { list: [ …every project… ], _updatedAt }
//
// TODAY AFTER THIS CHANGE (v1 + tombstones — same document, same rule, so it
// ships now):
//
//     users/{uid}/sync/projects = { list: [ …projects… ],
//                                   deleted: { <id>: <ISO deletedAt> },
//                                   _updatedAt, v: 1 }
//
//   `deleted` is additive and merge-safe, so deletes propagate as deletes
//   without a schema break and without a rules change. The 1 MiB ceiling is
//   still there — but it is no longer SILENT: writeRemoteProjects() measures the
//   payload and REFUSES rather than letting Firestore reject it into an empty
//   catch. See DOC_BYTE_BUDGET.
//
// AFTER THE RULE LANDS (v2, gated off in this branch):
//
//     users/{uid}/projects/{projectId} = { project, updatedAt, deletedAt,
//                                          _updatedAt }
//     users/{uid}/sync/projects        = { index: [{id, updatedAt, deletedAt}],
//                                          deleted: {…}, v: 2, _updatedAt }
//
//   One document per project, so the ceiling stops being a function of logo
//   size: a 32 KB logo now occupies one 32 KB document out of a per-document
//   1 MiB, instead of 3% of a shared one. The index is ~60 bytes per project,
//   which puts ~17,000 projects inside the same ceiling.
//
//   This needs a Firestore rule that does not exist yet — firestore.rules is
//   founder-gated (docs/reference/human-validation-zones.md) and cannot be
//   staged from here. The exact diff is in the PR body under FOUNDER APPROVAL
//   NEEDED, and tests/rules/ proves it against a temporary patched copy. Until
//   it lands, PER_PROJECT_SYNC_ENABLED is false and every live write takes the
//   v1 path, which the existing `match /users/{userId}/sync/{docId}` already
//   permits. Flipping one constant is the whole switch.
//
// ═══════════════════════════════════════════════════════════════════════════
// THE MERGE RULE
// ═══════════════════════════════════════════════════════════════════════════
// Union by id, newest `updatedAt` wins, and a tombstone removes a project only
// when the project was not edited after the delete. Nothing is ever discarded
// without being reported: mergeProjects() returns what it chose and why, and the
// caller shows it. "Last writer wins" was not the bug on its own — losing the
// newer side without telling anyone was.

/** Firestore's hard per-document ceiling. */
export const DOC_BYTE_CEILING = 1024 * 1024

/**
 * What we will actually put in one document.
 *
 * Below the ceiling on purpose. Firestore counts field names, its own type
 * tags and index entries toward the 1 MiB, and none of those are in a JSON
 * string — so a payload that measures 1,048,575 bytes here is already rejected
 * in production. The gap is the margin for that difference plus one more
 * project's worth of edits arriving between the check and the write.
 */
export const DOC_BYTE_BUDGET = 900 * 1024

/** v1: one document holding `list`. v2: one document per project. */
export const SYNC_SCHEMA_VERSION_SINGLE = 1
export const SYNC_SCHEMA_VERSION_PER_PROJECT = 2

/** The document id under users/{uid}/sync — unchanged, and now the v2 index. */
export const SYNC_DOC = 'projects'

/** The v2 collection: users/{uid}/projects/{projectId}. */
export const PROJECTS_COLLECTION = 'projects'

/**
 * THE RULE GATE. False until `users/{uid}/projects/{id}` has an owner-only rule
 * in firestore.rules — a client that wrote there today would be refused, and a
 * refusal is exactly what this change exists to stop hiding.
 *
 * Everything behind it is written, unit-tested against a fake db, and inert.
 */
export const PER_PROJECT_SYNC_ENABLED = false

/** Tombstones older than this are pruned; a device offline longer re-adds. */
export const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000

/* ── Pure: timestamps ─────────────────────────────────────────────────────── */

/** Date.parse that answers NaN as "no opinion" rather than as year zero. */
function timeOf(value) {
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

/**
 * Which side of a two-device disagreement is newer?
 *
 * Returns 'local', 'remote' or 'equal'. An unparseable or missing timestamp is
 * never treated as older-than-everything — it loses to a real timestamp, and
 * two unknowns resolve to 'equal', which keeps local. Anything else would let a
 * project with a corrupt `updatedAt` be silently replaced.
 */
export function newerSide(localAt, remoteAt) {
  const l = timeOf(localAt)
  const r = timeOf(remoteAt)
  if (l === null && r === null) return 'equal'
  if (l === null) return 'remote'
  if (r === null) return 'local'
  if (r > l) return 'remote'
  if (l > r) return 'local'
  return 'equal'
}

/* ── Pure: tombstones ─────────────────────────────────────────────────────── */

/** A tombstone map is `{ [projectId]: ISO string }` and nothing else. */
export function normaliseTombstones(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [id, at] of Object.entries(raw)) {
    if (typeof at !== 'string' || timeOf(at) === null) continue
    out[id] = at
  }
  return out
}

/** Union of two tombstone maps; the later delete wins. */
export function mergeTombstones(a, b) {
  const left = normaliseTombstones(a)
  const right = normaliseTombstones(b)
  const out = { ...left }
  for (const [id, at] of Object.entries(right)) {
    if (!out[id] || newerSide(out[id], at) === 'remote') out[id] = at
  }
  return out
}

/** Drop tombstones past their TTL so the map cannot grow without bound. */
export function pruneTombstones(tombstones, now = Date.now()) {
  const out = {}
  for (const [id, at] of Object.entries(normaliseTombstones(tombstones))) {
    if (now - timeOf(at) < TOMBSTONE_TTL_MS) out[id] = at
  }
  return out
}

/* ── Pure: the merge ──────────────────────────────────────────────────────── */

/**
 * Shallow structural compare keyed by id + updatedAt — enough to know whether a
 * merged list differs from the one already on disk and therefore needs saving.
 */
export function projectListsEqual(a, b) {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  const aById = new Map(a.map((p) => [p && p.id, p]))
  for (const p of b) {
    const other = aById.get(p && p.id)
    if (!other) return false
    if ((other.updatedAt || '') !== (p.updatedAt || '')) return false
  }
  return true
}

/**
 * NON-DESTRUCTIVE merge of two project lists, with deletes.
 *
 * @param {Array}  localList
 * @param {Array}  remoteList
 * @param {object} [opts]
 * @param {object} [opts.localTombstones]  `{ id: ISO }` deletes made here
 * @param {object} [opts.remoteTombstones] `{ id: ISO }` deletes made elsewhere
 * @param {number} [opts.now]              for pruning; injectable for tests
 * @returns {{ list: Array, tombstones: object,
 *             replaced: Array<{id,name}>, removed: Array<{id,name}> }}
 *
 *   `replaced` — projects where BOTH devices had a copy and the remote one was
 *                newer, so this device now shows the other device's version.
 *                This is the sentence the user gets on a conflict: nothing was
 *                lost, but what is on screen changed under them and saying so
 *                is the difference between sync and a haunting.
 *   `removed`  — projects deleted on another device and now gone from here.
 *
 * A project edited AFTER it was deleted elsewhere SURVIVES and its tombstone is
 * dropped: an edit is a deliberate act on a project the user still had in front
 * of them, and resurrecting work beats destroying it.
 */
export function mergeProjects(localList, remoteList, opts = {}) {
  const local = Array.isArray(localList) ? localList : []
  const remote = Array.isArray(remoteList) ? remoteList : []
  const now = opts.now ?? Date.now()

  const byId = new Map()
  // Seed with local so local wins ties by default.
  for (const p of local) {
    if (p && p.id != null) byId.set(p.id, p)
  }

  const replaced = []
  for (const r of remote) {
    if (!r || r.id == null) continue
    const existing = byId.get(r.id)
    if (!existing) {
      byId.set(r.id, r)
      continue
    }
    if (newerSide(existing.updatedAt, r.updatedAt) === 'remote') {
      byId.set(r.id, r)
      replaced.push({ id: r.id, name: r.name || existing.name || 'Untitled' })
    }
  }

  let tombstones = mergeTombstones(opts.localTombstones, opts.remoteTombstones)

  const removed = []
  for (const [id, deletedAt] of Object.entries(tombstones)) {
    const project = byId.get(id)
    if (!project) continue
    // Edited after the delete? The edit wins, and the tombstone goes with it —
    // otherwise the project would be deleted again on the next device to sync.
    if (newerSide(deletedAt, project.updatedAt) === 'remote') {
      const { [id]: _dropped, ...rest } = tombstones
      tombstones = rest
      continue
    }
    byId.delete(id)
    removed.push({ id, name: project.name || 'Untitled' })
  }

  return {
    list: Array.from(byId.values()),
    tombstones: pruneTombstones(tombstones, now),
    replaced,
    removed,
  }
}

/* ── Pure: the OTHER sync document's conflict rule ────────────────────────── */

/**
 * Should a remote snapshot of users/{uid}/sync/data be applied over what this
 * device holds? (`firestore-sync-last-writer-wins`, 2026-09-06 review.)
 *
 * It lives here rather than in the hook that uses it for one reason: the hook
 * imports React and the Firebase broker, so a decision inside it cannot be
 * reached by a unit test — which is why this decision was missing entirely.
 *
 * A remote document with NO `_updatedAt` counts as 0. That is deliberate rather
 * than lenient: pushToFirestore has always written the field, so a document
 * without one is either brand new or corrupt, and neither is worth overwriting a
 * known-newer local edit for. A device with no local stamp has `local = 0`, and
 * `0 < 0` is false, so a first sync on a fresh device still applies.
 *
 * @returns {{ apply: boolean, reason: 'newer'|'first-sync'|'stale-remote' }}
 */
export function shouldApplyRemote(remoteUpdatedAt, localUpdatedAt) {
  const remote = Number(remoteUpdatedAt) || 0
  const local = Number(localUpdatedAt) || 0
  if (remote < local) return { apply: false, reason: 'stale-remote' }
  return { apply: true, reason: local === 0 ? 'first-sync' : 'newer' }
}

/* ── Pure: how big is this, and will Firestore take it ────────────────────── */

// TextEncoder is a browser global and a Node global; this module runs in both.
const encoder = new TextEncoder()

/** Byte length of a payload once serialised. */
export function payloadBytes(payload) {
  return encoder.encode(JSON.stringify(payload ?? null)).length
}

/**
 * The sentence the user reads when sync stops.
 *
 * Written here, next to the failure, rather than in the component: a message
 * that names its cause is the whole point of the fix, and a component that
 * mapped error codes to prose would put that mapping out of reach of a unit
 * test. Every branch says the same two things first — your work is safe, and
 * this device is still the copy that has it.
 */
export function syncFailureMessage(reason, detail) {
  const safe = 'Everything is still saved on this device.'
  if (reason === 'too-large') {
    return `Your projects are too large to sync to your account (${detail || 'over the size limit'}). ${safe} Deleting or archiving a project with a large logo will let syncing resume.`
  }
  if (reason === 'permission-denied') {
    return `Your account refused the sync. ${safe} Signing out and back in usually clears it.`
  }
  if (reason === 'offline') {
    return `Your projects aren’t syncing — this device looks offline. ${safe} Syncing resumes on its own once you’re back.`
  }
  return `Your projects aren’t syncing to your account right now. ${safe} They will sync again once the connection recovers.`
}

/** Classify a thrown Firebase error into one of syncFailureMessage's reasons. */
export function classifyError(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  if (code.includes('permission-denied')) return 'permission-denied'
  if (code.includes('unauthenticated')) return 'permission-denied'
  if (code.includes('unavailable') || message.includes('offline')) return 'offline'
  if (code.includes('invalid-argument') || message.includes('longer than')) return 'too-large'
  return 'unknown'
}

/* ── IO: the v1 single document ───────────────────────────────────────────── */

function legacyRef(fs, uid) {
  return fs.doc(fs.db, 'users', uid, 'sync', SYNC_DOC)
}

function projectRef(fs, uid, id) {
  return fs.doc(fs.db, 'users', uid, PROJECTS_COLLECTION, id)
}

function projectsCollection(fs, uid) {
  return fs.collection(fs.db, 'users', uid, PROJECTS_COLLECTION)
}

/**
 * Read whatever the account has, from whichever shape it is in.
 *
 * Reads the v1 document ALWAYS, even in v2 mode: a device that has not migrated
 * yet is still pushing there, and dropping its projects on the floor during the
 * rollout would be the same data loss by a different route.
 *
 * @returns {{ list, tombstones, version, found }}
 */
export async function readRemoteProjects(fs, uid, opts = {}) {
  const perProject = opts.perProject ?? PER_PROJECT_SYNC_ENABLED

  const snap = await fs.getDoc(legacyRef(fs, uid))
  const head = snap.exists() ? snap.data() || {} : null
  const legacyList = head && Array.isArray(head.list) ? head.list : []
  const legacyTombstones = normaliseTombstones(head?.deleted)
  const version = Number(head?.v) || SYNC_SCHEMA_VERSION_SINGLE

  if (!perProject) {
    return { list: legacyList, tombstones: legacyTombstones, version, found: !!head }
  }

  const docs = await fs.getDocs(projectsCollection(fs, uid))
  const perList = []
  const perTombstones = {}
  docs.forEach((d) => {
    const data = d.data() || {}
    if (data.deletedAt) { perTombstones[d.id] = data.deletedAt; return }
    if (data.project && data.project.id != null) perList.push(data.project)
  })

  // Union, so neither shape can shadow the other during a rollout.
  const merged = mergeProjects(perList, legacyList, {
    localTombstones: perTombstones,
    remoteTombstones: legacyTombstones,
    now: opts.now,
  })
  return {
    list: merged.list,
    tombstones: merged.tombstones,
    version,
    found: !!head || docs.size > 0,
  }
}

/**
 * Push the account's projects.
 *
 * NEVER THROWS, and never silently succeeds either — it returns what happened
 * so the caller can put it on screen. `{ ok: false, reason }` is the whole
 * reason this function exists as something other than a setDoc call.
 *
 * @returns {{ ok: boolean, reason?: string, bytes?: number, written?: number,
 *             error?: Error }}
 */
export async function writeRemoteProjects(fs, uid, opts = {}) {
  const perProject = opts.perProject ?? PER_PROJECT_SYNC_ENABLED
  const now = opts.now ?? Date.now()
  // A JSON round-trip strips `undefined`, which Firestore rejects outright —
  // that rejection used to land in an empty catch and stop sync forever.
  const list = JSON.parse(JSON.stringify(Array.isArray(opts.list) ? opts.list : []))
  const tombstones = pruneTombstones(opts.tombstones, now)

  if (!perProject) {
    const payload = {
      list,
      deleted: tombstones,
      _updatedAt: now,
      v: SYNC_SCHEMA_VERSION_SINGLE,
    }
    const bytes = payloadBytes(payload)
    if (bytes > DOC_BYTE_BUDGET) {
      // THE CEILING, CAUGHT BEFORE IT IS HIT. Firestore would reject this with
      // invalid-argument; the old code sent it anyway and swallowed the answer.
      return { ok: false, reason: 'too-large', bytes }
    }
    try {
      await fs.setDoc(legacyRef(fs, uid), payload, { merge: true })
      return { ok: true, bytes, written: 1 }
    } catch (error) {
      return { ok: false, reason: classifyError(error), error }
    }
  }

  // v2 — one document per project, plus a small index.
  const previous = opts.previous instanceof Map ? opts.previous : new Map()
  let written = 0
  try {
    for (const project of list) {
      if (!project || project.id == null) continue
      const bytes = payloadBytes(project)
      if (bytes > DOC_BYTE_BUDGET) {
        return { ok: false, reason: 'too-large', bytes, projectId: project.id }
      }
      if (previous.get(project.id) === project.updatedAt) continue
      await fs.setDoc(
        projectRef(fs, uid, project.id),
        { project, updatedAt: project.updatedAt || null, deletedAt: null, _updatedAt: now },
        { merge: false },
      )
      written += 1
    }
    for (const [id, deletedAt] of Object.entries(tombstones)) {
      await fs.setDoc(
        projectRef(fs, uid, id),
        { project: null, updatedAt: null, deletedAt, _updatedAt: now },
        { merge: false },
      )
      written += 1
    }
    await fs.setDoc(
      legacyRef(fs, uid),
      {
        index: list.map((p) => ({ id: p.id, updatedAt: p.updatedAt || null })),
        deleted: tombstones,
        v: SYNC_SCHEMA_VERSION_PER_PROJECT,
        _updatedAt: now,
      },
      { merge: true },
    )
    return { ok: true, written }
  } catch (error) {
    return { ok: false, reason: classifyError(error), error }
  }
}

/**
 * Move an account from the v1 document to v2 documents.
 *
 * SAFE TO RUN TWICE, and the two properties that make it so are worth naming:
 *
 *   1. It is a write-if-newer, not a write. A project whose per-document copy
 *      already carries the same `updatedAt` is skipped, so a second run writes
 *      nothing at all and `migrated` comes back 0.
 *   2. IT NEVER DELETES THE v1 DOCUMENT. `list` is left exactly as it was, as a
 *      frozen pre-migration copy of everything the account had. Only `index`,
 *      `deleted` and `v` are written over it, with merge: true.
 *
 * The second run's store is byte-identical to the first's when `now` is fixed —
 * which is what tests/unit/project-sync.test.js asserts rather than argues.
 */
export async function migrateToPerProject(fs, uid, opts = {}) {
  const now = opts.now ?? Date.now()
  let head
  try {
    head = await fs.getDoc(legacyRef(fs, uid))
  } catch (error) {
    return { ok: false, reason: classifyError(error), error }
  }
  if (!head.exists()) return { ok: true, migrated: 0, skipped: 0, reason: 'nothing-to-migrate' }

  const data = head.data() || {}
  const list = Array.isArray(data.list) ? data.list : []
  const tombstones = normaliseTombstones(data.deleted)

  let existing
  try {
    existing = await fs.getDocs(projectsCollection(fs, uid))
  } catch (error) {
    return { ok: false, reason: classifyError(error), error }
  }
  // { deleted, updatedAt } rather than a bare timestamp: a live project with no
  // `updatedAt` and a tombstone both read as "null", and conflating them would
  // make the migration skip a tombstone it had never written.
  const already = new Map()
  existing.forEach((d) => {
    const v = d.data() || {}
    already.set(d.id, {
      deleted: !!v.deletedAt,
      updatedAt: v.project?.updatedAt ?? v.updatedAt ?? null,
    })
  })

  let migrated = 0
  let skipped = 0
  try {
    for (const project of list) {
      if (!project || project.id == null) continue
      if (tombstones[project.id]) { skipped += 1; continue }
      const there = already.get(project.id)
      // Present, not a tombstone, and not older than what we hold — nothing to
      // do. This is the line that makes a second run a no-op.
      if (there && !there.deleted && newerSide(there.updatedAt, project.updatedAt) !== 'remote') {
        skipped += 1
        continue
      }
      await fs.setDoc(
        projectRef(fs, uid, project.id),
        { project, updatedAt: project.updatedAt || null, deletedAt: null, _updatedAt: now },
        { merge: false },
      )
      migrated += 1
    }
    for (const [id, deletedAt] of Object.entries(tombstones)) {
      if (already.get(id)?.deleted) { skipped += 1; continue }
      await fs.setDoc(
        projectRef(fs, uid, id),
        { project: null, updatedAt: null, deletedAt, _updatedAt: now },
        { merge: false },
      )
      migrated += 1
    }
    await fs.setDoc(
      legacyRef(fs, uid),
      {
        index: list
          .filter((p) => p && p.id != null && !tombstones[p.id])
          .map((p) => ({ id: p.id, updatedAt: p.updatedAt || null })),
        deleted: tombstones,
        v: SYNC_SCHEMA_VERSION_PER_PROJECT,
        migratedAt: now,
      },
      { merge: true },
    )
  } catch (error) {
    return { ok: false, reason: classifyError(error), error, migrated, skipped }
  }
  return { ok: true, migrated, skipped }
}
