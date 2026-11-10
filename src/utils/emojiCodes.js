// The ways a person writes down one emoji besides pasting it: its Unicode code
// points, the HTML entity for them, and a chat shortcode. Pure string work.
//
// Every function reads the emoji as the sequence of code points it really is,
// so a flag (two regional indicators), a toned hand (base + modifier) and a
// family (people joined by ZWJ) each come out as every code point they hold.

/** Upper-case hex, at least four digits: U+00A9, U+1F44B. */
function hex(codePoint) {
  return codePoint.toString(16).toUpperCase().padStart(4, '0')
}

/** The code points of `emoji`, in order, as numbers. */
export function codePointsOf(emoji) {
  return [...(emoji || '')].map(c => c.codePointAt(0))
}

/** `U+1F44B U+1F3FD` — the notation the Unicode charts use. */
export function formatCodePoints(emoji) {
  return codePointsOf(emoji).map(c => `U+${hex(c)}`).join(' ')
}

/** `&#x1F44B;&#x1F3FD;` — pasteable into HTML. */
export function htmlEntity(emoji) {
  return codePointsOf(emoji).map(c => `&#x${hex(c)};`).join('')
}

/** `:wave:` from a shortcode alias. Already-wrapped input is returned as is. */
export function formatShortcode(alias) {
  if (!alias) return ''
  return /^:.+:$/.test(alias) ? alias : `:${alias}:`
}

/**
 * The entry for `emoji` in a table keyed by the untoned character, or undefined.
 *
 * A toned glyph has no row of its own, so the tone is stripped first. The
 * tables disagree about U+FE0F (some keys carry it, some do not), so the key is
 * also tried with the selector added and removed.
 */
export function lookupEmoji(table, emoji) {
  if (!table || !emoji) return undefined
  const bare = [...emoji].filter(c => {
    const cp = c.codePointAt(0)
    return cp < 0x1F3FB || cp > 0x1F3FF
  }).join('')
  const noSelector = bare.replace(/️/g, '')
  for (const key of [emoji, bare, noSelector, `${noSelector}️`]) {
    if (table.has(key)) return table.get(key)
  }
  return undefined
}

/** The first letter upper-case, the rest as the dataset spells it. */
export function displayName(name) {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}
