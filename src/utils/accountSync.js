// WHAT FOLLOWS THE ACCOUNT, AND HOW — the pure half of account-bound data.
//
// Settings and user-specific state follow the person across devices, not the
// browser. localStorage is the signed-out / offline cache; the account
// (Firestore, users/{uid}/sync/*) is the truth.
//
// DOM-free and React-free, so every rule below is unit-testable with a plain
// object standing in for localStorage. src/hooks/useFirestoreSync.js is the
// wiring: when to read, when to write, what to tell the screen.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE MODEL HAS TO HOLD
// ─────────────────────────────────────────────────────────────────────────────
//  1. SAME-TAB CHANGES REACH THE ACCOUNT. The `storage` event only fires in
//     OTHER tabs, so a change made in the one open tab has to be noticed some
//     other way.
//  2. THE SYNC STATE BELONGS TO THE PERSON, NOT THE BROWSER. The cache records
//     whose data it holds, and a signed-in account is only ever compared with,
//     and written from, its own.
//  3. SIGNED-OUT WORK MIGRATES UP on the next sign-in, without waiting for the
//     person to change that key again.
//  4. ONE CLOCK PER KEY. A theme change on the phone and a prompt added on the
//     laptop are independent; neither wins or loses for the other.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MODEL
// ─────────────────────────────────────────────────────────────────────────────
//  · Every account key has its OWN timestamp, on the device (`vs-sync-meta`) and
//    in the account document (`_stamps`). The newer side of each key wins.
//  · A change is noticed by LOOKING, not by being told: the hook compares the
//    stored string with the last one it saw. A list of writers that must each
//    remember to announce themselves is one forgotten call from point 1 failing.
//  · The cache has an OWNER — the uid whose data it mirrors, or null when it is
//    anonymous (never signed in, or released at sign-out). What happens on a
//    sign-in depends on it:
//      owner === uid   → SYNC: per-key newer-wins, both directions.
//      owner === null  → BIND (the first sign-in on this device, or the first
//                        since signing out): the local values MIGRATE UP under
//                        each key's `firstBind` rule, below.
//      owner is other  → SWITCH: the cache is somebody else's. Nothing of it goes
//                        up. The signed-in account's values replace it, and a key
//                        the account does not have is removed so its default
//                        applies.
//
// FIRST-BIND RULES, per key:
//  · 'account' — a setting. If the account already has one it wins; if it does
//                not, the local value goes up. (Your account's dark theme beats
//                the light default a fresh browser starts with.)
//  · 'local'   — the working design only. What is on screen at the moment of
//                sign-in is what the person was just working on — signing in is
//                exactly what the export gate asks for — so it wins and goes up.
//  · 'union'   — collections (prompts, likes, saves, custom icons, recents,
//                exports). Both sides are kept, de-duplicated by identity; the
//                recency lists keep local first and are capped.
//
// PER-ITEM STAMPS (`merge: 'stamped'`). A key whose value is a list of
// `{ id, at, … }` entries, where removing an item writes an entry saying so
// rather than dropping it, is merged ITEM BY ITEM on bind and sync alike: for
// each id the entry with the newer `at` wins. Two devices that each changed a
// different item both keep their change, and a removal cannot be undone by a
// device that never saw it. While either side still holds the list in an older
// shape (no `at` on its entries), the key falls back to the rules above.
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_DESIGN } from '../data/designDefaults.js'

/** Firestore documents under users/{uid}/sync/. `data` is the one the old hook wrote. */
export const SYNC_DOCS = Object.freeze(['data', 'library'])

/** Where this device keeps its owner, per-key stamps and last-seen fingerprints. */
export const META_KEY = 'vs-sync-meta'
/** The older single per-device clock. Read once for migration, then removed. */
export const LEGACY_STAMP_KEY = 'vs-sync-updatedAt'

// Every key that follows the account through THIS module. Projects and their
// tombstones follow it too, through ProjectContext and utils/projectSync.js,
// which have their own per-project merge; the profile follows it through
// AuthContext. Both are listed in STORAGE_INVENTORY below.
export const ACCOUNT_KEYS = Object.freeze([
  // Settings and preferences
  { key: 'vs-t', doc: 'data', firstBind: 'account' },
  { key: 'vs-lang', doc: 'data', firstBind: 'account' },
  { key: 'vs-appearance', doc: 'data', firstBind: 'account' },
  { key: 'vs-pinned-tools', doc: 'data', firstBind: 'account' },
  { key: 'vs-icon-stroke-px', doc: 'data', firstBind: 'account' },
  { key: 'vs-community-handle', doc: 'data', firstBind: 'account' },
  { key: 'vs-info-intro', doc: 'data', firstBind: 'account' },
  { key: 'vs-uikit-guide-seen', doc: 'data', firstBind: 'account' },
  // The working design
  { key: 'vs-current-design', doc: 'data', firstBind: 'local' },
  // Saved items and history
  { key: 'vs-prompts', doc: 'data', firstBind: 'union' },
  { key: 'vs-saved-prompt-ids', doc: 'data', firstBind: 'union', merge: 'stamped' },
  { key: 'vs-palette-likes', doc: 'data', firstBind: 'union' },
  { key: 'vs-gradient-likes', doc: 'data', firstBind: 'union' },
  { key: 'vs-community-saves', doc: 'data', firstBind: 'union' },
  { key: 'vs-recent-tools', doc: 'data', firstBind: 'union', recency: true, cap: 6 },
  { key: 'vs-recent-icons', doc: 'data', firstBind: 'union', recency: true, cap: 20 },
  { key: 'vs-recent-colors', doc: 'data', firstBind: 'union', recency: true, cap: 12 },
  { key: 'vs-recent-exports', doc: 'data', firstBind: 'union', recency: true, cap: 20 },
  // Custom icons carry SVG markup, so they get a document of their own rather
  // than pushing `data` toward Firestore's 1 MiB ceiling.
  { key: 'vs-custom-icons', doc: 'library', firstBind: 'union' },
])

export const ACCOUNT_KEY_NAMES = Object.freeze(ACCOUNT_KEYS.map((k) => k.key))

/**
 * Local keys that MIRROR an account fact kept elsewhere (the profile) and so
 * must not outlive the person they describe. Never pushed by this module;
 * cleared when the cache changes hands.
 */
export const ACCOUNT_MIRROR_KEYS = Object.freeze(['vs-onboarded'])

// ─────────────────────────────────────────────────────────────────────────────
// THE INVENTORY — every storage key in src/, and where it belongs.
// tests/unit/account-sync.test.js fails if a `vs-` key appears in src/ that is
// not classified here, so a new key has to be decided, not defaulted.
//
//   account         follows the account through this module
//   account-other   follows the account through another path (named)
//   account-mirror  a local copy of an account fact; cleared on sign-out/switch
//   device          honestly about this browser, not the person
//   session         sessionStorage, dies with the tab by design
//   cache           derived or server-owned data kept for speed; safe to lose
//   bookkeeping     this module's own state
//   unused          disclosed in utils/dataExport.js but no longer written
// ─────────────────────────────────────────────────────────────────────────────
export const STORAGE_INVENTORY = Object.freeze({
  'vs-t': { scope: 'account', why: 'Theme choice' },
  'vs-lang': { scope: 'account', why: 'Interface language' },
  'vs-appearance': { scope: 'account', why: 'Reduced motion and appearance' },
  'vs-pinned-tools': { scope: 'account', why: 'Tools the person pinned' },
  'vs-icon-stroke-px': { scope: 'account', why: 'Icon stroke preference' },
  'vs-community-handle': { scope: 'account', why: 'Their public community handle' },
  'vs-info-intro': { scope: 'account', why: 'Dismissed the /info intro — the person learned it, not the browser' },
  'vs-uikit-guide-seen': { scope: 'account', why: 'Has seen the brand-kit walkthrough' },
  'vs-current-design': { scope: 'account', why: 'The working design every Create tool edits' },
  'vs-prompts': { scope: 'account', why: 'Their prompt library' },
  'vs-saved-prompt-ids': { scope: 'account', why: 'Community prompts they saved' },
  'vs-palette-likes': { scope: 'account', why: 'Palettes they liked' },
  'vs-gradient-likes': { scope: 'account', why: 'Gradients they liked' },
  'vs-community-saves': { scope: 'account', why: 'Community designs they saved' },
  'vs-recent-tools': { scope: 'account', why: 'Recently used tools' },
  'vs-recent-icons': { scope: 'account', why: 'Recently viewed icons' },
  'vs-recent-colors': { scope: 'account', why: 'Recently used colours' },
  'vs-recent-exports': { scope: 'account', why: 'Recent exports' },
  'vs-custom-icons': { scope: 'account', why: 'Icons they customised and saved' },
  'vs-projects': { scope: 'account-other', why: 'Saved projects — ProjectContext → users/{uid}/sync/projects' },
  'vs-project-tombstones': { scope: 'account-other', why: 'Project deletes — ProjectContext, same document' },
  'vs-project-icons': { scope: 'account-other', why: 'Legacy map; each icon now lives ON its project (utils/projectIcons.js) and migrates there' },
  'vs-profile-cache': { scope: 'account-other', why: 'Cache of users/{uid}, which AuthContext owns; keyed by uid' },
  'vs-onboarded': { scope: 'account-mirror', why: 'Mirror of profile.onboarding.completedAt' },
  'vs-accounts': { scope: 'device', why: 'Accounts remembered on THIS device for the switcher' },
  'vs-google-returning': { scope: 'device', why: 'Has this browser used Google sign-in (One Tap hint)' },
  'vs-session': { scope: 'device', why: 'Synchronous "was signed in" hint for first paint' },
  'vs-settings-section': { scope: 'device', why: 'Which Settings tab this browser last showed' },
  'vs-prompt-tab': { scope: 'device', why: 'Which Prompt Library tab this browser last showed' },
  'vs-palette-history': { scope: 'device', why: 'Undo log of the palette board, rewritten every edit; the design itself syncs' },
  'vs-pinned-v': { scope: 'device', why: 'Pinned-tools migration marker for this browser' },
  'vs-icon-copy-day': { scope: 'device', why: 'Client-side daily copy meter (the server is not involved)' },
  'vs-uikit-guide': { scope: 'device', why: 'Mid-walkthrough position on this screen' },
  'vs-first-win-started': { scope: 'device', why: 'Time-to-value timer for local analytics' },
  'vs-analytics': { scope: 'device', why: 'In-browser usage counters' },
  'vs-sessions': { scope: 'device', why: 'In-browser session history' },
  'vs-design-analytics': { scope: 'device', why: 'In-browser design counters' },
  'vs-feedback': { scope: 'device', why: 'Local copies of feedback sent from this browser' },
  'vs-admin-unlocked': { scope: 'device', why: 'Admin screen unlock on this browser' },
  'vs-community-submissions': { scope: 'cache', why: 'Local copy; the submission itself is in Firestore' },
  'vs-gradient-submissions': { scope: 'cache', why: 'Local copy; the submission itself is in Firestore' },
  'vs-icon-submissions': { scope: 'cache', why: 'Local copy; the submission itself is in Firestore' },
  'vs-usage': { scope: 'cache', why: 'Per-tool AI counts; the server quota is the truth (vs-usage-<tool>-<date>)' },
  'vs-state-shades': { scope: 'cache', why: 'Derived from the working design' },
  'vs-gf-catalog': { scope: 'cache', why: 'Google Fonts catalogue' },
  'vs-billing-dismissed': { scope: 'session', why: 'Billing notice dismissed for this tab session' },
  'vs-resume-after-onboarding': { scope: 'session', why: 'Where to go after onboarding, this tab only' },
  'vs-chunk-reload': { scope: 'session', why: 'Reload-loop guard after a deploy' },
  'vs-sync-meta': { scope: 'bookkeeping', why: 'Owner, per-key stamps and fingerprints for this module' },
  'vs-sync-updatedAt': { scope: 'bookkeeping', why: 'Legacy device clock; migrated into vs-sync-meta and removed' },
  'vs-nav-open': { scope: 'unused', why: 'No writer in src/' },
  'vs-visited': { scope: 'unused', why: 'No writer in src/' },
  'vs-preview-device': { scope: 'unused', why: 'No writer in src/' },
  'vs-preview-rounding': { scope: 'unused', why: 'No writer in src/' },
  'vs-project-folders': { scope: 'unused', why: 'No writer in src/' },
  'vs-palette-session-seed': { scope: 'unused', why: 'Writer removed (PaletteBuilder)' },
  'vs-icon-stroke': { scope: 'unused', why: 'Pre-2.8 stroke units; read once as a fallback, never written' },
})

const REGISTRY = new Map(ACCOUNT_KEYS.map((k) => [k.key, k]))

// What a key holds before anyone has touched it. ProjectContext writes the
// default design to storage on its first render, so on a brand-new device the
// working design is PRESENT — and under the 'local' first-bind rule a present
// value wins. Without this, signing in on a second device would overwrite the
// account's real design with the blank one. An untouched default is treated as
// absent: it is not work anyone did.
export const UNTOUCHED_DEFAULTS = Object.freeze({
  'vs-current-design': DEFAULT_DESIGN,
  'vs-t': 'system',
})

export function isUntouched(key, value) {
  if (value === undefined || value === null) return true
  if (!Object.hasOwn(UNTOUCHED_DEFAULTS, key)) return false
  return sameValue(value, UNTOUCHED_DEFAULTS[key])
}

export function keySpec(key) {
  return REGISTRY.get(key) || null
}

// ── Values ──────────────────────────────────────────────────────────────────
// The stored form stays exactly what each writer already writes: vs-t is the
// bare string `dark`, vs-prompts is JSON. So a value is parsed when it parses
// and kept verbatim when it does not, and written back the same way the old
// hook wrote it.

export function decodeValue(raw) {
  if (raw === null || raw === undefined) return undefined
  try { return JSON.parse(raw) } catch { return raw }
}

export function encodeValue(value) {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

// CANONICAL, NOT RAW. Firestore does not promise to hand a map back with its
// keys in the order they were written, so two copies of one design could
// stringify differently. Compared raw, a device's own write echoed back looked
// like a change with an equal stamp — and was pushed again on every snapshot.
// Object keys are sorted; array order is kept, because in a list it is meaning.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = canonical(value[key])
    return out
  }
  return value
}

export function sameValue(a, b) {
  if (a === undefined || a === null) return b === undefined || b === null
  if (b === undefined || b === null) return false
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
}

/** A short fingerprint of a stored string, so the meta does not duplicate big values. */
export function fingerprint(raw) {
  if (raw === null || raw === undefined) return ''
  let h = 0x811c9dc5
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${raw.length}:${(h >>> 0).toString(36)}`
}

// ── Collections ─────────────────────────────────────────────────────────────

function identity(item) {
  if (item === null || typeof item !== 'object') return `v:${String(item)}`
  if (item.id !== undefined && item.id !== null) return `id:${String(item.id)}`
  if (item.key !== undefined && item.key !== null) return `key:${String(item.key)}`
  return `json:${JSON.stringify(item)}`
}

/**
 * Keep both sides, once each. `first` wins a duplicate and leads the order —
 * for a recency list that is the local side (it is what just happened here);
 * for everything else it is the account, with this device's additions after.
 */
export function unionList(first, second, cap) {
  const a = Array.isArray(first) ? first : []
  const b = Array.isArray(second) ? second : []
  const seen = new Set()
  const out = []
  for (const item of [...a, ...b]) {
    const id = identity(item)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return typeof cap === 'number' ? out.slice(0, cap) : out
}

/** True for a list whose every entry is `{ id, at }` (an empty list counts). */
export function isStampedList(value) {
  return Array.isArray(value) && value.every((e) => e && typeof e === 'object'
    && e.id !== undefined && e.id !== null && Number.isFinite(e.at))
}

/**
 * Merge two stamped lists item by item: for each id the entry with the newer
 * `at` wins. A tie is settled on the entries' canonical text, so both devices
 * reach the same answer. The result is sorted by id, so equal content always
 * compares equal.
 */
export function mergeStamped(a, b) {
  const byId = new Map()
  for (const entry of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const key = String(entry.id)
    const held = byId.get(key)
    if (!held || entry.at > held.at
      || (entry.at === held.at && JSON.stringify(canonical(entry)) < JSON.stringify(canonical(held)))) {
      byId.set(key, entry)
    }
  }
  return [...byId.values()].sort((x, y) => (String(x.id) < String(y.id) ? -1 : String(x.id) > String(y.id) ? 1 : 0))
}

// ── Stamps ──────────────────────────────────────────────────────────────────

/**
 * The time the ACCOUNT last changed `key`.
 *
 * A document written by this module carries `_stamps`. A document written by
 * the old hook carries only `_updatedAt` — and so does one written by an old
 * tab still open on another device AFTER a new client wrote `_stamps`, which
 * shows up as `_updatedAt` newer than every stamp. In both cases the whole
 * document is one change at `_updatedAt`, which is exactly what the old writer
 * meant by it.
 */
export function remoteStamp(docData, key) {
  if (!docData) return 0
  const updatedAt = Number(docData._updatedAt) || 0
  const stamps = docData._stamps && typeof docData._stamps === 'object' ? docData._stamps : null
  if (!stamps) return updatedAt
  const newest = Math.max(0, ...Object.values(stamps).map((v) => Number(v) || 0))
  if (updatedAt > newest) return updatedAt
  return Number(stamps[key]) || 0
}

// ── Meta ────────────────────────────────────────────────────────────────────

export function emptyMeta() {
  return { v: 2, owner: null, stamps: {}, pushed: {}, prints: {} }
}

export function readMeta(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(META_KEY) || 'null')
    if (parsed && parsed.v === 2) {
      return {
        v: 2,
        owner: typeof parsed.owner === 'string' && parsed.owner ? parsed.owner : null,
        stamps: parsed.stamps && typeof parsed.stamps === 'object' ? parsed.stamps : {},
        pushed: parsed.pushed && typeof parsed.pushed === 'object' ? parsed.pushed : {},
        prints: parsed.prints && typeof parsed.prints === 'object' ? parsed.prints : {},
      }
    }
  } catch { /* fall through to a fresh meta */ }
  return emptyMeta()
}

export function writeMeta(storage, meta) {
  try { storage?.setItem(META_KEY, JSON.stringify(meta)) } catch { /* quota: next tick retries */ }
}

export function readLocal(storage, keys = ACCOUNT_KEY_NAMES) {
  const out = {}
  for (const key of keys) {
    let raw = null
    try { raw = storage?.getItem(key) ?? null } catch { raw = null }
    out[key] = decodeValue(raw)
  }
  return out
}

/**
 * NOTICE LOCAL CHANGES. Compares every account key's stored string with the
 * fingerprint last recorded for it; a difference is a change made on this
 * device, stamped `now`. Returns the keys that changed (empty when none).
 *
 * The first look at a key this device has never fingerprinted (a fresh meta,
 * or one migrated from the old clock) is NOT a change unless it carries a
 * value — "absent, and never seen" is not an edit.
 */
export function detectLocalChanges(storage, meta, now = Date.now()) {
  const changed = []
  for (const key of ACCOUNT_KEY_NAMES) {
    let raw = null
    try { raw = storage?.getItem(key) ?? null } catch { raw = null }
    const print = fingerprint(raw)
    const known = Object.hasOwn(meta.prints, key)
    if (known && meta.prints[key] === print) continue
    if (!known && print === '') { meta.prints[key] = print; continue }
    meta.prints[key] = print
    meta.stamps[key] = now
    changed.push(key)
  }
  return changed
}

/** Keys changed here that the account has not yet been sent. */
export function pendingKeys(meta) {
  return ACCOUNT_KEY_NAMES.filter((k) => (Number(meta.stamps[k]) || 0) > (Number(meta.pushed[k]) || 0))
}

// ── Reconcile ───────────────────────────────────────────────────────────────

/**
 * Decide, for one sign-in or one incoming snapshot, what to write locally and
 * whether to push.
 *
 * @param uid       the signed-in account
 * @param meta      this device's meta (owner, stamps) — not mutated
 * @param local     { key: value|undefined } as stored now
 * @param remote    { docId: documentData|null } — only the docs that were read
 * @param now       clock for stamps created by a merge
 * @returns {{ mode, apply, stamps, owner, push }}
 *   apply   { key: value|null } to write locally (null removes the key)
 *   stamps  the per-key stamps after the decision
 *   push    true when the account is behind this device on any key
 */
export function reconcile({ uid, meta, local, remote, now = Date.now() }) {
  const mode = meta.owner === uid ? 'sync' : meta.owner ? 'switch' : 'bind'
  const apply = {}
  const stamps = { ...meta.stamps }
  let push = false

  for (const spec of ACCOUNT_KEYS) {
    const { key, doc } = spec
    if (!Object.hasOwn(remote, doc)) continue // that document was not read this round
    const docData = remote[doc]
    const hasRemote = !!docData && Object.hasOwn(docData, key)
    const r = hasRemote ? docData[key] : undefined
    const rs = remoteStamp(docData, key)
    const l = local[key]
    const ls = Number(meta.stamps[key]) || 0
    const rAbsent = r === undefined || r === null
    const lUntouched = isUntouched(key, l)

    if (mode === 'switch') {
      // Somebody else's cache. None of it goes up; the account replaces it.
      if (!sameValue(l, r)) apply[key] = rAbsent ? null : r
      stamps[key] = rs
      continue
    }

    if (sameValue(l, r)) { stamps[key] = Math.max(ls, rs); continue }

    // Per-item stamps: both sides keep what they know, whichever mode.
    if (spec.merge === 'stamped' && isStampedList(l) && (rAbsent || isStampedList(r))) {
      const merged = mergeStamped(l, rAbsent ? [] : r)
      if (!sameValue(merged, l)) apply[key] = merged
      if (sameValue(merged, r)) {
        stamps[key] = Math.max(ls, rs)
      } else {
        stamps[key] = Math.max(now, ls, rs)
        push = true
      }
      continue
    }

    if (mode === 'bind') {
      if (rAbsent) { stamps[key] = ls || now; push = true; continue }
      if (lUntouched) { apply[key] = r; stamps[key] = rs; continue }
      if (spec.firstBind === 'account') { apply[key] = r; stamps[key] = rs; continue }
      if (spec.firstBind === 'local') { stamps[key] = now; push = true; continue }
      // union
      const merged = spec.recency ? unionList(l, r, spec.cap) : unionList(r, l, spec.cap)
      if (!sameValue(merged, l)) apply[key] = merged
      if (!sameValue(merged, r)) push = true
      stamps[key] = now
      continue
    }

    // mode === 'sync': the newer side of each key wins.
    if (rs > ls) {
      apply[key] = rAbsent ? null : r
      stamps[key] = rs
    } else {
      // Local is newer, or the account never had it: the account is behind.
      stamps[key] = ls || now
      push = true
    }
  }

  return { mode, apply, stamps, owner: uid, push }
}

/**
 * The whole document for one sync doc, from what is stored locally now. Whole,
 * not a patch: a value and its stamp always travel together, so two devices
 * racing can never leave a document whose `_stamps` describe values it does
 * not hold. `_updatedAt` is kept for the old hook, which reads nothing else.
 */
export function buildDoc(docId, local, stamps) {
  const out = { _schema: 2, _stamps: {} }
  let newest = 0
  for (const spec of ACCOUNT_KEYS) {
    if (spec.doc !== docId) continue
    const value = local[spec.key]
    out[spec.key] = value === undefined ? null : value
    const s = Number(stamps[spec.key]) || 0
    out._stamps[spec.key] = s
    if (s > newest) newest = s
  }
  out._updatedAt = newest
  return out
}

export function docsForKeys(keys) {
  const docs = new Set()
  for (const key of keys) {
    const spec = REGISTRY.get(key)
    if (spec) docs.add(spec.doc)
  }
  return [...docs]
}

/**
 * Write `apply` into storage and record each new value's fingerprint, so the
 * next look does not mistake the account's value for a local edit.
 */
export function applyToStorage(storage, meta, apply) {
  const written = []
  for (const [key, value] of Object.entries(apply)) {
    const raw = encodeValue(value)
    try {
      if (raw === null) storage?.removeItem(key)
      else storage?.setItem(key, raw)
      written.push(key)
    } catch { /* quota: the key stays as it was, and so does its print */ continue }
    meta.prints[key] = fingerprint(raw)
  }
  return written
}

/**
 * RELEASE THE CACHE at sign-out. The account keys and their mirrors are
 * removed and the owner is cleared, so the next person on this browser starts
 * from defaults and their own sign-in migrates THEIR work, not the last
 * person's.
 *
 * Refused — returns false and changes nothing — while any key has a change the
 * account has not received. After sign-out it can no longer be sent (the rules
 * need the owner's token), so deleting it would lose it; kept, it goes up the
 * next time that same account signs in here.
 */
export function releaseCache(storage, meta) {
  if (pendingKeys(meta).length) return { released: false, keys: [] }
  const keys = [...ACCOUNT_KEY_NAMES, ...ACCOUNT_MIRROR_KEYS]
  for (const key of keys) {
    try { storage?.removeItem(key) } catch { /* nothing to do */ }
  }
  const fresh = emptyMeta()
  for (const key of ACCOUNT_KEY_NAMES) fresh.prints[key] = ''
  Object.assign(meta, fresh)
  return { released: true, keys }
}

/** Mirror keys cleared when the cache changes hands (switch). */
export function clearMirrors(storage) {
  for (const key of ACCOUNT_MIRROR_KEYS) {
    try { storage?.removeItem(key) } catch { /* nothing to do */ }
  }
}
