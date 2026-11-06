import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeHero from '../components/home/HomeHero'
import HomeTry from '../components/home/HomeTry'
import { AutoplayOwner } from '../components/home/AutoplayOwner'
import HomeFinalCall from '../components/home/HomeFinalCall'
import HomeProof from '../components/home/HomeProof'
import HomeShowcase from '../components/home/HomeShowcase'
import HomePlans from '../components/home/HomePlans'
import HomeBookmarks from '../components/home/HomeBookmarks'
import HomeExports from '../components/home/HomeExports'
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

export default function Spectrum() {
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

        {/* ── Bookmarks ───────────────────────────────────────────────────── */}
        <HomeBookmarks />

        {/* ── Try the tools (slot) ────────────────────────────────────────── */}
        <section id="try" aria-labelledby="try-h">
          <HomeTry />
        </section>

        {/* ── Exports: renders its own <section id="exports"> ─────────────── */}
        <HomeExports />

        {/* ── Examples (slot) ─────────────────────────────────────────────── */}
        <section id="examples" aria-labelledby="examples-h" data-slot="examples">
          <HomeShowcase />
        </section>

        {/* ── Proof ───────────────────────────────────────────────────────── */}
        <HomeProof />

        {/* ── Plans (slot) ────────────────────────────────────────────────── */}
        <HomePlans />

        {/* ── Final call: last child of main. The light behind it is drawn on
            the footer's box, so this section paints nothing of its own. ───── */}
        <HomeFinalCall toolkitTo="/projects" />
      </main>
      </AutoplayOwner>

      <SpectrumFooter toolkitTo="/projects" home />
    </div>
  )
}
