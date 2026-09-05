import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import HomeWorkbench from '../components/HomeWorkbench'
import HomeCommandBar from '../components/HomeCommandBar'
import TryItMark from '../components/TryItMark'
// TEMPORARY — the hero-direction explorer for `hero-copy-still-reads-ai`.
// Renders `children` (the shipped hero) unless ?hero=a|b|c is present.
import HomeHeroDirections from '../components/HomeHeroDirections'
import NavIcon from '../components/NavIcon'
import SystemCTA from '../components/SystemCTA'
import { useHomeMotion } from '../hooks/useHomeMotion'
import { CREATE_GROUPS, HOME_SATELLITES, HOME_WORKBENCH_TABS, categoryDestination, toolRoute } from '../data/toolTree'
import { GALLERY_GRADIENTS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'
import { paletteBuilderUrl } from '../data/paletteGallery'

// ── The V2 homepage ──────────────────────────────────────────────────────────
//
// A sales page built around the real product, in the order the visitor's
// questions arrive: what is this (hero + command bar) → show me it working
// (sticky scroll over the live workbench) → what else is in it (tools grid) →
// who else uses it (community) → what does it cost (pricing) → start.
//
// Three things the founder asked to keep, and this page keeps all three:
//   · PillNav is the navigation system, untouched;
//   · HomeWorkbench IS the demo — the sticky panel re-houses the real
//     component, not a re-implementation of it;
//   · useHomeMotion() owns motion — Lenis smooth scroll, the CSS hero
//     entrance, scroll reveals and the sticky step sync, all reduced-motion
//     guarded.
//
// The command bar searches the real tool registry through the same
// `queryCommandIndex` the ⌘K palette uses. There is no second index.

/* ── Catalogue figures — every number derived, none invented ──────────────── */

// Counted from the tool tree at module load, so the claim can never drift from
// the product. The mock's "40+ TOOLS" was invented; this is what is live.
const LIVE_TOOL_COUNT = CREATE_GROUPS
  .flatMap((g) => g.tools)
  .filter((t) => !t.soon).length

// 200k icons: the Iconify catalogue behind /create/icons, already claimed in
// toolTree.js and in the workbench's Icon panel.
// 1,500+ fonts: the Google Fonts catalogue behind /create/font-gallery, as
// described in discoverResources.js. Both are the real libraries the tools read.
//
// THESE USED TO SIT ABOVE THE HEADLINE, as a centred `48 LIVE TOOLS · 200K
// ICONS · 1,500+ FONTS · ONE ACCOUNT` strip. The numbers were honest; the
// COMPONENT was the problem. A stat bar over a hero headline is the single most
// recognisable piece of generic SaaS furniture, and a visitor reads the shape
// before they read the figures — which is exactly the "this is an AI-generated
// website" reaction the founder relayed from a real user.
//
// They now sit beside the toolset grid, where each number describes something
// the reader can see on screen rather than announcing itself as proof.
const CATALOGUE_FACTS = [
  { value: String(LIVE_TOOL_COUNT), label: 'tools live today' },
  { value: '200k', label: 'icons, via Iconify' },
  { value: '1,500+', label: 'families, via Google Fonts' },
]

/* ── The sticky scroll narrative ──────────────────────────────────────────── */

// One step per workbench mode, in tab order — the left column narrates, the
// right column IS that mode of the real workbench. `tab` is the binding.
//
// This table is PRESENTATION — kicker, title, body, points, CTA label — plus
// two ids it does not own: `tab` names a workbench mode and `tool` names a tool
// in CREATE_GROUPS. It does NOT write a route down. The five `to:` literals that
// used to sit here were the last hand-kept copy of a route table on the homepage;
// toolRoute() reads each one back out of the tree, throws on an unknown id, and
// tests/unit/tool-tree-surfaces.test.js fails the build if a literal reappears.
const STEPS = [
  {
    tab: 'palette',
    num: '01',
    kicker: 'COLOUR',
    title: 'Start with a palette you can defend.',
    body: 'Generate a five-step ramp, lock the colours that are already right, and regenerate the rest. Every value is a real hex you can copy straight out.',
    points: ['Lock and regenerate individual steps', 'Copy any value to the clipboard', 'Carries into the full builder on the free Auto system'],
    tool: 'palette',
    cta: { label: 'Open Palette Builder' },
  },
  {
    tab: 'gradient',
    num: '02',
    kicker: 'GRADIENT',
    title: 'Tune a gradient and take the CSS.',
    body: 'Two stops and an angle, previewed live. A half-typed hex never destroys the preview — the field tells you what to correct and keeps the last valid value.',
    points: ['Live preview from real CSS', 'Invalid input explains itself', 'Copy the declaration, not a screenshot'],
    tool: 'gradient',
    cta: { label: 'Open Gradient Generator' },
  },
  {
    tab: 'image',
    num: '03',
    kicker: 'IMAGERY',
    title: 'Decide the output before you convert.',
    body: 'Set resolution, file type and compression against a reference image, then hand your own files to the converter with that draft already applied.',
    points: ['Honest limits — WebP cannot store lossless, and says so', 'Nothing is encoded here; File Converter does the work', 'Your files never touch storage or the URL'],
    tool: 'file-converter',
    cta: { label: 'Open File Converter' },
  },
  {
    tab: 'icon',
    num: '04',
    kicker: 'ICONS',
    title: 'Size and weight an icon before you commit.',
    body: 'Twelve bundled glyphs, three sizes, four stroke widths — a free taste of the editor. Nothing saves, downloads or counts against a plan.',
    points: ['No catalogue call — the preview is local', 'Opens your draft in the real editor', '200k icons once you are there'],
    tool: 'icons',
    cta: { label: 'Open Icon Library' },
  },
  {
    tab: 'typography',
    num: '05',
    kicker: 'TYPE',
    title: 'Build a scale that actually computes.',
    body: 'Real modular-scale maths from your base size and ratio, previewed at every step, then carried into the full Type Scale generator.',
    points: ['Display, heading, body and caption computed live', 'Edit the specimen text', 'Family choices survive the hand-off'],
    tool: 'type-scale',
    cta: { label: 'Open Type Scale' },
  },
]

/* ── Pricing ──────────────────────────────────────────────────────────────────
 *
 * ⚠️ DISPLAY VALUES ONLY — NOT WIRED TO STRIPE.
 *
 * These are the founder-approved marketing ladder recorded in
 * docs/reference/design-language-v2.md ("Deviations from the mock", 2026-08-16):
 * monthly $7 · quarterly $18 ($6/mo) · yearly $48 ($4/mo), headline "from
 * $4/month".
 *
 * The live price service (`useProPrice` / `api/_lib/pricing.js`) knows only
 * MONTHLY and YEARLY — there is no quarterly price object — and its amounts are
 * whatever Stripe currently returns, which is not guaranteed to be this ladder.
 * Reading half the panel from the service and hard-coding the other half would
 * put two different numbers for the same plan on one page.
 *
 * So this panel is marketing copy: it names the ladder, links to /plans, and
 * /plans remains the only surface that quotes a live, currency-correct,
 * checkout-backed price. Pricing, Stripe and plan files are founder-gated and
 * owned by a separate workstream — nothing here touches them.
 *
 * TO WIRE LATER: add a quarterly price to the price service, then replace
 * PRICE_LADDER with useProPrice() output and delete this comment.
 */
const PRICE_LADDER = [
  { id: 'monthly', cadence: 'Monthly', perMonth: '$7', total: '$7 billed monthly', note: 'Cancel any time' },
  { id: 'quarterly', cadence: 'Quarterly', perMonth: '$6', total: '$18 billed every 3 months', note: 'Save $3 a quarter' },
  { id: 'yearly', cadence: 'Yearly', perMonth: '$4', total: '$48 billed yearly', note: 'Best value · 7-day free trial', best: true },
]

const PRO_INCLUDES = [
  'Every colour, type, icon and image tool',
  'Saved projects and full system exports',
  'Higher AI generation limits',
  'Community submissions and the full prompt library',
]

/* ── Starting points ──────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS SECTION USED TO BE, AND WHY IT CHANGED.
 *
 * It rendered six rows of `COMMUNITY_DESIGNS` — twelve `target=_blank`
 * `rel=nofollow` links to dribbble.com, awwwards.com, behance.net and
 * mobbin.com — under the heading "What other people have published", with
 * `{design.saves} saves` printed on every card. Every one of those counts was
 * zero, because nobody has saved anything yet.
 *
 * Both halves were doing damage on the FRONT PAGE. The links sent a first-time
 * visitor to four competitors from the homepage of a product that wants them
 * to start here. The metric printed a zero beside each one, which reads as
 * "nobody uses this" — the strip copy was honest about the zero, but an honest
 * zero is still the weakest possible thing to say about yourself.
 *
 * WHAT IT IS NOW. The same grid, pointed INWARD at artefacts this product
 * already ships: real gradients out of GALLERY_GRADIENTS and real palettes out
 * of LIBRARY_PALETTES. The card art is the artefact ITSELF rather than a
 * decorative two-stop gradient standing in for it, and the link opens the
 * matching tool with the values already loaded — gradientToolUrl() and
 * paletteBuilderUrl() are the same hand-offs the Discover galleries use, so
 * there is no second encoding of a tool URL here.
 *
 * The line under each card is a fact about the artefact (its stops and angle,
 * or how many colours it carries), not a social metric. Nothing here claims
 * anyone else has used it, because nobody has, and the fix for empty social
 * proof is to stop making a social claim — not to find a better zero.
 *
 * THE COMMUNITY SEAM HAS MOVED, NOT GONE. `COMMUNITY_DESIGNS` is untouched and
 * still seeds /community, which is the surface that can legitimately say
 * "until real submissions exist" and marks every curated row as curated. When
 * the community backend lands (feat/community-rebuild is building its
 * identity, queue and trending logic right now), a real feed can take this
 * grid back — HOME_STARTERS is the single place that would change. This is
 * deliberately NOT wired to that work in flight: nothing here reads
 * src/utils/community*.
 *
 * The Trending / Newest / Most saved tablist went with the old data. Two of
 * its three modes had no signal to sort on and said so in a note underneath;
 * a control that cannot do the thing it names is worse than no control.
 */

// PRESENTATION, keyed by an artefact's own id — the same split
// HOME_SATELLITE_SPEC makes in toolTree.js. It chooses WHICH artefacts appear
// and in what order. It cannot invent one, and it never writes a colour, a URL
// or a name down: all three are read back out of the gallery that owns it.
const HOME_STARTER_SPEC = [
  { kind: 'gradient', id: 'sunset-blaze' },
  { kind: 'palette', id: 'midnight-teal' },
  { kind: 'gradient', id: 'deep-sea' },
  { kind: 'palette', id: 'terracotta-dusk' },
  { kind: 'gradient', id: 'sun-flare' },
  { kind: 'palette', id: 'paper-ink' },
]

// An unknown id THROWS at import, which fails `npm run build` — prerender.mjs
// renders this page. Silently dropping a row is how a homepage section quietly
// loses a third of itself; the same reasoning as requireTool() in toolTree.js.
const HOME_STARTERS = HOME_STARTER_SPEC.map(({ kind, id }) => {
  if (kind === 'gradient') {
    const g = GALLERY_GRADIENTS.find((x) => x.id === id)
    if (!g) throw new Error(`HOME_STARTER_SPEC names gradient "${id}", which is not in GALLERY_GRADIENTS`)
    return {
      id: g.id,
      name: g.name,
      kind: 'Gradient',
      // The artefact rendered for real, not a stand-in for it.
      art: gradientCss(g.type, g.angle, g.stops),
      fact: g.type === 'Linear'
        ? `${g.stops.length} stops · ${g.angle}°`
        : `${g.type} · ${g.stops.length} stops`,
      to: gradientToolUrl(g),
      opens: 'Gradient Generator',
    }
  }
  const p = LIBRARY_PALETTES.find((x) => x.id === id)
  if (!p) throw new Error(`HOME_STARTER_SPEC names palette "${id}", which is not in LIBRARY_PALETTES`)
  // Hard stops, so the swatches read as swatches rather than as a blend, out of
  // one background value — the card art stays a single element for both kinds.
  const step = 100 / p.colors.length
  const bands = p.colors
    .map((c, i) => `${c} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`)
    .join(', ')
  return {
    id: p.id,
    name: p.name,
    kind: 'Palette',
    art: `linear-gradient(90deg, ${bands})`,
    fact: `${p.colors.length} colours`,
    to: paletteBuilderUrl(p.colors),
    opens: 'Palette Builder',
  }
})

// Real catalogue sizes, counted off the arrays. The only numbers this section
// prints are ones it can count.
const STARTER_TOTALS = { gradients: GALLERY_GRADIENTS.length, palettes: LIBRARY_PALETTES.length }

/* ── Tool → workbench-mode relationship ──────────────────────────────────────
 * The old hero carried this with `aria-describedby` on each of eleven satellite
 * links. The satellites are gone, but the RELATIONSHIP is not — a screen-reader
 * user still needs to hear which workbench mode a tool resolves into, so the
 * same descriptions move onto the tools grid.
 */
const FAMILY_BY_ROUTE = Object.fromEntries(HOME_SATELLITES.map((s) => [s.route, s.family]))

export default function Home() {
  const rootRef = useRef(null)
  const [mode, setMode] = useState(HOME_WORKBENCH_TABS[0].id)
  // Once the visitor drives the tablist themselves, scroll stops overriding
  // them. Nothing is more irritating than a control that keeps changing back.
  const pinnedRef = useRef(false)

  const onStepChange = useCallback((tab) => {
    if (pinnedRef.current) return
    setMode(tab)
  }, [])

  const onTabChange = useCallback((tab) => {
    pinnedRef.current = true
    setMode(tab)
  }, [])

  useHomeMotion(rootRef, { onStepChange })

  const activeStep = STEPS.findIndex((s) => s.tab === mode)

  return (
    <div className="home" ref={rootRef}>
      <PillNav />

      <main id="main" tabIndex={-1}>
        {/* ── Hero ──
            Reading order is the argument: what is live (stats), the promise
            (headline), the qualifier (sub), the way in (command bar), the two
            actions, the honest terms. Nothing here waits on GSAP — the
            entrance is CSS keyframes and the command bar is plain React. */}
        {/* ── Hero ──
            REWRITTEN after a user told the founder the page read instantly as
            "an AI-generated website". The diagnosis, kept here because the old
            copy will look harmless to anyone who did not see it beside the
            reference set:
              · a centred stat strip above the headline — the most recognisable
                piece of generic SaaS furniture there is;
              · a headline that promised a category ("Every design tool, one
                search box away") rather than naming the thing being made, so it
                could have sat on dozens of unrelated products;
              · a sub-headline opening on the reader's pain ("Stop hunting
                through twelve bookmarked tabs") with an invented specific;
              · a three-clause reassurance line under the buttons.
            Each of those is fluent. Together they are furniture, and a visitor
            reads the furniture before the words.

            What replaces it says what UIL4B makes and what is true of it. The
            command bar stays — it searches the real registry through the same
            index as the ⌘K palette, and it is the most product-specific thing
            on the page — but it now carries its own small label instead of
            being the referent for a pun in the headline. */}
        <HomeHeroDirections toolCount={LIVE_TOOL_COUNT}>
        <header className="home-hero">
          <div className="home-hero-core">
            <p className="home-hero-kicker">UI system toolkit</p>

            {/* The mark lands on "one system", which is the actual claim and the
                one a visitor can check: the same values move between tools.

                THE THIRD NOUN WAS "tokens" UNTIL 2026-09-06, and it is "icons"
                rather than "Styles" on purpose. The founder's decision (P-019,
                option C) names Styles as the COLLECTIVE noun; this line is not a
                collective, it is a list of three concrete things, and Styles is
                a superset of the two beside it — "Colour, type and styles" reads
                as leftovers, not as a third family. So the rule the rest of the
                rename applied holds here too: where the sentence already sits
                beside concrete artefacts, name the artefact. Icons are a live
                Create group, a workbench tab on this very page, and already in
                the tools heading below and in the Plans comparison table.

                The SHAPE of this headline is a separate, open question —
                [hero-copy-still-reads-ai] owns it and is blocked on the
                founder's pick of direction A, B or C. This slice changes one
                word and deliberately does not touch the structure. */}
            <h1 className="home-hero-h1">
              <span className="home-hero-line"><span className="home-hero-line-in">Colour, type and icons</span></span>
              <span className="home-hero-line"><span className="home-hero-line-in">
                that stay <mark className="home-mark">one system</mark>.
              </span></span>
            </h1>

            <p className="home-hero-sub">
              Every tool here reads and writes the same values, so the hex you change in the
              palette builder is the hex your export ships. Nothing to install.
            </p>

            {/* The visible "Search every tool" line above the bar is gone on the
                founder's 2026-09-03 instruction, along with the "Try …" chips
                below it. The ACCESSIBLE NAME cannot go with them.

                `aria-labelledby` on the input points at this id. Delete the
                element and the search box has no accessible name at all, which
                is a WCAG 4.1.2 failure and reads to a screen reader as an
                unlabelled edit field in the middle of a heading. So the element
                stays exactly where it was in the reading order — it is simply
                no longer painted.

                What the two removed lines did for a SIGHTED visitor — say that
                this is a search box, and say what is in it — now belongs to the
                bar itself: the `>` prompt says what it is, and the placeholder
                types real tool names to say what is in it. See HomeCommandBar. */}
            <p className="sr-only" id="home-search-label">Search every tool</p>
            {/* The command bar keeps its own max-width and centring; this
                wrapper exists only to give the drawn mark something to sit
                beside, so the mark tracks the BAR rather than the hero box and
                stays attached however the headline above it wraps. */}
            <div className="tim-anchor">
              <HomeCommandBar labelledBy="home-search-label" />
              <TryItMark />
            </div>

            <div className="home-hero-cta">
              {/* ?signup=1 so the popup opens on the sign-up form. A real
                  <Link> rather than a button, so it stays middle-clickable —
                  which is why the intent travels in the URL, not in a prop. */}
              <Link className="ui-pill ui-pill-accent ui-pill-lg" to="/login?signup=1">
                Start building free
                <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
              </Link>
              <a className="ui-pill ui-pill-quiet ui-pill-lg" href="#workbench">See it working</a>
            </div>

            <p className="home-hero-hint">Free to use. No card.</p>
          </div>
        </header>
        </HomeHeroDirections>

        {/* ── The working half: five steps, one live workbench ──
            The left column narrates; the right column is the REAL
            HomeWorkbench, sticky, swapping mode as the steps pass. The
            tablist inside it stays the authoritative control — scroll is an
            enhancement, and touching a tab pins it. */}
        <section className="hsteps" id="workbench" aria-labelledby="hsteps-title">
          <div className="home-container">
            {/* The bracketed [ CREATE ] eyebrow is gone, here and on the
                three sections below it. Four of them, identically formatted,
                had stopped being wayfinding and become a motif — and a motif
                applied uniformly is decoration. Where a heading already names
                its own section, an eyebrow above it is a second label for the
                same thing.

                THIS BLOCK HAS NOW FAILED TWICE FOR ONE REASON, so the third
                version is a deletion rather than a rewrite.

                v1 was "Not a screenshot. The actual tools, running here."
                Rejected as defensive negation: it argues with a doubt the
                reader has not voiced, and "Not an X. The real Y." is itself a
                tell.

                v2 was "Everything below is the real tool. Use it." over "Real
                generated values, real keyboard handling, real clipboard.
                Nothing saves, nothing needs an account, and every panel names
                where it hands off before you press it." Founder, 2026-09-05:
                "MEGA AI generated ... horrible copy".

                Different register, same move. Both spent the whole word budget
                litigating one question — is this real? — that prose cannot
                settle and the reader had not asked. v2 also stacked the three
                most recognisable generated-prose tics into forty words: triple
                anaphora ("Real X, real Y, real Z"), a second anaphoric pair
                ("Nothing saves, nothing needs an account"), and a two-word
                imperative fragment ("Use it."). Copy that insists on its own
                authenticity reads as generated precisely because a product
                confident in the panels below would not need the line.

                So the LEDE IS GONE, not replaced. Its three honesty claims were
                load-bearing and they are all still made — at the point of use,
                where they are checkable, rather than as a preamble the reader
                has no reason to trust yet:
                  · "nothing saves" → each panel's own note (Image: "Nothing is
                    converted here"; Icon: "Nothing here saves to My Icons…";
                    Typography: "It does not save a font kit"; Palette: the
                    Generate note). Gradient stages no state to save.
                  · "no account" → the hero's "Free to use. No card." above, and
                    Palette's "on the free Auto system" below.
                  · "names where it hands off" → every `.hw-foot` does exactly
                    this, in the sentence next to the button it describes.

                THE HEADING STAYS, because `aria-labelledby` on this section
                points at it and because it is the one thing the panels cannot
                show themselves: a visitor meets one mode at a time and can see
                neither that there are five nor that the work travels. It says
                that and stops. */}
            <div className="hsteps-head" data-reveal>
              <h2 className="hh2" id="hsteps-title">
                Five tools. Each one hands your work to the full tool.
              </h2>

              {/* THE HEADING'S OWN CLAIM, SHOWN INSTEAD OF ASSERTED — and NOT a
                  paragraph, because the paragraph that used to live here was
                  deleted twice for reading as generated and must not come back
                  (see the long note above).

                  Founder, 2026-09-05: "use the mobbin MCP to look at sites like
                  buffer for slight aleration of the hero and intro to tool
                  section". Buffer's "Here's what you can do with Buffer" screen
                  is this exact arrangement: the heading on the left, and beside
                  it the short list of the things the section will walk through,
                  with the one you are currently on carrying its detail and the
                  rest reduced to their names.
                  https://mobbin.com/screens/42990c6e-5536-41b6-b2bb-5332fbe87768

                  Two problems it fixes at once. The heading says there are FIVE
                  and that they connect, and a reader meeting one sticky panel at
                  a time can verify neither until they have scrolled the whole
                  section — this shows the set. And `.hsteps-head` is capped at
                  720px inside a full-width container, so at 1440px the band was
                  a short line of type with 740px of nothing beside it.

                  It reads scroll position and nothing else: `activeStep` is the
                  same index the rail below already uses, so this cannot disagree
                  with it. aria-hidden because it is a position indicator for a
                  list that is RIGHT THERE as a semantic <ol>, and because it is
                  not operable — five labels that highlighted but could not be
                  clicked would read to a screen reader as a broken tablist. */}
              <ol className="hsteps-ticks" aria-hidden="true">
                {STEPS.map((step, index) => (
                  <li className="hsteps-tick" key={step.tab} data-active={index === activeStep || undefined}>
                    <span className="hsteps-tick-num">{step.num}</span>
                    <span className="hsteps-tick-name">{step.kicker}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="hsteps-grid">
              <ol className="hsteps-rail">
                {STEPS.map((step, index) => (
                  <li
                    className="hstep"
                    key={step.tab}
                    data-step={step.tab}
                    data-active={index === activeStep}
                  >
                    <p className="hstep-num">
                      <span>{step.num}</span>
                      <span className="hstep-num-sep" aria-hidden="true">/</span>
                      <span>{step.kicker}</span>
                    </p>
                    <h3 className="hstep-title">{step.title}</h3>
                    <p className="hstep-body">{step.body}</p>
                    <ul className="hstep-points">
                      {step.points.map((point) => (
                        <li key={point}>
                          <svg className="hstep-tick" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                            <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link className="hstep-cta" to={toolRoute(step.tool)}>
                      {step.cta.label}
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="hsteps-sticky">
                <HomeWorkbench variant="sticky" activeTab={mode} onTabChange={onTabChange} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Tools grid ──
            Six categories, and every tool route the product has — a superset
            of the eleven links the old hero exposed, so nothing is orphaned.
            Unbuilt tools carry the same Soon badge the nav uses rather than
            being hidden or claimed as live. */}
        <section className="htools" aria-labelledby="htools-title">
          <div className="home-container">
            {/* "Six categories. One account." — the N-nouns/one-noun fragment
                pair, which appeared three times on this page in three different
                sizes. Naming them is shorter to read and tells the visitor
                something the count does not.

                THIS LIST LOST A NOUN, not gained a replacement. It read
                "Colour, type, icons, imagery, tokens, export." — and "tokens"
                was never a sibling of the four beside it, it is how those four
                are stored. Swapping in "styles" would repeat the same category
                error with a different word, so the word is simply gone (P-019
                rule R: token comes out of every sales, navigation and
                tool-heading surface, and survives past the export boundary
                only). What is left is four live tool families and the thing
                they end in. Components are absent on purpose — the lede
                directly below is where they are named, as coming next. */}
            <div className="htools-head" data-reveal>
              <h2 className="hh2" id="htools-title">Colour, type, icons, imagery, export.</h2>
              {/* Canonical founder direction (uil4b-brand-design →
                  surface-principles.md): component tooling must be NAMED as
                  coming next, and must never appear as a live preview mode. It
                  used to ride in the hero sub-copy; the V2 hero is about search,
                  so the claim moves here — beside the card that carries the Soon
                  badge, which is where it is actually useful. */}
              <p className="hlede">
                Every tool reads and writes the same system, so a colour decision in one place
                is the same colour decision everywhere else. Component tooling is coming next.
              </p>
              {/* The figures the hero used to announce. Down here each one
                  describes something on screen — the grid the reader is
                  looking at — instead of arriving as proof before there is
                  anything to prove. */}
              <dl className="htools-facts">
                {CATALOGUE_FACTS.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.value}</dt>
                    <dd>{fact.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <ul className="htools-grid" data-reveal-group>
              {CREATE_GROUPS.map((group) => (
                <li className="htool" key={group.id} data-hue={group.hue}>
                  <Link className="htool-head" to={categoryDestination(group)}>
                    <span className="htool-glyph" aria-hidden="true">
                      <NavIcon id={group.id} />
                    </span>
                    <h3 className="htool-title">{group.label}</h3>
                    {group.soon && <em className="htool-soon">Soon</em>}
                  </Link>
                  <p className="htool-desc">{group.desc}</p>
                  <ul className="htool-links">
                    {group.tools.map((tool) => {
                      const family = FAMILY_BY_ROUTE[tool.route]
                      return (
                        <li key={tool.id}>
                          <Link
                            className="htool-link"
                            to={tool.route}
                            data-tool={tool.id}
                            aria-describedby={family ? `htool-fam-${family}` : undefined}
                          >
                            {tool.label}
                            {tool.soon && <em className="htool-soon">Soon</em>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                  <span className="htool-open" aria-hidden="true">open &rarr;</span>
                </li>
              ))}
            </ul>

            {/* One description per workbench mode, referenced by every tool that
                resolves into it. Assistive technology hears the same
                many-tools-into-five-modes relationship the old satellite field
                carried; the destination of every link is unchanged. */}
            <div className="sr-only">
              {HOME_WORKBENCH_TABS.map((tab) => (
                <span id={`htool-fam-${tab.id}`} key={tab.id}>
                  Also available as the {tab.label} mode of the live workbench above.
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Starting points ── */}
        <section className="hcomm" aria-labelledby="hcomm-title">
          <div className="home-container">
            <div className="hcomm-head" data-reveal>
              <div>
                <h2 className="hh2" id="hcomm-title">Start from something that already works.</h2>
              </div>
            </div>

            {/* The only numbers on this strip are ones the page can count. */}
            <p className="hcomm-note">
              {STARTER_TOTALS.gradients} gradients and {STARTER_TOTALS.palettes} palettes ship with the
              app. Open one and it arrives in the tool with its values already loaded — nothing
              to copy across, nothing to sign up for.
            </p>

            <ul className="hcomm-grid" data-reveal-group>
              {HOME_STARTERS.map((item) => (
                <li className="hcomm-card" key={`${item.kind}-${item.id}`}>
                  <Link className="hcomm-card-link" to={item.to}>
                    <span
                      className="hcomm-card-art"
                      aria-hidden="true"
                      ref={(node) => {
                        // The artefact itself, rendered from the gallery’s own
                        // values. It arrives as a custom property rather than an
                        // inline background so the card keeps one paint surface
                        // for both kinds.
                        if (!node) return
                        node.style.setProperty('--hcomm-art', item.art)
                      }}
                    />
                    <span className="hcomm-card-body">
                      <span className="hcomm-card-name">{item.name}</span>
                      <span className="hcomm-card-meta">
                        <span className="hcomm-card-source">{item.kind}</span>
                        <span className="hcomm-card-cat">{item.fact}</span>
                      </span>
                    </span>
                    <span className="hcomm-card-foot">
                      <span className="hcomm-card-opens">Opens in {item.opens}</span>
                      <span className="hcomm-card-go" aria-hidden="true">&rarr;</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hcomm-cta">
              <Link className="ui-pill ui-pill-quiet ui-pill-md" to="/discover/palettes">
                Browse the full library
                <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Pricing — the inverted panel, the strongest emphasis in the
            system, used exactly once. Display values only; /plans quotes the
            live, currency-correct price. See PRICE_LADDER above. ── */}
        <section className="hprice" aria-labelledby="hprice-title">
          <div className="home-container">
            <div className="hprice-panel" data-reveal>
              <div className="hprice-lead">
                <h2 className="hh2 hprice-title" id="hprice-title">
                  Pro from <span className="hprice-hi">$4/month</span>.
                </h2>
                <p className="hprice-lede">
                  Free covers the complete core toolkit with no card and no trial clock. Pro
                  raises the AI limits and unlocks saved projects, exports and submissions.
                </p>
                <ul className="hprice-includes">
                  {PRO_INCLUDES.map((item) => (
                    <li key={item}>
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                        <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hprice-ladder">
                <ul className="hprice-rows">
                  {PRICE_LADDER.map((row) => (
                    <li className="hprice-row" key={row.id} data-best={row.best || undefined}>
                      <span className="hprice-cadence">{row.cadence}</span>
                      <span className="hprice-amount">
                        <strong>{row.perMonth}</strong>
                        <span className="hprice-per">/month</span>
                      </span>
                      <span className="hprice-total">{row.total}</span>
                      <span className="hprice-note">{row.note}</span>
                    </li>
                  ))}
                </ul>
                <Link className="ui-pill ui-pill-hi ui-pill-lg hprice-cta" to="/plans">
                  See plans and start free
                  <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
                </Link>
                <p className="hprice-fine">
                  Prices shown in USD. Your local currency and the exact amount are confirmed on
                  the plans page and again at checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SystemCTA
          title="From first decision to clean handoff."
          description="Build a coherent UI system in one place, then take it straight into production."
          secondaryLabel="See our plans"
          secondaryTo="/plans"
          hint="No credit card · Upgrade only when you're ready"
        />
      </main>
    </div>
  )
}
