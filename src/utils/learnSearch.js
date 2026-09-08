// Search over the Learn guides — titles, deks, descriptions, section headings
// and, once it has arrived, the body prose of every guide.
//
// Pure functions, no DOM, no dependency: the whole index is seven guides of
// about 1,300 words each, so a linear scan of normalised strings answers a
// keystroke in well under a millisecond and a search library would be a
// dependency carried for nothing. tests/unit/learn-search.test.js drives these
// directly; SurfaceLanding.jsx renders their result.
//
// ── What matches ────────────────────────────────────────────────────────────
//
// The query is split on whitespace and EVERY term has to appear somewhere in
// the guide — a reader typing "contrast ratio" wants guides about contrast
// ratios, not every guide that says "ratio" (which is all of them, because the
// type scale is one). Matching is on normalised text: lower-cased, diacritics
// stripped, curly quotes straightened, so "typeface's" finds "typeface’s".
//
// ── What ranks first ────────────────────────────────────────────────────────
//
// A guide whose TITLE carries a term outranks one whose dek does, which
// outranks one that only says the word somewhere in its body. Ties keep the
// registry order, which is the reading order the landing already uses.

const QUOTES = /[‘’‚‛]/g
const DQUOTES = /[“”„‟]/g
const DIACRITICS = /[\u0300-\u036f]/g

/** Lower-case, ASCII quotes, no diacritics, single spaces. */
export function normalise(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(QUOTES, "'")
    .replace(DQUOTES, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** The query as its search terms, or [] for a blank query. */
export function termsOf(query) {
  return normalise(query).split(' ').filter(Boolean)
}

/**
 * Where a term was found, as the field that ranks highest. `null` when the
 * guide does not carry every term.
 */
function placeOf(terms, fields) {
  let weakest = 0
  for (const term of terms) {
    const rank = fields.findIndex((f) => f.includes(term))
    if (rank === -1) return null
    weakest = Math.max(weakest, rank)
  }
  return weakest
}

/** About `width` characters of `text` around the first `term`, ellipsised. */
export function snippetAround(text, term, width = 90) {
  // Prefer the guide's own casing: lower-casing and straightening quotes keeps
  // every index where it was, so the slice can be taken from the original.
  // Only when a diacritic had to be stripped (which shortens the string) does
  // the snippet fall back to the fully normalised text.
  const light = String(text || '').replace(QUOTES, "'").replace(DQUOTES, '"').toLowerCase()
  const same = light.length === String(text || '').length
  const norm = same ? light : normalise(text)
  const shown = same ? String(text) : norm
  const at = norm.indexOf(term)
  if (at === -1) return null
  // Mark the WHOLE word the term sits in. "luminance" found inside
  // "luminances" would otherwise mark nine letters and leave an "s" hanging
  // after the highlight, which reads as a typo rather than a match.
  const wordChar = /[a-z0-9]/i
  let mStart = at
  while (mStart > 0 && wordChar.test(norm[mStart - 1])) mStart -= 1
  let mEnd = at + term.length
  while (mEnd < norm.length && wordChar.test(norm[mEnd])) mEnd += 1
  const half = Math.floor((width - (mEnd - mStart)) / 2)
  let start = Math.max(0, mStart - half)
  let end = Math.min(norm.length, mEnd + half)
  // Snap to word boundaries so the snippet does not open or close mid-word.
  if (start > 0) {
    const sp = norm.lastIndexOf(' ', start)
    start = sp === -1 ? start : sp + 1
  }
  if (end < norm.length) {
    const sp = norm.indexOf(' ', end)
    end = sp === -1 ? end : sp
  }
  return {
    before: (start > 0 ? '…' : '') + shown.slice(start, mStart),
    match: shown.slice(mStart, mEnd),
    after: shown.slice(mEnd, end) + (end < norm.length ? '…' : ''),
  }
}

export const PLACES = Object.freeze(['title', 'summary', 'contents', 'body'])

/**
 * The guides that match `query`, best first.
 *
 * @param {string} query
 * @param {Array} articles   LEARN_ARTICLES, or any list with the same fields
 * @param {Object} bodies    `{ [slug]: prose }` — may be empty while loading
 * @returns {Array<{ article, place, snippet }>}
 *   `place` is one of PLACES — the strongest field that carried a term.
 *   `snippet` is set only for a body-only match, and is the sentence fragment
 *   the reader would otherwise have no way to see from the card.
 */
export function searchGuides(query, articles, bodies = {}) {
  const terms = termsOf(query)
  if (terms.length === 0) {
    return articles.map((article) => ({ article, place: null, snippet: null }))
  }
  const hits = []
  articles.forEach((article, order) => {
    const body = normalise(bodies[article.slug] || '')
    const fields = [
      normalise(`${article.title} ${article.navLabel || ''}`),
      normalise(`${article.dek} ${article.description || ''}`),
      normalise((article.sections || []).map((s) => s.title).join(' ')),
      body,
    ]
    const rank = placeOf(terms, fields)
    if (rank === null) return
    const place = PLACES[rank]
    let snippet = null
    if (place === 'body') {
      // The term the reader will not find on the card: the first one that is
      // in the body and nowhere above it.
      const hidden = terms.find((t) => !fields.slice(0, 3).some((f) => f.includes(t))) || terms[0]
      snippet = snippetAround(bodies[article.slug] || '', hidden)
    }
    hits.push({ article, place, snippet, rank, order })
  })
  hits.sort((a, b) => a.rank - b.rank || a.order - b.order)
  return hits.map(({ article, place, snippet }) => ({ article, place, snippet }))
}
