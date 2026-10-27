// Which Gradient Library moods a viewer can actually open.
//
// The Gradient Generator's "Explore the library" chips link to
// /discover/gradients?mood=…, and the library caps how many rows a signed-out
// visitor can search (see galleryTier / GALLERY_TIER_LIMITS in lockedPreview.js).
// A chip for a mood none of those rows carry would land on an empty list, so the
// chips are filtered through the same split the gallery runs rather than a
// hand-kept list that drifts when the library or the cap changes.

import { LIBRARY_RULES } from './libraryRules.js'
import { splitLockedLibrary, galleryLimit } from './lockedPreview.js'

// The rows a tier can open, in canonical order. Same call the gallery makes.
export function openGradientRows(rows, tier) {
  if (tier === 'pro') return Array.isArray(rows) ? rows : []
  return splitLockedLibrary(rows, {
    unlocked: false,
    isOpen: LIBRARY_RULES.gradients.isOpen,
    preview: LIBRARY_RULES.gradients.preview,
    limit: galleryLimit(tier),
  }).open
}

// The moods, from `moods`, that at least one open row carries. Pro opens the
// whole library, whose rows beyond the bundle are not here to inspect, so every
// mood stands.
export function openMoods(rows, tier, moods) {
  if (tier === 'pro') return [...moods]
  const open = openGradientRows(rows, tier)
  return moods.filter((m) => open.some((g) => Array.isArray(g.tags) && g.tags.includes(m)))
}

// The gallery's mood + type filters (search is separate). One definition so the
// grid and the "the cap is why" check in its empty state cannot disagree.
export function matchesGradientFacets(g, tag, types) {
  if (tag !== 'all' && !(Array.isArray(g.tags) && g.tags.includes(tag))) return false
  if (!types.includes('all') && !types.includes(g.type)) return false
  return true
}
