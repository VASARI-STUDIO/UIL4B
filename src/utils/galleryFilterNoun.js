// What the Palette and Gradient libraries call the rows a filter leaves, for the
// count line and the gate: "radial gradients", "warm palettes", "brand systems",
// gradients matching "ocean". One place, so the count line and the gate say the
// same noun.
//
//   kind     'palettes' or 'gradients'.
//   filters  { type, mood, collection, query, many }
//              type        one gradient type, when exactly one is selected
//              mood        a mood label ("Warm"), or null
//              collection  'brand' or 'curated' (palettes only), or null
//              query       the trimmed search text, or ''
//              many        true when a filter is set that has no word of its own
//                          (two gradient types at once)
//   count    how many the noun counts: one reads as a singular.

const BASE = {
  palettes: { one: 'palette', many: 'palettes' },
  gradients: { one: 'gradient', many: 'gradients' },
}

// How much of a search shows in a sentence before it is cut.
const QUERY_MAX = 24

const clip = (text) => (text.length > QUERY_MAX ? `${text.slice(0, QUERY_MAX).trimEnd()}…` : text)

export function filterNoun(kind, filters = {}, count = 2) {
  const base = BASE[kind] || BASE.palettes
  const single = count === 1
  const { type, mood, collection, query, many } = filters
  const lead = []
  if (mood) lead.push(String(mood).toLowerCase())
  if (type) lead.push(String(type).toLowerCase())

  let noun
  if (kind === 'palettes' && collection === 'brand') {
    noun = single ? 'brand system' : 'brand systems'
  } else if (kind === 'palettes' && collection === 'curated') {
    noun = `curated ${single ? base.one : base.many}`
  } else {
    noun = single ? base.one : base.many
  }
  if (lead.length) noun = `${lead.join(' ')} ${noun}`
  if (many) noun = `${noun} in these filters`
  const q = String(query || '').trim()
  if (q) noun = `${noun} matching “${clip(q)}”`
  return noun
}

/** Is any filter or search narrowing the view? */
export function isFiltered(filters = {}) {
  return Boolean(filters.type || filters.mood || filters.collection || filters.many || String(filters.query || '').trim())
}
