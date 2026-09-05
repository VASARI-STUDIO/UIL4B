// Firestore reads and writes for the feedback queue.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE HALF THAT WAS NEVER VERIFIED
// ─────────────────────────────────────────────────────────────────────────────
// An admin feedback panel has existed in Admin.jsx for a long time. Its server
// half was never checked against the published rules, and both directions were
// silently wrong in the same way — they could not tell a REFUSAL from a normal
// outcome.
//
//   1. THE READ. Admin.jsx did `getDocs(collection(db, 'feedback'))` inside a
//      `try { } catch { /* firestore unavailable */ }` with an EMPTY catch. The
//      published rules gate that read on `request.auth.token.admin == true`, so
//      a session whose token does not carry the claim gets permission-denied —
//      and the panel rendered the localStorage feedback alone, with nothing to
//      say the server half had been refused. A refused read and an empty
//      collection were pixel-identical. That is the exact fault the aggregate
//      analytics block a few lines above it was already fixed for, whose own
//      comment says a failed read is not zero.
//
//   2. THE WRITE. The write DID reach Firestore — `updateDoc` is called for any
//      item carrying `_fs` — but it was wrapped in `catch { /* offline */ }`
//      AFTER the local state had already been updated optimistically, and the
//      success toast fired unconditionally. So a write Firestore rejected
//      produced a row that moved to "Done" and a toast that said so, and
//      reverted on the next refresh. A lying success is worse than a visible
//      failure: nothing prompts anyone to look.
//
// This module is the half that reports. It is separate from utils/analytics.js
// on purpose: that module is localStorage-only and is imported by surfaces that
// must never pull in the Firebase SDK.
//
// Same split as communityQueue.js / communityQueueApi.js — the decisions live
// in the pure module (utils/moderation.js) so they are testable under
// `node --test`, and the network lives here.
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { feedbackDecision } from './moderation'

export const FEEDBACK_COLLECTION = 'feedback'

/**
 * Every feedback document, newest first.
 *
 * NO `orderBy` in the query, and that is deliberate rather than an oversight —
 * Admin.jsx's own comment records why: Firestore DROPS documents that are
 * missing the ordered field, which silently hid every report written before
 * `createdAt` existed. The sort happens in memory below, where a document with
 * no date sorts last instead of disappearing.
 *
 * THROWS on failure. It must: the whole point of this module is that a refused
 * read stops being indistinguishable from an empty queue, and a function that
 * returns `[]` on error is how that indistinguishability gets rebuilt.
 */
export async function listFeedback() {
  const snap = await getDocs(collection(db, FEEDBACK_COLLECTION))
  const items = snap.docs.map((d) => {
    const raw = d.data()
    return {
      ...raw,
      id: d.id,
      _fs: true,
      source: raw.source || 'firestore',
      status: raw.status || 'new',
      createdAt: toIso(raw.createdAt ?? raw.ts ?? raw.timestamp),
      updatedAt: toIso(raw.updatedAt),
    }
  })
  return items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

/**
 * A reviewer's triage decision, written to the document it is about.
 *
 * The update carries ONLY the three fields feedbackDecision() builds, one of
 * which is `reviewedBy`. Nothing from the item is spread back in, because these
 * documents arrive from /api/support, which takes subject, message and email
 * from a public form with no session at all — a decision that echoed the item
 * would let that form overwrite the stored record on every triage click.
 *
 * Throws whatever Firestore threw. The caller shows it.
 */
export async function setFeedbackStatus(id, status, reviewerUid) {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, id), feedbackDecision(status, reviewerUid))
}

/**
 * A reviewer's internal note.
 *
 * `reviewedBy` rides along for the same reason it does on a status change: the
 * note is a second thing a reviewer can leave behind, and it is worth as little
 * as the status is if nobody can tell which reviewer left it.
 */
export async function setFeedbackNotes(id, notes, reviewerUid) {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, id), {
    adminNotes: notes,
    updatedAt: new Date().toISOString(),
    reviewedBy: reviewerUid || null,
  })
}

export async function deleteFeedbackDoc(id) {
  await deleteDoc(doc(db, FEEDBACK_COLLECTION, id))
}

/**
 * Firestore timestamps arrive as a Timestamp, a number, or an ISO string
 * depending on how old the document is and which writer created it. Normalised
 * to one ISO string, or null when there is genuinely no date — never to "now",
 * which would date every undated report to the moment somebody opened the page.
 */
function toIso(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return new Date(value).toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString()
  return null
}
