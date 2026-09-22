import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import HomeCommandBar from '../components/HomeCommandBar'
import TryItMark from '../components/TryItMark'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumWords from '../components/spectrum/SpectrumWords'
import SpectrumBench from '../components/spectrum/SpectrumBench'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import SpectrumIcon from '../components/spectrum/SpectrumIcon'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { useSpectrumReveal } from '../components/spectrum/useSpectrumReveal'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { HERO_HEADLINE, SURFACE_LINE, heroHeadlineText, line } from '../data/positioning'
import { GALLERY_GRADIENTS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { CURATED_LIBRARY_PALETTES } from '../data/paletteLibrary'
import { paletteBuilderUrl } from '../data/paletteGallery'
import { FREE_SAVE_LIMITS } from '../config/plans'
import {
  ASSURANCES,
  COMPARE,
  CHEAPEST,
  EXPORTS,
  FAQS,
  FREE_EXCLUSION,
  FREE_POINTS,
  LADDER,
  LIBRARY_COUNTS,
  PROOF,
  PRO_POINTS,
  TOOL_COUNT,
  ladderNote,
  ladderSaving,
  numberWord,
  route,
} from '../components/spectrum/spectrumFacts'
// THE FRONT DOOR'S SHEET, SO IT IS RENDER-BLOCKING ON PURPOSE.
//
// This lived in `styles/deferred/` while Spectrum was a preview route at
// `/spectrum` and the old Home still owned `/`: two sales pages in the entry
// graph at once put both stylesheets in the render-blocking sheet and
// `tests/unit/home-asset-budget.test.js` went red at 317,140 bytes against a
// 300,000 budget.
//
// The swap commit resolves that by subtraction rather than by deferral. Home is
// deleted, its families are out of global.css, and this page is `/` — the first
// paint, which must not wait on a chunk. So the sheet is a page sheet, the
// import in App.jsx is static, and the budget test's own positive control now
// matches `.sp-hero-h1` because this is the headline the entry sheet has to
// style.
import '../styles/pages/spectrum.css'

// ═════════════════════════════════════════════════════════════════════════════
// SPECTRUM — the sales page, built from "UIL4B - Spectrum.dc.html".
// ═════════════════════════════════════════════════════════════════════════════
//
// Reading order, which is the argument and is the design's:
//
//   hero            what this makes, and a box you can use before signing up
//   the spectrum    the band the page is named after
//   the bench       every live tool, one panel per category, with its own maths
//   discover        the library that already exists, rendered as itself
//   specimens       what leaves — one piece, the whole system, or a project
//   the terms       three things that are true, each checkable in one click
//   pricing         what it costs, derived from the one ladder
//   questions       the four a buyer actually asks
//   handoff         the last way in, then the footer
//
// ── WHAT THIS PAGE IMPORTS AND WHAT IT REFUSES TO TYPE ──────────────────────
// Every route comes from `toolTree.js`, every price from `planLadder.js`, every
// limit from `plans.js`, every export claim from `exportFormats.js`, and every
// count off the array it counts. `src/components/spectrum/spectrumFacts.js` is
// where that happens and it lists, in a table, each place the prototype's number
// disagreed with the product. Nothing in THIS file is a number.
//
// ── COPY ────────────────────────────────────────────────────────────────────
// The founder writes the sentences. Three sources, in priority order:
//   1. `positioning.js` — his own lines, by id. The h1 is HERO_HEADLINE, which
//      he personally approved on 2026-09-10 and which positioning-truth.test.js
//      pins to the character. The design's own h1 ("Build and export UI and
//      brand kits from one place.") is close to it but is NOT it, and a
//      near-miss of an approved sentence is a rewrite.
//   2. Sentences the app already ships — /plans's framing, its FAQ answers.
//   3. The design's own copy, which came from his brief and may be used as-is —
//      except where it states something untrue, which is marked at each site and
//      listed in the handover.
//
// ── NAVIGATION, MOTION AND THE HERO CONTROL ARE THE APP'S, NOT THE MOCK'S ───
// The design draws its own floating nav, its own full-screen menu, its own theme
// cycler and its own search field. All four already exist here, are wired to the
// real registry and the real ThemeContext, and are what the founder asked to
// keep ("PillNav is the navigation system, untouched"). Rebuilding them from the
// prototype would delete working navigation to gain a screenshot match. So the
// page mounts `<PillNav />`, and the hero's search is `<HomeCommandBar />` —
// which queries the same index as ⌘K — with `<TryItMark />`, the drawn "give it
// a try" the founder asked for by name, still pointing at it.
//
// ── SIGN-IN, AND WHY THE TWO CTAs BEHAVE DIFFERENTLY ────────────────────────
// At the TOP a signed-out visitor gets a real `<Link to="/login?signup=1">`:
// Home.jsx's reasoning — "a real <Link> rather than a button, so it stays
// middle-clickable, which is why the intent travels in the URL". At the BOTTOM
// they get the dialog in place, because SystemCTA's reasoning applies there and
// not at the top: "this block sits at the very bottom of a long sales page.
// Routing a signed-out visitor to /login unmounted that page, and dismissing the
// popup dropped them on /home — scroll position and their place in the argument
// gone."

/* ── Discover ─────────────────────────────────────────────────────────────────
 *
 * The artefacts, rendered AS THEMSELVES. The design's cards draw invented
 * palettes and invented gradients; these are rows out of CURATED_LIBRARY_PALETTES
 * and GALLERY_GRADIENTS — the same arrays /discover/palettes and
 * /discover/gradients render — and each card opens the matching tool with the
 * values already loaded, through `paletteBuilderUrl()` / `gradientToolUrl()`,
 * the same handoffs the galleries use. There is no second encoding of a tool URL
 * on this page.
 *
 * THE MOCK'S THIRD TAB IS GONE. "Icon sets" listed six sets "made by UI L4B";
 * the Icon Library is a browser over other people's open-source packs and
 * publishes no sets of its own, so the tab would have been a claim about
 * inventory we do not have. The card that links to the library is in the bench
 * instead, where the catalogue is described accurately.
 */
const DISCOVER_TABS = [
  {
    id: 'palettes',
    label: 'Palettes',
    to: '/discover/palettes',
    count: LIBRARY_COUNTS.palettes,
    noun: 'palettes',
  },
  {
    id: 'gradients',
    label: 'Gradients',
    to: '/discover/gradients',
    count: LIBRARY_COUNTS.gradients,
    noun: 'gradients',
  },
]

const DISCOVER_CARDS = {
  palettes: CURATED_LIBRARY_PALETTES.slice(0, 5).map((p) => {
    const step = 100 / p.colors.length
    const bands = p.colors
      .map((c, i) => `${c} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`)
      .join(', ')
    return {
      id: p.id,
      name: p.name,
      // Hard stops so the swatches read as swatches rather than as a blend —
      // one element for both card kinds, the same trick Home.jsx uses.
      art: `linear-gradient(90deg, ${bands})`,
      meta: `${p.colors.length} COLOURS`,
      to: paletteBuilderUrl(p.colors),
      opens: 'Palette Builder',
    }
  }),
  gradients: GALLERY_GRADIENTS.slice(0, 5).map((g) => ({
    id: g.id,
    name: g.name,
    art: gradientCss(g.type, g.angle, g.stops),
    meta: g.type === 'Linear' ? `${g.type.toUpperCase()}, ${g.angle}°` : g.type.toUpperCase(),
    to: gradientToolUrl(g),
    opens: 'Gradient Generator',
  })),
}

/* ── Specimens ────────────────────────────────────────────────────────────────
 *
 * Three stacked cards on a sticky scroll — the design's own construction, and
 * the one Mobbin reference that mattered here was the reminder that a pinned
 * stack has to degrade to a plain column, because at phone width there is no
 * room to see two cards at once:
 * https://mobbin.com/sites/sections/a890e6ab-1a0f-4926-b3da-575386445912
 * So `position:sticky` is scoped to ≥900px in spectrum.css and below that these
 * are three ordinary cards in a row of the document.
 *
 * WHAT EACH CARD CLAIMS IS READ FROM exportFormats.js AND plans.js. The mock's
 * chips — "PDF · Figma · React · Tokens" — name two formats the panel cannot
 * build; its "90 days of version history" names a feature that does not exist
 * anywhere in this repository. Both are gone rather than reworded.
 */
function SpecimenCards() {
  return (
    <div className="sp-stack">
      <div className="sp-stack-slot">
        <article className="sp-stack-card" style={{ '--sp-stack-top': '84px' }}>
          <div className="sp-stack-grid">
            <div className="sp-stack-say">
              <h3>Whether it&apos;s just one thing.</h3>
              <p>
                Pull out the palette on its own, the type scale on its own, or a folder of
                compressed assets. Each one leaves as a real file, named and ready to commit.
              </p>
              <p className="sp-stack-note">Free on every plan.</p>
            </div>
            <div className="sp-stack-art">
              <ul className="sp-filelist">
                {EXPORTS.free.map((f) => (
                  <li key={f.id}>
                    <span className="sp-filelist-ico" aria-hidden="true"><SpectrumIcon name="file" size={15} /></span>
                    <span className="sp-filelist-name">{f.name}</span>
                    <span className="sp-filelist-tag">FREE</span>
                  </li>
                ))}
              </ul>
              <p className="sp-stack-foot">
                {EXPORTS.unbuilt.length} more ({EXPORTS.unbuiltNames}) are listed in the export
                panel as Soon. They are not built, so nobody has them.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="sp-stack-pad" aria-hidden="true" />

      <div className="sp-stack-slot">
        <article className="sp-stack-card" style={{ '--sp-stack-top': '116px' }}>
          <div className="sp-stack-grid">
            <div className="sp-stack-say">
              <h3>Or a whole design system.</h3>
              <p>
                One click lays your colour, type and spacing into a full kit: a colour page with
                named roles, the type specimen and scale, the spacing and grid foundations, and a
                files page holding every download.
              </p>
              <p className="sp-stack-note">
                Free exports every page with a small “Made with UIL4B” line. Pro removes the mark.
              </p>
            </div>
            <div className="sp-stack-art">
              <ul className="sp-filelist">
                {EXPORTS.pro.map((f) => (
                  <li key={f.id}>
                    <span className="sp-filelist-ico" aria-hidden="true"><SpectrumIcon name="download" size={15} /></span>
                    <span className="sp-filelist-name">{f.name}</span>
                    <span className="sp-filelist-tag is-pro">PRO</span>
                  </li>
                ))}
              </ul>
              <p className="sp-stack-foot">
                Both documents are generated from the same tokens as the kit, so they cannot drift
                from the code.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="sp-stack-pad" aria-hidden="true" />

      <div className="sp-stack-slot">
        <article className="sp-stack-card" style={{ '--sp-stack-top': '148px' }}>
          <div className="sp-stack-grid">
            <div className="sp-stack-say">
              <h3>You can come back to it anytime.</h3>
              <p>
                A project holds a palette, a font pairing and a type scale together. Reopen one and
                pull the exact version you shipped.
              </p>
              <p className="sp-stack-note">
                {numberWord(FREE_SAVE_LIMITS.projects, { capital: true })} projects and{' '}
                {FREE_SAVE_LIMITS.customIcons} custom icons on Free, unlimited on Pro.
              </p>
            </div>
            <div className="sp-stack-art">
              <ul className="sp-projects">
                {Array.from({ length: FREE_SAVE_LIMITS.projects }, (_, i) => (
                  <li key={i}>
                    <span className="sp-projects-ico" aria-hidden="true"><SpectrumIcon name="folder" size={16} /></span>
                    <span className="sp-projects-slot">Project slot {i + 1}</span>
                    <span className="sp-projects-state">Free</span>
                  </li>
                ))}
                <li className="is-locked">
                  <span className="sp-projects-ico" aria-hidden="true"><SpectrumIcon name="lock" size={16} /></span>
                  <span className="sp-projects-slot">Project {FREE_SAVE_LIMITS.projects + 1}</span>
                  <span className="sp-projects-state is-pro">Pro</span>
                </li>
              </ul>
              <p className="sp-stack-foot">
                The wall is your {FREE_SAVE_LIMITS.projects + 1}th project, and it says so before you
                click rather than after.
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

/* ── the page ─────────────────────────────────────────────────────────────── */

export default function Spectrum() {
  const { user } = useAuth()
  const { openLogin } = useLoginPrompt()
  const [tab, setTab] = useState(DISCOVER_TABS[0].id)
  // Seeded from the ladder's own `best` flag rather than a literal, so the
  // recommended cadence and the preselected one cannot drift apart.
  const [billing, setBilling] = useState(
    () => (LADDER.find((p) => p.best) || LADDER[0])?.id,
  )

  // The scroll entrances. NOT the shared `useReveal()`: its attribute starts at
  // `opacity:0`, and on a fast pass down this page that left 16 of 19 blocks
  // invisible in a rendered browser. See useSpectrumReveal.js for the
  // measurement and for why the resting state here is the FINAL state.
  useSpectrumReveal()

  // ── THE HERO ENTRANCE, ON THE ONE PATH WHERE IT IS STILL AN ENTRANCE ──────
  //
  // The word reveal's RESTING STATE IS VISIBLE and the movement is a keyframe
  // animation the class turns on — never a transition out of a hidden state.
  // That ordering is the whole design of it, and it is not a preference:
  //
  //   · scripts/prerender.mjs writes this page to a static shell with no JS. A
  //     headline parked at `translateY(112%)` inside `overflow:hidden` is
  //     INVISIBLE in that shell, which is the largest paint on the front door and
  //     the first thing a crawler reads. `useReveal`'s own comment records the
  //     same defect costing /learn 1,659 characters of unreadable copy.
  //   · Under reduced motion nothing adds the class, and the headline is simply
  //     already where it belongs.
  //
  // `data-hero-prepainted` is the attribute prerender puts on <html> for the
  // shells whose headline it painted. If the headline was on screen before React
  // existed, re-running the entrance would be a second arrival of something that
  // never left — a visible dive-and-rise. So the animation is skipped there, and
  // the page is correct either way.
  const [heroLit, setHeroLit] = useState(false)
  useEffect(() => {
    if (document.documentElement.hasAttribute('data-hero-prepainted')) return undefined
    if (prefersReducedMotion()) return undefined
    const id = requestAnimationFrame(() => setHeroLit(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const plan = LADDER.find((p) => p.id === billing) || LADDER[0]
  const activeTab = DISCOVER_TABS.find((t) => t.id === tab) || DISCOVER_TABS[0]
  const toolkitTo = user ? '/projects' : '/login?signup=1'
  const promptsLogin = !user
  const openToolkit = promptsLogin ? () => openLogin({ signup: true }) : undefined

  return (
    <div className="spectrum">
      {/* THE MARKETING NAV. `variant="spectrum"` makes PillNav early-return
          <SpectrumNav /> before its first hook — the floating pill with the
          wordmark, the three quiet links, the theme cycle and the burger that
          opens the full-screen menu. The app header (search hints, mega menus,
          account initials) stays on every other route. W11 owns the component;
          this is the one line that mounts it, and it landed with the route swap
          because two specs that read `.pnav-*` on `/` had to move at the same
          moment. */}
      <PillNav variant="spectrum" />

      {/* The film grain. Fixed, 5%, pointer-events:none, aria-hidden — one SVG
          turbulence filter as a data URI, which is what the design ships and
          costs no request. It is the page's only decorative layer and it exists
          to stop very large flat fields of --bg-0 banding on cheap panels. */}
      <div className="sp-grain" aria-hidden="true" />

      <main id="main" tabIndex={-1}>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        {/* NO `data-sp-reveal` ON THE HERO. That attribute starts at `opacity:0`
            and waits for a scroll observer, which is right for a section five
            screens down and wrong for the thing above the fold: it would blank
            the prerendered shell's largest paint until hydration. The hero
            paints immediately and the words animate on top of that. */}
        <header className={heroLit ? 'sp-hero is-in' : 'sp-hero'}>
          <div className="sp-shell sp-hero-core">
            {/* THE APPROVED HEADLINE, WORD BY WORD. `heroHeadlineText()` is the
                one sentence the founder signed off; `HERO_HEADLINE.mark` is the
                run it highlights, and SpectrumWords matches it as whole words so
                the accent can never land on half a phrase. The full sentence is
                carried once for a screen reader — see SpectrumWords.jsx. */}
            <h1 className="sp-hero-h1">
              <SpectrumWords text={heroHeadlineText()} mark={HERO_HEADLINE.mark} />
            </h1>

            {/* The sub-line is a whole founder sentence, taken by id rather than
                typed. The headline says what you get; this says what stops. */}
            <p className="sp-hero-sub">{line(SURFACE_LINE.homeHeroSub)}</p>

            <p className="sr-only" id="spectrum-search-label">Search every tool</p>
            <div className="sp-hero-bar tim-anchor">
              <HomeCommandBar labelledBy="spectrum-search-label" />
              <TryItMark />
            </div>

            <div className="sp-hero-cta">
              <Link className="sp-cta sp-cta--ink sp-cta--lg" to={toolkitTo}>
                <span>Open the toolkit</span>
                <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={14} /></span>
              </Link>
              <Link className="sp-cta sp-cta--ghost sp-cta--lg" to="/plans">View plans</Link>
            </div>
          </div>
        </header>

        <SpectrumRamp mirror className="sp-ramp--hero" />

        {/* ── The bench ───────────────────────────────────────────────────── */}
        <section id="bench" className="sp-section sp-section--bench" aria-labelledby="sp-bench-h">
          <div className="sp-shell">
            <SpectrumBench head={(
              <div className="sp-bench-head" data-sp-reveal>
              {/* The founder's own line for this section, by id — his 2026-09-07
                  instruction that the tools heading should read "more something
                  like" this sentence. */}
              <h2 className="sp-h2 sp-h2--rail" id="sp-bench-h">
                <SpectrumWords text={line(SURFACE_LINE.toolsSectionHeading)} />
              </h2>
              {/* THE COUNT IS COUNTED. The design's sentence continues "…They are
                  all running below: change one value and the rest of the kit
                  follows", which is true of the prototype's four mocked windows
                  and would not be true of five panels where one is live and four
                  are worked examples. The clause is dropped rather than softened;
                  it is in the handover for him to decide. */}
              <p className="sp-lede">
                {numberWord(TOOL_COUNT, { capital: true })} tools that would otherwise be{' '}
                {numberWord(TOOL_COUNT)} tabs and a folder you stopped opening.
              </p>
              </div>
            )} />
          </div>
        </section>

        {/* ── Discover ────────────────────────────────────────────────────── */}
        <section id="discover" className="sp-section" aria-labelledby="sp-disc-h">
          <div className="sp-shell">
            <div className="sp-disc-head" data-sp-reveal>
              <div>
                <h2 className="sp-h2" id="sp-disc-h">
                  <SpectrumWords text="A growing library, from a growing community." />
                </h2>
                {/* The design's sentence, minus "and icon sets we publish, with
                    new sets every week": we publish no icon sets, and nothing in
                    this repo commits to a weekly cadence. */}
                <p className="sp-lede">
                  The Discover pages hold the palettes and gradients we publish. Open one, change
                  it, and keep it in your own kit.
                </p>
              </div>
              <div className="sp-tabs sp-tabs--chips" role="group" aria-label="Choose a library">
                {DISCOVER_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="sp-chip"
                    aria-pressed={tab === t.id}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-disc-grid" data-sp-reveal>
              {DISCOVER_CARDS[activeTab.id].map((card) => (
                <Link className="sp-disc-card" to={card.to} key={card.id}>
                  <span className="sp-disc-art" style={{ background: card.art }} aria-hidden="true" />
                  <span className="sp-disc-row">
                    <span className="sp-disc-name">{card.name}</span>
                    <span className="sp-disc-meta">{card.meta}</span>
                  </span>
                  <span className="sr-only"> — opens in the {card.opens}</span>
                </Link>
              ))}
              <Link className="sp-disc-card sp-disc-card--cta" to={activeTab.to}>
                <span className="sp-disc-cta-say">Open the gallery</span>
                <span className="sp-disc-cta-row">
                  <span className="sp-disc-cta-count">
                    {activeTab.count} {activeTab.noun.toUpperCase()}
                  </span>
                  <span className="sp-cta-icon sp-cta-icon--lg" aria-hidden="true">
                    <SpectrumIcon name="arrow-up-right" size={16} />
                  </span>
                </span>
              </Link>
            </div>

            <p className="sp-disc-foot" data-sp-reveal>
              Every set here is made by UI L4B and free to browse without an account.
            </p>
          </div>
        </section>

        {/* ── Specimens ───────────────────────────────────────────────────── */}
        <section id="specimens" className="sp-section" aria-labelledby="sp-spec-h">
          <div className="sp-shell">
            <div className="sp-centre-head" data-sp-reveal>
              <h2 className="sp-h2" id="sp-spec-h">
                <SpectrumWords text="Studio quality exports." />
              </h2>
              <p className="sp-lede">
                Take one piece, take the whole system, or come back to it next month. All three
                leave the browser looking like a studio made them.
              </p>
            </div>
            <SpecimenCards />
          </div>
        </section>

        {/* ── The terms ───────────────────────────────────────────────────────
            The slot the design fills with four invented proof numbers under
            "Don't just take it from us". See the PROOF note in spectrumFacts.js
            for why nothing counts in their place: every one of those figures is
            unmeasured, and the repo's own conclusion when it met empty social
            proof was to stop making a social claim rather than to find a better
            zero. What is here instead is three properties of the product a
            visitor can check in one click, with the tool that proves each one
            named beside it. No heading — the rows are the statement. */}
        <section className="sp-section sp-section--terms" aria-label="What is true of the toolkit">
          <div className="sp-shell">
            <ul className="sp-terms" data-sp-reveal>
              {PROOF.map((item) => (
                <li key={item.claim}>
                  <p className="sp-terms-claim">{item.claim}</p>
                  <p className="sp-terms-note">{item.note}</p>
                  <Link className="sp-quiet-link" to={item.to || route(item.toolId)}>
                    {item.linkLabel}
                    <SpectrumIcon name="arrow-right" size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <section id="pricing" className="sp-section" aria-labelledby="sp-price-h">
          <div className="sp-shell">
            <div className="sp-centre-head" data-sp-reveal>
              {/* /plans's own h1, because it is the page this one hands off to
                  and a visitor must not meet two different positions on the same
                  offer. The design's "less than 1 coffee per month" is a price
                  comparison the product has never made and would only be true on
                  one of the two cadences. */}
              <h2 className="sp-h2" id="sp-price-h">
                <SpectrumWords text="The whole toolkit is free. Pro adds room." mark="free." />
              </h2>
              <p className="sp-lede">{line(SURFACE_LINE.plansFraming)}</p>
            </div>

            <div className="sp-billing" role="group" aria-label="Choose how to pay for Pro" data-sp-reveal>
              {LADDER.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="sp-billing-tab"
                  aria-pressed={billing === p.id}
                  onClick={() => setBilling(p.id)}
                >
                  <span>{p.label}</span>
                  {/* The badge appears only when the saving is real: savingsVsMonthly()
                      returns 0 rather than a rounding-noise 1%, and a badge that says
                      "save 1%" is worse than no badge. */}
                  {ladderSaving(p) > 0 && <span className="sp-billing-save">Save {ladderSaving(p)}%</span>}
                </button>
              ))}
            </div>

            <div className="sp-plans" data-sp-reveal>
              <article className="sp-plan">
                <div className="sp-plan-top">
                  <span className="sp-plan-tier">FREE</span>
                  <span className="sp-plan-aside">No account needed to use the tools</span>
                </div>
                <p className="sp-plan-price"><span>$0</span><em>/ forever</em></p>
                <p className="sp-plan-intro">
                  The complete toolkit, with limits only where something costs money to run.
                </p>
                <Link className="sp-cta sp-cta--ghost sp-cta--block" to={toolkitTo}>
                  Open the toolkit
                </Link>
                <span className="sp-plan-rule" aria-hidden="true" />
                <p className="sp-plan-label">WHAT&apos;S INCLUDED</p>
                <ul className="sp-plan-list">
                  {FREE_POINTS.map((point) => (
                    <li key={point}>
                      <span aria-hidden="true"><SpectrumIcon name="check" size={13} strokeWidth={2.2} /></span>
                      {point}
                    </li>
                  ))}
                  <li className="is-off">
                    <span aria-hidden="true"><SpectrumIcon name="minus" size={13} strokeWidth={2.2} /></span>
                    {FREE_EXCLUSION}
                  </li>
                </ul>
              </article>

              <article className="sp-plan sp-plan--pro">
                <span className="sp-plan-edge" aria-hidden="true" />
                <div className="sp-plan-top">
                  <span className="sp-plan-tier is-pro">PRO</span>
                  <span className="sp-plan-badge">{plan.best ? 'RECOMMENDED' : plan.label.toUpperCase()}</span>
                </div>
                {/* THE PRICE IS THE LADDER'S, NOT A LITERAL. `perMonthLabel` is
                    computed once in planLadder.js so $48/12 renders as $4 and
                    never oscillates between $3.33 and $3.34. */}
                <p className="sp-plan-price">
                  <span>{plan.perMonthLabel}</span>
                  <em>/ month</em>
                </p>
                {/* THE TOTAL IS SAID OUT LOUD BESIDE THE PER-MONTH FIGURE.
                    "$4 / month" on the yearly cadence is the honest cheapest
                    rate and it is what planLadder.js computes, but on its own it
                    reads as a monthly charge — a visitor who clicks expecting $4
                    to leave their account meets $48. `totalLabel` is the same
                    ladder's own formatting of what Stripe is actually asked
                    for. */}
                <p className="sp-plan-intro">{plan.cadence}, {plan.totalLabel}. {ladderNote(plan)}.</p>
                <Link className="sp-cta sp-cta--accent sp-cta--block" to={user ? `/checkout?plan=${plan.id}` : '/login?signup=1'}>
                  <span>Upgrade to Pro</span>
                  <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={13} /></span>
                </Link>
                <span className="sp-plan-rule" aria-hidden="true" />
                <p className="sp-plan-label is-pro">EVERYTHING IN FREE, PLUS</p>
                <ul className="sp-plan-list">
                  {PRO_POINTS.map((point) => (
                    <li key={point}>
                      <span className="is-pro" aria-hidden="true"><SpectrumIcon name="check" size={13} strokeWidth={2.2} /></span>
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <ul className="sp-assure" data-sp-reveal>
              {ASSURANCES.map((a) => (
                <li key={a.label}>
                  <span aria-hidden="true"><SpectrumIcon name={a.icon} size={15} /></span>
                  {a.label}
                </li>
              ))}
            </ul>

            <div className="sp-compare" data-sp-reveal>
              <h3 className="sp-compare-h">What you get on each plan</h3>
              {/* A REAL <table>, not the design's grid of <span>s.
                  The mock builds this comparison out of `[data-cmp-row]` divs
                  and, below 760px, injects the plan name with
                  `content: attr(data-plan)` on a pseudo-element — which means a
                  screen-reader user hears "3 Unlimited" with no way to know
                  which number belongs to which plan, and no way to navigate by
                  column. A table gives row and column headers for free. The
                  `data-plan` attributes survive because the CSS still uses them
                  to label the cells visually at phone width, where three columns
                  cannot fit; the accessible answer is the <th scope> pair, not
                  the pseudo-element. */}
              <table className="sp-compare-table">
                <caption className="sr-only">Free and Pro compared, feature by feature</caption>
                <thead>
                  <tr><th scope="col">What you get</th><th scope="col">Free</th><th scope="col">Pro</th></tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">
                        {row.group && <span className="sp-compare-group">{row.group}</span>}
                        {row.label}
                      </th>
                      <td data-plan="Free">{row.free}</td>
                      <td data-plan="Pro" className="is-pro">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="sp-compare-foot">
                Every limit, every export format and the whole FAQ are on{' '}
                <Link to="/plans">the plans page</Link>
                {CHEAPEST ? ` — Pro starts at ${CHEAPEST.perMonthLabel} a month.` : '.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Questions ───────────────────────────────────────────────────── */}
        <section id="faq" className="sp-section" aria-labelledby="sp-faq-h">
          <div className="sp-shell sp-faq">
            <div data-sp-reveal>
              <h2 className="sp-h2 sp-h2--sm" id="sp-faq-h">Common questions</h2>
              <p className="sp-lede">
                <Link className="sp-quiet-link" to="/help">
                  Help centre
                  <SpectrumIcon name="arrow-right" size={13} />
                </Link>
              </p>
            </div>
            <div className="sp-faq-grid" data-sp-reveal>
              {FAQS.map((f) => (
                <div className="sp-faq-row" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Handoff ─────────────────────────────────────────────────────── */}
        <section className="sp-section sp-close" aria-labelledby="sp-close-h">
          <div className="sp-shell sp-centre-head" data-sp-reveal>
            <h2 className="sp-h2" id="sp-close-h">
              <SpectrumWords text="Start your first kit today." />
            </h2>
            {/* /plans's sentence rather than the design's "Sign up only when you
                want to save kits": taking a FILE away has needed a free account
                since the export gate shipped (useExportGate.js), so the design's
                version understates what an account is for. */}
            <p className="sp-lede">
              Every colour, type, icon and image tool opens in your browser without an account,
              and using them is never metered.
            </p>
            <div className="sp-hero-cta">
              {promptsLogin ? (
                <button type="button" className="sp-cta sp-cta--ink sp-cta--lg" aria-haspopup="dialog" onClick={openToolkit}>
                  <span>Create a free account</span>
                  <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={14} /></span>
                </button>
              ) : (
                <Link className="sp-cta sp-cta--ink sp-cta--lg" to="/projects">
                  <span>Open your projects</span>
                  <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={14} /></span>
                </Link>
              )}
              <Link className="sp-cta sp-cta--ghost sp-cta--lg" to="/plans">See the plans</Link>
            </div>
          </div>
        </section>

        <SpectrumRamp className="sp-ramp--close" />
      </main>

      <SpectrumFooter onOpenToolkit={openToolkit} toolkitTo={toolkitTo} />
    </div>
  )
}
