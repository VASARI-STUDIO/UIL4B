// The shared review queue for community submissions.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// Gradient submissions (utils/gradientSubmissions.js) and design submissions
// (utils/communitySubmissions.js) were both LOCAL-ONLY — `vs-gradient-submissions`
// and `vs-community-submissions` in localStorage, and nowhere else. Two
// consequences, both reported:
//
//   1. A user who submitted on one browser saw nothing under "my pending
//      submissions" on another. Their work was not lost, it was simply never
//      anywhere but that one browser's storage.
//   2. NOBODY COULD REVIEW THEM. There was no queue for an admin to look at, so
//      every submission sat pending forever by construction — the "pending"
//      status was describing a review that could never happen.
//
// Prompts already had this (the `community-prompts` collection); gradients and
// designs never got it. This is that collection, generalised over `kind` so a
// third submission type does not need a fourth code path.
//
// LOCAL STAYS. The local store is still written first and still renders the
// user's own list, so submitting works offline and the UI never waits on a
// round trip. Firestore is what makes it visible across devices and reviewable.
// A failed publish leaves the local copy intact and reports itself rather than
// pretending to have succeeded.
//
// PURE. No Firebase import lives here, so the rules about what may be queued —
// which are the part worth getting wrong-proof — are testable under
// `node --test` without a browser or a network. The Firestore reads and writes
// are in communityQueueApi.js.
import { safeHttpUrl } from './urlSafety'

export const QUEUE_COLLECTION = 'community-submissions'

// 'approved' and 'rejected' are a REVIEWER's words. firestore.rules refuses a
// client-written document that claims anything but 'pending', so the honesty
// rule the local modules already enforce survives the trip to the server.
export const QUEUE_STATUSES = Object.freeze(['pending', 'approved', 'rejected'])
export const CLIENT_WRITABLE_STATUS = 'pending'

// 'icon' is the fourth, so people can submit icons to the community once they
// are reviewed. It needed no fourth code path here, which is what this list being generalised over
// `kind` was for — but it DOES need a rules change, because
// firestore.rules pins `kind in ['gradient', 'design', 'palette']` and an icon
// also carries a payload key ('svg') the rules' allowlist does not name. Until
// the rules are updated, an icon submission is refused by Firestore and the
// submitter is told so rather than told it reached a reviewer.
export const QUEUE_KINDS = Object.freeze(['gradient', 'design', 'palette', 'icon'])

/**
 * Shape a client record for the queue. Returns null when it cannot describe a
 * real submission — a half-formed document must never reach a reviewer's list
 * looking like something they can act on.
 */
export function buildQueueRecord({ kind, payload, user, name }) {
  if (!QUEUE_KINDS.includes(kind)) return null
  if (!payload || typeof payload !== 'object') return null
  if (!user?.uid) return null
  const title = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  return {
    kind,
    name: title || `Untitled ${kind}`,
    authorUid: user.uid,
    // Display name only. The email is deliberately NOT copied here: this
    // collection is readable by every signed-in user once an item is approved,
    // and a submission does not need to disclose an address to be reviewed.
    authorName: (user.displayName || 'Anonymous').slice(0, 60),
    status: CLIENT_WRITABLE_STATUS,
    payload,
    createdAt: new Date().toISOString(),
  }
}


// What a submission says about where it stands. 'approved' and 'rejected' are a
// reviewer's words; anything unknown reads as pending.
export const QUEUE_STATUS_LABEL = Object.freeze({
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Not approved',
})

/**
 * The tag for one of a person's own submissions. An entry the account does not
 * hold (`synced` false) is one cache clear from gone, so it never claims a
 * reviewer status it has not earned: it reads "Not sent", or "Sending…" while a
 * publish is in flight.
 */
export function submissionStatusLabel({ status, synced = true, sending = false } = {}) {
  if (!synced) return sending ? 'Sending…' : 'Not sent'
  return Object.hasOwn(QUEUE_STATUS_LABEL, status) ? QUEUE_STATUS_LABEL[status] : QUEUE_STATUS_LABEL.pending
}

const HEX = /^#[0-9a-fA-F]{6}$/
const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/**
 * One approved design from the public query, as a card. Anything that is not an
 * approved design with a name is dropped, so a document the query should never
 * have returned cannot reach the grid.
 *
 * Built field by field from the payload rather than spread over it: the card
 * takes only what it draws, the link passes the http(s) check, and a colour the
 * thumbnail cannot parse falls back to the default pair. The credit is the
 * author the submitter typed, else the account's display name. `ownerId` is
 * never set, so no stored value can claim the site-owner treatment.
 *
 * `authorUid` and `docId` are kept for de-duplication against the viewer's own
 * entries (see publicDesignsForViewer); the card does not draw them.
 */
export function publicDesignFromDoc(doc) {
  if (!doc || doc.kind !== 'design' || doc.status !== 'approved') return null
  const name = clip(doc.name, 80)
  if (!name || typeof doc.id !== 'string' || !doc.id) return null
  const payload = doc.payload && typeof doc.payload === 'object' ? doc.payload : {}
  return {
    id: `pub-${doc.id}`,
    docId: doc.id,
    authorUid: typeof doc.authorUid === 'string' ? doc.authorUid : '',
    name,
    author: clip(payload.author, 60) || clip(doc.authorName, 60) || 'Community member',
    category: clip(payload.category, 40),
    url: safeHttpUrl(payload.url),
    c1: HEX.test(payload.c1 || '') ? payload.c1 : '#3B82F6',
    c2: HEX.test(payload.c2 || '') ? payload.c2 : '#8B5CF6',
    saves: 0,
  }
}

/**
 * The public designs a viewer should see in the grid. Their own designs are
 * left out: those render from their own list with a status tag, so an approved
 * design of theirs would otherwise appear twice, once without the tag.
 *
 * @param {object[]} items cards from publicDesignFromDoc
 * @param {{ uid?: string|null, own?: object[] }} viewer `own` is their merged
 *   list; a design counts as theirs when its document id matches any entry
 */
export function publicDesignsForViewer(items, { uid = null, own = [] } = {}) {
  const ownDocs = new Set()
  for (const o of own || []) {
    if (o?.docId) ownDocs.add(o.docId)
    if (o?.id) ownDocs.add(o.id)
  }
  return (items || []).filter(i => i && !(uid && i.authorUid === uid) && !ownDocs.has(i.docId))
}

/**
 * Merge the server's copy of someone's submissions with this browser's local
 * queue, so the list is complete whichever side an entry came from.
 *
 * The server wins on conflict — it is the copy a reviewer acts on. Local-only
 * entries are kept and marked, because they are real submissions that simply
 * have not reached the queue yet (offline, or a failed publish), and silently
 * dropping them would look exactly like the bug this module fixes.
 */
export function mergeSubmissions(serverItems, localItems) {
  const out = []
  const seen = new Set()
  for (const s of serverItems || []) {
    if (!s) continue
    out.push({ ...s, synced: true })
    if (s.localId) seen.add(s.localId)
    if (s.id) seen.add(s.id)
  }
  for (const l of localItems || []) {
    if (!l || seen.has(l.id)) continue
    out.push({ ...l, synced: false })
  }
  return out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}
