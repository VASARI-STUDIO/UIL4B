import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import HomeCommandBar from './HomeCommandBar'

// ── TEMPORARY. Delete this file when the founder picks a direction. ──────────
//
// Backlog item `hero-copy-still-reads-ai`. The founder has now reported three
// times that the hero reads as AI-generated. #290 answered the second report by
// REWRITING THE WORDS inside the existing hero, against the anti-slop bar, and
// the complaint survived that rewrite.
//
// #290 is therefore a control experiment that has already been run: same
// structure, different words, same verdict. So the variable under test here is
// not the words — it is the SHAPE. Three shapes, for the founder to choose
// between; the shipped hero is untouched and is still the default.
//
//   /?hero=a   the bar opens the page
//   /?hero=b   off the centre axis
//   /?hero=c   subtraction, and a line only the founder can write
//
// Nothing renders from this file without that parameter, and `children` is the
// live hero — so removing the exploration is a file delete plus unwrapping one
// element in Home.jsx. It is deliberately NOT a route: a second homepage route
// would need prerendering, a sitemap entry, route metadata and its own tests,
// and would then be indexable, which an exploration must never be.
//
// The shipped hero's own contract (one <mark>, the sr-only accessible name, the
// command bar below the copy) is asserted by
// tests/user-sim/10-home-chaos-to-calm.spec.js against the DEFAULT, which is
// what these variants sit beside rather than replace. Whichever direction wins
// will need those assertions moved onto it deliberately, the same way the
// search-bar assertions were moved in the commit before this one.

const DIRECTIONS = ['a', 'b', 'c']

// The accessible name for the search box, carried the same way the shipped hero
// carries it. Every variant below keeps it: the founder removed the *painted*
// line, not the name, and a variant that quietly dropped it would be proposing
// an accessibility regression as a design direction.
function SearchBar() {
  return (
    <>
      <p className="sr-only" id="home-search-label">Search every tool</p>
      <HomeCommandBar labelledBy="home-search-label" />
    </>
  )
}

export default function HomeHeroDirections({ toolCount, children }) {
  const dir = useMemo(() => {
    // `window` is undefined while scripts/prerender.mjs renders the shells, and
    // the shells must always contain the SHIPPED hero — an exploration variant
    // baked into the prerendered HTML would be what a crawler reads.
    if (typeof window === 'undefined') return null
    const value = new URLSearchParams(window.location.search).get('hero')
    return DIRECTIONS.includes(value) ? value : null
  }, [])

  if (!dir) return children

  return (
    <header className="home-hero home-hero--dir" data-hero-dir={dir}>
      <p className="hero-dir-flag">
        Direction {dir.toUpperCase()} · exploration, not shipped · remove <code>?hero=</code> for the live hero
      </p>

      {/* ── A · The bar opens the page ─────────────────────────────────────────
          The reference is Grok, which puts its input first and demotes the
          explanatory sentence to the bottom of the fold. The hierarchy inverts:
          the instrument becomes the largest object on the page and the headline
          becomes its caption.

          The argument for it here is that the sentence is TRUE of UIL4B in a way
          it is not true of most sites that try it — this bar is not a picture of
          a search box, it queries the real registry and its results are real
          routes. A hero whose biggest element is the working product cannot read
          as generated, because a generated hero has nothing to put there.

          The headline is an INVENTORY rather than a promise, and the count is
          derived from the tool tree rather than typed. That is the other half of
          the move: no claim to disbelieve. */}
      {dir === 'a' && (
        <div className="home-hero-core hero-dir-a">
          <h1 className="hero-a-h1">
            {toolCount} tools for colour, type, icons and images.
          </h1>
          <SearchBar />
          {/* The payment clause that opened this line is gone (founder,
              2026-09-07). "Or …" was a continuation of it, so the sentence is
              reread rather than left dangling: the link is now the whole line,
              which is what it always was for. */}
          <p className="hero-a-under">
            <Link to="/create/palette">Open the palette builder</Link>.
          </p>
        </div>
      )}

      {/* ── B · Off the centre axis ────────────────────────────────────────────
          The reference is Antimetal and Retool's developer hero: left-aligned,
          measure-constrained, with the right of the fold deliberately empty
          rather than filled.

          Perfect bilateral symmetry is the single most identifiable property of
          a generated hero — six elements, each a different type treatment, all
          stacked on one centre line. Nothing inside that arrangement can escape
          it, which is why #290's rewrite did not.

          The sentence changes SHAPE as well as position: two flat declaratives
          instead of one balanced clause with a "so" hinge. Same claim, and it is
          the claim the shipped copy already makes — a visitor can check it.

          Note what is NOT here: the catalogue figures. A stat strip above a
          headline is what #290 removed from this hero, for exactly the reason
          this direction exists. Bringing it back as a right-hand column would be
          the same furniture rotated ninety degrees. */}
      {dir === 'b' && (
        <div className="home-hero-core hero-dir-b">
          <h1 className="hero-b-h1">
            Change a hex in the palette builder.<br />
            Your export ships that hex.
          </h1>
          <p className="hero-b-sub">
            Every tool reads and writes the same values.
          </p>
          <SearchBar />
          <div className="home-hero-cta hero-b-cta">
            <Link className="ui-pill ui-pill-accent ui-pill-lg" to="/login?signup=1">
              Start building free
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
            <a className="ui-pill ui-pill-quiet ui-pill-lg" href="#workbench">See it working</a>
          </div>
        </div>
      )}

      {/* ── C · Subtraction, and a line only the founder can write ─────────────
          The other two change the arrangement. This one tests whether the
          arrangement was ever the problem, by deleting almost all of it: no
          kicker, no subtitle, no <mark>, no reassurance line, no second button.
          A headline, the bar, one link.

          THE HEADLINE IS A DELIBERATE PLACEHOLDER AND MUST NOT SHIP AS WRITTEN.
          The founder has asked for "real australian style english to sound like
          me not an AI written statement". Any sentence written here in that
          register would be an agent imitating his voice, which is the exact
          failure the whole item is about — so what is set below is a neutral
          string of roughly the right length and rhythm, present so the SHAPE can
          be judged, and flagged on screen so it cannot be mistaken for a
          proposal.

          If this is the direction, the deliverable is the founder's sentence.
          Everything else about it is already done. */}
      {dir === 'c' && (
        <div className="home-hero-core hero-dir-c">
          <p className="hero-c-placeholder-flag">Founder writes this line</p>
          <h1 className="hero-c-h1">
            One sentence, in your words, about what this is for.
          </h1>
          <SearchBar />
          <p className="hero-a-under">
            <Link to="/login?signup=1">Start building free</Link>
          </p>
        </div>
      )}
    </header>
  )
}
