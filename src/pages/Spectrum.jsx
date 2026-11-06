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
import HomeFinalCall from '../components/home/HomeFinalCall'
import PhIcon from '../components/spectrum/PhIcon'
import SpectrumProof from '../components/spectrum/SpectrumProof'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { usePageAnchors } from '../components/spectrum/usePageAnchors'
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB } from '../components/spectrum/spectrumHero'
import { TOOL_COUNT, numberWord } from '../components/spectrum/spectrumFacts'
// THE FRONT DOOR'S SHEET, SO IT IS RENDER-BLOCKING ON PURPOSE: this page is
// `/`, the first paint, which must not wait on a chunk. The budget test
// (tests/unit/home-asset-budget.test.js) holds its size.
import '../styles/pages/spectrum.css'
import '../styles/pages/home-tokens.css'

// The sales page: hero, bookmarks, try the tools, exports, examples, proof,
// plans and the final call, then the footer. Every section is a landmark target
// with an id (#top #bookmarks #try #exports #examples #proof #plans #start) and
// an h2 that takes focus when a link jumps to it.
//
// Pricing detail lives at /plans; the Pro calls to action and "View plans" go
// there. "Open the toolkit" goes straight to /projects for everyone, signed out
// included. Sign-up happens only when a visitor saves or exports.
//
// Landmarks: one <header> (the nav), one <main id="main"> from the hero to the
// final call, one <footer>.

export default function Spectrum() {
  // The seed and the family chosen in the bookmarks windows drive the exports
  // cards below them.
  const [base, setBase] = useState(0)
  const [font, setFont] = useState(0)

  usePageAnchors()

  // `data-hero-prepainted` is set on <html> for shells whose headline
  // scripts/home-shell.mjs already painted. Decided at first render so the hero
  // never commits settled and then drops for a frame.
  const [heroLit] = useState(() => typeof document !== 'undefined'
    && !document.documentElement.hasAttribute('data-hero-prepainted')
    && !prefersReducedMotion())
  // The sub-line, search and buttons rise in under the painted headline.
  const [arrive] = useState(() => typeof document !== 'undefined' && !prefersReducedMotion())
  const arriveAt = heroLit ? '300ms' : '0ms'

  return (
    <div className="spectrum">
      <header className="sp-banner">
        <PillNav variant="spectrum" />
      </header>
      <div className="sp-grain" aria-hidden="true" />

      <main id="main" tabIndex={-1}>

        {/* ── Hero (slot) ─────────────────────────────────────────────────── */}
        <div
          id="top"
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
        </div>

        <SpectrumRamp mirror arrive={arrive} arriveAt={arriveAt} className="sp-ramp--hero" />

        {/* ── Bookmarks (slot: the previous bench stands here) ────────────── */}
        <section id="bookmarks" className="sp-section" aria-labelledby="sp-bench-h">
          <SpectrumBench
            base={base}
            onBase={setBase}
            font={font}
            onFont={setFont}
            head={(
              <div>
                <h2 className="sp-h2" id="sp-bench-h" tabIndex={-1}>Say goodbye to bookmark folders.</h2>
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

        {/* ── Try the tools (slot) ────────────────────────────────────────── */}
        <section id="try" aria-labelledby="try-h" data-slot="try">
          <h2 id="try-h" className="sr-only" tabIndex={-1}>Try the tools</h2>
        </section>

        {/* ── Exports (slot: the previous stack stands here) ──────────────── */}
        <section id="exports" className="sp-section" aria-labelledby="sp-spec-h">
          <div className="sp-spec-head">
            <h2 id="sp-spec-h" tabIndex={-1}>Studio quality exports.</h2>
            <p>
              Take one piece, take the whole system, or come back to it next month. All three leave
              the browser looking like a studio made them.
            </p>
          </div>
          <SpectrumExports base={base} font={font} />
        </section>

        {/* ── Examples (slot) ─────────────────────────────────────────────── */}
        <section id="examples" aria-labelledby="examples-h" data-slot="examples">
          <h2 id="examples-h" className="sr-only" tabIndex={-1}>Examples</h2>
        </section>

        {/* ── Proof (slot: the previous band stands here) ─────────────────── */}
        <SpectrumProof />

        {/* ── Plans (slot) ────────────────────────────────────────────────── */}
        <section id="plans" aria-labelledby="plans-h" data-slot="plans">
          <h2 id="plans-h" className="sr-only" tabIndex={-1}>Plans</h2>
        </section>

        {/* ── Final call: last child of main. The light behind it is drawn on
            the footer's box, so this section paints nothing of its own. ───── */}
        <HomeFinalCall toolkitTo="/projects" />
      </main>

      <SpectrumFooter toolkitTo="/projects" home />
    </div>
  )
}
