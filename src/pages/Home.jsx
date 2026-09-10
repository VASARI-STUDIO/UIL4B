import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import HomeWorkbench from '../components/HomeWorkbench'
import HomeCommandBar from '../components/HomeCommandBar'
import HomeExportKit from '../components/HomeExportKit'
import TryItMark from '../components/TryItMark'
// The ?hero=a|b|c exploration that used to wrap this hero is GONE — founder,
// 2026-09-07: "Retire it, V2 hero decides." See the note above the <h1>.
import NavIcon from '../components/NavIcon'
import { useHomeMotion } from '../hooks/useHomeMotion'
import { CREATE_GROUPS, HOME_SATELLITES, HOME_WORKBENCH_TABS, categoryDestination, toolRoute } from '../data/toolTree'
import { GALLERY_GRADIENTS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'
import { paletteBuilderUrl } from '../data/paletteGallery'
import { HERO_HEADLINE, SURFACE_LINE, line } from '../data/positioning'
import { APPROVED_CURRENCY, cheapestPerMonth, purchasablePlans, resolvePlanLadder, savingsVsMonthly } from '../config/planLadder'
import { AI_LIMITS } from '../config/plans'
import { COLOUR_SYSTEMS } from '../config/colourSystems'
import { proOnlyFormats } from '../config/exportFormats'

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

/* ── The figure strip is gone — anti-slop audit, 2026-09-09 ────────────────
 *
 * It sat above the hero as `48 LIVE TOOLS · 200K ICONS · 1,500+ FONTS · ONE
 * ACCOUNT`, was moved beside the tools grid when the founder relayed the
 * "AI-generated website" reaction, and survived there as a three-up `<dl>` of
 * figure + caption (`.htools-facts`, counted off CREATE_GROUPS). The numbers
 * were honest both times. The COMPONENT is the problem both times: the founder
 * marked the three-up figure strip on the Font Gallery masthead as "AI" and
 * asked for the change to reach every header that matches
 * (DiscoverGalleryHero.jsx), and a figure strip under a section heading
 * matches. Nothing replaces it — the tool count is the grid the reader is
 * looking at, and the icon and font catalogue sizes are on the cards that hold
 * them. 04-premium-home.spec.js asserts the strip stays absent.
 */

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
 * DERIVED FROM src/config/planLadder.js, WHICH IS THE ONE LADDER.
 *
 * This block used to be a hand-typed PRICE_LADDER array living here, and by the
 * 2026-09-06 sweep it had drifted into three claims the rest of the app had
 * already retracted. All three sat on the FRONT PAGE, which is the first
 * pricing any visitor sees:
 *
 *   1. IT SOLD A QUARTERLY PLAN THAT CANNOT BE BOUGHT. planLadder.js gives
 *      quarterly `checkoutPlan: null` and says so in its own flag: "offering
 *      quarterly today would dead-end on 'Invalid selection'". /plans dropped
 *      the tier, and scripts/site-pricing.mjs already excludes it from the
 *      structured data for exactly this reason. The homepage was the last
 *      surface still advertising it — the same shape as the "Full design JSON"
 *      defect, a thing promised on a sales surface that the product cannot
 *      deliver.
 *   2. IT SAID "Cancel any time" ON THE MONTHLY ROW. Plans.jsx removed that
 *      line under a founder flag because [stripe-retention-config] is blocked
 *      and the Stripe Customer Portal has no cancellation flow enabled, so it
 *      "is a promise the billing system cannot currently honour". Deleting it
 *      from the pricing page and leaving it on the homepage retracted nothing.
 *   3. IT TYPED THE HEADLINE. planLadder.js exports cheapestPerMonth() and
 *      documents it as "the honest headline: the cheapest per-month figure
 *      among the tiers we will actually sell. Never typed into copy." The
 *      headline here was the literal string "$4/month".
 *
 * The amounts are unchanged — `approvedTotal` in planLadder.js IS the
 * founder-approved ladder from docs/reference/design-language-v2.md, re-approved
 * 2026-08-20 — so this is not a price change. What changes is that a tier
 * cannot appear here unless something can accept the click, and the headline
 * follows the ladder instead of being retyped beside it.
 *
 * STILL DISPLAY-ONLY, AND DELIBERATELY: no usePrices() call is added here.
 * /plans remains the only surface that quotes a live, currency-correct,
 * checkout-backed price, and the homepage's LCP budget on
 * [homepage-field-metrics] is why this page does not open a request for a panel
 * five screens down. resolvePlanLadder() with no `prices` returns the approved
 * fallbacks, which is exactly what this panel rendered before.
 */
const RESOLVED_LADDER = resolvePlanLadder()
// Only the tiers a visitor can actually buy today. Quarterly has no
// checkoutPlan, so it is absent by construction rather than by being deleted
// from a second list somebody has to remember to keep in step.
const PRICE_LADDER = purchasablePlans(RESOLVED_LADDER)
const CHEAPEST = cheapestPerMonth(RESOLVED_LADDER)

// Each row's note, derived from the ladder rather than written beside it.
// A tier with a trial says so (Checkout.jsx grants it on yearly only, which is
// what `trialDays` mirrors); a tier that beats monthly by a real margin says by
// how much; monthly states the thing a buyer would otherwise meet at the till,
// in the same words the /plans FAQ already uses.
function ladderNote(plan) {
  const bits = []
  const saving = savingsVsMonthly(plan, RESOLVED_LADDER)
  if (saving) bits.push(`Save ${saving}%`)
  if (plan.trialDays) bits.push(`${plan.trialDays}-day free trial`)
  if (!bits.length) bits.push('No trial — bills immediately')
  return bits.join(' · ')
}

// WHAT PRO ADDS, DERIVED — anti-slop audit, 2026-09-09.
//
// This list was four typed lines, and three of the four were wrong against
// the config that decides them:
//   · "Every colour, type, icon and image tool" — Free has every tool too, so
//     listing it under Pro sold the free tier as a Pro benefit.
//   · "Saved projects and full system exports" — Free saves projects (capped
//     at FREE_SAVE_LIMITS.projects), and "full system exports" is the phrase
//     that once sold a JSON export the product cannot make (exportFormats.js).
//   · "Community submissions and the full prompt library" — submissions need
//     a sign-in, not Pro (utils/submitIntent.js gates on nothing else).
// The lede above it, "Free covers the complete core toolkit with no trial
// clock…", was a reassurance clause in the slot the retired "No card." line
// used to sit in, and it is gone rather than reworded.
//
// Every line below is /plans's own wording for the same delta, read from the
// same modules /plans reads, so the front page and the pricing page cannot
// describe Pro two ways. tests/user-sim/70-anti-slop-marketing.spec.js
// asserts the rendered figures against these modules.
const PRO_EXPORTS = proOnlyFormats()
const PRO_INCLUDES = [
  `${AI_LIMITS.pro.daily} AI generations a day · ${AI_LIMITS.pro.monthly} a month`,
  'Unlimited saved projects and custom icons',
  `All ${COLOUR_SYSTEMS.length} colour systems, plus HCT editing`,
  PRO_EXPORTS.map((f) => f.name).join(', '),
  'Style guides with no “Made with UIL4B” line',
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

  // WHAT THE WORKBENCH IS CURRENTLY HOLDING, so the export section below the
  // tools grid can draw the real deck from the visitor's own palette and type
  // scale rather than from a fixture. Read-only: nothing here writes back into
  // the workbench, and the callback is memoised so the effect that reports it
  // does not re-fire on every render of this page.
  const [system, setSystem] = useState(null)
  const onSystemChange = useCallback((next) => {
    setSystem({ ...next, href: paletteBuilderUrl(next.palette) })
  }, [])

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
        <header className="home-hero">
          <div className="home-hero-core">
            {/* THE "UI system toolkit" KICKER IS GONE, and nothing takes its
                slot. Founder, 2026-09-07: the tagline "all over the place is a
                huge AI Slop feature". A category label floating above a headline
                that already names the category is a second label for the same
                thing — the same reasoning that retired the bracketed eyebrows
                (#382, #391, #398) and the stat line. Writing a better kicker
                here would rebuild the feature he named, so the answer is empty.

                og-cards.mjs read this element and threw when it moved; it now
                treats the kicker as optional and omits the card's eyebrow band
                when there is none. Regenerate with `npm run og:cards`. */}

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
            {/* ASSEMBLED FROM THE FOUNDER'S OWN WORDS, AND APPROVED BY HIM ON
                2026-09-10. He read it beside the two phrases it was cut from
                and said ship it, so it is his sentence now — do not reword it
                without him.

                He was offered an agent draft and chose "build one from my words
                only", so every word below is cut from a sentence he wrote on
                2026-09-07 and nothing is invented:

                  "Build and export UI and brand design kits"
                      ← the verbatim head of `build-and-export`
                  "in one unified location"
                      ← the verbatim tail of `one-unified-location`

                The comma between them is punctuation. No synonym was
                substituted and no connective was added. Both source sentences,
                and the two proofreading edits applied to them ("your" →
                "you're", sentence case), are in src/data/positioning.js and
                docs/reference/positioning.md.

                NOTHING HERE IS TYPED. The strings come from HERO_HEADLINE so
                this element cannot drift from the record of what he said, and
                so tests/unit/positioning-truth.test.js can check the splice
                against its own sources rather than against a copy of them.

                THE MARK is the page's single `--hi` element in this viewport
                (design-language-v2.md budgets one), and scripts/og-cards.mjs
                throws if the h1 stops highlighting a phrase, because the share
                card paints the same highlight. */}
            <h1 className="home-hero-h1">
              <span className="home-hero-line"><span className="home-hero-line-in">{HERO_HEADLINE.lead}</span></span>
              <span className="home-hero-line"><span className="home-hero-line-in">
                <mark className="home-mark">{HERO_HEADLINE.mark}</mark>{HERO_HEADLINE.tail}
              </span></span>
            </h1>

            {/* The sub-line is a whole founder sentence, taken by id rather than
                typed. The headline says what you get; this says what stops. */}
            <p className="home-hero-sub">{line(SURFACE_LINE.homeHeroSub)}</p>

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

            {/* "No card." IS GONE — founder, 2026-09-07, on the payment
                reassurance being "all over the place". It was a whole sentence
                that was only that claim, so the sentence goes rather than being
                reworded into a fresh one in the same slot.

                WHAT SURVIVES IS ONE CLAUSE, AND IT IS OPEN. "Free to use." is
                not the string he named and it is not a payment reassurance, so
                deleting it too would be this agent extending his instruction.
                But it does sit in the same micro-line slot, under the buttons,
                where anti-slop-and-hero-2026-08.md's tell 8 already flagged the
                page for reassuring three times — and the CTA beside it says
                "Start building free", which is the same fact. Whether the line
                stays at all is his call, raised in the PR rather than settled
                here. */}
            <p className="home-hero-hint">Free to use.</p>
          </div>
        </header>

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
                  · "no account" → the hero's "Free to use." above, and
                    Palette's "on the free Auto system" below.
                  · "names where it hands off" → every `.hw-foot` does exactly
                    this, in the sentence next to the button it describes.

                THE HEADING STAYS, because `aria-labelledby` on this section
                points at it and because it is the one thing the panels cannot
                show themselves: a visitor meets one mode at a time and can see
                neither that there are five nor that the work travels. It says
                that and stops. */}
            <div className="hsteps-head" data-reveal>
              {/* THE FOUNDER'S SENTENCE, 2026-09-07: the heading "should be more
                  something like 'all the design tools your constantly searching
                  for in one unified location.'" Two proofreading edits and no
                  others — "your" → "you're", and sentence case with a comma
                  before the closing clause. It is NOT agent copy and must not be
                  tightened by one: three salvages this week found agent
                  "Option 1 — RECOMMENDED" drafts mistaken for his.

                  Read from positioning.js by id, so this heading and the record
                  of what he said cannot drift apart. */}
              <h2 className="hh2" id="hsteps-title">
                {line(SURFACE_LINE.toolsSectionHeading)}
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
                <HomeWorkbench variant="sticky" activeTab={mode} onTabChange={onTabChange} onSystemChange={onSystemChange} />
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
              {/* ONE SENTENCE, NOT TWO — anti-slop audit, 2026-09-09. The
                  first sentence here was "Every tool reads and writes the same
                  system, so a colour decision in one place is the same colour
                  decision everywhere else." — a balanced clause on a "so"
                  hinge describing the product instead of showing it, which is
                  the shape [hero-copy-still-reads-ai] names, and the same
                  claim the sticky workbench above has just demonstrated. What
                  survives is the canonical status line: component tooling
                  must be NAMED as coming next, beside the card that carries
                  the Soon badge. The figure strip that followed it is gone;
                  see the note above LIVE_TOOL_COUNT. */}
              <p className="hlede">Component tooling is coming next.</p>
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

        {/* ── The export kit ──
            Founder, 2026-09-07: "we need to also feature the high quality design
            kit export features as a section on the homepage. maybe after showing
            each tool." This is that slot — after the tools grid, before the
            starting points.

            It takes the workbench's live palette and type scale and draws a real
            page of the real brand-guidelines deck from them, so the section
            demonstrates the export rather than describing it. Formats come out of
            exportFormats.js; nothing unbuilt appears. See HomeExportKit. */}
        <HomeExportKit system={system} heading={line(SURFACE_LINE.homeExportHeading)} />

        {/* ── Starting points ── */}
        <section className="hcomm" aria-labelledby="hcomm-title">
          <div className="home-container">
            <div className="hcomm-head" data-reveal>
              <div>
                <h2 className="hh2" id="hcomm-title">Start from something that already works.</h2>
              </div>
            </div>

            {/* The only numbers on this strip are ones the page can count.

                The sentence that followed the count — "Open one and it arrives
                in the tool with its values already loaded — nothing to copy
                across, nothing to sign up for." — is gone (anti-slop audit,
                2026-09-09). Its "nothing to X, nothing to Y" pair is the
                anaphoric tic the founder called "MEGA AI generated" on the
                tools heading, and its second half is a sign-up reassurance in
                the class he retired. What it described is on every card
                below, in the foot that says which tool the card opens. */}
            <p className="hcomm-note">
              {STARTER_TOTALS.gradients} gradients and {STARTER_TOTALS.palettes} palettes ship with the app.
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
                {/* Computed from the cheapest tier that can actually reach
                    checkout, never typed. If the ladder changes, or a tier
                    stops being purchasable, this sentence follows it. */}
                <h2 className="hh2 hprice-title" id="hprice-title">
                  Pro from <span className="hprice-hi">{CHEAPEST.perMonthLabel}/month</span>.
                </h2>
                {/* /plans's own label for the same list, so the two surfaces
                    introduce the Pro delta with one phrase. See PRO_INCLUDES. */}
                <p className="hprice-lede">Everything in Free, plus:</p>
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
                      <span className="hprice-cadence">{row.label}</span>
                      <span className="hprice-amount">
                        <strong>{row.perMonthLabel}</strong>
                        <span className="hprice-per">/month</span>
                      </span>
                      <span className="hprice-total">{row.totalLabel} {row.cadence}</span>
                      <span className="hprice-note">{ladderNote(row)}</span>
                    </li>
                  ))}
                </ul>
                <Link className="ui-pill ui-pill-hi ui-pill-lg hprice-cta" to="/plans">
                  See plans and start free
                  <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
                </Link>
                {/* The currency comes from the ladder too. It was the word
                    "USD" typed here beside amounts that are USD by virtue of
                    APPROVED_CURRENCY — one more thing that could go stale
                    quietly. */}
                <p className="hprice-fine">
                  Prices shown in {APPROVED_CURRENCY.toUpperCase()}. Your local currency and the
                  exact amount are confirmed on the plans page and again at checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* THE CLOSING BAND IS GONE — anti-slop audit, 2026-09-09.

            It was a <SystemCTA>: a "Start free" eyebrow, "From first decision
            to clean handoff." over "Build a coherent UI system in one place,
            then take it straight into production.", two buttons, an "Upgrade
            only when you're ready" hint, light beams and a grid background.
            Every part of that is on the bar by name — an eyebrow above a
            heading, generic aspirational copy that could close any SaaS page,
            a reassurance micro-line in the slot the retired "No credit card
            required" line sat in, and glow used as a premium signal. The
            founder had it deleted from /discover, /learn and /create/color for
            being "a second, larger copy of the CTA the hero has already made"
            (52-compressed-landings.spec.js), and this was the same object one
            scroll after the pricing panel, which already ends in "See plans
            and start free".

            So the page now ends where the argument ends: the price panel is
            the close. Whereby, Babbel and Rocket Money end their sales pages on
            the plan card and its button with no banner after it —
            https://mobbin.com/screens/4be482c3-dac0-466c-abc5-81673cd41800
            https://mobbin.com/screens/3fb4481a-8315-459c-9b51-afd3436364cf
            The sign-up CTA a visitor who scrolled this far still has is the
            hero's "Start building free" and the pill nav's "Start for Free",
            which travels with them. */}
      </main>
    </div>
  )
}
