// Words people search icons by. The pairs offer a one-press retry when an
// exact-words search finds nothing. The concept groups widen a meaning search
// ("cold" also finds snowflake and thermometer). Names are spelled the way icon
// sets spell them: lowercase, hyphenated, because that is what the search
// matches against.
//
// Each pair works both ways, so "person" offers "user" as readily as "user"
// offers "person".

export const ICON_SYNONYM_PAIRS = [
  ['home', 'house'],
  ['settings', 'gear'],
  ['cog', 'gear'],
  ['user', 'person'],
  ['search', 'magnifying-glass'],
  ['close', 'x'],
  ['mail', 'envelope'],
  ['email', 'envelope'],
  ['trash', 'delete'],
  ['bin', 'trash'],
  ['edit', 'pencil'],
  ['picture', 'image'],
  ['photo', 'image'],
  ['cart', 'shopping-cart'],
  ['menu', 'hamburger'],
  ['padlock', 'lock'],
  ['notification', 'bell'],
]

const BY_TERM = new Map()
function remember(from, to) {
  if (!BY_TERM.has(from)) BY_TERM.set(from, [])
  const list = BY_TERM.get(from)
  if (!list.includes(to)) list.push(to)
}
for (const [a, b] of ICON_SYNONYM_PAIRS) {
  remember(a, b)
  remember(b, a)
}

// Each group is a set of words that mean one idea; every member reaches every
// other. A starter set, not a thesaurus: growing it is a data change.
// "favourite" and "favorite" are both here because the icon sets spell it the American way.
export const ICON_CONCEPT_GROUPS = [
  ['cold', 'snowflake', 'thermometer', 'ice', 'winter', 'snow'],
  ['hot', 'fire', 'flame', 'sun', 'thermometer', 'heat'],
  ['weather', 'cloud', 'rain', 'sun', 'snow', 'wind', 'storm'],
  ['money', 'cash', 'coin', 'wallet', 'currency', 'bank'],
  ['time', 'clock', 'watch', 'timer', 'hourglass', 'alarm'],
  ['date', 'calendar', 'schedule', 'event'],
  ['love', 'heart', 'favourite', 'favorite', 'like'],
  ['chat', 'message', 'comment', 'speech', 'bubble'],
  ['phone', 'call', 'mobile', 'telephone'],
  ['location', 'map', 'pin', 'marker', 'place', 'navigation'],
  ['security', 'lock', 'shield', 'key', 'padlock'],
  ['warning', 'alert', 'danger', 'exclamation', 'triangle-alert'],
  ['success', 'check', 'tick', 'done', 'circle-check'],
  ['upload', 'cloud-upload', 'arrow-up', 'export'],
  ['download', 'cloud-download', 'arrow-down', 'import'],
  ['music', 'note', 'headphones', 'audio', 'speaker'],
  ['video', 'film', 'camera', 'movie', 'play'],
  ['food', 'restaurant', 'utensils', 'fork', 'pizza', 'coffee'],
  ['travel', 'plane', 'airplane', 'luggage', 'suitcase', 'globe'],
  ['health', 'medical', 'heart-pulse', 'hospital', 'pill', 'stethoscope'],
  ['nature', 'tree', 'leaf', 'flower', 'plant', 'mountain'],
  ['work', 'briefcase', 'office', 'building', 'desk'],
  ['shopping', 'cart', 'bag', 'basket', 'store', 'tag'],
  ['education', 'book', 'school', 'graduation-cap', 'pencil'],
]

const GROUP_MEMBERS = new Map()
for (const group of ICON_CONCEPT_GROUPS) {
  for (const word of group) {
    if (!GROUP_MEMBERS.has(word)) GROUP_MEMBERS.set(word, [])
    const list = GROUP_MEMBERS.get(word)
    for (const other of group) if (other !== word && !list.includes(other)) list.push(other)
  }
}

const keyOf = (query) => String(query || '').trim().toLowerCase().replace(/\s+/g, '-')

/**
 * Up to `max` other words for a meaning search, best first: the synonym pair
 * first, then the members of every concept group the query belongs to, in
 * group order. Never includes the query itself. Whole-query, case-insensitive,
 * spaces become hyphens (same key as iconSynonymFor). A multi-word query
 * ("cold drink") gets nothing: it is searched literally.
 */
export function iconConceptTermsFor(query, max = 4) {
  const key = keyOf(query)
  if (!key) return []
  const out = []
  for (const word of [...(BY_TERM.get(key) || []), ...(GROUP_MEMBERS.get(key) || [])]) {
    if (word !== key && !out.includes(word)) out.push(word)
  }
  return out.slice(0, Math.max(0, max))
}

/**
 * The word to try instead of `query`, or '' when there is none. Whole-query and
 * case-insensitive: "home" has one, "home page" does not.
 */
export function iconSynonymFor(query) {
  const key = String(query || '').trim().toLowerCase().replace(/\s+/g, '-')
  const alternatives = BY_TERM.get(key)
  return alternatives ? alternatives[0] : ''
}
