// Firestore reads and writes for the community review queue.
//
// Split from communityQueue.js so the rules about what may be queued stay
// testable under `node --test` — importing this file pulls in the whole
// Firebase SDK, which that runner cannot load. Same split as config/plans.js
// and utils/aiQuota.js use for the same reason.
import {
  collection, setDoc, getDoc, getDocs, query, where, orderBy, doc, limit,
  startAfter, writeBatch, serverTimestamp, documentId, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  QUEUE_COLLECTION, QUEUE_STATUSES, CLIENT_WRITABLE_STATUS, PUBLIC_COLLECTION, buildPublicDesign,
} from './communityQueue'
import { COMMUNITY_LIMITS_ENABLED, UNSTAMPED_SCAN, mergeUnstamped, planCounter, queueOrderField } from './communityLimits'

/**
 * Create one prompt or submission. Before the limits rules are in, that is a
 * plain setDoc. After, it is one batch: the post stamped with the server's
 * clock (`submittedAt`) and the poster's counter document, which the rules
 * check together. The counter is read first to pick keep-or-restart for the
 * 24-hour window; a refusal is retried once the other way, in case the client
 * clock disagreed with the server near the 24-hour mark.
 *
 * @param {import('firebase/firestore').DocumentReference} ref the new post's reference
 * @param {object} record the post, without submittedAt
 * @param {'prompt'|'submission'} kind
 * @throws {PostLimitError} when the 30-second gap or the daily cap says no
 */
export async function postWithLimits(ref, record, kind) {
  if (!COMMUNITY_LIMITS_ENABLED) { await setDoc(ref, record); return }
  const counterRef = doc(db, 'users', record.authorUid, 'limits', 'community')
  const snap = await getDoc(counterRef)
  const prev = snap.exists() ? snap.data() : null
  let lastError
  for (const flip of prev ? [false, true] : [false]) {
    const { data } = planCounter(prev, { kind, id: ref.id, nowMs: Date.now(), stamp: serverTimestamp(), flip })
    const batch = writeBatch(db)
    batch.set(ref, { ...record, submittedAt: serverTimestamp() })
    batch.set(counterRef, data)
    try { await batch.commit(); return } catch (err) {
      lastError = err
      if (err?.code !== 'permission-denied') throw err
    }
  }
  throw lastError
}

/** Publish to the shared queue. Throws so the caller can tell the user. */
export async function publishToQueue(record) {
  const ref = doc(collection(db, QUEUE_COLLECTION))
  await postWithLimits(ref, record, 'submission')
  return ref.id
}

/** Publish a community prompt to the review queue. Throws so the caller can tell the user. */
export async function publishPrompt(record) {
  const ref = doc(collection(db, 'community-prompts'))
  await postWithLimits(ref, record, 'prompt')
  return ref.id
}

/**
 * Publish at a fixed document id, so the same entry sent twice (two tabs, a
 * retry) is one document. Resolves { id, created }.
 *
 * firestore.rules lets a client create a document under any id it likes, but a
 * second write to an existing one is an update, and the owner may only update
 * `status` to 'withdrawn': the repeat is refused with permission-denied. That
 * refusal is only taken to mean "already there" when the document read back
 * carries this author's uid: an id someone else created first (ids are free to
 * choose) must not count as ours. Anything else still throws.
 */
export async function publishToQueueOnce(record, { id }) {
  const ref = doc(db, QUEUE_COLLECTION, id)
  try {
    await postWithLimits(ref, record, 'submission')
    return { id, created: true }
  } catch (err) {
    if (err?.code === 'permission-denied') {
      let there = false
      try {
        const snap = await getDoc(ref)
        const uid = record?.authorUid
        there = Boolean(uid) && snap.exists() && snap.data()?.authorUid === uid
      } catch { /* not readable: not ours */ }
      if (there) return { id, created: false }
    }
    throw err
  }
}

/**
 * One person's submissions, newest first — the "my pending submissions" list,
 * now answered from the account rather than from one browser's storage.
 * `max` is the page size (100 unless the caller needs to see more, as the
 * migration does to tell what is already queued).
 */
export async function listMySubmissions(uid, kind = null, max = 100) {
  if (!uid) return []
  const parts = [collection(db, QUEUE_COLLECTION), where('authorUid', '==', uid)]
  if (kind) parts.push(where('kind', '==', kind))
  const snap = await getDocs(query(...parts, orderBy('createdAt', 'desc'), limit(max)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * How many approved designs one read brings to the public grid. One more is
 * asked for to learn whether another page exists, so the query's limit is this
 * plus one; firestore.rules caps a public list at 25.
 */
export const PUBLIC_DESIGN_PAGE = 24

/**
 * One page of approved designs, newest approval first — what /community shows
 * every visitor, signed out included. It reads the public copies, which hold a
 * name, a typed credit, a category, a link and two colours and nothing that
 * identifies the member. `after` is the cursor a previous page returned. The
 * extra document is not returned.
 *
 * @returns {Promise<{ items: object[], cursor: object|null, hasMore: boolean }>}
 */
export async function listApprovedDesigns({ after = null, pageSize = PUBLIC_DESIGN_PAGE } = {}) {
  const snap = await getDocs(query(
    collection(db, PUBLIC_COLLECTION),
    orderBy('approvedAt', 'desc'),
    ...(after ? [startAfter(after)] : []),
    limit(pageSize + 1),
  ))
  const shown = snap.docs.slice(0, pageSize)
  return {
    items: shown.map(d => ({ id: d.id, ...d.data() })),
    cursor: shown.length ? shown[shown.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

/** Everything awaiting review — the admin queue. */
export async function listQueue(status = 'pending') {
  const snap = await getDocs(query(
    collection(db, QUEUE_COLLECTION),
    where('status', '==', status),
    orderBy(queueOrderField(), 'desc'),
    limit(200),
  ))
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return mergeUnstamped(list, await listUnstamped(QUEUE_COLLECTION, status), 200)
}

/**
 * The newest items of a collection by createdAt, for the reviewers' queues while
 * the limits are on; mergeUnstamped keeps those with no submittedAt. Firestore
 * cannot ask for a missing field, so this reads the newest few and filters. A
 * failed read returns nothing, so the queue itself still loads. status null
 * means every status.
 */
export async function listUnstamped(collectionName, status) {
  if (!COMMUNITY_LIMITS_ENABLED) return []
  try {
    const snap = await getDocs(query(
      collection(db, collectionName),
      ...(status ? [where('status', '==', status)] : []),
      orderBy('createdAt', 'desc'),
      limit(UNSTAMPED_SCAN),
    ))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

/**
 * Reviewer decision. Rejected in firestore.rules unless the caller carries the
 * `admin` custom claim — which api/verify-admin.js grants, and which nothing
 * granted before, so every moderation write used to fail.
 *
 * The decision and the design's public copy change in one batch. Approving a
 * design writes the copy (buildPublicDesign, with the server's clock as
 * `approvedAt`); any other decision removes it, so a design a reviewer turns
 * down is never left in public view. The copy is built from the stored
 * submission, not from whatever the caller holds.
 */
export async function decideSubmission(id, status, reviewerUid) {
  if (!QUEUE_STATUSES.includes(status) || status === CLIENT_WRITABLE_STATUS) {
    throw new Error(`Not a review decision: ${status}`)
  }
  const ref = doc(db, QUEUE_COLLECTION, id)
  const publicRef = doc(db, PUBLIC_COLLECTION, id)
  const copy = status === 'approved' ? buildPublicDesign((await getDoc(ref)).data()) : null
  const batch = writeBatch(db)
  batch.update(ref, {
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerUid || null,
  })
  if (copy) batch.set(publicRef, { ...copy, approvedAt: serverTimestamp() })
  else batch.delete(publicRef)
  await batch.commit()
}

/**
 * Take a decision back: the submission returns to the awaiting-review list.
 * firestore.rules lets a reviewer write any status, so this needs no rules
 * change; it is separate from decideSubmission because that refuses 'pending'
 * on purpose, as a decision a reviewer makes. The public copy, if there is one,
 * goes in the same batch.
 */
export async function reopenSubmission(id) {
  const batch = writeBatch(db)
  batch.update(doc(db, QUEUE_COLLECTION, id), {
    status: CLIENT_WRITABLE_STATUS,
    reviewedAt: null,
    reviewedBy: null,
  })
  batch.delete(doc(db, PUBLIC_COLLECTION, id))
  await batch.commit()
}

/**
 * Delete a submission and its public copy in one batch. A reviewer may delete
 * either; the author may delete their own submission, and may delete the copy
 * because firestore.rules checks the submission's `authorUid` before the batch
 * applies. Pass `kind` when it is known: only a design has a public copy, so
 * any other kind skips that delete.
 */
export async function deleteSubmission(id, { kind } = {}) {
  const batch = writeBatch(db)
  batch.delete(doc(db, QUEUE_COLLECTION, id))
  if (!kind || kind === 'design') batch.delete(doc(db, PUBLIC_COLLECTION, id))
  await batch.commit()
}

// Public copies written per batch: well under the 500-write limit.
const PUBLISH_PAGE = 200

/**
 * Write the public copy of every approved design that was approved before
 * public copies existed, or whose copy is missing. Reviewer path only: the
 * rules refuse the writes to anyone else. Safe to run again, as each copy is
 * written at its submission's id. The copy keeps the original approval time
 * when the submission has one, so the grid's order is the order they were
 * approved in.
 *
 * @returns {Promise<number>} how many copies were written
 */
export async function publishApprovedDesigns() {
  let written = 0
  let after = null
  for (;;) {
    const snap = await getDocs(query(
      collection(db, QUEUE_COLLECTION),
      where('status', '==', 'approved'),
      where('kind', '==', 'design'),
      orderBy(documentId()),
      ...(after ? [startAfter(after)] : []),
      limit(PUBLISH_PAGE),
    ))
    if (snap.empty) return written
    const batch = writeBatch(db)
    let inBatch = 0
    for (const d of snap.docs) {
      const stored = d.data()
      const copy = buildPublicDesign(stored)
      if (!copy) continue
      const when = Date.parse(stored.reviewedAt)
      batch.set(doc(db, PUBLIC_COLLECTION, d.id), {
        ...copy,
        approvedAt: Number.isFinite(when) ? Timestamp.fromMillis(when) : serverTimestamp(),
      })
      inBatch += 1
    }
    if (inBatch) await batch.commit()
    written += inBatch
    if (snap.docs.length < PUBLISH_PAGE) return written
    after = snap.docs[snap.docs.length - 1]
  }
}
