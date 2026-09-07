// WHAT THE USER IS TOLD WHEN SYNC STOPS, OR WHEN TWO DEVICES DISAGREED.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS IS A STORE AND NOT A PIECE OF CONTEXT STATE
// ═══════════════════════════════════════════════════════════════════════════
// Two independent things sync this account's data and BOTH used to fail into an
// empty catch:
//
//   · ProjectContext.jsx  — users/{uid}/sync/projects (the saved projects)
//   · useFirestoreSync.js — users/{uid}/sync/data     (the current design,
//                            prompts, pinned tools, language, appearance)
//
// The second is mounted in App.jsx, a level above every provider, and the first
// is a provider. Neither can see the other, and a person whose preferences have
// stopped syncing needs the same sentence as one whose projects have — so the
// message has to live somewhere both can reach and one component can render.
//
// This is the defect the feedback queue's permission refusal hid behind this
// week, and the rule that came out of it: SILENT SUCCESS IS WORSE THAN VISIBLE
// FAILURE. A store with two writers and one reader is the smallest thing that
// makes that true for both writers at once.
//
// ═══════════════════════════════════════════════════════════════════════════
// TWO LEVELS, BECAUSE THEY ARE DIFFERENT NEWS
// ═══════════════════════════════════════════════════════════════════════════
//   'error'  — sync is NOT happening. The user's work is safe on this device
//              and is not reaching their account. They can act on this (free a
//              slot, sign in again, get back online), so it stays until it is
//              fixed and it offers a retry.
//   'notice' — sync happened and CHANGED something under them: another device's
//              newer copy of a project replaced this one's, or a project
//              deleted elsewhere disappeared from here. Nothing is wrong and
//              nothing is lost, but a screen that rearranges itself without a
//              word is how people stop trusting sync. Dismissible.
//
// A channel holds at most one entry, and the newest report replaces the last —
// a debounced push that fails four times in a row is one problem, not four.

const entries = new Map()
const listeners = new Set()

/* THE SNAPSHOT IS CACHED, and it has to be.
 *
 * The reader is useSyncExternalStore, whose contract is that getSnapshot
 * returns a value that is `Object.is`-identical until something actually
 * changes. Building a fresh object on every call would make React believe the
 * store had changed on every render and re-render forever. So the snapshot is
 * rebuilt exactly once per mutation, in emit(). */
let snapshot = build()

function build() {
  const all = [...entries.entries()].map(([channel, e]) => ({ channel, ...e }))
  const errors = all.filter((e) => e.level === 'error')
  const notices = all.filter((e) => e.level === 'notice')
  return { errors, notices, first: errors[0] || notices[0] || null }
}

function emit() {
  snapshot = build()
  for (const fn of [...listeners]) {
    try { fn(snapshot) } catch { /* a bad subscriber must not stop the others */ }
  }
}

/**
 * Everything worth showing, worst first.
 * @returns {{ errors: Array, notices: Array, first: object|null }}
 */
export function getSyncState() {
  return snapshot
}

export function subscribeSync(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Sync is failing on this channel, and here is the sentence that says so.
 *
 * @param {string} channel  'projects' | 'preferences'
 * @param {string} message  written by projectSync.syncFailureMessage()
 * @param {function} [retry] called by the notice's Try again button
 */
export function reportSyncFailure(channel, message, retry) {
  entries.set(channel, { level: 'error', message, retry: retry || null, at: Date.now() })
  emit()
}

/** Sync changed something under the user; say what. */
export function reportSyncNotice(channel, message) {
  // An error is the more urgent news and must not be replaced by a conflict
  // notice arriving from the same channel a moment later.
  if (entries.get(channel)?.level === 'error') return
  entries.set(channel, { level: 'notice', message, retry: null, at: Date.now() })
  emit()
}

/** This channel is healthy again — but leave a notice the user has not read. */
export function reportSyncOk(channel) {
  if (entries.get(channel)?.level !== 'error') return
  entries.delete(channel)
  emit()
}

/** The user dismissed it, or a retry succeeded. */
export function clearSyncEntry(channel) {
  if (!entries.has(channel)) return
  entries.delete(channel)
  emit()
}

/** Test seam: forget everything. Never called from src/. */
export function resetSyncStatus() {
  entries.clear()
  emit()
}
