import { useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumWords from '../components/spectrum/SpectrumWords'
import SpectrumBench from '../components/spectrum/SpectrumBench'
import SpectrumExports from '../components/spectrum/SpectrumExports'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeHero from '../components/home/HomeHero'
import { AutoplayOwner } from '../components/home/AutoplayOwner'
import PhIcon from '../components/spectrum/PhIcon'
import SpectrumProof from '../components/spectrum/SpectrumProof'
import { usePageAnchors } from '../components/spectrum/usePageAnchors'
import { TOOL_COUNT, numberWord } from '../components/spectrum/spectrumFacts'
// THE FRONT DOOR'S SHEET, SO IT IS RENDER-BLOCKING ON PURPOSE: this page is
// `/`, the first paint, which must not wait on a chunk. The budget test
// (tests/unit/home-asset-budget.test.js) holds its size.
import '../styles/pages/spectrum.css'
import '../styles/pages/home-tokens.css'
import '../styles/pages/home-hero.css'

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


  return (
    <div className="spectrum">
      <header className="sp-banner">
        <PillNav variant="spectrum" />
      </header>
      <div className="sp-grain" aria-hidden="true" />

      <AutoplayOwner>
      <main id="main" tabIndex={-1}>

        <HomeHero />

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

        {/* ── Final call: last child of main, in the layer the footer's glow
            will share ─────────────────────────────────────────────────────── */}
        <div className="sp-orb-layer">
          <section id="start" className="sp-close" aria-labelledby="sp-close-h">
            <h2 id="sp-close-h" tabIndex={-1}>Start your first project today.</h2>
            <p>
              Free to use, no account needed. Sign up when you want to export files or save projects and
              come back to them.
            </p>
            <div className="sp-close-cta">
              <Link className="sp-pill sp-pill--close" to="/projects">
                <span>Use for free</span>
                <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
              </Link>
              <Link className="sp-ghost sp-ghost--close" to="/plans">See the plans</Link>
            </div>
          </section>
        </div>
      </main>
      </AutoplayOwner>

      <SpectrumFooter toolkitTo="/projects" reveal />
    </div>
  )
}
