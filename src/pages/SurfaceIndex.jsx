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
// THIS PAGE'S OWN SHEET, AND IT IS WHY THIS PAGE IS LAZY.
//
// These rules lived in global.css — the render-blocking entry stylesheet — for
// as long as src/pages/Home.jsx shared them, because Home WAS the front door
// and had to be eager. Spectrum is the front door now, so the only routes that
// can reach `.home-container`, `.home-hero--surface`, `.surface-*` and `.scp-*`
// are /discover and /learn, and /privacy was paying for them.
//
// An eagerly-imported page with its own sheet puts the sheet straight back in
// the entry chunk — tests/unit/home-asset-budget.test.js walks the static
// import graph from src/main.jsx precisely to catch that — so App.jsx reaches
// this page through `lazy()`. The two surface indexes are not the first paint
// and never were; the page they used to share a sheet with was.
import '../styles/pages/surface.css'

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
    node: (
      <div className="scp-icons" aria-hidden="true">
        {['palette', 'type', 'icons', 'imagery', 'ai', 'community-prompts'].map((id) => (
          <span className="scp-icon" key={id}><NavIcon id={id} /></span>
        ))}
      </div>
    ),
  }),
  'community-prompts': () => ({
    node: (
      <div className="scp-lines" aria-hidden="true">
        {PROMPT_PREVIEW_TITLES.map((title) => (
          <span className="scp-line" key={title}>{title}</span>
        ))}
      </div>
    ),
  }),
}

// ── The Discover + Learn INDEXES ────────────────────────────────────────────
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
    title: 'Discover',
    hue: 'imagery',
    groups: DISCOVER_GROUPS,
    hint: `${DISCOVER_LIVE} libraries open · ${DISCOVER_SOON} still being built`,
    gridTitle: 'Every library, and what is in it.',
  },
  learn: {
    title: 'Learn',
    hue: 'ai',
    // The ROADMAP, not every group: two topics now have a guide, and those
    // guides are the cards above this grid. Rendering the delivered rows here
    // too would put a second link to the same page under a heading that says
    // nothing in the grid is written yet.
    groups: LEARN_ROADMAP,
    hint: `${LEARN_ARTICLES.length} guides live · every figure cited or computed`,
    gridTitle: 'Topics still being written.',
    gridLede: 'Nothing in this grid is written yet — that is what Soon means.',
  },
}

export default function SurfaceIndex({ surface }) {
  useReveal()
  const s = SURFACES[surface] || SURFACES.discover
  useEffect(() => {
    if (surface === 'discover') readCommunitySubmissions()
  }, [surface])

  return (
    // `srf` is the page root every rule in pages/surface.css is scoped under.
    // `home` stays for the shell-level rules that still key on it.
    <div className={`home srf srf--${surface}`}>
      <PillNav />

      {/* The page measure lives ON <main>, not on a wrapper inside it: the
          compressed-landing contract (52) counts main's direct children as the
          page's bands, and a wrapper would fold them into one. */}
      <main id="main" className="srf-wrap" tabIndex={-1}>
      {/* ── The page head. NOT a hero, and that is the founder's 2026-09-18
          decision: "/discover and /learn lose their sales intro and go straight
          to the real library/guide index."

          What stays is the surface's own NAME as the h1 — the label the nav
          already uses, and how every library under it is headed — and the
          DERIVED count line, a fact read off the data (DISCOVER_LIVE above)
          rather than a claim. It is left-aligned at the app's page-title scale
          now, not a centred 96px display line over an empty first screen: the
          index under it is the page. */}
      <header className="home-hero home-hero--surface srf-head">
        <h1 className="home-hero-h1 srf-h1">{s.title}</h1>
        <p className="home-hero-hint srf-hint">{s.hint}</p>
      </header>

      {/* ── Learn only: the guides that exist, before the ones that do not ──
          Order is the argument. A reader arriving at Learn should meet pages
          they can open before they meet a roadmap. */}
      {surface === 'learn' && (
        <section className="srf-sec" aria-labelledby="surface-guides-heading">
          <div className="srf-sec-head" data-reveal>
            <h2 className="srf-h2" id="surface-guides-heading">Reference, not opinion.</h2>
          </div>
          {/* Grouped by the topic each guide declares, behind a search over
              their full text. See src/components/LearnGuideIndex.jsx. */}
          <LearnGuideIndex />
        </section>
      )}

      {/* ── The destinations. This grid IS the page. ──
          NAMED, so that it is a landmark: a <section> with no accessible name
          computes to `generic`, and the grid this comment calls "the page" was
          absent from the landmark list. The name is the h2 already here. */}
      <section className="srf-sec" aria-labelledby="surface-grid-heading">
        <div className="srf-sec-head" data-reveal>
          <h2 className="srf-h2" id="surface-grid-heading">{s.gridTitle}</h2>
          {s.gridLede && <p className="srf-lede">{s.gridLede}</p>}
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
                {/* The coloured dot that led every title is gone: one hue per
                    surface, on every card, marked nothing a card did not
                    already say, and it was the page's only saturated mark. */}
                <h3 className="surface-card-title">{g.label}</h3>
                <p className="surface-card-desc">{g.desc}</p>
                {/* The meta sits beside the call to action rather than over
                    the preview: these previews are dense (three palettes,
                    three prompt titles), so a badge laid on top of them
                    covered the very thing it was counting. */}
                <span className="surface-card-foot">
                  {g.soon
                    ? <span className="soon-badge">Soon</span>
                    : <span className="surface-card-go">Browse&nbsp;&rarr;</span>}
                  {/* `preview.meta`, not `preview`: the count badges were
                      deleted in the B2 claims pass, and an empty meta element
                      was left in four card feet. */}
                  {preview?.meta && <span className="surface-card-meta">{preview.meta}</span>}
                </span>
              </>
            )
            // Live groups link to their real page; everything else stays a
            // static "on the way" card — no dead links either way. No lift on
            // hover: nothing about a library changes when a pointer crosses it.
            return g.soon ? (
              <article className="surface-card" key={g.id} data-hue={hue} data-reveal>
                {body}
              </article>
            ) : (
              <Link className="surface-card surface-card--link" key={g.id} to={g.route} data-hue={hue} data-reveal>
                {body}
              </Link>
            )
          })}
        </div>
      </section>
      </main>
    </div>
  )
}
