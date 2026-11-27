// The one-line meta under a library tile's name. Written here so the tile, the
// preview dialog and the locked stand-ins agree on the wording.

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** Who made an approved community piece: "By Freya Free", or null for a library row. */
export function communityBy(row) {
  if (!row?.community) return null
  const who = typeof row.author === 'string' ? row.author.trim() : ''
  return `By ${who || 'a community member'}`
}

/**
 * "Linear 135° · 3 stops", "Radial · 4 stops", "Conic 90° · 2 stops". A community
 * piece names its maker in place of the type ("By Freya Free · 2 stops"): the
 * swatch already shows the type, and the line has to fit a two-column phone tile.
 */
export function gradientMeta(g) {
  const kind = communityBy(g) || (['Radial', 'Mesh'].includes(g.type) ? g.type : `${g.type} ${Math.round(g.angle)}°`)
  return `${kind} · ${plural(g.stops.length, 'stop', 'stops')}`
}

/** "5 colours" or "Warm · 5 colours": the mood leads when there is one. */
export function paletteMeta(count, moodLabel) {
  const size = plural(count, 'colour', 'colours')
  return moodLabel ? `${moodLabel} · ${size}` : size
}

/** What a locked stand-in says: the tier, then the size when the stub knows it. */
export function lockedMeta(kind, slots) {
  if (!slots) return 'Pro'
  return `Pro · ${plural(slots, kind === 'gradient' ? 'stop' : 'colour', kind === 'gradient' ? 'stops' : 'colours')}`
}
