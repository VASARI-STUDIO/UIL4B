// A phrase a reader could only have got from reading one guide.
//
// Shared by tests/unit/learn-search.test.js and
// tests/user-sim/67-learn-index-search-card.spec.js so both halves search for
// the SAME kind of thing: a run of consecutive words from a guide's body such
// that (a) at least one of the words is absent from that guide's own metadata,
// so a match has to go through the body rather than the card, and (b) for
// every other guide at least one of the words is absent from its whole text,
// so an AND-match cannot reach it. A test that searched for a phrase whose
// words all appear in a dek would pass without the body being searched at all
// — which is the defect the search test exists to catch.
import { normalise } from '../../../src/utils/learnSearch.js'

/** Every field the card shows or the registry holds, normalised. */
export const metadataOf = (a) => normalise([
  a.title, a.navLabel, a.dek, a.description, ...(a.sections || []).map((s) => s.title),
].join(' '))

const STOP = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'than', 'then', 'what', 'which', 'when', 'where', 'into', 'over', 'also', 'both', 'each', 'have', 'has', 'not', 'for', 'are', 'was', 'its', 'one', 'two', 'but', 'can', 'all', 'any', 'out', 'off'])

/**
 * @param {object} article  one LEARN_ARTICLES entry
 * @param {object[]} articles  the whole registry
 * @param {object} bodies  `{ [slug]: prose }`
 * @param {number} n  words in the phrase
 * @returns {string|null}
 */
export function bodyOnlyPhrase(article, articles, bodies, n = 4) {
  const words = normalise(bodies[article.slug]).split(' ')
    .filter((w) => /^[a-z][a-z-]{3,}$/.test(w) && !STOP.has(w))
  const ownMeta = metadataOf(article)
  const others = articles
    .filter((o) => o.slug !== article.slug)
    .map((o) => `${metadataOf(o)} ${normalise(bodies[o.slug])}`)
  for (let i = 0; i + n <= words.length; i += 1) {
    const run = words.slice(i, i + n)
    if (!run.some((w) => !ownMeta.includes(w))) continue
    if (!others.every((hay) => run.some((w) => !hay.includes(w)))) continue
    return run.join(' ')
  }
  return null
}
