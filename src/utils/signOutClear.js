// WHAT SIGN-OUT LEAVES BEHIND ON A SHARED MACHINE, AND WHAT IT DOES NOT.
//
// The next person to open this browser can read anything left in its storage.
// accountSync.releaseCache has always removed the keys that sync with the
// account (theme, prompts, the working design, ...). This module covers the
// rest of what belongs to the person who just signed out:
//
//   · their cached profile (email, bio, company, location)       vs-profile-cache
//   · the list of accounts used here (email, name, photo)        vs-accounts
//   · their saved projects and the other locally held work       vs-projects, ...
//   · per-visit leftovers in sessionStorage
//
// ONE LIST. The decision is taken from STORAGE_INVENTORY in accountSync.js, the
// registry tests/unit/account-sync.test.js already forces every `vs-` key into,
// so a key added tomorrow has to be classified there and lands here by its
// scope. Only the exceptions to the scope rule are named below.
//
// KEPT, on purpose: preferences that describe the browser rather than a person
// (`device` scope: which Settings tab was open, icon preview ground, local
// usage meters), the public catalogues, and the legacy gradient list that
// earlier signed-out visits left (it is moved to an account only when whoever
// signs in says it is theirs, so it is not the signing-out person's to delete).
//
// WHEN. Two rules decide what goes:
//   · Always: the profile cache entry for the account, the accounts list
//     unless the person asked for it to be remembered, and per-visit keys.
//   · Their saved work: only when it is safe to lose, i.e. everything the
//     account holds has reached the account (releaseCache released and no sync
//     failure is standing), or the person chose to discard. Otherwise it stays
//     and goes up the next time that same account signs in here, the promise
//     the sign-out prompt already makes.
//
// DOM-free: takes Storage-like objects so every rule is unit-testable.

import { STORAGE_INVENTORY } from './accountSync.js'

export const PROFILE_CACHE_KEY = 'vs-profile-cache'
export const ACCOUNTS_KEY = 'vs-accounts'
export const REMEMBER_DEVICE_KEY = 'vs-remember-device'

// Inventory scopes whose keys hold a person's own work or account facts.
const WORK_SCOPES = new Set(['account', 'account-other', 'account-mirror'])

// Exceptions to the scope rule: kept in a scope that is otherwise "device" or
// "cache" but holding the person's own content.
const WORK_BY_NAME = Object.freeze([
  'vs-palette-history', // undo log of the palette board: the designs themselves
  'vs-feedback', // copies of feedback sent from this browser
  'vs-admin-unlocked', // admin screen unlock must not pass to the next person
  'vs-community-submissions', // local copy of what they submitted
  'vs-icon-submissions',
  'vs-state-shades', // derived from their working design
  'ab-palette-transfer', // legacy palette hand-off, not in the inventory
])

// Handled by their own rules below, not by the generic sweep.
const SPECIAL = new Set([PROFILE_CACHE_KEY, ACCOUNTS_KEY])

/** localStorage keys removed once the person's work is safe to lose. */
export const SIGN_OUT_LOCAL_KEYS = Object.freeze([...new Set([
  ...Object.entries(STORAGE_INVENTORY)
    .filter(([key, spec]) => WORK_SCOPES.has(spec.scope) && !SPECIAL.has(key))
    .map(([key]) => key),
  ...WORK_BY_NAME,
])])

/**
 * sessionStorage keys (exact, or `<name>:<anything>`) removed at every
 * sign-out. All are about the visit of the account that just left.
 */
export const SIGN_OUT_SESSION_KEYS = Object.freeze([
  'vs-verify-dismissed',
  'vs-billing-dismissed',
  'vs-gradient-keep-dismissed',
  'vs-pending-save',
  'vs-resume-after-onboarding',
  'vs-icon-draft',
])

const matchesSessionKey = (key) => SIGN_OUT_SESSION_KEYS.some((name) => key === name || key.startsWith(`${name}:`))

// ── "Remember accounts on this device" (opt-in) ─────────────────────────────

export function isRememberDevice(storage) {
  try { return storage?.getItem(REMEMBER_DEVICE_KEY) === '1' } catch { return false }
}

/** Returns false when the choice could not be stored (storage blocked or full). */
export function setRememberDevice(storage, on) {
  try {
    if (on) storage.setItem(REMEMBER_DEVICE_KEY, '1')
    else storage.removeItem(REMEMBER_DEVICE_KEY)
    return true
  } catch { return false }
}

// ── "Sign out and discard what has not reached my account" ──────────────────
//
// The sign-out buttons ask for this before they call logout(); the auth-state
// change that follows is seen by useFirestoreSync, which takes the request. It
// expires, so a sign-out that failed cannot turn a later, unrelated one into a
// discard.

export const DISCARD_REQUEST_TTL_MS = 60_000
let discardAskedAt = 0

export function requestDiscardOnSignOut(now = Date.now()) { discardAskedAt = now }
export function cancelDiscardRequest() { discardAskedAt = 0 }

/** True once per request, and only while it is fresh. */
export function takeDiscardRequest(now = Date.now()) {
  const fresh = discardAskedAt > 0 && now - discardAskedAt < DISCARD_REQUEST_TTL_MS
  discardAskedAt = 0
  return fresh
}

// ── The clearing ────────────────────────────────────────────────────────────

function presentAndRemove(store, key, removed) {
  try {
    if (!store || store.getItem(key) === null) return
    store.removeItem(key)
    removed.push(key)
  } catch { /* storage blocked: nothing more can be done for this key */ }
}

// Remove one account's entry from the uid-keyed profile cache. `all` drops the
// whole cache (nobody is remembered, so no entry is anybody's to keep).
function forgetCachedProfile(local, uid, all, removed) {
  if (all) { presentAndRemove(local, PROFILE_CACHE_KEY, removed); return }
  try {
    const raw = local?.getItem(PROFILE_CACHE_KEY)
    if (raw === null || raw === undefined) return
    let cache
    try { cache = JSON.parse(raw) } catch { cache = null }
    if (!cache || typeof cache !== 'object' || Array.isArray(cache)) { presentAndRemove(local, PROFILE_CACHE_KEY, removed); return }
    if (!uid || !(uid in cache)) return
    delete cache[uid]
    if (Object.keys(cache).length) local.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache))
    else local.removeItem(PROFILE_CACHE_KEY)
    removed.push(PROFILE_CACHE_KEY)
  } catch { /* storage blocked */ }
}

/**
 * Remove what the person who just signed out left in this browser.
 *
 * @param local          localStorage-like
 * @param session        sessionStorage-like (may be null)
 * @param uid            the account that signed out
 * @param workIsSafeToLose  true when the account holds everything, or the person
 *                       chose to discard; false keeps their saved work here
 * @returns {string[]}   the keys that were actually removed (for the "storage
 *                       changed" announcement the providers listen to)
 */
export function clearAtSignOut({ local, session = null, uid = null, workIsSafeToLose = false } = {}) {
  const removed = []
  const remembered = isRememberDevice(local)

  forgetCachedProfile(local, uid, !remembered, removed)
  if (!remembered) presentAndRemove(local, ACCOUNTS_KEY, removed)

  if (workIsSafeToLose) {
    for (const key of SIGN_OUT_LOCAL_KEYS) presentAndRemove(local, key, removed)
  }

  if (session) {
    const keys = []
    try { for (let i = 0; i < session.length; i++) { const k = session.key(i); if (k && matchesSessionKey(k)) keys.push(k) } } catch { /* blocked */ }
    for (const key of keys) presentAndRemove(session, key, removed)
  }
  return removed
}
