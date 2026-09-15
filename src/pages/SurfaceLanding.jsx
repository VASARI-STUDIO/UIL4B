import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import NavIcon from '../components/NavIcon'
import { useReveal } from '../hooks/useReveal'
import { DISCOVER_GROUPS, LEARN_ROADMAP } from '../data/toolTree'
import LearnGuideIndex from '../components/LearnGuideIndex'
import { LEARN_ARTICLES } from '../data/learnIndex'
import { readCommunitySubmissions } from '../utils/communitySubmissions'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'
import { GALLERY_GRADIENTS, gradientCss } from '../data/gradientGallery'
// The count and three titles only — NOT the prompt data. This page is one of
// the five App.jsx loads eagerly, so importing COMMUNITY_PROMPTS here put all
// 27.7 KB of it in the main entry chunk, on every route, to render one card.
// See the header of communityPromptsPreview.js for the measurement and for why
// the values are a mirrored copy with a drift test rather than a `.length`.
import { PROMPT_COUNT, PROMPT_PREVIEW_TITLES } from '../data/communityPromptsPreview'

// ── Card previews: what is actually inside each library ─────────────────────
// The eight cards on /discover were eight identical white rectangles carrying a
// title and a sentence. On a page whose whole job is "come and look at things",
// not one card showed a single thing you could look at — you had to click to
// find out whether a library was worth the click.
//
// Every library card on Mobbin leads with its contents: Webflow's Libraries
// grid is thumbnail-first with a count badge over it, and Tines varies card
// weight so a grid of the same shape still reads as edited rather than
// tabulated. These previews are drawn from the REAL gallery data the tools
// read — 64 palettes, 100 gradients, 20 prompts — so the card cannot advertise
// something the library does not contain, and the count is a fact rather than
// a claim.
//
// Keyed by group id and living here rather than in DISCOVER_GROUPS on purpose:
// this is presentation. The array in toolTree.js stays exactly as it is, which
// also keeps this clear of [handkept-tool-lists-remaining].
const PREVIEWS = {
  // COUNTED OFF THE LIBRARY, NOT OFF THE CURATED SET. This read
  // GALLERY_PALETTES.length and said "64 palettes", while /discover/palettes —
  // the page this very card links to — announces "71 palettes" to a signed-out
  // visitor and holds 101. GALLERY_PALETTES is only the curated half;
  // LIBRARY_PALETTES is that set plus the 37 brand systems, and it is what
  // PaletteGallery renders and what that page's own Pro modal counts against.
  // The card was under-counting the library by 37 while its description sold
  // the brand systems as the reason to open it.
  //
  // The swatch preview is drawn from the SAME array as the count, so the card
  // cannot show one library and count another — which is the failure the
  // comment at the top of this block already claimed was impossible.
  'palette-library': () => ({
    meta: `${LIBRARY_PALETTES.length} palettes`,
    node: (
      <div className="scp-stack">
        {LIBRARY_PALETTES.slice(0, 3).map((p) => (
          <div className="scp-row" key={p.id}>
            {p.colors.map((c, i) => <span className="scp-chip" key={i} style={{ background: c }} />)}
          </div>
        ))}
      </div>
    ),
  }),
  'gradient-gallery': () => ({
    meta: `${GALLERY_GRADIENTS.length} gradients`,
    node: (
      <div className="scp-tiles">
        {GALLERY_GRADIENTS.slice(0, 3).map((g) => (
          <span className="scp-tile" key={g.id} style={{ backgroundImage: gradientCss(g.type, g.angle, g.stops) }} />
        ))}
      </div>
    ),
  }),
  // A specimen BLOCK — display line, reading line, mono line — rather than
  // three faces side by side.
  //
  // The first attempt set three "Ag"s in var(--display), var(--font) and
  // var(--mono), and two of them rendered identically: `--display` in this
  // project resolves to 'Manrope', the same value as `--font`. It is a
  // misnamed token, not a serif. A Font Gallery card whose whole claim is
  // "type variety" showing the same face twice is the kind of preview that is
  // decorative and false, so this shows the two families that ARE installed
  // doing the three jobs type actually does. Nothing here can fall back
  // silently to a system face and pass itself off as the catalogue.
  'font-gallery': () => ({
    meta: 'Live specimens',
    node: (
      <div className="scp-type" aria-hidden="true">
        <span className="scp-type-display">Ag</span>
        <span className="scp-type-body">The quick brown fox</span>
        <span className="scp-type-mono">abcdefgh 0123456</span>
      </div>
    ),
  }),
  'icon-library': () => ({
    meta: '200,000+ icons',
    node: (
      <div className="scp-icons" aria-hidden="true">
        {['palette', 'type', 'icons', 'imagery', 'ai', 'community-prompts'].map((id) => (
          <span className="scp-icon" key={id}><NavIcon id={id} /></span>
        ))}
      </div>
    ),
  }),
  'community-prompts': () => ({
    meta: `${PROMPT_COUNT} prompts`,
    node: (
      <div className="scp-lines" aria-hidden="true">
        {PROMPT_PREVIEW_TITLES.map((title) => (
          <span className="scp-line" key={title}>{title}</span>
        ))}
      </div>
    ),
  }),
}

// ── The Discover + Learn landings ───────────────────────────────────────────
//
// COMPRESSED to a value proposition and the links, on the founder's 2026-09-05
// instruction: "i want to compress our secondary sales pages to mostly act as
// linking pages showcasing a tools value proposition then a link". He was
// offered three depths and chose the deepest — value prop plus link, nothing
// else — so what a visitor now meets is: what is in here, one line on why it is
// worth opening, and every destination as a real link. Then the page stops.
//
// THREE SECTIONS WERE DELETED, and the reason is the same for all three: none
// of them was a link and none of them was a fact.
//
//   1. "Why it helps" — three numbered pillars per surface. Textbook slop by
//      the bar's own naming: a rule of three, anaphoric titles, and copy that
//      argues for the product instead of showing it. TWO OF DISCOVER'S THREE
//      WERE ALSO FALSE. "Save what earns a tab / Build collections of the
//      systems you actually reuse" describes Collections, which is
//      `soon: true` in DISCOVER_SPEC and has no page; "Browse community UI
//      systems" describes Inspiration, also `soon: true`. The grid below has
//      always carried honest Soon badges on both — the pillars sold them as
//      shipped two screens above it.
//   2. The world map — "Great UI is built everywhere", over a decorative map
//      plotting no user data, on a product with no users to plot. A slogan and
//      an illustration, on a page whose job is to hand over links.
//   3. The closing SystemCTA — a second, larger copy of the CTA the hero has
//      already made, one scroll after it.
//
// WHAT SURVIVED, AND WHY. Every true claim in the deleted copy is still made,
// at the place it describes rather than as a preamble — the same move the
// homepage made when its intro paragraph went and its three honesty claims
// moved down to the panels they were about:
//   · what is live vs. still being built → the Soon badge on each card, and the
//     hero hint, which now COUNTS the groups instead of asserting a number;
//   · the hand-off into the matching tool → each library card links to the
//     library that does it, and the libraries themselves carry the hand-off
//     buttons the pillar was describing;
//   · what the Learn guides are → the guide cards, which show topic, reading
//     time and dek.
//
// One component still serves both surfaces via the `surface` prop, driven by
// the same DISCOVER_GROUPS / LEARN_GROUPS that feed the nav — so the page can
// never promise a section the menu doesn't list.
//
// Reference for the shape: Shopify's "Explore tools" index — a heading, one
// line, then every tool as name + one sentence + its own link, and nothing
// after the grid. https://mobbin.com/sites/sections/0b61affd-faef-4b8c-b6fd-983b94de9a77

// The guide the hero sends a first-time reader to. Read off the registry
// rather than written down, so reordering the articles moves the button.
const FIRST_GUIDE = LEARN_ARTICLES[0]

// How many Discover libraries a visitor can actually open today. DERIVED, not
// typed: the hint used to read "Four curated libraries are ready now — palettes,
// gradients, fonts and icons", and it had been wrong since the Prompt Library
// shipped and wrong again since /discover/resources did. A hand-typed count on
// a page generated from a list is a claim that goes stale on somebody else's
// commit.
const DISCOVER_LIVE = DISCOVER_GROUPS.filter((g) => !g.soon).length
const DISCOVER_SOON = DISCOVER_GROUPS.length - DISCOVER_LIVE

const SURFACES = {
  // ── Discover, after the anti-slop audit of 2026-09-09 ──────────────────
  //
  // THE HEADLINE WAS A SENTENCE THE FOUNDER HAD ALREADY THROWN OUT. It read
  // "Find systems worth stealing." — and "Systems worth stealing." is one of
  // the four homepage headings 56-founder-rejected-headlines.spec.js keeps off
  // the page, on his verdict: '"Systems worth stealing." is bad copy'. Adding
  // "Find" to a rejected line does not un-reject it. The lede under it
  // ("…the outside tools that earn a tab — most of them one click from the
  // tool that uses them.") was agent copy built on "earn a tab", an idiom
  // that had spread to the nav promo, the Curated Resources hero and two grid
  // headings — a motif by repetition, not a UIL4B signature.
  //
  // Neither is replaced with a new sentence, because there is no founder line
  // about Discover to derive from (see the PR: "sentences the founder needs to
  // write"). The h1 is the surface's own name, which is how every library
  // under it is already headed ("Palette Library", "Gradient Library"), and
  // the eyebrow that repeated that name above it is gone — the founder marked
  // the taxonomy-label-above-an-h1 motif "AI" on the gallery mastheads and
  // asked for the change to reach every header that matches
  // (DiscoverGalleryHero.jsx). The derived hint under the button still says
  // what is open. Learn is untouched: #431 just reworked it.
  discover: {
    eyebrow: null,
    title: 'Discover',
    lede: null,
    hue: 'imagery',
    groups: DISCOVER_GROUPS,
    primaryLabel: 'Browse palettes',
    primaryTo: '/discover/palettes',
    hint: `${DISCOVER_LIVE} libraries open · ${DISCOVER_SOON} still being built`,
    gridTitle: 'Every library, and what is in it.',
  },
  learn: {
    eyebrow: 'Learn',
    title: 'Understand the craft, not just the tools.',
    // "Growth playbooks" came out: SEO and Marketing are roadmap rows with
    // nothing behind them. What exists is the published guides, and what makes
    // them worth opening is that they show their working — which is what the
    // hint says, in the place a reader decides whether to open one.
    lede: 'Reference guides on colour, contrast and type. Each one states the rule, cites the standard it comes from, and ends at the tool that applies it.',
    hue: 'ai',
    // The ROADMAP, not every group: two topics now have a guide, and those
    // guides are the cards above this grid. Rendering the delivered rows here
    // too would put a second link to the same page under a heading that says
    // nothing in the grid is written yet.
    groups: LEARN_ROADMAP,
    primaryLabel: `Start with ${FIRST_GUIDE.navLabel.toLowerCase()}`,
    primaryTo: `/learn/${FIRST_GUIDE.slug}`,
    hint: `${LEARN_ARTICLES.length} guides live · every figure cited or computed`,
    gridTitle: 'Topics still being written.',
    gridLede: 'Nothing in this grid is written yet — that is what Soon means.',
  },
}

export default function SurfaceLanding({ surface }) {
  useReveal()
  const s = SURFACES[surface] || SURFACES.discover
  useEffect(() => {
    if (surface === 'discover') readCommunitySubmissions()
  }, [surface])

  return (
    <div className="home">
      <PillNav />

      <main id="main" tabIndex={-1}>
      {/* ── Hero ──
          `home-hero` alone carries min-height:min(100svh,980px), which the
          HOMEPAGE earns: it holds a search field, eleven satellites and the
          workbench. This hero holds an eyebrow, a heading, a line of lede, one
          button and a hint — measured at 1440x900 its content ended at 499px
          inside a 900px box, so 401px of the first screen of /discover was
          nothing at all. The modifier lets it be as tall as it is.

          ONE button, not two. The second was "Explore fonts" on Discover and
          "Start building" on Learn — a link OUT of the surface the visitor has
          just arrived at, competing with the grid of that surface's own
          destinations a screen below. */}
      <header className="home-hero home-hero--surface">
        {s.eyebrow && <span className="home-eyebrow">{s.eyebrow}</span>}
        <h1 className="home-hero-h1">{s.title}</h1>
        {s.lede && <p className="home-hero-sub">{s.lede}</p>}
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to={s.primaryTo}>
            {s.primaryLabel}
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <p className="home-hero-hint">{s.hint}</p>
      </header>

      {/* ── Learn only: the guides that exist, before the ones that do not ──
          Order is the argument. A reader arriving at Learn should meet pages
          they can open before they meet a roadmap; the previous version led
          with eight Soon cards and had nothing behind any of them. */}
      {surface === 'learn' && (
        <section className="home-section" aria-labelledby="surface-guides-heading">
          <div className="home-container">
            <div className="home-head home-head-center" data-reveal>
              <h2 className="home-h2" id="surface-guides-heading">Reference, not opinion.</h2>
            </div>
            {/* Grouped by the topic each guide declares, behind a search over
                their full text. See src/components/LearnGuideIndex.jsx. */}
            <LearnGuideIndex />
          </div>
        </section>
      )}

      {/* ── The destinations. This grid IS the page. ──
          NAMED, so that it is a landmark. Measured on the built preview at
          eleven widths in both themes, /discover offered exactly four
          landmarks — navigation("Primary") | main | contentinfo |
          navigation("Footer") — and not one of them said anything about
          libraries. A <section> with no accessible name computes to `generic`,
          so the grid this comment calls "the page" was absent from the
          landmark list, which is how a non-visual reader answers "what is
          this page made of" on arrival. Both galleries beneath this surface
          already name their results region; the index above them did not, so
          it was the only page in the set whose subject could not be reached
          that way. The name is the h2 that is already here — no new sentence. */}
      <section className="home-section" aria-labelledby="surface-grid-heading">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <h2 className="home-h2" id="surface-grid-heading">{s.gridTitle}</h2>
            {s.gridLede && <p className="home-lede">{s.gridLede}</p>}
          </div>

          <div className="surface-grid">
            {s.groups.map((g) => {
              const hue = g.accent ? 'accent' : s.hue
              // Live libraries lead with what is inside them; the ones still on
              // the way stay a plain card, which is the honest difference and
              // also the thing that stops eight identical rectangles.
              const preview = !g.soon && PREVIEWS[g.id] ? PREVIEWS[g.id]() : null
              const body = (
                <>
                  {preview && (
                    <span className="surface-card-preview" aria-hidden="true">{preview.node}</span>
                  )}
                  <h3 className="surface-card-title">
                    <span className="fx-dot" aria-hidden="true" />
                    {g.label}
                  </h3>
                  <p className="surface-card-desc">{g.desc}</p>
                  {/* The meta sits beside the call to action rather than over
                      the preview: these previews are dense (three palettes,
                      three prompt titles), so a badge laid on top of them
                      covered the very thing it was counting. */}
                  <span className="surface-card-foot">
                    {g.soon
                      ? <span className="soon-badge">Soon</span>
                      : <span className="surface-card-go">Browse&nbsp;&rarr;</span>}
                    {preview && <span className="surface-card-meta">{preview.meta}</span>}
                  </span>
                </>
              )
              // Live groups (soon:false) link to their real page; everything else
              // stays a static "on the way" card — no dead links either way.
              return g.soon ? (
                <article className="surface-card fx-lift" key={g.id} data-hue={hue} data-reveal>
                  {body}
                </article>
              ) : (
                <Link className="surface-card surface-card--link fx-lift" key={g.id} to={g.route} data-hue={hue} data-reveal>
                  {body}
                </Link>
              )
            })}
          </div>
        </div>
      </section>
      </main>
    </div>
  )
}
