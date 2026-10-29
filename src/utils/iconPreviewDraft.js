// The customiser's Pro preview, kept in sessionStorage while a viewer visits /plans, so coming
// back reopens the popup as it was. It is written when the upgrade popup opens, but it only
// comes back once the viewer has actually left for the upgrade flow (`leftAt`, stamped by
// stampPreviewDraft): a plain reload or a typed address finds an unstamped draft and drops it.
// The tab keeps a stamped draft; closing the popup, a restore, or an hour clears it. DOM-light
// so it is testable with a stand-in storage.
//
// Bounded on the way in and on the way out: only plain library icons, only the customiser's own
// settings, only values inside their ranges. Nothing here grants anything; the popup still decides
// what a viewer may export.

import { CUSTOM_SIZE_MAX, CUSTOM_SIZE_MIN } from './iconSize.js'

export const PREVIEW_DRAFT_KEY = 'vs-icon-draft'

/** A draft older than this (from the moment they left) is ignored: it belongs to a visit that is over. */
export const PREVIEW_DRAFT_MAX_AGE_MS = 60 * 60 * 1000

const CAPS = ['round', 'square', 'butt']
const JOINS = ['round', 'miter', 'bevel']
const HEX = /^#[0-9a-f]{6}$/i

const store = () => { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage } catch { return null } }

/** Rebuild a draft from untrusted data, or null when any part is unsupported. */
export function validatePreviewDraft(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null
  const { icon, settings: s, at, leftAt } = raw
  if (!icon || typeof icon.pack !== 'string' || typeof icon.name !== 'string' || !icon.pack || !icon.name) return null
  if (!s || typeof s !== 'object') return null
  // An unstamped draft ages from its write; a stamped one from the moment the viewer left (below).
  if (typeof at !== 'number' || at > now + 1000 || (leftAt === undefined && now - at > PREVIEW_DRAFT_MAX_AGE_MS)) return null
  // The stamp is optional here (a draft written but not yet left with); when present it must
  // be a real moment between the write and now, and the age counts from it.
  if (leftAt !== undefined && (typeof leftAt !== 'number' || leftAt < at || leftAt > now + 1000)) return null
  if (leftAt !== undefined && now - leftAt > PREVIEW_DRAFT_MAX_AGE_MS) return null
  const size = Number(s.size)
  const stroke = Number(s.stroke)
  if (!Number.isInteger(size) || size < CUSTOM_SIZE_MIN || size > CUSTOM_SIZE_MAX) return null
  if (!Number.isFinite(stroke) || stroke <= 0 || stroke > 16) return null
  if (!CAPS.includes(s.cap) || !JOINS.includes(s.join)) return null
  if (![0, 90, 180, 270].includes(s.rotate)) return null
  if (s.color !== '' && !(typeof s.color === 'string' && HEX.test(s.color))) return null
  return {
    icon: { id: `${icon.pack}:${icon.name}`, pack: icon.pack, name: icon.name, cdn: true },
    settings: {
      size, stroke, cap: s.cap, join: s.join, rotate: s.rotate, color: s.color,
      absStroke: !!s.absStroke, flipH: !!s.flipH, flipV: !!s.flipV,
    },
    at,
    ...(leftAt !== undefined && { leftAt }),
  }
}

/** Keep the preview for the next mount of the library. False when it cannot be kept. */
export function writePreviewDraft(icon, settings, now = Date.now()) {
  const ok = validatePreviewDraft({ icon, settings, at: now }, now)
  const s = store()
  if (!ok || !s) return false
  try {
    s.setItem(PREVIEW_DRAFT_KEY, JSON.stringify({ icon: ok.icon, settings: ok.settings, at: now }))
    return true
  } catch { return false }
}

/**
 * Mark the kept preview as left with: the viewer is on their way to the upgrade flow. False
 * when there is no valid draft to mark.
 */
export function stampPreviewDraft(now = Date.now()) {
  const s = store()
  if (!s) return false
  try {
    const kept = validatePreviewDraft(JSON.parse(s.getItem(PREVIEW_DRAFT_KEY)), now)
    if (!kept) return false
    s.setItem(PREVIEW_DRAFT_KEY, JSON.stringify({ icon: kept.icon, settings: kept.settings, at: kept.at, leftAt: now }))
    return true
  } catch { return false }
}

/**
 * The preview to bring back, or null. Only a draft stamped by stampPreviewDraft and still fresh
 * counts. Anything else (never left with, expired, unreadable) is removed, so a reload or a typed
 * address finds nothing and the slot does not keep stale settings.
 */
export function readPreviewDraft(now = Date.now()) {
  const s = store()
  if (!s) return null
  let draft = null
  try { draft = validatePreviewDraft(JSON.parse(s.getItem(PREVIEW_DRAFT_KEY)), now) } catch { draft = null }
  if (draft && draft.leftAt !== undefined) return draft
  clearPreviewDraft()
  return null
}

export function clearPreviewDraft() {
  const s = store()
  if (!s) return
  try { s.removeItem(PREVIEW_DRAFT_KEY) } catch { /* private mode: nothing to clear */ }
}
