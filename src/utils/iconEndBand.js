// The band at the end of the Icon Library grid: which viewer sees which band,
// and which icons the signed-out viewer sees blurred above it.
//
// Pure functions only, no React and no window, so tests/unit can import this
// under plain `node --test`. IconLibrary.jsx owns the markup and the click
// handlers.
import { canSeePack } from '../data/iconPackTiers.js'

/**
 * Which band, if any, closes the grid: 'anon', 'free' or null.
 *
 * Every condition below must hold; any one failing is "no band".
 *
 *   authLoading   whether an account exists is still unknown. Showing the
 *                 signed-out band to a signed-in viewer for a beat would say
 *                 something untrue.
 *   planLoading   a signed-in viewer's plan is still on its way, so `free` is
 *                 only the default held until it lands. A Pro viewer would see
 *                 the upgrade band for a beat. A signed-out viewer's plan is
 *                 never loading.
 *   loading       the skeleton grid owns the space.
 *   gated         a gated scope replaces the grid with its own wall.
 *   isMyIcons     that view has its own hint.
 *   resultCount   an empty search has its own message.
 *   hasMore       only the free band waits for this: a free viewer's browse of
 *                 every pack is thousands of icons, so a band under the
 *                 infinite-scroll sentinel would keep moving away. The
 *                 signed-out grid is capped, so its end is always reached.
 *
 * A Pro viewer gets nothing. `tier` is the output of viewerTier().
 */
export function endBandKind({
  tier, authLoading, planLoading, isMyIcons, gated, loading, resultCount, hasMore,
} = {}) {
  if (authLoading || planLoading || isMyIcons || gated || loading || !(resultCount > 0)) return null
  if (tier === 'anon') return 'anon'
  if (tier === 'free' && !hasMore) return 'free'
  return null
}

// The built-in set's pack codes, and the Iconify prefix each one stands for.
// Only outlined packs that the signed-out tier may browse are listed, in the
// order the tease takes from them. The brand pack in the built-in set ('S')
// is deliberately absent. Every pick is still checked with `canSee`, so the
// tier table stays the one authority if a pack moves.
export const TEASE_PACKS = [
  ['L', 'lucide'],
  ['T', 'tabler'],
  ['I', 'iconoir'],
  ['H', 'heroicons'],
]

/**
 * Pick `count` icons from the built-in set to draw blurred under the grid.
 *
 *   icons      the built-in set, `{ n, c, p, d }` items (window.icons).
 *   shownNames names already on screen; the tease shows the NEXT icons.
 *   canSee     (prefix) => boolean, the viewer's own pack check.
 *
 * Round-robin across the packs in TEASE_PACKS, taking items in array order from
 * each, so every pack shows and the result is the same on every render.
 * Returns `{ key, d }` only: no name and no pack, which the tease never prints.
 * Fewer than `count` come back when the set runs out.
 */
export function pickTeaseIcons({ icons, shownNames = [], count, canSee } = {}) {
  if (!Array.isArray(icons) || !(count > 0) || typeof canSee !== 'function') return []
  const taken = new Set(shownNames)
  const queues = TEASE_PACKS
    .filter(([, prefix]) => canSee(prefix))
    .map(([code]) => icons.filter((i) => i && i.p === code && i.d && !taken.has(i.n)))
  const out = []
  for (let round = 0; out.length < count; round++) {
    let progressed = false
    for (const queue of queues) {
      if (out.length >= count) break
      const item = queue[round]
      if (!item) continue
      out.push({ key: `${item.p}:${item.n}`, d: item.d })
      progressed = true
    }
    if (!progressed) break
  }
  return out
}

export const TEASE_ROWS = 1

/** How many cells to draw for `cols` live grid columns. */
export function teaseCellCount(cols) {
  return cols > 0 ? cols * TEASE_ROWS : 0
}

/** The column count used before the live grid has been measured. */
export function teaseColsFallback(isNarrow) {
  return isNarrow ? 3 : 8
}

/**
 * Where a tease cell sits, so CSS can fade the second row and keep the hover
 * chip inside the grid: { row: 0 | 1, edge: 'first' | 'last' | null }.
 */
export function teaseCellPlace(index, cols) {
  const col = index % cols
  return {
    row: Math.floor(index / cols),
    edge: col === 0 ? 'first' : col === cols - 1 ? 'last' : null,
  }
}

/**
 * The packs Pro adds over a free account, for the free band's body. Counts
 * packs the tier table lets each tier see; `packs` is IconLibrary's ALL_PACKS.
 */
export function packsProAdds(packs) {
  const count = (tier) => packs.filter((p) => canSeePack(p, tier)).length
  return count('paid') - count('free')
}
