import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import searchTextUrl from 'virtual:learn-search-text-url'
import LibrarySearch from './library/LibrarySearch'
import { LEARN_ARTICLES, TOPICS, readingMinutes } from '../data/learnIndex'
import { LEARN_GROUPS } from '../data/toolTree'
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
// the JSX at build time (scripts/learn-search-text.mjs) and served as a hashed
// JSON file. It is fetched on the first FOCUS of the field, the way the Emoji
// Library requests its index: nothing on the first paint of /learn, and
// normally resolved before the first keystroke. It is a fetch() and not an
// import() so that a failure is an ordinary rejection this component answers
// with the titles-only notice, rather than a vite:preloadError that reloads
// the page and wipes the query. A body-only match
// shows the sentence fragment it was found in, because the card otherwise
// gives the reader no way to see why it matched.
//
// ── Pages that help rather than teach ──────────────────────────────────────
//
// Help and Design Principles live under /learn/ but are not guides, so they
// are not in the registry and the topic groups never list them. They get one
// extra group after the topics, shown only while the field is empty. Labels and
// routes are read from LEARN_GROUPS so the rows cannot drift from the menu; the
// summaries are the ones the site map prints for the same two pages. Search
// does not match these rows.
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
    bodiesPromise = fetch(searchTextUrl)
      .then((res) => {
        // A 404 resolves rather than rejecting; treat it as a failed load.
        if (!res.ok) throw new Error(`learn search text: HTTP ${res.status}`)
        return res.json()
      })
      .catch((err) => {
        // Forget the failure so a later attempt is a genuine new request.
        bodiesPromise = null
        throw err
      })
  }
  return bodiesPromise
}

const USING_ID = 'learn-topic-using-uil4b'
const USING_ROWS = [
  { id: 'help', dek: 'What each tool opens with, and what the free plan covers.' },
  { id: 'principles', dek: 'The rules the tools enforce, with the measurements beside them.' },
].flatMap(({ id, dek }) => {
  const group = LEARN_GROUPS.find((g) => g.id === id)
  return group ? [{ id, dek, label: group.label, route: group.route }] : []
})

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function LearnGuideIndex() {
  const [query, setQuery] = useState('')
  const [bodies, setBodies] = useState(null)
  const [touched, setTouched] = useState(false)
  // True once the full-text module has failed to load, so the status can say
  // that results come from titles, deks and headings only.
  const [failed, setFailed] = useState(false)
  const wrap = useRef(null)

  const ensureBodies = () => {
    if (bodies) return
    loadBodies().then(setBodies).catch(() => { setFailed(true); setBodies({}) })
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
      : failed
        ? 'Searching titles only. The full text didn’t load, so matches inside a guide won’t show.'
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
  // The failed-load notice is the one status a sighted reader needs to see.
  const statusClass = empty && !failed ? 'lidx-status sr-only' : 'lidx-status'

  return (
    <>
      <div className="lidx-tools" ref={wrap}>
        <LibrarySearch
          value={query}
          onChange={change}
          onFocus={ensureBodies}
          label="Search the guides"
          placeholder="Search guides, e.g. clamp()"
        />
        {!searching && (
          <nav className="lidx-topics" aria-label="Guide topics">
            {groups.map((g) => (
              <a href={`#${g.id}`} key={g.topic}>
                {g.topic}{' '}
                <span className="lidx-topic-n">{g.total}</span>
              </a>
            ))}
            <a href={`#${USING_ID}`}>Using UIL4B</a>
          </nav>
        )}
      </div>
      <p className={statusClass} role="status" aria-live="polite" aria-atomic="true">{status}</p>

      {empty ? (
        <div className="lidx-empty">
          <p className="lidx-empty-h">No guide mentions “{query.trim()}”.</p>
          <p className="lidx-empty-p">
            Try one word, such as luminance, ratio or swap, or a topic:{' '}
            {TOPICS.map((t) => t.toLowerCase()).join(', ')}.
            {!failed && ' Search reads the full text of every guide.'}
            {' '}For help with the tools, see{' '}
            <Link to="/learn/help">Help and getting started</Link>.
          </p>
          {/* A rectangle, not the retired `.ui-pill`: an app control, drawn
              the way the app design file draws its secondary buttons. */}
          <button type="button" className="lidx-reset" onClick={clear}>
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
                    <span className="lidx-go" aria-hidden="true">&rarr;</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          {!searching && USING_ROWS.length > 0 && (
            <section className="lidx-topic-sec" id={USING_ID} aria-labelledby={`${USING_ID}-h`}>
              <h3 className="lidx-topic-h" id={`${USING_ID}-h`}>Using UIL4B</h3>
              <div className="lidx-grid">
                {USING_ROWS.map((r) => (
                  <Link className="lidx-card" key={r.id} to={r.route} {...reveal}>
                    <span className="lidx-title">{r.label}</span>
                    <span className="lidx-dek">{r.dek}</span>
                    <span className="lidx-go" aria-hidden="true">&rarr;</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
