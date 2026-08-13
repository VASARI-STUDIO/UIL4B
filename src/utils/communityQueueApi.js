// Firestore reads and writes for the community review queue.
//
// Split from communityQueue.js so the rules about what may be queued stay
// testable under `node --test` — importing this file pulls in the whole
// Firebase SDK, which that runner cannot load. Same split as config/plans.js
// and utils/aiQuota.js use for the same reason.
import {
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, limit,
} from 'firebase/firestore'
import { db } from './firebase'
import { QUEUE_COLLECTION, QUEUE_STATUSES, CLIENT_WRITABLE_STATUS } from './communityQueue'

/** Publish to the shared queue. Throws so the caller can tell the user. */
export async function publishToQueue(record) {
  const ref = await addDoc(collection(db, QUEUE_COLLECTION), record)
  return ref.id
}

/**
 * One person's submissions, newest first — the "my pending submissions" list,
 * now answered from the account rather than from one browser's storage.
 */
export async function listMySubmissions(uid, kind = null) {
  if (!uid) return []
  const parts = [collection(db, QUEUE_COLLECTION), where('authorUid', '==', uid)]
  if (kind) parts.push(where('kind', '==', kind))
  const snap = await getDocs(query(...parts, orderBy('createdAt', 'desc'), limit(100)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Everything awaiting review — the admin queue. */
export async function listQueue(status = 'pending') {
  const snap = await getDocs(query(
    collection(db, QUEUE_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(200),
  ))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Reviewer decision. Rejected in firestore.rules unless the caller carries the
 * `admin` custom claim — which api/verify-admin.js grants, and which nothing
 * granted before, so every moderation write used to fail.
 */
export async function decideSubmission(id, status, reviewerUid) {
  if (!QUEUE_STATUSES.includes(status) || status === CLIENT_WRITABLE_STATUS) {
    throw new Error(`Not a review decision: ${status}`)
  }
  await updateDoc(doc(db, QUEUE_COLLECTION, id), {
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerUid || null,
  })
}

export async function deleteSubmission(id) {
  await deleteDoc(doc(db, QUEUE_COLLECTION, id))
}
