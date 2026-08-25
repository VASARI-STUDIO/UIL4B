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

// True when `token` is a COMPLETE word in `haystack`, not merely its prefix.
// This is the distinction that stops "car" leading with 🥕 carrot: "car" starts
// a word in "carrot" but is a whole word only in 🚗's keywords. Ranking a whole
// keyword above a partial name hit is what makes ordinary one-word searches
// land on the obvious emoji — 🚗 for car, 👏 for clap, 😢 for cry.
function wholeWord(haystack, token) {
  let from = 0
  for (;;) {
    const at = haystack.indexOf(token, from)
    if (at === -1) return false
    const before = at === 0 || haystack[at - 1] === ' '
    const afterAt = at + token.length
    const after = afterAt === haystack.length || haystack[afterAt] === ' '
    if (before && after) return true
    from = at + 1
  }
}

// How much of a single word the query accounts for, over the words in
// `haystack` that the query STARTS; 0 if it starts none.
//
// Prefixes only, deliberately. A prefix is where English keeps its inflections,
// so "lock" → "locked" and "music" → "musical" are the same word and 🔒 and 🎵
// are what the user meant. Allowing a match anywhere inside a word instead
// scores on an accident of spelling: it ranked ⏲️ "timer clock" top for "lock",
// because "lock" is a bigger share of "clock" (80%) than of "locked" (67%).
// Coverage then separates an inflection from a coincidence — "car" is only half
// of "carrot", so 🥕 falls below the keyword band and 🚗 wins.
function prefixWordCoverage(haystack, query) {
  if (query.includes(' ')) return 0
  let best = 0
  for (const word of haystack.split(' ')) {
    if (word.length >= query.length && word.startsWith(query)) {
      const c = query.length / word.length
      if (c > best) best = c
    }
  }
  return best
}

// 0 = no match. Higher is a better match. A hit on the emoji's NAME always
// outranks a hit on its keywords, so "cat" puts 🐱 above every emoji that
// merely lists "cat" as a related term.
export function scoreEmoji(entry, query, tokens) {
  if (!entry) return 0
  const { name, terms } = entry

  // Every token must appear, or it is not a match at all.
  for (const token of tokens) {
    const hit = token.length === 1 ? startsWord(terms, token) : terms.includes(token)
    if (!hit) return 0
  }

  // How much of the name the query accounts for. This is what decides which of
  // several equally-valid name hits is the canonical emoji: "heart" covers 5 of
  // the 9 characters of ❤️ "red heart" but only 5 of the 17 of 💝 "heart with
  // ribbon", so the plain red heart ranks first. Ordering on the band alone put
  // ❤️ seventh, behind five compound hearts that merely began with the word.
  // Always under 200 here, since a coverage of exactly 200 means name === query.
  const coverage = Math.round((200 * query.length) / Math.max(name.length, 1))

  if (name === query) return 1200

  // Signals are independent, so take the best rather than testing them in a
  // fixed order — an ordered ladder silently drops a stronger later signal, and
  // that is how ✈️ "airplane" lost "plane" to 🧑‍✈️ "pilot": the name band
  // matched first and the keyword band was never reached.
  let best = 100
  const bump = (v) => { if (v > best) best = v }

  if (wholeWord(name, query)) bump(900 + coverage)

  // A query that starts a word in the name scores 600..750 on coverage. A whole
  // KEYWORD scores a flat 690, which sits inside that band on purpose — that
  // one number carries the whole ranking argument:
  //
  //   🎵 "musical note"  music/musical = 71%  → 707  beats 🎤's keyword
  //   🔒 "locked"        lock/locked   = 67%  → 700  beats 🔑's keyword
  //   ─────────────────────────── 690: a whole keyword ───────────────────────
  //   🎬 "clapper board" clap/clapper  = 57%  → 686  loses to 👏's keyword
  //   🥕 "carrot"        car/carrot    = 50%  → 675  loses to 🚗's keyword
  //
  // Above the line the query is an inflection of the word and the emoji is what
  // was meant; below it the letters merely coincide.
  const prefix = prefixWordCoverage(name, query)
  if (prefix) bump(600 + Math.round(150 * prefix))

  // +30 when the name corroborates a keyword hit. ✈️ "airplane" and 🧑‍✈️
  // "pilot" both list the keyword "plane"; only one of them is a plane.
  if (wholeWord(terms, query)) bump(690 + (name.includes(query) ? 30 : 0))

  if (name.includes(query)) bump(560)
  if (tokens.every((t) => wholeWord(name, t))) bump(450 + coverage)
  if (tokens.every((t) => startsWord(name, t))) bump(400 + coverage)
  if (tokens.every((t) => name.includes(t))) bump(350 + coverage)

  // Weaker keyword hits. No coverage term — measuring the query against a name
  // it did not match is noise, and it actively misranks: it would put 🪠
  // "plunger" above 💩 for "poop", since both carry the keyword and "plunger"
  // is the shorter name. Flat bands instead, so these fall through to catalogue
  // order, which puts the Smileys pile of poo first.
  if (startsWord(terms, query)) bump(300)
  if (tokens.every((t) => startsWord(terms, t))) bump(200)
  return best
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

  // Score, then catalogue order. Name length is deliberately NOT a tie-break:
  // the coverage term in scoreEmoji already prefers the canonical short name
  // where that is meaningful, and applying it again on keyword-level ties just
  // rewards emoji with terse names for matches that had nothing to do with the
  // name. Catalogue order is a total order, so results never shuffle between
  // renders for the same query.
  scored.sort((a, b) => b.score - a.score || a.order - b.order)
  return scored.map((s) => s.item)
}
