// Approved community submissions, shaped as gallery rows.
//
// A reviewer approving a gradient or palette in Admin only flips `status` on the
// queue document; nothing used to read that back, so an approved piece never
// reached the library. This module is the pure half of that read path (the
// Firestore query is `listApproved` in communityQueueApi.js, kept apart so these
// rules run under `node --test`, which cannot load the Firebase SDK).
//
// A community row is shaped like a static library row (the same keys the cards,
// the mood filters and the search haystack read) and is always OPEN: the tier cap
// counts the library's own rows, and approved community work is added after it,
// so the cap can never hide a piece the community made.
import { GRADIENT_TAGS } from '../data/gradientGallery.js'
import { sanitizeGradientSubmission } from './gradientSubmissions.js'
import { classifyPalette } from './paletteMood.js'
import { safeHttpUrl } from './urlSafety.js'

/** The id prefix of a community row: distinguishes it from a library row of the same slug. */
export const COMMUNITY_ID_PREFIX = 'c-'

const HEX = /^#[0-9a-fA-F]{6}$/
const MAX_COLOURS = 12

/**
 * The approved documents of `kind` (any kind when null), newest first, as plain
 * objects. Anything that is not an object with status 'approved' is dropped, so a
 * pending or rejected document can never reach a gallery through this path.
 */
export function filterApproved(docs, { kind = null, max = Infinity } = {}) {
  const out = []
  for (const d of Array.isArray(docs) ? docs : []) {
    if (!d || typeof d !== 'object' || d.status !== 'approved') continue
    if (kind && d.kind !== kind) continue
    out.push({ ...d })
  }
  out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  return Number.isFinite(max) ? out.slice(0, Math.max(0, max)) : out
}

// The gradient library's mood words, measured from the stops by the palette
// classifier. `mono` is the library's word for the classifier's `monochrome`.
function gradientTags(stops) {
  const moods = classifyPalette(stops.map((s) => s.color))
  const tags = GRADIENT_TAGS.filter((t) => moods[t === 'mono' ? 'monochrome' : t])
  return tags
}

/** Approved gradient documents as Gradient Library rows. Malformed ones are skipped. */
export function communityGradientRows(docs) {
  const rows = []
  const seen = new Set()
  for (const d of Array.isArray(docs) ? docs : []) {
    if (!d || d.kind !== 'gradient' || d.status !== 'approved' || !d.id) continue
    const id = `${COMMUNITY_ID_PREFIX}${d.id}`
    if (seen.has(id)) continue
    const g = sanitizeGradientSubmission({
      id, name: d.name, author: d.authorName,
      type: d.payload?.type, angle: d.payload?.angle, stops: d.payload?.stops,
    })
    if (!g) continue
    seen.add(id)
    rows.push({
      id, name: g.name, type: g.type, angle: g.angle, stops: g.stops,
      tags: gradientTags(g.stops), author: g.author, community: true,
    })
  }
  return rows
}

function paletteColours(payload) {
  const raw = Array.isArray(payload?.colors) ? payload.colors : [payload?.c1, payload?.c2]
  return raw.filter((c) => typeof c === 'string' && HEX.test(c)).slice(0, MAX_COLOURS).map((c) => c.toUpperCase())
}

/** Approved palette documents as Palette Library rows. Malformed ones are skipped. */
export function communityPaletteRows(docs) {
  const rows = []
  const seen = new Set()
  for (const d of Array.isArray(docs) ? docs : []) {
    if (!d || d.kind !== 'palette' || d.status !== 'approved' || !d.id) continue
    const id = `${COMMUNITY_ID_PREFIX}${d.id}`
    if (seen.has(id)) continue
    const colors = paletteColours(d.payload)
    if (colors.length < 2) continue
    seen.add(id)
    const name = typeof d.name === 'string' ? d.name.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
    const author = typeof d.authorName === 'string' ? d.authorName.trim().slice(0, 60) : ''
    rows.push({
      id, name: name || 'Untitled palette', colors, kind: 'community',
      author: author || 'Community member', url: safeHttpUrl(d.payload?.url), community: true,
    })
  }
  return rows
}

// A row's content key: its name (case and spacing ignored) plus its colours
// (palette) or stops (gradient). A name alone is not a match and a row with no
// colours has none, so a name-only stub never swallows a community row.
function contentKey(row) {
  const name = typeof row?.name === 'string' ? row.name.replace(/\s+/g, ' ').trim().toLowerCase() : ''
  if (!name) return null
  if (Array.isArray(row.colors) && row.colors.length) {
    return `${name}|p|${row.colors.map((c) => String(c).toUpperCase()).join(',')}`
  }
  if (Array.isArray(row.stops) && row.stops.length) {
    return `${name}|g|${row.stops.map((s) => `${String(s?.color).toUpperCase()}@${s?.position}`).join(',')}`
  }
  return null
}

/**
 * The community rows that may be added to a library: those the library does not
 * already hold. A community id is `c-<docId>` and never matches a static row, so
 * the match is on content (name plus colours or stops), which catches a
 * submission later promoted into the static data; an equal id also counts.
 * Pure; the library rows are never changed.
 */
export function newCommunityRows(libraryRows, communityRows) {
  const library = Array.isArray(libraryRows) ? libraryRows : []
  const haveId = new Set(library.map((r) => r?.id))
  const haveContent = new Set(library.map(contentKey).filter(Boolean))
  return (Array.isArray(communityRows) ? communityRows : []).filter((r) => {
    if (!r || haveId.has(r.id)) return false
    const key = contentKey(r)
    return !(key && haveContent.has(key))
  })
}

/**
 * The loader behind useApprovedSubmissions, kept pure so it runs under
 * `node --test`. `list()` reads the approved documents; the answer is kept for
 * `keepMs` per account key (`uid`, or null when signed out), so a sign-in or
 * sign-out re-reads and the same account does not. A failed read is an empty
 * list and is not kept. `now` is injectable for the clock.
 */
export function createApprovedLoader({ list, keepMs = 5 * 60 * 1000, now = Date.now }) {
  let cached = null // { key, at, promise }
  return function load(uid) {
    const key = uid || null
    if (cached && cached.key === key && now() - cached.at < keepMs) return cached.promise
    const promise = Promise.resolve().then(list).catch(() => {
      if (cached && cached.promise === promise) cached = null // a failure is not kept
      return []
    })
    cached = { key, at: now(), promise }
    return promise
  }
}

/**
 * The hub's waiting list: what is not hidden and not yet approved (an approved
 * piece has joined the gallery). Pending and rejected ones stay.
 */
export function waitingRows(rows, hiddenIds) {
  const hidden = hiddenIds instanceof Set ? hiddenIds : new Set()
  return (Array.isArray(rows) ? rows : []).filter((s) => s && !hidden.has(s.id) && s.status !== 'approved')
}

/** The hub's approved list, for the profile's Made tab. */
export function approvedRows(rows, hiddenIds) {
  const hidden = hiddenIds instanceof Set ? hiddenIds : new Set()
  return (Array.isArray(rows) ? rows : []).filter((s) => s && !hidden.has(s.id) && s.status === 'approved')
}

/**
 * A locked-library split with the community rows added to what the viewer may
 * open. They sit after the library's own open rows and outside the tier cap, which
 * counted only the library; `eligible` and `remaining` keep describing the library.
 */
export function withCommunityOpen(split, communityRows) {
  const extra = Array.isArray(communityRows) ? communityRows : []
  return extra.length ? { ...split, open: [...split.open, ...extra] } : split
}
