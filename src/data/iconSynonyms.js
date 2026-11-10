// Words people search icons by that the catalogues name differently ("home" for
// what Bootstrap calls "house"). Used only when a search finds nothing, to offer
// the other word as a one-press retry; it never changes what a search returns.
//
// Each pair works both ways, so "person" offers "user" as readily as "user"
// offers "person". Names are written the way icon sets spell them (lowercase,
// hyphenated), because that is what the search matches against.

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

/**
 * The word to try instead of `query`, or '' when there is none. Whole-query and
 * case-insensitive: "home" has one, "home page" does not.
 */
export function iconSynonymFor(query) {
  const key = String(query || '').trim().toLowerCase().replace(/\s+/g, '-')
  const alternatives = BY_TERM.get(key)
  return alternatives ? alternatives[0] : ''
}
