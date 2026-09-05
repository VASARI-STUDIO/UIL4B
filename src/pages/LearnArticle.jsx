import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import NotFound from './NotFound'
import { findArticle, nextArticle, readingMinutes } from '../data/learnIndex'
import ColourContrast from '../data/learn/colourContrast'
import ColourSpaces from '../data/learn/colourSpaces'
import TypeScales from '../data/learn/typeScales'

// The Learn article shell: one layout, every article.
//
// ── Why the prose is a component and not markdown ──────────────────────────
//
// These articles measure things. The contrast article reads this page's own
// custom properties and computes their ratios with the product's own
// contrastRatio(); the type-scale article generates its ladder from the same
// stepPx() the Type Scale tool exports from. A markdown pipeline would have
// meant either shipping a renderer plus a plugin API so prose could call into
// src/utils, or typing the numbers out — and a typed number is a claim about a
// file as it was on the day someone typed it. Every figure in these articles is
// either quoted from a linked standard or produced in front of the reader.
//
// ── Why the bodies are imported statically ─────────────────────────────────
//
// This whole page is already one lazy chunk off App.jsx. Splitting each article
// again would have meant a template-literal dynamic import, which resolves at
// runtime and so cannot be checked by anything. Three articles is a small
// chunk; a filename the build cannot see is a permanent hazard.
//
// Each body exports ONLY its component, which is why the source list lives on
// the article record in learnIndex.js rather than beside the prose that cites
// it: an array export alongside a component defeats fast refresh for the whole
// module, and the sources are a property of the article either way.
//
// ── Why the contents are generated from metadata ───────────────────────────
//
// `article.sections` in src/data/learnIndex.js is the single list. The contents
// rail maps it, and so does the prose — each <section id> in the body must
// match an entry, which tests/unit/learn-articles.test.js asserts. A heading
// that exists in the prose and not in the contents (or the reverse) is the
// defect this arrangement makes impossible rather than merely unlikely.

const BODIES = {
  'colour-contrast': ColourContrast,
  'type-scales': TypeScales,
  'colour-spaces': ColourSpaces,
}

// One sentence saying what the tool does with what the reader has just read.
// Held here rather than in learnIndex.js because it is this page's copy, and
// learnIndex.js has to stay parseable by the Node build scripts.
const TOOL_LEDE = {
  'colour-contrast': 'The Contrast Checker runs the formula above on any pair, gives the verdict against all four thresholds at once, and offers the nearest passing colour when a pair falls short.',
  'type-scales': 'The Type Scale Generator builds the ladder from a base and a ratio at each end of the range, previews it at three viewport widths in real families, and exports the clamp() for every step.',
  'colour-spaces': 'The Tint Scale Generator builds a 50–950 ramp from one colour, and its lightness curve is exactly the choice this article is about: Perceived spaces the stops by HCT tone, Linear by HSL lightness. The two are visibly different on the same seed.',
}

export default function LearnArticle() {
  const { slug } = useParams()
  const article = findArticle(slug)

  // An unknown slug is a genuine 404, not a redirect to the Learn landing. A
  // redirect would answer a dead URL with 200 and real content, which is the
  // soft-404 pattern src/pages/NotFound.jsx exists to stop.
  if (!article || !BODIES[article.slug]) return <NotFound />

  return <Article key={article.slug} article={article} />
}

function Article({ article }) {
  const Body = BODIES[article.slug]
  const sources = article.sources || []
  const active = useActiveSection(article.sections)
  const next = nextArticle(article.slug)
  const minutes = readingMinutes(article.words)

  return (
    <div className="sec lart">
      <nav className="lart-crumb" aria-label="Breadcrumb">
        <Link to="/learn">Learn</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{article.topic}</span>
      </nav>

      <header className="lart-head">
        <h1>{article.title}</h1>
        <p className="lart-dek">{article.dek}</p>
        <p className="lart-meta">
          <span className="lart-topic">{article.topic}</span>
          <span className="lart-meta-sep" aria-hidden="true" />
          <span>{minutes} min read</span>
          <span className="lart-meta-sep" aria-hidden="true" />
          <span>Reviewed <time dateTime={article.updated}>{formatDate(article.updated)}</time></span>
        </p>
      </header>

      <div className="lart-layout">
        <nav className="lart-toc" aria-labelledby="lart-toc-h">
          <h2 className="lart-toc-h" id="lart-toc-h">Contents</h2>
          <ol>
            {article.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} data-active={active === s.id ? 'true' : undefined}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="lart-prose">
          <Body />

          {sources.length > 0 && (
            <section className="lart-sources" aria-labelledby="lart-sources-h">
              <h2 id="lart-sources-h">Sources</h2>
              <ul>
                {sources.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noreferrer noopener">{s.label}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The next step is one link to the tool that does the thing the
              article describes. Not a panel, not a pitch — the reader has just
              been told how a number is calculated, and the tool calculates it. */}
          <aside className="lart-next" aria-label="Put this into practice">
            <p className="lart-next-lede">{TOOL_LEDE[article.slug]}</p>
            <Link className="ui-pill ui-pill-out" to={article.toolTo}>
              Open the {article.toolLabel}
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </aside>

          {next && next.slug !== article.slug && BODIES[next.slug] && (
            <nav className="lart-onward" aria-label="Read next">
              <span className="lart-onward-label">Read next</span>
              <Link to={`/learn/${next.slug}`}>
                <span className="lart-onward-title">{next.title}</span>
                <span className="lart-onward-dek">{next.dek}</span>
              </Link>
            </nav>
          )}
        </article>
      </div>
    </div>
  )
}

/**
 * Which section the reader is in, for the contents rail.
 *
 * The observer window is pinned near the top of the viewport rather than its
 * middle: the question the rail answers is "what am I reading now", and the
 * moment a heading crosses under the nav the reader is in that section even
 * though most of the previous one is still on screen. Intersecting sections are
 * sorted by position so the topmost wins, which keeps the marker stable when
 * two short sections are visible at once.
 */
function useActiveSection(sections) {
  const [active, setActive] = useState('')

  useEffect(() => {
    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting)
        if (!seen.length) return
        seen.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        setActive(seen[0].target.id)
      },
      { rootMargin: '-88px 0px -60% 0px', threshold: 0 },
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [sections])

  return active
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
