import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeHero from '../components/home/HomeHero'
import { AutoplayOwner } from '../components/home/AutoplayOwner'
import HomeFinalCall from '../components/home/HomeFinalCall'
import HomeProof from '../components/home/HomeProof'
import DeferredSection from '../components/home/DeferredSection'
import { useBelowFoldReady } from '../components/home/useBelowFoldReady'
import { lazyRoute as lazy } from '../utils/lazyRoute'
import { usePageAnchors } from '../components/spectrum/usePageAnchors'
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

// The sections below the fold, each in a chunk with its own stylesheet, so the
// entry chunk and the render-blocking sheet carry the hero, the proof band and
// the final call only. DeferredSection says when they start.
const HomeBookmarks = lazy(() => import('../components/home/HomeBookmarks'))
const HomeTry = lazy(() => import('../components/home/HomeTry'))
const HomeExports = lazy(() => import('../components/home/HomeExports'))
const HomeShowcase = lazy(() => import('../components/home/HomeShowcase'))
const HomePlans = lazy(() => import('../components/home/HomePlans'))

// A little under how tall each section is once it has arrived, at any width, so
// the page does not lengthen under the scrollbar as the chunks land.
const H = { bookmarks: 1100, try: 3400, exports: 2600, examples: 1400, plans: 1500 }

export default function Spectrum() {
  usePageAnchors()
  const below = useBelowFoldReady()

  return (
    <div className="spectrum">
      <header className="sp-banner">
        <PillNav variant="spectrum" />
      </header>
      <div className="sp-grain" aria-hidden="true" />

      <AutoplayOwner>
      <main id="main" tabIndex={-1}>

        <HomeHero />

        {/* ── Bookmarks ───────────────────────────────────────────────────── */}
        <DeferredSection ready={below} holdId="bookmarks" minHeight={H.bookmarks}><HomeBookmarks /></DeferredSection>

        {/* ── Try the tools (slot) ────────────────────────────────────────── */}
        <section id="try" aria-labelledby="try-h">
          <DeferredSection ready={below} minHeight={H.try}><HomeTry /></DeferredSection>
        </section>

        {/* ── Exports: renders its own <section id="exports"> ─────────────── */}
        <DeferredSection ready={below} holdId="exports" minHeight={H.exports}><HomeExports /></DeferredSection>

        {/* ── Examples (slot) ─────────────────────────────────────────────── */}
        <section id="examples" aria-labelledby="examples-h" data-slot="examples">
          <DeferredSection ready={below} minHeight={H.examples}><HomeShowcase /></DeferredSection>
        </section>

        {/* ── Proof ───────────────────────────────────────────────────────── */}
        <HomeProof />

        {/* ── Plans (slot) ────────────────────────────────────────────────── */}
        <DeferredSection ready={below} holdId="plans" minHeight={H.plans}><HomePlans /></DeferredSection>

        {/* ── Final call: last child of main. The light behind it is drawn on
            the footer's box, so this section paints nothing of its own. ───── */}
        <HomeFinalCall toolkitTo="/projects" />
      </main>
      </AutoplayOwner>

      <SpectrumFooter toolkitTo="/projects" home />
    </div>
  )
}
