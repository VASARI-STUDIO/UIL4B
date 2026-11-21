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

/**
 * The community rows that may be added to a library: those whose id is not already
 * a library row's (de-duplicated by id). Pure; the library rows are never changed.
 */
export function newCommunityRows(libraryRows, communityRows) {
  const have = new Set((Array.isArray(libraryRows) ? libraryRows : []).map((r) => r?.id))
  return (Array.isArray(communityRows) ? communityRows : []).filter((r) => r && !have.has(r.id))
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
