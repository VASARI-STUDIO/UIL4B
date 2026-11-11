// Whole rows for the signed-out icon grid: how many icons fill the measured
// column count, and how a fetched list is trimmed to that. Kept apart from
// iconPackTiers.js, which the entry chunk imports, so only the icon library
// page loads it.
import { ANON_ICON_CAP, anonPerPack, tierOf } from './iconPackTiers.js'

/** The most icons a signed-out grid ever shows, whatever the screen's column count. */
export const ANON_ICON_CEILING = 72

/**
 * How many icons the signed-out grid shows across `cols` columns: the cap
 * rounded UP to a whole row, so the last row is never ragged (1440 is 13
 * columns, so 65 rather than 60 with its last row 8 cells short). Past the
 * ceiling it rounds DOWN to a whole row instead. An unmeasured or nonsense
 * column count falls back to the plain cap.
 */
export function anonCapForCols(cols) {
  if (!Number.isInteger(cols) || cols < 1) return ANON_ICON_CAP
  const up = Math.ceil(ANON_ICON_CAP / cols) * cols
  if (up <= ANON_ICON_CEILING) return up
  return Math.floor(ANON_ICON_CEILING / cols) * cols || ANON_ICON_CEILING
}

/**
 * How many icons the signed-out lists hold before the grid trims them to whole
 * rows: every anon pack fetched at the share the ceiling needs. Wide enough
 * that a resize to more columns finds the icons already in hand.
 */
export function anonListMax(packs) {
  const n = packs.filter((p) => tierOf(p) === 'anon').length
  return n > 0 ? anonPerPack(packs, ANON_ICON_CEILING) * n : ANON_ICON_CEILING
}

/**
 * Trim a signed-out list to `cap` icons, keeping the order it came in. Each
 * pack in the list gets an equal share of `cap` (rounded up) and its first
 * icons are taken first, so the sample shows every set rather than the first
 * pack alone. If that leaves the list short of `cap` (a search that only one
 * pack answers well), the rest are taken in order. The list is returned as is
 * when it already fits.
 */
export function capAnonList(list, cap) {
  if (!(cap > 0) || list.length <= cap) return list
  const each = Math.ceil(cap / new Set(list.map((icon) => icon.pack)).size)
  const keep = new Array(list.length).fill(false)
  const seen = new Map()
  let taken = 0
  for (let i = 0; i < list.length && taken < cap; i++) {
    const n = seen.get(list[i].pack) || 0
    if (n < each) { keep[i] = true; seen.set(list[i].pack, n + 1); taken++ }
  }
  for (let i = 0; i < list.length && taken < cap; i++) {
    if (!keep[i]) { keep[i] = true; taken++ }
  }
  return list.filter((_, i) => keep[i])
}
