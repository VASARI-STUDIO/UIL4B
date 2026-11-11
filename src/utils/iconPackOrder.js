// Cap contributions before concatenating so later packs remain reachable.
export function concatenatePackLists(lists, perPackCap = Infinity) {
  return lists.flatMap(list => list.slice(0, perPackCap))
}

// Stable sorting keeps the search service's relevance order within each pack.
export function orderIconsByPack(icons, packs) {
  const rank = new Map(packs.map((pack, index) => [pack, index]))
  return [...icons].sort((a, b) => (rank.get(a.pack) ?? packs.length) - (rank.get(b.pack) ?? packs.length))
}
