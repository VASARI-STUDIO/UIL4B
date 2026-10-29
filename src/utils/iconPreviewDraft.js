// The customiser's Pro preview, kept in sessionStorage while a viewer visits /plans, so coming
// back reopens the popup as it was. The tab keeps it; closing the popup clears it. DOM-light so
// it is testable with a stand-in storage.
//
// Bounded on the way in and on the way out: only plain library icons, only the customiser's own
// settings, only values inside their ranges. Nothing here grants anything; the popup still decides
// what a viewer may export.

import { CUSTOM_SIZE_MAX, CUSTOM_SIZE_MIN } from './iconSize.js'

export const PREVIEW_DRAFT_KEY = 'vs-icon-draft'

/** A draft older than this is ignored: it belongs to a visit the viewer has left. */
export const PREVIEW_DRAFT_MAX_AGE_MS = 60 * 60 * 1000

const CAPS = ['round', 'square', 'butt']
const JOINS = ['round', 'miter', 'bevel']
const HEX = /^#[0-9a-f]{6}$/i

const store = () => { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage } catch { return null } }

/** Rebuild a draft from untrusted data, or null when any part is unsupported. */
export function validatePreviewDraft(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null
  const { icon, settings: s, at } = raw
  if (!icon || typeof icon.pack !== 'string' || typeof icon.name !== 'string' || !icon.pack || !icon.name) return null
  if (!s || typeof s !== 'object') return null
  if (typeof at !== 'number' || now - at > PREVIEW_DRAFT_MAX_AGE_MS || at > now + 1000) return null
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

/** The kept preview, or null. */
export function readPreviewDraft(now = Date.now()) {
  const s = store()
  if (!s) return null
  try { return validatePreviewDraft(JSON.parse(s.getItem(PREVIEW_DRAFT_KEY)), now) } catch { return null }
}

export function clearPreviewDraft() {
  const s = store()
  if (!s) return
  try { s.removeItem(PREVIEW_DRAFT_KEY) } catch { /* private mode: nothing to clear */ }
}
