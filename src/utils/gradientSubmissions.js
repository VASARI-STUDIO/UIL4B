// Explicit .js extensions: this module is exercised directly by node --test,
// which (unlike Vite) will not guess them.
import { getOwnerHandle, getPublicOwner, PUBLIC_OWNER_ID } from './constants.js'
import { buildQueueRecord } from './communityQueue.js'

// LEGACY reader and one-way migration for the old browser-held gradient queue.
//
// Gradient submissions used to be written to localStorage (`vs-gradient-submissions`)
// and nowhere else. Community submissions are now account-connected: they live in
// the shared review queue (communityQueue.js) under the signer's uid, where a
// reviewer can act on them. Nothing adds to this key any more. This module reads
// what earlier visits left behind and, when the signed-in person says the
// gradients are theirs, moves them to the account once, so no gradient anyone
// queued is lost. It never moves them unasked: a shared machine's browser can
// hold someone else's work. The one write is removing an entry the person
// withdrew from the account.
//
// The honesty rule is unchanged: nothing here can put itself in the library. The
// queue record built for each entry is always 'pending' (buildQueueRecord), and
// firestore.rules refuses a client-written document that claims anything else.

export const GRADIENT_SUBMISSIONS_KEY = 'vs-gradient-submissions'

// Old writers capped the list here. Reading honours the same cap so a corrupt
// or hand-edited key can't make the migration publish an unbounded batch.
export const GRADIENT_SUBMISSIONS_MAX = 30

export const GRADIENT_SUBMISSION_STATUSES = ['pending', 'withdrawn']

const TYPES = ['Linear', 'Radial', 'Conic']
const MAX_STOPS = 12

function resolveStorage(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null)
}

const clean = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

function sanitizeStops(stops) {
  if (!Array.isArray(stops)) return null
  const safe = stops
    .filter(s => s && typeof s === 'object' && /^#[0-9a-fA-F]{6}$/.test(s.color))
    .slice(0, MAX_STOPS)
    .map(s => ({
      color: s.color.toUpperCase(),
      position: Math.max(0, Math.min(100, Math.round(Number(s.position)) || 0)),
    }))
  return safe.length >= 2 ? safe : null
}

// A short, stable id for an entry that was stored without one: the same
// gradient always gets the same id, so two tabs (or a retry) agree on it and the
// account's document id (queueDocId) is the same every time. FNV-1a over the
// parts that make a gradient what it is.
function stableGradientId(name, type, angle, stops) {
  const text = `${name}|${type}|${angle}|${stops.map(s => `${s.color}@${s.position}`).join(',')}`
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `gh${h.toString(36)}`
}

// Anything that fails to describe a real gradient is dropped rather than kept
// half-formed — a corrupt entry must never reach the gallery renderer or the queue.
export function sanitizeGradientSubmission(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const stops = sanitizeStops(item.stops)
  if (!stops) return null
  const { authorEmail, ...rest } = item
  const owner = getOwnerHandle(authorEmail) || getPublicOwner(rest.ownerId)
  const status = GRADIENT_SUBMISSION_STATUSES.includes(rest.status) ? rest.status : 'pending'
  const submittedAt = Number(rest.submittedAt)
  const name = clean(rest.name, 60) || 'Untitled gradient'
  const type = TYPES.includes(rest.type) ? rest.type : 'Linear'
  const angle = Math.max(0, Math.min(360, Math.round(Number(rest.angle)) || 0))
  return {
    id: clean(rest.id, 60) || stableGradientId(name, type, angle, stops),
    name,
    author: clean(owner?.publicHandle || rest.author, 40) || 'Community member',
    ownerId: owner ? PUBLIC_OWNER_ID : (clean(rest.ownerId, 60) || undefined),
    note: clean(rest.note, 200),
    type,
    angle,
    stops,
    status,
    submittedAt: Number.isFinite(submittedAt) && submittedAt > 0 ? submittedAt : Date.now(),
  }
}

// The stored array exactly as parsed, newest first, or null when the key is
// missing, unreadable or not a list. Never writes.
function readRawLegacy(storage) {
  try {
    const parsed = JSON.parse(resolveStorage(storage)?.getItem(GRADIENT_SUBMISSIONS_KEY) || 'null')
    return Array.isArray(parsed) ? parsed.slice(0, GRADIENT_SUBMISSIONS_MAX) : null
  } catch {
    return null
  }
}

/**
 * The gradients an earlier visit queued in this browser, sanitised, newest
 * first. Read-only: unlike the old reader it does not write the cleaned list
 * back, so merely looking at the key can never change or lose what is in it.
 */
export function readLegacyGradientSubmissions(storage) {
  return (readRawLegacy(storage) || []).map(sanitizeGradientSubmission).filter(Boolean)
}

export function clearGradientSubmissions(storage) {
  try { resolveStorage(storage)?.removeItem(GRADIENT_SUBMISSIONS_KEY) } catch { /* disabled */ }
}

/** How many browser-held gradients could still be moved (withdrawn ones excluded). */
export function countLegacyGradientSubmissions(storage) {
  return readLegacyGradientSubmissions(storage).filter(g => g.status !== 'withdrawn').length
}

/**
 * Forget one browser-held entry, by the id the queue knows it as (`localId`).
 * This is what makes a withdrawal stick: a gradient the person withdrew from
 * the account must not be found in this key and published again. The only
 * write this module makes; it removes, never adds, and leaves the rest of the
 * list exactly as stored.
 */
export function removeLegacyGradientSubmission(localId, storage) {
  const target = resolveStorage(storage)
  const raw = readRawLegacy(target)
  if (!raw || !localId) return false
  const kept = raw.filter(item => sanitizeGradientSubmission(item)?.id !== localId)
  if (kept.length === raw.length) return false
  try {
    if (kept.length === 0) target.removeItem(GRADIENT_SUBMISSIONS_KEY)
    else target.setItem(GRADIENT_SUBMISSIONS_KEY, JSON.stringify(kept))
    return true
  } catch {
    return false
  }
}

// The account's document id for a browser-held gradient. Fixed by who owns it
// and which entry it is, so publishing the same entry twice (two tabs, a
// retry) targets one document instead of making two. Firestore ids may not
// contain "/", so anything outside a safe set becomes "_".
export function queueDocId(uid, localId) {
  return `${uid}_${String(localId).replace(/[^A-Za-z0-9_-]/g, '_')}`
}

// "Not mine" on a shared machine: stop asking about the browser-held gradients
// for this account until the tab session ends. Per uid, in sessionStorage, so
// another account on the same machine is still asked and the question returns
// next visit.
const MIGRATION_DISMISS_PREFIX = 'vs-gradient-keep-dismissed:'

function sessionStore(storage) {
  return storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
}

export function readMigrationDismissed(uid, storage) {
  if (!uid) return false
  try { return sessionStore(storage)?.getItem(MIGRATION_DISMISS_PREFIX + uid) === '1' } catch { return false }
}

export function writeMigrationDismissed(uid, storage) {
  if (!uid) return
  try { sessionStore(storage)?.setItem(MIGRATION_DISMISS_PREFIX + uid, '1') } catch { /* the question returns on reload */ }
}

/**
 * Move the browser-held gradients to the signed-in account's review queue.
 *
 * `list` and `publish` are passed in (listMySubmissions and publishToQueueOnce)
 * so this stays testable without Firebase. `publish(record, { id })` writes the
 * document at that id and answers `{ created: false }` when it was already there.
 *
 * Call it only once the person has said the gradients are theirs (a shared
 * machine's browser can hold someone else's).
 *
 *  - The account's existing gradient submissions are listed FIRST. If that
 *    fails nothing is published and the key stays: without the list there is
 *    no way to tell what already reached the queue, and a duplicate in front
 *    of a reviewer is worse than a retry next session.
 *  - An entry whose id matches a queued submission's `localId` (or its document
 *    id) is skipped. Old submissions were published with that id, so they are
 *    already there.
 *  - Entries that do not sanitise to a real gradient, ones the person had
 *    withdrawn, and repeats within the key are skipped too.
 *  - The key is removed only when every publish succeeded. One failure keeps
 *    it, and the next run skips what did get through (by localId).
 *
 * Only the gradient itself (type, angle, stops) and its name go to the queue,
 * plus the display name buildQueueRecord adds. The email never does.
 *
 * Returns { published, skipped, failed, cleared, listFailed }.
 */
export async function migrateGradientSubmissions({ user, storage, list, publish } = {}) {
  const result = { published: 0, skipped: 0, failed: 0, cleared: false, listFailed: false }
  if (!user?.uid || typeof list !== 'function' || typeof publish !== 'function') return result
  const target = resolveStorage(storage)
  const raw = readRawLegacy(target)
  if (!raw) return result                 // nothing readable: leave the key alone
  if (raw.length === 0) {                 // an emptied list is just clutter
    clearGradientSubmissions(target)
    result.cleared = true
    return result
  }

  let queued
  try {
    queued = await list(user.uid, 'gradient')
    if (!Array.isArray(queued)) throw new Error('Unexpected listing')
  } catch {
    result.listFailed = true
    return result
  }
  // Matched on the local id an older publish carried and on the document id a
  // publish by this module uses, so both generations count as already there.
  const seen = new Set(queued.flatMap(s => [s?.localId, s?.id]).filter(Boolean))

  // The list took a network round trip: another tab may have published, withdrawn
  // or cleared entries meanwhile, so what is published is what the key holds now.
  const current = readRawLegacy(target)
  if (!current) return result
  if (current.length === 0) {
    clearGradientSubmissions(target)
    result.cleared = true
    return result
  }

  // Oldest first, so the queue's own timestamps keep the order they were made in.
  for (const item of [...current].reverse()) {
    const entry = sanitizeGradientSubmission(item)
    const docId = entry && queueDocId(user.uid, entry.id)
    if (!entry || entry.status === 'withdrawn' || seen.has(entry.id) || seen.has(docId)) {
      result.skipped += 1
      continue
    }
    seen.add(entry.id)
    const record = buildQueueRecord({
      kind: 'gradient',
      name: entry.name,
      user,
      payload: { type: entry.type, angle: entry.angle, stops: entry.stops },
    })
    if (!record) { result.failed += 1; continue }
    try {
      // The document id is fixed (queueDocId), so a second tab or a retry that
      // reaches here for the same entry cannot make a second document. A publish
      // that finds it already there says `created: false`.
      const out = await publish({ ...record, localId: entry.id }, { id: docId })
      if (out && out.created === false) result.skipped += 1
      else result.published += 1
    } catch {
      result.failed += 1
    }
  }

  if (result.failed === 0) {
    clearGradientSubmissions(target)
    result.cleared = true
  }
  return result
}
