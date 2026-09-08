import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LibrarySearch from './library/LibrarySearch'
import { LEARN_ARTICLES, TOPICS, readingMinutes } from '../data/learnIndex'
import { PLACES, searchGuides, termsOf } from '../utils/learnSearch'

// The guide index on /learn: every published guide, grouped by the topic its
// own registry entry declares, behind one search field that reads the guides'
// prose as well as their titles.
//
// ── The topics are the registry's, not this file's ─────────────────────────
//
// TOPICS in src/data/learnIndex.js is the closed list an article's `topic` has
// to come from (tests/unit/learn-articles.test.js fails on any other string),
// so grouping by it cannot invent a category and cannot leave a guide out. A
// topic with no guide renders nothing rather than an empty heading. Each group
// is a real <section> with its own heading, which is what lets a screen-reader
// user jump between topics rather than tab through every card.
//
// ── Search reaches the body text, at no cost until it is used ──────────────
//
// Titles, deks and section headings are in the registry and are searched at
// once. The prose is 51 KB of plain text across seven guides, extracted from
// the JSX at build time (scripts/learn-search-text.mjs) and served as the
// virtual module below. It is imported on the first FOCUS of the field, the
// way the Emoji Library requests its index: nothing on the first paint of
// /learn, and normally resolved before the first keystroke. A body-only match
// shows the sentence fragment it was found in, because the card otherwise
// gives the reader no way to see why it matched.
//
// ── The reveal attribute ───────────────────────────────────────────────────
//
// The cards carry `data-reveal` for the landing's one-shot scroll reveal,
// which useReveal() scans ONCE on mount. A card re-mounted by a search would
// get the attribute back with no observer left to add `.is-in`, and sit at
// opacity 0 for ever. So the attribute is only rendered until the first
// keystroke; after that the cards are plainly visible, which is also what a
// reader who has just typed a query expects.

const topicId = (topic) => `learn-topic-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

let bodiesPromise = null
const loadBodies = () => {
  if (!bodiesPromise) {
    bodiesPromise = import('virtual:learn-search-text').then((m) => m.default)
  }
  return bodiesPromise
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function LearnGuideIndex() {
  const [query, setQuery] = useState('')
  const [bodies, setBodies] = useState(null)
  const [touched, setTouched] = useState(false)
  const wrap = useRef(null)

  const ensureBodies = () => {
    if (bodies) return
    loadBodies().then(setBodies).catch(() => setBodies({}))
  }
  const change = (value) => {
    setTouched(true)
    ensureBodies()
    setQuery(value)
  }
  const clear = () => {
    setQuery('')
    wrap.current?.querySelector('input')?.focus()
  }

  const searching = termsOf(query).length > 0
  const hits = useMemo(() => searchGuides(query, LEARN_ARTICLES, bodies || {}), [query, bodies])
  const groups = TOPICS
    .map((topic, order) => ({
      topic,
      order,
      id: topicId(topic),
      total: LEARN_ARTICLES.filter((a) => a.topic === topic).length,
      hits: hits.filter((h) => h.article.topic === topic),
    }))
    .filter((g) => g.hits.length > 0)
  // While searching, the group holding the strongest match comes first, so the
  // best result is the first card on the page rather than the first card of
  // whichever topic happens to be listed first. searchGuides() already orders
  // the hits, so a group's rank is that of its first hit. Without a query the
  // registry's topic order stands.
  if (searching) {
    groups.sort((a, b) => (PLACES.indexOf(a.hits[0].place) - PLACES.indexOf(b.hits[0].place)) || (a.order - b.order))
  }

  // What the live region says. Empty until the reader has done something, so
  // the count is not read out twice on arrival (the hero hint already says it).
  let status = ''
  if (searching) {
    status = !bodies
      ? 'Searching…'
      : hits.length === 0
        ? `No guide mentions “${query.trim()}”.`
        : `${plural(hits.length, 'guide')} ${hits.length === 1 ? 'matches' : 'match'} “${query.trim()}”.`
  } else if (touched) {
    status = `Showing all ${LEARN_ARTICLES.length} guides.`
  }

  const reveal = touched ? {} : { 'data-reveal': true }
  const empty = searching && !!bodies && hits.length === 0
  // The live region keeps its sentence for assistive technology in every
  // state, but when the empty state prints the same sentence as its heading
  // a sighted reader would see it twice, so it is visually hidden then.
  const statusClass = empty ? 'lidx-status sr-only' : 'lidx-status'

  return (
    <>
      <div className="lidx-tools" ref={wrap}>
        <LibrarySearch
          value={query}
          onChange={change}
          onFocus={ensureBodies}
          label="Search the guides"
          placeholder="Search titles and text — luminance, clamp(), swap…"
        />
        {!searching && (
          <nav className="lidx-topics" aria-label="Guide topics">
            {groups.map((g) => (
              <a href={`#${g.id}`} key={g.topic}>
                {g.topic}{' '}
                <span className="lidx-topic-n">{g.total}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
      <p className={statusClass} role="status" aria-live="polite" aria-atomic="true">{status}</p>

      {empty ? (
        <div className="lidx-empty">
          <p className="lidx-empty-h">No guide mentions “{query.trim()}”.</p>
          <p className="lidx-empty-p">
            Try one word rather than a phrase — luminance, ratio, swap — or a
            topic: {TOPICS.map((t) => t.toLowerCase()).join(', ')}. The search
            reads every guide’s full text, so a term that is not here is not in
            any guide yet.
          </p>
          <button type="button" className="ui-pill ui-pill-ink ui-pill-sm" onClick={clear}>
            Show all {LEARN_ARTICLES.length} guides
          </button>
        </div>
      ) : (
        <div className="lidx-sections">
          {groups.map((g) => (
            <section className="lidx-topic-sec" id={g.id} key={g.topic} aria-labelledby={`${g.id}-h`}>
              <h3 className="lidx-topic-h" id={`${g.id}-h`}>
                {g.topic}{' '}
                <span className="lidx-topic-n">
                  {searching ? `${g.hits.length} of ${g.total}` : plural(g.total, 'guide')}
                </span>
              </h3>
              <div className="lidx-grid">
                {g.hits.map(({ article: a, snippet }) => (
                  <Link className="lidx-card" key={a.slug} to={`/learn/${a.slug}`} {...reveal}>
                    <span className="lidx-top">
                      <span className="lidx-topic">{a.topic}</span>
                      <span className="lidx-time">{readingMinutes(a.words)} min</span>
                    </span>
                    <span className="lidx-title">{a.title}</span>
                    <span className="lidx-dek">{a.dek}</span>
                    {snippet && (
                      <span className="lidx-hit">
                        {snippet.before}<mark>{snippet.match}</mark>{snippet.after}
                      </span>
                    )}
                    <span className="lidx-go">Read&nbsp;&rarr;</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
