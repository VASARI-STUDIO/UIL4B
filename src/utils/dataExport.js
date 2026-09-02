// "Export my data" — everything we hold, not everything someone remembered to
// list.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (2026-08-12 account lifecycle audit § A4)
// ─────────────────────────────────────────────────────────────────────────────
// The export iterated a HAND-MAINTAINED list of 15 keys. The app writes roughly
// forty. Measured on a real browser: 16 keys present, 9 of them absent from the
// list and therefore silently missing from a file the user was told was their
// data. `vs-accounts` — email, display name and photo URL for up to five
// accounts — was neither disclosed, exported, nor cleared.
//
// It also read localStorage and nothing else, so for a signed-in user it
// omitted the Firestore profile and `users/{uid}/sync/data`, which is where
// their projects, prompts and current design actually live.
//
// THE RULE: enumerate by PREFIX, never by list. A list is a promise that
// someone will remember to update it, and that promise had already been broken
// nine times. Anything we store is namespaced, so anything namespaced gets
// exported — including keys added after this file was written.
//
// DOM-free: takes plain storage-like objects so the collection rules are
// testable without a browser.

// Everything the app writes is namespaced `vs-`. `ab-palette-transfer` is the
// one legacy exception (an A/B palette hand-off predating the convention);
// named explicitly so it cannot be lost, and so the exception is visible.
export const OWNED_PREFIXES = Object.freeze(['vs-'])
export const OWNED_EXACT = Object.freeze(['ab-palette-transfer'])

export function isOwnedKey(key) {
  if (typeof key !== 'string' || !key) return false
  return OWNED_EXACT.includes(key) || OWNED_PREFIXES.some((p) => key.startsWith(p))
}

// What each key is for, in plain English. Anything NOT in here is still
// exported and still disclosed — it just shows an honest "not yet described"
// rather than being dropped, which is what the old list-driven version did.
export const KEY_PURPOSES = Object.freeze({
  'vs-lang': { purpose: 'Selected interface language', pii: 'no' },
  'vs-appearance': { purpose: 'Reduced-motion and appearance preferences', pii: 'no' },
  'vs-t': { purpose: 'Selected theme', pii: 'no' },
  'vs-nav-open': { purpose: 'Sidebar category state', pii: 'no' },
  'vs-pinned-tools': { purpose: 'Tools you pinned for quick access', pii: 'no' },
  'vs-pinned-v': { purpose: 'Pinned-tools schema version', pii: 'no' },
  'vs-recent-tools': { purpose: 'Recently used tools list', pii: 'no' },
  'vs-visited': { purpose: 'Which surfaces you have opened before', pii: 'no' },
  'vs-current-design': { purpose: 'Active palette, fonts and type scale', pii: 'no' },
  'vs-projects': { purpose: 'Saved design projects', pii: 'local' },
  'vs-project-folders': { purpose: 'Project folder organisation', pii: 'local' },
  'vs-project-icons': { purpose: 'Icons saved into projects', pii: 'local' },
  'vs-custom-icons': { purpose: 'Icons you customised and saved', pii: 'local' },
  'vs-recent-icons': { purpose: 'Recently viewed icons', pii: 'no' },
  'vs-icon-stroke': { purpose: 'Icon stroke-width preference (pre-2.8 viewBox units)', pii: 'no' },
  'vs-icon-stroke-px': { purpose: 'Icon stroke-width preference, in pixels', pii: 'no' },
  'vs-icon-copy-day': { purpose: 'Daily icon copy counter', pii: 'no' },
  'vs-prompts': { purpose: 'Your AI prompt library', pii: 'local' },
  'vs-saved-prompt-ids': { purpose: 'Community prompts you saved', pii: 'no' },
  'vs-prompt-tab': { purpose: 'Last prompt library tab', pii: 'no' },
  'vs-community-submissions': { purpose: 'Designs submitted from this browser', pii: 'local' },
  'vs-community-saves': { purpose: 'Community designs you saved', pii: 'no' },
  'vs-community-handle': { purpose: 'Your public community handle', pii: 'local' },
  'vs-palette-history': { purpose: 'Palette Builder recovery history', pii: 'no' },
  'vs-palette-likes': { purpose: 'Palettes you liked', pii: 'no' },
  'vs-palette-session-seed': { purpose: 'Palette shuffle seed for this session', pii: 'no' },
  'vs-gradient-likes': { purpose: 'Gradients you liked', pii: 'no' },
  'vs-gradient-submissions': { purpose: 'Gradients submitted from this browser', pii: 'local' },
  'vs-state-shades': { purpose: 'Cached state colour shades', pii: 'no' },
  'vs-gf-catalog': { purpose: 'Cached Google Fonts catalogue', pii: 'no' },
  'vs-preview-device': { purpose: 'Preview device preference', pii: 'no' },
  'vs-preview-rounding': { purpose: 'Preview corner-rounding preference', pii: 'no' },
  'vs-profile-cache': { purpose: 'Cached copy of your profile', pii: 'yes' },
  // Was disclosed nowhere, exported nowhere, and left behind by "Clear local
  // data" — while holding an email address, display name and photo URL for up
  // to five accounts. The single worst omission the audit found.
  'vs-accounts': { purpose: 'Email, name and photo for accounts used on this device (up to five)', pii: 'yes' },
  'vs-google-returning': { purpose: 'Whether you have signed in with Google before', pii: 'no' },
  'vs-onboarded': { purpose: 'Whether you completed onboarding', pii: 'no' },
  'vs-resume-after-onboarding': { purpose: 'Where to send you after onboarding', pii: 'no' },
  'vs-sessions': { purpose: 'Local session history used for your own usage stats', pii: 'local' },
  'vs-analytics': { purpose: 'Local, in-browser usage counters', pii: 'local' },
  'vs-design-analytics': { purpose: 'Local counters about designs you have built', pii: 'local' },
  'vs-feedback': { purpose: 'Feedback drafts written in this browser', pii: 'local' },
  'vs-usage': { purpose: 'AI generations used, per tool per day', pii: 'no' },
  'vs-uikit-guide': { purpose: 'UI kit guide dismissal state', pii: 'no' },
  'vs-uib-intro-dismissed': { purpose: 'Builder intro dismissal state', pii: 'no' },
  'vs-info-intro': { purpose: 'Info page intro dismissal state', pii: 'no' },
  'vs-admin-unlocked': { purpose: 'Admin panel access flag', pii: 'no' },
  'vs-chunk-reload': { purpose: 'Guard against a reload loop after a deploy', pii: 'no' },
  'vs-billing-dismissed': { purpose: 'Billing notices dismissed this session', pii: 'no' },
  'ab-palette-transfer': { purpose: 'Palette handed between tools', pii: 'no' },
})

// Dated and per-item keys (`vs-usage-alt-text-2026-08-12`,
// `vs-billing-dismissed:payment:123`) share a stem. Describing the stem means a
// new day or a new invoice does not create an undescribed key.
function stemOf(key) {
  if (KEY_PURPOSES[key]) return key
  const colon = key.indexOf(':')
  if (colon > 0 && KEY_PURPOSES[key.slice(0, colon)]) return key.slice(0, colon)
  // Strip a trailing -YYYY-MM-DD, then try progressively shorter dashed stems.
  const dateless = key.replace(/-\d{4}-\d{2}-\d{2}$/, '')
  if (KEY_PURPOSES[dateless]) return dateless
  const parts = dateless.split('-')
  for (let i = parts.length; i > 1; i--) {
    const candidate = parts.slice(0, i).join('-')
    if (KEY_PURPOSES[candidate]) return candidate
  }
  return null
}

export function describeKey(key) {
  const stem = stemOf(key)
  if (stem) return { key, ...KEY_PURPOSES[stem] }
  // Honest fallback. An undescribed key is a documentation gap, not a reason to
  // hide it from the person whose data it is.
  return { key, purpose: 'Not yet described — included in full in your export', pii: 'unknown' }
}

// Pull every owned key out of a Storage-like object. Values are parsed when
// they are JSON so the export is readable rather than a wall of escaped
// strings; anything else is kept verbatim.
export function collectStorage(storage) {
  const out = {}
  if (!storage) return out
  let length = 0
  try { length = storage.length } catch { return out }
  for (let i = 0; i < length; i++) {
    let key
    try { key = storage.key(i) } catch { continue }
    if (!isOwnedKey(key)) continue
    let raw
    try { raw = storage.getItem(key) } catch { continue }
    if (raw === null) continue
    try { out[key] = JSON.parse(raw) } catch { out[key] = raw }
  }
  return out
}

// Keys to remove for "Clear local data". Everything owned EXCEPT the ones whose
// removal would log the user out or lose an entitlement — clearing preferences
// should not sign you out of your own account.
export const CLEAR_EXCEPTIONS = Object.freeze(['vs-accounts', 'vs-admin-unlocked', 'vs-onboarded'])

export function keysToClear(storage) {
  return Object.keys(collectStorage(storage)).filter((k) => !CLEAR_EXCEPTIONS.includes(k))
}

// The finished export object.
//
// `firestore` and `account` are null for a signed-out user, and the file says
// so explicitly rather than omitting the section — "no server data" and "we
// didn't look" must not be indistinguishable in something someone may rely on.
export function buildExport({ local = {}, session = {}, firestore = null, account = null, now = new Date() } = {}) {
  const keys = [...new Set([...Object.keys(local), ...Object.keys(session)])].sort()
  return {
    exportedAt: now.toISOString(),
    format: 'uil4b-data-export/2',
    about: {
      description: 'Everything UIL4B holds about you, from this browser and from our server.',
      browserKeys: keys.length,
      includesServerData: !!firestore || !!account,
    },
    // The what-and-why table, generated from the keys actually present rather
    // than from a list someone has to remember to update.
    disclosure: keys.map(describeKey),
    account,
    server: firestore,
    browser: { local, session },
  }
}
