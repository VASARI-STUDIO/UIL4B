// Explicit .js extensions: this module is exercised directly by node --test,
// which (unlike Vite) will not guess them.
import { getOwnerHandle, getPublicOwner, PUBLIC_OWNER_ID } from './constants.js'
import { buildQueueRecord } from './communityQueue.js'

// LEGACY reader and one-way migration for the old browser-held gradient queue.
//
// Gradient submissions used to be written to localStorage (`vs-gradient-submissions`)
// and nowhere else. Community submissions are now account-connected: they live in
// the shared review queue (communityQueue.js) under the signer's uid, where a
// reviewer can act on them. Nothing writes this key any more. This module only
// reads what earlier visits left behind, and moves it to the signed-in account
// once, so no gradient anyone queued is lost.
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
  return {
    id: clean(rest.id, 60) || `g${Date.now()}`,
    name: clean(rest.name, 60) || 'Untitled gradient',
    author: clean(owner?.publicHandle || rest.author, 40) || 'Community member',
    ownerId: owner ? PUBLIC_OWNER_ID : (clean(rest.ownerId, 60) || undefined),
    note: clean(rest.note, 200),
    type: TYPES.includes(rest.type) ? rest.type : 'Linear',
    angle: Math.max(0, Math.min(360, Math.round(Number(rest.angle)) || 0)),
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

/**
 * Move the browser-held gradients to the signed-in account's review queue.
 *
 * `list` and `publish` are passed in (listMySubmissions and publishToQueue) so
 * this stays testable without Firebase.
 *
 *  - The account's existing gradient submissions are listed FIRST. If that
 *    fails nothing is published and the key stays: without the list there is
 *    no way to tell what already reached the queue, and a duplicate in front
 *    of a reviewer is worse than a retry next session.
 *  - An entry whose id matches a queued submission's `localId` is skipped. Old
 *    submissions were published with that id, so they are already there.
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
  const seen = new Set(queued.map(s => s?.localId).filter(Boolean))

  // Oldest first, so the queue's own timestamps keep the order they were made in.
  for (const item of [...raw].reverse()) {
    const entry = sanitizeGradientSubmission(item)
    if (!entry || entry.status === 'withdrawn' || seen.has(entry.id)) {
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
      await publish({ ...record, localId: entry.id })
      result.published += 1
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
