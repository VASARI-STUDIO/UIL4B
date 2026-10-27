import { useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import TryItMark from '../components/TryItMark'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumWords from '../components/spectrum/SpectrumWords'
import SpectrumBench from '../components/spectrum/SpectrumBench'
import SpectrumExports from '../components/spectrum/SpectrumExports'
import SpectrumSearch from '../components/spectrum/SpectrumSearch'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import PhIcon from '../components/spectrum/PhIcon'
import SpectrumProof from '../components/spectrum/SpectrumProof'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { useSpectrumReveal } from '../components/spectrum/useSpectrumReveal'
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB } from '../components/spectrum/spectrumHero'
import { gradientCss } from '../data/gradientGallery'
import { LIBRARY_GRADIENT_ROWS } from '../data/gradientLibrary'
import { LIBRARY_PALETTE_ROWS } from '../data/paletteLibrary'
import { isStub } from '../utils/libraryRules'
import { LIBRARY_COUNTS, TOOL_COUNT, numberWord } from '../components/spectrum/spectrumFacts'
import { ICON_GROUP_SHELF } from '../components/spectrum/iconGroupShelf'
import { ICON_GROUPS_ROUTE, listIconGroups } from '../data/iconGroups'
// THE FRONT DOOR'S SHEET, SO IT IS RENDER-BLOCKING ON PURPOSE: this page is
// `/`, the first paint, which must not wait on a chunk. The budget test
// (tests/unit/home-asset-budget.test.js) holds its size.
import '../styles/pages/spectrum.css'

// ═════════════════════════════════════════════════════════════════════════════
// SPECTRUM — the sales page, built from "UIL4B - Spectrum.dc.html".
// ═════════════════════════════════════════════════════════════════════════════
//
// THE RULE: the design is the spec — reproduced, not
// adapted. The landing is the design's six blocks in the design's order:
//
//   hero        the design's headline and sub-line, the search pill, two CTAs, the band
//   the bench   the design's four tool windows beside a sticky rail
//   discover    the library, rendered as itself
//   exports     three nested stacking cards
//   proof       (#index) "Don't just take it from us", four real figures
//   handoff     the last way in, the closing band, then the footer
//
// Pricing, the comparison and the FAQ are NOT here: in the design they are the
// Pricing screen at /plans (Pricing.jsx). Every Pro CTA and
// "View plans" goes there.
//
// "Open the toolkit" goes straight to /projects for everyone, signed out
// included — no sign-up gate. Sign-up happens only when a visitor
// saves or exports.
//
// Where the design's copy states something the product cannot do, the component and
// layout stay and only the false clause moves; each site says what and why.

/* ── Discover ─────────────────────────────────────────────────────────────── */

// Real library rows, in the design's card. The third tab, Icon sets, shows the premade
// icon groups: every group open to a signed-out visitor, each with four of its
// own glyphs, its icon count and how many packs it draws from, linking to the
// group. The count on the "Open the gallery" card is every group, Pro included.
const ICON_GROUPS = listIconGroups({ tier: 'anon' })
const SHELF_GROUPS = ICON_GROUPS.filter((g) => !g.locked && ICON_GROUP_SHELF[g.id])

const DISCOVER_TABS = [
  {
    id: 'palettes',
    label: 'Palettes',
    count: `${LIBRARY_COUNTS.palettes} PALETTES`,
    to: '/discover/palettes',
    // The first rows are the ones every visitor may open in full.
    items: LIBRARY_PALETTE_ROWS.filter((p) => p.kind === 'curated' && !isStub(p)).slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      swatches: p.colors,
      meta: `${p.colors.length} stops`,
    })),
  },
  {
    id: 'gradients',
    label: 'Gradients',
    count: `${LIBRARY_COUNTS.gradients} GRADIENTS`,
    to: '/discover/gradients',
    // The design's meta style ("Linear, 135 deg"), read off each row.
    items: LIBRARY_GRADIENT_ROWS.filter((g) => !isStub(g)).slice(0, 5).map((g) => ({
      id: g.id,
      name: g.name,
      art: gradientCss(g.type, g.angle, g.stops),
      meta: g.type === 'Linear' ? `Linear, ${g.angle} deg` : g.type,
    })),
  },
  {
    id: 'icons',
    label: 'Icon sets',
    count: `${ICON_GROUPS.length} ICON GROUPS`,
    to: ICON_GROUPS_ROUTE,
    items: SHELF_GROUPS.map((g) => ({
      id: g.id,
      name: g.label,
      to: g.route,
      glyphs: ICON_GROUP_SHELF[g.id],
      box: 24,
      meta: `${g.count} icons, ${g.packs.length} packs`,
    })),
  },
]

/* ── the page ─────────────────────────────────────────────────────────────── */

export default function Spectrum() {
  const [tab, setTab] = useState(DISCOVER_TABS[0].id)
  // The seed and the family chosen in the bench's windows drive the exports
  // cards below them, as in the design.
  const [base, setBase] = useState(0)
  const [font, setFont] = useState(0)

  useSpectrumReveal()

  // THE HERO ENTRANCE, ON THE ONE PATH WHERE IT IS STILL AN ENTRANCE. The words'
  // resting state is visible and the movement is a keyframe the class turns on.
  // `data-hero-prepainted` is set on <html> for shells whose headline
  // scripts/home-shell.mjs already painted; re-running the entrance there would
  // be a second arrival of something that never left. Decided at first render
  // so the hero never commits settled and then drops for a frame.
  const [heroLit] = useState(() => typeof document !== 'undefined'
    && !document.documentElement.hasAttribute('data-hero-prepainted')
    && !prefersReducedMotion())
  // THE ARRIVAL OF EVERYTHING REACT ADDS UNDER THE HEADLINE (spectrum.css, "the
  // hero's arrival"): the sub-line, search and buttons rise in and the band is
  // set. It plays on every path, since on a cold load these are the elements that
  // appear after the painted headline, and it never touches the headline itself.
  // Decided at first render, like `heroLit`, so nothing commits settled and then
  // drops. Where the headline is rising (`heroLit`) the arrival starts 300ms in
  // so the words lead and the band lands under them.
  const [arrive] = useState(() => typeof document !== 'undefined' && !prefersReducedMotion())
  const arriveAt = heroLit ? '300ms' : '0ms'

  // The library's grid fades on a chip press, never on first paint. The two keys
  // alternate so each press restarts the fade (spectrum.css, `sp-fade-a`).
  const [swaps, setSwaps] = useState(0)
  const pickTab = (id) => {
    if (id === tab) return
    setTab(id)
    setSwaps((n) => n + 1)
  }

  const activeTab = DISCOVER_TABS.find((t) => t.id === tab) || DISCOVER_TABS[0]

  return (
    <div className="spectrum">
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />

      <main id="main" tabIndex={-1}>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <header
          className={`sp-hero${heroLit ? ' is-in' : ''}${arrive ? ' is-arriving' : ''}`}
          style={arrive ? { '--sp-arrive-at': arriveAt } : undefined}
        >
          <div className="sp-shell sp-hero-core">
            <h1 className="sp-hero-h1">
              <SpectrumWords text={SPECTRUM_HERO.text} mark={SPECTRUM_HERO.mark} joinMark />
            </h1>
            <p className="sp-hero-sub">{SPECTRUM_HERO_SUB}</p>

            <p className="sr-only" id="spectrum-search-label">Search every tool</p>
            <div className="sp-hero-bar">
              <div className="tim-anchor">
                <SpectrumSearch labelledBy="spectrum-search-label" />
                <TryItMark />
              </div>
              <div className="sp-hero-cta">
                <Link className="sp-pill sp-pill--hero" to="/projects">
                  <span>Open the toolkit</span>
                  <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
                </Link>
                <Link className="sp-ghost sp-ghost--hero" to="/plans">View plans</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Only this band is set on arrival; the closing one just sits there. */}
        <SpectrumRamp mirror arrive={arrive} arriveAt={arriveAt} className="sp-ramp--hero" />

        {/* ── The bench ───────────────────────────────────────────────────── */}
        <section id="bench" className="sp-section" aria-labelledby="sp-bench-h">
          <SpectrumBench
            base={base}
            onBase={setBase}
            font={font}
            onFont={setFont}
            head={(
              <div data-sp-reveal>
                <h2 className="sp-h2" id="sp-bench-h">
                  <SpectrumWords text="Say goodbye to bookmark folders." />
                </h2>
                {/* The design's sentence, counted rather than typed, ending at "They are
                    all running below." — the windows are not linked to each other,
                    so "change one value and the rest of the kit follows" is left
                    out. */}
                <p className="sp-bench-lede">
                  {numberWord(TOOL_COUNT, { capital: true })} tools that would otherwise be{' '}
                  {numberWord(TOOL_COUNT)} tabs and a folder you stopped opening. They are all
                  running below.{' '}
                  <Link className="sp-bench-more" to="/tools">See all of them.</Link>
                </p>
              </div>
            )}
          />
        </section>

        {/* ── Studio quality exports ──────────────────────────────────────── */}
        {/* Straight after the bench, before the community library: the exports
            show what the bench's seed and family turn into. */}
        <section id="specimens" className="sp-section" aria-labelledby="sp-spec-h">
          <div className="sp-spec-head" data-sp-reveal>
            <h2 id="sp-spec-h"><SpectrumWords text="Studio quality exports." /></h2>
            <p>
              Take one piece, take the whole system, or come back to it next month. All three leave
              the browser looking like a studio made them.
            </p>
          </div>
          <SpectrumExports base={base} font={font} />
        </section>

        {/* ── Discover ────────────────────────────────────────────────────── */}
        <section id="discover" className="sp-section" aria-labelledby="sp-disc-h">
          <div className="sp-disc-head" data-sp-reveal>
            <div>
              <h2 className="sp-h2" id="sp-disc-h">
                <SpectrumWords text="A growing library, from a growing community." />
              </h2>
              {/* The design's sentence minus "and icon sets" and "with new sets every
                  week": the library publishes no icon sets and keeps no weekly
                  cadence. */}
              <p className="sp-lede">
                The Discover pages hold the palettes and gradients we publish. Open one, change it,
                and keep it in your own project.
              </p>
            </div>
            <div className="sp-chips" role="group" aria-label="Choose a library">
              {DISCOVER_TABS.map((t) => (
                <button key={t.id} type="button" className="sp-chip" aria-pressed={tab === t.id} onClick={() => pickTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="sp-disc-grid"
            data-swapped={swaps > 0 ? '' : undefined}
            data-swap-key={swaps % 2 ? 'a' : 'b'}
          >
            {activeTab.items.map((it) => (
              <Link className="sp-disc-card" to={it.to || activeTab.to || '/discover'} key={it.id}>
                {it.swatches && <span className="sp-disc-art" aria-hidden="true">{it.swatches.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}</span>}
                {it.art && <span className="sp-disc-art" aria-hidden="true" style={{ background: it.art }} />}
                {it.glyphs && (
                  <span className="sp-disc-art sp-disc-art--icons" aria-hidden="true">
                    {it.glyphs.map((body, i) => <PhIcon key={i} body={body} box={it.box} />)}
                  </span>
                )}
                <span className="sp-disc-row">
                  <span className="sp-disc-name">{it.name}</span>
                  <span className="sp-disc-meta">{it.meta}</span>
                </span>
              </Link>
            ))}
            <Link className="sp-disc-cta" to={activeTab.to || '/discover'}>
              <span className="sp-disc-cta-say">Open the gallery</span>
              <span className="sp-disc-cta-row">
                <span className="sp-disc-cta-count">{activeTab.count}</span>
                <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
              </span>
            </Link>
          </div>

          <div className="sp-disc-foot">
            {/* The design's line, minus "Submissions from the community land on the same
                pages" (community submissions go to /community, not here), and
                scoped to what UI L4B makes: the icon sets are their makers'
                packs, not ours. */}
            <p>Every palette and gradient here is made by UI L4B and free to browse without an account.</p>
          </div>
        </section>

        {/* ── Don't just take it from us (#index) ────────────────────────────
            The design's proof band, rebuilt as drawn, with four real figures counted
            off the arrays that decide them. See SpectrumProof.jsx. */}
        <SpectrumProof />

        {/* ── Handoff ─────────────────────────────────────────────────────── */}
        <section className="sp-close" aria-labelledby="sp-close-h">
          <h2 id="sp-close-h" data-sp-reveal><SpectrumWords text="Start your first project today." /></h2>
          {/* The design's sentence, with "Sign up only when you want to save kits"
              widened to the truth: taking a file away needs a free account too
              (useExportGate.js). */}
          <p>
            Free to use, no account needed. Sign up when you want to export files or save projects and
            come back to them.
          </p>
          <div className="sp-close-cta">
            {/* The same free way in for every visitor: the workspace, no
                account asked for. */}
            <Link className="sp-pill sp-pill--close" to="/projects">
              <span>Use for free</span>
              <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
            </Link>
            <Link className="sp-ghost sp-ghost--close" to="/plans">See the plans</Link>
          </div>
        </section>

        <SpectrumRamp className="sp-ramp--close" />
      </main>

      <SpectrumFooter toolkitTo="/projects" reveal />
    </div>
  )
}
