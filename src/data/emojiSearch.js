// Emoji search: match and rank INDIVIDUAL emoji.
//
// What this replaces. The Emoji Library used to filter on a per-CATEGORY
// keyword table, so a query never selected emoji — it selected categories.
// Searching "dog" returned all 123 Animals; "pizza" returned all 125 Food;
// "thumbs up" returned all 61 Hands with 👍 buried among them; "rocket" also
// returned Hands, because the old rule matched when the QUERY contained a
// keyword and "rocket" contains "rock". "grinning" and "laptop" returned
// nothing at all, because no category keyword mentioned them.
//
// Terms come from `emojiIndex.js` (generated from Unicode CLDR), which is
// loaded on demand — see `emojiIndexLoader.js` for why it is not bundled.

// Lowercase, collapse runs of whitespace, trim. Exported because the component
// needs the same normalisation to decide whether a query is empty.
export function normaliseQuery(q) {
  return String(q == null ? '' : q).toLowerCase().replace(/\s+/g, ' ').trim()
}

// True when `token` begins a word in `haystack` (which is space-separated).
// Used instead of a bare `includes` for one-character queries, so typing "o"
// offers "ok hand", "owl", "octopus" rather than every emoji whose terms happen
// to contain the letter o.
function startsWord(haystack, token) {
  return haystack.startsWith(token) || haystack.includes(` ${token}`)
}

// 0 = no match. Higher is a better match. The ladder is ordered so that an
// exact name always outranks a keyword hit: searching "cat" must put 🐱 above
// 🏳️ (whose terms mention "category"-adjacent words) and above every emoji
// that merely lists "cat" as a related term.
export function scoreEmoji(entry, query, tokens) {
  if (!entry) return 0
  const { name, terms } = entry

  // Every token must appear, or it is not a match at all.
  for (const token of tokens) {
    const hit = token.length === 1 ? startsWord(terms, token) : terms.includes(token)
    if (!hit) return 0
  }

  if (name === query) return 1000
  if (name.startsWith(query)) return 800
  if (startsWord(name, query)) return 650
  if (name.includes(query)) return 600
  if (tokens.every((t) => startsWord(name, t))) return 500
  if (tokens.every((t) => name.includes(t))) return 400
  if (startsWord(terms, query)) return 300
  if (tokens.every((t) => startsWord(terms, t))) return 200
  return 100
}

// Search across already-category-filtered groups. Returns a flat, ranked array
// of the parsed items ({ char, tone }) — NOT groups, because a ranked result
// list that re-sorts itself into categories would bury the best match again.
//
// No result cap: the grid is windowed, so 900 matches cost the same to render
// as 9, and truncating would silently hide emoji the user can see are missing.
export function searchEmoji(groups, index, rawQuery) {
  const query = normaliseQuery(rawQuery)
  if (!query || !index) return []
  const tokens = query.split(' ')
  const scored = []
  const seen = new Set()

  for (const group of groups) {
    for (const item of group.items) {
      // A few characters sit in two categories (🙈 in Smileys and Animals,
      // 🌰 in Food and Nature). Rank each one once.
      if (seen.has(item.char)) continue
      const entry = index.get(item.char)
      const score = scoreEmoji(entry, query, tokens)
      if (!score) continue
      seen.add(item.char)
      scored.push({ item, score, name: entry.name, order: scored.length })
    }
  }

  // Score, then shorter name (so "heart" beats "heart with ribbon"), then
  // catalogue order — a total order, so results never shuffle between renders.
  scored.sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.order - b.order)
  return scored.map((s) => s.item)
}
